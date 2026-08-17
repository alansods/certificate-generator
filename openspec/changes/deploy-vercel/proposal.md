## Why

Backlog item 3.3 (`docs/PLAN.md`), the last delivery item before the final README (3.4). The frontend builds and passes CI, but has no Vercel configuration, and — more importantly — `environment.ts`'s `apiBaseUrl: ""` currently assumes the frontend and backend share an origin. That's true nowhere in this project's actual topology: the backend deploys to Render (3.2, already merged) and the frontend to Vercel, two different origins. Left as-is, a Vercel-hosted build would silently call itself for every `/api/**` request and fail.

## What Changes

`frontend/vercel.json` (static build, SPA rewrite so client-side routing works on a hard refresh/deep link) and a small build-time script (`frontend/scripts/write-environment.mjs`) that regenerates `environment.ts` from a `API_BASE_URL` environment variable immediately before `ng build` runs — empty/unset (the case for every local build and CI, unchanged) reproduces today's committed `apiBaseUrl: ""`; set on Vercel to the deployed Render backend's URL, it points the production build at the real API. `docs/deployment.md` gains a Vercel section covering the manual steps this change cannot perform: creating the Vercel project, linking the repo, and setting `API_BASE_URL`.

## What This Change Does Not Do

It cannot create a Vercel account, link the repository through Vercel's UI, or enter the production `API_BASE_URL` value — those stay with the owner, same as Neon/Render in 3.2. It also does not update `APP_CORS_ALLOWED_ORIGINS`/`APP_FRONTEND_BASE_URL` on the already-deployed Render service; `docs/deployment.md`'s existing "coming back" section already covers that as a step for after this change's real URL exists.

## Capabilities

_None — infrastructure only, no application behavior changes. `skip_specs: true`._

## Impact

- Adds `frontend/vercel.json`, `frontend/scripts/write-environment.mjs`.
- Modifies `frontend/package.json`'s `build` script to run the new script before `ng build`.
- Extends `docs/deployment.md` with a Vercel section.
- No change to `environment.ts`'s committed default (`apiBaseUrl: ""`) — the script only overwrites it when `API_BASE_URL` is actually set in the environment, which is never true locally or in CI.
