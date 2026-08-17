#!/usr/bin/env node
// Regenerates src/environments/environment.ts from the API_BASE_URL environment variable,
// run immediately before ng build (see package.json's "build" script). Angular's own
// fileReplacements mechanism only swaps between committed files at a build *configuration*
// level, decided when angular.json is written — it has no way to read a real environment
// variable at build time. This script is that missing piece, used to point the production
// build at the deployed Render backend without hardcoding its URL into source control.
//
// Locally and in CI, API_BASE_URL is never set, so this reproduces exactly what's committed
// today (apiBaseUrl: ""): no behavior change for anyone who isn't Vercel.
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
console.log(`Wrote ${outputPath} with apiBaseUrl=${JSON.stringify(apiBaseUrl)}`);
