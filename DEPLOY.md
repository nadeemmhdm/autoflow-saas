# Deploying AutoFlow

The frontend is a static Vite build — it runs on any static host. Below are
the three most common options. Pick one; you don't need all three.

Before deploying anywhere, make sure you can build locally first:

```bash
npm install
npm run build   # outputs to dist/
```

---

## Option A — Cloudflare Pages

1. Push this project to a GitHub repo (or use `wrangler` directly).
2. In the Cloudflare dashboard: **Workers & Pages → Create → Pages → Connect to Git**.
3. Build settings:
   - **Build command:** `npm run build`
   - **Build output directory:** `dist`
4. Add environment variables (Settings → Environment variables):
   - `VITE_SUPABASE_URL` = `https://krvtztfmeyznmglelwfr.supabase.co`
   - `VITE_SUPABASE_ANON_KEY` = (from `.env.example`)
   - `VITE_META_APP_ID` = your Meta App ID
5. Deploy. The `public/_headers` and `public/_redirects` files are picked up
   automatically by Cloudflare Pages — no extra config needed for security
   headers or SPA routing.
6. Update your Meta App's OAuth redirect URI to
   `https://your-project.pages.dev/oauth/callback` (or your custom domain).

### CLI alternative
```bash
npm install -g wrangler
npm run build
wrangler pages deploy dist --project-name=autoflow-saas
```

---

## Option B — Vercel

1. `npm install -g vercel` (or use the Vercel dashboard + GitHub import).
2. From the project root:
   ```bash
   vercel
   ```
3. When prompted, set the same three environment variables as above
   (`vercel env add VITE_SUPABASE_URL`, etc.), or add them in
   **Project Settings → Environment Variables**.
4. `vercel.json` in this repo already configures the SPA rewrite and
   security headers — no extra setup needed.
5. Update your Meta App's OAuth redirect URI to your Vercel domain +
   `/oauth/callback`.

---

## Option C — Netlify

1. Netlify reads the same `public/_headers` and `public/_redirects` files
   as Cloudflare Pages — nothing extra to configure.
2. Via dashboard: **Add new site → Import an existing project**.
   - **Build command:** `npm run build`
   - **Publish directory:** `dist`
3. Add the same three environment variables under **Site settings → Environment variables**.
4. Update your Meta App's OAuth redirect URI to your Netlify domain +
   `/oauth/callback`.

### CLI alternative
```bash
npm install -g netlify-cli
npm run build
netlify deploy --prod --dir=dist
```

---

## After deploying to any host

1. **Meta App → Facebook Login for Business → Settings** — add your live
   domain's `/oauth/callback` URL as a Valid OAuth Redirect URI (you can
   have multiple: localhost for dev, plus your production domain).
2. **Meta App → Webhooks** — the callback URLs point at your **Supabase**
   project, not your frontend host, and don't change when you redeploy the
   frontend:
   - `https://krvtztfmeyznmglelwfr.supabase.co/functions/v1/meta-webhook`
   - `https://krvtztfmeyznmglelwfr.supabase.co/functions/v1/whatsapp-webhook`
3. Log in on the live site and connect a test account to confirm the OAuth
   round-trip works end-to-end before inviting real users.

---

## Collecting your Meta API keys locally (first-time setup)

You only do this once per Meta App:

1. Run the app locally: `npm run dev` → open `http://localhost:5173`.
2. Follow **README.md → "Create your Meta App"** to get your App ID and
   App Secret from developers.facebook.com.
3. Set them as Supabase Edge Function secrets (not in your local `.env` —
   those are server-side only):
   ```bash
   supabase login
   supabase link --project-ref krvtztfmeyznmglelwfr
   supabase secrets set META_APP_ID=xxx META_APP_SECRET=xxx ...
   ```
4. Put only the **public** `VITE_META_APP_ID` in your frontend `.env` (and
   in your host's environment variables once deployed) — the App Secret
   never goes in a `VITE_`-prefixed variable, since anything with that
   prefix is bundled into the browser JavaScript.
5. Test the "Connect" button locally against `http://localhost:5173/oauth/callback`
   before wiring up your production redirect URI.
