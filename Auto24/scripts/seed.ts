#!/usr/bin/env bun
// @ts-nocheck - this script runs with Bun; disable TS checking in repo environment
import fs from 'fs';
import { createPool } from 'mysql2/promise';

// Simple seeded RNG (Mulberry32)
function mulberry32(a: number) {
  return function() {
    var t = (a += 0x6D2B79F5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

let env: Record<string,string> = {};
if (fs.existsSync('.env')) {
  env = Object.fromEntries(
    fs.readFileSync('.env', 'utf8')
      .split(/\r?\n/)
      .filter(Boolean)
      .map((l) => l.split('=').map((s) => s.trim()))
  );
}

const DB_HOST = env.DB_HOST || process.env.DB_HOST || '127.0.0.1';
const DB_PORT = Number(env.DB_PORT || process.env.DB_PORT || 3306);
const DB_USER = env.DB_USER || process.env.DB_USER || 'root';
const DB_PASS = env.DB_PASS || process.env.DB_PASS || '';
const DB_NAME = env.DB_NAME || process.env.DB_NAME || 'auto24';

const BATCH = Number(env.SEEDER_BATCH_SIZE || process.env.SEEDER_BATCH_SIZE || 20000);
const VEHICLES_TARGET = Number(env.SEEDER_VEHICLES || process.env.SEEDER_VEHICLES || 2000000);
// default USERS_TARGET should match README recommendation (400k) instead of falling back to VEHICLES_TARGET
const USERS_TARGET = Number(env.SEEDER_USERS || process.env.SEEDER_USERS || 400000);
const VEHICLE_IMAGES_TARGET = Number(env.SEEDER_VEHICLE_IMAGES || process.env.SEEDER_VEHICLE_IMAGES || VEHICLES_TARGET);
const MAKES = Number(env.SEEDER_MAKES || process.env.SEEDER_MAKES || 200);
const MODELS_PER_MAKE = Number(env.SEEDER_MODELS_PER_MAKE || process.env.SEEDER_MODELS_PER_MAKE || 50);
const SEED = Number(env.SEEDER_SEED || process.env.SEEDER_SEED || 42);

const rng = mulberry32(SEED);

function pick<T>(arr: T[]) {
  return arr[Math.floor(rng() * arr.length)];
}

const firstNames = ['John','Jane','Alex','Maria','Peter','Laura','Tom','Olga','Lukas','Eva','Martin','Sofia'];
const lastNames = ['Smith','Müller','Novak','Kask','Peterson','Johnson','Brown','Garcia','Martinez','Olsen'];
const cities = ['Tallinn','Tartu','Narva','Pärnu','Viljandi','Riga','Vilnius','Helsinki','Stockholm','Oslo'];
const fuels = ['Petrol','Diesel','Electric','Hybrid','Other'];
const trans = ['Manual','Automatic','Semi-Auto'];

async function main() {
  console.log('Connecting to DB', DB_HOST, DB_PORT, DB_NAME);
  const pool = createPool({
    host: DB_HOST,
    port: DB_PORT,
    user: DB_USER,
    password: DB_PASS,
    database: DB_NAME,
    waitForConnections: true,
    connectionLimit: 50,
    queueLimit: 0,
  });
  try {
    // 1) Prepare DB for bulk load: disable foreign key checks and drop non-unique indexes to speed inserts
    console.log('Disabling foreign key checks for bulk load');
    await pool.query('SET FOREIGN_KEY_CHECKS=0');

  // Drop non-unique indexes (ignore errors if they don't exist)
  const dropIndex = async (sql: string) => {
    try {
      await pool.query(sql);
    } catch (e) {
      // ignore
    }
  };
  console.log('Dropping non-unique indexes to speed bulk inserts');
  await dropIndex('ALTER TABLE models DROP INDEX idx_models_make_id');
  await dropIndex('ALTER TABLE vehicles DROP INDEX idx_vehicles_model_id');
  await dropIndex('ALTER TABLE vehicles DROP INDEX idx_vehicles_user_id');
  await dropIndex('ALTER TABLE vehicle_images DROP INDEX idx_vehicle_images_vehicle_id');

  // 2) Seed lookup tables: makes, models
    console.log('Seeding makes and models');
  const makeIds: number[] = [];
  for (let i = 1; i <= MAKES; i++) {
    const name = `Make ${i}`;
    const [res] = await pool.query('INSERT INTO makes (name) VALUES (?)', [name]);
    // @ts-ignore
    makeIds.push(res.insertId);
  }

  const modelIds: number[] = [];
  for (const makeId of makeIds) {
    for (let j = 1; j <= MODELS_PER_MAKE; j++) {
      const name = `Model ${makeId}-${j}`;
      const [res] = await pool.query('INSERT INTO models (make_id, name) VALUES (?, ?)', [makeId, name]);
      // @ts-ignore
      modelIds.push(res.insertId);
    }
  }

    console.log(`Inserted ${makeIds.length} makes and ${modelIds.length} models`);

  // 3) Seed users in batches
    console.log(`Seeding users in batches... target ${USERS_TARGET}`);
  let usersInserted = 0;
  while (usersInserted < USERS_TARGET) {
    const batch = Math.min(BATCH, USERS_TARGET - usersInserted);
    const values: string[] = [];
    const params: any[] = [];
    for (let i = 0; i < batch; i++) {
      const id = usersInserted + i + 1;
      const first = pick(firstNames);
      const last = pick(lastNames);
      // include id to guarantee uniqueness at large scale
      const username = `${first.toLowerCase()}.${last.toLowerCase()}${id}`;
      const email = `${first.toLowerCase()}.${last.toLowerCase()}.${id}@example.com`;
      const pass = 'hash' + Math.floor(rng()*1e9);
      const created = new Date(Date.now() - Math.floor(rng()*5*365*24*3600*1000)).toISOString().slice(0,19).replace('T',' ');
      values.push('(?,?,?,?,?,?)');
      params.push(username, email, pass, created, created, 1);
    }
    const sql = `INSERT INTO users (username,email,password_hash,created_at,updated_at,is_active) VALUES ${values.join(',')}`;
    await pool.query(sql, params);
    usersInserted += batch;
    console.log(`Users inserted: ${usersInserted}/${USERS_TARGET}`);
  }

  // 4) Seed vehicles in batches - this is the big table (target >= VEHICLES_TARGET)
    console.log('Seeding vehicles in batches...');
    let vehiclesInserted = 0;
  const userCount = USERS_TARGET;
  while (vehiclesInserted < VEHICLES_TARGET) {
    const batch = Math.min(BATCH, VEHICLES_TARGET - vehiclesInserted);
    const values: string[] = [];
    const params: any[] = [];
    for (let i = 0; i < batch; i++) {
      const model_id = pick(modelIds);
  const vin = generateVIN(vehiclesInserted + i + 1);
      const year = 1990 + Math.floor(rng()*35);
      const price = (1000 + Math.floor(rng()*90000)) + (Math.floor(rng()*100)/100);
      const desc = `Well maintained ${year} vehicle.`;
      const engine = `${Math.floor(1 + rng()*5)}.0L`;
      const mileage = Math.floor(rng()*300000);
      const fuel = pick(fuels);
      const transmission = pick(trans);
      const doors = pick([2,3,4,5]);
      const seats = pick([2,4,5,7]);
      const location = pick(cities);
      const user_id = Math.floor(rng()*userCount) + 1;
      const created = new Date(Date.now() - Math.floor(rng()*3*365*24*3600*1000)).toISOString().slice(0,19).replace('T',' ');
      values.push('(?,?,?,?,?,?,?,?,?,?,?,?,?,?)');
      params.push(model_id, vin, year, price.toFixed(2), desc, engine, mileage, fuel, transmission, doors, seats, location, user_id, created);
    }
    const sql = `INSERT INTO vehicles (model_id,vin,year,price,description,engine,mileage,fuel_type,transmission,doors,seats,location,user_id,created_at) VALUES ${values.join(',')}`;
    await pool.query(sql, params);
    vehiclesInserted += batch;
    console.log(`Vehicles inserted: ${vehiclesInserted}/${VEHICLES_TARGET}`);
  }

  // 5) Seed vehicle_images
  console.log(`Seeding vehicle_images: target ${VEHICLE_IMAGES_TARGET}`);
  const IMAGES_TARGET = Math.min(VEHICLE_IMAGES_TARGET, VEHICLES_TARGET);
  let imagesInserted = 0;
    while (imagesInserted < IMAGES_TARGET) {
      const batch = Math.min(BATCH, IMAGES_TARGET - imagesInserted);
    const values: string[] = [];
    const params: any[] = [];
    for (let i = 0; i < batch; i++) {
      const vid = imagesInserted + i + 1;
      const url = `https://cdn.example.com/vehicles/${vid}/1.jpg`;
      const is_cover = i % 5 === 0 ? 1 : 0;
      values.push('(?,?,?)');
      params.push(vid, url, is_cover);
    }
      const sql = `INSERT INTO vehicle_images (vehicle_id,image_url,is_cover) VALUES ${values.join(',')}`;
      await pool.query(sql, params);
    imagesInserted += batch;
    console.log(`Vehicle images inserted: ${imagesInserted}/${IMAGES_TARGET}`);
  }
    // Re-enable FK checks and recreate indexes
    console.log('Recreating dropped indexes');
    try { await pool.query('CREATE INDEX idx_models_make_id ON models (make_id)'); } catch (e) {}
    try { await pool.query('CREATE INDEX idx_vehicles_model_id ON vehicles (model_id)'); } catch (e) {}
    try { await pool.query('CREATE INDEX idx_vehicles_user_id ON vehicles (user_id)'); } catch (e) {}
    try { await pool.query('CREATE INDEX idx_vehicle_images_vehicle_id ON vehicle_images (vehicle_id)'); } catch (e) {}

    await pool.query('SET FOREIGN_KEY_CHECKS=1');

    console.log('Seeding complete');
  } catch (err) {
    console.error('Seeding failed:', err);
    throw err;
  } finally {
    try { await pool.end(); } catch (e) { /* ignore */ }
  }
}

function generateVIN(n: number) {
  // Deterministic unique VIN-like string based on sequence number.
  // Use base36 (0-9A-Z) representation of the sequence and pad to 17 characters.
  const v = n.toString(36).toUpperCase();
  return v.padStart(17, '0').slice(0,17);
}

main().catch((e) => {
  console.error('Seeder failed', e);
  process.exit(1);
});
