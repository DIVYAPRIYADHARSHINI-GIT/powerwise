#!/usr/bin/env python3
"""PowerWise - synthetic data generator + monthly-units (kWh) model.

Only needs numpy + scikit-learn (see requirements.txt). Run from the repo root:

    python ml/train_model.py

Outputs
  ml/data/households.csv        1,200 synthetic Indian households (sample data)
  ml/data/monthly_usage.csv     30 months of billed units per household
  src/data/model.json           exported gradient-boosted trees (run in Next.js API routes)
  src/data/physics.json         appliance power + seasonal factors (appliance breakdown)
  src/data/metrics.json         accuracy vs baselines, feature importance, dataset summary
  src/data/sample.json          the sample household loaded on first visit + its past bills

Everything here is SAMPLE DATA generated from simple engineering rules plus
noise. No real electricity-board accounts or APIs are used.
"""
from __future__ import annotations

import calendar
import csv
import json
from pathlib import Path

import numpy as np
from sklearn.ensemble import HistGradientBoostingRegressor
from sklearn.inspection import permutation_importance
from sklearn.linear_model import LinearRegression
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score

SEED = 42
ROOT = Path(__file__).resolve().parent
OUT_APP = ROOT.parent / "src" / "data"
OUT_DATA = ROOT / "data"
N_HOUSEHOLDS = 1200
START_YEAR, START_MONTH, N_MONTHS = 2024, 4, 30  # Apr 2024 .. Sep 2026

CLIMATES = ["hot", "moderate", "cool"]
CITIES = {
    "hot": ["Chennai", "Hyderabad", "Ahmedabad", "Delhi", "Nagpur", "Kolkata", "Jaipur", "Lucknow"],
    "moderate": ["Bengaluru", "Pune", "Mumbai", "Kochi", "Mysuru", "Goa"],
    "cool": ["Shimla", "Darjeeling", "Ooty", "Shillong", "Dehradun", "Srinagar"],
}
APPLIANCES = ["ac", "fridge", "geyser", "washer", "tv", "fans", "lights", "iron", "induction", "ev"]

