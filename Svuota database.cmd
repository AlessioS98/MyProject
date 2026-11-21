@echo off
rem ============================================================
rem  Gestione Contratti di Affitto - Svuota il database
rem
rem  Doppio clic su questo file: elimina TUTTI i dati delle
rem  tabelle dell'app (contratti, immobili, anagrafiche, scadenze,
rem  canoni, deleghe, ...) mantenendo intatte tabelle, colonne,
rem  indici, vincoli, trigger e viste.
rem
rem  Prima di procedere mostra quante righe verranno eliminate e
rem  chiede di scrivere SVUOTA per confermare: un doppio clic
rem  sbagliato non cancella niente.
rem
rem  Prima di svuotare conviene scaricare il backup dal pulsante
rem  "Effettua Backup" nell'app: il file .sql permette di
rem  ripristinare tutti i dati.
rem
rem  Il lavoro vero lo fa "svuota-db.js", nella stessa cartella,
rem  con le stesse credenziali di server.js (.env).
rem
rem  Uso da riga di comando, senza domande (per script):
rem      "Svuota database.cmd" --yes
rem ============================================================
setlocal EnableExtensions
pushd "%~dp0" >nul 2>nul

title Svuota database - Gestione Contratti di Affitto

echo.
echo  ============================================
echo   Gestione Contratti di Affitto
echo   Svuotamento del database (le tabelle restano)
echo  ============================================
echo.

rem  Senza lo script l'operazione non puo' funzionare: meglio dirlo
rem  subito che far credere di aver svuotato il database.
if not exist "%~dp0svuota-db.js" (
    echo  [ERRORE] Manca il file "svuota-db.js" nella cartella dell'app.
    echo  Va copiato insieme a "Svuota database.cmd": ripristina la
    echo  cartella completa del programma e riprova.
    echo.
    pause
    popd
    exit /b 1
)

where node >nul 2>nul
if errorlevel 1 (
    echo  [ERRORE] Node.js non trovato nel PATH.
    echo  Installa Node.js da https://nodejs.org e riprova.
    echo.
    pause
    popd
    exit /b 1
)

node "%~dp0svuota-db.js" %*
set "ESITO=%errorlevel%"

echo.
if "%ESITO%"=="0" goto fatto
if "%ESITO%"=="2" goto annullato
echo  [ERRORE] Svuotamento non riuscito: vedi il messaggio qui sopra.
echo  MySQL deve essere avviato e le credenziali del file .env corrette.
echo.
pause
popd
exit /b 1

:fatto
echo  Le tabelle e i vincoli sono rimasti: l'app e' pronta per nuovi dati.
echo.
pause
popd
exit /b 0

:annullato
echo  Nessuna modifica: il database e' rimasto com'era.
echo.
pause
popd
exit /b 0
