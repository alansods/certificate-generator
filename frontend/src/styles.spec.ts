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

  it("maps every Material color role Angular Material defines", () => {
    // Read the role list from Material's own source rather than restating it here: a role this
    // file forgets resolves to the generated violet palette, silently, on whichever component
    // happens to read it.
    const roleSource = readFileSync(
      join(
        import.meta.dirname,
        "../node_modules/@angular/material/core/tokens/m3/_md-sys-color.scss",
      ),
      "utf8",
    );
    const roles = [...new Set([...roleSource.matchAll(/^\s+([a-z0-9-]+):/gm)].map((m) => m[1]))];
    const mapped = new Set(
      [...materialLayer.matchAll(/^\s*--mat-sys-([a-z0-9-]+):/gm)].map((match) => match[1]),
    );

    expect(roles.length).toBeGreaterThan(40);
    expect(roles.filter((role) => !mapped.has(role))).toEqual([]);
  });

  it("resolves every Material color role to a token rather than a literal", () => {
    // The elevation roles are exempt: `level0` is legitimately `none`, and the rest carry a
    // composite shadow that is itself a token.
    const roles = [...materialLayer.matchAll(/^\s*(--mat-sys-[a-z0-9-]+):\s*([^;]+);/gm)].filter(
      ([, role]) => !role.startsWith("--mat-sys-level"),
    );

    expect(roles.length).toBeGreaterThan(0);
    for (const [, role, value] of roles) {
      expect(`${role}: ${value.trim()}`).toMatch(/: var\(--[a-z0-9-]+\)$/);
    }
  });

  it("keeps a visible keyboard focus ring on both kinds of control", () => {
    // Two mechanisms, because Material's component styles are unlayered and beat the base
    // layer's rule: the global `:focus-visible` outline serves the plain markup the rebuilt
    // screens introduce, and Material's strong focus indicators serve its own controls. Losing
    // either leaves a set of controls with no visible focus at all, silently.
    expect(tailwindLayer).toMatch(/:focus-visible\s*{[^}]*outline:[^}]*var\(--color-accent-500\)/);
    expect(materialLayer).toMatch(
      /strong-focus-indicators\s*\(\s*\(\s*border-color:\s*var\(--color-accent-500\)/,
    );
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
