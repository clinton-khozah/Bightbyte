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

## Brighty AI (local development)

Brighty can connect to a user's ChatGPT plan from the local web app. Start Fleet21 on localhost, open Brighty AI, and choose **Continue with ChatGPT**. The connection uses OpenAI's local Sign in with ChatGPT flow; credentials stay in the ignored `server/data/brighty-chatgpt.json` file and never go to the browser bundle. Questions and the Fleet21 records the signed-in user is allowed to view are sent to OpenAI for responses (`store: false`).

The ChatGPT plan connection is limited to local development in this implementation. BrightByte's hosted app needs a separately approved hosted integration before it can offer the same connection.

## Supabase

Without these keys the API keeps companies in memory and they disappear when the server restarts.

1. Create a project at supabase.com.
2. SQL Editor → paste and run `supabase/schema.sql` (creates companies, profiles, and the rest of the fleet tables, including pending `status` and company `address`).
3. Storage → create a public bucket named `fleet21`.
4. Put `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in `server/.env`, then restart `npm run dev`.

New workspace signups then insert into `companies` (`status = pending`) and `profiles` (`status = pending`). Approve in the app, or:

```sql
update companies set status = 'active' where id = '<company-id>';
update profiles set status = 'active' where company_id = '<company-id>';
```
