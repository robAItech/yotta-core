# 📋 Projekti — TOOLS

## API Endpointi

### GET /admin/api/poslovanje/projekti
**Vrne:** Vse projekte
```json
[{ "id": 1, "naziv": "AI Tech Control", "status": "v_delu", "budget": 50000, "odgovorna_oseba": "Robert", "rok": "2025-08-01" }]
```

### POST /admin/api/poslovanje/projekti
```json
{ "naziv": "Nov projekt", "opis": "Opis projekta", "status": "v_delu", "budget": 30000, "odgovorna_oseba": "Marina", "rok": "2025-12-31" }
```

### PATCH /admin/api/poslovanje/projekti/:id
```json
{ "status": "zakljucen" }
// ali poljubna kombinacija: { "naziv", "opis", "budget", "odgovorna_oseba", "rok", "status" }
```

## Klicni vzorci

```javascript
import api from '../shared/api-client.js';

// Pregled vseh projektov
const projekti = await api.get('/admin/api/poslovanje/projekti');

// Kanban grouping
const vDelu = projekti.filter(p => p.status === 'v_delu');
const cakajoci = projekti.filter(p => p.status === 'caka');
const zakljuceni = projekti.filter(p => ['zakljucen', 'podan'].includes(p.status));

// Skupni budget aktivnih projektov
const totalBudget = vDelu.reduce((sum, p) => sum + parseFloat(p.budget), 0);

// Nov projekt
await api.post('/admin/api/poslovanje/projekti', {
  naziv: 'Avtomatizacija testiranja',
  opis: 'Implementacija CI/CD pipeline',
  status: 'caka',
  budget: 15000,
  odgovorna_oseba: 'Jan',
  rok: '2025-10-01'
});

// Zaključi projekt
await api.patch('/admin/api/poslovanje/projekti/1', { status: 'zakljucen' });
```
