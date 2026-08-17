## 1. Build-time API URL

- [x] 1.1 `frontend/scripts/write-environment.mjs`: writes `src/environments/environment.ts` with `apiBaseUrl` from `process.env.API_BASE_URL` (default `""`, matching today's committed value).
- [x] 1.2 `frontend/package.json`: wire the script into the `build` npm script, ahead of `ng build`.
- [x] 1.3 Verify: running `npm run build` locally with no `API_BASE_URL` set reproduces today's `apiBaseUrl: ""` and the app still builds and (spot-checked) behaves the same; running it with `API_BASE_URL` set writes that value instead.

## 2. Vercel configuration

- [x] 2.1 `frontend/vercel.json`: `buildCommand`, explicit `outputDirectory` (`dist/frontend/browser`, since Angular 22's builder output path differs from what Vercel's zero-config Angular detection expects), and a catch-all SPA `rewrites` entry.

## 3. Documentation

- [x] 3.1 `docs/deployment.md`: add a Vercel section (project creation, linking the repo, setting `API_BASE_URL`) and a reminder to return to Render afterward for `APP_CORS_ALLOWED_ORIGINS`/`APP_FRONTEND_BASE_URL`.

## 4. Verification

- [x] 4.1 `cd frontend && npm run build && npm run lint && npm test` all pass.
- [x] 4.2 `openspec validate deploy-vercel --type change --strict` passes.
