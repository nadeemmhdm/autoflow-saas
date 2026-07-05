# AutoFlow — Beta

Open-source Instagram, Facebook, and WhatsApp automation. Drag-and-drop
flows for comment-to-DM replies, DM automation, and WhatsApp keyword
replies — built entirely on **Meta's official APIs**, with your own
Supabase project as the backend.

This is a **beta**. Test on a low-traffic account before connecting
anything you can't afford to lose access to.

---

## What's already live

A Supabase project has been provisioned for you:

- **Project ref:** `krvtztfmeyznmglelwfr`
- **Project URL:** `https://krvtztfmeyznmglelwfr.supabase.co`
- **Database:** 8 tables (see `supabase/migrations/`), every one with Row Level Security enabled
- **Edge Functions deployed:**
  - `oauth-callback` — exchanges Meta's OAuth code for a token, encrypts it, stores it
  - `meta-webhook` — receives Instagram/Facebook comment & DM events, with replay/duplicate protection
  - `whatsapp-webhook` — receives WhatsApp Cloud API messages, with the same protections
  - `test-automation` — dry-run sandbox: simulate an event against a flow with no real send
  - `check-permissions` — checks which Meta permissions are actually granted for a connected account
  - `secrets-health` — admin-only check of which required secrets are configured (never reveals values)

You still need to: create a Meta app, set several secrets, and run `npm install`.

---

## Feature set

**Automation**
- Drag-and-drop flow builder (trigger → condition → action), with a property
  panel to edit keywords, match type (contains / exact / starts with / regex),
  and message content per node
- Ready-made templates: comment → DM, WhatsApp product info, FAQ bot, lead
  capture, support escalation (acknowledge + human handoff)
- **Testing sandbox** — simulate a comment/DM against your flow before going
  live, no real messages sent, doesn't touch your rate limits
- **Human handoff** action node — pauses automation for a specific contact
  so a person can take over
- **Conversation inbox** — every contact your automations have talked to,
  with automation history, notes, and a pause/resume toggle
- Per-automation **daily and hourly send limits**, plus a 20-second
  per-contact cooldown to stop rapid-fire duplicate replies

**Security**
- Row Level Security on every table — one user can never see another's data
- Access tokens encrypted (AES-256-GCM) before storage; never exposed via API
- Webhook signature verification (`X-Hub-Signature-256`) on every inbound event
- **Replay/duplicate protection** — event IDs are deduped via a unique index,
  and stale events (>5 minutes old) are dropped
- **Meta permission checker** — see exactly which permissions are granted vs.
  missing for each connected account (Settings → Connected accounts)
- **Secrets health check** (Admin panel) — confirms which Edge Function
  secrets are configured, without ever showing their values
- API keys are SHA-256 hashed, scoped (`logs:read`, `automations:write`, etc.),
  and support expiry (30/90/365 days or never)
- URL safety checks on "send link" actions — blocks `javascript:`,
  non-http(s), and private/local addresses
- RLS test suite in `supabase/tests/rls_test_suite.sql` (pgTAP) — verifies
  cross-user isolation automatically; run with `supabase test db`

---

## 1. Local setup

```bash
cp .env.example .env
npm install
npm run dev
```

The anon key in `.env.example` is already filled in and safe to use —
every table it can reach is protected by RLS.

---

## 2. Create your Meta App (required for Instagram + Facebook)

