#!/usr/bin/env bun
// @ts-nocheck
import fs from 'fs';
import { createPool } from 'mysql2/promise';

const env = fs.existsSync('.env') ? Object.fromEntries(
  fs.readFileSync('.env','utf8').split(/\r?\n/).filter(Boolean).map(l=>l.split('=').map(s=>s.trim()))
) : {};

const DB_HOST = env.DB_HOST || process.env.DB_HOST || '127.0.0.1';
const DB_PORT = Number(env.DB_PORT || process.env.DB_PORT || 3306);
const DB_USER = env.DB_USER || process.env.DB_USER || 'root';
const DB_PASS = env.DB_PASS || process.env.DB_PASS || '';
const DB_NAME = env.DB_NAME || process.env.DB_NAME || 'auto24';

async function main(){
  console.log('Running smoke check against',DB_HOST,DB_PORT,DB_NAME);
  const pool = createPool({ host:DB_HOST, port:DB_PORT, user:DB_USER, password:DB_PASS, database:DB_NAME });
  try{
    const [rows] = await pool.query('SELECT 1 as ok');
    console.log('DB connection OK');
    // quick counts (may be slow if DB empty)
    const [u] = await pool.query('SELECT COUNT(*) AS c FROM users');
    const [v] = await pool.query('SELECT COUNT(*) AS c FROM vehicles');
    console.log('Users:', u[0].c, 'Vehicles:', v[0].c);
  } catch(e){
    console.error('Smoke check failed',e);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
