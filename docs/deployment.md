# Deployment

Manual steps to put the backend live on Render (backed by Neon Postgres) and the frontend live on Vercel. Nothing here is automated — no agent or CI job can create accounts, enter credentials, or configure a third-party dashboard. Follow this once, by hand, when you're ready to deploy.

## 1. Neon (database)

1. Create a free account/project at [neon.tech](https://neon.tech) if you don't have one.
2. Create a database (any name, e.g. `certificate_generator`).
3. From the project's connection details, copy the **pooled** connection string (Neon shows both a direct and a pooled one — use the pooled one; it's the one meant for an application server, not a migration tool run from a laptop).
4. Split that connection string into the three pieces Render needs separately (see the table below): host+port+db (`SPRING_DATASOURCE_URL`, as a JDBC URL — `jdbc:postgresql://<host>/<db>?sslmode=require`), the username, and the password. Neon's connection string is usually `postgresql://<user>:<password>@<host>/<db>?sslmode=require` — reassemble accordingly.
5. Nothing else to configure — the schema is created by Flyway automatically the first time the backend starts (see `backend/src/main/resources/db/migration/`).

## 2. Generate a JWT secret

Run locally, once:

```bash
openssl rand -base64 32
```

Save the output somewhere safe (a password manager, not this repo) — this is `JWT_SECRET` below. Losing it invalidates every issued access token; rotating it deliberately does the same, which is fine (it just forces every logged-in session to re-authenticate).

## 3. Render (backend)

1. Create a free account at [render.com](https://render.com) if you don't have one, and connect it to this GitHub repository.
2. Either:
   - **Blueprint (recommended):** in the Render dashboard, "New" → "Blueprint", point it at this repo — it reads `backend/render.yaml` and creates the service with the right build (Docker, `backend/Dockerfile`), plan (free), and health check path (`/actuator/health`) already set.
   - **Manual:** create a new Web Service, runtime "Docker", root directory `backend`, Dockerfile path `./Dockerfile`, plan "Free", health check path `/actuator/health`.
3. Whichever route you took, the service will list a set of required environment variables with no value yet (declared as `sync: false` in `render.yaml` — Render prompts for each on the dashboard rather than shipping a default). Fill them in from the table below.
4. Deploy. First boot on the free plan can take a minute or two (cold image pull); watch the Render logs — a successful boot ends with `Started CertificateGeneratorApplication`, and Flyway's migration log lines appear just before that.

### Environment variables

| Variable | Value | Source |
|---|---|---|
| `SPRING_DATASOURCE_URL` | `jdbc:postgresql://<neon-host>/<db>?sslmode=require` | Neon connection string (step 1) |
| `SPRING_DATASOURCE_USERNAME` | Neon database user | Neon connection string (step 1) |
| `SPRING_DATASOURCE_PASSWORD` | Neon database password | Neon connection string (step 1) |
| `JWT_SECRET` | random 256-bit value | `openssl rand -base64 32` (step 2) |
| `APP_CORS_ALLOWED_ORIGINS` | the deployed frontend's origin, e.g. `https://certificate-generator.vercel.app` | leave empty until `chore/deploy-vercel` (3.3) gives you the real Vercel URL |
| `APP_FRONTEND_BASE_URL` | same origin as above | leave empty until 3.3 — the PDF's embedded QR code points here |
| `ADMIN_BOOTSTRAP_EMAIL` | the first admin's email | optional; the bootstrap runner no-ops once any user exists, so it's safe to leave set permanently |
| `ADMIN_BOOTSTRAP_PASSWORD` | the first admin's password | optional, same as above |
| `APP_MAIL_PROVIDER` | `smtp` | required in production — no default; the backend refuses to start in the `prod` profile until this is set to `smtp` (see "Password reset email" below) |
| `APP_MAIL_FROM` | the address resets appear to come from, e.g. `no-reply@yourdomain.com` | required in production; your SMTP provider's dashboard |
| `APP_MAIL_HOST` | e.g. `smtp.sendgrid.net` | required in production; your SMTP provider |
| `APP_MAIL_PORT` | e.g. `587` | required in production; your SMTP provider |
| `APP_MAIL_USERNAME` | your SMTP provider's username (often `apikey` for API-key-based providers) | required in production; your SMTP provider |
| `APP_MAIL_PASSWORD` | your SMTP provider's password or API key | required in production; your SMTP provider |

`SPRING_PROFILES_ACTIVE=prod` and `JAVA_TOOL_OPTIONS` are already set by `render.yaml` — nothing to fill in for those.

### Password reset email

Password reset (`POST /auth/forgot-password`) sends its link through whichever `MailSender` is active. Unlike `dev` and tests, the `prod` profile has no default for `APP_MAIL_PROVIDER` — the backend will not start until it is set to `smtp` and all four SMTP-specific `APP_MAIL_*` variables above are also set. This is deliberate: an app that silently fell back to logging live, unexpired password-reset tokens instead of emailing them would be worse than one that refuses to start. Pick a provider (SendGrid, Mailgun, Postmark, or your own SMTP server all work — anything that speaks SMTP) before this deploys to production; startup fails immediately with a clear error naming exactly which property is missing.

## 4. Verify

Once deployed, `GET https://<your-service>.onrender.com/actuator/health` should return `{"status":"UP"}`. That's the same endpoint Render's own health check polls.

## 5. Vercel (frontend)

1. Create a free account at [vercel.com](https://vercel.com) if you don't have one, and "Add New… → Project", importing this GitHub repository.
2. Set the project's **Root Directory** to `frontend` — this is a monorepo, and Vercel needs to know the Angular workspace doesn't live at the repo root.
3. Vercel auto-detects `frontend/vercel.json` for the build command and output directory; nothing else to configure there.
4. Add one environment variable on the Vercel project (Settings → Environment Variables): `API_BASE_URL` = the Render backend's public URL from step 3 above (e.g. `https://certificate-generator-backend.onrender.com`, no trailing slash). `frontend/scripts/write-environment.mjs` reads this at build time and bakes it into the production build — see that file's header comment for how.
5. Deploy. Vercel gives you a `https://<project>.vercel.app` URL (or a custom domain if you set one up).

## 6. Coming back to update CORS after the frontend is deployed

Once step 5 gives you a real frontend URL, come back to the Render dashboard and set `APP_CORS_ALLOWED_ORIGINS`/`APP_FRONTEND_BASE_URL` to it, then trigger a redeploy (Render redeploys automatically on an environment variable change).