# ---------------------------------------------------------------- physics
# Average power while running (kW per unit). Fridge is kWh/day by star rating.
KW = {
    "ac": 1.16,  # 1.5 t split AC at 24 C incl. compressor duty cycle
    "geyser": 1.7,  # 2 kW element x thermostat duty
    "washer": 0.45,
    "tv": 0.09,
    "fans": 0.065,
    "lights": 0.012,  # LED bulbs / tubes
    "iron": 0.75,
    "induction": 1.3,
    "ev": 0.65,  # e-scooter / e-bike charger
}
FRIDGE_KWH_DAY = {"base": 1.7, "perStar": -0.2}  # 1-star 1.5 .. 5-star 0.7 kWh/day
AC_TEMP_PER_DEG = 0.06  # ~6 % AC energy per degree C below 24
# Share of the user's "typical day" hours actually used in each month (Jan..Dec).
SEASON = {
    "ac": {
        "hot": [0.35, 0.45, 0.75, 0.95, 1.0, 0.95, 0.8, 0.75, 0.75, 0.65, 0.45, 0.35],
        "moderate": [0.12, 0.2, 0.5, 0.75, 0.8, 0.45, 0.3, 0.3, 0.35, 0.35, 0.2, 0.12],
        "cool": [0.0, 0.0, 0.05, 0.2, 0.35, 0.4, 0.3, 0.25, 0.15, 0.05, 0.0, 0.0],
    },
    "geyser": {
        "hot": [1.0, 0.8, 0.45, 0.2, 0.15, 0.15, 0.2, 0.2, 0.25, 0.4, 0.7, 1.0],
        "moderate": [1.0, 0.9, 0.7, 0.5, 0.45, 0.55, 0.6, 0.6, 0.6, 0.7, 0.85, 1.0],
        "cool": [1.3, 1.25, 1.1, 0.9, 0.75, 0.7, 0.75, 0.75, 0.8, 0.95, 1.15, 1.3],
    },
    "fans": {
        "hot": [0.55, 0.65, 0.9, 1.0, 1.05, 1.0, 0.9, 0.9, 0.9, 0.85, 0.7, 0.55],
        "moderate": [0.45, 0.55, 0.8, 0.95, 0.95, 0.75, 0.65, 0.65, 0.7, 0.7, 0.55, 0.45],
        "cool": [0.05, 0.08, 0.2, 0.45, 0.65, 0.7, 0.6, 0.55, 0.4, 0.2, 0.08, 0.05],
    },
    "fridge": {
        "hot": [0.9, 0.95, 1.05, 1.15, 1.2, 1.15, 1.05, 1.05, 1.05, 1.0, 0.95, 0.9],
        "moderate": [0.9, 0.92, 1.0, 1.08, 1.1, 1.0, 0.97, 0.97, 0.98, 0.97, 0.93, 0.9],
        "cool": [0.75, 0.75, 0.82, 0.9, 0.98, 1.0, 1.0, 0.98, 0.92, 0.85, 0.8, 0.75],
    },
}
LIGHT_MONTH = [1.1, 1.05, 1.0, 0.95, 0.92, 0.95, 1.0, 1.0, 1.0, 1.05, 1.1, 1.12]
# Festival intensity by month: Pongal/Sankranti (Jan), Onam/Ganesh (Aug/Sep),
# Navratri/Diwali (Oct/Nov), Christmas/New Year (Dec).
FESTIVAL = [0.5, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.3, 0.3, 1.0, 1.0, 0.5]
FESTIVAL_LIGHTS = 0.35  # +35 % lighting at full festival intensity
FESTIVAL_COOKING = 0.15
FESTIVAL_EXTRA_KWH = 14  # decoration lights, guests, sweets
WFH_LOAD_PER_DAY = 0.07  # +7 % AC/fan/light hours per WFH day per week
WFH_KWH_PER_DAY = 1.1  # laptop, monitor, router on a WFH day
MISC = {"base": 0.5, "perMember": 0.22, "perBhk": 0.25}  # kWh/day: chargers, mixer, pump...
SOLAR_KWH_PER_KW_DAY = {"hot": 4.4, "moderate": 4.1, "cool": 3.5}
SOLAR_MONTH = [0.92, 1.0, 1.1, 1.1, 1.08, 0.85, 0.72, 0.72, 0.8, 0.95, 0.95, 0.9]

FEATURES = [
    "members", "bhk", "climate", "month", "festival", "wfh_days",
    "ac_load", "ac_temp", "fridge_load", "geyser_load", "washer_load", "tv_load",
    "fan_load", "light_load", "iron_load", "induction_load", "ev_load", "solar_kw",
    # season-aware loads: typical hours x the month's climate factor
    "ac_season", "geyser_season", "fan_season", "fridge_season", "solar_season",
]
# More appliance use / people / WFH -> more units; warmer AC set-point / more solar -> fewer.
MONOTONIC = [1, 1, 0, 0, 0, 1, 1, -1, 1, 1, 1, 1, 1, 1, 1, 1, 1, -1, 1, 1, 1, 1, -1]


