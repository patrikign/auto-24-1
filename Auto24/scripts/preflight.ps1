<#
Preflight checker for full 2M load.
Checks: free disk space, presence of required files, and MySQL server variables via mysql client.

Usage: run from repo root:
  .\scripts\preflight.ps1

You will be prompted for MySQL password when the script queries server variables.
#>

Set-Location -Path (Resolve-Path "$PSScriptRoot\..")

Write-Host "Preflight check: verifying repo files and system settings..."

function Check-File($path){
  if(Test-Path $path){ Write-Host "OK: $path" -ForegroundColor Green } else { Write-Host "MISSING: $path" -ForegroundColor Red }
}

Check-File "dump.sql"
Check-File "scripts/seed.ts"
Check-File "scripts/csv_seed.ts"
Check-File "scripts/load_data.ps1"
Check-File ".env.example"

Write-Host "\nChecking free disk space on current drive..."
$drive = Get-PSDrive -PSProvider FileSystem | Where-Object { $_.Root -eq (Get-Location).Path.Substring(0,3) }
if($drive){
  Write-Host "Drive:" $drive.Name "Free:" ([math]::Round($drive.Free/1GB,2)) "GB"
} else { Write-Host "Could not determine drive info" -ForegroundColor Yellow }

Write-Host "\nChecking MySQL server variables (you'll be prompted for password)."
Write-Host "If you don't want to run MySQL checks, press Ctrl+C to cancel."
try{
  & mysql -u root -p -e "SHOW VARIABLES LIKE 'innodb_buffer_pool_size'; SHOW VARIABLES LIKE 'innodb_log_file_size'; SHOW VARIABLES LIKE 'local_infile'; SHOW VARIABLES LIKE 'max_allowed_packet';"
} catch {
  Write-Host "mysql client not found or command failed. Install mysql client and ensure it's in PATH." -ForegroundColor Yellow
}

Write-Host "\nPreflight complete. Review the outputs and ensure free disk space and MySQL settings are adequate."
