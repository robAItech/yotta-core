#!/usr/bin/env python3
"""
Yotta Core — Integracijski Sync Scheduler (Faza 3)

Samodejno uvaža podatke iz:
  - AI Accounting Core (transakcije, knjiženja, fakture) → Yotta Core
  - PNA WMS (artikli, gibanja, dobavitelji) → Yotta Core

Uporaba:
  python scripts/yotta_sync.py --source all          # Uvozi vse
  python scripts/yotta_sync.py --source accounting    # Samo AI Accounting
  python scripts/yotta_sync.py --source wms           # Samo PNA WMS
  python scripts/yotta_sync.py --watch                # Continuous sync

Zahteva:
  pip install httpx    (HTTP klient)
"""

import argparse
import json
import logging
import os
import sys
import time
from datetime import datetime, timezone
from typing import Optional

try:
    import httpx
except ImportError:
    print("❌ Manjka httpx. Namesti: pip install httpx")
    sys.exit(1)

# ─── Konfiguracija ──────────────────────────────────────────────────────────

YOTTA_CORE_URL = os.environ.get("YOTTA_CORE_URL", "http://localhost:3100")
YOTTA_TOKEN = os.environ.get("YOTTA_TOKEN", "")

ACCOUNTING_URL = os.environ.get("ACCOUNTING_URL", "http://localhost:8080")
WMS_URL = os.environ.get("WMS_URL", "http://localhost:8081")

WMS_USER = os.environ.get("WMS_USER", "admin")
WMS_PASS = os.environ.get("WMS_PASS", "admin123")

# Sync interval v sekundah (za --watch)
SYNC_INTERVAL = int(os.environ.get("SYNC_INTERVAL", "300"))  # 5 min

# ─── Logging ────────────────────────────────────────────────────────────────

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger("yotta_sync")


# ═══════════════════════════════════════════════════════════════════════════
# YOTTA CORE API — Pošiljanje podatkov v dashboard
# ═══════════════════════════════════════════════════════════════════════════

class YottaClient:
    """HTTP client za pošiljanje podatkov v Yotta Core API."""

    def __init__(self, base_url: str, token: str = ""):
        self.base_url = base_url.rstrip("/")
        self.token = token or YOTTA_TOKEN
        self.client = httpx.Client(timeout=30)
        self._logged_in = bool(self.token)

    def _ensure_login(self):
        """Prijava v Yotta Core, če še nismo."""
        if self._logged_in:
            return True
        try:
            resp = self.client.post(
                f"{self.base_url}/admin/login",
                json={"password": os.environ.get("AITECH_CONTROL_PASSWORD", "admin123")},
            )
            data = resp.json()
            self.token = data.get("token", "")
            self._logged_in = bool(self.token)
            if self._logged_in:
                logger.info("✅ Yotta Core prijava uspešna")
            return self._logged_in
        except Exception as e:
            logger.error(f"❌ Yotta Core prijava neuspešna: {e}")
            return False

    def _headers(self) -> dict:
        h = {"Content-Type": "application/json"}
        if self.token:
            h["x-admin-token"] = self.token
        if os.environ.get("YOTTA_COOKIE"):
            h["Cookie"] = f"admin_token={os.environ['YOTTA_COOKIE']}"
        return h

    def import_transakcije(self, transakcije: list) -> dict:
        """Uvozi transakcije v Yotta Core."""
        if not self._ensure_login():
            return {"ok": False, "error": "Not logged in"}
        try:
            resp = self.client.post(
                f"{self.base_url}/admin/api/import/transakcije",
                headers=self._headers(),
                json={"transakcije": transakcije},
            )
            return resp.json()
        except Exception as e:
            return {"ok": False, "error": str(e)}

    def import_knjizenja(self, knjizenja: list) -> dict:
        """Uvozi knjiženja v Yotta Core."""
        if not self._ensure_login():
            return {"ok": False, "error": "Not logged in"}
        try:
            resp = self.client.post(
                f"{self.base_url}/admin/api/import/knjizenja",
                headers=self._headers(),
                json={"knjizenja": knjizenja},
            )
            return resp.json()
        except Exception as e:
            return {"ok": False, "error": str(e)}

    def import_fakture(self, fakture: list) -> dict:
        """Uvozi fakture v Yotta Core."""
        if not self._ensure_login():
            return {"ok": False, "error": "Not logged in"}
        try:
            resp = self.client.post(
                f"{self.base_url}/admin/api/import/fakture",
                headers=self._headers(),
                json={"fakture": fakture},
            )
            return resp.json()
        except Exception as e:
            return {"ok": False, "error": str(e)}

    def import_artikli(self, artikli: list) -> dict:
        """Uvozi artikle v Yotta Core."""
        if not self._ensure_login():
            return {"ok": False, "error": "Not logged in"}
        try:
            resp = self.client.post(
                f"{self.base_url}/admin/api/import/artikli",
                headers=self._headers(),
                json={"artikli": artikli},
            )
            return resp.json()
        except Exception as e:
            return {"ok": False, "error": str(e)}

    def import_gibanja(self, gibanja: list) -> dict:
        """Uvozi gibanja v Yotta Core."""
        if not self._ensure_login():
            return {"ok": False, "error": "Not logged in"}
        try:
            resp = self.client.post(
                f"{self.base_url}/admin/api/import/gibanja",
                headers=self._headers(),
                json={"gibanja": gibanja},
            )
            return resp.json()
        except Exception as e:
            return {"ok": False, "error": str(e)}

    def import_dobavitelji(self, dobavitelji: list) -> dict:
        """Uvozi dobavitelje v Yotta Core."""
        if not self._ensure_login():
            return {"ok": False, "error": "Not logged in"}
        try:
            resp = self.client.post(
                f"{self.base_url}/admin/api/import/dobavitelji",
                headers=self._headers(),
                json={"dobavitelji": dobavitelji},
            )
            return resp.json()
        except Exception as e:
            return {"ok": False, "error": str(e)}


