# 🧠 Orchestrator — TOOLS

## Agent Routing Matrix

| Zahteva vsebuje | Pošlji agentu | API endpointi |
|----------------|---------------|--------------|
| odločitev, ceo, kpi, prihodek | CEO | `/odlocitve`, `/kpi` |
| tech, server, sistem, graf | Tech | `/tech/status` |
| nabava, naročilo, dobavitelj | Nabava | `/narocila`, `/dobavitelji` |
| zaloga, skladišče, artikel, gibanje | Skladišče | `/artikli`, `/gibanja` |
| projekt, budget, rok | Projekti | `/projekti` |
| dizajn, naloga, brand | Dizajn | `/dizajn/naloge` |
| računovodstvo, bilanca, ddv, faktura | Računovodstvo | `/knjizenja`, `/fakture` |

## Klicni vzorci

```javascript
// Usmerjanje k agentu
import api from '../shared/api-client.js';

async function routeRequest(userRequest) {
  const intent = analyzeIntent(userRequest);
  switch (intent) {
    case 'ceo': return await CEOAgent.handle(userRequest);
    case 'tech': return await TechAgent.handle(userRequest);
    case 'nabava': return await NabavaAgent.handle(userRequest);
    case 'skladisce': return await SkladisceAgent.handle(userRequest);
    case 'projekti': return await ProjektiAgent.handle(userRequest);
    case 'dizajn': return await DizajnAgent.handle(userRequest);
    case 'racunovodstvo': return await RacunovodstvoAgent.handle(userRequest);
    default: return { error: 'Neznana zahteva' };
  }
}
```
