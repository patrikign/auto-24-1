#!/usr/bin/env bun
// @ts-nocheck
import fs from 'fs';
import path from 'path';

// Fast CSV generator for bulk LOAD DATA INFILE import.
// Generates chunked CSV files under ./data

function mulberry32(a: number) {
  return function() {
    var t = (a += 0x6D2B79F5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const env = fs.existsSync('.env') ? Object.fromEntries(
  fs.readFileSync('.env','utf8').split(/\r?\n/).filter(Boolean).map(l=>l.split('=').map(s=>s.trim()))
) : {};

const VEHICLES = Number(env.SEEDER_VEHICLES || process.env.SEEDER_VEHICLES || 2000000);
const USERS = Number(env.SEEDER_USERS || process.env.SEEDER_USERS || VEHICLES);
const MAKES = Number(env.SEEDER_MAKES || process.env.SEEDER_MAKES || 200);
const MODELS_PER_MAKE = Number(env.SEEDER_MODELS_PER_MAKE || process.env.SEEDER_MODELS_PER_MAKE || 50);
const CHUNK = Number(env.SEEDER_CSV_CHUNK || process.env.SEEDER_CSV_CHUNK || 200000); // rows per CSV file
const SEED = Number(env.SEEDER_SEED || process.env.SEEDER_SEED || 42);

const rng = mulberry32(SEED);
function pick(arr){ return arr[Math.floor(rng()*arr.length)]; }
const firstNames = ['John','Jane','Alex','Maria','Peter','Laura','Tom','Olga','Lukas','Eva','Martin','Sofia'];
const lastNames = ['Smith','Müller','Novak','Kask','Peterson','Johnson','Brown','Garcia','Martinez','Olsen'];
const cities = ['Tallinn','Tartu','Narva','Pärnu','Viljandi','Riga','Vilnius','Helsinki','Stockholm','Oslo'];
const fuels = ['Petrol','Diesel','Electric','Hybrid','Other'];
const trans = ['Manual','Automatic','Semi-Auto'];

function ensureDir(d){ if(!fs.existsSync(d)) fs.mkdirSync(d,{recursive:true}); }

function writeChunk(filePath, header, rows){
  const ws = fs.createWriteStream(filePath, {flags:'w'});
  if(header) ws.write(header + '\n');
  for(const r of rows) ws.write(r + '\n');
  ws.end();
}

function seqVIN(n){ return n.toString(36).toUpperCase().padStart(17,'0').slice(0,17); }

async function main(){
  const outDir = path.join(process.cwd(),'data');
  ensureDir(outDir);

  console.log('Generating makes and models CSV');
  const makesFile = path.join(outDir,'makes.csv');
  const makesRows = [];
  for(let i=1;i<=MAKES;i++) makesRows.push(escapeCsv(`Make ${i}`));
  writeChunk(makesFile, 'name', makesRows.map(r=>r));

  const modelsFile = path.join(outDir,'models.csv');
  const modelRows = [];
  let modelId = 1;
  for(let m=1;m<=MAKES;m++){
    for(let k=1;k<=MODELS_PER_MAKE;k++){
      modelRows.push(`${m},${escapeCsv(`Model ${m}-${k}`)}`);
      modelId++;
    }
  }
  writeChunk(modelsFile, 'make_id,name', modelRows);

  console.log('Generating users CSVs');
  let u = 0; let chunkIndex = 0;
  while(u < USERS){
    const thisChunk = Math.min(CHUNK, USERS - u);
    const rows = [];
    for(let i=0;i<thisChunk;i++){
      const id = u + i + 1;
      const first = pick(firstNames);
      const last = pick(lastNames);
      const username = `${first.toLowerCase()}.${last.toLowerCase()}.${id}`;
      const email = `${username}@example.com`;
      const password = 'hash'+id;
      const created = new Date().toISOString().slice(0,19).replace('T',' ');
      rows.push([id,escapeCsv(username),escapeCsv(email),escapeCsv(password),created,created,1].join(','));
    }
    const fn = path.join(outDir,`users_part_${chunkIndex}.csv`);
    writeChunk(fn, 'id,username,email,password_hash,created_at,updated_at,is_active', rows);
    console.log('Wrote',fn,'rows',rows.length);
    u += thisChunk; chunkIndex++;
  }

  console.log('Generating vehicles CSVs');
  let v = 0; chunkIndex = 0;
  const totalModels = MAKES * MODELS_PER_MAKE;
  while(v < VEHICLES){
    const thisChunk = Math.min(CHUNK, VEHICLES - v);
    const rows = [];
    for(let i=0;i<thisChunk;i++){
      const id = v + i + 1;
      const model_id = Math.floor(rng()*totalModels) + 1;
      const vin = seqVIN(id);
      const year = 1990 + Math.floor(rng()*35);
      const price = (1000 + Math.floor(rng()*90000)).toFixed(2);
      const desc = `Well maintained ${year} vehicle.`;
      const engine = `${Math.floor(1 + rng()*5)}.0L`;
      const mileage = Math.floor(rng()*300000);
      const fuel = pick(fuels);
      const transmission = pick(trans);
      const doors = pick([2,3,4,5]);
      const seats = pick([2,4,5,7]);
      const location = pick(cities);
      const user_id = ((id - 1) % USERS) + 1; // distribute owners evenly
      const created = new Date().toISOString().slice(0,19).replace('T',' ');
      // model_id,vin,year,price,description,engine,mileage,fuel_type,transmission,doors,seats,location,user_id,created_at
      rows.push([model_id,escapeCsv(vin),year,price,escapeCsv(desc),escapeCsv(engine),mileage,escapeCsv(fuel),escapeCsv(transmission),doors,seats,escapeCsv(location),user_id,created].join(','));
    }
    const fn = path.join(outDir,`vehicles_part_${chunkIndex}.csv`);
    writeChunk(fn, 'model_id,vin,year,price,description,engine,mileage,fuel_type,transmission,doors,seats,location,user_id,created_at', rows);
    console.log('Wrote',fn,'rows',rows.length);
    v += thisChunk; chunkIndex++;
  }

  console.log('Generating vehicle_images CSVs');
  let img = 0; chunkIndex = 0;
  const IMAGES_TARGET = Math.min(VEHICLES, Number(env.SEEDER_VEHICLE_IMAGES||process.env.SEEDER_VEHICLE_IMAGES||VEHICLES));
  while(img < IMAGES_TARGET){
    const thisChunk = Math.min(CHUNK, IMAGES_TARGET - img);
    const rows = [];
    for(let i=0;i<thisChunk;i++){
      const vid = img + i + 1;
      const url = `https://cdn.example.com/vehicles/${vid}/1.jpg`;
      const is_cover = (i % 5 === 0) ? 1 : 0;
      rows.push([vid,escapeCsv(url),is_cover].join(','));
    }
    const fn = path.join(outDir,`vehicle_images_part_${chunkIndex}.csv`);
    writeChunk(fn, 'vehicle_id,image_url,is_cover', rows);
    console.log('Wrote',fn,'rows',rows.length);
    img += thisChunk; chunkIndex++;
  }

  console.log('CSV generation complete. Files are in ./data');
}

function escapeCsv(s){
  if(s === null || s === undefined) return '';
  const str = String(s);
  if(str.includes(',') || str.includes('"') || str.includes('\n')) return '"'+str.replace(/"/g,'""')+'"';
  return str;
}

main();
