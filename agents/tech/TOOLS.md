# ⚙️ Tech — TOOLS

## API Endpointi

### GET /admin/api/poslovanje/tech/status
**Vrne:** Status vseh sistemov
```json
{
  "sistemi": [
    { "ime": "GBrain", "status": "online", "verzija": "v1.0.0" },
    { "ime": "GStack", "status": "online", "verzija": "v2.3.1" },
    { "ime": "Hermes Agenti", "status": "online", "verzija": "v4.2.0" },
    { "ime": "Graphfy", "status": "online", "verzija": "v1.5.3" },
    { "ime": "Skills", "status": "online", "verzija": "v3.0.0" }
  ],
  "stats": {
    "uptime": 3600,
    "requests_today": 42,
    "connected_agents": 3
  }
}
```

## Klicni vzorci

```javascript
import api from '../shared/api-client.js';

// Pridobi status vseh sistemov
const status = await api.get('/admin/api/poslovanje/tech/status');

// Preveri ali so vsi sistemi online
const allOnline = status.sistemi.every(s => s.status === 'online');

// Pridobi število povezanih agentov
const agentCount = status.stats.connected_agents;

// Prikaži uptime v urah
const uptimeHours = Math.floor(status.stats.uptime / 3600);
```
