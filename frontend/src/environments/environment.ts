// Default/production environment. Swapped in for the development build configuration via
// angular.json's fileReplacements. The real production API base URL is set by
// chore/deploy-vercel (3.3, not yet done) — empty here means "same origin", matching the
// backend's own not-yet-configured app.frontend-base-url for the same reason.
export const environment = {
  production: true,
  apiBaseUrl: "",
};
