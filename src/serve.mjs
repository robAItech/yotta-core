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

async function initDatabase() {
  db = new PGlite(); // in-memory (data resets on restart — seed data below)

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

  // ── Seed podatki ──────────────────────────────────────────────────

  const { rows: existing } = await db.query('SELECT COUNT(*) as cnt FROM poslovanje_odlocitve');
  if (parseInt(existing[0].cnt) === 0) {
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

// Static files — admin frontend
const adminDistPath = resolve(__dirname, '../admin');
app.use('/admin', express.static(adminDistPath));

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
  const { password } = req.body;
  if (hashPassword(password || '') !== ADMIN_PASSWORD_HASH) {
    return res.status(401).json({ error: 'Invalid password' });
  }
  const token = generateToken();
  sessions.set(token, { created: Date.now() });
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
    const [narocila, odlocitve, artikli, fakture, projekti] = await Promise.all([
      db.query('SELECT COUNT(*) as cnt, COALESCE(SUM(znesek),0) as total FROM poslovanje_narocila'),
      db.query("SELECT * FROM poslovanje_odlocitve ORDER BY prioriteta DESC, created_at DESC LIMIT 5"),
      db.query('SELECT * FROM poslovanje_artikli WHERE zaloga <= min_zaloga ORDER BY zaloga ASC'),
      db.query("SELECT COALESCE(SUM(znesek),0) as placane FROM poslovanje_fakture WHERE status = 'placano'; SELECT COALESCE(SUM(znesek),0) as odprte FROM poslovanje_fakture WHERE status = 'caka'"),
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
