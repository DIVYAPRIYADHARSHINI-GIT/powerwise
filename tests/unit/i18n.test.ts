// Every language file has exactly the English keys and the same {placeholders}.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync } from "node:fs";
import en from "../../src/i18n/messages/en.ts";
import { LOCALES } from "../../src/i18n/config.ts";

const dir = new URL("../../src/i18n/messages/", import.meta.url);
const ph = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(",");

test("one message file per registered language", () => {
  const files = readdirSync(dir).filter((f) => f.endsWith(".ts")).map((f) => f.replace(/\.ts$/, "")).sort();
  assert.deepEqual(files, LOCALES.map((l) => l.code).sort());
  assert.equal(LOCALES.length, 17);
  assert.deepEqual(LOCALES.filter((l) => l.dir === "rtl").map((l) => l.code).sort(), ["ar", "ur"]);
});

for (const l of LOCALES.filter((x) => x.code !== "en")) {
  test(`${l.code}: same keys and placeholders as English`, async () => {
    const m = (await import(new URL(`${l.code}.ts`, dir).href)).default as Record<string, string>;
    assert.deepEqual(Object.keys(m).sort(), Object.keys(en).sort());
    for (const [k, v] of Object.entries(en)) {
      assert.ok(typeof m[k] === "string" && m[k].trim().length > 0, `${l.code}.${k} empty`);
      assert.equal(ph(m[k]), ph(v), `${l.code}.${k} placeholders`);
    }
  });
}
