# Wealth Builder App

A Vite web app for budget tracking, debt payoff planning, emergency fund tiers, asset allocation, real estate payoff scenarios, and financial news. The UI works locally first, then syncs across devices when Supabase Auth and database persistence are configured.

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
5. Enable Supabase email/password Auth if you want account-based sync.
6. Add your deployed app URL in Supabase Auth URL Configuration:
   - Site URL: your production Vercel URL
   - Redirect URL: your production Vercel URL
7. Deploy the `supabase/functions/marketaux-news` Edge Function if you want live Marketaux headlines.
8. Add the Marketaux token as a Supabase Edge Function secret named `MARKETAUX_API_TOKEN`.
9. Optional but recommended: add a second Edge Function secret named `NEWS_REFRESH_SECRET` for the scheduled refresh call.

The schema enables Row Level Security for every public table. The app supports both anonymous local use and signed-in account sync. Signed-in users can sync budget profile data, income items, expense items, debt items, asset allocations, and visible asset choices across devices.

### Marketaux News Fetcher

The browser never receives the Marketaux token. The app calls the Supabase Edge Function `marketaux-news`; that function checks `public.news_items` first and only calls Marketaux when recent cached articles are missing. It limits the response to three articles, stores the articles in `public.news_items`, and returns them to the app.

Set the secret in Supabase Dashboard:

1. Open your Supabase project.
2. Go to `Edge Functions`.
3. Open `Secrets`.
4. Add `MARKETAUX_API_TOKEN`.
5. Paste your Marketaux API token.
6. Add `NEWS_REFRESH_SECRET` with a random value you choose.
7. Deploy the function from `supabase/functions/marketaux-news`.

### Daily News Refresh

Use `supabase/schedule-news-refresh.sql` to schedule one Marketaux refresh per day. Before running it in the Supabase SQL Editor, replace:

- `YOUR_PROJECT_REF`
- `YOUR_SUPABASE_PUBLISHABLE_OR_ANON_KEY`
- `YOUR_NEWS_REFRESH_SECRET`

The schedule runs at `8:00 UTC` every day. The scheduled request calls the Edge Function with `force_refresh=true`, stores the latest articles in `public.news_items`, and removes cached rows older than 30 days.

If the Edge Function is not deployed yet, the app falls back to `public.news_items`, then to local sample headlines.

To test the daily cache:

- First request should return `"cached": false` when it calls Marketaux.
- A second request on the same day should return `"cached": true` and should not use another Marketaux API call.
- Add `?force_refresh=true` to the function test URL only when you intentionally want to fetch fresh Marketaux articles again. If `NEWS_REFRESH_SECRET` is set, include a request header named `x-news-refresh-secret` with that same secret value.

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

## Updating GitHub And Vercel

When local code changes are ready:

1. Upload or commit the current project files to GitHub.
2. Vercel will redeploy automatically if the project is connected to that GitHub repository.
3. If `supabase/schema.sql` changed, run the updated SQL in the Supabase SQL Editor.
4. If `supabase/functions/marketaux-news/index.ts` changed, redeploy that Supabase Edge Function.

The main files that usually change during app work are:

- `src/main.js`
- `src/styles.css`
- `index.html`
- `public/`
- `supabase/schema.sql`
- `supabase/functions/marketaux-news/index.ts`
- `supabase/schedule-news-refresh.sql`

## Current Product Notes

- The app prioritizes positive monthly cashflow, a 3-month emergency fund, debt payoff, then selected asset investing.
- Emergency fund contributions step down as the user approaches six months and one year of savings.
- News is limited to three research cards and can be refreshed through the Supabase Marketaux Edge Function.
- Signed-in users can sync their plan across devices through Supabase.
- This is planning software, not financial advice.