def appliance_kwh(h: dict, month: int, days: int) -> dict:
    """Engineering estimate of monthly kWh per appliance (no noise, before solar)."""
    clim = h["climate"]
    m = month - 1
    a = h["appliances"]
    wfh = 1 + WFH_LOAD_PER_DAY * h["wfh_days"]
    fest = FESTIVAL[m]
    out = {}
    temp_f = max(0.45, min(1.6, 1 + AC_TEMP_PER_DEG * (24 - a["ac"]["temp"])))
    out["ac"] = a["ac"]["count"] * a["ac"]["hours"] * SEASON["ac"][clim][m] * wfh * KW["ac"] * temp_f * days
    out["fridge"] = a["fridge"]["count"] * (FRIDGE_KWH_DAY["base"] + FRIDGE_KWH_DAY["perStar"] * a["fridge"]["star"]) * SEASON["fridge"][clim][m] * days
    out["geyser"] = a["geyser"]["count"] * a["geyser"]["hours"] * SEASON["geyser"][clim][m] * KW["geyser"] * days
    out["washer"] = a["washer"]["count"] * a["washer"]["hours"] * KW["washer"] * days
    out["tv"] = a["tv"]["count"] * a["tv"]["hours"] * KW["tv"] * days
    out["fans"] = a["fans"]["count"] * a["fans"]["hours"] * SEASON["fans"][clim][m] * wfh * KW["fans"] * days
    out["lights"] = a["lights"]["count"] * a["lights"]["hours"] * LIGHT_MONTH[m] * (1 + FESTIVAL_LIGHTS * fest) * wfh * KW["lights"] * days
    out["iron"] = a["iron"]["count"] * a["iron"]["hours"] * KW["iron"] * days
    out["induction"] = a["induction"]["count"] * a["induction"]["hours"] * (1 + FESTIVAL_COOKING * fest) * KW["induction"] * days
    out["ev"] = a["ev"]["count"] * a["ev"]["hours"] * KW["ev"] * days
    out["other"] = (MISC["base"] + MISC["perMember"] * h["members"] + MISC["perBhk"] * h["bhk"]) * days + WFH_KWH_PER_DAY * h["wfh_days"] / 7 * days + FESTIVAL_EXTRA_KWH * fest
    return out


def solar_kwh(h: dict, month: int, days: int) -> float:
    return h["solar_kw"] * SOLAR_KWH_PER_KW_DAY[h["climate"]] * SOLAR_MONTH[month - 1] * days


def feature_row(h: dict, month: int) -> list[float]:
    a = h["appliances"]
    c, m = h["climate"], month - 1
    fridge = a["fridge"]["count"] * (FRIDGE_KWH_DAY["base"] + FRIDGE_KWH_DAY["perStar"] * a["fridge"]["star"])
    return [
        h["members"], h["bhk"], CLIMATES.index(h["climate"]), month, FESTIVAL[month - 1], h["wfh_days"],
        a["ac"]["count"] * a["ac"]["hours"],
        a["ac"]["temp"] if a["ac"]["count"] > 0 else 24,
        fridge,
        a["geyser"]["count"] * a["geyser"]["hours"],
        a["washer"]["count"] * a["washer"]["hours"],
        a["tv"]["count"] * a["tv"]["hours"],
        a["fans"]["count"] * a["fans"]["hours"],
        a["lights"]["count"] * a["lights"]["hours"],
        a["iron"]["count"] * a["iron"]["hours"],
        a["induction"]["count"] * a["induction"]["hours"],
        a["ev"]["count"] * a["ev"]["hours"],
        h["solar_kw"],
        a["ac"]["count"] * a["ac"]["hours"] * SEASON["ac"][c][m],
        a["geyser"]["count"] * a["geyser"]["hours"] * SEASON["geyser"][c][m],
        a["fans"]["count"] * a["fans"]["hours"] * SEASON["fans"][c][m],
        fridge * SEASON["fridge"][c][m],
        h["solar_kw"] * SOLAR_KWH_PER_KW_DAY[c] * SOLAR_MONTH[m],
    ]


