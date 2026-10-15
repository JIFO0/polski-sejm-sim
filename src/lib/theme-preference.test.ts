import assert from "node:assert/strict";
import { runInNewContext } from "node:vm";
import { THEME_BOOT, THEME_KEY, prefersDarkTheme } from "./theme-preference";

assert.equal(prefersDarkTheme(null), false);
assert.equal(prefersDarkTheme("light"), false);
assert.equal(prefersDarkTheme("dark"), true);
for (const [stored, expected] of [
  [{ "sejmsim.theme": "dark" }, false],
  [{ [THEME_KEY]: "dark" }, true],
  [{ [THEME_KEY]: "light" }, false],
] as const) {
  let dark = true;
  const style = { colorScheme: "dark" };
  runInNewContext(THEME_BOOT, {
    localStorage: { getItem: (key: string) => (stored as Record<string, string>)[key] ?? null },
    document: { documentElement: { classList: { toggle: (_: string, value: boolean) => { dark = value; } }, style } },
  });
  assert.equal(dark, expected);
  assert.equal(style.colorScheme, expected ? "dark" : "light");
}
console.log("Light default, legacy reset and explicit theme preference passed");