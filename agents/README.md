# 🤖 Yotta Core — Agent System

**Yotta Core Agents** so avtonomni AI agenti, ki upravljajo poslovne funkcije prek Yotta Core API-ja. Vsak agent je specializiran za svoje področje in sledi **GSTACK principu** (Spomin → Načrt → Izvedba → Zapis).

## Arhitektura

```
                         ┌──────────────────────┐
                         │    UPORABNIK / CLI    │
                         └──────────┬───────────┘
                                    │
                         ┌──────────▼───────────┐
                         │   ORCHESTRATOR AGENT  │
                         │  Usmerja zahteve →    │
                         │  pravi agent          │
                         └──┬─────┬─────┬───────┘
                            │     │     │
              ┌─────────────┼─────┼─────┼──────────────┐
              │             │     │     │              │
     ┌────────▼──┐  ┌──────▼──┐ ┌▼─────┐ ┌────────▼──┐
     │ 👑 CEO    │  │ ⚙️ TECH │ │ 📦   │ │ 🏭        │
     │ Agent     │  │ Agent   │ │NABAVA│ │SKLADIŠČE  │
     └────────┬──┘  └────┬────┘ └──┬───┘ └─────┬─────┘
              │          │        │           │
     ┌────────▼──┐  ┌────▼────┐ ┌─▼──────┐ ┌──▼────────┐
     │ 📒        │  │ 📋      │ │ 🎨     │ │ 📊        │
     │RACUNOVOD. │  │PROJEKTI │ │DIZAJN  │ │DASHBOARD  │
     └───────────┘  └─────────┘ └────────┘ └───────────┘
              │          │        │           │
              └──────────┼────────┼───────────┘
                         │        │
              ┌──────────▼────────▼───────────┐
              │    YOTTA CORE API (serve.mjs)  │
              │    Express.js + PGLite DB      │
              │    Port 3100                   │
              └────────────────────────────────┘
```

## 8 Agentov + Orkestrator

| Agent | Mapa | Vloga | API Endpointi |
|-------|------|-------|--------------|
| 🧠 **Orchestrator** | `orchestrator/` | Usmerjanje zahtev k pravim agentom | Nima lastnih |
| 👑 **CEO** | `ceo/` | Poslovne odločitve, KPI, ekipa | `/odlocitve`, `/kpi` |
| ⚙️ **Tech** | `tech/` | GBrain, GStack, Hermes, Graphfy, Skills | `/tech/status` |
| 📦 **Nabava** | `nabava/` | Naročila, dobavitelji | `/narocila`, `/dobavitelji` |
| 🏭 **Skladišče** | `skladisce/` | Artikli, zaloge, gibanja | `/artikli`, `/gibanja` |
| 📒 **Računovodstvo** | `racunovodstvo/` | Knjiženja, fakture, DDV, bilanca | `/knjizenja`, `/fakture`, `/bilanca`, `/ddv` |
| 📋 **Projekti** | `projekti/` | Kanban projektov (v delu/čaka/zaključeno) | `/projekti` |
| 🎨 **Dizajn** | `dizajn/` | Dizajn naloge, brand assets | `/dizajn/naloge` |

## Struktura agenta

```
agents/<agent>/
├── AGENT.md      ← Osebnost, naloge, GSTACK Loop
├── TOOLS.md      ← API endpointi in klicni vzorci
└── CONTEXT.md    ← Znanje o področju, seed podatki, pravila
```

## Skupna orodja

```
agents/shared/
└── api-client.js ← HTTP client za Yotta Core API
```

### Uporaba api-client.js

```javascript
import api from '../shared/api-client.js';

// 1. Prijava (enkrat)
await api.login('admin123');

// 2. API klici
const kpi = await api.get('/admin/api/poslovanje/kpi');
const odlocitve = await api.get('/admin/api/poslovanje/odlocitve');
const noviProjekt = await api.post('/admin/api/poslovanje/projekti', {
  naziv: 'Moj projekt',
  status: 'v_delu',
  budget: 10000,
});
await api.patch('/admin/api/poslovanje/odlocitve/1', { status: 'odobreno' });
```

## GSTACK Loop (za vsakega agenta)

1. **Spomin (Graphify)** — `api.get(...)` — preberi podatke iz baze
2. **Načrt (Plan)** — analiziraj kaj je treba narediti
3. **Izvedba (Build)** — `api.post(...)` / `api.patch(...)` — izvedi operacijo
4. **Zapis (Log)** — potrdi spremembo, vrni povzetek

## Zagon agentov

Agenti se lahko poženejo na dva načina:

### 1. Prek Hermes agenta (avtonomno)
```bash
cd /mnt/e/Ai-podjetje/hermes
python run_agent.py --skill agents/ceo/AGENT.md
```

### 2. Kot JavaScript modul (ročno)
```javascript
import api from '../shared/api-client.js';
import ceoAgent from '../ceo/AGENT.md';
const result = await ceoAgent.handle({ action: 'kpi' });
```

### 3. Prek Yotta Core Dashboarda
Odpri [http://localhost:3100/admin/](http://localhost:3100/admin/#tehnicni-pregled) → Tech kartica prikazuje stanje vseh agentov.
