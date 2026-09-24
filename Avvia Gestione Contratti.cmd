@echo off
rem ============================================================
rem  Gestione Contratti di Affitto - Avvio rapido (Windows)
rem
rem  Doppio clic su questo file:
rem    1. avvia il servizio MySQL80 se e' spento, chiedendo i
rem       permessi di amministratore solo se necessario;
rem    2. avvia il server dell'app in background, SENZA finestra
rem       visibile, se non e' gia' in esecuzione;
rem    3. apre l'app nel browser su http://localhost:3000.
rem
rem  Per fermare il server: "Ferma Gestione Contratti.cmd"
rem  nella stessa cartella.
rem
rem  Il file funziona da qualunque posizione: cartella spostata,
rem  percorso con spazi, altra unita', condivisione di rete o
rem  cartella protetta (es. C:\Program Files): percorsi e log sono
rem  ricavati dalla cartella del file stesso, il log va in
rem  %LOCALAPPDATA%\Gestione Contratti Affitto\server.log.
rem
rem  Ufficio con piu' PC: esegui UNA VOLTA "Metti in rete.cmd"
rem  (crea i collegamenti nella cartella condivisa e apre la porta
rem  3000 nel firewall) e "Installa avvio automatico.cmd" (avvia il
rem  programma da solo a ogni accesso a Windows). Da quel momento gli
rem  altri PC aprono http://%COMPUTERNAME%:3000 quando serve.
rem
rem  Uso:  "Avvia Gestione Contratti.cmd" /silent
rem        avvia il server senza aprire il browser (lo usa l'avvio
rem        automatico di Windows).
rem ============================================================
setlocal EnableExtensions

rem ---- 0. Cartella dell'app = cartella di questo file, ovunque si trovi ----
pushd "%~dp0"
if errorlevel 1 (
    echo  [ERRORE] Cartella dell'app non accessibile: "%~dp0"
    pause
    exit /b 1
)

rem  Da qui in poi ogni percorso e' relativo SOLO a questa cartella:
rem  l'app funziona anche se la cartella viene spostata, copiata su
rem  un'altra unita' o aperta da una condivisione di rete.

echo.
echo  ============================================
echo   Gestione Contratti di Affitto
echo   Avvio in corso...
echo  ============================================
echo.

rem ---- 1. Node.js deve essere installato ----
where node >nul 2>nul
if errorlevel 1 (
    echo  [ERRORE] Node.js non trovato nel PATH.
    echo  Installa Node.js da https://nodejs.org e riprova.
    echo.
    pause
    exit /b 1
)

rem ---- 2. Dipendenze, solo alla prima esecuzione ----
if not exist "%~dp0node_modules\express" (
    echo  Prima esecuzione: installo le dipendenze, serve internet...
    call npm install --no-audit --no-fund
    if errorlevel 1 (
        echo  [ERRORE] Installazione delle dipendenze fallita.
        echo  Se la cartella e' in C:\Program Files serve eseguire
        echo  questo file come amministratore, oppure spostare la
        echo  cartella in una posizione utente, es. C:\Gestione Contratti.
        pause
        exit /b 1
    )
)

rem ---- 3. MySQL ----
call :avvia_mysql

rem ---- 4. Accesso dagli altri PC: porta 3000 (una volta sola) ----
rem  Con la regola nel firewall gli altri PC della rete possono
rem  aprire http://%COMPUTERNAME%:3000 mentre il server e' attivo.
rem  Se la regola esiste gia' non viene toccato nulla.
set "FW_RULE=Gestione Contratti Affitto - TCP 3000"
netsh advfirewall firewall show rule name="%FW_RULE%" >nul 2>nul
if not errorlevel 1 echo  [Rete] Porta 3000 gia' aperta per gli altri PC.
if errorlevel 1 (
    echo  [Rete] Apro la porta 3000 nel firewall di Windows. Serve una
    echo  [Rete] sola conferma di amministratore, poi non chiede piu' niente.
    rem  Il nome della regola contiene spazi e va passato a netsh TRA
    rem  VIRGOLETTE: senza virgolette netsh lo legge come piu' argomenti
    rem  e rifiuta il comando, senza creare nessuna regola. Era questa la
    rem  causa dell'avviso "porta 3000 non aperta". Le virgolette si
    rem  costruiscono in PowerShell con [char]34, cosi' qui non ce ne sono
    rem  da annidare.
    powershell -NoProfile -Command "$q=[char]34; $n='name='+$q+$env:FW_RULE+$q; Start-Process -FilePath 'netsh.exe' -ArgumentList 'advfirewall','firewall','add','rule',$n,'dir=in','action=allow','protocol=TCP','localport=3000','profile=any' -Verb RunAs -Wait"
)
netsh advfirewall firewall show rule name="%FW_RULE%" >nul 2>nul
if errorlevel 1 (
    echo  [Rete] ATTENZIONE: porta 3000 non aperta nel firewall.
    echo  [Rete] Gli altri PC non si collegheranno finche' non la apri.
    echo  [Rete] Causa piu' probabile: la richiesta di autorizzazione di
    echo  [Rete] Windows non e' stata accettata. Riprova lanciando
    echo  [Rete] "Metti in rete.cmd" come amministratore.
)

