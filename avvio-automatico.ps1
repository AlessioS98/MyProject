<#
  Attiva o rimuove l'avvio automatico di "Gestione Contratti di Affitto".

  Crea un'attivita' pianificata di Windows che, a ogni accesso
  dell'utente, avvia il server (Avvia Gestione Contratti.cmd /silent),
  senza aprire il browser e senza chiedere conferme a ogni avvio.

  Uso:
      avvio-automatico.ps1 installa [UTENTE]
      avvio-automatico.ps1 rimuovi
      avvio-automatico.ps1 -Prova        (mostra cosa verrebbe creato)
#>
param(
  [string]$Modo = 'installa',
  [string]$Utente = '',
  [switch]$Prova
)

$ErrorActionPreference = 'Stop'
$NomeAttivita = 'Gestione Contratti Affitto'
$Cartella = Split-Path -Parent $MyInvocation.MyCommand.Path
$Avvio = Join-Path $Cartella 'Avvia Gestione Contratti.cmd'

# ---------------------------------------------------------------
# Rimozione
# ---------------------------------------------------------------
if ($Modo -eq 'rimuovi') {
  $attivita = Get-ScheduledTask -TaskName $NomeAttivita -ErrorAction SilentlyContinue
  if ($null -eq $attivita) {
    Write-Host "[Avvio automatico] Non risulta attivo: non c'e' niente da togliere."
    exit 0
  }
  Unregister-ScheduledTask -TaskName $NomeAttivita -Confirm:$false
  Write-Host "[Avvio automatico] Rimosso: il programma non parte piu' da solo."
  exit 0
}

# ---------------------------------------------------------------
# Installazione
# ---------------------------------------------------------------
if (-not (Test-Path -LiteralPath $Avvio)) {
  Write-Host "[Avvio automatico] ERRORE: non trovo il file:"
  Write-Host "                  $Avvio"
  exit 1
}

if ([string]::IsNullOrWhiteSpace($Utente)) {
  $Utente = "$env:USERDOMAIN\$env:USERNAME"
}

# Riga di comando dell'attivita':  cmd /c "C:\percorso\Avvia ....cmd" /silent
$q = [char]34
$azioneTask = New-ScheduledTaskAction -Execute 'cmd.exe' -Argument ('/c ' + $q + $Avvio + $q + ' /silent')
$innesco = New-ScheduledTaskTrigger -AtLogOn -User $Utente
$account = New-ScheduledTaskPrincipal -UserId $Utente -LogonType Interactive -RunLevel Highest
$opzioni = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries `
  -DontStopIfGoingOnBatteries -StartWhenAvailable `
  -MultipleInstances IgnoreNew -ExecutionTimeLimit ([TimeSpan]::Zero)

if ($Prova) {
  Write-Host '--- PROVA: non viene creato niente ---'
  Write-Host "Utente:   $Utente"
  Write-Host "Percorso: $Avvio"
  Write-Host ("Comando:  " + $azioneTask.Execute + ' ' + $azioneTask.Arguments)
  Write-Host ("Innesco:  al logon di " + $Utente)
  Write-Host ("Limite:   '" + $opzioni.ExecutionTimeLimit + "' (PT0S = nessun limite)")
  exit 0
}

$definizione = New-ScheduledTask -Action $azioneTask -Trigger $innesco `
  -Principal $account -Settings $opzioni
Register-ScheduledTask -TaskName $NomeAttivita -InputObject $definizione -Force | Out-Null

Write-Host "[Avvio automatico] Fatto: il programma partira' da solo a ogni accesso a Windows."
Write-Host "                   PC: $env:COMPUTERNAME - utente: $Utente"
Write-Host "                   Percorso: $Avvio"

# Lo avvia subito, cosi' e' attivo anche senza riavviare il PC
Start-ScheduledTask -TaskName $NomeAttivita
Write-Host "[Avvio automatico] Programma avviato adesso (porta 3000)."
exit 0
