@echo off
rem ============================================================
rem  Crea la scorciatoia "Gestione Contratti di Affitto" sul desktop
rem  con l'icona valigetta. Basta un doppio clic su questo file.
rem ============================================================
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0crea-scorciatoia.ps1"