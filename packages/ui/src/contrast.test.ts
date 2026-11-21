import { describe, expect, it } from "vitest";
import { tokens } from "./tokens";

// WCAG 2.1 relative luminance and contrast ratio.
function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

type Key = keyof typeof tokens.color.light;
// [foreground, background, minimum ratio]. 4.5 = WCAG AA body text (1.4.3);
// 3 = WCAG AA user-interface components and focus indicators (1.4.11).
const pairs: [Key, Key, number][] = [
  ["text", "bg", 4.5],
  ["text", "surface", 4.5],
  ["textMuted", "bg", 4.5],
  ["textMuted", "surface", 4.5],
  ["onPrimary", "primary", 4.5],
  ["onDanger", "danger", 4.5],
  ["primary", "bg", 4.5],
  ["danger", "bg", 4.5],
  ["danger", "surface", 4.5],
  ["success", "bg", 4.5],
  ["border", "bg", 3],
  ["focus", "bg", 3],
];

describe.each(["light", "dark"] as const)("%s theme meets WCAG 2.1 AA contrast", (theme) => {
  const colors = tokens.color[theme];
  it.each(pairs)("%s on %s is at least %s:1", (fg, bg, min) => {
    expect(contrast(colors[fg], colors[bg])).toBeGreaterThanOrEqual(min);
  });
});
