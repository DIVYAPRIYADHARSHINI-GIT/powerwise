// Quick screenshot pass of every page (visual review during development).
//   BASE_URL=http://localhost:3400 node tests/e2e/shots.mjs [lang] [dark] [mobile]
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { launch, sleep } from "./cdp.mjs";

const BASE = (process.env.BASE_URL ?? "http://localhost:3400").replace(/\/$/, "");
const [lang = "en", dark = "light", mobile = "desktop"] = process.argv.slice(2);
const OUT = join(dirname(fileURLToPath(import.meta.url)), "output", "shots", `${lang}-${dark}-${mobile}`);
mkdirSync(OUT, { recursive: true });
const PAGES = (process.env.PAGES ?? "/,/setup,/predict,/appliances,/tips,/what-if,/history,/forecast,/solar,/reports,/tariff,/about").split(",");

const timer = setTimeout(() => {
  console.error("shots watchdog");
  process.exit(2);
}, 120000);
const { newPage, close } = await launch({ port: 9420 + Math.floor(Math.random() * 50) });
const p = await newPage();
const isMobile = mobile === "mobile";
await p.viewport(isMobile ? 390 : 1366, isMobile ? 844 : 900, isMobile);
await p.addInitScript(`try { if (!sessionStorage.getItem('init')) { localStorage.clear(); sessionStorage.setItem('init','1'); localStorage.setItem('powerwise.theme','${dark}'); localStorage.setItem('powerwise.lang','${lang}'); } } catch (e) {}`);
for (const path of PAGES) {
  await p.goto(BASE + path, { wait: 700 });
  await p.waitFor("!document.querySelector('[data-testid=loading]')", 5000).catch(() => {});
  await sleep(300);
  const name = path === "/" ? "home" : path.slice(1).replace(/\//g, "-");
  await p.screenshot(join(OUT, `${name}.png`), { fullPage: process.env.FULL !== "0" });
  const overflow = await p.eval("document.documentElement.scrollWidth - window.innerWidth");
  console.log(`${path}  overflow=${overflow}  errors=${p.errors.length}`);
}
if (p.errors.length) console.log(p.errors.slice(0, 5).join("\n"));
await close();
clearTimeout(timer);
