// Default/production environment. Swapped in for the development build configuration via
// angular.json's fileReplacements. This committed version (apiBaseUrl: "") is what every
// local build and CI run sees; scripts/write-environment.mjs overwrites this file with the
// real production API base URL immediately before ng build runs (see package.json's "build"
// script) when the API_BASE_URL environment variable is set — the case on Vercel, never
// locally or in CI.
export const environment = {
  production: true,
  apiBaseUrl: "",
};
