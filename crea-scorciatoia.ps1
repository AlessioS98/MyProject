# ============================================================
#  Crea la scorciatoia "Gestione Contratti di Affitto" sul desktop
#  con l'icona valigetta. Genera anche valigetta.ico dalla
#  valigetta.png (una sola volta, se non esiste già).
#
#  Uso: doppio clic su "Crea scorciatoia.bat"
#  (oppure da terminale:  powershell -File crea-scorciatoia.ps1)
# ============================================================

param([switch]$Silent)   # con -Silent non chiede INVIO alla fine

$ErrorActionPreference = 'Stop'

# ---- Configurazione (modifica qui se serve) ----
$nomeApp = 'Gestione Contratti di Affitto'
# La scorciatoia apre di default il file index.html che sta nella
# STESSA cartella di questo script. Quindi se sposti la cartella del
# progetto non devi modificare nulla qui: basta rilanciare con doppio
# clic "Crea scorciatoia.bat" dalla nuova posizione.
#
# In alternativa, se vuoi che la scorciatoia apra un INDIRIZZO WEB
# (es. l'app pubblicata su GitHub Pages), scrivilo qui sotto, per es.:
#   $sitoWeb = 'https://tuo-utente.github.io/MyProject/'
$sitoWeb = 'https://AlessioS98.github.io/MyProject/'
# ------------------------------------------------

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

# Destinazione della scorciatoia: indirizzo web se configurato,
# altrimenti il file index.html accanto a questo script.
if ($sitoWeb -ne '') {
    $target = $sitoWeb
} else {
    $target = Join-Path $scriptDir 'index.html'
}
$pngPath   = Join-Path $scriptDir 'valigetta.png'
$icoPath   = Join-Path $scriptDir 'valigetta.ico'
$desktop   = [Environment]::GetFolderPath('Desktop')

# 1) Genera valigetta.ico dalla valigetta.png (solo se non esiste ancora)
if (-not (Test-Path $icoPath)) {
    if (-not (Test-Path $pngPath)) {
        throw "Icona valigetta.png non trovata in: $scriptDir"
    }
    Add-Type -AssemblyName System.Drawing
    $img = [System.Drawing.Image]::FromFile($pngPath)
    # Ridimensiona a 256x256 (dimensione standard delle icone)
    $size = 256
    if ($img.Width -le 256 -and $img.Height -le 256) {
        $size = [Math]::Max($img.Width, $img.Height)
    }
    $bmp = New-Object System.Drawing.Bitmap $img, $size, $size
    $ms  = New-Object System.IO.MemoryStream
    $bmp.Save($ms, [System.Drawing.Imaging.ImageFormat]::Png)
    $pngBytes = $ms.ToArray()
    $ms.Dispose(); $bmp.Dispose(); $img.Dispose()

    $w = $size
    if ($w -ge 256) { $w = 0 }   # 0 = 256 pixel nel formato ICO
    $h = $size
    if ($h -ge 256) { $h = 0 }

    # Scrive il file .ico con l'immagine PNG compressa al suo interno
    # (formato supportato da Windows Vista e successivi)
    $out = New-Object System.IO.MemoryStream
    $bw  = New-Object System.IO.BinaryWriter $out
    $bw.Write([UInt16]0)                    # riservato
    $bw.Write([UInt16]1)                    # tipo: icona
    $bw.Write([UInt16]1)                    # numero di immagini
    $bw.Write([Byte]$w)                     # larghezza
    $bw.Write([Byte]$h)                     # altezza
    $bw.Write([Byte]0)                      # colori della palette (0 = nessuna)
    $bw.Write([Byte]0)                      # riservato
    $bw.Write([UInt16]1)                    # piani colore
    $bw.Write([UInt16]32)                   # bit per pixel
    $bw.Write([UInt32]$pngBytes.Length)     # dimensione dell'immagine
    $bw.Write([UInt32]22)                   # offset immagine (6 header + 16 entry)
    $bw.Write($pngBytes)
    [System.IO.File]::WriteAllBytes($icoPath, $out.ToArray())
    $bw.Dispose(); $out.Dispose()
    Write-Host "Icona generata: $icoPath"
}

# 2) Crea la scorciatoia sul desktop
if ($target -match '^https?://') {
    # Destinazione web: crea un .url (scorciatoia Internet)
    $urlPath = Join-Path $desktop ($nomeApp + '.url')
    $content = "[InternetShortcut]`r`nURL=$target`r`nIconFile=$icoPath`r`nIconIndex=0`r`n"
    [System.IO.File]::WriteAllText($urlPath, $content, (New-Object System.Text.UTF8Encoding($false)))
    Write-Host "Scorciatoia creata: $urlPath"
} else {
    # Destinazione locale: crea un .lnk che apre il file nel browser
    if (-not (Test-Path $target)) {
        throw "File non trovato: $target`n(questo script deve stare nella cartella del progetto, accanto a index.html)"
    }
    $lnkPath = Join-Path $desktop ($nomeApp + '.lnk')
    $ws = New-Object -ComObject WScript.Shell
    $sc = $ws.CreateShortcut($lnkPath)
    $sc.TargetPath   = $target
    $sc.IconLocation = "$icoPath, 0"
    $sc.Description  = 'Apre la Gestione Contratti di Affitto'
    $sc.Save()
    Write-Host "Scorciatoia creata: $lnkPath"
}

Write-Host "Icona: $icoPath"
Write-Host ""
Write-Host "Doppio clic sull'icona sul desktop per aprire l'app."
if (-not $Silent) {
    Read-Host "`nPremi INVIO per chiudere"
}