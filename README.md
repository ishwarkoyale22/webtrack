# WebTrack — Admin Dashboard for a Website-Building Business

A full-stack single-admin console to track **clients, projects, payments and domains** in one place.
One client = one website — everything for a client lives on a single detail page.

![stack](https://img.shields.io/badge/stack-MERN-7c4dff) ![ui](https://img.shields.io/badge/UI-glassmorphism%20%2B%203D-22d3ee)

## Features

- 🗄️ **No database server needed for local dev** — data lives in `backend/data/webtrack.json` (a small file-backed JSON store) and persists across restarts. For production on Vercel (or any serverless host), switch to Supabase (Postgres) by setting the `SUPABASE_*` env vars — see `backend/.env.example`. Every route/model is unchanged either way
- 🔓 **No login screen** — single-admin panel, the dashboard opens directly. The admin profile (used for invoices/settings) is created automatically from the `ADMIN_*` env vars on first run
- 📊 **Dashboard** — stat cards (clients, revenue, pending, active projects), monthly revenue bar chart, pending-vs-received chart, payment-due + deadline + domain-expiry alerts, recent activity
- 👥 **Clients** — add/edit/delete, search, filters (stage / payment status / source / date range), grid & table views, Excel/CSV export
- 📇 **Client Detail (the core page)** — client info, website & project (stage stepper, deadline, priority, notes), payment tracking, before/after screenshot uploads, domain, notes, full activity log, invoice/quotation buttons — all visible & editable on one page
- 💰 **Payments** — total price, GST toggle (+rate), date-wise payment history; **pending amount and Paid/Partial/Pending status are always auto-calculated**
- 🌐 **Domain** — name, price, provider, expiry (expiring domains alert automatically)
- 📄 **Documents** — invoice & quotation PDFs auto-filled from client + payment data, with live preview and download
- 🔔 **Notifications** — payment-due, deadline and domain alerts in the dashboard and the bell menu
- 📈 **Reports** — monthly revenue, client growth, pending vs received, per-client comparison, source split, best-month highlight, month-by-month table, Excel/CSV export
- 📝 **Activity log** — per client, every action (payment added, stage changed, notes updated, document generated…) with date & time
- 🌙 **UI** — dark/light mode, glassmorphism, floating 3D shapes (React Three Fiber), Framer Motion page transitions and micro-animations, fully responsive with a mobile drawer menu

## Tech stack

| Layer    | Tech |
|----------|------|
| Frontend | React 18, Vite, Tailwind CSS, Framer Motion, React Three Fiber, Recharts, jsPDF (+autotable), SheetJS |
| Backend  | Node.js, Express, bcrypt, Multer (screenshot uploads) |
| Database | Local JSON file for dev, Supabase (Postgres) for production (same store API either way) |

## Getting started

### 1. Backend

```bash
cd backend
npm install
```

Edit `backend/.env` (already created from `.env.example`):

```env
PORT=5000
ADMIN_EMAIL=ishwar@gmail.com
ADMIN_PASSWORD=ishwar1234
ADMIN_NAME=Ishwar
```

Seed the admin account + demo data (optional but recommended):

```bash
npm run seed
```

Start the API:

```bash
npm run dev        # or: npm start
```

> **No database setup required.** Everything is stored in `backend/data/webtrack.json`
> and survives restarts. Writes are atomic (temp file + rename), so a crash can't
> truncate your data. To start over, delete that file and re-run `npm run seed`.

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

Open **http://localhost:5173** — it lands straight on the dashboard. There is no login screen.

- The admin profile (shown on invoices and in Settings) comes from the `ADMIN_*` env vars, created automatically on first run.

### Production build

```bash
cd frontend && npm run build
cd ../backend && set NODE_ENV=production && npm start
```

The Express server then serves the built frontend from `frontend/dist` on one port.

### Deploying to Vercel (or any serverless host) — set up Supabase first

Vercel's filesystem is ephemeral and isolated per instance, so the JSON-file
store cannot be trusted there — data can silently vanish between requests.
Before deploying:

1. Create a project at [supabase.com/dashboard](https://supabase.com/dashboard) (free).
2. Open the SQL Editor → paste in `backend/store/supabase.sql` → Run. This creates the 8 tables the app needs.
3. Project Settings → API, then in your Vercel project's Environment Variables, add:
   - `SUPABASE_URL` — the "Project URL"
   - `SUPABASE_SERVICE_ROLE_KEY` — the **`service_role`** secret key (not `anon` — the backend needs full read/write access)
4. Redeploy. The store switches to Supabase automatically the moment those two vars are present — no code changes needed.

Local development is unaffected — leave those vars unset locally and it keeps using `backend/data/webtrack.json`.

## Project structure

```
backend/
  server.js            # Express app, static /uploads, prod frontend serving
  seed.js              # admin + demo data
  store/index.js       # the JSON data store (find/insert/update/delete, atomic saves)
  data/webtrack.json   # your actual data — gitignored
  middleware/          # admin attach (no login), error handler, multer upload
  models/              # Admin, Client, Project, Payment, Domain, Activity
  routes/              # auth, clients, projects, payments, domains, reports, notifications
  utils/               # activity logger, money math (single source of truth), relations

frontend/src/
  pages/               # Login, Dashboard, Clients, ClientDetail, Reports, Invoice, Notifications, Settings
  components/          # Sidebar, Navbar, Layout, StatsCard, Charts, ActivityLog, Background3D, ui kit
  context/             # Auth, Theme, Toast
  lib/                 # api client, formatters, pdf generator, excel/csv export
```

## Notes

- Pending amount is **never stored** — it is derived (`grandTotal − received`) on both server and client, so it can't drift.
- Payment status is derived the same way: `Paid` / `Partial` / `Pending`.
- Deleting a client removes its project, payments, domain and activity log.
- Chart palettes were validated for color-blind safety and contrast in both themes.
