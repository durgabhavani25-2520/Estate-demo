# Deployment guide

## Local server

The default server address is `127.0.0.1:8000`, which keeps a local run on the current computer. Python 3.9+ and its standard library are enough.

Use `.env.example` as a starting point for a local `.env`. Set a unique `ADMIN_ACCESS_TOKEN` to enable the private lead desk. Add `OPENAI_API_KEY` only if you want AI search. Never commit `.env`.

After the first sign-in, an administrator can use **Change administrator password** in the team workspace. The new password is stored as a salted hash in SQLite and takes precedence over `ADMIN_ACCESS_TOKEN`; keep the database volume persistent and protected.

## Docker

`docker compose up --build` builds the included container. The Compose service binds inside the container on `0.0.0.0:8000`, maps the port to `localhost:8000`, and stores the SQLite file in a named volume.

For a container host:

1. Build from `Dockerfile` or connect the repository to a Docker-capable service.
2. Set `PORT` as provided by the platform; the server reads this value.
3. Set `ADMIN_ACCESS_TOKEN` to a long, randomly generated secret.
4. Optionally set `OPENAI_API_KEY` and `OPENAI_MODEL`.
5. Mount persistent storage at `/app/instance`; otherwise leads and database changes may be lost when a container is replaced.
6. Put the app behind HTTPS and set a custom domain at the host.

## Render

The root `render.yaml` defines a free Docker web service for the `estate` branch and generates a private admin token. It has no persistent disk: the local SQLite database, leads, and admin changes can be lost whenever the service sleeps, restarts, or redeploys. Render Free services also spin down after 15 minutes without traffic, so the first request after idle may take about a minute. Use this setup for demos only, not for real enquiries or production data.

1. In Render, create a **Blueprint** from this GitHub repository and choose the `estate` branch.
2. After the first successful deploy, copy the service's public `onrender.com` URL.
3. Add that URL as the destination for `/api/*` in `netlify.toml`, then push the change. Netlify can then proxy API calls to the Python backend.

## Netlify static preview

The included `netlify.toml` publishes the `static/` directory and proxies `/api/*` requests to the Render service. With both deployments live, the Netlify frontend can use the Python API. The free Render service has no persistent disk, so local SQLite data may reset when it sleeps, restarts, or redeploys; use a paid backend with persistent storage before collecting real enquiries.

## Production work still required

- SQLite is appropriate for a small single-container MVP. Use PostgreSQL for multiple instances, higher concurrency, managed backups, and operations that need a durable shared database.
- The current Agent Desk uses one shared bearer token. Replace it with per-person identity, role-based access, password or passkey security, audit records, and revocation before a real team uses live leads.
- Add email/WhatsApp notifications through a provider the business controls. This source package stores leads in the database and exposes a protected Agent Desk and CSV export; it does not send messages.
- Add a production image-storage service, upload validation, backups, spam controls, and property verification workflow.
- Review consent text, retention/deletion procedures, privacy notice, terms, and applicable state requirements before accepting real customer data or listing real properties.
- `static/robots.txt` currently blocks crawlers because the supplied inventory is fictional. Update it after replacing the demo data.

## Platform meaning

The web UI adapts to desktop, tablet, and mobile sizes and is installable as a progressive web app. The backend is packaged as a standard Docker image, so it can run on compatible container hosts. This is not a separate native iOS or Android app, and it has not been deployed to a public domain.
