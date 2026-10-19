// End-to-end test with the locally installed headless Chrome (no npm deps).
//
//   npm run build && npx next start -p 3400 &
//   caffeinate -dims env BASE_URL=http://localhost:3400 node tests/e2e/smoke.mjs
//
// Full flow (sample on first visit -> start fresh -> setup -> prediction ->
// appliance breakdown -> tips + goal celebration -> what-if -> history (manual
// + CSV) -> forecast -> solar -> tariff -> reports PDF/CSV), the API routes,
// and every page in all 17 languages on desktop + mobile + dark mode
// (RTL for Urdu/Arabic). Short timeouts, a freeze heartbeat and a global
// watchdog: fail fast, never hang.
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { launch, sleep } from "./cdp.mjs";

const BASE = (process.env.BASE_URL ?? "http://localhost:3400").replace(/\/$/, "");
const OUT = join(dirname(fileURLToPath(import.meta.url)), "output", process.env.OUT_NAME ?? "local");
const DL = join(OUT, "downloads");
rmSync(OUT, { recursive: true, force: true });
mkdirSync(DL, { recursive: true });
const SHOTS = process.env.SHOTS !== "0";
const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

const LANGS = ["en", "ta", "hi", "te", "kn", "ml", "mr", "bn", "gu", "pa", "or", "ur", "es", "fr", "ar", "zh", "ja"];
const RTL = new Set(["ur", "ar"]);
const PAGES = ["/", "/setup", "/predict", "/appliances", "/tips", "/what-if", "/history", "/forecast", "/solar", "/reports", "/tariff", "/about"];

