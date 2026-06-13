# 🏭 Skladišče — CONTEXT

## Artikli (seed podatki)

| SKU | Naziv | Kat. | Lok. | Zaloga | Min | Cena |
|-----|-------|------|------|--------|-----|------|
| SKU-001 | AI procesorska enota | elektronika | A-01 | 12 | 5 | 450€ |
| SKU-002 | Senzorski modul v3 | elektronika | A-02 | 8 | 5 | 180€ |
| SKU-003 | Pogonski motor 12V | mehanika | B-01 | **3** ⚠️ | 5 | 320€ |
| SKU-004 | Krmilna plošča X1 | elektronika | A-03 | 15 | 5 | 890€ |
| SKU-005 | Aluminijasto ohišje M | mehanika | B-02 | 20 | 10 | 65€ |
| SKU-006 | LED indikatorski trak | elektronika | A-04 | **4** ⚠️ | 10 | 22€ |
| SKU-007 | Napajalnik 24V | elektronika | A-01 | 6 | 5 | 155€ |
| SKU-008 | Montažni nosilec L | mehanika | B-03 | 30 | 15 | 8€ |

⚠️ = nizka zaloga (potrebno naročilo)

## Lokacije
- **A sektor:** elektronika (A-01 do A-04)
- **B sektor:** mehanika (B-01 do B-03)

## Tipi gibanj
| Tip | Učinek | Uporaba |
|-----|--------|---------|
| prejem | zaloga + | Dobava od dobavitelja |
| odprema | zaloga - | Izdaja v proizvodnjo/prodajo |
| premik | zaloga = | Prestavitev med lokacijami |
