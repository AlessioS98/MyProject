# ============================================================
#  Gestione Contratti di Affitto - arresto del server (Windows)
#
#  Lo chiama "Ferma Gestione Contratti.cmd" (doppio clic su quel file):
#  non serve lanciarlo a mano.
#
#  Perche' esiste questo file: la versione precedente dell'arresto
#  cercava il processo del server con
#     Get-CimInstance Win32_Process |
#       Where-Object { $_.CommandLine -like '*server.js*' }
#  Su questo PC Windows quella proprieta' torna VUOTA, quindi nessun
#  processo corrispondeva: l'arresto stampava "Fatto" e il server restava
#  attivo. In piu' il server avviato dall'avvio automatico gira come
#  amministratore, e Windows non lascia chiudere un processo elevato da un
#  utente normale (il vecchio script nascondeva anche quell'errore).
#
#  Qui l'arresto procede in ordine, dal modo piu' pulito al piu' brusco:
#    1. chiede al server di chiudersi da solo (POST /api/shutdown con il
#       token scritto nel file del PID): nessun permesso speciale, il
#       server chiude MySQL in modo ordinato e si spegne;
#    2. se non risponde, chiude il processo del server, individuato dal
#       file server.pid, da netstat o (ultima risorsa) dalla riga di
#       comando;
#    3. se serve (server avviato come amministratore), riprova con una
#       richiesta di permessi di Windows: una sola conferma.
#
#  Esiti restituiti al file .cmd:
#    0 = server fermato
#    1 = porta 3000 ancora occupata (arresto non riuscito)
#    2 = non c'era niente da fermare
# ============================================================
param(
    [string]$FilePid = '',
    [int]$Porta = 3000,
    [switch]$Elevato
)

$ErrorActionPreference = 'SilentlyContinue'

# C'e' qualcuno che risponde sulla porta? (stesso controllo usato dall'avvio,
# che non si fida di netstat: si prova ad aprire una connessione)
function Test-Porta {
    try {
        $client = New-Object System.Net.Sockets.TcpClient
        $client.Connect('127.0.0.1', $Porta)
        $client.Close()
        return $true
    } catch {
        return $false
    }
}

# Attende che la porta si liberi; restituisce $true se libera.
function Attendi-PortaLibera([int]$secondi) {
    $scadenza = (Get-Date).AddSeconds($secondi)
    while ((Get-Date) -lt $scadenza) {
        if (-not (Test-Porta)) { return $true }
        Start-Sleep -Milliseconds 300
    }
    return (-not (Test-Porta))
}

# Contenuto del file scritto da server.js: "<pid> <token>"
function Leggi-FilePid {
    $dati = @{ Pid = 0; Token = '' }
    if (-not $FilePid) { return $dati }
    if (-not (Test-Path -LiteralPath $FilePid)) { return $dati }
    $testo = (Get-Content -LiteralPath $FilePid -Raw)
    if (-not $testo) { return $dati }
    $parti = @(([string]$testo).Trim() -split '\s+')
    $numero = 0
    if ($parti.Count -ge 1 -and [int]::TryParse($parti[0], [ref]$numero)) { $dati.Pid = $numero }
    if ($parti.Count -ge 2) { $dati.Token = $parti[1] }
    return $dati
}

# PID dei processi che tengono la porta in ascolto, letti da netstat (niente
# WMI). Su alcuni PC netstat non elenca la porta: in quel caso l'elenco e'
# vuoto e si passa agli altri metodi.
function Get-PidDaNetstat {
    $pids = New-Object System.Collections.ArrayList
    foreach ($riga in (netstat -ano)) {
        if ($riga -notmatch 'LISTENING') { continue }
        if ($riga -notmatch (':' + $Porta + '\s')) { continue }
        if ($riga -match '(\d+)\s*$') {
            $valore = [int]$Matches[1]
            if ($valore -gt 0 -and -not $pids.Contains($valore)) { [void]$pids.Add($valore) }
        }
    }
    return $pids
}

# Chiede al server di chiudersi da solo. Nessun permesso richiesto: e' il
# server stesso che si spegne. Il token evita che una pagina web qualsiasi
# possa fermare l'app.
function Chiedi-ArrestoAlServer([string]$token) {
    try {
        $uri = 'http://127.0.0.1:' + $Porta + '/api/shutdown'
        Invoke-RestMethod -Uri $uri -Method Post -Headers @{ 'x-shutdown-token' = $token } -TimeoutSec 5 | Out-Null
        return $true
    } catch {
        return $false
    }
}

# Chiude i processi indicati; restituisce quanti ne ha chiusi e l'elenco di
# quelli rimasti vivi (di solito perche' girano come amministratore).
function Chiudi-Processi($pids) {
    $rimasti = New-Object System.Collections.ArrayList
    $chiusi = 0
    foreach ($p in $pids) {
        $proc = Get-Process -Id $p -ErrorAction SilentlyContinue
        if (-not $proc) { continue }
        if ($proc.ProcessName -ne 'node') {
            Write-Output ('  [Ferma] Il PID ' + $p + ' ora e'' ' + $proc.ProcessName + ': non e'' il server, lo lascio stare.')
            continue
        }
        Write-Output ('  [Ferma] Chiudo il processo del server (PID ' + $p + ')...')
        Stop-Process -Id $p -Force -ErrorAction SilentlyContinue
        Start-Sleep -Milliseconds 300
        if (Get-Process -Id $p -ErrorAction SilentlyContinue) {
            [void]$rimasti.Add($p)
            Write-Output ('  [Ferma] Il PID ' + $p + ' non si e'' chiuso: servono i permessi di amministratore.')
        } else {
            $chiusi++
        }
    }
    return @{ Chiusi = $chiusi; Rimasti = $rimasti }
}

