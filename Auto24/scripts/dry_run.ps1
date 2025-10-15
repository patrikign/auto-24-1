<#
Dry-run helper: creates a temporary `.env` tuned for a small test (1000 rows)
and runs the seeder. You should run this first to verify connectivity and behavior.

Usage (PowerShell):
  cd <repo-root>
  .\scripts\dry_run.ps1

Notes:
- The script writes a local `.env` file (overwrites if exists). Edit the file if you need custom DB credentials.
- You'll be prompted by MySQL for the root password when loading the schema unless you embed credentials in `.env`.
#>

$envFile = Join-Path -Path $PSScriptRoot -ChildPath '..\.env'
Set-Location -Path (Resolve-Path "$PSScriptRoot\..")

Write-Host "Writing temporary .env for dry-run (1000 rows)"
@"
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASS=
DB_NAME=auto24

SEEDER_BATCH_SIZE=1000
SEEDER_VEHICLES=1000
SEEDER_USERS=1000
SEEDER_VEHICLE_IMAGES=1000

SEEDER_SEED=42
"@ | Out-File -FilePath .env -Encoding utf8 -Force

Write-Host "Creating database and loading schema (you may be prompted for MySQL password)"
mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS auto24 CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
mysql -u root -p auto24 < dump.sql

Write-Host "Installing deps and running seeder (dry-run). This may take a minute."
bun install
bun run seed

Write-Host "Dry-run complete. Inspect DB counts with:"
Write-Host "mysql -u root -p -e \"SELECT COUNT(*) FROM users; SELECT COUNT(*) FROM vehicles; SELECT COUNT(*) FROM vehicle_images;\" auto24"