# ═══════════════════════════════════════════════════════════════════════════
# AI ACCOUNTING CORE — Branje podatkov
# ═══════════════════════════════════════════════════════════════════════════

class AccountingClient:
    """HTTP client za AI Accounting Core API."""

    def __init__(self, base_url: str):
        self.base_url = base_url.rstrip("/")
        self.client = httpx.Client(timeout=15)

    def check_health(self) -> dict:
        """Preveri, ali AI Accounting Core teče."""
        try:
            resp = self.client.get(f"{self.base_url}/api/v1/health", timeout=5)
            if resp.status_code == 200:
                return resp.json()
            return {"status": "error", "code": resp.status_code}
        except Exception as e:
            return {"status": "offline", "error": str(e)}

    def get_documents(self, limit: int = 50) -> list:
        """Pridobi dokumente (fakture, naročilnice, dobavnice)."""
        try:
            resp = self.client.get(
                f"{self.base_url}/api/v1/documents",
                params={"limit": limit},
                timeout=10,
            )
            if resp.status_code == 200:
                data = resp.json()
                return data.get("documents", [])
            return []
        except Exception:
            return []

    def get_invoices(self, status: str = "", limit: int = 50) -> list:
        """Pridobi fakture iz AI Accounting."""
        try:
            params = {"limit": limit}
            if status:
                params["status"] = status
            resp = self.client.get(
                f"{self.base_url}/api/v1/invoices",
                params=params,
                timeout=10,
            )
            if resp.status_code == 200:
                data = resp.json()
                return data.get("invoices", [])
            return []
        except Exception:
            return []

    def get_matches(self, limit: int = 20) -> list:
        """Pridobi 3-Way matching rezultate."""
        try:
            resp = self.client.get(
                f"{self.base_url}/api/v1/documents/matches",
                params={"limit": limit},
                timeout=10,
            )
            if resp.status_code == 200:
                data = resp.json()
                return data.get("results", [])
            return []
        except Exception:
            return []

    def get_daily_briefing(self) -> dict:
        """CEO dnevno poročilo."""
        try:
            resp = self.client.get(
                f"{self.base_url}/api/v1/daily-briefing",
                timeout=10,
            )
            if resp.status_code == 200:
                return resp.json()
            return {}
        except Exception:
            return {}


# ═══════════════════════════════════════════════════════════════════════════
# PNA WMS — Branje podatkov
# ═══════════════════════════════════════════════════════════════════════════

