# 🎨 Dizajn — TOOLS

## API Endpointi

### GET /admin/api/poslovanje/dizajn/naloge
**Vrne:** Vse dizajn naloge
```json
[{ "id": 1, "naziv": "Logotip Yotta Core", "status": "v_delu", "format": "AI/PS", "prioriteta": "visoka", "rok": "2025-07-15" }]
```

### POST /admin/api/poslovanje/dizajn/naloge
```json
{ "naziv": "Nova naloga", "opis": "Opis", "status": "caka", "format": "Figma", "prioriteta": "srednja", "rok": "2025-08-01" }
```

### PATCH /admin/api/poslovanje/dizajn/naloge/:id
```json
{ "status": "v_delu" }
// ali poljubna kombinacija: { "naziv", "opis", "status" }
```

## Klicni vzorci

```javascript
import api from '../shared/api-client.js';

// Pregled vseh nalog
const naloge = await api.get('/admin/api/poslovanje/dizajn/naloge');

// Kanban grouping po statusih
const vDelu = naloge.filter(n => n.status === 'v_delu');
const caka = naloge.filter(n => n.status === 'caka');
const cakaOdobritev = naloge.filter(n => n.status === 'caka_odobritev');
const zakljuceno = naloge.filter(n => n.status === 'zakljuceno');

// Status toggle (napreduj nalogo skozi faze)
const statusFlow = { 'caka': 'v_delu', 'v_delu': 'caka_odobritev', 'caka_odobritev': 'zakljuceno' };
const nextStatus = statusFlow[currentStatus];
if (nextStatus) {
  await api.patch(`/admin/api/poslovanje/dizajn/naloge/${id}`, { status: nextStatus });
}

// Nova naloga
await api.post('/admin/api/poslovanje/dizajn/naloge', {
  naziv: 'Email template kampanja',
  opis: 'Design za 3 email predloge',
  status: 'caka',
  format: 'Figma',
  prioriteta: 'srednja',
  rok: '2025-07-30'
});
```
