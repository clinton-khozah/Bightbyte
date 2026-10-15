# Fleet21

Standalone fleet operations app (outside AndUs). React + Express, with optional Supabase.

Copied from FleetCore: dashboard, vehicles, drivers, checkout, incidents, maintenance, documents, refuel. Added driver **check-in** (amount + proof of payment) and **monthly car review** (photos). No product logo — wordmark only.

## Run locally

```bash
cd fleet21
npm install
npm run install:all
copy .env.example server\.env
npm run dev
```

- App: http://localhost:5173
- API: http://localhost:5050

Demo login (local mode, no Supabase required):

- Admin: `admin@fleet21.local` / `fleet21`
- Driver: `driver@fleet21.local` / `fleet21`

## Supabase

1. Create a project and run `supabase/schema.sql`.
2. Create a public storage bucket named `fleet21`.
3. Put `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in `server/.env`.