class WmsClient:
    """HTTP client za PNA WMS API."""

    def __init__(self, base_url: str, username: str = WMS_USER, password: str = WMS_PASS):
        self.base_url = base_url.rstrip("/")
        self.username = username
        self.password = password
        self.client = httpx.Client(timeout=15)
        self._token: Optional[str] = None

    def _login(self) -> bool:
        """Prijava v PNA WMS."""
        try:
            resp = self.client.post(
                f"{self.base_url}/api/login",
                json={"username": self.username, "password": self.password},
                timeout=10,
            )
            if resp.status_code == 200:
                data = resp.json()
                self._token = data.get("token", "")
                logger.info("✅ PNA WMS prijava uspešna")
                return True
            logger.warning(f"⚠️ WMS prijava neuspešna: HTTP {resp.status_code}")
            return False
        except Exception as e:
            logger.warning(f"⚠️ WMS nedosegljiv: {e}")
            return False

    def _headers(self) -> dict:
        h = {}
        if self._token:
            h["Authorization"] = f"Bearer {self._token}"
        return h

    def _ensure_login(self) -> bool:
        if not self._token:
            return self._login()
        return True

    def get_products(self) -> list:
        """Pridobi vse produkte iz WMS."""
        if not self._ensure_login():
            return []
        try:
            resp = self.client.get(
                f"{self.base_url}/api/products",
                headers=self._headers(),
                timeout=10,
            )
            if resp.status_code == 200:
                data = resp.json()
                return data if isinstance(data, list) else data.get("products", data)
            return []
        except Exception:
            return []

    def get_movements(self, limit: int = 100) -> list:
        """Pridobi premike iz WMS."""
        if not self._ensure_login():
            return []
        try:
            resp = self.client.get(
                f"{self.base_url}/api/movements",
                headers=self._headers(),
                params={"limit": limit},
                timeout=10,
            )
            if resp.status_code == 200:
                data = resp.json()
                return data if isinstance(data, list) else data.get("movements", data)
            return []
        except Exception:
            return []

    def get_suppliers(self) -> list:
        """Pridobi dobavitelje iz WMS."""
        if not self._ensure_login():
            return []
        try:
            resp = self.client.get(
                f"{self.base_url}/api/suppliers",
                headers=self._headers(),
                timeout=10,
            )
            if resp.status_code == 200:
                data = resp.json()
                return data if isinstance(data, list) else data.get("suppliers", data)
            return []
        except Exception:
            return []

    def get_dashboard(self) -> dict:
        """Pridobi WMS dashboard metrike."""
        if not self._ensure_login():
            return {}
        try:
            resp = self.client.get(
                f"{self.base_url}/api/dashboard",
                headers=self._headers(),
                timeout=10,
            )
            if resp.status_code == 200:
                return resp.json()
            return {}
        except Exception:
            return {}


# ═══════════════════════════════════════════════════════════════════════════
# TRANSFORMACIJE — Mapiranje podatkov med formati
# ═══════════════════════════════════════════════════════════════════════════

def transform_accounting_invoices_to_fakture(invoices: list) -> list:
    """Pretvori AI Accounting fakture v Yotta Core format."""
    fakture = []
    for inv in invoices:
        fakture.append({
            "stevilka": inv.get("invoice_number", ""),
            "datum": inv.get("invoice_date", ""),
            "znesek": float(inv.get("total_gross", inv.get("total_net", 0))),
            "ddv": float(inv.get("total_vat", 0)),
            "status": _map_invoice_status(inv.get("status", "")),
            "stranka": inv.get("client_name", inv.get("client", {}).get("name", "")),
        })
    return fakture


def _map_invoice_status(ai_status: str) -> str:
    """Mapiraj AI Accounting status v Yotta Core status."""
    mapping = {
        "draft": "caka",
        "issued": "caka",
        "overdue": "caka",
        "paid": "placano",
        "credited": "placano",
        "cancelled": "placano",
    }
    return mapping.get(ai_status.lower(), "caka")


