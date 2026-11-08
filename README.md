# StockFlow

A minimal multi-tenant SaaS inventory app. Sign up, get your own organization, track products
and stock levels, and see what is running low — built to the Phase 1 "6-hour MVP" PRD.

- **Live demo:** _add your deployed URL here_
- **Demo login:** `demo@stockflow.app` / `demo12345` (created by `npm run seed`)

---

## What it does

| PRD | Feature | Where |
| --- | --- | --- |
| FR-1 | Email + password signup and login, with validation | `/signup`, `/login` |
| FR-2 | Signup creates an Organization; every query is scoped to it | `server/src/middleware/auth.js` |
| FR-3 | Product model: name, SKU, description, quantity, cost/selling price, threshold | `server/src/db.js` |
| FR-4 | Product create / list / edit / delete, with a confirm dialog before delete | `/products` |
| FR-5 | Inline "+/- N units" stock adjustment with an optional note | `AdjustStockDialog` |
| FR-6 | Dashboard: product count, total units, low-stock table | `/dashboard` |
| FR-7 | Settings: organization-wide default low-stock threshold | `/settings` |

A product counts as **low stock** when `quantity on hand <= low stock threshold`. If the product
leaves its threshold blank, the organization default from Settings is used instead.

## Tech stack

- **Backend** — Node.js, Express, SQLite (`better-sqlite3`), Zod for validation
- **Auth** — JWT in an `httpOnly` cookie, passwords hashed with bcrypt
- **Frontend** — React 18 + Vite, React Router, Tailwind CSS
- **Packaging** — one npm workspace repo; in production Express serves the built React bundle,
  so the whole app deploys as a single Node service

### Why SQLite

The PRD asks for a single-region demo app built fast. SQLite keeps setup to zero (no container,
no connection string) and the schema is plain SQL, so moving to Postgres later is a matter of
swapping the driver — the queries are already written against standard SQL.

## Running locally

Requires **Node 22** (pinned in `.node-version`). `better-sqlite3` ships prebuilt binaries per
Node major; on newer majors npm falls back to compiling from source, which fails against the
current V8 headers.

```bash
git clone <this repo>
cd stockflow
npm install

cp .env.example .env     # optional for local dev; defaults work out of the box
npm run seed             # optional: creates a demo org with 8 products

npm run dev              # API on :4000, Vite dev server on :5173
```

Open http://localhost:5173. The Vite dev server proxies `/api` to the Express process, so
cookies and sessions behave exactly as they do in production.

To run the production build the same way the server does:

```bash
npm run build
npm start                # serves API + built client on :4000
```

### Scripts

| Command | Does |
| --- | --- |
| `npm run dev` | API and client dev servers together |
| `npm run build` | Builds the React bundle into `client/dist` |
| `npm start` | Runs the single production process |
| `npm run seed` | Creates the `Demo Store` organization with sample products |
| `npm run test:api` | End-to-end API smoke test (34 checks, including tenant isolation) |

### Environment variables

| Variable | Default | Notes |
| --- | --- | --- |
| `PORT` | `4000` | HTTP port |
| `NODE_ENV` | `development` | `production` enables secure cookies and requires `JWT_SECRET` |
| `JWT_SECRET` | dev-only fallback | **Must** be set to a long random string in production |
| `DATABASE_FILE` | `./data/stockflow.sqlite` | SQLite file path |
| `DEFAULT_LOW_STOCK_THRESHOLD` | `5` | Threshold given to a new organization |
| `SEED_DEMO_DATA` | `false` | When `true`, recreates the demo org on boot if missing |

## API

All `/api` routes except `auth/signup`, `auth/login` and `health` require the session cookie.

| Method | Route | Purpose |
| --- | --- | --- |
| `POST` | `/api/auth/signup` | Create organization + owner, start a session |
| `POST` | `/api/auth/login` | Start a session |
| `POST` | `/api/auth/logout` | Clear the session |
| `GET` | `/api/auth/me` | Current user and organization |
| `GET` | `/api/products?search=` | List products (search by name or SKU) |
| `POST` | `/api/products` | Create a product |
| `GET` | `/api/products/:id` | Read one product |
| `PATCH` | `/api/products/:id` | Update any field, including quantity |
| `POST` | `/api/products/:id/adjust` | Apply a `+/- N` delta with an optional note |
| `DELETE` | `/api/products/:id` | Hard delete |
| `GET` | `/api/dashboard` | Totals and the low-stock list |
| `GET`/`PATCH` | `/api/settings` | Read / update the default threshold |
| `GET` | `/api/health` | Health check for the platform |

Validation failures return `400` with a `fields` object (`{ sku: "SKU is required" }`), which the
forms render next to the offending input.

## Multi-tenancy

`requireAuth` resolves the JWT to a user row and attaches the organization to the request. Every
statement below it filters on `organization_id` — there is no query in the codebase that can read
another tenant's rows, and SKU uniqueness is enforced per organization, not globally
(`idx_products_org_sku`). `npm run test:api` asserts this: a second organization gets `404` on
reads, updates and deletes of the first organization's products, and can reuse the same SKU.

## Data model

```
organizations (id, name, default_low_stock_threshold, created_at, updated_at)
  |
  +-- users    (id, organization_id, email UNIQUE, password_hash, created_at)
  |
  +-- products (id, organization_id, name, sku, description, quantity_on_hand,
                cost_price, selling_price, low_stock_threshold,
                last_adjustment_note, last_updated_by, created_at, updated_at)
                UNIQUE (organization_id, sku)
```

## Deployment

The repo ships with config for two routes:

**Render** — push the repo, point Render at `render.yaml`, deploy. It builds with
`npm install && npm run build`, starts with `npm start`, and generates a `JWT_SECRET` for you.

The blueprint targets Render's **free** instance type, which comes with two caveats worth knowing
before you click the demo link:

- The filesystem is ephemeral, so the SQLite database is recreated whenever the instance restarts
  or redeploys. Anything you add during a session sticks around for that session. The blueprint
  sets `SEED_DEMO_DATA=true` so the demo organization is rebuilt on boot and the demo login in
  this README always works.
- Free instances spin down after ~15 minutes of inactivity, so the first request after a quiet
  spell can take up to a minute while the container wakes up.

For durable storage, switch to `plan: starter` and attach a disk mounted at `/var/data`, then set
`DATABASE_FILE=/var/data/stockflow.sqlite`.

**Docker** — anywhere that runs a container (Fly.io, Railway, a VPS):

```bash
docker build -t stockflow .
docker run -p 4000:4000 -e JWT_SECRET="$(openssl rand -hex 32)" -v stockflow-data:/data stockflow
```

## Out of scope for this phase

Per the PRD: multi-warehouse, product variants, channel integrations, orders and reservations,
purchase orders, email notifications, CSV import, a public API, roles beyond the single owner,
audit logs and full stock movement history, and billing.

`last_updated_by` and `updated_at` are recorded on every product write, so a full movement
history can be added later without a data migration.