# ---------------------------------------------------------------- households
def make_household(i: int, rng: np.random.Generator) -> dict:
    clim = rng.choice(CLIMATES, p=[0.5, 0.35, 0.15])
    city = rng.choice(CITIES[clim])
    bhk = int(rng.choice([1, 2, 3], p=[0.3, 0.45, 0.25]))
    members = int(np.clip(rng.poisson({1: 2.4, 2: 3.4, 3: 4.4}[bhk]), 1, 8))
    q = lambda lo, hi, step=0.5: float(np.round(rng.uniform(lo, hi) / step) * step)  # noqa: E731

    def use(count=0, hours=0.0, **kw):
        return {"count": int(count), "hours": float(hours) if count else 0.0, **kw}

    p_ac = {"hot": [0.38, 0.47, 0.12, 0.03], "moderate": [0.62, 0.3, 0.07, 0.01], "cool": [0.9, 0.09, 0.01, 0.0]}[clim]
    ac_n = int(rng.choice(4, p=p_ac))
    ac_n = min(ac_n + (1 if bhk == 3 and ac_n and rng.random() < 0.35 else 0), 3)
    ac_hours = {"hot": (4, 12), "moderate": (2, 8), "cool": (1, 4)}[clim]
    ac = use(ac_n, q(*ac_hours), temp=int(rng.choice([18, 20, 22, 23, 24, 25, 26], p=[0.04, 0.08, 0.16, 0.2, 0.3, 0.12, 0.1])))
    fridge = {"count": int(rng.choice([0, 1, 2], p=[0.03, 0.85, 0.12]) if bhk == 3 else rng.choice([0, 1], p=[0.04, 0.96])), "hours": 24.0,
              "star": int(rng.choice([1, 2, 3, 4, 5], p=[0.06, 0.2, 0.38, 0.18, 0.18]))}
    p_gey = {"hot": 0.45, "moderate": 0.7, "cool": 0.95}[clim]
    gey_n = (1 + int(bhk == 3 and rng.random() < 0.5)) if rng.random() < p_gey else 0
    geyser = use(gey_n, q(0.5, 2.0, 0.25) if clim == "cool" else q(0.25, 1.5, 0.25))
    washer = use(int(rng.random() < 0.55 + 0.08 * members), q(0.25, 1.5, 0.25))
    tv = use(int(rng.choice([0, 1, 2], p=[0.08, 0.72, 0.2])), q(2, 7))
    rooms = bhk + 1
    fan_n = {"hot": int(rooms + rng.integers(1, 4)), "moderate": int(rooms + rng.integers(0, 3)), "cool": int(rng.integers(0, 3))}[clim]
    fans = use(fan_n, {"hot": q(8, 16), "moderate": q(6, 12), "cool": q(1, 5)}[clim])
    lights = use(int(rng.integers(*{1: (4, 9), 2: (6, 13), 3: (9, 19)}[bhk])), q(4, 7))
    iron = use(int(rng.random() < 0.75), q(0.25, 0.75, 0.25))
    induction = use(int(rng.random() < 0.3), q(0.5, 2.0, 0.25))
    ev = use(int(rng.choice([0, 1, 2], p=[0.88, 0.11, 0.01])), q(1, 4))
    wfh = int(rng.choice([0, 1, 2, 3, 4, 5], p=[0.62, 0.06, 0.1, 0.1, 0.06, 0.06]))
    solar = float(rng.choice([1, 2, 3, 4, 5], p=[0.15, 0.3, 0.35, 0.15, 0.05])) if rng.random() < (0.05 if clim == "cool" else 0.12) else 0.0
    return {
        "id": f"H{i:04d}", "city": str(city), "climate": str(clim), "bhk": bhk, "members": members,
        "wfh_days": wfh, "solar_kw": solar,
        "appliances": {"ac": ac, "fridge": fridge, "geyser": geyser, "washer": washer, "tv": tv, "fans": fans,
                       "lights": lights, "iron": iron, "induction": induction, "ev": ev},
        "behaviour": float(rng.lognormal(0, 0.07)),
    }


def months():
    y, m = START_YEAR, START_MONTH
    for _ in range(N_MONTHS):
        yield y, m
        m += 1
        if m == 13:
            y, m = y + 1, 1


# Weather the model never sees: 2024 heatwave summer, slightly warm 2026.
HEAT = {(2024, m): 1.08 for m in (3, 4, 5, 6)} | {(2026, m): 1.04 for m in (3, 4, 5, 6)}


