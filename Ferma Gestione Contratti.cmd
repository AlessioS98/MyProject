@echo off
rem ============================================================
rem  Gestione Contratti di Affitto - Stop server
rem
rem  Ferma il server dell'app avviato da
rem  "Avvia Gestione Contratti.cmd" (o da "npm start").
rem  MySQL NON viene fermato.
rem
rem  Il lavoro vero lo fa "ferma-server.ps1", nella stessa cartella:
rem  individua il processo del server dal file del PID che server.js
rem  scrive all'avvio e da netstat (porta 3000), lo chiude e controlla
rem  che la porta sia davvero libera.
rem
rem  La versione precedente cercava il processo per riga di comando
rem  (Win32_Process.CommandLine -like '*server.js*'): su questo PC
rem  Windows restituisce una riga di comando VUOTA, quindi non trovava
rem  nessun processo e stampava "Fatto" lasciando il server attivo.
rem ============================================================
setlocal EnableExtensions
pushd "%~dp0" >nul 2>nul

echo.
echo  ============================================
echo   Gestione Contratti di Affitto
echo   Arresto del server...
echo  ============================================
echo.

rem  Senza questo file l'arresto non puo' funzionare: meglio dirlo subito
rem  che far credere di aver fermato il server.
if not exist "%~dp0ferma-server.ps1" (
    echo  [ERRORE] Manca il file "ferma-server.ps1" nella cartella dell'app.
    echo  Va copiato insieme a "Ferma Gestione Contratti.cmd": ripristina
    echo  la cartella completa del programma e riprova.
    echo.
    pause
    popd
    exit /b 1
)

rem  Stesso percorso del log del server: fuori dalla cartella dell'app, cosi'
rem  funziona anche in una cartella protetta (es. C:\Program Files).
rem  server.js calcola esattamente lo stesso percorso (vedi PID_FILE).
set "PID_FILE=%LOCALAPPDATA%\Gestione Contratti Affitto\server.pid"
if not defined LOCALAPPDATA set "PID_FILE=%TEMP%\Gestione Contratti Affitto\server.pid"

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0ferma-server.ps1" -FilePid "%PID_FILE%"
set "ESITO=%errorlevel%"

echo.
if "%ESITO%"=="0" goto fermato
if "%ESITO%"=="2" goto non_attivo
echo  [ERRORE] Il server risulta ANCORA ATTIVO sulla porta 3000.
echo  Non e' stato possibile chiuderlo automaticamente. Prova cosi':
echo   - apri "Gestione attivita'" (Ctrl+Maiusc+Esc), scheda
echo     "Dettagli", cerca "node.exe" e scegli "Termina attivita'";
echo   - oppure riavvia la sessione di Windows.
echo  MySQL resta comunque attivo.
echo.
pause
popd
exit /b 1

:fermato
echo  Fatto: il server e' stato fermato.
echo  La pagina del browser non funzionera' piu' finche' non riavvii
echo  l'app con "Avvia Gestione Contratti.cmd".
echo  MySQL resta attivo (non serve riavviarlo).
echo.
pause
popd
exit /b 0

:non_attivo
echo  La porta 3000 era gia' libera: il server non era in esecuzione.
echo  Per aprire l'app usa "Avvia Gestione Contratti.cmd".
echo.
pause
popd
exit /b 0
