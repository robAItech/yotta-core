# 🏭 Skladišče — TOOLS

## API Endpointi

### GET /admin/api/poslovanje/artikli
**Vrne:** Vse artikle
```json
[{ "id": 1, "sku": "SKU-001", "naziv": "AI procesorska enota", "kategorija": "elektronika", "lokacija": "A-01", "zaloga": 12, "min_zaloga": 5, "cena": 450 }]
```

### GET /admin/api/poslovanje/gibanja
**Vrne:** Vsa gibanja s povezavo na artikel
```json
[{ "id": 1, "artikel_id": 1, "artikel_naziv": "AI procesorska enota", "artikel_sku": "SKU-001", "tip": "prejem", "kolicina": 10, "lokacija": "A-01", "referenca": "N-2025-001" }]
```

### POST /admin/api/poslovanje/gibanja
**Ustvari gibanje in avtomatsko posodobi zalogo**
```json
{ "artikel_id": 1, "tip": "prejem", "kolicina": 5, "lokacija": "A-01", "referenca": "N-2025-005", "opomba": "" }
```
- `tip: "prejem"` → zaloga se poveča
- `tip: "odprema"` → zaloga se zmanjša

### POST /admin/api/poslovanje/gibanje
Alias za isti endpoint

## Klicni vzorci

```javascript
import api from '../shared/api-client.js';

// Pregled vseh artiklov
const artikli = await api.get('/admin/api/poslovanje/artikli');

// Artikli z nizko zalogo
const nizka = artikli.filter(a => a.zaloga <= a.min_zaloga);

// Prejem blaga (zaloga se avtomatsko poveča)
await api.post('/admin/api/poslovanje/gibanja', {
  artikel_id: 3,
  tip: 'prejem',
  kolicina: 10,
  lokacija: 'B-01',
  referenca: 'N-2025-006',
  opomba: 'Nadomestni deli'
});

// Odprema blaga (zaloga se avtomatsko zmanjša)
await api.post('/admin/api/poslovanje/gibanja', {
  artikel_id: 5,
  tip: 'odprema',
  kolicina: 3,
  lokacija: 'B-02',
  referenca: 'P-2025-010',
  opomba: 'Izdaja v proizvodnjo'
});

// Pridobi zadnjih 10 gibanj
const gibanja = await api.get('/admin/api/poslovanje/gibanja');
const zadnja = gibanja.slice(0, 10);
```
