# EstateBridge

A polished, responsive property marketplace MVP for the India / INR market. It includes sample homes, resale listings, rentals, land, natural-language property search, enquiry capture, a protected lead desk, and an installable progressive web app.

> **Demo warning:** all properties, prices, agent names, and images are examples. The site is not connected to live property inventory and does not verify title, ownership, project approvals, RERA details, price, or availability.

## What you can do

- Browse sample listings in Bengaluru, Hyderabad, Mumbai, Pune, and Chennai.
- Start searches in Hyderabad with Buy, Rent, New launch, Commercial, Plots / land, or Projects intent; browse project-linked homes and neighbourhoods from the landing page.
- Filter by city, locality or project name, property type, sale/resale/rent, budget, bedrooms, and sort order.
- Use the home-loan EMI calculator to estimate repayments from a principal, interest rate, and term. It is an estimate, not a lender quote.
- Search in plain language, for example: “2 BHK in Whitefield under ₹1.5 Cr”. It uses a local keyword parser by default, and optional AI filter extraction if an OpenAI key is configured.
- Save favourite properties in your browser and send a buyer enquiry.
- Send a seller / agent listing enquiry for a home, commercial space, or land plot. Seller enquiries go for manual review and never publish automatically.
- Sign in to the team workspace as an administrator or agent. Administrators manage listings, prices, sold/archived status, location highlights, and staff accounts. Agents can review and update enquiries.
- Let customers browse without accounts. Buyer and seller enquiry forms collect mobile and WhatsApp numbers, preferred contact method, and callback availability.
- Contact EstateBridge by phone at +91 93466 68551 or use the WhatsApp chat link, which opens a prefilled message to +91 93466 68551.
- Offer customers a separate phone-first login/register screen while keeping Team login staff-only. Customer OTP login is provider-ready but disabled until an SMS provider is integrated; this build does not send codes or create customer sessions.
- Use the responsive site on desktop, tablet, and mobile, or install it as a PWA.

The AI only extracts structured search filters. Property results still come from the site's listing database; AI cannot invent a listing. Buyer and seller contact details are never sent to the AI provider.

## Technology choices

The app uses semantic HTML, plain CSS, and browser JavaScript for the responsive marketplace UI; a Python standard-library HTTP server provides the JSON API and SQLite persists listings, enquiries, and team access. There is no frontend framework or package-install step. This keeps the demo straightforward to run and deploy; a larger live marketplace would typically add managed PostgreSQL, authenticated image storage, a production identity provider, and monitoring as traffic and operational needs grow.

## Run locally

Requires Python 3.9 or newer. The server uses only the Python standard library; no package install is required.

### Windows PowerShell

```powershell
py -3 server.py
```

Open the URL printed by the server (normally [http://127.0.0.1:8000](http://127.0.0.1:8000)). If that port is already in use, the server selects and prints another available port. Stop the server with Ctrl+C. The first run creates a local SQLite database and seeds the fictional demo listings.

### macOS or Linux

```bash
python3 server.py
```

Then open [http://127.0.0.1:8000](http://127.0.0.1:8000).

## Team login and roles

Copy `.env.example` to `.env`, set a private `ADMIN_ACCESS_TOKEN` of at least 12 characters, then restart the server. The default administrator username is `admin`; set `ADMIN_USERNAME` if you want a different one. The admin password is read from `ADMIN_ACCESS_TOKEN`. Keep `.env` private; `.gitignore` excludes it.

PowerShell alternative for the current terminal session:

```powershell
$env:ADMIN_USERNAME = "admin"
$env:ADMIN_ACCESS_TOKEN = "replace-with-a-long-unique-password"
py -3 server.py
```

Click **Team login** on the website. Administrators can add agents from the Team access tab; agents can manage enquiry stages but cannot change property inventory or team accounts. Administrators can change their password from **Change administrator password** in the team workspace; the new password is salted and hashed in SQLite, and all admin sessions are revoked so the admin must sign in again. Keep the database persistent and backed up. Staff sign-in sessions expire after 12 hours. Customers do not need accounts and provide contact preferences only when sending an enquiry. Do not use sample credentials on a public server; use HTTPS and a production authentication provider before launch.

## Optional AI search

Keyword search works without AI. To enable structured AI extraction, add your OpenAI API key to the server's environment (or `.env`) and optionally set `OPENAI_MODEL`. The server calls the Responses API using Structured Outputs for a fixed filter schema. The secret is never sent to the browser. Search text is sent to OpenAI only when AI search is enabled; form contact data is not.

See the [official OpenAI API docs](https://developers.openai.com/api/docs) for API access and keys. Model access and billing depend on the account.

## Run in Docker

1. Copy `.env.example` to `.env` and set the admin token.
2. From the project folder, run:

```bash
docker compose up --build
```

3. Open [http://localhost:8000](http://localhost:8000).

The Compose file keeps SQLite data in a named volume. To deploy on a container host, build from the included `Dockerfile`, expose the platform's `PORT`, and mount persistent storage at `/app/instance`. For multi-instance or high-volume operation, replace SQLite with managed PostgreSQL and add a production authentication provider.

## Project files

```text
EstateBridge/
  server.py                  Web server, listing search, SQLite, lead API, optional AI search
  data/listings.json         Fictional demo inventory
  static/index.html          Marketplace UI, enquiry forms, Agent Desk
  static/styles.css          Responsive visual system
  static/app.js              Search, filters, favourites, forms, leads, PWA setup
  static/manifest.webmanifest Installable app metadata
  static/service-worker.js   Offline shell cache (API remains online-only)
  docs/DEPLOYMENT.md         Local and container deployment guide
  docs/AI-AND-TRUST.md       AI, privacy, listing review, and safety boundaries
  docs/REFERENCES.md         Product and official source references
  Dockerfile                 Container build
  compose.yaml               Local container setup with persistent data
```

## Before public launch

- Replace every sample listing and photo with authorized, current inventory.
- Add state-specific RERA project/agent fields and verify requirements for each operating state; the Act and state guidance can apply to listing and brokerage activity.
- Configure public domain, HTTPS, privacy notice, terms, lead retention and deletion, contact details, and consent language with qualified advice.
- Use a managed database, authenticated staff accounts, backups, monitoring, email/SMS notifications, and rate limits appropriate to expected traffic.
- Re-enable search indexing only after all sample inventory is removed and live listings are reviewed.
- Add a secure image upload service and property-document workflow; this MVP accepts photo links in seller enquiries but does not publish them.

This is a working MVP source package, not a live hosted portal. A hosting account, domain, production inventory, and business/RERA/privacy setup are needed to launch it publicly.
