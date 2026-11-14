# RRC · Randhwe Run Club

Mobile-friendly site for a private group of about 8–10 friends. It tracks two duration-based challenges (short and main), weekly prizes on the main challenge, and a manual admin workflow. There is **no Strava API** and the site does not scrape Strava. People send links or screenshots; the admin types them in.

## Local development

```bash
npm install
copy .env.example .env
npm run dev
```

Open the Vite URL. With empty `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`, the app runs in **demo mode** on your browser (`localStorage`). Demo athletes are labeled **DEMO**.

Demo admin password: `rrc-local` (or whatever you set in `VITE_DEMO_ADMIN_PASSWORD`). Email can be anything in demo mode.

This is not a live database until you add real Supabase credentials and confirm they load without errors.

## Supabase setup

1. Create a project.
2. Run `supabase/schema.sql` in the SQL editor (tables, RLS, storage bucket `site-assets`).
3. Optional: `supabase/seed.sql` for a few DEMO rows. Delete them with the SQL at the bottom of that file, or the Admin → Settings “Remove demo data” button.
4. Authentication → add a user (email/password).
5. Make that user an admin:

```sql
insert into public.admin_users (user_id)
select id from auth.users where email = 'you@example.com';
```

6. Copy the **Project URL** and **anon public** key into `.env` (and Netlify env vars). Never put the **service role** key in this app.

7. Restart `npm run dev`. The yellow demo banner should go away once the client can read `challenges`. If it cannot, the UI still works from local data and tells you it is not connected.

### QR code and UPI

Admin → Settings: upload your UPI QR image and type your UPI ID. The public payment section uses the exact line:

> Each contribution will help a poor child (Shubham) somewhere on the planet.

No sample QR or UPI ID is invented in code.

## Netlify

1. Connect the Git repo or deploy the folder.
2. Build command `npm run build`, publish `dist` (`netlify.toml` already has this plus SPA redirects).
3. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in Netlify environment variables, then trigger a new deploy.

## How scoring works

- Eligible types: running, swimming, cycling, football. Walking is not a type.
- Rank by **approved duration** inside each challenge’s IST dates.
- Short: 14 Nov 2026–19 Dec 2026, ₹20, 50/30/20 to top 3.
- Main: 14 Nov 2026–16 Jan 2027, ₹101, 40/25/15 to top 3 and 20% weekly reserve.
- Weekly prizes: paid ₹101 entrants only. Weeks are 7-day blocks from 14 Nov 2026; the last week may be shorter. Prize size is not guaranteed.
- Rupee splits use largest-remainder rounding; +₹1 notes are shown so the whole pool adds up.

Assumed rules (multiple weekly wins, admin-selected weekly ties, 48-hour entry grace) are written in **Rules** and editable by the admin.

## Project layout

- `src/pages` — leaderboard, athlete profile, admin
- `src/lib` — IST dates, prize math, scoring, local + Supabase data
- `supabase/` — schema and optional demo seed
