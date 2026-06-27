# WealthBuilder Command Center

A Vite web app for budget readiness, debt payoff, emergency fund tiers, asset focus selection, and portfolio allocation tracking. The UI is local-first and automatically enables Supabase persistence when environment variables are configured.

## Local Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy the environment example:

   ```bash
   cp .env.example .env
   ```

3. Add your Supabase project values:

   ```bash
   VITE_SUPABASE_URL=https://your-project-ref.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY=your-supabase-publishable-or-anon-key
   ```

4. Run the app:

   ```bash
   npm run dev
   ```

## Supabase Setup

1. Create a Supabase project.
2. Open the SQL Editor.
3. Run `supabase/schema.sql`.
4. Use the public publishable key in `VITE_SUPABASE_PUBLISHABLE_KEY`. Do not use a service role key in Vite or any browser-exposed variable.
5. Deploy the `supabase/functions/marketaux-news` Edge Function if you want live Marketaux headlines.
6. Add the Marketaux token as a Supabase Edge Function secret named `MARKETAUX_API_TOKEN`.

The schema enables Row Level Security for every public table and uses anonymous session IDs so the first version can work without requiring user accounts. When you add Supabase Auth, replace the session policies with `auth.uid()` ownership policies.

### Marketaux News Fetcher

The browser never receives the Marketaux token. The app calls the Supabase Edge Function `marketaux-news`; that function checks `public.news_items` first and only calls Marketaux when today's cached articles are missing. It limits the response to three articles, stores the articles in `public.news_items`, and returns them to the app.

Set the secret in Supabase Dashboard:

1. Open your Supabase project.
2. Go to `Edge Functions`.
3. Open `Secrets`.
4. Add `MARKETAUX_API_TOKEN`.
5. Paste your Marketaux API token.
6. Deploy the function from `supabase/functions/marketaux-news`.

If the Edge Function is not deployed yet, the app falls back to `public.news_items`, then to local sample headlines.

To test the daily cache:

- First request should return `"cached": false` when it calls Marketaux.
- A second request on the same day should return `"cached": true` and should not use another Marketaux API call.
- Add `?force_refresh=true` to the function test URL only when you intentionally want to fetch fresh Marketaux articles again.

## Vercel Deployment

1. Import this folder into Vercel as a Vite project.
2. Use these build settings:
   - Framework Preset: `Vite`
   - Build Command: `npm run build`
   - Output Directory: `dist`
3. Add Environment Variables in Vercel Project Settings:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_PUBLISHABLE_KEY`
   - optional `VITE_NEWS_ENDPOINT`
4. Deploy.

Vite only exposes environment variables prefixed with `VITE_` to browser code. Keep Supabase service-role keys and private API keys out of Vercel client-side variables.

## Current Product Notes

- The app prioritizes positive monthly cashflow, a 3-month emergency fund, debt payoff, then selected asset investing.
- Emergency fund contributions step down as the user approaches six months and one year of savings.
- News is limited to three research cards and can be refreshed through the Supabase Marketaux Edge Function.
- This is planning software, not financial advice.
