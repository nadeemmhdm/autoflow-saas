# Security Policy

## Supported Versions

AutoFlow is currently in beta. Security fixes are applied to the latest beta version only.

| Version        | Supported |
| -------------- | --------- |
| `v0.2.x-beta`  | Yes       |
| `v0.1.x-beta`  | No        |
| Older versions | No        |

## Reporting a Vulnerability

If you discover a security vulnerability in AutoFlow, please report it responsibly.

Do **not** open a public GitHub issue for security vulnerabilities.

Instead, contact the maintainer privately:

```text
security contact: nadeemmhdm
repository: https://github.com/nadeemmhdm/autoflow-saas
```

When reporting a vulnerability, please include:

* A clear description of the issue
* Steps to reproduce the vulnerability
* The affected component, such as frontend, Supabase database, Edge Function, webhook, OAuth flow, API key handling, automation execution, or inbox handoff logic
* Any relevant logs, screenshots, or proof-of-concept details
* Suggested fix or mitigation, if available

Please avoid accessing, modifying, deleting, or exfiltrating data that does not belong to you.

## Scope

The following areas are considered in scope:

* Supabase Row Level Security policies
* Supabase database schema, views, indexes, and RPC functions
* Supabase Edge Functions
* Meta OAuth callback handling
* Instagram/Facebook webhook handling
* WhatsApp webhook handling
* Webhook signature verification
* Webhook replay and duplicate protection
* Access token encryption and storage
* Token expiry handling
* API key hashing, scopes, expiry, and validation
* Secrets health checking
* Audit logging
* Frontend authentication and authorization flows
* Automation execution permissions
* Automation template execution safety
* Testing sandbox isolation
* Conversation inbox authorization
* Human handoff authorization
* Cross-user data isolation
* URL safety checks for send-link actions
* Security headers and deployment routing configuration

## Out of Scope

The following are generally out of scope:

* Attacks requiring physical access to a user’s device
* Social engineering attacks
* Vulnerabilities in third-party services such as Meta, Supabase, Vercel, Netlify, or Cloudflare
* Issues caused by leaked environment variables or secrets from a user’s own deployment
* Denial-of-service attacks that rely only on high-volume traffic
* Automated scanner reports without a working proof of concept
* Missing security headers that do not create a practical exploit
* Clickjacking reports without a demonstrated sensitive action
* Self-XSS requiring users to paste code into their own browser console
* Issues caused by disabling Row Level Security or modifying security policies incorrectly
* Issues caused by using unofficial Meta, Instagram, Facebook, or WhatsApp APIs outside AutoFlow’s intended implementation

## Security Model

AutoFlow is designed as a self-hosted automation platform. Each deployment owner is responsible for securing their own Supabase project, Meta app, WhatsApp token, frontend hosting provider, domain, and environment variables.

AutoFlow uses the following security controls:

* Row Level Security on Supabase tables
* User-scoped database access policies
* Cross-user isolation tests using pgTAP
* Restricted client-facing database views
* Encrypted storage for connected Meta access tokens
* AES-256-GCM token encryption using `TOKEN_ENCRYPTION_KEY`
* Webhook signature verification using `X-Hub-Signature-256`
* Webhook event deduplication using unique event IDs
* Stale webhook event rejection
* SHA-256 hashing for platform API keys
* One-time display of raw API keys
* API key scopes and optional expiry dates
* Audit logging for security-relevant actions
* Supabase Edge Function secrets for sensitive configuration
* Send limits and per-contact cooldowns
* URL validation for send-link actions
* Human handoff controls for pausing automation per contact
* Secrets health checks without exposing secret values

## Secrets and Environment Variables

Never expose the following values in frontend code, public repositories, logs, screenshots, browser devtools recordings, issue reports, or support messages:

* `META_APP_SECRET`
* `WHATSAPP_ACCESS_TOKEN`
* `TOKEN_ENCRYPTION_KEY`
* `SUPABASE_SERVICE_ROLE_KEY`
* Any connected Meta or WhatsApp access token
* Raw platform API keys
* Webhook verify tokens
* Any production database connection string
* Any private deployment secret

Frontend-safe values may include:

* `VITE_SUPABASE_URL`
* `VITE_SUPABASE_ANON_KEY`
* `VITE_META_APP_ID`

The Supabase anon key is safe to expose only when Row Level Security policies are correctly enabled, reviewed, and tested.

## Secrets Health Checker

AutoFlow includes an Admin secrets health checker.

The checker may show whether required secrets are:

* Configured
* Missing
* Invalid

Secret values must never be displayed in the UI, returned to the frontend, written to logs, or exposed through API responses.

If a required secret is missing or invalid, affected functionality should fail safely instead of continuing with insecure behavior.

## Webhook Security

AutoFlow webhooks must verify inbound requests before processing events.

The following webhook endpoints are security-sensitive:

```text
/functions/v1/meta-webhook
/functions/v1/whatsapp-webhook
```

Each webhook request must be verified using Meta’s `X-Hub-Signature-256` header and the configured app secret before any payload is trusted or processed.

Requests that fail signature verification should be rejected.

Webhook events are protected against replay and duplicate processing by:

* Deduplicating event IDs
* Rejecting stale events older than the allowed time window
* Processing only verified payloads

Webhook handlers should not trust user-controlled fields until the request signature and event validity are confirmed.

## Send Limits and Cooldowns

AutoFlow includes send safety controls to reduce spam risk and accidental high-volume messaging.

These controls include:

* Daily send limits
* Hourly send limits
* Per-contact cooldowns
* Automation pause support through human handoff

These limits are safety controls only. They do not replace the requirement to follow Meta Platform Terms, WhatsApp Cloud API rules, consent requirements, and applicable privacy laws.

