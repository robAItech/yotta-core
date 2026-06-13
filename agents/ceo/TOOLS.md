# 👑 CEO — TOOLS

## API Endpointi

### GET /admin/api/poslovanje/kpi
**Vrne:** CEO metrike
```json
{
  "prihodki": 94400,
  "stroski": 42900,
  "marza": "54.6",
  "nizka_zaloga": 3,
  "odlocitve_caka": 3,
  "odlocitve_v_delu": 1,
  "narocila_skupaj": 4,
  "dobavitelji_skupaj": 5
}
```

### GET /admin/api/poslovanje/odlocitve
**Vrne:** Seznam vseh odločitev (urejeno po datumu)

### POST /admin/api/poslovanje/odlocitve
**Ustvari:** Novo odločitev
```json
{ "naslov": "str", "opis": "str", "status": "caka|odobreno|v_delu|zavrnjeno", "prioriteta": "visoka|srednja|nizka", "odgovorna_oseba": "str", "rok": "2025-12-31" }
```

### PATCH /admin/api/poslovanje/odlocitve/:id
**Spremeni:** Status odločitve
```json
{ "status": "odobreno" }
```

## Klicni vzorci

```javascript
import api from '../shared/api-client.js';

// Pridobi KPI
const kpi = await api.get('/admin/api/poslovanje/kpi');

// Dobi vse odločitve
const odlocitve = await api.get('/admin/api/poslovanje/odlocitve');

// Odobri odločitev
await api.patch('/admin/api/poslovanje/odlocitve/3', { status: 'odobreno' });

// Nova odločitev z visoko prioriteto
await api.post('/admin/api/poslovanje/odlocitve', {
  naslov: 'Najem dodatnega skladišča',
  opis: 'Potrebujemo 200m2 za širitev',
  status: 'caka',
  prioriteta: 'visoka',
  odgovorna_oseba: 'Marina',
  rok: '2025-10-01'
});
```
