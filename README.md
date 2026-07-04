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
- **Database:** 7 tables, all with Row Level Security enabled (see `supabase/migrations/001_init_core_schema.sql`)
- **Edge Functions deployed:**
  - `oauth-callback` — exchanges Meta's OAuth code for a token, encrypts it, stores it
  - `meta-webhook` — receives Instagram/Facebook comment & DM events
  - `whatsapp-webhook` — receives WhatsApp Cloud API messages

You still need to: create a Meta app, set several secrets, and run `npm install`.

---

## 1. Local setup

```bash
cp .env.example .env
npm install
npm run dev
```

The anon key in `.env.example` is already filled in and safe to use —
every table it can reach is protected by RLS. It can never read encrypted
tokens or webhook logs.

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

---

## 5. Deploy the frontend

Any static host works (Cloudflare Pages, Vercel, Netlify):

```bash
npm run build
# upload the dist/ folder
```

Set `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, and `VITE_META_APP_ID`
as environment variables on your host — the same three used in `.env`.

---

## How automations work

1. Someone comments on your post or DMs you.
2. Meta calls `meta-webhook` (or `whatsapp-webhook`), signed with your App Secret — the signature is verified before anything is trusted.
3. The event is matched against your **active** automations for that account.
4. If a condition node's keyword matches, the connected action node fires: a text reply, image, link, or a delay before the next action.
5. Every attempt — success, failure, or rate-limited — is written to `automation_logs`, visible only to you via RLS.

Each automation has a **daily send limit** (default 500) to protect your
account from Meta's spam/rate-limit flags. Adjust it per automation in the
builder.

---

## Security model

- **Row Level Security** on every table — one user can never query another user's data, even with the anon key.
- **Access tokens are encrypted** (AES-256-GCM) before they're stored, using a key that only exists as an Edge Function secret. The database itself never holds a plaintext token, and the client-facing `social_accounts_safe` view never exposes the encrypted column.
- **Webhook signature verification** — every inbound Meta/WhatsApp event is checked against `X-Hub-Signature-256` using your App Secret before it's processed. Requests that fail this check are rejected with 401.
- **API keys** for the platform's own API are stored as SHA-256 hashes, never in plaintext. The raw key is shown to you exactly once at creation.
- **Audit log** of security-relevant actions (account connections, etc.), readable by the account owner and admins only.

Self-hosting this means you are responsible for keeping your Supabase
project, Meta App Secret, and encryption key secure. Rotate
`TOKEN_ENCRYPTION_KEY` and re-authorize connected accounts if you ever
suspect it's been exposed.

---

## Using this legally

- Only connect accounts you own or have explicit authorization to manage.
- Only use Meta's **official Graph API / WhatsApp Cloud API** — this project does not scrape, spoof, or use unofficial/reverse-engineered endpoints, and it never will. Doing so violates Meta's Platform Terms and can get accounts permanently banned.
- Respect WhatsApp's messaging window rules (24-hour customer service window for free-form replies; use approved message templates outside that window).
- Get consent before messaging people at scale, and follow your local data protection law (e.g. India's DPDP Act, GDPR if you have EU users) for how you store and process contact data.

---

## Open source

This project is MIT licensed — see `LICENSE`. If you deploy it, keep the
"Powered by AutoFlow" attribution in the footer (`src/components/Layout/Footer.tsx`)
pointing at the source repository, per the license notice.

Repo: https://github.com/nadeemmhdm/autoflow-saas
