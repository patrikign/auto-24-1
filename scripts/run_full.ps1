<#
Full-run helper: prepares `.env` for a 2,000,000-row load and runs the seeder.

USAGE: Run from repo root:
  .\scripts\run_full.ps1

WARNING: This will generate a lot of data (multi-GB). Ensure you have enough disk space
and MySQL is configured to handle the load (innodb_buffer_pool_size, log sizes, etc.).
#>

Set-Location -Path (Resolve-Path "$PSScriptRoot\..")

Write-Host "Writing .env for full 2,000,000 run"
@"
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASS=
DB_NAME=auto24

SEEDER_BATCH_SIZE=20000
SEEDER_VEHICLES=2000000
SEEDER_USERS=2000000
SEEDER_VEHICLE_IMAGES=2000000

SEEDER_SEED=42
"@ | Out-File -FilePath .env -Encoding utf8 -Force

Write-Host "Ensure you have sufficient disk space and DB tuned. Press Enter to continue or Ctrl+C to abort."
Read-Host

Write-Host "Creating database and loading schema (you may be prompted for MySQL password)"
mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS auto24 CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
mysql -u root -p auto24 < dump.sql

Write-Host "Installing deps and starting seeder (this can take a long time)"
bun install
bun run seed

Write-Host "Full run finished (if no errors). Verify counts with:" 
Write-Host "mysql -u root -p -e \"SELECT COUNT(*) FROM users; SELECT COUNT(*) FROM vehicles; SELECT COUNT(*) FROM vehicle_images;\" auto24"
