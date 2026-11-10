#!/usr/bin/env node
// WB-002: generates platform outputs from tokens/tokens.json so web, admin and mobile
// can never drift apart.
//   node scripts/build-tokens.mjs          write the outputs
//   node scripts/build-tokens.mjs --check  fail if any output is out of date (CI)
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const pkg = resolve(here, "..");
const repo = resolve(pkg, "../..");
const tokens = JSON.parse(readFileSync(resolve(pkg, "tokens/tokens.json"), "utf8"));
delete tokens.$comment;

const HEADER = "Generated from packages/ui/tokens/tokens.json by build-tokens.mjs. Do not edit.";
const kebab = (s) => s.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();
const px = (n) => (n === 0 ? "0" : `${n}px`);

// ---------- CSS ----------
function cssVars(colors) {
  return Object.entries(colors).map(([k, v]) => `  --wb-color-${kebab(k)}: ${v};`);
}
function cssScale(group, prefix, unit) {
  return Object.entries(tokens[group]).map(([k, v]) => `  --wb-${prefix}-${kebab(k)}: ${unit(v)};`);
}
const css = [
  `/* ${HEADER} */`,
  ":root {",
  ...cssVars(tokens.color.light),
  ...cssScale("space", "space", px),
  ...cssScale("radius", "radius", px),
  ...cssScale("fontSize", "font-size", (v) => `${v / 16}rem`),
  ...cssScale("fontWeight", "font-weight", String),
  ...cssScale("lineHeight", "line-height", String),
  ...cssScale("size", "size", px),
  "  --wb-font-family: system-ui, -apple-system, \"Segoe UI\", Roboto, sans-serif;",
  "}",
  "",
  ":root[data-theme=\"dark\"] {",
  ...cssVars(tokens.color.dark),
  "}",
  "",
].join("\n");

// ---------- TypeScript ----------
const ts = `// ${HEADER}\nexport const tokens = ${JSON.stringify(tokens, null, 2)} as const;\n\nexport type ColorToken = keyof typeof tokens.color.light;\n`;

// ---------- Dart ----------
const dartColor = (hex) => `Color(0xFF${hex.slice(1).toUpperCase()})`;
const dartIdent = (k) => (/^\d/.test(k) ? `s${k}` : k);
function dartColors(name, colors) {
  const fields = Object.entries(colors)
    .map(([k, v]) => `    ${k}: ${dartColor(v)},`)
    .join("\n");
  return `  static const ${name} = WbColors(\n${fields}\n  );`;
}
function dartConsts(cls, group, type = "double") {
  const body = Object.entries(tokens[group])
    .map(([k, v]) => `  static const ${type} ${dartIdent(k)} = ${type === "int" ? v : Number(v).toFixed(Number.isInteger(v) ? 1 : 2)};`)
    .join("\n");
  return `abstract final class ${cls} {\n${body}\n}`;
}
const colorKeys = Object.keys(tokens.color.light);
const dart = `// ${HEADER}
// ignore_for_file: constant_identifier_names
import 'package:flutter/painting.dart';

class WbColors {
  const WbColors({
${colorKeys.map((k) => `    required this.${k},`).join("\n")}
  });

${colorKeys.map((k) => `  final Color ${k};`).join("\n")}

${dartColors("light", tokens.color.light)}

${dartColors("dark", tokens.color.dark)}
}

${dartConsts("WbSpace", "space")}

${dartConsts("WbRadius", "radius")}

${dartConsts("WbFontSize", "fontSize")}

${dartConsts("WbFontWeight", "fontWeight", "int")}

${dartConsts("WbLineHeight", "lineHeight")}

${dartConsts("WbSize", "size")}

${dartConsts("WbBreakpoint", "breakpoint")}
`;

const outputs = {
  [resolve(pkg, "src/tokens.css")]: css,
  [resolve(pkg, "src/tokens.ts")]: ts,
  [resolve(repo, "apps/mobile/lib/design/tokens.g.dart")]: dart,
};

const check = process.argv.includes("--check");
let stale = [];
for (const [file, content] of Object.entries(outputs)) {
  const current = existsSync(file) ? readFileSync(file, "utf8").replace(/\r\n/g, "\n") : null;
  if (current === content) continue;
  if (check) stale.push(file);
  else writeFileSync(file, content);
}
if (stale.length) {
  console.error("Design tokens are out of date. Run `pnpm --filter @webubble/ui tokens`:\n" + stale.join("\n"));
  process.exit(1);
}
console.log(check ? "Design token outputs are up to date." : "Design token outputs written.");
