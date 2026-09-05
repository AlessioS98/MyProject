@echo off
rem ============================================================
rem  Gestione Contratti di Affitto - Avvio rapido (Windows)
rem
rem  Doppio clic su questo file:
rem    1. avvia il servizio MySQL80 se e' spento, chiedendo i
rem       permessi di amministratore solo se necessario;
rem    2. avvia il server dell'app in background se non e'
rem       gia' in esecuzione;
rem    3. apre l'app nel browser su http://localhost:3000.
rem
rem  Per fermare il server: "Ferma Gestione Contratti.cmd"
rem  nella stessa cartella.
rem ============================================================
setlocal
cd /d "%~dp0"

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
if not exist "node_modules\express" (
    echo  Prima esecuzione: installo le dipendenze, serve internet...
    call npm install --no-audit --no-fund
    if errorlevel 1 (
        echo  [ERRORE] Installazione delle dipendenze fallita.
        pause
        exit /b 1
    )
)

rem ---- 3. MySQL ----
call :avvia_mysql

rem ---- 4. Server sulla porta 3000 ----
netstat -an | findstr /c:"LISTENING" | findstr /c:":3000" >nul
if not errorlevel 1 goto server_pronto

echo  [Server] Avvio in background, finestra ridotta a icona...
start "Gestione Contratti - Server" /min cmd /c "node server.js >> server.log 2>&1"

rem Attende che il server risponda, massimo circa 30 secondi
set /a tentativi=0
:attesa_server
netstat -an | findstr /c:"LISTENING" | findstr /c:":3000" >nul
if not errorlevel 1 goto server_pronto
timeout /t 1 /nobreak >nul 2>&1
set /a tentativi+=1
if %tentativi% lss 30 goto attesa_server
echo  [ERRORE] Il server non risponde sulla porta 3000.
echo  Controlla il file server.log in questa cartella.
pause
exit /b 1

:server_pronto
echo  [Server] Attivo: http://localhost:3000
start "" "http://localhost:3000"
echo.
echo  Fatto! Per chiudere l'app usa "Ferma Gestione Contratti.cmd".
echo  Questa finestra si chiude da sola.
timeout /t 5 /nobreak >nul 2>&1
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