# ------------------------------------------------------------
# 0. Dati del file del PID
# ------------------------------------------------------------
$datiPid = Leggi-FilePid
$portaAttiva = Test-Porta
if ($datiPid.Pid -gt 0) {
    Write-Output ('  [Ferma] File del PID: processo ' + $datiPid.Pid + '.')
} elseif ($FilePid) {
    Write-Output ('  [Ferma] Nessun file del PID in ' + $FilePid + '.')
}
if ($portaAttiva) {
    Write-Output ('  [Ferma] Il server risponde sulla porta ' + $Porta + '.')
} else {
    Write-Output ('  [Ferma] Nessuna risposta sulla porta ' + $Porta + '.')
}

# ------------------------------------------------------------
# 1. Modo preferito: il server si chiude da solo
# ------------------------------------------------------------
if ($portaAttiva -and $datiPid.Token) {
    Write-Output '  [Ferma] Chiedo al server di chiudersi...'
    if (Chiedi-ArrestoAlServer $datiPid.Token) {
        if (Attendi-PortaLibera 10) {
            Write-Output '  [Ferma] Il server si e'' chiuso.'
            if ($FilePid -and (Test-Path -LiteralPath $FilePid)) {
                Remove-Item -LiteralPath $FilePid -Force -ErrorAction SilentlyContinue
            }
            exit 0
        }
        Write-Output '  [Ferma] Il server non si e'' chiuso: provo a chiudere il processo.'
    } else {
        Write-Output '  [Ferma] Il server non accetta la richiesta di arresto: provo a chiudere il processo.'
    }
}

# ------------------------------------------------------------
# 2. Chiusura del processo: da dove si ricava il PID
# ------------------------------------------------------------
$daFermare = New-Object System.Collections.ArrayList

# 2a. netstat (quando funziona: su questo PC l'elenco e' incompleto)
foreach ($p in (Get-PidDaNetstat)) { [void]$daFermare.Add($p) }

# 2b. PID del file: vale solo se e' ancora un processo node E il server
#     risulta attivo. Dopo un arresto forzato il file resta sul disco e,
#     senza questo controllo, un PID riusato potrebbe far chiudere un ALTRO
#     processo node (che non c'entra nulla con l'app).
if ($datiPid.Pid -gt 0 -and $portaAttiva -and -not $daFermare.Contains($datiPid.Pid)) {
    $proc = Get-Process -Id $datiPid.Pid -ErrorAction SilentlyContinue
    if ($proc -and $proc.ProcessName -eq 'node') {
        [void]$daFermare.Add($datiPid.Pid)
    }
}

# 2c. Ultima risorsa: ricerca per riga di comando (funziona sui PC dove
#     Windows la restituisce, e da processo elevato).
if ($daFermare.Count -eq 0) {
    try {
        $trovati = @(Get-CimInstance Win32_Process -Filter "Name='node.exe'" -ErrorAction Stop |
            Where-Object { $_.CommandLine -like '*server.js*' } |
            ForEach-Object { [int]$_.ProcessId })
    } catch { $trovati = @() }
    foreach ($p in $trovati) {
        if (-not $daFermare.Contains($p)) { [void]$daFermare.Add($p) }
    }
}

$chiusura = Chiudi-Processi $daFermare
$processiChiusi = $chiusura.Chiusi
if (Attendi-PortaLibera 10) {
    $portaAttiva = $false
}

# ------------------------------------------------------------
# 3. Serve un amministratore (server avviato dall'avvio automatico)
# ------------------------------------------------------------
if ($portaAttiva -and -not $Elevato) {
    Write-Output ''
    Write-Output '  [Ferma] Il server e'' stato avviato come amministratore: Windows'
    Write-Output '  [Ferma] chiedera'' ora una conferma. Accettala per fermarlo.'
    try {
        $argomenti = @('-NoProfile', '-ExecutionPolicy', 'Bypass',
            '-File', ('"' + $PSCommandPath + '"'),
            '-Porta', [string]$Porta, '-Elevato')
        if ($FilePid) {
            $argomenti += '-FilePid'
            $argomenti += ('"' + $FilePid + '"')
        }
        Start-Process -FilePath 'powershell.exe' -ArgumentList $argomenti -Verb RunAs -Wait -ErrorAction Stop
    } catch {
        Write-Output '  [Ferma] Conferma di amministratore non concessa.'
    }
    $portaAttiva = -not (Attendi-PortaLibera 10)
    if (-not $portaAttiva) { $processiChiusi++ }
}

# ------------------------------------------------------------
# 4. File del PID rimasto da un arresto forzato: si toglie, cosi' al
#    prossimo avvio non viene letto un PID vecchio.
# ------------------------------------------------------------
if ($FilePid -and (Test-Path -LiteralPath $FilePid) -and -not $portaAttiva) {
    Remove-Item -LiteralPath $FilePid -Force -ErrorAction SilentlyContinue
}

if ($portaAttiva) {
    Write-Output ('  [ERRORE] La porta ' + $Porta + ' risponde ancora: il server non si e'' fermato.')
    exit 1
}

if ($processiChiusi -gt 0) {
    Write-Output ('  [Ferma] Server fermato (processi chiusi: ' + $processiChiusi + ').')
    exit 0
}

Write-Output '  [Ferma] Il server non era in esecuzione: niente da fermare.'
exit 2
