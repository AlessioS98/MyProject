@echo off
rem ============================================================
rem  Gestione Contratti di Affitto - Uso dagli altri PC (ufficio)
rem
rem  Da eseguire UNA VOLTA sul PC che ospita il programma (il
rem  "PC principale"). Crea nella cartella condivisa due file:
rem
rem    "Gestione Contratti.url"       scorciatoia: apre la pagina
rem    "Apri Gestione Contratti.cmd"  apre la pagina; se il PC
rem                                   principale non risponde prova
rem                                   a svegliarlo (Wake-on-LAN) e
rem                                   aspetta che sia pronto
rem
rem  e apre la porta 3000 nel firewall di Windows (serve una
rem  conferma di amministratore, solo la prima volta).
rem
rem  Avvio: trascina la cartella condivisa su questo file, oppure
rem  avvialo con doppio clic e digita il percorso quando lo chiede.
rem
rem  Consigliato: esegui anche "Installa avvio automatico.cmd", cosi'
rem  il programma parte da solo a ogni accesso a Windows sul PC
rem  principale e gli altri lo trovano sempre pronto.
rem ============================================================
setlocal EnableExtensions

title Metti in rete - Gestione Contratti di Affitto

echo.
echo  ============================================
echo   Gestione Contratti di Affitto
echo   Preparazione accesso dagli altri PC
echo  ============================================
echo.

rem ---- 1. Cartella condivisa visibile a tutti i PC ----
rem  Accetta anche il trascinamento della cartella su questo file.
set "SHARE=%~1"
echo  Cartella condivisa in cui creare i collegamenti:
echo    es.  C:\Condivisa        \\NOMEPC\Condivisa
if not defined SHARE set /p "SHARE=  Percorso: "
if defined SHARE echo  Cartella scelta: "%SHARE%"

if not defined SHARE (
    echo.
    echo  [ERRORE] Nessuna cartella indicata. Riprova trascinando la
    echo  cartella condivisa su questo file.
    echo.
    pause
    exit /b 1
)

if not exist "%SHARE%\" (
    echo.
    echo  [ERRORE] La cartella indicata non esiste.
    echo  Copia il percorso esatto dalla barra degli indirizzi di
    echo  Windows Explorer e riprova.
    echo.
    pause
    exit /b 1
)

rem ---- 2. Porta 3000 nel firewall di Windows (una volta sola) ----
set "FW_RULE=Gestione Contratti Affitto - TCP 3000"
netsh advfirewall firewall show rule name="%FW_RULE%" >nul 2>nul
if not errorlevel 1 echo  [Rete] Porta 3000 gia' aperta nel firewall.
if errorlevel 1 (
    echo  [Rete] Apro la porta 3000 nel firewall di Windows.
    echo  [Rete] Conferma la richiesta di autorizzazione che appare.
    rem  Il nome della regola contiene spazi e va passato a netsh TRA
    rem  VIRGOLETTE: senza virgolette netsh lo legge come piu' argomenti e
    rem  rifiuta il comando con "numero di argomenti non valido", senza
    rem  creare nessuna regola. Le virgolette si costruiscono in PowerShell
    rem  con [char]34, cosi' qui non ce ne sono da annidare.
    powershell -NoProfile -Command "$q=[char]34; $n='name='+$q+$env:FW_RULE+$q; Start-Process -FilePath 'netsh.exe' -ArgumentList 'advfirewall','firewall','add','rule',$n,'dir=in','action=allow','protocol=TCP','localport=3000','profile=any' -Verb RunAs -Wait"
)
netsh advfirewall firewall show rule name="%FW_RULE%" >nul 2>nul
if errorlevel 1 (
    echo  [Rete] ATTENZIONE: porta 3000 non aperta nel firewall, dagli altri PC non si collegheranno.
    echo  [Rete] Riprova lanciando questo file come amministratore e
    echo  [Rete] accettando la richiesta di autorizzazione di Windows.
)
if not errorlevel 1 echo  [Rete] Porta 3000 aperta: gli altri PC possono collegarsi.