def transform_accounting_docs_to_knjizenja(documents: list) -> list:
    """Pretvori AI Accounting dokumente v knjiženja."""
    knjizenja = []
    for doc in documents:
        for line in doc.get("lines", []):
            znesek = float(line.get("gross_amount", line.get("net_amount", 0)))
            if znesek == 0:
                continue
            knjizenja.append({
                "datum": doc.get("document_date", ""),
                "opis": f"{doc.get('doc_type', '')}: {doc.get('doc_number', '')} - {line.get('description', '')}",
                "znesek": znesek,
                "tip": "odhodek" if doc.get("doc_type") in ("supplier_invoice", "delivery_note") else "prihodek",
                "kategorija": doc.get("doc_type", "dokument"),
                "konto_v_dobro": "",
                "konto_v_breme": "",
            })
    return knjizenja


def transform_wms_products_to_artikli(products: list) -> list:
    """Pretvori WMS produkte v Yotta Core artikle."""
    artikli = []
    for p in products:
        artikli.append({
            "sku": p.get("sku", p.get("barcode", f"WMS-{p.get('id', 0)}")),
            "naziv": p.get("name", p.get("description", "Uvoz iz WMS")),
            "kategorija": p.get("category", "wms_uvoz"),
            "lokacija": p.get("default_location", ""),
            "zaloga": int(p.get("total_stock", p.get("stock", 0))),
            "min_zaloga": int(p.get("min_stock", 5)),
            "cena": float(p.get("price", 0)),
        })
    return artikli


def transform_wms_movements_to_gibanja(movements: list) -> list:
    """Pretvori WMS premike v Yotta Core gibanja."""
    gibanja = []
    for m in movements:
        tip_map = {
            "RECEIVE": "prejem",
            "SHIP": "odprema",
            "MOVE": "premik",
            "ADJUST": "popravek",
            "COUNT": "inventura",
        }
        gibanja.append({
            "sku": m.get("product_sku", ""),
            "tip": tip_map.get(m.get("type", ""), "premik"),
            "kolicina": abs(int(m.get("quantity", 0))),
            "lokacija": m.get("to_location", m.get("from_location", "")),
            "referenca": m.get("reference", ""),
            "opomba": m.get("note", f"Sync iz WMS: {m.get('type', '')}"),
        })
    return gibanja


def transform_wms_suppliers_to_dobavitelji(suppliers: list) -> list:
    """Pretvori WMS dobavitelje v Yotta Core format."""
    dobavitelji = []
    for s in suppliers:
        dobavitelji.append({
            "naziv": s.get("name", ""),
            "kontakt": s.get("contact_person", ""),
            "email": s.get("email", ""),
            "telefon": s.get("phone", ""),
            "ocena": float(s.get("rating", s.get("performance_score", 0))),
        })
    return dobavitelji


# ═══════════════════════════════════════════════════════════════════════════
# SINHRONIZACIJA — Glavni sync handlerji
# ═══════════════════════════════════════════════════════════════════════════

def sync_accounting(yotta: YottaClient) -> dict:
    """
    Sinhroniziraj podatke iz AI Accounting Core → Yotta Core.

    1. Fakture (izdane/prejete)
    2. Dokumenti → knjiženja
    3. CEO briefing (kontrolni podatki)
    """
    logger.info("📒 Sinhroniziram AI Accounting Core → Yotta Core ...")
    accounting = AccountingClient(ACCOUNTING_URL)

    # Preveri health
    health = accounting.check_health()
    if health.get("status") != "ok":
        logger.warning(f"⚠️ AI Accounting ni online: {health.get('status', 'unknown')}")
        return {"source": "accounting", "ok": False, "error": "AI Accounting offline"}

    stats = {"fakture": 0, "knjizenja": 0, "transakcije": 0}

    # 1. Uvozi fakture
    invoices = accounting.get_invoices(limit=100)
    if invoices:
        fakture = transform_accounting_invoices_to_fakture(invoices)
        if fakture:
            result = yotta.import_fakture(fakture)
            stats["fakture"] = result.get("imported", 0)
            logger.info(f"  📄 Fakture: {stats['fakture']} uvoženih")

    # 2. Uvozi dokumente kot knjiženja
    documents = accounting.get_documents(limit=100)
    if documents:
        knjizenja = transform_accounting_docs_to_knjizenja(documents)
        if knjizenja:
            result = yotta.import_knjizenja(knjizenja)
            stats["knjizenja"] = result.get("imported", 0)
            logger.info(f"  📒 Knjiženja: {stats['knjizenja']} uvoženih")

    # 3. Daily briefing → transakcije (če so relevantne)
    briefing = accounting.get_daily_briefing()
    if briefing and briefing.get("pending_payments"):
        transakcije = []
        for p in briefing.get("pending_payments", []):
            transakcije.append({
                "datum": p.get("date", datetime.now().strftime("%Y-%m-%d")),
                "opis": p.get("description", "Uvoz iz AI Accounting"),
                "znesek": float(p.get("amount", 0)),
                "tip": "priliv",
                "kategorija": "avtomatski_uvoz",
                "racun": "TRR1",
            })
        if transakcije:
            result = yotta.import_transakcije(transakcije)
            stats["transakcije"] = result.get("imported", 0)
            logger.info(f"  💶 Transakcije: {stats['transakcije']} uvoženih")

    logger.info(f"✅ AI Accounting sync končan: {stats}")
    return {"source": "accounting", "ok": True, **stats}