1. Go to **[developers.facebook.com/apps](https://developers.facebook.com/apps)** → **Create App** → choose **"Other"** → **"Business"**.
2. In the app dashboard, add these products:
   - **Facebook Login for Business** (for the OAuth connect flow)
   - **Webhooks**
   - **Instagram Graph API** (if you want Instagram automation)
   - **WhatsApp** (if you want WhatsApp automation — it provisions a free test number automatically)
3. Under **App Settings → Basic**, copy your **App ID** and **App Secret**.
4. Under **Facebook Login for Business → Settings**, add this Valid OAuth Redirect URI:
   ```
   https://your-frontend-domain.com/oauth/callback
   ```
   (use `http://localhost:5173/oauth/callback` while developing locally)
5. Request these permissions under **App Review → Permissions**:
   - `pages_show_list`, `pages_messaging`, `pages_manage_metadata`, `pages_read_engagement`
   - `instagram_basic`, `instagram_manage_messages`, `instagram_manage_comments`
   - These require **App Review** before they work for accounts other than your own test users — expect this step to take a few days with Meta. You can develop and test against your own Pages/IG account before review completes.
   - Use the **permission checker** (Connected accounts page, shield icon) any time to confirm what's actually been granted.

### Configure the webhook in the Meta dashboard

Under **Webhooks → Page** (and **Instagram**), subscribe to:
- `comments` (for comment-to-DM automation)
- `messages` (for DM automation)

Callback URL:
```
https://krvtztfmeyznmglelwfr.supabase.co/functions/v1/meta-webhook
```
Verify token: any long random string — put the same value in `META_WEBHOOK_VERIFY_TOKEN` (step 4 below).

---

## 3. Set up WhatsApp (optional, separate from the above)

1. In the same Meta app, open the **WhatsApp** product page.
2. Under **API Setup**, note your **Phone Number ID** and **WhatsApp Business Account ID**.
3. Generate a **permanent token**: Meta Business Manager → System Users → create a system user → assign it to your WhatsApp Business Account → generate a token with `whatsapp_business_messaging` + `whatsapp_business_management` permissions.
4. Under **Configuration → Webhook**, set the callback URL to:
   ```
   https://krvtztfmeyznmglelwfr.supabase.co/functions/v1/whatsapp-webhook
   ```
   Subscribe to the `messages` field. Use the same verify token approach as above (`WHATSAPP_WEBHOOK_VERIFY_TOKEN`).

---

## 4. Set Edge Function secrets

These must be set on the Supabase project — never in your frontend `.env`:

```bash
supabase login
supabase link --project-ref krvtztfmeyznmglelwfr

supabase secrets set \
  META_APP_ID=xxxxxxxxxx \
  META_APP_SECRET=xxxxxxxxxx \
  META_WEBHOOK_VERIFY_TOKEN=$(openssl rand -hex 24) \
  META_GRAPH_API_VERSION=v20.0 \
  WHATSAPP_PHONE_NUMBER_ID=xxxxxxxxxx \
  WHATSAPP_ACCESS_TOKEN=xxxxxxxxxx \
  WHATSAPP_WEBHOOK_VERIFY_TOKEN=$(openssl rand -hex 24) \
  TOKEN_ENCRYPTION_KEY=$(openssl rand -base64 32)
```

`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are injected automatically
into Edge Functions by Supabase — you don't set those yourself.

Check what's configured any time from **Admin → Secrets health** in the app
(admin role required) — it reports configured/missing/looks-invalid per
secret without ever showing the value.

---

## 5. Deploy the frontend

See **[DEPLOY.md](./DEPLOY.md)** for step-by-step guides covering
**Cloudflare Pages**, **Vercel**, and **Netlify** — pick whichever you
prefer. Security headers (`_headers` / `vercel.json`) and SPA routing
(`_redirects`) are already included in this repo for all three.

---

## How automations work

1. Someone comments on your post or DMs you.
2. Meta calls `meta-webhook` (or `whatsapp-webhook`), signed with your App Secret — the signature is verified, the event's age is checked (events older than 5 minutes are dropped), and the event ID is deduped before anything runs.
3. The event is matched against your **active** automations for that account, unless the contact's conversation is paused for human handoff or still in cooldown.
4. If a condition node's keyword matches, the connected action node(s) fire — a text reply, image, link, delay, or a hand-off to a human. A single condition can fan out to more than one action (e.g. "acknowledge" + "hand off").
5. Every attempt — success, failure, rate-limited, or skipped — is written to `automation_logs` and shows up against the contact's thread in the **Inbox**.

Each automation has a **daily and hourly send limit** (defaults: 500/day,
100/hour) to protect your account from Meta's spam/rate-limit flags, plus a
20-second cooldown per contact. Adjust limits per automation in the builder.

Use the **Test** button in the automation builder to simulate an event
against your current flow before activating it — no real messages sent,
doesn't touch your limits.

---

## Security model

- **Row Level Security** on every table — one user can never query another user's data, even with the anon key.
- **Access tokens are encrypted** (AES-256-GCM) before they're stored, using a key that only exists as an Edge Function secret.
- **Webhook signature verification + replay protection** — every inbound Meta/WhatsApp event is checked against `X-Hub-Signature-256`, stale events are dropped, and duplicate event IDs are rejected via a unique index.
- **API keys** are stored as SHA-256 hashes with scopes and optional expiry, never in plaintext.
- **Audit log** of security-relevant actions, readable by the account owner and admins only.
- **RLS test suite** (`supabase/tests/rls_test_suite.sql`) — run `supabase test db` to verify cross-user isolation holds after any schema change.

Self-hosting this means you are responsible for keeping your Supabase
project, Meta App Secret, and encryption key secure. Rotate
`TOKEN_ENCRYPTION_KEY` and re-authorize connected accounts if you ever
suspect it's been exposed.

---

## Using this legally

- Only connect accounts you own or have explicit authorization to manage.
- Only use Meta's **official Graph API / WhatsApp Cloud API** — this project does not scrape, spoof, or use unofficial/reverse-engineered endpoints, and it never will.
- Respect WhatsApp's messaging window rules (24-hour customer service window for free-form replies; use approved message templates outside that window).
- Get consent before messaging people at scale, and follow your local data protection law (e.g. India's DPDP Act, GDPR if you have EU users) for how you store and process contact data.

---

## Roadmap (not built yet)

These were considered but intentionally left out of this beta to keep
everything shipped actually working end-to-end, rather than half-stubbed:

- CRM export (CSV/Sheets/HubSpot/Zoho), link click tracking, media library uploads
- AI-suggested replies, multi-language auto-translation
- Team roles/permissions, multi-workspace agency mode
- WhatsApp approved-template manager, flow version history
- Notification system (email/webhook alerts on failures)
- IP allowlisting for API keys

Contributions welcome — see the GitHub repo.

---

## Open source

MIT licensed — see `LICENSE`. If you deploy it, keep the "Powered by
AutoFlow" attribution in the footer (`src/components/Layout/Footer.tsx`)
as a courtesy — see `NOTICE.md`.

Repo: https://github.com/nadeemmhdm/autoflow-saas

