"""
SAP Analytics Layer - Cloud Backend
Finance & Treasury: Dashboard

Endpoints:
  POST /auth/token              - Validates SAP environment (HMAC + whitelist), returns signed JWT
  POST /session/create          - Stores raw SAP data server-side, returns session_id (JWT required)
  POST /data/query              - Runs calculations on session data, returns chart-ready JSON (JWT required)
  POST /api/query/cof_dashboard - Direct COF dashboard query (JWT required)
  GET  /health                  - Health check
"""

import os
import hmac
import hashlib
import time
import uuid
from typing import Any, Optional
import json

import jwt  # PyJWT
from fastapi import FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------
SECRET_KEY = os.getenv("SECRET_KEY",    "CHANGE_ME_IN_PRODUCTION")
SHARED_SECRET = os.getenv("SHARED_SECRET", "CHANGE_ME_IN_PRODUCTION")

JWT_ALGORITHM = "HS256"
JWT_EXPIRY_SECONDS = 900  # 15 minutes

WHITELISTED_ENVIRONMENTS: dict[str, list[str]] = {
    "DEV": ["100", "200"],
    "QAS": ["100"],
    "PRD": ["100"],
}

# ---------------------------------------------------------------------------
# In-memory session store
# Keyed by session_id (UUID). Each entry expires with the JWT (15 min).
# In production: replace with Redis via azure-cache-for-redis or similar.
# ---------------------------------------------------------------------------
_SESSION_STORE: dict[str, dict] = {}


def _purge_expired_sessions():
    """Remove sessions older than JWT_EXPIRY_SECONDS. Called on every write."""
    now = int(time.time())
    expired = [k for k, v in _SESSION_STORE.items() if v.get(
        "expires_at", 0) < now]
    for k in expired:
        del _SESSION_STORE[k]


# ---------------------------------------------------------------------------
# App
# ---------------------------------------------------------------------------
app = FastAPI(
    title="SAP Analytics Layer",
    version="2.0.0",
    docs_url=None,
    redoc_url=None,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)

# ---------------------------------------------------------------------------
# Pydantic models
# ---------------------------------------------------------------------------


class AuthRequest(BaseModel):
    sap_sid:    str
    sap_client: str
    sap_user:   str
    timestamp:  int
    hmac_sig:   str


class SessionCreateRequest(BaseModel):
    raw_data:  list           # The SAP TRM rows from the bootstrapper
    dashboard: str = "cof_dashboard"
    filters:   dict = {}


class DataQueryRequest(BaseModel):
    query_type: str
    # used by COF and any session-backed dashboard
    session_id: Optional[str] = None
    filters:    dict = {}
    # fallback: direct payload (local dev / testing)
    raw_data:   Optional[list] = None


class CofDashboardRequest(BaseModel):
    filters:  dict = {}
    rows:     Optional[list] = None
    raw_data: Optional[list] = None
    data:     Optional[list] = None

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def verify_hmac(sap_sid: str, sap_client: str, timestamp: int, sig: str) -> bool:
    msg = f"{sap_sid}{sap_client}{timestamp}".encode()
    expected = hmac.new(SHARED_SECRET.encode(), msg,
                        hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, sig.lower())