def sync_wms(yotta: YottaClient) -> dict:
    """
    Sinhroniziraj podatke iz PNA WMS → Yotta Core.

    1. Produkti → artikli (z upsertom po SKU)
    2. Premiki → gibanja (s posodobitvijo zaloge)
    3. Dobavitelji
    """
    logger.info("🏭 Sinhroniziram PNA WMS → Yotta Core ...")
    wms = WmsClient(WMS_URL)

    # Preveri dostop
    try:
        health = httpx.get(f"{WMS_URL}/api/dashboard", timeout=5)
        if health.status_code not in (200, 401):
            logger.warning(f"⚠️ PNA WMS ni dosegljiv: HTTP {health.status_code}")
            return {"source": "wms", "ok": False, "error": "PNA WMS offline"}
    except Exception as e:
        logger.warning(f"⚠️ PNA WMS nedosegljiv: {e}")
        return {"source": "wms", "ok": False, "error": str(e)}

    stats = {"artikli": 0, "gibanja": 0, "dobavitelji": 0}

    # 1. Uvozi produkte → artikli
    products = wms.get_products()
    if products:
        artikli = transform_wms_products_to_artikli(products)
        if artikli:
            result = yotta.import_artikli(artikli)
            stats["artikli"] = result.get("imported", 0) + result.get("updated", 0)
            logger.info(f"  📦 Artikli: {result.get('imported', 0)} novih, {result.get('updated', 0)} posodobljenih")

    # 2. Uvozi premike → gibanja
    movements = wms.get_movements(limit=200)
    if movements:
        gibanja = transform_wms_movements_to_gibanja(movements)
        if gibanja:
            result = yotta.import_gibanja(gibanja)
            stats["gibanja"] = result.get("imported", 0)
            logger.info(f"  🔄 Gibanja: {stats['gibanja']} uvoženih")

    # 3. Uvozi dobavitelje
    suppliers = wms.get_suppliers()
    if suppliers:
        dobavitelji = transform_wms_suppliers_to_dobavitelji(suppliers)
        if dobavitelji:
            result = yotta.import_dobavitelji(dobavitelji)
            stats["dobavitelji"] = result.get("imported", 0) + result.get("updated", 0)
            logger.info(f"  👥 Dobavitelji: {result.get('imported', 0)} novih, {result.get('updated', 0)} posodobljenih")

    logger.info(f"✅ PNA WMS sync končan: {stats}")
    return {"source": "wms", "ok": True, **stats}


# ═══════════════════════════════════════════════════════════════════════════
# STATUS CHECK — Preveri stanje vseh integracij
# ═══════════════════════════════════════════════════════════════════════════