## Token Encryption

Connected account tokens must never be stored in plaintext.

AutoFlow encrypts tokens before storage using `TOKEN_ENCRYPTION_KEY`. The encryption key must be stored only as a Supabase Edge Function secret.

If `TOKEN_ENCRYPTION_KEY` is exposed:

1. Rotate the encryption key.
2. Re-authorize connected Meta accounts.
3. Revoke exposed or suspicious tokens.
4. Review Supabase logs and Meta access logs.
5. Redeploy Edge Functions with updated secrets.

## Token Expiry

AutoFlow may show token expiry warnings when connected account tokens are close to expiration.

Deployment owners should monitor connected account status and re-authorize accounts before tokens expire.

Expired tokens may cause automation delivery failures, webhook processing issues, or account connection errors.

## API Key Security

AutoFlow platform API keys are hashed before storage.

Raw API keys should be shown only once when created. After that, they cannot be recovered and should be rotated if lost.

API keys may include:

* Scoped permissions
* Optional expiry dates
* No-expiry configuration when explicitly selected

Recommended practice:

* Use the minimum scopes required
* Prefer expiring keys over permanent keys
* Rotate keys periodically
* Revoke unused keys
* Never commit API keys to source control

## URL Safety

AutoFlow validates URLs used in send-link actions.

The system should block unsafe URL targets such as:

* `javascript:` URLs
* Private IP addresses
* Localhost addresses
* Internal network addresses
* Other unsafe local or private destinations

URL safety checks help reduce phishing, script injection, and server-side request risks.

## Conversation Inbox and Human Handoff

The conversation inbox must only show contacts, messages, notes, and automation history that belong to the authenticated user or workspace.

Human handoff pauses automation for a specific contact. Handoff state must be user-scoped and must not affect contacts owned by other users.

Security-sensitive areas include:

* Contact history access
* Notes access
* Handoff toggle permissions
* Automation pause/resume behavior
* Cross-user inbox isolation

## Testing Sandbox

The automation testing sandbox is designed to simulate events against a user’s flow without sending real messages.

Testing should not:

* Send real Instagram, Facebook, or WhatsApp messages
* Consume real send limits
* Affect unrelated contacts
* Bypass user ownership checks
* Trigger unauthorized automation actions

The sandbox should execute flow logic safely while preserving the same authorization boundaries used by live automation execution.

## Supabase Row Level Security

Row Level Security is a core part of AutoFlow’s security model.

Before deploying to production, verify that:

* RLS is enabled on all user-owned tables
* Policies are user-scoped
* Service-role access is not exposed to the frontend
* Public views expose only safe fields
* RPC functions cannot be called directly unless intentionally designed for client use
* Cross-user isolation tests pass

AutoFlow includes an RLS test suite:

```text
supabase/tests/rls_test_suite.sql
```

Deployment owners should run these tests after database changes.

## Responsible Testing

When testing AutoFlow security, please:

* Use accounts and data you own or have explicit permission to test
* Use a low-traffic test Instagram, Facebook, or WhatsApp account
* Avoid sending messages to real users without consent
* Avoid testing against production accounts you cannot afford to lose access to
* Avoid bypassing Meta, WhatsApp, Supabase, or hosting provider terms
* Respect Meta Platform Terms and WhatsApp Cloud API rules
* Stop testing and report immediately if you gain access to data that does not belong to you

## Beta Notice

AutoFlow is beta software. Bugs, breaking changes, and incomplete features may exist.

Before using AutoFlow in production:

* Review all Supabase RLS policies
* Run the RLS test suite
* Test OAuth and webhook flows
* Confirm secrets are correctly configured
* Confirm webhook signature verification is active
* Confirm webhook replay protection is active
* Test automation send limits and cooldowns
* Review API key scopes and expiry settings
* Review token expiry warnings
* Test the conversation inbox and human handoff flows
* Review legal and privacy obligations for your users

## Deployment Security

AutoFlow includes deployment configuration for common frontend hosting providers.

Security headers and single-page app routing are configured for:

* Cloudflare Pages
* Vercel
* Netlify

Deployment owners should review `DEPLOY.md` before going live.

Recommended deployment checks:

* Confirm HTTPS is enabled
* Confirm security headers are active
* Confirm SPA routing works correctly
* Confirm environment variables are configured only in the hosting provider dashboard
* Confirm secrets are not exposed in frontend bundles
* Confirm Supabase Edge Function secrets are configured separately from frontend variables

## Disclosure Timeline

The maintainer will make a best effort to:

* Acknowledge valid reports promptly
* Investigate and reproduce confirmed issues
* Release a fix for high-impact vulnerabilities as soon as practical
* Credit reporters when requested and appropriate

Because AutoFlow is an open-source beta project, response times may vary.

## Security Updates

Security fixes will be released through GitHub releases.

Users are encouraged to:

* Watch the repository for releases
* Keep their deployment updated
* Rotate secrets periodically
* Review Supabase logs
* Review Meta access logs
* Revoke unused tokens and system users
* Replace long-lived API keys with scoped expiring keys where possible

## Legal and Platform Compliance

AutoFlow uses Meta’s official Graph API and WhatsApp Cloud API.

AutoFlow does not scrape, spoof, automate browsers, or use unofficial Meta, Instagram, Facebook, or WhatsApp endpoints.

Deployment owners and users are responsible for:

* Connecting only accounts they own or are authorized to manage
* Following Meta Platform Terms
* Following WhatsApp Cloud API rules
* Respecting WhatsApp’s messaging windows and template requirements
* Getting consent before messaging users at scale
* Handling personal data lawfully
* Complying with applicable privacy laws, including India’s DPDP Act, GDPR, or other local regulations

## License

AutoFlow is released under the MIT License.
