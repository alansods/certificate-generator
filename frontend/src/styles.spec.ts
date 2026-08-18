import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * The token layer has no component to render, so it is asserted as a contract between the two
 * stylesheets instead. The failure this guards against is silent: Tailwind drops `@theme`
 * variables no utility references, and `styles.scss` reads a dozen of them from outside
 * Tailwind's sight, where a dropped variable resolves to nothing and the Material components
 * lose their color without any build error.
 */
const stylesDir = join(import.meta.dirname, ".");
const tailwindLayer = readFileSync(join(stylesDir, "styles.css"), "utf8");
const materialLayer = readFileSync(join(stylesDir, "styles.scss"), "utf8");

const declaredTokens = new Set(
  [...tailwindLayer.matchAll(/^\s*(--[a-z0-9-]+):/gm)].map((match) => match[1]),
);

describe("Nocturne token layer", () => {
  it("declares its theme block as static so no token is tree-shaken", () => {
    expect(tailwindLayer).toContain("@theme static");
  });

  it("declares every token the Material mapping reads", () => {
    const referenced = [...materialLayer.matchAll(/var\((--[a-z0-9-]+)\)/g)].map(
      (match) => match[1],
    );

    expect(referenced.length).toBeGreaterThan(0);
    expect([...new Set(referenced)].filter((token) => !declaredTokens.has(token))).toEqual([]);
  });

  it("resolves every Material color role to a token rather than a literal", () => {
    const roles = [...materialLayer.matchAll(/^\s*(--mat-sys-[a-z0-9-]+):\s*([^;]+);/gm)];

    expect(roles.length).toBeGreaterThan(0);
    for (const [, role, value] of roles) {
      expect(`${role}: ${value.trim()}`).toMatch(/: var\(--[a-z0-9-]+\)$/);
    }
  });

  it("renders the application on a dark scheme over the Nocturne ground", () => {
    expect(tailwindLayer).toMatch(/html\s*{[^}]*color-scheme:\s*dark/);
    expect(tailwindLayer).toMatch(/body\s*{[^}]*background-color:\s*var\(--color-bg\)/);
    expect(tailwindLayer).toMatch(/body\s*{[^}]*color:\s*var\(--color-text\)/);
  });

  it("keeps the type scale complete for headings the preflight would otherwise flatten", () => {
    for (const step of ["--text-overline", "--text-sm", "--text-base", "--text-md", "--text-lg", "--text-xl", "--text-display"]) {
      expect(declaredTokens).toContain(step);
    }
    for (const heading of ["h1", "h2", "h3", "h4"]) {
      expect(tailwindLayer).toMatch(new RegExp(`${heading}\\s*{[^}]*font-size:\\s*var\\(--text-`));
    }
  });
});
