# 📒 Računovodstvo — CONTEXT

## Kontni okvir (VASCO slog)

| Konto | Naziv | Tip |
|-------|-------|-----|
| 1100 | Transakcijski račun | Sredstvo |
| 1200 | Terjatve do kupcev | Sredstvo |
| 2200 | Obveznosti do dobaviteljev | Obveznost |
| 2600 | DDV obveznosti | Obveznost |
| 4000 | Stroški materiala | Odhodek |
| 4700 | Stroški dela | Odhodek |
| 4710 | Poslovni stroški | Odhodek |
| 7600 | Prihodki od prodaje | Prihodek |

## Knjiženje (seed)

| Datum | Opis | Znesek | Tip |
|-------|------|--------|-----|
| 2025-06-01 | Mesečni prihodek | 125.000€ | prihodek |
| 2025-06-01 | Plače | 45.000€ | odhodek |
| 2025-06-05 | Najemnina | 5.200€ | odhodek |
| 2025-06-10 | Material | 12.300€ | odhodek |
| 2025-06-15 | DDV obračun | 21.500€ | obveznost |

## Fakture (seed)

| Številka | Znesek | DDV | Status |
|----------|--------|-----|--------|
| F-2025-001 | 45.000€ | 9.450€ | placano |
| F-2025-002 | 28.000€ | 5.880€ | caka |
| F-2025-003 | 12.500€ | 2.625€ | caka |
| F-2025-004 | 8.900€ | 1.869€ | caka |
