import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * The token layer has no component to render, so it is asserted against its own source instead.
 * The failure this guards against is silent: Tailwind drops `@theme` variables no utility
 * references, so a token only ever read through `var()` in a component template resolves to
 * nothing without any build error. `@theme static` is what prevents that, and nothing else in
 * the build would notice if it were removed.
 */
const stylesDir = join(import.meta.dirname, ".");
const tailwindLayer = readFileSync(join(stylesDir, "styles.css"), "utf8");

const declaredTokens = new Set(
  [...tailwindLayer.matchAll(/^\s*(--[a-z0-9-]+):/gm)].map((match) => match[1]),
);

describe("Nocturne token layer", () => {
  it("declares its theme block as static so no token is tree-shaken", () => {
    expect(tailwindLayer).toContain("@theme static");
  });

  it("keeps a visible keyboard focus ring", () => {
    // One mechanism now that Material is gone: every control in the app is plain markup, so the
    // base layer's `:focus-visible` outline is the only thing standing between the keyboard and
    // an invisible focus. It was defeated twice during the migration — once by Material's
    // unlayered reset, once by an `outline-none` utility — so it is asserted rather than assumed.
    expect(tailwindLayer).toMatch(/:focus-visible\s*{[^}]*outline:[^}]*var\(--color-accent-500\)/);
  });

  it("renders the application on a dark scheme over the Nocturne ground", () => {
    expect(tailwindLayer).toMatch(/html\s*{[^}]*color-scheme:\s*dark/);
    expect(tailwindLayer).toMatch(/body\s*{[^}]*background-color:\s*var\(--color-bg\)/);
    expect(tailwindLayer).toMatch(/body\s*{[^}]*color:\s*var\(--color-text\)/);
  });

  it("keeps the type scale complete for headings the preflight would otherwise flatten", () => {
    for (const step of ["--text-overline", "--text-xs", "--text-sm", "--text-base", "--text-md", "--text-lg", "--text-xl", "--text-display"]) {
      expect(declaredTokens).toContain(step);
    }
    for (const heading of ["h1", "h2", "h3", "h4"]) {
      expect(tailwindLayer).toMatch(new RegExp(`${heading}\\s*{[^}]*font-size:\\s*var\\(--text-`));
    }
  });
});
