#!/usr/bin/env node
// Regenerates src/environments/environment.ts from the API_BASE_URL environment variable.
// See the `header` comment below (written into that file) for why this script exists.
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const apiBaseUrl = process.env.API_BASE_URL ?? "";

const outputPath = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "src/environments/environment.ts",
);

const header = [
  "// Default/production environment. Swapped in for the development build configuration via",
  "// angular.json's fileReplacements. This committed version (apiBaseUrl: \"\") is what every",
  "// local build and CI run sees; scripts/write-environment.mjs overwrites this file with the",
  "// real production API base URL immediately before ng build runs (see package.json's \"build\"",
  "// script) when the API_BASE_URL environment variable is set — the case on Vercel, never",
  "// locally or in CI.",
].join("\n");

const contents = `${header}
export const environment = {
  production: true,
  apiBaseUrl: ${JSON.stringify(apiBaseUrl)},
};
`;

writeFileSync(outputPath, contents);
console.log(`Wrote ${outputPath} with apiBaseUrl="${apiBaseUrl}"`);
