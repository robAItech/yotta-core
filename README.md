# Yotta Core — AI Tech Control Dashboard

**Yotta Core** je poslovni nadzorni sistem (dashboard) za vodenje podjetja.  
Zgrajen z **Express.js + PGLite + React** v slovenščini.

![Dashboard](https://via.placeholder.com/800x400/1a1a2e/e0e0e0?text=AI+Tech+Control+Dashboard)

## 📋 Kartice

| Kartica | Opis |
|---------|------|
| 📊 **Nadzorna plošča** | Business KPI + live feed |
| ⚙️ **Tehnični pregled** | GBRAIN · GSTACK · HERMES · GRAPFY · Skills |
| 👑 **CEO** | Odločitve (Odobri/Zavrni), KPI, ekipa |
| 🎨 **Dizajn** | Naloge, brand assets, barvna paleta |
| 📦 **Nabava** | Naročila, dobavitelji, nizka zaloga |
| 🏭 **Skladišče** | Artikli, gibanja (prejem/odprema) |
| 📒 **Računovodstvo** | Bilanca, fakture, DDV, VASCO knjiženja |
| 📋 **Projekti** | Kanban pregled (v delu/zaključeni/podani) |

## 🚀 Zagon

```bash
# En terminal, en ukaz
./start.sh
# ali: bash start.sh
```

**Dashboard:** [http://localhost:3100/admin/](http://localhost:3100/admin/)  
**Geslo:** `admin123`

### Ročni zagon (2 terminala)

**Terminal 1 — Backend:**
```bash
cd /mnt/e/Ai-podjetje/yotta-core
node src/serve.mjs
```

**Terminal 2 — Frontend (development):**
```bash
cd /mnt/e/Ai-podjetje/gbrain/admin
bun run dev --port 5179
```

## 🔧 Nastavitev

Kopiraj `.env.example` v `.env` in nastavi svoje geslo:

```bash
cp .env.example .env
# Uredi .env — spremeni AITECH_CONTROL_PASSWORD
```

## 🏗 Struktura

```
yotta-core/
├── src/serve.mjs           # Express backend + PGLite + API
├── admin/                  # React frontend (built)
│   ├── index.html
│   └── assets/
├── agents/                 # 🤖 AI agenti za poslovne funkcije
│   ├── orchestrator/       # Glavni usmerjevalnik
│   ├── ceo/                # 👑 CEO odločitve in KPI
│   ├── tech/               # ⚙️ Tehnični nadzor
│   ├── nabava/             # 📦 Naročila in dobavitelji
│   ├── skladisce/          # 🏭 Zaloge in gibanja
│   ├── racunovodstvo/      # 📒 Knjiženja in bilanca
│   ├── projekti/           # 📋 Projektni kanban
│   ├── dizajn/             # 🎨 Dizajn naloge
│   └── shared/             # Skupna orodja (api-client)
├── package.json
├── start.sh
├── .env.example
├── .gitignore
└── README.md
```

## 🌐 GitHub Pages

Statčna različica fronte je na [yotta-core.github.io](https://yotta-core.github.io).  
(Potrebuje zagnan backend za API funkcionalnost.)

## 📦 Tehnologije

- **Backend:** Express.js, PGLite (PostgreSQL WASM)
- **Frontend:** React, Vite, TypeScript
- **Auth:** Password-based token auth
- **Baza:** PGLite (in-memory PostgreSQL s seed podatki)

## 💼 Licenca

Proprietary — Yotta Core d.o.o.
