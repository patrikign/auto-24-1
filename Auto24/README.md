# Auto24 - large data seeder (Auto24-clone)

This repository provides a reproducible way to load the `Auto24` schema and seed it with large, realistic-looking data using Bun.

What you'll find here:

- `dump.sql` - schema dump for the database (tables: `makes`, `models`, `users`, `vehicles`, `vehicle_images`).
- `scripts/seed.ts` - Bun TypeScript seeder that generates realistic data in batches with a fixed seed for reproducibility.
- `.env.example` - example environment variables controlling targets and DB connection.

Goals and results

The seeder is designed to produce at least one non-lookup table with >= 2,000,000 rows. In this schema the `vehicles` table is the primary large table and will be seeded to the `SEEDER_VEHICLES` value (default 2,000,000). Other non-lookup tables are `users` and `vehicle_images` (images are seeded for a subset). `makes` and `models` are lookup-like (small, controlled cardinality).

Defaults (from `.env.example`):
- `VEHICLES` (target): 2,000,000 rows (vehicles) — meets the 2M requirement.
- `USERS` (target): 400,000 users — provides realistic owner distribution and avoids extreme fan-out.
- `MAKES`: 200, `MODELS_PER_MAKE`: 50 — yields 10k models, allowing many model_id values and distribution across vehicles.

Why these proportions

- 2,000,000 vehicles is the stated hard requirement and is chosen as the largest table to stress insert throughput and indexing.
- 400k users gives a reasonable ratio of ~1 user per 5 vehicles on average; large enough to avoid many vehicles sharing the same user ID while keeping the users table manageable.
- 200 makes * 50 models = 10,000 models gives variety for joins and foreign-key distribution.

Prerequisites

- MySQL 8 (or compatible MariaDB) running locally or reachable by network.
- Bun installed (https://bun.sh) — seeder is a Bun script.
- Node-compatible MySQL driver: the seeder uses `mysql2` (install with bun install mysql2).

Quick start (from repo root)

1. Copy `.env.example` to `.env` and edit DB connection values.

2. Create the database and load schema:

```powershell
# create database
mysql -u root -p -e "CREATE DATABASE auto24 CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
# load schema
mysql -u root -p auto24 < dump.sql
```

3. Install dependencies and run seeder:

```powershell
bun install mysql2
bun run seed
```

Notes on seeding strategy

- The seeder uses a fixed PRNG seed (`SEEDER_SEED`) so runs are reproducible.
- Inserts are done in batches (default 10k) to balance memory and transaction size.
- Foreign key checks are temporarily disabled during mass load for performance and re-enabled after to ensure referential integrity (since lookups are inserted first, there should be no orphan rows).
- The seeder minimizes index pressure during inserts by relying on minimal index usage; you can optimize further by dropping non-essential indexes before load and recreating them later.

Expected duration and footprint

- Time depends on machine, DB configuration, and disk. On a modern desktop with SSD and MySQL tuned for bulk loads, 2M rows can take tens of minutes to a few hours. Adjust `SEEDER_BATCH_SIZE` to match available RAM and transaction log capacity.

Files to inspect

- `dump.sql` — schema to load
- `scripts/seed.ts` — the seeder implementation
- `.env.example` — default targets and DB connection

If you want help tuning the script for your environment (parallel workers, faster bulk-load via LOAD DATA INFILE, or using multiple DB connections), ask and I can propose changes.

Fast CSV + LOAD DATA INFILE workflow (recommended for very large loads)

- Use `scripts/csv_seed.ts` to generate CSV files in `./data`. It writes chunked files (default 200k rows per file) so you don't need huge memory.
- Load with `scripts/load_data.ps1` which runs `LOAD DATA LOCAL INFILE` for each part and then recreates indexes.

Steps:
1. Generate CSVs:
```powershell
bun run scripts/csv_seed.ts
```
2. If your MySQL server does NOT permit LOCAL INFILE, copy `./data` files to the DB server and modify `scripts/load_data.ps1` to call LOAD DATA INFILE (without LOCAL) pointing to server paths.
3. Run the loader:
```powershell
.\scripts\load_data.ps1
```

Requirements for LOAD DATA:
- `mysql` client must be installed and available in PATH.
- If using LOCAL INFILE, both client and server must permit it (`local_infile=1`). If not allowed, copy CSVs to server and use non-LOCAL LOAD DATA INFILE.

Preflight and smoke checks

Before running a full 2M import, run these checks:

1) Preflight (PowerShell) — checks repository files and MySQL variables:

```powershell
pwsh ./scripts/preflight.ps1
```

2) Smoke test (connectivity + quick counts):

```powershell
bun run scripts/smoke_check.ts
```

3) CSV dry-run (generate small CSVs and load them):

```powershell
pwsh ./scripts/csv_dry_run.ps1
```

If these steps succeed, proceed with the full CSV generation and load.


