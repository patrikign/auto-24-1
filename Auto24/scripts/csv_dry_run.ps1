<#
CSV dry-run helper: generate small CSV set and load via LOAD DATA LOCAL INFILE.

Usage: run from repo root:
  .\scripts\csv_dry_run.ps1

This will:
- write a temporary .env with 1000 rows
- generate CSVs (bun run scripts/csv_seed.ts)
- load them with .\scripts\load_data.ps1
#>

Set-Location -Path (Resolve-Path "$PSScriptRoot\..")

Write-Host "Writing .env for CSV dry-run (1000 rows)"
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
SEEDER_CSV_CHUNK=1000

SEEDER_SEED=42
"@ | Out-File -FilePath .env -Encoding utf8 -Force

Write-Host "Creating database and loading schema (you may be prompted for MySQL password)"
mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS auto24 CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
mysql -u root -p auto24 < dump.sql

Write-Host "Generating CSVs (bun run scripts/csv_seed.ts)"
bun run scripts/csv_seed.ts

Write-Host "Loading CSVs into DB (LOAD DATA LOCAL INFILE)"
.\scripts\load_data.ps1

Write-Host "CSV dry-run finished. Check counts with:"
Write-Host "mysql -u root -p -e \"SELECT COUNT(*) FROM users; SELECT COUNT(*) FROM vehicles; SELECT COUNT(*) FROM vehicle_images;\" auto24"
