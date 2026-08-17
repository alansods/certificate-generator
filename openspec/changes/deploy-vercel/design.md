## Context

`chore/deploy-render-neon` (3.2, merged) put the backend on Render. This change is the frontend half — but unlike the backend, Angular has no built-in mechanism for reading a real environment variable at build time. `fileReplacements` in `angular.json` swaps one *committed source file* for another based on the build *configuration* (`production` vs `development`), decided when `angular.json` is written, not when the build actually runs. Vercel's environment variables aren't visible to that mechanism at all.

## A prebuild script, not fileReplacements

`frontend/scripts/write-environment.mjs` runs immediately before `ng build` (wired into `package.json`'s `build` script) and overwrites `src/environments/environment.ts` with `apiBaseUrl` set to `process.env.API_BASE_URL ?? ""`. This is the standard pattern for injecting a real runtime-unknown value into an Angular production build without adding a config-time build variant for every possible backend URL. Locally and in CI, `API_BASE_URL` is never set, so the script writes exactly what's committed today (`apiBaseUrl: ""`) — no behavior change for anyone who isn't Vercel. On Vercel, the project's `API_BASE_URL` environment variable (set by the owner, pointing at the deployed Render service) flows through automatically, since Vercel injects its configured environment variables into the build process's environment before running the build command.

`environment.development.ts` (used for `ng serve`/local dev via the existing `fileReplacements`) is untouched by this script — it keeps its hardcoded `http://localhost:8080`, which was never meant to vary.

## vercel.json

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist/frontend/browser",
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

`outputDirectory` is explicit rather than relying on Vercel's Angular zero-config detection: Angular 22's new application builder outputs to `dist/<project>/browser` (confirmed by an actual local build — `dist/frontend/browser/index.html`), not the `dist/<project>` path older Angular versions used, which is what older auto-detection logic expects. The `rewrites` entry is the standard Vercel SPA fallback — without it, a hard refresh or a shared deep link to `/certificates` (server-side, Vercel has no route for that path) 404s instead of serving `index.html` and letting Angular's client-side router take over.

## No secrets in this change

`API_BASE_URL` is a plain URL (Render's public HTTPS endpoint), not a credential — safe to reference by name in `docs/deployment.md` without the `sync: false`-style treatment `render.yaml`'s secrets needed. Nothing in this change touches or needs the backend's `JWT_SECRET`, database credentials, or admin bootstrap variables.

## What docs/deployment.md's new section covers

Creating the Vercel project (import from GitHub), setting `API_BASE_URL` to the Render service's `https://*.onrender.com` URL, and a reminder to come back to Render afterward and set `APP_CORS_ALLOWED_ORIGINS`/`APP_FRONTEND_BASE_URL` to the resulting `https://*.vercel.app` URL — the existing "coming back" section in `docs/deployment.md` (from 3.2) already describes that half; this change only adds the Vercel-side steps that produce the URL it refers to.
