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

The schema enables Row Level Security for every public table and uses anonymous session IDs so the first version can work without requiring user accounts. When you add Supabase Auth, replace the session policies with `auth.uid()` ownership policies.

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

- The app gates asset focus selection behind three readiness checks: positive monthly cashflow, debt under `$5,000`, and at least three months of emergency savings.
- Emergency fund contributions step down as the user approaches six months and one year of savings.
- News is limited to three research cards and is intentionally separated from recommendations.
- This is planning software, not financial advice.