def billed_units(h: dict, y: int, m: int, rng: np.random.Generator) -> float:
    days = calendar.monthrange(y, m)[1]
    parts = appliance_kwh(h, m, days)
    parts["ac"] *= HEAT.get((y, m), 1.0)
    total = sum(parts.values()) * h["behaviour"] * rng.lognormal(0, 0.06)
    r = rng.random()
    if r < 0.04:
        total *= 0.55  # family travelling
    elif r < 0.09:
        total *= 1.15  # guests staying over
    gen = solar_kwh(h, m, days) * rng.lognormal(0, 0.05)
    return max(0.0, total - gen)  # net metering: billed = imported - exported


# ---------------------------------------------------------------- model export
def export_hgb(model: HistGradientBoostingRegressor) -> dict:
    trees = []
    for (pred,) in model._predictors:
        n = pred.nodes
        leaf = n["is_leaf"].astype(bool)
        trees.append({
            "f": [int(f) if not lf else -1 for f, lf in zip(n["feature_idx"], leaf)],
            "t": [float(t) if not lf else 0 for t, lf in zip(n["num_threshold"], leaf)],
            "l": [int(v) for v in n["left"]],
            "r": [int(v) for v in n["right"]],
            "v": [round(float(v), 7) if lf else 0 for v, lf in zip(n["value"], leaf)],
        })
    return {"baseline": float(np.ravel(model._baseline_prediction)[0]), "trees": trees}


def js_predict(exported: dict, x: list[float]) -> float:
    s = exported["baseline"]
    for t in exported["trees"]:
        i = 0
        while t["f"][i] != -1:
            i = t["l"][i] if x[t["f"][i]] <= t["t"][i] else t["r"][i]
        s += t["v"][i]
    return s


def metrics(y, p):
    mask = y >= 30
    return {
        "mae": round(float(mean_absolute_error(y, p)), 1),
        "rmse": round(float(np.sqrt(mean_squared_error(y, p))), 1),
        "r2": round(float(r2_score(y, p)), 3),
        "mape": round(float(np.mean(np.abs(p[mask] - y[mask]) / y[mask]) * 100), 1),
    }


# ---------------------------------------------------------------- sample household
SAMPLE = {
    "name": "Sharma family (sample)", "city": "Chennai", "climate": "hot", "bhk": 2, "members": 4,
    "wfh_days": 2, "solar_kw": 0.0,
    "appliances": {
        "ac": {"count": 1, "hours": 7.0, "temp": 22}, "fridge": {"count": 1, "hours": 24.0, "star": 3},
        "geyser": {"count": 1, "hours": 0.75}, "washer": {"count": 1, "hours": 1.0}, "tv": {"count": 1, "hours": 4.0},
        "fans": {"count": 4, "hours": 10.0}, "lights": {"count": 9, "hours": 5.5}, "iron": {"count": 1, "hours": 0.5},
        "induction": {"count": 1, "hours": 0.75}, "ev": {"count": 0, "hours": 0.0},
    },
    "behaviour": 1.06,
}


