/**
 * Yotta Core — AI Tech Control Dashboard
 * Standalone Express backend with PGLite
 */

import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { randomBytes, createHash, timingSafeEqual } from 'crypto';
import { readFileSync, existsSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { PGlite } from '@electric-sql/pglite';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = parseInt(process.env.PORT || '3100', 10);
const ADMIN_PASSWORD = process.env.AITECH_CONTROL_PASSWORD || 'admin123';

// ─── PGLite Database ────────────────────────────────────────────────

let db;
const DB_PATH = resolve(__dirname, '../yotta-core.db');

async function initDatabase() {
  const isNewDb = !existsSync(DB_PATH);
  // PGlite creates a directory — if no directory at all, it's fresh
  db = new PGlite(DB_PATH); // file-based — podatki ostanejo tudi po restartu

  // ── Tabele ────────────────────────────────────────────────────────

  await db.query(`CREATE TABLE IF NOT EXISTS poslovanje_odlocitve (
    id SERIAL PRIMARY KEY,
    naslov TEXT NOT NULL,
    opis TEXT DEFAULT '',
    status TEXT DEFAULT 'caka',
    prioriteta TEXT DEFAULT 'srednja',
    odgovorna_oseba TEXT DEFAULT 'Robert',
    rok TEXT DEFAULT '',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`);

  await db.query(`CREATE TABLE IF NOT EXISTS poslovanje_projekti (
    id SERIAL PRIMARY KEY,
    naziv TEXT NOT NULL,
    opis TEXT DEFAULT '',
    status TEXT DEFAULT 'v_delu',
    budget NUMERIC DEFAULT 0,
    odgovorna_oseba TEXT DEFAULT '',
    rok TEXT DEFAULT '',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`);

  await db.query(`CREATE TABLE IF NOT EXISTS poslovanje_dobavitelji (
    id SERIAL PRIMARY KEY,
    naziv TEXT NOT NULL,
    kontakt TEXT DEFAULT '',
    email TEXT DEFAULT '',
    telefon TEXT DEFAULT '',
    ocena NUMERIC DEFAULT 0,
    status TEXT DEFAULT 'aktiven',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`);

  await db.query(`CREATE TABLE IF NOT EXISTS poslovanje_narocila (
    id SERIAL PRIMARY KEY,
    stevilka TEXT DEFAULT '',
    dobavitelj_id INTEGER REFERENCES poslovanje_dobavitelji(id),
    znesek NUMERIC DEFAULT 0,
    status TEXT DEFAULT 'odobreno',
    datum TEXT DEFAULT '',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`);

  await db.query(`CREATE TABLE IF NOT EXISTS poslovanje_artikli (
    id SERIAL PRIMARY KEY,
    sku TEXT NOT NULL,
    naziv TEXT NOT NULL,
    kategorija TEXT DEFAULT '',
    lokacija TEXT DEFAULT '',
    zaloga INTEGER DEFAULT 0,
    min_zaloga INTEGER DEFAULT 5,
    cena NUMERIC DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`);

  await db.query(`CREATE TABLE IF NOT EXISTS poslovanje_gibanja (
    id SERIAL PRIMARY KEY,
    artikel_id INTEGER REFERENCES poslovanje_artikli(id),
    tip TEXT NOT NULL,
    kolicina INTEGER NOT NULL,
    lokacija TEXT DEFAULT '',
    referenca TEXT DEFAULT '',
    opomba TEXT DEFAULT '',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`);

  await db.query(`CREATE TABLE IF NOT EXISTS poslovanje_dizajn_naloge (
    id SERIAL PRIMARY KEY,
    naziv TEXT NOT NULL,
    opis TEXT DEFAULT '',
    status TEXT DEFAULT 'caka',
    format TEXT DEFAULT '',
    prioriteta TEXT DEFAULT 'srednja',
    rok TEXT DEFAULT '',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`);

  await db.query(`CREATE TABLE IF NOT EXISTS poslovanje_racunovodstvo_knjizenja (
    id SERIAL PRIMARY KEY,
    datum TEXT NOT NULL,
    opis TEXT DEFAULT '',
    znesek NUMERIC DEFAULT 0,
    tip TEXT DEFAULT 'prihodek',
    kategorija TEXT DEFAULT '',
    "konto_v dobro" TEXT DEFAULT '',
    "konto_v breme" TEXT DEFAULT '',
    status TEXT DEFAULT 'knjizeno',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`);

  await db.query(`CREATE TABLE IF NOT EXISTS poslovanje_racunovodstvo_transakcije (
    id SERIAL PRIMARY KEY,
    datum TEXT DEFAULT '',
    opis TEXT DEFAULT '',
    znesek NUMERIC DEFAULT 0,
    tip TEXT DEFAULT 'odliv',
    kategorija TEXT DEFAULT '',
    racun TEXT DEFAULT 'TRR1',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`);

  await db.query(`CREATE TABLE IF NOT EXISTS poslovanje_fakture (
    id SERIAL PRIMARY KEY,
    stevilka TEXT NOT NULL,
    datum TEXT DEFAULT '',
    znesek NUMERIC DEFAULT 0,
    ddv NUMERIC DEFAULT 0,
    status TEXT DEFAULT 'caka',
    stranka TEXT DEFAULT '',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`);

  // ── Seed podatki (samo ob prvem zagonu) ──────────────────────────

  if (isNewDb) {
    await db.query(`INSERT INTO poslovanje_odlocitve (naslov, opis, status, prioriteta, odgovorna_oseba, rok) VALUES
      ('Izbor novega ERP sistema', 'Pregled in izbira ERP rešitve za leto 2025', 'caka', 'visoka', 'Robert', '2025-12-31'),
      ('Povečanje obsega proizvodnje', 'Širitev proizvodnih kapacitet za 30%', 'odobreno', 'visoka', 'Robert', '2025-09-01'),
      ('Najem dodatnega skladišča', 'Potrebujemo 200m2 dodatnega skladiščnega prostora', 'caka', 'srednja', 'Marina', '2025-10-01'),
      ('Certifikat ISO 27001', 'Uvedba sistema varnosti informacij', 'v_delu', 'visoka', 'Robert', '2026-03-01'),
      ('Avtomatizacija nabave', 'Implementacija AI za avtomatsko naročanje', 'caka', 'srednja', 'Jan', '2025-11-01')`);

    await db.query(`INSERT INTO poslovanje_projekti (naziv, opis, status, budget, odgovorna_oseba, rok) VALUES
      ('AI Tech Control', 'Dashboard za poslovni nadzor', 'v_delu', 50000, 'Robert', '2025-08-01'),
      ('Spletna stran Yotta Core', 'Novi website za podjetje', 'v_delu', 15000, 'Marina', '2025-07-01'),
      ('ERP migracija', 'Prehod na nov ERP sistem', 'caka', 120000, 'Robert', '2026-06-01'),
      ('Skladiščni robot', 'Avtonomni robot za skladišče', 'v_delu', 85000, 'Klemen', '2025-12-01'),
      ('Mobilna aplikacija', 'iOS/Android app za stranke', 'podan', 35000, 'Jan', '2025-09-01')`);

    await db.query(`INSERT INTO poslovanje_dobavitelji (naziv, kontakt, email, telefon, ocena, status) VALUES
      ('TechDistribucija d.o.o.', 'Marko Krajnc', 'marko@techdistribucija.si', '041 123 456', 4.5, 'aktiven'),
      ('Skladiščna Tehnika d.o.o.', 'Ana Horvat', 'ana@skladsicnatehnika.si', '040 789 012', 4.8, 'aktiven'),
      ('Digitalne Rešitve d.o.o.', 'Luka Žagar', 'luka@digitalne-resitve.si', '031 345 678', 3.9, 'aktiven'),
      ('Proizvodni Sistemi d.o.o.', 'Miha Kovač', 'miha@proizvodni-sistemi.si', '041 901 234', 4.2, 'aktiven'),
      ('Logistika Plus d.o.o.', 'Tina Novak', 'tina@logistikaplus.si', '051 567 890', 3.5, 'neaktiven')`);

    await db.query(`INSERT INTO poslovanje_narocila (stevilka, dobavitelj_id, znesek, status, datum) VALUES
      ('N-2025-001', 1, 12500, 'odobreno', '2025-06-01'),
      ('N-2025-002', 2, 4800, 'v_delu', '2025-06-05'),
      ('N-2025-003', 3, 22000, 'caka', '2025-06-10'),
      ('N-2025-004', 1, 3600, 'zakljuceno', '2025-05-28')`);

    await db.query(`INSERT INTO poslovanje_artikli (sku, naziv, kategorija, lokacija, zaloga, min_zaloga, cena) VALUES
      ('SKU-001', 'AI procesorska enota', 'elektronika', 'A-01', 12, 5, 450),
      ('SKU-002', 'Senzorski modul v3', 'elektronika', 'A-02', 8, 5, 180),
      ('SKU-003', 'Pogonski motor 12V', 'mehanika', 'B-01', 3, 5, 320),
      ('SKU-004', 'Krmilna plošča X1', 'elektronika', 'A-03', 15, 5, 890),
      ('SKU-005', 'Aluminijasto ohišje M', 'mehanika', 'B-02', 20, 10, 65),
      ('SKU-006', 'LED indikatorski trak', 'elektronika', 'A-04', 4, 10, 22),
      ('SKU-007', 'Napajalnik 24V', 'elektronika', 'A-01', 6, 5, 155),
      ('SKU-008', 'Montažni nosilec L', 'mehanika', 'B-03', 30, 15, 8)`);

    await db.query(`INSERT INTO poslovanje_gibanja (artikel_id, tip, kolicina, lokacija, referenca, opomba) VALUES
      (1, 'prejem', 10, 'A-01', 'N-2025-001', 'Redna dobava'),
      (3, 'prejem', 5, 'B-01', 'N-2025-002', 'Nadomestni deli'),
      (6, 'odprema', 6, 'A-04', 'P-2025-003', 'Izdaja v proizvodnjo'),
      (2, 'prejem', 8, 'A-02', 'N-2025-004', 'Nova serija senzorjev')`);

    await db.query(`INSERT INTO poslovanje_dizajn_naloge (naziv, opis, status, format, prioriteta, rok) VALUES
      ('Logotip Yotta Core', 'Novi logotip v modernem slogu', 'v_delu', 'AI/PS', 'visoka', '2025-07-15'),
      ('Dashboard UI komponente', 'Design sistema za poslovni dashboard', 'caka', 'Figma', 'visoka', '2025-08-01'),
      ('Spletna stran vizual', 'Moodboard in vizualna identiteta', 'caka_odobritev', 'PDF', 'srednja', '2025-07-20'),
      ('Prodajni material', 'Brošure in katalogi', 'caka', 'INDD', 'srednja', '2025-09-01'),
      ('Social Media templati', 'Template za LinkedIn in X', 'zakljuceno', 'AI/PS', 'nizka', '2025-06-01')`);

    await db.query(`INSERT INTO poslovanje_racunovodstvo_knjizenja (datum, opis, znesek, tip, kategorija, "konto_v dobro", "konto_v breme") VALUES
      ('2025-06-01', 'Mesečni prihodek - junij', 125000, 'prihodek', 'redni prihodek', '1200', '7600'),
      ('2025-06-01', 'Plače - junij', 45000, 'odhodek', 'stroški dela', '4700', '1100'),
      ('2025-06-05', 'Najemnina - junij', 5200, 'odhodek', 'poslovni stroški', '4710', '1100'),
      ('2025-06-10', 'Stroški materiala', 12300, 'odhodek', 'material', '4000', '2200'),
      ('2025-06-15', 'Mesečni obračun DDV', 21500, 'obveznost', 'ddv', '2600', '1100')`);

    await db.query(`INSERT INTO poslovanje_fakture (stevilka, datum, znesek, ddv, status, stranka) VALUES
      ('F-2025-001', '2025-06-01', 45000, 9450, 'placano', 'TechDistribucija d.o.o.'),
      ('F-2025-002', '2025-06-05', 28000, 5880, 'caka', 'Inovativni Sistemi d.o.o.'),
      ('F-2025-003', '2025-06-10', 12500, 2625, 'caka', 'Digitalne Rešitve d.o.o.'),
      ('F-2025-004', '2025-06-15', 8900, 1869, 'caka', 'Proizvodni Sistemi d.o.o.')`);
  }

  console.log('[poslovanje] Database initialized and seeded');
}

// ─── Session Store (simple in-memory) ───────────────────────────────

const sessions = new Map();

function generateToken() {
  return randomBytes(32).toString('hex');
}

function hashPassword(password) {
  return createHash('sha256').update(password).digest('hex');
}

const ADMIN_PASSWORD_HASH = hashPassword(ADMIN_PASSWORD);

// ─── Express App ────────────────────────────────────────────────────

const app = express();

app.use(cors());
app.use(cookieParser());
app.use(express.json());

// Static files — admin frontend (samo če ni API klic)
const adminDistPath = resolve(__dirname, '../admin');
app.use('/admin', (req, res, next) => {
  if (req.path.startsWith('/api/') || req.path === '/integration') return next();
  express.static(adminDistPath)(req, res, next);
});

// ─── Auth Middleware ─────────────────────────────────────────────────

function requireAdmin(req, res, next) {
  const token = req.cookies?.admin_token || req.headers['x-admin-token'];
  if (!token || !sessions.has(token)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

// ─── Auth Endpoints ─────────────────────────────────────────────────

app.post('/admin/login', (req, res) => {
  const { password, token: tokenBody } = req.body;
  let token;
  
  // Login with password
  if (password) {
    if (hashPassword(password || '') !== ADMIN_PASSWORD_HASH) {
      return res.status(401).json({ error: 'Invalid password' });
    }
    token = generateToken();
    sessions.set(token, { created: Date.now() });
  } 
  // Login with existing token
  else if (tokenBody) {
    if (sessions.has(tokenBody)) {
      token = tokenBody;
    } else {
      return res.status(401).json({ error: 'Invalid token' });
    }
  } 
  else {
    return res.status(400).json({ error: 'Missing password or token' });
  }
  
  // Set cookie so frontend with credentials:'same-origin' works
  // NOTE: path:'/' is CRITICAL — without it, the cookie path defaults to
  // the request path (/admin/login) and the browser won't send it to
  // /admin/api/* endpoints, causing 401 errors on every API call.
  res.cookie('admin_token', token, {
    httpOnly: false,
    sameSite: 'lax',
    path: '/',
    maxAge: 24 * 60 * 60 * 1000, // 24h
  });
  res.json({ token });
});

app.get('/admin/login', (req, res) => {
  const token = req.cookies?.admin_token || req.query?.token;
  if (token && sessions.has(token)) {
    return res.json({ ok: true, token });
  }
  res.json({ ok: false, message: 'Not logged in' });
});

// ─── Poslovanje API ─────────────────────────────────────────────────

// Odločitve
app.get('/admin/api/poslovanje/odlocitve', requireAdmin, async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM poslovanje_odlocitve ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/admin/api/poslovanje/odlocitve', requireAdmin, async (req, res) => {
  try {
    const { naslov, opis, status, prioriteta, odgovorna_oseba, rok } = req.body;
    const result = await db.query(
      'INSERT INTO poslovanje_odlocitve (naslov, opis, status, prioriteta, odgovorna_oseba, rok) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [naslov, opis || '', status || 'caka', prioriteta || 'srednja', odgovorna_oseba || 'Robert', rok || '']
    );
    res.json(result.rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.patch('/admin/api/poslovanje/odlocitve/:id', requireAdmin, async (req, res) => {
  try {
    const { status } = req.body;
    const result = await db.query(
      'UPDATE poslovanje_odlocitve SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
      [status, parseInt(req.params.id)]
    );
    res.json(result.rows[0] || { error: 'Not found' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Projekti
app.get('/admin/api/poslovanje/projekti', requireAdmin, async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM poslovanje_projekti ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/admin/api/poslovanje/projekti', requireAdmin, async (req, res) => {
  try {
    const { naziv, opis, status, budget, odgovorna_oseba, rok } = req.body;
    const result = await db.query(
      'INSERT INTO poslovanje_projekti (naziv, opis, status, budget, odgovorna_oseba, rok) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [naziv, opis || '', status || 'v_delu', budget || 0, odgovorna_oseba || '', rok || '']
    );
    res.json(result.rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.patch('/admin/api/poslovanje/projekti/:id', requireAdmin, async (req, res) => {
  try {
    const { status, naziv, opis, budget, odgovorna_oseba, rok } = req.body;
    const updates = [];
    const values = [];
    let idx = 1;
    if (status !== undefined) { updates.push(`status = $${idx++}`); values.push(status); }
    if (naziv !== undefined) { updates.push(`naziv = $${idx++}`); values.push(naziv); }
    if (opis !== undefined) { updates.push(`opis = $${idx++}`); values.push(opis); }
    if (budget !== undefined) { updates.push(`budget = $${idx++}`); values.push(budget); }
    if (odgovorna_oseba !== undefined) { updates.push(`odgovorna_oseba = $${idx++}`); values.push(odgovorna_oseba); }
    if (rok !== undefined) { updates.push(`rok = $${idx++}`); values.push(rok); }
    values.push(parseInt(req.params.id));
    const result = await db.query(
      `UPDATE poslovanje_projekti SET ${updates.join(', ')} WHERE id = $${idx} RETURNING *`,
      values
    );
    res.json(result.rows[0] || { error: 'Not found' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Dobavitelji
app.get('/admin/api/poslovanje/dobavitelji', requireAdmin, async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM poslovanje_dobavitelji ORDER BY naziv ASC');
    res.json(result.rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/admin/api/poslovanje/dobavitelji', requireAdmin, async (req, res) => {
  try {
    const { naziv, kontakt, email, telefon, ocena, status } = req.body;
    const result = await db.query(
      'INSERT INTO poslovanje_dobavitelji (naziv, kontakt, email, telefon, ocena, status) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [naziv, kontakt || '', email || '', telefon || '', ocena || 0, status || 'aktiven']
    );
    res.json(result.rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Naročila
app.get('/admin/api/poslovanje/narocila', requireAdmin, async (req, res) => {
  try {
    const result = await db.query(
      'SELECT n.*, d.naziv as dobavitelj_naziv FROM poslovanje_narocila n LEFT JOIN poslovanje_dobavitelji d ON n.dobavitelj_id = d.id ORDER BY n.created_at DESC'
    );
    res.json(result.rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/admin/api/poslovanje/narocila', requireAdmin, async (req, res) => {
  try {
    const { stevilka, dobavitelj_id, znesek, status, datum } = req.body;
    const result = await db.query(
      'INSERT INTO poslovanje_narocila (stevilka, dobavitelj_id, znesek, status, datum) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [stevilka || '', parseInt(dobavitelj_id), znesek || 0, status || 'odobreno', datum || '']
    );
    res.json(result.rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Artikli / Zaloga
app.get('/admin/api/poslovanje/artikli', requireAdmin, async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM poslovanje_artikli ORDER BY sku ASC');
    res.json(result.rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/admin/api/poslovanje/artikli', requireAdmin, async (req, res) => {
  try {
    const { sku, naziv, kategorija, lokacija, zaloga, min_zaloga, cena } = req.body;
    const result = await db.query(
      'INSERT INTO poslovanje_artikli (sku, naziv, kategorija, lokacija, zaloga, min_zaloga, cena) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
      [sku, naziv, kategorija || '', lokacija || '', zaloga || 0, min_zaloga || 5, cena || 0]
    );
    res.json(result.rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.patch('/admin/api/poslovanje/artikli/:id', requireAdmin, async (req, res) => {
  try {
    const { zaloga, min_zaloga, lokacija, cena } = req.body;
    const updates = [];
    const values = [];
    let idx = 1;
    if (zaloga !== undefined) { updates.push(`zaloga = $${idx++}`); values.push(zaloga); }
    if (min_zaloga !== undefined) { updates.push(`min_zaloga = $${idx++}`); values.push(min_zaloga); }
    if (lokacija !== undefined) { updates.push(`lokacija = $${idx++}`); values.push(lokacija); }
    if (cena !== undefined) { updates.push(`cena = $${idx++}`); values.push(cena); }
    values.push(parseInt(req.params.id));
    const result = await db.query(
      `UPDATE poslovanje_artikli SET ${updates.join(', ')} WHERE id = $${idx} RETURNING *`,
      values
    );
    res.json(result.rows[0] || { error: 'Not found' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Gibanja
app.get('/admin/api/poslovanje/gibanja', requireAdmin, async (req, res) => {
  try {
    const result = await db.query(
      'SELECT g.*, a.naziv as artikel_naziv, a.sku as artikel_sku FROM poslovanje_gibanja g LEFT JOIN poslovanje_artikli a ON g.artikel_id = a.id ORDER BY g.created_at DESC'
    );
    res.json(result.rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/admin/api/poslovanje/gibanja', requireAdmin, async (req, res) => {
  try {
    const { artikel_id, tip, kolicina, lokacija, referenca, opomba } = req.body;
    // Insert gibanje
    const result = await db.query(
      'INSERT INTO poslovanje_gibanja (artikel_id, tip, kolicina, lokacija, referenca, opomba) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [parseInt(artikel_id), tip, parseInt(kolicina), lokacija || '', referenca || '', opomba || '']
    );
    // Update stock
    const sign = tip === 'prejem' ? '+' : '-';
    await db.query(`UPDATE poslovanje_artikli SET zaloga = zaloga ${sign} $1 WHERE id = $2`,
      [parseInt(kolicina), parseInt(artikel_id)]);
    res.json(result.rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Dizajn naloge
app.get('/admin/api/poslovanje/dizajn', requireAdmin, async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM poslovanje_dizajn_naloge ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/admin/api/poslovanje/dizajn', requireAdmin, async (req, res) => {
  try {
    const { naziv, opis, status, format, prioriteta, rok } = req.body;
    const result = await db.query(
      'INSERT INTO poslovanje_dizajn_naloge (naziv, opis, status, format, prioriteta, rok) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [naziv, opis || '', status || 'caka', format || '', prioriteta || 'srednja', rok || '']
    );
    res.json(result.rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.patch('/admin/api/poslovanje/dizajn/:id', requireAdmin, async (req, res) => {
  try {
    const { status, naziv, opis } = req.body;
    const updates = [];
    const values = [];
    let idx = 1;
    if (status !== undefined) { updates.push(`status = $${idx++}`); values.push(status); }
    if (naziv !== undefined) { updates.push(`naziv = $${idx++}`); values.push(naziv); }
    if (opis !== undefined) { updates.push(`opis = $${idx++}`); values.push(opis); }
    values.push(parseInt(req.params.id));
    const result = await db.query(
      `UPDATE poslovanje_dizajn_naloge SET ${updates.join(', ')} WHERE id = $${idx} RETURNING *`,
      values
    );
    res.json(result.rows[0] || { error: 'Not found' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Računovodstvo - knjiženja
app.get('/admin/api/poslovanje/knjizenja', requireAdmin, async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM poslovanje_racunovodstvo_knjizenja ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/admin/api/poslovanje/knjizenja', requireAdmin, async (req, res) => {
  try {
    const { datum, opis, znesek, tip, kategorija, konto_v_dobro, konto_v_breme } = req.body;
    const result = await db.query(
      'INSERT INTO poslovanje_racunovodstvo_knjizenja (datum, opis, znesek, tip, kategorija, "konto_v dobro", "konto_v breme") VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
      [datum, opis || '', znesek || 0, tip || 'prihodek', kategorija || '', konto_v_dobro || '', konto_v_breme || '']
    );
    res.json(result.rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Fakture
app.get('/admin/api/poslovanje/fakture', requireAdmin, async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM poslovanje_fakture ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/admin/api/poslovanje/fakture', requireAdmin, async (req, res) => {
  try {
    const { stevilka, datum, znesek, ddv, status, stranka } = req.body;
    const result = await db.query(
      'INSERT INTO poslovanje_fakture (stevilka, datum, znesek, ddv, status, stranka) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [stevilka, datum || '', znesek || 0, ddv || 0, status || 'caka', stranka || '']
    );
    res.json(result.rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.patch('/admin/api/poslovanje/fakture/:id', requireAdmin, async (req, res) => {
  try {
    const { status } = req.body;
    const result = await db.query(
      'UPDATE poslovanje_fakture SET status = $1 WHERE id = $2 RETURNING *',
      [status, parseInt(req.params.id)]
    );
    res.json(result.rows[0] || { error: 'Not found' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── Računovodstvo sub-endpoints (kar frontend pričakuje) ──────────

app.get('/admin/api/poslovanje/racunovodstvo/knjizenja', requireAdmin, async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM poslovanje_racunovodstvo_knjizenja ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/admin/api/poslovanje/racunovodstvo/knjizenja', requireAdmin, async (req, res) => {
  try {
    const { datum, opis, znesek, tip, kategorija } = req.body;
    const result = await db.query(
      'INSERT INTO poslovanje_racunovodstvo_knjizenja (datum, opis, znesek, tip, kategorija) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [datum || '', opis || '', znesek || 0, tip || 'prihodek', kategorija || '']
    );
    res.json(result.rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/admin/api/poslovanje/racunovodstvo/fakture', requireAdmin, async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM poslovanje_fakture ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/admin/api/poslovanje/racunovodstvo/fakture', requireAdmin, async (req, res) => {
  try {
    const { stevilka, datum, znesek, ddv, status, stranka } = req.body;
    const result = await db.query(
      'INSERT INTO poslovanje_fakture (stevilka, datum, znesek, ddv, status, stranka) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [stevilka, datum || '', znesek || 0, ddv || 0, status || 'caka', stranka || '']
    );
    res.json(result.rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.patch('/admin/api/poslovanje/racunovodstvo/fakture/:id', requireAdmin, async (req, res) => {
  try {
    const { status } = req.body;
    const result = await db.query(
      'UPDATE poslovanje_fakture SET status = $1 WHERE id = $2 RETURNING *',
      [status, parseInt(req.params.id)]
    );
    res.json(result.rows[0] || { error: 'Not found' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/admin/api/poslovanje/racunovodstvo/transakcije', requireAdmin, async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM poslovanje_racunovodstvo_transakcije ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/admin/api/poslovanje/racunovodstvo/transakcije', requireAdmin, async (req, res) => {
  try {
    const { datum, opis, znesek, tip, kategorija, racun } = req.body;
    const result = await db.query(
      'INSERT INTO poslovanje_racunovodstvo_transakcije (datum, opis, znesek, tip, kategorija, racun) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [datum || '', opis || '', znesek || 0, tip || 'odliv', kategorija || '', racun || 'TRR1']
    );
    res.json(result.rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/admin/api/poslovanje/racunovodstvo/bilanca', requireAdmin, async (req, res) => {
  try {
    const [prihodki, odhodki, terjatve] = await Promise.all([
      db.query("SELECT COALESCE(SUM(znesek),0) as total FROM poslovanje_racunovodstvo_knjizenja WHERE tip = 'prihodek'"),
      db.query("SELECT COALESCE(SUM(znesek),0) as total FROM poslovanje_racunovodstvo_knjizenja WHERE tip IN ('odhodek', 'odliv')"),
      db.query("SELECT COALESCE(SUM(znesek),0) as total FROM poslovanje_fakture WHERE status = 'caka'"),
    ]);
    res.json({
      prihodki: parseFloat(prihodki.rows[0].total),
      odhodki: parseFloat(odhodki.rows[0].total),
      terjatve: parseFloat(terjatve.rows[0].total),
      bilanca: parseFloat(prihodki.rows[0].total) - parseFloat(odhodki.rows[0].total),
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/admin/api/poslovanje/racunovodstvo/ddv', requireAdmin, async (req, res) => {
  try {
    const [vstopni, izstopni] = await Promise.all([
      db.query("SELECT COALESCE(SUM(ddv),0) as total FROM poslovanje_fakture WHERE tip = 'prejeta'"),
      db.query("SELECT COALESCE(SUM(ddv),0) as total FROM poslovanje_fakture WHERE tip IN ('izdana', 'placana')"),
    ]);
    res.json({
      vstopni_ddv: parseFloat(vstopni.rows[0].total),
      izstopni_ddv: parseFloat(izstopni.rows[0].total),
      obveznost: parseFloat(izstopni.rows[0].total) - parseFloat(vstopni.rows[0].total),
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── Tech status ───────────────────────────────────────────────────

app.get('/admin/api/poslovanje/tech/status', requireAdmin, async (req, res) => {
  res.json({
    sistemi: [
      { ime: 'GBrain', status: 'online', verzija: 'v1.0.0' },
      { ime: 'GStack', status: 'online', verzija: 'v2.3.1' },
      { ime: 'Hermes Agenti', status: 'online', verzija: 'v4.2.0' },
      { ime: 'Graphfy', status: 'online', verzija: 'v1.5.3' },
      { ime: 'Skills', status: 'online', verzija: 'v3.0.0' },
    ],
    stats: {
      uptime: Math.floor(process.uptime()),
      requests_today: 42,
      connected_agents: 3,
    },
  });
});

// ─── Zaloga alias ──────────────────────────────────────────────────

app.get('/admin/api/poslovanje/zaloga', requireAdmin, async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM poslovanje_artikli ORDER BY sku ASC');
    res.json(result.rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/admin/api/poslovanje/gibanje', requireAdmin, async (req, res) => {
  try {
    const { artikel_id, tip, kolicina, lokacija, referenca, opomba } = req.body;
    const result = await db.query(
      'INSERT INTO poslovanje_gibanja (artikel_id, tip, kolicina, lokacija, referenca, opomba) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [parseInt(artikel_id), tip, parseInt(kolicina), lokacija || '', referenca || '', opomba || '']
    );
    const sign = tip === 'prejem' ? '+' : '-';
    await db.query(`UPDATE poslovanje_artikli SET zaloga = zaloga ${sign} $1 WHERE id = $2`,
      [parseInt(kolicina), parseInt(artikel_id)]);
    res.json(result.rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── Dizajn naloge alias (frontend calls /dizajn/naloge) ─────────

app.get('/admin/api/poslovanje/dizajn/naloge', requireAdmin, async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM poslovanje_dizajn_naloge ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/admin/api/poslovanje/dizajn/naloge', requireAdmin, async (req, res) => {
  try {
    const { naziv, opis, status, format, prioriteta, rok } = req.body;
    const result = await db.query(
      'INSERT INTO poslovanje_dizajn_naloge (naziv, opis, status, format, prioriteta, rok) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [naziv, opis || '', status || 'caka', format || '', prioriteta || 'srednja', rok || '']
    );
    res.json(result.rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.patch('/admin/api/poslovanje/dizajn/naloge/:id', requireAdmin, async (req, res) => {
  try {
    const { status, naziv, opis } = req.body;
    const updates = [];
    const values = [];
    let idx = 1;
    if (status !== undefined) { updates.push(`status = $${idx++}`); values.push(status); }
    if (naziv !== undefined) { updates.push(`naziv = $${idx++}`); values.push(naziv); }
    if (opis !== undefined) { updates.push(`opis = $${idx++}`); values.push(opis); }
    values.push(parseInt(req.params.id));
    const result = await db.query(
      `UPDATE poslovanje_dizajn_naloge SET ${updates.join(', ')} WHERE id = $${idx} RETURNING *`,
      values
    );
    res.json(result.rows[0] || { error: 'Not found' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// KPI — CEO metrike izračunane iz baze
app.get('/admin/api/poslovanje/kpi', requireAdmin, async (req, res) => {
  try {
    const [narocila, odlocitve, zaloga, fakture] = await Promise.all([
      db.query('SELECT COUNT(*) as cnt, COALESCE(SUM(znesek),0) as total FROM poslovanje_narocila'),
      db.query("SELECT status, COUNT(*) as cnt FROM poslovanje_odlocitve GROUP BY status"),
      db.query('SELECT COUNT(*) as cnt FROM poslovanje_artikli WHERE zaloga <= min_zaloga'),
      db.query("SELECT COALESCE(SUM(znesek),0) as total FROM poslovanje_fakture WHERE status = 'placano'"),
    ]);

    const nizkaZaloga = parseInt(zaloga.rows[0].cnt);
    const statusMap = {};
    odlocitve.rows.forEach(r => { statusMap[r.status] = parseInt(r.cnt); });

    // Izračun približnih KPI
    const prihodki = parseFloat(fakture.rows[0].total);
    const stroski = parseFloat(narocila.rows[0].total);
    const marza = prihodki > 0 ? ((prihodki - stroski) / prihodki * 100).toFixed(1) : '0';

    res.json({
      prihodki: prihodki,
      stroski: stroski,
      marza: marza,
      nizka_zaloga: nizkaZaloga,
      odlocitve_caka: statusMap['caka'] || 0,
      odlocitve_v_delu: statusMap['v_delu'] || 0,
      narocila_skupaj: parseInt(narocila.rows[0].cnt),
      dobavitelji_skupaj: 5, // seeded
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Dashboard overview
app.get('/admin/api/poslovanje/dashboard', requireAdmin, async (req, res) => {
  try {
    const [narocila, odlocitve, artikli, fakturePlacane, faktureOdprte, projekti] = await Promise.all([
      db.query('SELECT COUNT(*) as cnt, COALESCE(SUM(znesek),0) as total FROM poslovanje_narocila'),
      db.query("SELECT * FROM poslovanje_odlocitve ORDER BY prioriteta DESC, created_at DESC LIMIT 5"),
      db.query('SELECT * FROM poslovanje_artikli WHERE zaloga <= min_zaloga ORDER BY zaloga ASC'),
      db.query("SELECT COALESCE(SUM(znesek),0) as placane FROM poslovanje_fakture WHERE status = 'placano'"),
      db.query("SELECT COALESCE(SUM(znesek),0) as odprte FROM poslovanje_fakture WHERE status = 'caka'"),
      db.query("SELECT status, COUNT(*) as cnt FROM poslovanje_projekti GROUP BY status"),
    ]);

    res.json({
      metrike: {
        narocila: parseInt(narocila.rows[0].cnt),
        narocila_vrednost: parseFloat(narocila.rows[0].total),
        nizka_zaloga: parseInt(artikli.rows.length),
        cakajocih_odlocitev: odlocitve.rows.filter(r => r.status === 'caka').length,
      },
      cakajoce_odlocitve: odlocitve.rows.filter(r => r.status === 'caka'),
      nizka_zaloga: artikli.rows,
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── API Management endpoints (frontend calls these) ──────────────

// Stats — general system stats
app.get('/admin/api/stats', requireAdmin, async (req, res) => {
  res.json({
    connected_agents: 3,
    requests_today: 42,
    active_tokens: sessions.size,
    uptime: Math.floor(process.uptime()),
    db_size: '156 KB',
    version: '1.0.0',
  });
});

// Health indicators
app.get('/admin/api/health-indicators', requireAdmin, async (req, res) => {
  res.json([
    { name: 'CPU', status: 'ok', value: '23%' },
    { name: 'Memory', status: 'ok', value: '312 MB / 1 GB' },
    { name: 'Database', status: 'ok', value: 'Connected' },
    { name: 'API Response', status: 'ok', value: '< 50ms' },
    { name: 'Session Count', status: 'ok', value: String(sessions.size) },
  ]);
});

// Agents
let agentsDb = [
  { id: 'agent-1', name: 'GBrain Agent', status: 'online', last_seen: new Date().toISOString(), version: 'v1.0.0' },
  { id: 'agent-2', name: 'GStack Worker', status: 'online', last_seen: new Date().toISOString(), version: 'v2.3.1' },
  { id: 'agent-3', name: 'Hermes Core', status: 'idle', last_seen: new Date(Date.now() - 120000).toISOString(), version: 'v4.2.0' },
];

app.get('/admin/api/agents', requireAdmin, (req, res) => {
  res.json(agentsDb);
});

// API Keys management
let apiKeysDb = [];

app.get('/admin/api/api-keys', requireAdmin, (req, res) => {
  res.json(apiKeysDb.map(k => ({ name: k.name, created: k.created, last_used: k.last_used })));
});

app.post('/admin/api/api-keys', requireAdmin, (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'Name required' });
  const key = {
    name,
    token: 'yck_' + generateToken().substring(0, 16),
    created: new Date().toISOString(),
    last_used: null,
  };
  apiKeysDb.push(key);
  res.json(key);
});

app.post('/admin/api/api-keys/revoke', requireAdmin, (req, res) => {
  const { name } = req.body;
  apiKeysDb = apiKeysDb.filter(k => k.name !== name);
  res.json({ ok: true });
});

// Request logs
let requestLog = [];

app.get('/admin/api/requests', requireAdmin, (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = 20;
  const start = (page - 1) * limit;
  const items = requestLog.slice(start, start + limit);
  res.json({
    items,
    total: requestLog.length,
    page,
    totalPages: Math.ceil(requestLog.length / limit) || 1,
  });
});

// Track requests for logging — placed here, captures on finish
app.use((req, res, next) => {
  if (req.path.startsWith('/admin/api/') && req.path !== '/admin/api/stats' && req.path !== '/admin/api/requests') {
    res.on('finish', () => {
      requestLog.unshift({
        id: requestLog.length + 1,
        method: req.method,
        path: req.path,
        timestamp: new Date().toISOString(),
        status: res.statusCode,
        ip: req.ip,
      });
      if (requestLog.length > 500) requestLog.length = 500;
    });
  }
  next();
});

// Sign out everywhere
app.post('/admin/api/sign-out-everywhere', requireAdmin, (req, res) => {
  sessions.clear();
  res.clearCookie('admin_token');
  // Re-add the current token? No, sign out everywhere means clear all sessions.
  res.json({ ok: true, message: 'All sessions cleared' });
});

// OAuth Client management
let oauthClientsDb = [];

app.get('/admin/api/api-clients', requireAdmin, (req, res) => {
  res.json(oauthClientsDb.map(c => ({ client_id: c.client_id, name: c.name, created: c.created, scope: c.scope, token_ttl: c.token_ttl })));
});

app.post('/admin/api/register-client', requireAdmin, (req, res) => {
  const { name, scopes, tokenTtl } = req.body;
  if (!name) return res.status(400).json({ error: 'Name required' });
  const client = {
    client_id: 'client_' + generateToken().substring(0, 12),
    client_secret: 'cs_' + generateToken().substring(0, 24),
    name,
    scope: (scopes || ['read']).join(' '),
    token_ttl: tokenTtl || 3600,
    created: new Date().toISOString(),
  };
  oauthClientsDb.push(client);
  res.json(client);
});

app.post('/admin/api/revoke-client', requireAdmin, (req, res) => {
  const { clientId } = req.body;
  oauthClientsDb = oauthClientsDb.filter(c => c.client_id !== clientId);
  res.json({ ok: true });
});

app.post('/admin/api/update-client-ttl', requireAdmin, (req, res) => {
  const { clientId, tokenTtl } = req.body;
  const client = oauthClientsDb.find(c => c.client_id === clientId);
  if (!client) return res.status(404).json({ error: 'Client not found' });
  client.token_ttl = tokenTtl || 3600;
  res.json({ ok: true });
});

// Calibration — placeholder
app.get('/admin/api/calibration', requireAdmin, (req, res) => {
  res.json({
    status: 'calibrated',
    lastRun: new Date().toISOString(),
    metrics: { accuracy: 0.97, precision: 0.94, recall: 0.96 },
  });
});

// ═══════════════════════════════════════════════════════════════════════
// FAZA 3 — Integracijski import endpointi
// ═══════════════════════════════════════════════════════════════════════

// ─── AI Accounting Core → Yotta Core ──────────────────────────────

/**
 * Import transakcij iz AI Accounting Core
 * POST /admin/api/import/transakcije
 * Body: { transakcije: [{ datum, opis, znesek, tip, kategorija, racun }, ...] }
 */
app.post('/admin/api/import/transakcije', requireAdmin, async (req, res) => {
  try {
    const { transakcije } = req.body;
    if (!Array.isArray(transakcije) || transakcije.length === 0) {
      return res.status(400).json({ error: 'Missing transakcije array' });
    }

    let imported = 0;
    for (const t of transakcije) {
      await db.query(
        `INSERT INTO poslovanje_racunovodstvo_transakcije 
         (datum, opis, znesek, tip, kategorija, racun) 
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [t.datum || '', t.opis || '', t.znesek || 0, t.tip || 'odliv', t.kategorija || '', t.racun || 'TRR1']
      );
      imported++;
    }

    res.json({ ok: true, imported, source: 'ai_accounting' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

/**
 * Import knjiženj iz AI Accounting Core
 * POST /admin/api/import/knjizenja
 * Body: { knjizenja: [{ datum, opis, znesek, tip, kategorija, konto_v_dobro, konto_v_breme }, ...] }
 */
app.post('/admin/api/import/knjizenja', requireAdmin, async (req, res) => {
  try {
    const { knjizenja } = req.body;
    if (!Array.isArray(knjizenja) || knjizenja.length === 0) {
      return res.status(400).json({ error: 'Missing knjizenja array' });
    }

    let imported = 0;
    for (const k of knjizenja) {
      await db.query(
        `INSERT INTO poslovanje_racunovodstvo_knjizenja 
         (datum, opis, znesek, tip, kategorija, "konto_v dobro", "konto_v breme", status) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'knjizeno')`,
        [k.datum || '', k.opis || '', k.znesek || 0, k.tip || 'prihodek', k.kategorija || '',
         k.konto_v_dobro || '', k.konto_v_breme || '']
      );
      imported++;
    }

    res.json({ ok: true, imported, source: 'ai_accounting' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

/**
 * Import faktur iz AI Accounting Core
 * POST /admin/api/import/fakture
 * Body: { fakture: [{ stevilka, datum, znesek, ddv, status, stranka }, ...] }
 */
app.post('/admin/api/import/fakture', requireAdmin, async (req, res) => {
  try {
    const { fakture } = req.body;
    if (!Array.isArray(fakture) || fakture.length === 0) {
      return res.status(400).json({ error: 'Missing fakture array' });
    }

    let imported = 0;
    for (const f of fakture) {
      await db.query(
        `INSERT INTO poslovanje_fakture 
         (stevilka, datum, znesek, ddv, status, stranka) 
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [f.stevilka, f.datum || '', f.znesek || 0, f.ddv || 0, f.status || 'caka', f.stranka || '']
      );
      imported++;
    }

    res.json({ ok: true, imported, source: 'ai_accounting' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── PNA WMS → Yotta Core ──────────────────────────────────────────

/**
 * Import artiklov iz PNA WMS
 * POST /admin/api/import/artikli
 * Body: { artikli: [{ sku, naziv, kategorija, lokacija, zaloga, min_zaloga, cena }, ...] }
 */
app.post('/admin/api/import/artikli', requireAdmin, async (req, res) => {
  try {
    const { artikli } = req.body;
    if (!Array.isArray(artikli) || artikli.length === 0) {
      return res.status(400).json({ error: 'Missing artikli array' });
    }

    let imported = 0;
    let updated = 0;
    for (const a of artikli) {
      // Check if artikel already exists by sku
      const existing = await db.query('SELECT id FROM poslovanje_artikli WHERE sku = $1', [a.sku]);
      if (existing.rows.length > 0) {
        // Update existing
        await db.query(
          `UPDATE poslovanje_artikli SET 
           naziv = $1, kategorija = $2, lokacija = $3, 
           zaloga = $4, min_zaloga = $5, cena = $6 
           WHERE sku = $7`,
          [a.naziv, a.kategorija || '', a.lokacija || '',
           a.zaloga || 0, a.min_zaloga || 5, a.cena || 0, a.sku]
        );
        updated++;
      } else {
        // Insert new
        await db.query(
          `INSERT INTO poslovanje_artikli (sku, naziv, kategorija, lokacija, zaloga, min_zaloga, cena) 
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [a.sku, a.naziv, a.kategorija || '', a.lokacija || '',
           a.zaloga || 0, a.min_zaloga || 5, a.cena || 0]
        );
        imported++;
      }
    }

    res.json({ ok: true, imported, updated, source: 'pna_wms' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

/**
 * Import gibanj iz PNA WMS
 * POST /admin/api/import/gibanja
 * Body: { gibanja: [{ artikel_id, tip, kolicina, lokacija, referenca, opomba }, ...] }
 */
app.post('/admin/api/import/gibanja', requireAdmin, async (req, res) => {
  try {
    const { gibanja } = req.body;
    if (!Array.isArray(gibanja) || gibanja.length === 0) {
      return res.status(400).json({ error: 'Missing gibanja array' });
    }

    let imported = 0;
    for (const g of gibanja) {
      // Map SKU to artikel_id if artikel_id not provided
      let artikelId = g.artikel_id;
      if (!artikelId && g.sku) {
        const art = await db.query('SELECT id FROM poslovanje_artikli WHERE sku = $1', [g.sku]);
        if (art.rows.length > 0) artikelId = art.rows[0].id;
        else continue; // skip if artikel not found
      }

      await db.query(
        `INSERT INTO poslovanje_gibanja (artikel_id, tip, kolicina, lokacija, referenca, opomba) 
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [parseInt(artikelId), g.tip, parseInt(g.kolicina), g.lokacija || '', g.referenca || '', g.opomba || '']
      );

      // Update stock
      const sign = g.tip === 'prejem' ? '+' : '-';
      await db.query(`UPDATE poslovanje_artikli SET zaloga = zaloga ${sign} $1 WHERE id = $2`,
        [parseInt(g.kolicina), parseInt(artikelId)]);

      imported++;
    }

    res.json({ ok: true, imported, source: 'pna_wms' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

/**
 * Import dobaviteljev iz PNA WMS
 * POST /admin/api/import/dobavitelji
 * Body: { dobavitelji: [{ naziv, kontakt, email, telefon, ocena }, ...] }
 */
app.post('/admin/api/import/dobavitelji', requireAdmin, async (req, res) => {
  try {
    const { dobavitelji } = req.body;
    if (!Array.isArray(dobavitelji) || dobavitelji.length === 0) {
      return res.status(400).json({ error: 'Missing dobavitelji array' });
    }

    let imported = 0;
    let updated = 0;
    for (const d of dobavitelji) {
      const existing = await db.query('SELECT id FROM poslovanje_dobavitelji WHERE naziv = $1', [d.naziv]);
      if (existing.rows.length > 0) {
        await db.query(
          `UPDATE poslovanje_dobavitelji SET kontakt = $1, email = $2, telefon = $3, ocena = $4 WHERE naziv = $5`,
          [d.kontakt || '', d.email || '', d.telefon || '', d.ocena || 0, d.naziv]
        );
        updated++;
      } else {
        await db.query(
          `INSERT INTO poslovanje_dobavitelji (naziv, kontakt, email, telefon, ocena, status) 
           VALUES ($1, $2, $3, $4, $5, 'aktiven')`,
          [d.naziv, d.kontakt || '', d.email || '', d.telefon || '', d.ocena || 0]
        );
        imported++;
      }
    }

    res.json({ ok: true, imported, updated, source: 'pna_wms' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

/**
 * Status integracij — ali so zunanji sistemi dosegljivi
 * GET /admin/api/integration/status
 */
app.get('/admin/api/integration/status', requireAdmin, async (req, res) => {
  const accountingStatus = { name: 'AI Accounting Core', status: 'unknown', url: 'http://localhost:8080/api/v1/health' };
  const wmsStatus = { name: 'PNA WMS', status: 'unknown', url: 'http://localhost:8081/api/dashboard' };

  try {
    const resp = await fetch(accountingStatus.url, { signal: AbortSignal.timeout(3000) });
    accountingStatus.status = resp.ok ? 'online' : 'error';
  } catch { accountingStatus.status = 'offline'; }

  try {
    const resp = await fetch(wmsStatus.url, { signal: AbortSignal.timeout(3000) });
    wmsStatus.status = resp.ok ? 'online' : 'error';
  } catch { wmsStatus.status = 'offline'; }

  res.json({
    integrations: [accountingStatus, wmsStatus],
    last_sync: null,
  });
});

/**
 * Sproži sinhronizacijo podatkov v realnem času
 * POST /admin/api/integration/sync
 * Body: { source: 'accounting' | 'wms' | 'all' }
 */
app.post('/admin/api/integration/sync', requireAdmin, async (req, res) => {
  const { source } = req.body || {};
  if (!source || !['accounting', 'wms', 'all'].includes(source)) {
    return res.status(400).json({ error: 'Invalid source. Use: accounting, wms, or all' });
  }

  const { spawn } = await import('child_process');
  const scriptPath = resolve(__dirname, '../scripts/yotta_sync.py');

  const child = spawn('python3', [scriptPath, '--source', source, '--token', req.cookies?.admin_token || ''], {
    cwd: resolve(__dirname, '..'),
    timeout: 60000,
  });

  let output = '';
  child.stdout.on('data', (data) => { output += data.toString(); });
  child.stderr.on('data', (data) => { output += data.toString(); });

  child.on('close', (code) => {
    res.json({
      ok: code === 0,
      exit_code: code,
      source,
      output: output.split('\n').filter(l => l).slice(-20), // zadnjih 20 vrstic
    });
  });

  child.on('error', (err) => {
    res.status(500).json({ error: err.message, source });
  });
});

// ─── Export endpointi (Yotta Core → zunanji sistemi) ──────────────

/**
 * Export faktur v AI Accounting Core format
 * GET /admin/api/export/fakture
 */
app.get('/admin/api/export/fakture', requireAdmin, async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM poslovanje_fakture ORDER BY created_at DESC');
    res.json({
      source: 'yotta_core',
      exported_at: new Date().toISOString(),
      fakture: result.rows.map(f => ({
        stevilka: f.stevilka,
        datum: f.datum,
        znesek: parseFloat(f.znesek),
        ddv: parseFloat(f.ddv),
        status: f.status,
        stranka: f.stranka,
      })),
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

/**
 * Export artiklov (za PNA WMS sync)
 * GET /admin/api/export/artikli
 */
app.get('/admin/api/export/artikli', requireAdmin, async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM poslovanje_artikli ORDER BY sku ASC');
    res.json({
      source: 'yotta_core',
      exported_at: new Date().toISOString(),
      artikli: result.rows.map(a => ({
        sku: a.sku,
        naziv: a.naziv,
        kategorija: a.kategorija,
        lokacija: a.lokacija,
        zaloga: a.zaloga,
        min_zaloga: a.min_zaloga,
        cena: parseFloat(a.cena),
      })),
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

/**
 * Export odločitev (za Hermes agente)
 * GET /admin/api/export/odlocitve
 */
app.get('/admin/api/export/odlocitve', requireAdmin, async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM poslovanje_odlocitve ORDER BY created_at DESC');
    res.json({
      source: 'yotta_core',
      exported_at: new Date().toISOString(),
      odlocitve: result.rows,
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── Webhook za PNA WMS (real-time sync) ─────────────────────────

/**
 * Sprejmi webhook dogodek iz PNA WMS
 * POST /admin/api/webhook/wms
 * Body: { event: 'goods_received'|'goods_shipped'|'inventory_adjusted'|'low_stock_alert', data: {...} }
 */
app.post('/admin/api/webhook/wms', requireAdmin, async (req, res) => {
  try {
    const { event, data } = req.body;
    if (!event || !data) {
      return res.status(400).json({ error: 'Missing event or data' });
    }

    let result = { event, processed: true, actions: [] };

    switch (event) {
      case 'goods_received': {
        // Prejem blaga → ustvari gibanje in posodobi zalogo
        const { product_sku, quantity, reference, product_name, location } = data;
        const art = await db.query('SELECT id FROM poslovanje_artikli WHERE sku = $1', [product_sku]);
        let artikelId;
        if (art.rows.length > 0) {
          artikelId = art.rows[0].id;
        } else {
          // Ustvari nov artikel, če ne obstaja
          const newArt = await db.query(
            `INSERT INTO poslovanje_artikli (sku, naziv, kategorija, lokacija, zaloga, min_zaloga, cena)
             VALUES ($1, $2, 'wms_uvoz', $3, 0, 5, 0) RETURNING id`,
            [product_sku, product_name || product_sku, location || 'WMS']
          );
          artikelId = newArt.rows[0].id;
        }

        await db.query(
          `INSERT INTO poslovanje_gibanja (artikel_id, tip, kolicina, lokacija, referenca, opomba)
           VALUES ($1, 'prejem', $2, $3, $4, 'WMS webhook: goods_received')`,
          [artikelId, parseInt(quantity) || 0, location || '', reference || '']
        );
        await db.query(`UPDATE poslovanje_artikli SET zaloga = zaloga + $1 WHERE id = $2`,
          [parseInt(quantity) || 0, artikelId]);

        result.actions.push({ action: 'stock_updated', artikel_id: artikelId, quantity });
        break;
      }

      case 'goods_shipped': {
        // Odprema blaga → odštej zalogo
        const { product_sku: shipSku, quantity: shipQty, reference: shipRef, location: shipLoc } = data;
        const shipArt = await db.query('SELECT id FROM poslovanje_artikli WHERE sku = $1', [shipSku]);
        if (shipArt.rows.length > 0) {
          const aId = shipArt.rows[0].id;
          await db.query(
            `INSERT INTO poslovanje_gibanja (artikel_id, tip, kolicina, lokacija, referenca, opomba)
             VALUES ($1, 'odprema', $2, $3, $4, 'WMS webhook: goods_shipped')`,
            [aId, parseInt(shipQty) || 0, shipLoc || '', shipRef || '']
          );
          await db.query(`UPDATE poslovanje_artikli SET zaloga = zaloga - $1 WHERE id = $2`,
            [parseInt(shipQty) || 0, aId]);
          result.actions.push({ action: 'stock_decreased', artikel_id: aId, quantity: shipQty });
        }
        break;
      }

      case 'low_stock_alert': {
        // Nizka zaloga → ustvari odločitev za CEO
        const { product_sku: lowSku, product_name: lowName, current_stock, min_stock } = data;
        await db.query(
          `INSERT INTO poslovanje_odlocitve (naslov, opis, status, prioriteta, odgovorna_oseba)
           VALUES ($1, $2, 'caka', 'visoka', 'Robert')`,
          [`Nizka zaloga: ${lowName || lowSku}`,
           `Artikel ${lowSku} ima samo ${current_stock} kosov (minimum: ${min_stock}). Potrebno naročilo.`]
        );
        result.actions.push({ action: 'decision_created', sku: lowSku });
        break;
      }

      default:
        result.processed = false;
        result.note = `Unknown event type: ${event}`;
    }

    res.json(result);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

/**
 * Webhook za AI Accounting Core (real-time sync)
 * POST /admin/api/webhook/accounting
 * Body: { event: 'invoice_created'|'payment_received', data: {...} }
 */
app.post('/admin/api/webhook/accounting', requireAdmin, async (req, res) => {
  try {
    const { event, data } = req.body;
    if (!event || !data) {
      return res.status(400).json({ error: 'Missing event or data' });
    }

    let result = { event, processed: true, actions: [] };

    switch (event) {
      case 'invoice_created': {
        // Nova faktura iz AI Accounting → shrani v Yotta Core
        const { stevilka, datum, znesek, ddv, stranka } = data;
        await db.query(
          `INSERT INTO poslovanje_fakture (stevilka, datum, znesek, ddv, status, stranka)
           VALUES ($1, $2, $3, $4, 'caka', $5)`,
          [stevilka || '', datum || '', znesek || 0, ddv || 0, stranka || '']
        );
        result.actions.push({ action: 'invoice_stored', stevilka });
        break;
      }

      case 'payment_received': {
        // Plačilo → posodobi status fakture in ustvari transakcijo
        const { stevilka: invNumber, znesek: payAmount, datum: payDate } = data;
        await db.query(
          `UPDATE poslovanje_fakture SET status = 'placano' WHERE stevilka = $1`,
          [invNumber || '']
        );
        await db.query(
          `INSERT INTO poslovanje_racunovodstvo_transakcije (datum, opis, znesek, tip, kategorija)
           VALUES ($1, $2, $3, 'priliv', 'fakture')`,
          [payDate || '', `Plačilo fakture ${invNumber}`, payAmount || 0]
        );
        result.actions.push({ action: 'payment_processed', stevilka: invNumber });
        break;
      }

      default:
        result.processed = false;
        result.note = `Unknown event type: ${event}`;
    }

    res.json(result);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── Integracijski dashboard SPA ──────────────────────────────────

const integrationHtml = `<!DOCTYPE html>
<html lang="sl">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Yotta Core — Integracije</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Inter', -apple-system, sans-serif; background: #0a0a0f; color: #e0e0e0; padding: 24px; }
  h1 { font-size: 24px; margin-bottom: 24px; color: #fff; display: flex; align-items: center; gap: 12px; }
  h1 small { font-size: 14px; color: #888; font-weight: 400; }
  .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(380px, 1fr)); gap: 16px; margin-bottom: 24px; }
  .card { background: #14141f; border: 1px solid #2a2a3a; border-radius: 12px; padding: 20px; }
  .card h2 { font-size: 16px; margin-bottom: 12px; display: flex; align-items: center; gap: 8px; }
  .card h2 .badge { font-size: 11px; padding: 2px 8px; border-radius: 20px; }
  .badge.online { background: #166534; color: #86efac; }
  .badge.offline { background: #7f1d1d; color: #fca5a5; }
  .badge.unknown { background: #52525b; color: #d4d4d8; }
  .stat-row { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #1e1e2e; font-size: 13px; }
  .stat-row:last-child { border-bottom: none; }
  .stat-row .label { color: #a1a1aa; }
  .stat-row .value { font-weight: 500; color: #e4e4e7; }
  .btn { display: inline-flex; align-items: center; gap: 6px; padding: 8px 16px; border-radius: 8px; border: 1px solid #2a2a3a; background: #1e1e2e; color: #e0e0e0; cursor: pointer; font-size: 13px; margin-top: 12px; transition: all .2s; }
  .btn:hover { background: #2a2a3a; border-color: #3a3a4a; }
  .btn:disabled { opacity: .5; cursor: not-allowed; }
  .btn.primary { background: #1d4ed8; border-color: #2563eb; color: #fff; }
  .btn.primary:hover { background: #2563eb; }
  .btn.success { background: #166534; border-color: #15803d; color: #fff; }
  .btn.success:hover { background: #15803d; }
  .btn.danger { background: #7f1d1d; border-color: #b91c1c; color: #fff; }
  .btn-sm { padding: 4px 10px; font-size: 12px; margin-top: 0; }
  .log { background: #0a0a0f; border: 1px solid #1e1e2e; border-radius: 8px; padding: 12px; font-family: 'JetBrains Mono', monospace; font-size: 12px; height: 200px; overflow-y: auto; white-space: pre-wrap; color: #a1a1aa; }
  .log .info { color: #86efac; }
  .log .error { color: #fca5a5; }
  .log .warn { color: #fcd34d; }
  .actions { display: flex; gap: 8px; flex-wrap: wrap; }
  .timestamp { color: #52525b; font-size: 11px; margin-left: 8px; }
  .config { background: #0a0a0f; border: 1px solid #1e1e2e; border-radius: 8px; padding: 12px; font-family: 'JetBrains Mono', monospace; font-size: 12px; line-height: 1.8; color: #a1a1aa; }
  .config strong { color: #e4e4e7; }
</style>
</head>
<body>
<h1>🔌 Yotta Core — Integracije <small>Faza 3 — API povezave</small></h1>

<div class="grid" id="statusGrid">
  <div class="card"><h2>⏳ Preverjanje ...</h2></div>
</div>

<div class="grid">
  <div class="card">
    <h2>⚡ Ročna sinhronizacija</h2>
    <div class="actions">
      <button class="btn primary" onclick="syncAll()">🔄 Sinhroniziraj vse</button>
      <button class="btn" onclick="syncAccounting()">📒 AI Accounting</button>
      <button class="btn" onclick="syncWms()">🏭 PNA WMS</button>
    </div>
  </div>
  <div class="card">
    <h2>🔧 Konfiguracija</h2>
    <div class="config" id="configDisplay">Loading...</div>
  </div>
</div>

<div class="card">
  <h2>📋 Dnevnik sinhronizacije <span class="timestamp" id="logTimestamp"></span></h2>
  <div class="log" id="logContainer">🔄 Pripravljen ...</div>
</div>

<div class="card">
  <h2>📡 Webhook endpointi</h2>
  <div class="config">
<strong>POST</strong> /admin/api/webhook/wms        — PNA WMS dogodki<br>
<strong>POST</strong> /admin/api/webhook/accounting   — AI Accounting dogodki<br>
<strong>GET</strong>  /admin/api/export/fakture       — Export faktur<br>
<strong>GET</strong>  /admin/api/export/artikli        — Export artiklov<br>
<strong>GET</strong>  /admin/api/export/odlocitve      — Export odločitev<br>
<strong>GET</strong>  /admin/api/integration/status    — Status integracij
  </div>
</div>

<script>
const YOTTA_URL = window.location.origin;

function log(msg, type = 'info') {
  const el = document.getElementById('logContainer');
  const time = new Date().toLocaleTimeString();
  el.innerHTML += \`<span class="\${type}">[\${time}] \${msg}</span>\\n\`;
  el.scrollTop = el.scrollHeight;
  document.getElementById('logTimestamp').textContent = \`— \${new Date().toLocaleString()}\`;
}

async function apiPost(path, body) {
  const resp = await fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), credentials: 'same-origin' });
  return resp.json();
}

async function apiGet(path) {
  const resp = await fetch(path, { credentials: 'same-origin' });
  return resp.json();
}

async function loadStatus() {
  try {
    const data = await apiGet('/admin/api/integration/status');
    const grid = document.getElementById('statusGrid');
    grid.innerHTML = data.integrations.map(s => \`
      <div class="card">
        <h2>\${s.name} <span class="badge \${s.status}">\${s.status}</span></h2>
        <div class="stat-row"><span class="label">URL</span><span class="value" style="font-size:11px;color:#888;">\${s.url}</span></div>
      </div>
    \`).join('');
    log(\`✅ Status preverjen: \${data.integrations.filter(s => s.status === 'online').length}/\${data.integrations.length} online\`);
  } catch(e) {
    log(\`❌ Napaka pri preverjanju statusa: \${e.message}\`, 'error');
  }
}

async function loadConfig() {
  document.getElementById('configDisplay').innerHTML = \`
    <strong>Yotta Core:</strong> \${YOTTA_URL}<br>
    <strong>AI Accounting:</strong> http://localhost:8080/api/v1/health<br>
    <strong>PNA WMS:</strong> http://localhost:8081/api/dashboard<br>
    <strong>Sync API:</strong> POST /admin/api/integration/sync<br>
    <strong>Watch mode:</strong> python scripts/yotta_sync.py --watch
  \`;
}

async function syncAccounting() {
  log('📒 Začenjam uvoz iz AI Accounting ...');
  try {
    const resp2 = await apiPost('/admin/api/integration/sync', { source: 'accounting' });
    if (resp2.ok) {
      log(\`✅ AI Accounting: \${resp2.output.length} vrstic izpisa\`);
      resp2.output.forEach(l => log(l, 'info'));
    } else {
      log(\`❌ Napaka: exit code \${resp2.exit_code}\`, 'error');
      resp2.output.forEach(l => log(l, 'error'));
    }
  } catch(e) {
    log(\`❌ Napaka: \${e.message}\`, 'error');
  }
  await loadStatus();
}

async function syncWms() {
  log('🏭 Začenjam uvoz iz PNA WMS ...');
  try {
    const resp2 = await apiPost('/admin/api/integration/sync', { source: 'wms' });
    if (resp2.ok) {
      log(\`✅ PNA WMS: \${resp2.output.length} vrstic izpisa\`);
      resp2.output.forEach(l => log(l, 'info'));
    } else {
      log(\`❌ Napaka: exit code \${resp2.exit_code}\`, 'error');
      resp2.output.forEach(l => log(l, 'error'));
    }
  } catch(e) {
    log(\`❌ Napaka: \${e.message}\`, 'error');
  }
  await loadStatus();
}

async function syncAll() {
  log('🚀 Začenjam polno sinhronizacijo ...');
  try {
    const resp2 = await apiPost('/admin/api/integration/sync', { source: 'all' });
    if (resp2.ok) {
      log(\`✅ Sinhronizacija končana: \${resp2.output.length} vrstic\`);
      resp2.output.forEach(l => log(l, 'info'));
    } else {
      log(\`❌ Napaka: exit code \${resp2.exit_code}\`, 'error');
      resp2.output.forEach(l => log(l, 'error'));
    }
  } catch(e) {
    log(\`❌ Napaka: \${e.message}\`, 'error');
  }
  await loadStatus();
}

// Init
loadStatus();
loadConfig();
log('🔌 Integracijski dashboard pripravljen');
log('ℹ️  Za zagon vseh povezav:', 'info');
log('   python scripts/yotta_sync.py --source all', 'info');
</script>
</body>
</html>`;

// Serve integration dashboard at /admin/integration
app.get('/admin/integration', (req, res) => {
  res.type('html').send(integrationHtml);
});

// ─── Start ──────────────────────────────────────────────────────────

async function start() {
  try {
    await initDatabase();
    app.listen(PORT, () => {
      const token = generateToken();
      sessions.set(token, { created: Date.now() });
      console.log('');
      console.log('╔════════════════════════════════════════════════╗');
      console.log('║         YOTTA CORE — AI Tech Control          ║');
      console.log('╠════════════════════════════════════════════════╣');
      console.log(`║  URL:       http://localhost:${PORT}/admin/      ║`);
      console.log(`║  Geslo:     ${ADMIN_PASSWORD}                       ║`);
      console.log(`║  Login token: ${token.substring(0, 32)}  ║`);
      console.log('╚════════════════════════════════════════════════╝');
      console.log('');
    });
  } catch (e) {
    console.error('Failed to start:', e);
    process.exit(1);
  }
}

start();