rem ---- 5. File di log: sempre fuori dalla cartella dell'app ----
rem  In C:\Program Files un utente normale ha solo lettura, quindi
rem  scrivendo il log nella cartella dell'app la redirezione veniva
rem  rifiutata da Windows e node non veniva nemmeno eseguito (risultato:
rem  nessun server sulla porta 3000). Il log va quindi in %LOCALAPPDATA%,
rem  scrivibile per definizione; se non esiste, in %TEMP%.
set "LOG_FILE=%LOCALAPPDATA%\Gestione Contratti Affitto\server.log"
if not defined LOCALAPPDATA set "LOG_FILE=%TEMP%\gestione-contratti-server.log"
for %%D in ("%LOG_FILE%") do if not exist "%%~dpD" mkdir "%%~dpD" >nul 2>nul
for %%D in ("%LOG_FILE%") do if not exist "%%~dpD" set "LOG_FILE=%TEMP%\gestione-contratti-server.log"

rem ---- 6. Server sulla porta 3000 ----
netstat -an | findstr /c:"LISTENING" | findstr /c:":3000" >nul
if not errorlevel 1 goto server_pronto

echo  [Server] Avvio in background, senza finestra visibile...
echo  [Server] Log del server: "%LOG_FILE%"
rem  Finestra NASCOSTA: non c'e' nessuna icona da tenere aperta e nessuna
rem  "X" da poter chiudere per sbaglio. Il server resta attivo in background
rem  finche' non lo ferma "Ferma Gestione Contratti.cmd".
rem  La riga di comando (con i percorsi tra virgolette) viene costruita
rem  dentro PowerShell con [char]34, cioe' con le doppie virgolette: qui non
rem  ci sono virgolette da annidare e funziona anche se la cartella dell'app
rem  contiene spazi (es. "C:\Gestione Contratti").
set "SRV_JS=%~dp0server.js"
powershell -NoProfile -Command "$q=[char]34; $c='node '+$q+$env:SRV_JS+$q+' >> '+$q+$env:LOG_FILE+$q+' 2>&1'; Start-Process -FilePath 'cmd.exe' -ArgumentList '/c',$c -WindowStyle Hidden"

rem Attende che il server risponda, massimo circa 30 secondi
set /a tentativi=0
:attesa_server
netstat -an | findstr /c:"LISTENING" | findstr /c:":3000" >nul
if not errorlevel 1 goto server_pronto
timeout /t 1 /nobreak >nul 2>&1
set /a tentativi+=1
if %tentativi% lss 30 goto attesa_server
echo  [ERRORE] Il server non risponde sulla porta 3000.
echo  Il motivo e' scritto nel file di log:
echo  "%LOG_FILE%"
echo  Ora lo apro con Notepad: chiudilo per continuare.
if exist "%LOG_FILE%" start "" notepad "%LOG_FILE%"
pause
exit /b 1

:server_pronto
echo  [Server] Su questo PC:    http://localhost:3000
echo  [Rete]   Dagli altri PC:  http://%COMPUTERNAME%:3000
if /i "%~1"=="/silent" goto avvio_silenzioso
start "" "http://localhost:3000"
echo.
echo  Fatto! Per chiudere l'app usa "Ferma Gestione Contratti.cmd".
echo  Questa finestra si chiude da sola.
timeout /t 5 /nobreak >nul 2>&1
popd
exit /b 0

:avvio_silenzioso
rem  Avvio automatico: nessun browser, il server resta attivo e
rem  la finestra si chiude subito.
echo  [Avvio automatico] Server attivo, nessun browser aperto.
popd
exit /b 0

rem ============================================================
rem  Sotto-rotina: avvia il servizio MySQL80 se e' spento
rem ============================================================
:avvia_mysql
net start 2>nul | findstr /c:"MySQL80" >nul
if not errorlevel 1 (
    echo  [MySQL] Servizio gia' attivo.
    exit /b 0
)
echo  [MySQL] Servizio spento: provo ad avviarlo...
net start MySQL80 >nul 2>nul
if not errorlevel 1 goto attesa_mysql
echo  [MySQL] Servono i permessi di amministratore.
echo  [MySQL] Conferma la richiesta di autorizzazione di Windows.
powershell -NoProfile -Command "Start-Process -FilePath 'cmd.exe' -ArgumentList '/c','net start MySQL80' -Verb RunAs -Wait"
rem Attende che il servizio risulti attivo, massimo circa 20 secondi
:attesa_mysql
set /a attesa=0
:attesa_mysql_loop
net start 2>nul | findstr /c:"MySQL80" >nul
if not errorlevel 1 (
    echo  [MySQL] Servizio avviato.
    exit /b 0
)
timeout /t 1 /nobreak >nul 2>&1
set /a attesa+=1
if %attesa% lss 20 goto attesa_mysql_loop
echo  [MySQL] ATTENZIONE: servizio non partito entro 20 secondi.
echo  [MySQL] L'app provera' comunque a connettersi, controlla il file .env.
exit /b 0
