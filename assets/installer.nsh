!macro customInit
  DetailPrint "Ensuring existing ZONIX Dispatcher instances are closed..."
  nsExec::Exec 'taskkill /F /IM "ZONIX Dispatcher.exe" /T'
  nsExec::Exec 'taskkill /F /IM "zonix.exe" /T'
  Sleep 500
!macroend

!macro customInstall
  DetailPrint "Pre-cleaning process locks before copying files..."
  nsExec::Exec 'taskkill /F /IM "ZONIX Dispatcher.exe" /T'
  nsExec::Exec 'taskkill /F /IM "zonix.exe" /T'
!macroend