def decode_jwt(authorization: Optional[str]) -> dict:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=401, detail="Missing or invalid Authorization header")
    token = authorization.split(" ", 1)[1]
    try:
        return jwt.decode(token, SECRET_KEY, algorithms=[JWT_ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=401, detail="Token expired — relaunch from SAP")
    except jwt.InvalidTokenError as exc:
        raise HTTPException(status_code=401, detail=f"Invalid token: {exc}")

def read_json_file():
    with open("test-data.json", "r") as f:
        rows = json.load(f)

    print("===== ROWS =====")

    for i, row in enumerate(rows):
        print(f"\n--- Row {i+1} ---")
        for key, value in row.items():
            print(f"{key} : {value}")

    return rows
read_json_file()

def _extract_cof_rows(payload: Any) -> list:
    if isinstance(payload, list):
        return payload
    if isinstance(payload, dict):
        for key in ("rows", "raw_data", "data"):
            value = payload.get(key)
            if isinstance(value, list):
                return value
    return []


def _extract_cof_filters(payload: Any) -> dict:
    if isinstance(payload, dict) and isinstance(payload.get("filters"), dict):
        return payload["filters"]
    return {}


def _to_float(value: Any) -> float:
    try:
        if value is None or value == "":
            return 0.0
        return float(str(value).replace(",", ""))
    except (TypeError, ValueError):
        return 0.0


def _safe_date(value: Any) -> str:
    if value is None:
        return ""
    raw = str(value).strip()
    if len(raw) >= 8 and raw[:8].isdigit():
        return raw[:8]
    if len(raw) == 10 and raw[2] == "." and raw[5] == ".":
        return f"{raw[6:10]}{raw[3:5]}{raw[0:2]}"
    return ""


def _fmt_date(value: Any) -> str:
    raw = _safe_date(value)
    if len(raw) < 8:
        return raw or "—"
    return f"{raw[6:8]}/{raw[4:6]}/{raw[0:4]}"


def _require_cof_rows(rows: Optional[list]) -> list:
    if not rows:
        raise HTTPException(
            status_code=400,
            detail="COF dashboard requires raw rows. Pass them via session_id or raw_data.",
        )
    return rows

# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------


@app.get("/health")
def health():
    return {"status": "ok", "ts": int(time.time()), "version": "2.0.0"}


@app.post("/auth/token")
def get_token(req: AuthRequest):
    now = int(time.time())

    if abs(now - req.timestamp) > 300:
        raise HTTPException(
            status_code=401, detail="Request timestamp too old — replay blocked")

    if not verify_hmac(req.sap_sid, req.sap_client, req.timestamp, req.hmac_sig):
        raise HTTPException(status_code=401, detail="Invalid HMAC signature")

    allowed = WHITELISTED_ENVIRONMENTS.get(req.sap_sid.upper(), [])
    if req.sap_client not in allowed:
        raise HTTPException(
            status_code=403,
            detail=f"SAP environment {req.sap_sid}/{req.sap_client} is not licensed",
        )

    payload = {
        "sap_sid":    req.sap_sid.upper(),
        "sap_client": req.sap_client,
        "sap_user":   req.sap_user,
        "scope":      "dashboard",
        "iat":        now,
        "exp":        now + JWT_EXPIRY_SECONDS,
    }
    token = jwt.encode(payload, SECRET_KEY, algorithm=JWT_ALGORITHM)

    return {
        "access_token": token,
        "token_type":   "Bearer",
        "expires_in":   JWT_EXPIRY_SECONDS,
        "env":          f"{req.sap_sid.upper()}/{req.sap_client}",
    }


@app.post("/session/create")
def session_create(
    req: SessionCreateRequest,
    authorization: Optional[str] = Header(None),
):
    """
    Stores raw SAP TRM rows server-side tied to the current JWT.
    Returns a session_id the frontend uses to fetch data.

    Called by the bootstrapper immediately after /auth/token,
    before redirecting to the React frontend.
    """
    claims = decode_jwt(authorization)

    _purge_expired_sessions()

    session_id = str(uuid.uuid4())
    _SESSION_STORE[session_id] = {
        "raw_data":   req.raw_data,
        "dashboard":  req.dashboard,
        "filters":    req.filters,
        "sap_sid":    claims["sap_sid"],
        "sap_user":   claims["sap_user"],
        "created_at": int(time.time()),
        "expires_at": claims["exp"],  # session dies with the JWT
    }

    return {
        "session_id":  session_id,
        "row_count":   len(req.raw_data),
        "dashboard":   req.dashboard,
        "expires_in":  claims["exp"] - int(time.time()),
    }


@app.post("/data/query")
def data_query(
    req: DataQueryRequest,
    authorization: Optional[str] = Header(None),
):
    """
    Returns chart-ready JSON.
    For session-backed dashboards (COF etc.): pass session_id.
    For local dev/testing: pass raw_data directly in the body.
    """
    decode_jwt(authorization)
# logic written to read json file data and perform calculation
    resolved_raw_data = read_json_file()
    print("===== DATA FROM api FILE =====")
    print(resolved_raw_data)

    for i, row in enumerate(resolved_raw_data):
        print(f"\n--- Row {i+1} ---")
        for key, value in row.items():
            print(f"{key} : {value}")

    # Resolve raw_data: session_id takes priority over inline raw_data
    # resolved_raw_data = req.raw_data
    if req.session_id:
        session = _SESSION_STORE.get(req.session_id)
        if not session:
            raise HTTPException(
                status_code=404,
                detail="Session not found or expired. Relaunch from SAP.",
            )
        resolved_raw_data = session.get("raw_data")

    routes = {
        "borrowings_summary": calculate_borrowings_summary,
        "maturity_profile":   calculate_maturity_profile,
        "interest_rate_mix":  calculate_interest_rate_mix,
        "currency_exposure":  calculate_currency_exposure,
        "cof_dashboard":      calculate_cof_dashboard,
    }

    fn = routes.get(req.query_type)
    if not fn:
        raise HTTPException(
            status_code=400, detail=f"Unknown query_type: {req.query_type!r}")

    return fn(req.filters, resolved_raw_data)


@app.post("/api/query/cof_dashboard")
def query_cof_dashboard( req: CofDashboardRequest, authorization: Optional[str] = Header(None), ): 
    """Direct COF endpoint — accepts rows inline. JWT required.""" 
    decode_jwt(authorization) 
    payload = req.model_dump()
    rows = _extract_cof_rows(payload)
    filters = _extract_cof_filters(payload)
    return calculate_cof_dashboard(filters, rows)
# ---------------------------------------------------------------------------
# Calculation Engine
# ---------------------------------------------------------------------------
def calculate_borrowings_summary(filters: dict, raw_data=None):
    year = filters.get("year", 2024)
    monthly = [
        {"month": "Jan", "drawn": 142.5, "undrawn": 57.5, "interest": 1.18},
        {"month": "Feb", "drawn": 138.2, "undrawn": 61.8, "interest": 1.14},
        {"month": "Mar", "drawn": 155.0, "undrawn": 45.0, "interest": 1.28},
        {"month": "Apr", "drawn": 161.3, "undrawn": 38.7, "interest": 1.33},
        {"month": "May", "drawn": 158.7, "undrawn": 41.3, "interest": 1.31},
        {"month": "Jun", "drawn": 172.1, "undrawn": 27.9, "interest": 1.42},
        {"month": "Jul", "drawn": 168.4, "undrawn": 31.6, "interest": 1.39},
        {"month": "Aug", "drawn": 163.9, "undrawn": 36.1, "interest": 1.35},
        {"month": "Sep", "drawn": 175.2, "undrawn": 24.8, "interest": 1.45},
        {"month": "Oct", "drawn": 181.6, "undrawn": 18.4, "interest": 1.50},
        {"month": "Nov", "drawn": 178.3, "undrawn": 21.7, "interest": 1.47},
        {"month": "Dec", "drawn": 185.0, "undrawn": 15.0, "interest": 1.53},
    ]
    avg_drawn = round(sum(m["drawn"] for m in monthly) / 12, 1)
    ytd_interest = round(sum(m["interest"] for m in monthly), 2)
    total_drawn_sum = sum(m["drawn"] for m in monthly)
    total_capacity = sum(m["drawn"]+m["undrawn"] for m in monthly)
    utilisation = round(total_drawn_sum / total_capacity * 100, 1)
    return {
        "query_type": "borrowings_summary",
        "year": year,
        "kpis": {
            "total_drawn_mln":       avg_drawn,
            "total_facility_mln":    200.0,
            "utilisation_pct":       utilisation,
            "ytd_interest_mln":      ytd_interest,
            "weighted_avg_rate_pct": 3.85,
            "facilities_count":      6,
        },
        "chart_data": {
            "labels":   [m["month"] for m in monthly],
            "drawn":    [m["drawn"] for m in monthly],
            "undrawn":  [m["undrawn"] for m in monthly],
            "interest": [m["interest"] for m in monthly],
        },
    }


def calculate_maturity_profile(filters: dict, raw_data=None):
    return {
        "query_type": "maturity_profile",
        "chart_data": {
            "labels":  ["< 3M", "3–6M", "6–12M", "1–2Y", "2–3Y", "> 3Y"],
            "amounts": [25.0, 40.5, 32.0, 55.0, 28.5, 19.0],
            "unit":    "USD millions",
        },
    }


def calculate_interest_rate_mix(filters: dict, raw_data=None):
    return {
        "query_type": "interest_rate_mix",
        "chart_data": {
            "labels":  ["Fixed Rate", "Floating (SOFR+)", "Floating (EURIBOR+)", "Mixed"],
            "amounts": [72.0, 55.5, 38.0, 34.5],
        },
    }


def calculate_currency_exposure(filters: dict, raw_data=None):
    return {
        "query_type": "currency_exposure",
        "chart_data": {
            "labels":  ["USD", "EUR", "GBP", "SGD", "Other"],
            "amounts": [95.0, 52.5, 28.0, 18.5, 6.0],
        },
    }


def _norm_date(value: Any) -> str:
    """Convert DD.MM.YYYY or YYYYMMDD → YYYYMMDD string."""
    if not value:
        return ""
    raw = str(value).strip()
    if len(raw) >= 8 and raw[:8].isdigit():
        return raw[:8]
    if len(raw) == 10 and raw[2] == "." and raw[5] == ".":
        return f"{raw[6:10]}{raw[3:5]}{raw[0:2]}"
    if len(raw) == 10 and raw[4] == "-" and raw[7] == "-":
        return raw.replace("-", "")
    return ""


def calculate_cof_dashboard(filters: dict, raw_data=None):
    """
    COF calculation — aggregates raw rows into the render_state shape
    expected by cofDashboardEngine.js (products, lenders, maturity, transactions, totals).
    """
    rows = _require_cof_rows(raw_data)

    # ── per-product aggregation ────────────────────────────────────────────
    products_map: dict[str, dict] = {}
    lenders_map:  dict[str, float] = {}
    maturity_map: dict[str, float] = {}
    borrowers_map: dict[str, dict] = {} 
    portfolios_map: dict[str, dict] = {}
    sanction_vs_os_map: dict[str, dict] = {}
    customer_set: set[str] = set()     
    disb_set: set[str] = set()
    currency_map: dict[str, float] = {}
    asset_classification_map: dict[str, float] = {}
    product_bp_map: dict[str, dict[str, float]] = {}
    bp_summary_map: dict[str, dict[str, float]] = {}
    bp_product_map: dict[str, dict[str, float]] = {}
    all_prd_types: set[str] = set()
    top_disb_map: dict[str, dict] = {}
    txn_type_map: dict[str, dict] = {}
    all_bp_groups: set[str] = set()
    lv_fixed_b = lv_float_b = 0.0
    lv_sec_b = lv_uns_b = lv_oth_b = 0.0
    total_loan_amt = 0.0
    total_os_amt   = 0.0
    total_prin_rec = 0.0
    total_exposure = 0.0
    total_sanction = 0.0
    lv_long_os  = 0.0
    transaction_rows: list[list] = []
    product_asset_map: dict[str, dict[str, float]] = {}
    all_asset_classes: set[str] = set()

    for row in rows:
        if not isinstance(row, dict):
            continue

        ptype = str(row.get("Prd Type") or "")
        pdesc = str(row.get("Prd Type Desc") or "")
        loan_amt = _to_float(row.get("Loan Amt"))
        os_amt   = _to_float(row.get("O/S Amt"))
        princ_rec = _to_float(row.get("Principal Received"))
        exp_amt   = _to_float(row.get("Exp Amt"))
        int_rate = _to_float(row.get("Interest Received"))
        interest_rate = _to_float(row.get("Int Rate"))
        curr = str(row.get("Curr") or "")
        interest_due   = _to_float(row.get("Interest Due"))
        sanction_no = str(row.get("Sanction No") or "")
        disb_no = row.get("Dis No") or ""
        sanction_amt = _to_float(row.get("Sanc Amt") or "")
        cpty = str(row.get("zcounterpty") or "")
        bp_group = str(row.get("BP Grp Name") or "Others")
        txn_type = str(row.get("Txn Type") or "")
        txn_type_desc = str(row.get("Txn Type Desc") or "")
        asset_class = str(row.get("Asset Classification") or "")
        borrower = str(row.get("Customer Name")) 
        portfolio = str(row.get("Portfolio Desc"))
        rtype = str(row.get("zrate_type") or "")
        portfo = str(row.get("zportfo_desc") or "")
        closing = float(row.get("zclosing_amt") or 0)
        accrual = float(row.get("zaccrual_amt") or 0)
        wt_avg = float(row.get("zwt_avg_amt") or 0)
        avg_f = float(row.get("zavg_funds") or 0)
        wt_int = float(row.get("zwt_int_amt") or 0)
        open_eir = float(row.get("zopen_eir") or 0)
        exit_eir = float(row.get("zexit_eir") or 0)
        avg_eir = float(row.get("zavg_rate_eir") or 0)
        avg_papm = float(row.get("zavg_rate_papm") or 0)
        end_raw = str(
            row.get("End Date") 
            or row.get("end_date") 
            or row.get("zend_date") 
            or row.get("maturity_date") 
            or ""
        )

        if len(end_raw) >= 4:
            yr = end_raw[:4]
            if yr.isdigit():
                if yr not in maturity_map:
                    maturity_map[yr] = {
                        "os_amt": 0.0,
                        "sanction_amt": 0.0,
                        "utilization_amt": 0.0,
                        "loan_amt": 0.0,
                    }
                maturity_map[yr]["os_amt"] += os_amt
                maturity_map[yr]["sanction_amt"] += sanction_amt
                maturity_map[yr]["loan_amt"] += loan_amt
        for yr, vals in maturity_map.items():
            sanc = vals.get("sanction_amt", 0.0)
            os_val = vals.get("os_amt", 0.0)
            loan_amt_maturity = vals.get("loan_amt", 0.0)            
            vals["utilization_pct"] = round((os_val / sanc) * 100, 2) if sanc > 0 else 0.0 
        lv_long_os = sum(
        vals.get("os_amt", 0.0)
        for year, vals in maturity_map.items()
        if year.isdigit() and int(year) >= 2029
        )           
        currency_map[curr] = currency_map.get(curr, 0.0) + os_amt
        customer_set.add(borrower)                   
        total_loan_amt += loan_amt
        total_os_amt    += os_amt
        total_prin_rec += princ_rec
        total_exposure += exp_amt
        total_sanction += sanction_amt
        
        asset_classification_map[asset_class] = asset_classification_map.get(asset_class, 0.0) + os_amt
        bp_group = str(row.get("BP Grp Name") or "Others")
        all_bp_groups.add(bp_group)

        if pdesc not in product_bp_map:
            product_bp_map[pdesc] = {}

        if bp_group not in product_bp_map[pdesc]:
            product_bp_map[pdesc][bp_group] = 0.0

        product_bp_map[pdesc][bp_group] += os_amt

        if bp_group not in bp_summary_map:
            bp_summary_map[bp_group] = {
            "os_amt": 0.0,
            "sanction_amt": 0.0,
            "interest_due": 0.0,
            "exposure_amt": 0.0,
            "disb_set": set()  

        }

        bp_summary_map[bp_group]["os_amt"] += os_amt
        bp_summary_map[bp_group]["sanction_amt"] += sanction_amt
        bp_summary_map[bp_group]["interest_due"] += interest_due
        bp_summary_map[bp_group]["exposure_amt"] += exp_amt

        all_prd_types.add(ptype)

        if bp_group not in bp_product_map:
            bp_product_map[bp_group] = {}

        if ptype not in bp_product_map[bp_group]:
            bp_product_map[bp_group][ptype] = 0.0

        bp_product_map[bp_group][ptype] += os_amt

        # product aggregation
        if ptype not in products_map:
            products_map[ptype] = {
                "zprd_type":    ptype,
                "zprd_desc":    pdesc,
                "zint_rec":    int_rate,
                "zinterest_rate": interest_rate,
                "zinterest_due": interest_due,
                "zinterest_ratio": 0.0,
                "zsanction_amt": 0.0,
                "zdrawdown_rate": 0.0,
                "zclosing_amt": 0.0,
                "zaccrual_amt": 0.0,
                "zwt_avg_amt":  0.0,
                "zavg_funds":   0.0,
                "zwt_int_amt":  0.0,
                "zopen_eir_sum":  0.0,
                "zexit_eir_sum":  0.0,
                "zavg_eir_sum":   0.0,
                "zavg_papm_sum":  0.0,
                "zeir_cnt":       0,
                "zloan_amt":    0.0,
                "zos_amt": 0.0,
                "zexp_amt": 0.0,
                "zprinc_rec": 0.0,
                "zint_rate": 0.0
            }
        p = products_map[ptype]
        p["zsanction_amt"] +=sanction_amt
        p["zclosing_amt"] += closing
        p["zaccrual_amt"] += accrual
        p["zloan_amt"] += loan_amt
        p["zos_amt"] += os_amt
        p["zexp_amt"] += exp_amt
        p["zprinc_rec"] += princ_rec
        p["zint_rate"] += int_rate
        p["zwt_avg_amt"] += wt_avg
        p["zavg_funds"] += avg_f
        p["zwt_int_amt"] += wt_int
        p["zdrawdown_rate"] = round((p["zos_amt"] / p["zsanction_amt"]) * 100, 2)    
        p["zexposure"] = round(p["zsanction_amt"] - p["zos_amt"], 2)     
        p["zinterest_ratio"] = round((p["zinterest_due"] / p["zos_amt"]) * 100, 2) if p["zos_amt"] > 0 else 0.0
        if avg_eir:
            p["zopen_eir_sum"] += open_eir
            p["zexit_eir_sum"] += exit_eir
            p["zavg_eir_sum"] += avg_eir
            p["zavg_papm_sum"] += avg_papm
            p["zeir_cnt"] += 1

        # lender aggregation
        lenders_map[cpty] = lenders_map.get(cpty, 0.0) + closing
        # Borrower's aggregation
        if borrower not in borrowers_map:
            borrowers_map[borrower] = {
                "os_amt": 0.0,
                "sanction_amt": 0.0,
                "intrest_rate": 0.0,
                "interest_due": 0.0,
                "utilization_rate": 0.0,
                "bp_group": "" ,
                "active_disb": 0,
                
            }
        if disb_no:  # string check
            disb_set.add(str(disb_no))
            bp_summary_map[bp_group]["disb_set"].add(str(disb_no))
            borrowers_map[borrower]["active_disb"] += 1
        borrowers_map[borrower]["os_amt"] += os_amt
        borrowers_map[borrower]["interest_rate"] = interest_rate
        borrowers_map[borrower]["sanction_amt"] += sanction_amt
        borrowers_map[borrower]["interest_due"] += interest_due
        borrowers_map[borrower]["bp_group"] = bp_group
        borrowers_map[borrower]["utilization_rate"] = round((borrowers_map[borrower]["os_amt"] / borrowers_map[borrower]["sanction_amt"]) * 100, 2) if borrowers_map[borrower]["sanction_amt"] > 0 else 0.0
        if portfolio not in portfolios_map:
            portfolios_map[portfolio] = {
                "os_amt": 0.0,
                "sanction_amt": 0.0
            }
        portfolios_map[portfolio]["os_amt"] += os_amt
        portfolios_map[portfolio]["sanction_amt"] += sanction_amt   
        # Txn Type grouping
        if txn_type not in txn_type_map:
            txn_type_map[txn_type] = {
            "txn_type": txn_type,
            "txn_type_desc": txn_type_desc,
            "sanction_amt": 0.0,
            "os_amt": 0.0
        }

        txn_type_map[txn_type]["sanction_amt"] += sanction_amt
        txn_type_map[txn_type]["os_amt"] += os_amt

        if disb_no:
            if disb_no not in top_disb_map:
                top_disb_map[disb_no] = {
                    "disb_no": disb_no,
                    "os_amt": 0.0,
                    "sanction_amt": 0.0
                }

            top_disb_map[disb_no]["os_amt"] += os_amt
            top_disb_map[disb_no]["sanction_amt"] += sanction_amt

        # rate / portfolio splits
        if "fixed" in rtype.lower():
            lv_fixed_b += closing
        else:
            lv_float_b += closing

        pl = portfo.lower()
        if "secured" in pl and "unsecured" not in pl:
            lv_sec_b += closing
        elif "unsecured" in pl:
            lv_uns_b += closing
        else:
            lv_oth_b += closing

        # Sanction vs O/S Gap
        if ptype not in sanction_vs_os_map:
            sanction_vs_os_map[ptype] = {
            "zprd_type": ptype,
            "zprd_desc": pdesc,
            "sanction_amt": 0.0,
            "os_amt": 0.0,
            "seen_sanctions": set(),   
            "sanction_map": {}         
        }
        sv = sanction_vs_os_map[ptype]
        sv["os_amt"] += os_amt
        if sanction_no and sanction_no not in sv["seen_sanctions"]:
            sv["seen_sanctions"].add(sanction_no)
            sv["sanction_amt"] += sanction_amt   
        asset_class = str(row.get("Asset Classification") or "Standard")
        all_asset_classes.add(asset_class)

        if pdesc not in product_asset_map:
            product_asset_map[pdesc] = {}

        if asset_class not in product_asset_map[pdesc]:
            product_asset_map[pdesc][asset_class] = 0.0

        product_asset_map[pdesc][asset_class] += os_amt    
    product_bp_exposure = []

    for prd_desc, bp_data in product_bp_map.items():
        bp_list = []

        for bp in all_bp_groups:
            bp_list.append({
                "bp_group": bp,
                "os_amt": round(bp_data.get(bp, 0.0), 2)   # 👈 KEY FIX
            })

        product_bp_exposure.append({
            "zprd_desc": prd_desc,
            "bp_groups": bp_list
        })
    product_asset_exposure = []

    for prd_desc, asset_data in product_asset_map.items():
        asset_list = []

        for asset in all_asset_classes:
            asset_list.append({
                "asset_group": asset,
                "os_amt": round(asset_data.get(asset, 0.0), 2)
            })

        product_asset_exposure.append({
            "zprd_desc": prd_desc,
            "assets_groups": asset_list
        })    
    sanction_vs_os = [
                {
                    "zprd_type": v["zprd_type"],
                    "zprd_desc": v["zprd_desc"],
                    "sanction_amt": round(v["sanction_amt"], 2),
                    "os_amt": round(v["os_amt"], 2),
                    "sanction_count": len(v["seen_sanctions"])
                }
                for v in sanction_vs_os_map.values()
    ]    
    bp_summary = sorted(
        [
            {
                "bp_group": bp,
                "os_amt": round(vals["os_amt"], 2),
                "sanction_amt": round(vals["sanction_amt"], 2),
                "interest_due": round(vals["interest_due"], 2),
                "exposure_amt": round(vals["exposure_amt"], 2),
                "disb_count": len(vals["disb_set"]), 
                "products": [
                    {
                        "prd_type": prd,
                        "os_amt": round(bp_product_map.get(bp, {}).get(prd, 0.0), 2)
                    }
                    for prd in all_prd_types  
                ]
            }
            for bp, vals in bp_summary_map.items()
        ],
        key=lambda x: x["os_amt"],
        reverse=True
    )
    currency_summary = sorted(
    [
        {
            "currency": curr,
            "os_amt": round(amount, 2),
            "os_percent": round((amount / (total_os_amt or 1)) * 100, 2)
        }
        for curr, amount in currency_map.items()
    ],
    key=lambda x: x["os_amt"],
    reverse=True
)
    # ── sorted product list ────────────────────────────────────────────────
    products = sorted(products_map.values(),
                      key=lambda p: p["zclosing_amt"], reverse=True)

    asset_lookup = {p["zprd_desc"]: p["assets_groups"] for p in product_asset_exposure}

    for p in products:
        p["assets_groups"] = asset_lookup.get(p["zprd_desc"], [])                  
        lenders = sorted(
            [{"zcounterpty": k, "zclosing_amt": v}
                for k, v in lenders_map.items()],
            key=lambda l: l["zclosing_amt"], reverse=True,
        )
    total_os = total_os_amt or 1.0
    customer_count = len(customer_set)  # customers len
    # Top 5 borrowers
    top_borrowers_five = sorted(
        [
            {
                "zborrower": name,
                 "os_amt": round(vals["os_amt"], 2),
                "sanction_amt": round(vals["sanction_amt"], 2),
                "os_percent": round((vals["os_amt"] / total_os) * 100, 2)
            }
            for name, vals in borrowers_map.items()
        ],
        key=lambda x: x["os_amt"],
        reverse=True
    )[:5]
    top_borrowers = sorted(
        [
            {
                "zborrower": name,
                "bp_group": vals.get("bp_group", ""),
                "zinterest_rate": vals.get("interest_rate", 0.0),                
                "os_amt": round(vals["os_amt"], 2),
                "sanction_amt": round(vals["sanction_amt"], 2),
                "interest_due": round(vals.get("interest_due", 0.0), 2),
                "utilization_rate": vals.get("utilization_rate", 0.0),
                "os_percent": round((vals["os_amt"] / total_os) * 100, 2),
                "active_disb": vals.get("active_disb", 0),
            }
            for name, vals in borrowers_map.items()
        ],
        key=lambda x: x["os_amt"],
        reverse=True
    )
    # Top 5 Portfolios 
    top_portfolios = sorted(
        [
            {
                "zportfolio": name or "Others",
                "os_amt": round(vals["os_amt"], 2),
                "sanction_amt": round(vals["sanction_amt"], 2),
                "os_percent": round((vals["os_amt"] / total_os) * 100, 2)
            }
            for name, vals in portfolios_map.items()
        ],
        key=lambda x: x["os_amt"],
        reverse=True
    )
    asset_classification_summary = sorted(
        [
            {
                "asset_class": name or "Standard",
                "os_amt": round(os, 2),
                "os_percent": round((os / total_os) * 100, 2)
            }
            for name, os in asset_classification_map.items()
        ],
        key=lambda x: x["os_amt"],
        reverse=True
    )
    # Txn Summary
    txn_type_summary = sorted(
    [
        {
            "txn_type": v["txn_type"],
            "txn_type_desc": v["txn_type_desc"],
            "sanction_amt": round(v["sanction_amt"], 2),
            "os_amt": round(v["os_amt"], 2)
        }
        for v in txn_type_map.values()
    ],
    key=lambda x: x["os_amt"],
    reverse=True
)
# Top 10 disbursements by OS amount
    top_disb_os = sorted(
        [
            {
                "disb_no": v["disb_no"],
                "os_amt": round(v["os_amt"], 2),
                "sanction_amt": round(v["sanction_amt"], 2)
            }
            for v in top_disb_map.values()
        ],
        key=lambda x: x["os_amt"],
        reverse=True
    )[:10]
    if products:
            # Find product with maximum zos_amt
            top_product_by_os = max(products, key=lambda p: p.get("zos_amt", 0))
            top_product_by_inr = max(products, key=lambda p: p.get("zint_rec", 0))
            low_product_by_inr = min(products, key=lambda p: p.get("zint_rec", 0))
            lv_top_prd = top_product_by_os.get("zprd_type", "")
            lv_hi_prd = top_product_by_inr.get("zprd_type")
            lv_lo_prd = low_product_by_inr.get("zprd_type")
            lv_top_os_amt = round(top_product_by_os.get("zos_amt", 0), 2)
            lv_hi_int_amt = round(top_product_by_inr.get("zint_rate", 0), 2)
            lv_lo_int_amt = round(low_product_by_inr.get("zint_rate",0),2)
    else:
            lv_top_prd = ""
            lv_hi_prd = ""
            lv_lo_prd = ""
            lv_top_os_amt = 0.0
            lv_hi_int_amt = 0.0
            lv_lo_int_amt = 0.0
    # ── portfolio-level totals ─────────────────────────────────────────────
    lv_total_b = sum(p["zclosing_amt"] for p in products)
    lv_total_acc = sum(p["zaccrual_amt"] for p in products)
    lv_total_wt = sum(p["zwt_avg_amt"] for p in products)
    lv_total_af = sum(p["zavg_funds"] for p in products)
    lv_total_ia = sum(p["zwt_int_amt"] for p in products)

    # weighted average EIR
    wt_eir_num = sum(
        p["zavg_eir_sum"] / p["zeir_cnt"] * p["zclosing_amt"]
        for p in products if p["zeir_cnt"] > 0
    )
    lv_avg_eir = round(wt_eir_num / lv_total_b, 4) if lv_total_b else 0.0
    lv_avg_exp = round(total_os_amt / customer_count, 2) if customer_count > 0 else 0.0
    top = products[0] if products else {}
    hi = max((p for p in products if p["zeir_cnt"] > 0),
             key=lambda p: p["zavg_eir_sum"] / p["zeir_cnt"], default={})
    lo = min((p for p in products if p["zeir_cnt"] > 0),
             key=lambda p: p["zavg_eir_sum"] / p["zeir_cnt"], default={})
    ha = max(products, key=lambda p: p["zaccrual_amt"], default={})

    hi_eir_val = (hi["zavg_eir_sum"] / hi["zeir_cnt"]
                  ) if hi.get("zeir_cnt") else 0
    lo_eir_val = (lo["zavg_eir_sum"] / lo["zeir_cnt"]
                  ) if lo.get("zeir_cnt") else 9999

    lv_largest_year = ""
    lv_largest_amt = 0.0
    lv_mat_horizon = 0

    if maturity_map:
        years = [int(y) for y in maturity_map.keys() if y.isdigit()]
        if years:
            lv_mat_horizon = max(years) - min(years)
    if maturity_map:
        lv_largest_year = max(
            maturity_map,
            key=lambda y: maturity_map[y]["os_amt"]
        )
        lv_largest_amt = maturity_map[lv_largest_year]["os_amt"]

    # Sanction vs O/S Gap

    totals = {
        "loan_amt": round(total_loan_amt, 2),
        "total_os_amt": round(total_os_amt,2),
        "total_prin_rec": round(total_prin_rec,2),
        "total_exposure": round(total_exposure),
        "total_sanction": round(total_sanction, 2),
        "lv_largest_year": lv_largest_year,
        "lv_largest_year_amt": round(lv_largest_amt, 2),
        "lv_mat_horizon": lv_mat_horizon,
        "lv_long_os": round(lv_long_os, 2),
        "lv_avg_exp":   lv_avg_exp,
        "lv_top_prd":   lv_top_prd,
        "lv_hi_prd":    lv_hi_prd,
        "lv_lo_prd":    lv_lo_prd,
        "lv_disb_cnt": len(disb_set),
        "lv_fixed_b":   round(lv_fixed_b, 2),
        "lv_float_b":   round(lv_float_b, 2),
        "lv_sec_b":     round(lv_sec_b,   2),
        "lv_uns_b":     round(lv_uns_b,   2),
        "lv_oth_b":     round(lv_oth_b,   2),
        "lv_total_b":   round(lv_total_b,  2),
        "lv_total_acc": round(lv_total_acc, 2),
        "lv_total_wt":  round(lv_total_wt,  2),
        "lv_total_af":  round(lv_total_af,  2),
        "lv_total_ia":  round(lv_total_ia,  2),
        "lv_avg_eir":   round(lv_avg_eir,   4),
        "lv_top_cl":    round(top.get("zclosing_amt", 0), 2),
        "lv_hi_eir_val": round(hi_eir_val, 4),
        "lv_hi_eir_b":  round(hi.get("zclosing_amt", 0), 2),
        "lv_lo_eir_val": round(lo_eir_val, 4),
        "lv_lo_eir_b":  round(lo.get("zclosing_amt", 0), 2),
        "lv_ha_prd":    ha.get("zprd_desc", ""),
        "lv_ha_acc":    round(ha.get("zaccrual_amt", 0), 2),
        "lv_lend_cnt":  len(lenders),
        "lv_prd_cnt":   len(products),
        "lv_cust_cnt":  customer_count,
        "total":        round(lv_total_b, 2),
    }

    return {
        "query_type": "cof_dashboard",
        "render_state": {
            "products":     products,
            "lenders":      lenders,
            "maturity":     maturity_map,
            "transactions": transaction_rows,
            "borrowers":   top_borrowers_five,
            "borrowers_full": top_borrowers,
            "totals":       totals,           
            "portfolios":   top_portfolios,         
            "asset_classification": asset_classification_summary, 
            "sanctionVsOs": sanction_vs_os,
            "productBpExposure": product_bp_exposure,
            "bpSummary": bp_summary,
            "txnTypeSummary": txn_type_summary,
            "topDisbByOs": top_disb_os,
            "currencySummary": currency_summary,
        },

        "row_count": len(rows),
        "filters":   filters or {},
    }