def check_integration_status():
    """Preveri stanje vseh integracijskih povezav."""
    import json

    results = []

    # Yotta Core
    try:
        resp = httpx.get(f"{YOTTA_CORE_URL}/admin/login", timeout=5)
        yotta_status = "online" if resp.status_code in (200, 401) else f"HTTP {resp.status_code}"
    except Exception as e:
        yotta_status = f"offline ({e})"
    results.append({"system": "Yotta Core", "url": YOTTA_CORE_URL, "status": yotta_status})

    # AI Accounting
    try:
        resp = httpx.get(f"{ACCOUNTING_URL}/api/v1/health", timeout=5)
        accounting_status = "online" if resp.status_code == 200 else f"HTTP {resp.status_code}"
    except Exception as e:
        accounting_status = f"offline ({e})"
    results.append({"system": "AI Accounting Core", "url": ACCOUNTING_URL, "status": accounting_status})

    # PNA WMS
    try:
        resp = httpx.get(f"{WMS_URL}/api/dashboard", timeout=5)
        wms_status = "online" if resp.status_code in (200, 401) else f"HTTP {resp.status_code}"
    except Exception as e:
        wms_status = f"offline ({e})"
    results.append({"system": "PNA WMS", "url": WMS_URL, "status": wms_status})

    # Izpis
    print(json.dumps(results, indent=2, ensure_ascii=False))
    print()
    online = sum(1 for r in results if r["status"] == "online")
    print(f"📊 Status: {online}/{len(results)} sistemov online")

    if online == len(results):
        print("✅ Vsi sistemi delujejo!")
    else:
        for r in results:
            if r["status"] != "online":
                print(f"⚠️  {r['system']}: {r['status']}")
                print(f"   URL: {r['url']}")


# ═══════════════════════════════════════════════════════════════════════════
# GLAVNI PROGRAM
# ═══════════════════════════════════════════════════════════════════════════

def run_sync(source: str) -> dict:
    """Izvedi sinhronizacijo za podani vir."""
    yotta = YottaClient(YOTTA_CORE_URL)

    if source in ("accounting", "all"):
        result = sync_accounting(yotta)
        print(json.dumps(result, indent=2, ensure_ascii=False))

    if source in ("wms", "all"):
        result = sync_wms(yotta)
        print(json.dumps(result, indent=2, ensure_ascii=False))

    logger.info("🎉 Sinhronizacija zaključena")
    return {"ok": True}


def run_watch():
    """Neprekinjen sync vsakih SYNC_INTERVAL sekund."""
    logger.info(f"👁️ Watch mode: sync vsakih {SYNC_INTERVAL}s")
    logger.info(f"   AI Accounting: {ACCOUNTING_URL}")
    logger.info(f"   PNA WMS:       {WMS_URL}")
    logger.info(f"   Yotta Core:    {YOTTA_CORE_URL}")
    logger.info("")

    cycle = 0
    while True:
        cycle += 1
        logger.info(f"\n{'='*60}")
        logger.info(f"🔄 Sync cycle #{cycle} — {datetime.now().isoformat()}")
        logger.info(f"{'='*60}")

        try:
            run_sync("all")
        except KeyboardInterrupt:
            logger.info("⏹️ Watch mode ustavljen")
            break
        except Exception as e:
            logger.error(f"❌ Sync napaka: {e}")

        logger.info(f"😴 Čakam {SYNC_INTERVAL}s do naslednjega cikla ...")
        try:
            time.sleep(SYNC_INTERVAL)
        except KeyboardInterrupt:
            logger.info("⏹️ Watch mode ustavljen")
            break


def main():
    parser = argparse.ArgumentParser(description="Yotta Core — Integracijski Sync")
    parser.add_argument("--source", choices=["accounting", "wms", "all"], default="all",
                        help="Vir podatkov za sinhronizacijo")
    parser.add_argument("--watch", action="store_true",
                        help="Neprekinjen sync (watch mode)")
    parser.add_argument("--token", default="",
                        help="Yotta Core admin token (če ni v env)")
    parser.add_argument("--interval", type=int, default=SYNC_INTERVAL,
                        help=f"Interval v sekundah za watch mode (privzeto: {SYNC_INTERVAL})")

    parser.add_argument("--status", action="store_true",
                        help="Preveri stanje integracij (brez uvoza)")

    args = parser.parse_args()

    # Status mode — samo preveri povezave
    if args.status:
        check_integration_status()
        return

    # Setup
    global_vars = globals()
    if args.token:
        os.environ["YOTTA_TOKEN"] = args.token
    if args.interval:
        global_vars['SYNC_INTERVAL'] = args.interval

    logger.info("╔══════════════════════════════════════════╗")
    logger.info("║   YOTTA CORE — Integracijski Sync        ║")
    logger.info("╚══════════════════════════════════════════╝")

    if args.watch:
        run_watch()
    else:
        run_sync(args.source)


if __name__ == "__main__":
    main()
