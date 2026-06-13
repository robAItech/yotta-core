# 👑 CEO — CONTEXT

## Poslovni kontekst
- **Podjetje:** Yotta Core d.o.o.
- **Dejavnost:** AI rešitve, robotika, poslovni nadzor
- **Ekipa:** Robert (CEO), Marina (R&D), Jan (Backend), Klemen (Mehatronika), Timotej (Simulacije)

## KPI Definicije

| Metrika | Formula | Opis |
|---------|---------|------|
| Prihodki | SUM(fakture placane) | Realizirani prihodki |
| Stroški | SUM(naročila) | Stroški nabave |
| Marža | (Prihodki - Stroški) / Prihodki × 100 | Dobičkonosnost |
| Nizka zaloga | COUNT(artikli WHERE zaloga <= min_zaloga) | Artikli pod minimalno |
| Čakajoče odločitve | COUNT(status = 'caka') | Kar čaka na tvojo potezo |

## Statusi odločitev
- `caka` — čaka na pregled/odobritev
- `odobreno` — potrjeno, gre v izvedbo
- `v_delu` — v procesu izvajanja
- `zavrnjeno` — zavrnjeno

## Prioritete
- `visoka` — takojšnja pozornost
- `srednja` — normalno
- `nizka` — ko bo čas
