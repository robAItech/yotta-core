# 📦 Nabava — TOOLS

## API Endpointi

### GET /admin/api/poslovanje/narocila
**Vrne:** Vsa naročila s povezavo na dobavitelja
```json
[{ "id": 1, "stevilka": "N-2025-001", "dobavitelj_id": 1, "dobavitelj_naziv": "TechDistribucija d.o.o.", "znesek": 12500, "status": "odobreno", "datum": "2025-06-01" }]
```

### POST /admin/api/poslovanje/narocila
```json
{ "stevilka": "N-2025-005", "dobavitelj_id": 1, "znesek": 5000, "status": "caka", "datum": "2025-06-20" }
```

### GET /admin/api/poslovanje/dobavitelji
**Vrne:** Vse dobavitelje

### POST /admin/api/poslovanje/dobavitelji
```json
{ "naziv": "Novi Dobavitelj d.o.o.", "kontakt": "Janez", "email": "janez@email.si", "telefon": "041 555 555", "ocena": 4.0, "status": "aktiven" }
```

### GET /admin/api/poslovanje/artikli
**Vrne:** Vse artikle (za preverjanje nizke zaloge)

## Klicni vzorci

```javascript
import api from '../shared/api-client.js';

// Pregled vseh naročil
const narocila = await api.get('/admin/api/poslovanje/narocila');

// Preveri katera naročila so še v čakanju
const cakajoca = narocila.filter(n => n.status === 'caka');

// Ustvari novo naročilo
await api.post('/admin/api/poslovanje/narocila', {
  stevilka: `N-2025-${String(Date.now()).slice(-3)}`,
  dobavitelj_id: 1,
  znesek: 3500,
  status: 'caka',
  datum: new Date().toISOString().slice(0, 10)
});

// Dobi dobavitelje z oceno nad 4.0
const dobavitelji = await api.get('/admin/api/poslovanje/dobavitelji');
const topDobavitelji = dobavitelji.filter(d => d.ocena >= 4.0 && d.status === 'aktiven');

// Preveri artikle z nizko zalogo
const artikli = await api.get('/admin/api/poslovanje/artikli');
const nizkaZaloga = artikli.filter(a => a.zaloga <= a.min_zaloga);
```
