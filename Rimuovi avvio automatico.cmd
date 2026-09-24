@echo off
rem ============================================================
rem  Gestione Contratti di Affitto - Disattiva l'avvio automatico
rem
rem  Doppio clic qui per togliere l'avvio automatico installato con
rem  "Installa avvio automatico.cmd": il programma non partira' piu'
rem  da solo a ogni accesso a Windows (MySQL pure resta com'e').
rem
rem  Questa e' solo una scorciatoia: fa la stessa cosa di
rem  "Installa avvio automatico.cmd rimuovi"
rem ============================================================
setlocal EnableExtensions

call "%~dp0Installa avvio automatico.cmd" rimuovi
exit /b %errorlevel%