rem ---- 3. Nome, indirizzo e scheda di rete di questo PC ----
set "NOME_PC=%COMPUTERNAME%"
set "MIO_IP="
set "MAC_PC="
powershell -NoProfile -Command "(Get-NetIPConfiguration | Where-Object { $null -ne $_.IPv4DefaultGateway } | Select-Object -First 1).IPv4Address.IPAddress" > "%TEMP%\gestione_contratti_ip.tmp" 2>nul
set /p "MIO_IP="<"%TEMP%\gestione_contratti_ip.tmp"
del "%TEMP%\gestione_contratti_ip.tmp" >nul 2>nul
if "%MIO_IP%"=="" set "MIO_IP=%NOME_PC%"
powershell -NoProfile -Command "$c = Get-NetIPConfiguration | Where-Object { $null -ne $_.IPv4DefaultGateway } | Select-Object -First 1; (Get-NetAdapter -InterfaceIndex $c.InterfaceIndex).MacAddress" > "%TEMP%\gestione_contratti_mac.tmp" 2>nul
set /p "MAC_PC="<"%TEMP%\gestione_contratti_mac.tmp"
del "%TEMP%\gestione_contratti_mac.tmp" >nul 2>nul
set "URL_PC=http://%NOME_PC%:3000/"
set "URL_IP=http://%MIO_IP%:3000/"
set "URL_LIST='%URL_PC%'"
if not "%MIO_IP%"=="%NOME_PC%" set "URL_LIST=%URL_LIST%,'%URL_IP%'"
echo  [Rete] Questo PC:  %NOME_PC%   (%MIO_IP%)
if "%MAC_PC%"=="" echo  [Nota] Scheda di rete non trovata: la sveglia automatica non sara' disponibile.
if not "%MAC_PC%"=="" echo  [Rete] Scheda di rete: %MAC_PC%  (sveglia automatica attiva)

rem ---- 4. Scorciatoia web nella cartella condivisa ----
> "%SHARE%\Gestione Contratti.url" echo [InternetShortcut]
>> "%SHARE%\Gestione Contratti.url" echo URL=%URL_PC%

