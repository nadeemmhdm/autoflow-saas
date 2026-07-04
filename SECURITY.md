# Security Policy

## Supported Versions

AutoFlow is currently in beta. Security fixes will be applied to the latest beta version only.

| Version        | Supported |
| -------------- | --------- |
| `v0.1.x-beta`  | Yes       |
| Older versions | No        |

## Reporting a Vulnerability

If you discover a security vulnerability in AutoFlow, please report it responsibly.

Do **not** open a public GitHub issue for security vulnerabilities.

Instead, please contact the maintainer privately:

```text
security contact: nadeemmhdm
repository: https://github.com/nadeemmhdm/autoflow-saas
```

When reporting a vulnerability, please include:

* A clear description of the issue
* Steps to reproduce the vulnerability
* The affected component, such as frontend, Supabase database, Edge Function, webhook, OAuth flow, or API key handling
* Any relevant logs, screenshots, or proof-of-concept details
* Suggested fix or mitigation, if available

Please avoid accessing, modifying, deleting, or exfiltrating data that does not belong to you.

## Scope

The following areas are considered in scope:

* Supabase Row Level Security policies
* Supabase database schema and views
* Supabase Edge Functions
* Meta OAuth callback handling
* Instagram/Facebook webhook handling
* WhatsApp webhook handling
* Webhook signature verification
* Access token encryption and storage
* API key hashing and validation
* Audit logging
* Frontend authentication and authorization flows
* Automation execution permissions
* Cross-user data isolation

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

## Security Model

AutoFlow is designed as a self-hosted automation platform. Each deployment owner is responsible for securing their own Supabase project, Meta app, WhatsApp token, frontend hosting provider, and environment variables.

AutoFlow uses the following security controls:

* Row Level Security on all Supabase tables
* User-scoped database access policies
* Encrypted storage for connected Meta access tokens
* AES-256-GCM token encryption using `TOKEN_ENCRYPTION_KEY`
* Webhook signature verification using `X-Hub-Signature-256`
* SHA-256 hashing for platform API keys
* One-time display of raw API keys
* Restricted client-facing database views
* Audit logging for security-relevant actions
* Supabase Edge Function secrets for sensitive configuration

## Secrets and Environment Variables

Never expose the following values in frontend code, public repositories, logs, screenshots, or issue reports:

* `META_APP_SECRET`
* `WHATSAPP_ACCESS_TOKEN`
* `TOKEN_ENCRYPTION_KEY`
* `SUPABASE_SERVICE_ROLE_KEY`
* Any connected Meta or WhatsApp access token
* Raw platform API keys
* Webhook verify tokens

Frontend-safe values may include:

* `VITE_SUPABASE_URL`
* `VITE_SUPABASE_ANON_KEY`
* `VITE_META_APP_ID`

The Supabase anon key is safe to expose only when Row Level Security policies are correctly enabled and tested.

## Webhook Security

AutoFlow webhooks must verify inbound requests before processing events.

The following webhook endpoints are security-sensitive:

```text
/functions/v1/meta-webhook
/functions/v1/whatsapp-webhook
```

Each webhook request should be verified using Meta’s `X-Hub-Signature-256` header and the configured app secret before any payload is trusted or processed.

Requests that fail signature verification should be rejected.

## Token Encryption

Connected account tokens must never be stored in plaintext.

AutoFlow encrypts tokens before storage using `TOKEN_ENCRYPTION_KEY`. The encryption key must be stored only as a Supabase Edge Function secret.

If `TOKEN_ENCRYPTION_KEY` is exposed, rotate the key and re-authorize connected accounts.

## Responsible Testing

When testing AutoFlow security, please:

* Use accounts and data you own or have explicit permission to test
* Use a low-traffic test Instagram, Facebook, or WhatsApp account
* Avoid sending messages to real users without consent
* Avoid testing against production accounts you cannot afford to lose access to
* Respect Meta Platform Terms and WhatsApp Cloud API rules

## Beta Notice

AutoFlow is beta software. Bugs, breaking changes, and incomplete features may exist.

Before using AutoFlow in production:

* Review all Supabase RLS policies
* Test OAuth and webhook flows
* Confirm secrets are correctly configured
* Confirm webhook signature verification is active
* Test automation send limits
* Review legal and privacy obligations for your users

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
* Review Supabase and Meta access logs
* Revoke unused tokens and system users

## License

AutoFlow is released under the MIT License.
