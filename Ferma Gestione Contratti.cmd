@echo off
rem ============================================================
rem  Gestione Contratti di Affitto - Stop server
rem
rem  Ferma il server dell'app avviato da
rem  "Avvia Gestione Contratti.cmd" (o da "npm start").
rem  MySQL NON viene fermato.
rem ============================================================
echo  Arresto del server Gestione Contratti...
powershell -NoProfile -Command "Get-CimInstance Win32_Process | Where-Object { $_.Name -eq 'node.exe' -and $_.CommandLine -like '*server.js*' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }"
timeout /t 2 /nobreak >nul
echo  Fatto. La pagina del browser non funzionera' piu' finche'
echo  non riavvii l'app con "Avvia Gestione Contratti.cmd".
echo.
pause