rem ---- 5. File per gli altri PC: apre la pagina, sveglia e attende ----
set "CLIENT_FILE=%SHARE%\Apri Gestione Contratti.cmd"
> "%CLIENT_FILE%" echo @echo off
>> "%CLIENT_FILE%" echo rem Creato da "Metti in rete.cmd" - Gestione Contratti di Affitto.
>> "%CLIENT_FILE%" echo rem Apre il programma sul PC principale; se non risponde prova a
>> "%CLIENT_FILE%" echo rem svegliarlo (Wake-on-LAN) e aspetta che sia pronto.
>> "%CLIENT_FILE%" echo title Gestione Contratti di Affitto
>> "%CLIENT_FILE%" echo setlocal
>> "%CLIENT_FILE%" echo(
>> "%CLIENT_FILE%" echo echo.
>> "%CLIENT_FILE%" echo echo  Controllo il programma sul PC %NOME_PC%...
>> "%CLIENT_FILE%" echo echo.
>> "%CLIENT_FILE%" echo(
>> "%CLIENT_FILE%" echo rem 1) Il programma risponde?
>> "%CLIENT_FILE%" echo powershell -NoProfile -ExecutionPolicy Bypass -Command "$u=@(%URL_LIST%); $db=$false; foreach($x in $u){ try{ $h=Invoke-RestMethod -Uri ($x+'api/health') -TimeoutSec 3; if($h.ok){ Start-Process $x; exit 0 } else { $db=$true } } catch { } }; if($db){ exit 2 }; exit 1"
>> "%CLIENT_FILE%" echo if errorlevel 2 goto mysql_ko
>> "%CLIENT_FILE%" echo if not errorlevel 1 exit /b 0
>> "%CLIENT_FILE%" echo(
>> "%CLIENT_FILE%" echo rem 2) Non risponde: provo a svegliare il PC principale (Wake-on-LAN)
>> "%CLIENT_FILE%" echo echo  Il PC %NOME_PC% non risponde: provo a svegliarlo...
>> "%CLIENT_FILE%" echo powershell -NoProfile -ExecutionPolicy Bypass -Command "$m=('%MAC_PC%'.Replace('-','')); if($m.Length -ne 12){ exit 1 }; $b=New-Object byte[] 102; for($i=0;$i -lt 6;$i++){ $b[$i]=255 }; for($i=0;$i -lt 16;$i++){ for($j=0;$j -lt 6;$j++){ $b[6+$i*6+$j]=[Convert]::ToByte($m.Substring($j*2,2),16) } }; $c=New-Object System.Net.Sockets.UdpClient; $c.EnableBroadcast=$true; $c.Connect([System.Net.IPAddress]::Broadcast,9); $n=$c.Send($b,102); $c.Close(); exit 0"
>> "%CLIENT_FILE%" echo if errorlevel 1 echo  Nota: la rete di questo PC non permette la sveglia.
>> "%CLIENT_FILE%" echo(
>> "%CLIENT_FILE%" echo rem 3) Aspetto che il programma sia pronto (fino a due minuti)
>> "%CLIENT_FILE%" echo echo  Attendo che il PC %NOME_PC% e il programma siano pronti...
>> "%CLIENT_FILE%" echo echo  Puo' richiedere fino a due minuti. Attendere prego.
>> "%CLIENT_FILE%" echo(
>> "%CLIENT_FILE%" echo powershell -NoProfile -ExecutionPolicy Bypass -Command "$u=@(%URL_LIST%); $db=$false; $scad=(Get-Date).AddSeconds(120); while((Get-Date) -lt $scad){ foreach($x in $u){ try{ $h=Invoke-RestMethod -Uri ($x+'api/health') -TimeoutSec 3; if($h.ok){ Write-Host ''; Start-Process $x; exit 0 } else { $db=$true } } catch { } }; Write-Host -NoNewline '.'; Start-Sleep -Seconds 4 }; if($db){ exit 2 }; exit 1"
>> "%CLIENT_FILE%" echo if errorlevel 2 goto mysql_ko
>> "%CLIENT_FILE%" echo if not errorlevel 1 exit /b 0
>> "%CLIENT_FILE%" echo(
>> "%CLIENT_FILE%" echo echo.
>> "%CLIENT_FILE%" echo echo  [PROBLEMA] Il programma non e' raggiungibile.
>> "%CLIENT_FILE%" echo echo.
>> "%CLIENT_FILE%" echo echo  Sul PC %NOME_PC%:
>> "%CLIENT_FILE%" echo echo     - controlla che sia acceso (non in sospensione);
>> "%CLIENT_FILE%" echo echo     - se e' acceso, aspetta un minuto e riprova;
>> "%CLIENT_FILE%" echo echo     - se serve, avvia "Avvia Gestione Contratti.cmd".
>> "%CLIENT_FILE%" echo echo.
>> "%CLIENT_FILE%" echo echo  Indirizzo da provare a mano nel browser:
>> "%CLIENT_FILE%" echo echo     %URL_IP%
>> "%CLIENT_FILE%" echo echo.
>> "%CLIENT_FILE%" echo pause
>> "%CLIENT_FILE%" echo exit /b 1
>> "%CLIENT_FILE%" echo(
>> "%CLIENT_FILE%" echo :mysql_ko
>> "%CLIENT_FILE%" echo echo.
>> "%CLIENT_FILE%" echo echo  [PROBLEMA] Il programma risponde ma non arriva al database.
>> "%CLIENT_FILE%" echo echo  Sul PC %NOME_PC% chiedi di controllare il servizio MySQL.
>> "%CLIENT_FILE%" echo echo.
>> "%CLIENT_FILE%" echo pause
>> "%CLIENT_FILE%" echo exit /b 1

rem ---- 6. Controllo finale ----
if not exist "%CLIENT_FILE%" (
    echo.
    echo  [ERRORE] Non riesco a scrivere nella cartella "%SHARE%".
    echo  Controlla di avere i permessi di scrittura su quella cartella.
    echo.
    pause
    exit /b 1
)

powershell -NoProfile -Command "try { $h = Invoke-RestMethod -Uri 'http://localhost:3000/api/health' -TimeoutSec 3; exit 0 } catch { exit 1 }"
if errorlevel 1 echo  [Nota] Il programma non e' in esecuzione adesso: avvialo con "Avvia Gestione Contratti.cmd".

echo.
echo  ============================================
echo   Fatto. Nella cartella condivisa ora trovi:
echo.
echo     "Gestione Contratti.url"        doppio clic: apre la pagina
echo     "Apri Gestione Contratti.cmd"   apre la pagina; se il PC
echo                                     principale e' spento prova a
echo                                     svegliarlo e ad aspettarlo
echo.
echo   Indirizzo dagli altri PC: %URL_PC%
echo   Se il nome del PC non viene risolto: %URL_IP%
echo  ============================================
echo.
echo  Per avere il programma sempre pronto consigliato anche:
echo     "Installa avvio automatico.cmd"  (sul PC %NOME_PC%)
echo.
pause
exit /b 0
