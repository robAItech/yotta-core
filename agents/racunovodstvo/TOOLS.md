# 📒 Računovodstvo — TOOLS

## API Endpointi

### GET /admin/api/poslovanje/knjizenja
**Vrne:** Vsa knjiženja

### POST /admin/api/poslovanje/knjizenja
```json
{ "datum": "2025-06-20", "opis": "Stroški materiala", "znesek": 5000, "tip": "odhodek", "kategorija": "material", "konto_v_dobro": "4000", "konto_v_breme": "2200" }
```

### GET /admin/api/poslovanje/fakture
**Vrne:** Vse fakture

### POST /admin/api/poslovanje/fakture
```json
{ "stevilka": "F-2025-005", "datum": "2025-06-20", "znesek": 15000, "ddv": 3150, "status": "caka", "stranka": "Nova Stranka d.o.o." }
```

### PATCH /admin/api/poslovanje/fakture/:id
```json
{ "status": "placano" }
```

### GET /admin/api/poslovanje/bilanca
**Vrne:** Finančni povzetek
```json
{ "prihodki": 125000, "odhodki": 62500, "terjatve": 49400, "bilanca": 62500 }
```

### GET /admin/api/poslovanje/ddv
**Vrne:** DDV obračun
```json
{ "vstopni_ddv": 0, "izstopni_ddv": 19824, "obveznost": 19824 }
```

### GET /admin/api/poslovanje/transakcije
**Vrne:** Transakcije po računih

## Klicni vzorci

```javascript
import api from '../shared/api-client.js';

// Pridobi bilanco
const bilanca = await api.get('/admin/api/poslovanje/bilanca');
console.log(`Bilanca: ${bilanca.bilanca}€ (P:${bilanca.prihodki} - O:${bilanca.odhodki})`);

// Pridobi DDV
const ddv = await api.get('/admin/api/poslovanje/ddv');

// Nova knjižba v VASCO slogu
await api.post('/admin/api/poslovanje/knjizenja', {
  datum: '2025-06-20',
  opis: 'Prodaja 10x senzor v3',
  znesek: 1800,
  tip: 'prihodek',
  kategorija: 'redni prihodek',
  konto_v_dobro: '1200',
  konto_v_breme: '7600'
});

// Označi fakturo kot plačano
await api.patch('/admin/api/poslovanje/fakture/2', { status: 'placano' });
```
