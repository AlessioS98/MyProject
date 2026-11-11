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
rem  Uso:  "Avvia Gestione Contratti.cmd" /auto
rem        lo usa l'avvio automatico di Windows: avvia il server e
rem        apre la pagina nel browser, senza finestra da tenere aperta.
rem        /silent e' accettato come equivalente (lo usavano le
rem        versioni precedenti dell'avvio automatico).
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
rem  Il controllo NON usa piu' netstat: su alcuni PC netstat non elenca
rem  la porta 3000 (e mostra lo stato sbagliato anche per altre porte,
rem  es. MySQL 3306 come "FIN_WAIT_1" invece di "LISTENING"), perche'
rem  viene intercettato da antivirus/firewall o driver di rete. Con quel
rem  controllo l'avvio dichiarava "Il server non risponde" anche con il
rem  server perfettamente attivo. Si prova invece ad APRIRE una
rem  connessione sulla porta: se qualcuno la accetta, il server c'e'.
rem  Funziona con qualsiasi lingua di Windows e senza netstat.
call :porta_3000_attiva
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

rem Attende che il server risponda, massimo circa 30 secondi.
rem  Un solo processo PowerShell: prova una connessione sulla porta ogni
rem  mezzo secondo e termina con 0 appena il server risponde, 1 allo
rem  scadere del tempo (niente netstat, vedi il commento qui sopra).
powershell -NoProfile -Command "$scad=(Get-Date).AddSeconds(30); while((Get-Date) -lt $scad){ try { $c=New-Object Net.Sockets.TcpClient; $c.Connect('127.0.0.1',3000); $c.Close(); exit 0 } catch { }; Start-Sleep -Milliseconds 500 }; exit 1"
if not errorlevel 1 goto server_pronto
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
if /i "%~1"=="/auto" goto avvio_automatico
if /i "%~1"=="/silent" goto avvio_automatico
start "" "http://localhost:3000"
echo.
echo  Fatto! Per chiudere l'app usa "Ferma Gestione Contratti.cmd".
echo  Questa finestra si chiude da sola.
timeout /t 5 /nobreak >nul 2>&1
popd
exit /b 0

:avvio_automatico
rem  Avvio automatico di Windows (attivita' pianificata creata da
rem  "Installa avvio automatico.cmd"): il server e' attivo, si apre
rem  la pagina nel browser e la finestra si chiude subito.
rem  Vale solo per l'avvio automatico: chi lancia il programma a
rem  mano vede il browser aprirsi nel flusso normale (piu' sotto).
rem  explorer.exe e non "start": l'attivita' pianificata gira con i
rem  permessi di amministratore e "start" aprirebbe il browser come
rem  amministratore, cosa che Chrome/Edge sconsigliano.
explorer.exe "http://localhost:3000"
echo  [Avvio automatico] Server attivo, pagina aperta nel browser.
popd
exit /b 0

rem ============================================================
rem  Sotto-rotina: avvia il servizio MySQL80 se e' spento
rem
rem  Perche' il controllo NON usa piu' "net start":
rem   - "net start" elenca i servizi con il NOME VISUALIZZATO, che
rem     per MySQL e' "MYSQL80" tutto maiuscolo, mentre findstr senza
rem     /i distingue maiuscole e minuscole: il servizio risultava
rem     SEMPRE spento, anche quando era attivo;
rem   - "net start <servizio>" su un servizio gia' avviato termina
rem     con codice 2, non 0, quindi anche quel caso finiva nella
rem     richiesta di amministratore.
rem  Insieme facevano comparire la conferma di Windows a OGNI avvio
rem  del programma. Lo stato si legge ora con "sc query": le parole
rem  di stato (RUNNING) restano in inglese anche su Windows italiano.
rem
rem  Dopo l'avvio automatico impostato qui sotto, MySQL parte insieme
rem  a Windows ma puo' essere ancora in partenza subito dopo
rem  l'accesso: si aspetta qualche secondo prima di concludere che e'
rem  spento e chiedere i permessi.
rem ============================================================
rem ============================================================
rem  Sotto-rotina: la porta 3000 e' in ascolto?
rem
rem  Apre una connessione TCP sulla porta e la chiude subito:
rem  esito 0 = c'e' un programma che risponde (il nostro server),
rem  esito 1 = nessuno risponde.
rem  NON usa netstat: vedi il commento al punto 6 (su alcuni PC
rem  netstat non elenca affatto la porta 3000, quindi il server
rem  risultava spento anche quando era attivo).
rem ============================================================
:porta_3000_attiva
powershell -NoProfile -Command "try { $c=New-Object Net.Sockets.TcpClient; $c.Connect('127.0.0.1',3000); $c.Close(); exit 0 } catch { exit 1 }"
exit /b %errorlevel%

:avvia_mysql
sc query MySQL80 >nul 2>nul
if errorlevel 1 (
    rem  Servizio assente (nome diverso o MySQL non installato come
    rem  servizio): qui non c'e' niente da avviare.
    echo  [MySQL] Servizio MySQL80 non presente: nessun avvio da fare.
    exit /b 0
)
set /a attesa=0
:mysql_attesa_avvio
sc query MySQL80 2>nul | findstr /c:"RUNNING" >nul
if not errorlevel 1 (
    echo  [MySQL] Servizio gia' attivo.
    exit /b 0
)
if %attesa% geq 8 goto mysql_avvio_manuale
if %attesa%==0 echo  [MySQL] Servizio in avvio: attendo che sia pronto...
timeout /t 1 /nobreak >nul 2>&1
set /a attesa+=1
goto mysql_attesa_avvio

:mysql_avvio_manuale
echo  [MySQL] Servizio spento: provo ad avviarlo...
net start MySQL80 >nul 2>nul
if not errorlevel 1 goto attesa_mysql
echo  [MySQL] Servono i permessi di amministratore: una volta sola.
echo  [MySQL] Conferma la richiesta di autorizzazione di Windows.
echo  [MySQL] Nello stesso passaggio MySQL viene impostato su avvio
echo  [MySQL] automatico: da ora parte da solo con Windows e all'app
echo  [MySQL] non verra' piu' chiesto niente.
rem  Due comandi di cmd.exe in un unico passaggio elevato: avvia il
rem  servizio e ne imposta il tipo di avvio. "&" separa i comandi per
rem  cmd.exe e non e' speciale per PowerShell, che lo legge dentro una
rem  stringa fra apici singoli: non ci sono virgolette da annidare.
powershell -NoProfile -Command "$c='net start MySQL80 & sc config MySQL80 start= auto'; Start-Process -FilePath 'cmd.exe' -ArgumentList '/c',$c -Verb RunAs -Wait"
rem Attende che il servizio risulti attivo, massimo circa 20 secondi
:attesa_mysql
set /a attesa=0
:attesa_mysql_loop
sc query MySQL80 2>nul | findstr /c:"RUNNING" >nul
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
