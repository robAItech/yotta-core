# 📦 Nabava — CONTEXT

## Dobavitelji (seed)

| Dobavitelj | Ocena | Status |
|-----------|-------|--------|
| TechDistribucija d.o.o. | 4.5 | aktiven |
| Skladiščna Tehnika d.o.o. | 4.8 | aktiven |
| Digitalne Rešitve d.o.o. | 3.9 | aktiven |
| Proizvodni Sistemi d.o.o. | 4.2 | aktiven |
| Logistika Plus d.o.o. | 3.5 | neaktiven |

## Naročila (seed)

| Številka | Znesek | Status |
|----------|--------|--------|
| N-2025-001 | 12.500€ | odobreno |
| N-2025-002 | 4.800€ | v_delu |
| N-2025-003 | 22.000€ | caka |
| N-2025-004 | 3.600€ | zakljuceno |

## Pravila nabave
- Če artikel pade pod `min_zaloga` → predlagaj novo naročilo
- Če je dobavitelj `neaktiven` → ne uporabljaj ga za nova naročila
- Optimalna količina za naročilo = `(max_zaloga - trenutna_zaloga)` ali EOQ formula