def main():
    rng = np.random.default_rng(SEED)
    OUT_APP.mkdir(parents=True, exist_ok=True)
    OUT_DATA.mkdir(parents=True, exist_ok=True)

    homes = [make_household(i + 1, rng) for i in range(N_HOUSEHOLDS)]
    X, y, gid, meta = [], [], [], []
    for gi, h in enumerate(homes):
        for yy, mm in months():
            X.append(feature_row(h, mm))
            y.append(billed_units(h, yy, mm, rng))
            gid.append(gi)
            meta.append((h["id"], f"{yy}-{mm:02d}", h["climate"]))
    X, y, gid = np.array(X, float), np.array(y, float), np.array(gid)
    print(f"rows={len(y)} households={N_HOUSEHOLDS} mean={y.mean():.0f} p10={np.percentile(y, 10):.0f} p90={np.percentile(y, 90):.0f} max={y.max():.0f}")

    # ---- CSVs (sample data)
    with open(OUT_DATA / "households.csv", "w", newline="") as f:
        w = csv.writer(f)
        w.writerow(["household_id", "city", "climate", "bhk", "members", "wfh_days", "solar_kw"]
                   + [f"{a}_{k}" for a in APPLIANCES for k in (("count", "star") if a == "fridge" else ("count", "hours", "temp") if a == "ac" else ("count", "hours"))])
        for h in homes:
            row = [h["id"], h["city"], h["climate"], h["bhk"], h["members"], h["wfh_days"], h["solar_kw"]]
            for a in APPLIANCES:
                u = h["appliances"][a]
                row += [u["count"], u["star"]] if a == "fridge" else [u["count"], u["hours"], u["temp"]] if a == "ac" else [u["count"], u["hours"]]
            w.writerow(row)
    with open(OUT_DATA / "monthly_usage.csv", "w", newline="") as f:
        w = csv.writer(f)
        w.writerow(["household_id", "month", "climate", "units_kwh"])
        for (hid, mon, clim), u in zip(meta, y):
            w.writerow([hid, mon, clim, round(u, 1)])

    # ---- split by household (no household appears in both train and test)
    perm = rng.permutation(N_HOUSEHOLDS)
    test_ids = set(perm[: int(0.2 * N_HOUSEHOLDS)].tolist())
    te = np.array([g in test_ids for g in gid])
    tr = ~te

    model = HistGradientBoostingRegressor(
        max_iter=400, learning_rate=0.07, max_leaf_nodes=24, min_samples_leaf=20,
        l2_regularization=0.5, monotonic_cst=MONOTONIC, early_stopping=False, random_state=SEED,
    )
    model.fit(X[tr], y[tr])
    p_gbm = np.clip(model.predict(X[te]), 0, None)

    # Baseline: average units of similar homes (same BHK, climate and month).
    fi = {n: i for i, n in enumerate(FEATURES)}
    key = lambda r: (int(r[fi["bhk"]]), int(r[fi["climate"]]), int(r[fi["month"]]))  # noqa: E731
    sums: dict = {}
    for r, v in zip(X[tr], y[tr]):
        s = sums.setdefault(key(r), [0.0, 0])
        s[0] += v
        s[1] += 1
    p_base = np.array([sums[key(r)][0] / sums[key(r)][1] for r in X[te]])
    lin = LinearRegression().fit(X[tr], y[tr])
    p_lin = np.clip(lin.predict(X[te]), 0, None)

    res = {"gbm": metrics(y[te], p_gbm), "baseline": metrics(y[te], p_base), "linear": metrics(y[te], p_lin)}
    for k, v in res.items():
        print(k, v)

    ok = p_gbm >= 30
    ratio = y[te][ok] / p_gbm[ok]
    q10, q90 = (float(np.percentile(ratio, 10)), float(np.percentile(ratio, 90)))

    imp = permutation_importance(model, X[te], y[te], n_repeats=3, random_state=SEED, scoring="neg_mean_absolute_error")
    importance = sorted(({"feature": n, "score": round(max(0.0, float(s)), 4)} for n, s in zip(FEATURES, imp.importances_mean)), key=lambda d: -d["score"])
    tot = sum(d["score"] for d in importance) or 1
    for d in importance:
        d["share"] = round(d["score"] / tot * 100, 1)

    exported = export_hgb(model)
    diffs = [abs(js_predict(exported, list(r)) - p) for r, p in zip(X[te][:300], model.predict(X[te][:300]))]
    assert max(diffs) < 1e-4, f"export mismatch {max(diffs)}"
    parity = [{"x": [float(v) for v in r], "y": round(float(p), 6)} for r, p in zip(X[te][:20], model.predict(X[te][:20]))]
    (OUT_APP / "model.json").write_text(json.dumps({
        "type": "HistGradientBoostingRegressor", "target": "units_kwh", "features": FEATURES, **exported, "parity": parity,
    }, separators=(",", ":")))

    (OUT_APP / "physics.json").write_text(json.dumps({
        "climates": CLIMATES, "cities": CITIES, "kw": KW, "fridgeKwhDay": FRIDGE_KWH_DAY, "acTempPerDeg": AC_TEMP_PER_DEG,
        "season": SEASON, "lightMonth": LIGHT_MONTH, "festival": FESTIVAL, "festivalLights": FESTIVAL_LIGHTS,
        "festivalCooking": FESTIVAL_COOKING, "festivalExtraKwh": FESTIVAL_EXTRA_KWH, "wfhLoadPerDay": WFH_LOAD_PER_DAY,
        "wfhKwhPerDay": WFH_KWH_PER_DAY, "misc": MISC, "solarKwhPerKwDay": SOLAR_KWH_PER_KW_DAY, "solarMonth": SOLAR_MONTH,
    }, indent=1))

    monthly = {c: [0.0] * 12 for c in CLIMATES}
    cnt = {c: [0] * 12 for c in CLIMATES}
    for (_, mon, clim), u in zip(meta, y):
        mi = int(mon[5:]) - 1
        monthly[clim][mi] += u
        cnt[clim][mi] += 1
    monthly = {c: [round(monthly[c][i] / max(1, cnt[c][i])) for i in range(12)] for c in CLIMATES}
    (OUT_APP / "metrics.json").write_text(json.dumps({
        "generated": "synthetic sample data, seed 42",
        "dataset": {
            "households": N_HOUSEHOLDS, "months": N_MONTHS, "rows": int(len(y)), "from": "2024-04", "to": "2026-09",
            "trainHouseholds": N_HOUSEHOLDS - len(test_ids), "testHouseholds": len(test_ids),
            "meanUnits": round(float(y.mean())), "medianUnits": round(float(np.median(y))),
            "shareAc": round(float(np.mean([h["appliances"]["ac"]["count"] > 0 for h in homes]) * 100)),
            "shareSolar": round(float(np.mean([h["solar_kw"] > 0 for h in homes]) * 100)),
            "shareWfh": round(float(np.mean([h["wfh_days"] > 0 for h in homes]) * 100)),
            "monthlyByClimate": monthly,
        },
        "model": {"algorithm": "HistGradientBoostingRegressor (scikit-learn)", "trees": len(exported["trees"]),
                  "maxLeafNodes": 24, "learningRate": 0.07, "target": "monthly units (kWh)", "monotonic": True},
        "metrics": res,
        "range": {"low": round(q10, 3), "high": round(q90, 3)},
        "importance": importance,
    }, indent=1))

    # ---- sample household: 12 calendar months of "actual" past bills (with noise)
    srng = np.random.default_rng(7)
    actual = []
    for mm in range(1, 13):
        days = calendar.monthrange(2025, mm)[1]
        u = sum(appliance_kwh(SAMPLE, mm, days).values()) * SAMPLE["behaviour"] * srng.lognormal(0, 0.05)
        actual.append(int(round(u)))
    (OUT_APP / "sample.json").write_text(json.dumps({"household": {
        "name": SAMPLE["name"], "city": SAMPLE["city"], "climate": SAMPLE["climate"], "bhk": SAMPLE["bhk"],
        "members": SAMPLE["members"], "wfhDays": SAMPLE["wfh_days"], "solarKw": SAMPLE["solar_kw"],
        "appliances": SAMPLE["appliances"]}, "unitsByMonth": actual}, indent=1))
    print("sample units by month:", actual)
    print("range multipliers", round(q10, 3), round(q90, 3))
    print("top features", [(d["feature"], d["share"]) for d in importance[:6]])
    print("model.json KB", round((OUT_APP / "model.json").stat().st_size / 1024))


if __name__ == "__main__":
    main()
