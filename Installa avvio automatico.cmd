@echo off
rem ============================================================
rem  Gestione Contratti di Affitto - Avvio automatico (PC principale)
rem
rem  Da eseguire UNA VOLTA sul PC che ospita il programma: da qui in
rem  poi il programma parte da solo a ogni accesso a Windows, quindi
rem  gli altri PC lo trovano sempre pronto (porta 3000).
rem
rem  Uso:  doppio clic                 attiva (o aggiorna) l'avvio automatico
rem        "Installa avvio automatico.cmd" rimuovi     lo disattiva
rem
rem  Serve la conferma di amministratore di Windows: accettala senza
rem  cambiare utente, perche' l'attivita' deve restare sull'utente
rem  attuale (%USERDOMAIN%\%USERNAME%).
rem ============================================================
setlocal EnableExtensions
title Avvio automatico - Gestione Contratti di Affitto

set "AZIONE=%~1"
if "%AZIONE%"=="" set "AZIONE=installa"

echo.
echo  ============================================
echo   Gestione Contratti di Affitto
if /i "%AZIONE%"=="rimuovi" echo   Disattivo l'avvio automatico
if /i not "%AZIONE%"=="rimuovi" echo   Avvio automatico a ogni accesso a Windows
echo  ============================================
echo.
echo  Cartella del programma: "%~dp0"

if /i "%AZIONE%"=="rimuovi" echo  [Avvio] Conferma la richiesta di autorizzazione di Windows.
if /i not "%AZIONE%"=="rimuovi" echo  [Avvio] Conferma la richiesta di autorizzazione di Windows:
if /i not "%AZIONE%"=="rimuovi" echo  [Avvio] serve una volta sola, poi non chiede piu' niente.
echo.

powershell -NoProfile -Command "Start-Process -FilePath 'powershell.exe' -ArgumentList '-NoProfile','-ExecutionPolicy','Bypass','-File','%~dp0avvio-automatico.ps1','%AZIONE%','%USERDOMAIN%\%USERNAME%' -Verb RunAs -Wait"

rem ---- Verifica e riepilogo ----
schtasks /query /tn "Gestione Contratti Affitto" >nul 2>nul
if errorlevel 1 goto non_attivo

echo.
echo  [Avvio] Attivo: il programma parte da solo a ogni accesso a Windows.
echo  [Avvio] Comando registrato:
powershell -NoProfile -Command "(Get-ScheduledTask -TaskName 'Gestione Contratti Affitto').Actions | ForEach-Object { '          ' + $_.Execute + ' ' + $_.Arguments }"
echo.
echo  [Avvio] Per toglierlo: "Installa avvio automatico.cmd" rimuovi
echo.
pause
exit /b 0

:non_attivo
echo.
if /i "%AZIONE%"=="rimuovi" echo  [Avvio] Fatto: avvio automatico disattivato.
if /i not "%AZIONE%"=="rimuovi" echo  [Avvio] ATTENZIONE: non risulta attivato.
if /i not "%AZIONE%"=="rimuovi" echo  [Avvio] Riprova accettando la richiesta di amministratore.
echo.
pause
exit /b 0