const results = [];
function check(name, ok, detail = "") {
  results.push({ name, ok: Boolean(ok), detail });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? `  (${detail})` : ""}`);
}

const { newPage, close } = await launch({ port: Number(process.env.CDP_PORT ?? 9377) });
const WATCHDOG_MS = Number(process.env.E2E_TIMEOUT_MS ?? 8 * 60_000);
const watchdog = setTimeout(async () => {
  console.error(`E2E watchdog: aborting after ${WATCHDOG_MS / 1000}s`);
  await close().catch(() => {});
  process.exit(2);
}, WATCHDOG_MS);
watchdog.unref();

let seq = 0;
async function freshPage({ width = 1366, height = 900, mobile = false, dark = false, lang = "en", clear = true } = {}) {
  const p = await newPage();
  await p.viewport(width, height, mobile);
  const key = `pw-init-${++seq}`;
  await p.addInitScript(`
    try {
      if (!sessionStorage.getItem('${key}')) {
        ${clear ? "localStorage.clear();" : ""}
        sessionStorage.setItem('${key}', '1');
        localStorage.setItem('powerwise.theme', '${dark ? "dark" : "light"}');
        localStorage.setItem('powerwise.lang', '${lang}');
      }
    } catch (e) {}
    window.__beat = 0; setInterval(() => { window.__beat++; }, 50);
  `);
  return p;
}
async function notFrozen(p, label) {
  const a = await p.eval("window.__beat");
  await sleep(500);
  const b = await p.eval("window.__beat");
  check(`${label}: responsive (no freeze)`, b - a >= 5, `${b - a} beats/500ms`);
}
async function shot(p, name, fullPage = false) {
  if (SHOTS) await p.screenshot(join(OUT, `${name}.png`), { fullPage }).catch(() => {});
}
async function step(name, fn) {
  try {
    await fn();
  } catch (e) {
    check(name, false, String(e?.message ?? e).split("\n")[0]);
  }
}
const noErrors = (p, label) => check(`${label}: no console errors`, p.errors.length === 0, p.errors.slice(0, 2).join(" | "));
const overflow = (p) => p.eval("document.documentElement.scrollWidth - window.innerWidth");
const ready = (p) => p.waitFor("document.documentElement.dataset.i18n === document.documentElement.lang && !document.querySelector('[data-testid=loading]') && document.querySelector('[data-testid=page-title], [data-testid=hero-title]')", 8000);
const num = (s) => Number(String(s ?? "").replace(/[^\d.]/g, ""));
const state = (p) => p.eval("JSON.parse(localStorage.getItem('powerwise.state.v1'))");
async function setRange(p, sel, value) {
  await p.fill(sel, value);
}
function latestDownload(ext, timeout = 6000) {
  const start = Date.now();
  return new Promise((resolve) => {
    const tick = () => {
      const f = readdirSync(DL).filter((x) => x.endsWith(ext) && !x.endsWith(".crdownload"));
      if (f.length) {
        const path = join(DL, f[0]);
        if (statSync(path).size > 0) return resolve(path);
      }
      if (Date.now() - start > timeout) return resolve(null);
      setTimeout(tick, 150);
    };
    tick();
  });
}
async function uploadText(p, selector, text, name) {
  await p.eval(`(() => {
    const dt = new DataTransfer(); dt.items.add(new File([${JSON.stringify(text)}], ${JSON.stringify(name)}, { type: 'text/csv' }));
    const input = document.querySelector(${JSON.stringify(selector)}); input.files = dt.files;
    input.dispatchEvent(new Event('change', { bubbles: true })); return true;
  })()`);
}

// ------------------------------------------------------------------ API routes
await step("api", async () => {
  const sample = JSON.parse(readFileSync(join(ROOT, "src/data/sample.json"), "utf8")).household;
  const post = (path, body) => fetch(BASE + path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), signal: AbortSignal.timeout(8000) });
  let r = await post("/api/bill", { units: 350 });
  let j = await r.json();
  check("api/bill: slab bill for 350 units", r.ok && j.bill.total === 1793 && j.bill.lines.length === 3, `₹${j.bill?.total}`);
  r = await post("/api/bill", { units: 700, tariff: { billing: "bimonthly" } });
  j = await r.json();
  check("api/bill: bi-monthly doubles limits", j.bill.periodMonths === 2 && j.bill.lines[0].to === 200 && j.bill.fixed === 120);
  r = await post("/api/bill", { units: -1 });
  check("api/bill: rejects bad units (400)", r.status === 400);
  r = await post("/api/analyze", { household: sample, today: "2026-10-19" });
  j = await r.json();
  check("api/analyze: next bill + 12-month forecast", r.ok && j.next.month === "2026-11" && j.forecast.length === 12 && j.next.costLow < j.next.cost && j.next.cost < j.next.costHigh, `₹${j.next?.cost}`);
  check("api/analyze: breakdown + tips", j.breakdownNext.items[0].id === "ac" && j.tips.length >= 4);
  r = await post("/api/predict", { household: sample, factor: 1, today: "2026-10-19" });
  j = await r.json();
  check("api/predict: quick prediction", r.ok && j.months.length === 12 && j.next.cost > 0);
  r = await post("/api/solar", { household: sample, kw: 3, today: "2026-10-19" });
  j = await r.json();
  check("api/solar: savings + payback", r.ok && j.kw === 3 && j.savingMonthly > 0 && j.paybackYears > 0, `${j.paybackYears} yrs`);
  r = await post("/api/report/pdf", { household: sample, goal: 500 });
  const pdf = Buffer.from(await r.arrayBuffer());
  check("api/report/pdf: valid PDF", r.ok && r.headers.get("content-type") === "application/pdf" && pdf.subarray(0, 8).toString() === "%PDF-1.4", `${pdf.length} bytes`);
  r = await post("/api/report/csv", { household: sample, bills: [{ month: "2025-05", units: 600, amount: 3700 }] });
  const csv = await r.text();
  check("api/report/csv: CSV with prediction", r.ok && csv.includes("month,units_kwh,amount_inr,predicted_units_kwh") && csv.includes("2025-05,600,3700,"));
  r = await fetch(BASE + "/api/analyze", { method: "POST", body: "{not json", signal: AbortSignal.timeout(8000) });
  check("api/analyze: invalid JSON -> 400", r.status === 400);
  r = await post("/api/analyze", {});
  check("api/analyze: missing household -> 400", r.status === 400);
  r = await fetch(BASE + "/api/model", { signal: AbortSignal.timeout(8000) });
  j = await r.json();
  check("api/model: metrics", r.ok && j.metrics.gbm.r2 > 0.85 && j.metrics.gbm.mae < j.metrics.baseline.mae && j.dataset.households >= 500, `R² ${j.metrics?.gbm?.r2}`);
});

// ------------------------------------------------------------------ first visit: sample household
await step("first visit", async () => {
  const p = await freshPage();
  await p.goto(`${BASE}/`);
  await ready(p);
  check("home: brand + tagline in nav", (await p.text("[data-testid=brand]"))?.includes("PowerWise") && (await p.text("[data-testid=tagline]")) === "Know your bill before it arrives.");
  check("home: hero illustration loaded", await p.eval("(() => { const i = document.querySelector('[data-testid=hero-image]'); return !!i && i.complete && i.naturalWidth > 0 && i.src.includes('hero.svg'); })()"));
  check("home: sample household loaded on first visit", (await p.count("[data-testid=sample-banner]")) === 1 && (await state(p))?.household?.name?.includes("Sharma"));
  check("home: sample data/tariff labels", (await p.count("[data-testid=sample-badge]")) >= 1 && (await p.text("[data-testid=sample-banner]"))?.includes("Sample data"));
  await p.waitFor("document.querySelector('[data-testid=home-next-bill]')", 6000);
  check("home: next-bill summary", num(await p.text("[data-testid=home-next-bill]")) > 500);
  check("home: 8 feature cards", (await p.count("[data-testid=feature-card]")) === 8);
  await notFrozen(p, "home");
  await shot(p, "01-home-sample");
  // Start fresh
  await p.click("[data-testid=start-fresh]");
  await p.waitFor("document.querySelector('[data-testid=confirm-dialog]')", 3000);
  await p.click("[data-testid=confirm-yes]");
  await p.waitFor("location.pathname === '/setup'", 5000);
  const s = await state(p);
  check("start fresh: clears sample + goes to setup", s.household === null && s.bills.length === 0 && s.mode === "own");
  check("start fresh: banner hidden", (await p.count("[data-testid=sample-banner]")) === 0);
  for (const path of ["/predict", "/appliances", "/history", "/reports"]) {
    await p.goto(BASE + path);
    await p.waitFor("document.querySelector('[data-testid=empty-state]')", 5000).catch(() => {});
    check(`${path}: empty state with illustration (no home)`, await p.eval("(() => { const i = document.querySelector('[data-testid=empty-state] img'); return !!i && i.complete && i.naturalWidth > 0; })()"));
  }
  await shot(p, "02-empty-state");
  await p.goto(`${BASE}/no-such-page`);
  check("404 page", (await p.text("main"))?.includes("Page not found"));
  noErrors(p, "first visit");
  await p.close();
});

// ------------------------------------------------------------------ full flow
await step("full flow", async () => {
  const p = await freshPage();
  await p.setDownloadDir(DL);
  // Begin with empty storage (no sample) via start fresh state.
  await p.goto(`${BASE}/`);
  await p.eval("localStorage.setItem('powerwise.state.v1', JSON.stringify({ household: null, bills: [], mode: 'own' }))");
  await p.goto(`${BASE}/setup`);
  await ready(p);
  // Step 1 validation
  await p.click("[data-testid=setup-next]");
  check("setup: name required", (await p.count("[role=alert]")) === 1 && (await p.count("[data-testid=step-home]")) === 1);
  await p.fill("[data-testid=hh-name]", "Test Home");
  await p.fill("[data-testid=hh-city]", "Delhi");
  check("setup: city sets climate (Delhi -> hot)", await p.eval("document.querySelector('[data-testid=climate-hot]').getAttribute('aria-checked') === 'true'"));
  await p.click("[data-testid=bhk-3]");
  await p.click("[data-testid=members-inc]");
  await p.click("[data-testid=wfh-inc]");
  await p.click("[data-testid=wfh-inc]");
  await p.click("[data-testid=wfh-inc]");
  check("setup: steppers work", (await p.text("[data-testid=members]")) === "4" && (await p.text("[data-testid=wfh]")) === "3");
  await shot(p, "10-setup-home");
  await p.click("[data-testid=setup-next]");
  await p.waitFor("document.querySelector('[data-testid=step-appliances]')", 3000);
  check("setup: 10 appliances with icons", (await p.count("[data-testid^=appl-]")) === 10 && (await p.count("[data-testid=step-appliances] .appliance-icon")) === 10);
  // Add 2 ACs at 8 h, 22 C
  await p.click("[data-testid=count-ac-inc]");
  await p.click("[data-testid=count-ac-inc]");
  await setRange(p, "[data-testid=hours-ac]", 8);
  for (let i = 0; i < 2; i++) await p.click("[data-testid=ac-temp-dec]");
  check("setup: AC count/hours/temp", (await p.text("[data-testid=count-ac]")) === "2" && (await p.text("[data-testid=ac-temp]")) === "22");
  await p.click("[data-testid=count-geyser-inc]");
  await setRange(p, "[data-testid=hours-geyser]", 1);
  await p.click("[data-testid=count-tv-inc]");
  await setRange(p, "[data-testid=hours-tv]", 5);
  await p.click("[data-testid=count-washer-inc]");
  await p.click("[data-testid=count-iron-inc]");
  await setRange(p, "[data-testid=hours-fans]", 12);
  await p.click("[data-testid=count-ev-inc]");
  await shot(p, "11-setup-appliances", true);
  await p.click("[data-testid=setup-next]");
  await p.waitFor("document.querySelector('[data-testid=step-review]')", 3000);
  check("setup: review lists appliances", (await p.text("[data-testid=step-review]"))?.includes("Air conditioner"));
  await shot(p, "12-setup-review");
  await p.click("[data-testid=setup-save]");
  await p.waitFor("location.pathname === '/predict'", 5000);
  const s = await state(p);
  check("setup: saved to localStorage", s.household.name === "Test Home" && s.household.appliances.ac.count === 2 && s.household.appliances.ac.hours === 8 && s.household.bhk === 3 && s.household.climate === "hot");

  // Prediction
  await p.waitFor("document.querySelector('[data-testid=predicted-bill]')", 8000);
  const bill = num(await p.text("[data-testid=predicted-bill]"));
  const units = num(await p.text("[data-testid=predicted-units]"));
  check("predict: bill + units shown", bill > 1000 && units > 200, `₹${bill}, ${units} units`);
  check("predict: likely range", /₹[\d,]+ – ₹[\d,]+/.test(await p.text("[data-testid=bill-range]")));
  check("predict: slab breakdown adds up", (await p.count("[data-testid=slab-line]")) >= 3 && num(await p.text("[data-testid=slab-total]")) === bill);
  check("predict: no-history hint", (await p.text("main"))?.includes("Add past bills"));
  await shot(p, "13-predict", true);

  // Appliance breakdown
  await p.goto(`${BASE}/appliances`);
  await p.waitFor("document.querySelectorAll('[data-testid=top3-item]').length === 3", 8000);
  check("appliances: top 3 power eaters, AC first", (await p.text("[data-testid=top3-item]"))?.includes("Air conditioner"));
  check("appliances: pie + bar charts", (await p.count("[data-testid=breakdown-pie] svg")) >= 1 && (await p.count("[data-testid=breakdown-bars] .recharts-bar-rectangle")) >= 8);
  await p.click("[data-testid=metric-cost]");
  await p.click("[data-testid=period-year]");
  check("appliances: cost / 12-month toggles", (await p.eval("document.querySelector('[data-testid=metric-cost]').getAttribute('aria-selected')")) === "true");
  await shot(p, "14-appliances", true);

  // Tips + goal + celebration
  await p.goto(`${BASE}/tips`);
  await p.waitFor("document.querySelectorAll('[data-testid=tip]').length >= 4", 8000);
  const tipText = await p.text("main");
  check("tips: AC 26°C tip with ₹ saving", /Set the AC to 26°C instead of 22°C/.test(tipText) && /Save ₹[\d,]+\/month/.test(tipText));
  check("tips: geyser 15 min tip", tipText.includes("Use the geyser 15 minutes less"));
  const savings = await p.eval("[...document.querySelectorAll('[data-testid=tip-saving]')].map(e => Number(e.innerText.replace(/[^\\d]/g, '')))");
  check("tips: sorted by saving", savings.every((v, i) => i === 0 || savings[i - 1] >= v), savings.join(","));
  await p.fill("[data-testid=goal-input]", "300");
  await p.click("[data-testid=pick-acTemp]");
  await p.waitFor("document.querySelector('[data-testid=goal-dialog]')", 3000).catch(() => {});
  check("tips: celebration when goal reached", (await p.count("[data-testid=goal-dialog] [data-testid=celebration]")) === 1);
  await sleep(700);
  await shot(p, "15-goal-celebration");
  await p.click("[data-testid=goal-close]");
  check("tips: goal-reached note + saved", (await p.count("[data-testid=goal-reached]")) === 1 && (await state(p)).settings.picked.includes("acTemp"));

  // What-if
  await p.goto(`${BASE}/what-if`);
  await p.waitFor("document.querySelector('[data-testid=wi-ac]')", 6000);
  const before = num(await p.text("[data-testid=wi-before]"));
  await setRange(p, "[data-testid=wi-ac]", 6);
  await sleep(100);
  const after = num(await p.text("[data-testid=wi-after]"));
  check("what-if: AC 8h -> 6h lowers bill instantly", after < before, `₹${before} -> ₹${after}`);
  check("what-if: shows saving", (await p.text("[data-testid=wi-saving]"))?.includes("You save"));
  await p.waitFor("document.querySelector('[data-testid=wi-server]')", 6000).catch(() => {});
  check("what-if: API agrees with instant result", Number(await p.eval("document.querySelector('[data-testid=wi-server]')?.dataset.cost")) === after);
  await setRange(p, "[data-testid=wi-ac-temp]", 26);
  check("what-if: AC temp slider", num(await p.text("[data-testid=wi-after]")) < after);
  await notFrozen(p, "what-if");
  await shot(p, "16-what-if", true);
  await p.click("[data-testid=wi-apply]");
  check("what-if: save to home", (await state(p)).household.appliances.ac.hours === 6);

  // History: manual + CSV
  await p.goto(`${BASE}/history`);
  await p.waitFor("document.querySelector('[data-testid=add-bill]')", 6000);
  check("history: empty state", (await p.count("[data-testid=empty-state]")) === 1);
  await p.click("[data-testid=bill-add]");
  check("history: validation", (await p.count("[data-testid=add-bill] [role=alert]")) === 2);
  await p.fill("[data-testid=bill-month]", "2026-08");
  await p.fill("[data-testid=bill-units]", "640");
  await p.fill("[data-testid=bill-amount]", "3900");
  await p.click("[data-testid=bill-add]");
  await p.waitFor("document.querySelectorAll('[data-testid=bill-row]').length === 1", 3000);
  check("history: manual bill added", (await state(p)).bills.some((b) => b.month === "2026-08" && b.units === 640 && b.amount === 3900));
  const csv = "Month,Units,Amount\n2025-10,520,3050\n2025-11,470,2700\nDec 2025,450,\n2026-01,440,2510\n2026/2,430,2440\n03/2026,560,3360\n2026-04,610,3720\n2026-05,690,4320\n2026-06,640,3900\n2026-07,600,3600\nbad row,xx,1\n";
  await uploadText(p, "[data-testid=csv-input]", csv, "bills.csv");
  await p.waitFor("document.querySelector('[data-testid=csv-msg]')", 4000);
  check("history: CSV import", (await p.eval("document.querySelector('[data-testid=csv-msg]').dataset.tone")) === "ok" && (await p.text("[data-testid=csv-msg]"))?.includes("10 bills imported") && (await p.text("[data-testid=csv-msg]"))?.includes("1 rows skipped"), await p.text("[data-testid=csv-msg]"));
  await uploadText(p, "[data-testid=csv-input]", "nothing,here\nfoo,bar\n", "bad.csv");
  await sleep(300);
  check("history: bad CSV rejected", (await p.eval("document.querySelector('[data-testid=csv-msg]').dataset.tone")) === "err");
  await p.waitFor("document.querySelectorAll('[data-testid=history-chart] .recharts-bar-rectangle').length >= 10", 8000);
  check("history: 12-month trend + actual vs predicted", (await p.count("[data-testid=bill-row]")) === 11 && (await p.count("[data-testid=history-chart] .recharts-line")) === 1);
  check("history: average gap shown", /Average gap: \d+/.test((await p.text("[data-testid=history-gap]")) ?? ""));
  await shot(p, "17-history", true);
  await p.eval("document.querySelectorAll('[data-testid=bill-delete]')[0].click()");
  await sleep(200);
  check("history: delete bill", (await p.count("[data-testid=bill-row]")) === 10);
  // Prediction is now personalised
  await p.goto(`${BASE}/predict`);
  await p.waitFor("document.querySelector('[data-testid=personal-note]')", 8000);
  check("predict: personalised with past bills", (await p.text("[data-testid=personal-note]"))?.includes("past bills"));
  check("predict: compared with past bills", (await p.count("[data-testid=delta]")) >= 1 && (await p.count("[data-testid=history-chart] .recharts-bar-rectangle")) >= 10);

  // Forecast
  await p.goto(`${BASE}/forecast`);
  await p.waitFor("document.querySelectorAll('[data-testid=fc-month]').length === 12", 8000);
  check("forecast: 12 months, 3 expensive highlighted", (await p.count("[data-testid=fc-month][data-expensive=true]")) === 3);
  check("forecast: seasons + festival months", (await p.text("[data-testid=fc-months]"))?.includes("Summer") && (await p.text("[data-testid=fc-months]"))?.includes("Festival month"));
  check("forecast: chart", (await p.count("[data-testid=forecast-chart] .recharts-bar-rectangle")) === 12);
  await p.click("[data-testid=fc-metric-units]");
  check("forecast: units view with range band", (await p.count("[data-testid=forecast-chart] .recharts-area")) === 1);
  await shot(p, "18-forecast", true);

  // Solar
  await p.goto(`${BASE}/solar`);
  await p.waitFor("document.querySelector('[data-testid=solar-saving]')", 8000);
  const sav1 = num(await p.text("[data-testid=solar-saving]"));
  check("solar: saving + payback", sav1 > 0 && /\d+(\.\d)? years/.test(await p.text("[data-testid=solar-payback]")), `₹${sav1}/mo, ${await p.text("[data-testid=solar-payback]")}`);
  check("solar: sample assumptions labelled", (await p.count("[data-testid=solar-assumptions] li")) === 5);
  await setRange(p, "[data-testid=solar-slider]", 1);
  await p.waitFor(`Number(document.querySelector('[data-testid=solar-saving]').innerText.replace(/[^\\d]/g,'')) < ${sav1}`, 5000).catch(() => {});
  check("solar: smaller system saves less", num(await p.text("[data-testid=solar-saving]")) < sav1);
  await shot(p, "19-solar", true);

  // Tariff
  await p.goto(`${BASE}/tariff`);
  await p.waitFor("document.querySelector('[data-testid=slabs]')", 5000);
  check("tariff: sample label", (await p.text("[data-testid=tariff-sample-note]"))?.includes("sample rates"));
  await p.fill("[data-testid=slab-upto-1]", "50");
  await p.click("[data-testid=tariff-save]");
  check("tariff: rejects non-increasing slabs", (await p.count("[role=alert]")) === 1);
  await p.fill("[data-testid=slab-upto-1]", "200");
  await p.fill("[data-testid=slab-rate-0]", "2.5");
  await p.click("[data-testid=billing-bimonthly]");
  await p.click("[data-testid=tariff-save]");
  const t = (await state(p)).tariff;
  check("tariff: edited + bi-monthly saved", t.slabs[0].rate === 2.5 && t.billing === "bimonthly");
  await p.goto(`${BASE}/predict`);
  await p.waitFor("document.querySelector('[data-testid=predicted-bill]')", 8000);
  check("predict: bi-monthly bill period", (await p.text("[data-testid=next-bill-card]"))?.includes("Bill for"));
  await p.goto(`${BASE}/tariff`);
  await p.waitFor("document.querySelector('[data-testid=slabs]')", 5000);
  await p.click("[data-testid=tariff-reset]");
  await p.click("[data-testid=tariff-save]");
  check("tariff: reset to sample", (await state(p)).tariff.billing === "monthly");

  // Reports
  await p.goto(`${BASE}/reports`);
  await p.waitFor("document.querySelector('[data-testid=download-pdf]')", 5000);
  await p.click("[data-testid=download-pdf]");
  const pdfPath = await latestDownload(".pdf");
  const pdf = pdfPath ? readFileSync(pdfPath) : Buffer.alloc(0);
  check("reports: PDF downloaded", pdf.subarray(0, 8).toString() === "%PDF-1.4" && pdf.toString("latin1").includes("Test Home"), `${pdf.length} bytes`);
  await p.click("[data-testid=download-csv]");
  const csvPath = await latestDownload(".csv");
  const csvOut = csvPath ? readFileSync(csvPath, "utf8") : "";
  check("reports: history CSV downloaded", csvOut.includes("month,units_kwh") && csvOut.split("\n").filter((l) => /^\d{4}-\d{2},/.test(l)).length === 10);
  await shot(p, "20-reports");
  noErrors(p, "full flow");
  await p.close();
});

// ------------------------------------------------------------------ every page: desktop / mobile / dark, all languages
let titles = {};
await step("english titles", async () => {
  const p = await freshPage();
  for (const path of PAGES) {
    await p.goto(BASE + path, { wait: 200 });
    await ready(p).catch(() => {});
    titles[path] = await p.eval("document.querySelector('[data-testid=page-title], [data-testid=hero-title]')?.innerText ?? ''");
  }
  await p.close();
});

for (const [i, lang] of LANGS.entries()) {
  await step(`lang ${lang}`, async () => {
    const mobile = i % 2 === 1;
    const dark = i % 3 === 0;
    const p = await freshPage({ lang, mobile, dark, width: mobile ? 390 : 1366, height: mobile ? 844 : 900 });
    let maxOverflow = 0;
    let untranslated = [];
    let missing = [];
    let billText = "";
    for (const path of PAGES) {
      await p.goto(BASE + path, { wait: 150 });
      await ready(p).catch(() => missing.push(path));
      const title = await p.eval("document.querySelector('[data-testid=page-title], [data-testid=hero-title]')?.innerText ?? ''");
      if (lang !== "en" && title && title === titles[path]) untranslated.push(path);
      maxOverflow = Math.max(maxOverflow, await overflow(p));
      if (path === "/predict") {
        await p.waitFor("document.querySelector('[data-testid=predicted-bill]')", 6000).catch(() => {});
        billText = (await p.text("[data-testid=predicted-bill]")) ?? "";
        if (SHOTS) await shot(p, `30-${lang}-predict${mobile ? "-mobile" : ""}${dark ? "-dark" : ""}`);
      }
    }
    const dir = await p.eval("document.documentElement.dir");
    const htmlLang = await p.eval("document.documentElement.lang");
    check(`${lang}: all ${PAGES.length} pages render${mobile ? " (mobile)" : ""}${dark ? " (dark)" : ""}`, missing.length === 0, missing.join(","));
    check(`${lang}: <html lang/dir>`, htmlLang === lang && dir === (RTL.has(lang) ? "rtl" : "ltr"), `${htmlLang}/${dir}`);
    if (lang !== "en") check(`${lang}: page titles translated`, untranslated.length === 0, untranslated.join(","));
    check(`${lang}: tagline translated`, lang === "en" || (await p.text("[data-testid=tagline]")) !== "Know your bill before it arrives.");
    const want = { es: /^2\.?328\s₹$/, fr: /^2 328\s₹$/, ar: /^‏?2,328\s₹$/ }[lang] ?? /^₹2,328$/;
    check(`${lang}: ₹ amount formatted for locale`, want.test(billText.trim()), JSON.stringify(billText));
    check(`${lang}: no horizontal overflow`, maxOverflow <= 1, `${maxOverflow}px`);
    if (dark) check(`${lang}: dark mode applied`, await p.eval("document.documentElement.classList.contains('dark')"));
    await notFrozen(p, lang);
    noErrors(p, lang);
    await p.close();
  });
}

// ------------------------------------------------------------------ language switcher + persistence + mobile menu
await step("language switcher", async () => {
  const p = await freshPage({ mobile: true, width: 390, height: 844 });
  await p.goto(`${BASE}/predict`);
  await ready(p);
  await p.click("[data-testid=lang-button]");
  check("switcher: lists 17 languages", (await p.count("[data-testid=lang-menu] [role=option]")) === 17);
  await p.fill("[data-testid=lang-search]", "urdu");
  check("switcher: search filters", (await p.count("[data-testid=lang-menu] [role=option]")) === 1);
  await p.fill("[data-testid=lang-search]", "zzz");
  check("switcher: no-result message", (await p.text("[data-testid=lang-menu]"))?.includes("No language found"));
  await p.fill("[data-testid=lang-search]", "தமிழ்");
  await p.click("[data-testid=lang-ta]");
  await p.waitFor("document.documentElement.lang === 'ta'", 4000);
  check("switcher: switches language", (await p.text("[data-testid=page-title]")) === "உங்கள் அடுத்த பில்");
  await p.goto(`${BASE}/forecast`);
  await ready(p);
  check("switcher: remembers choice", (await p.eval("localStorage.getItem('powerwise.lang')")) === "ta" && (await p.eval("document.documentElement.lang")) === "ta");
  await p.click("[data-testid=lang-button]");
  await p.click("[data-testid=lang-ar]");
  await p.waitFor("document.documentElement.dir === 'rtl'", 4000);
  check("switcher: RTL for Arabic", (await p.eval("getComputedStyle(document.querySelector('header > div')).direction")) === "rtl");
  await p.click("[data-testid=menu-button]");
  check("mobile menu opens", (await p.count("[data-testid=mobile-menu] a")) === 12);
  await shot(p, "40-mobile-menu-ar");
  await p.click("[data-testid=theme-toggle]");
  check("theme toggle", await p.eval("document.documentElement.classList.contains('dark') && localStorage.getItem('powerwise.theme') === 'dark'"));
  noErrors(p, "switcher");
  await p.close();
});

// ------------------------------------------------------------------ summary
await close();
clearTimeout(watchdog);
const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
if (failed.length) {
  console.log("FAILED:\n" + failed.map((f) => ` - ${f.name} ${f.detail}`).join("\n"));
  process.exit(1);
}
process.exit(0);
