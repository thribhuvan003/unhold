# Deployment environment reference

Use [`.env.example`](../.env.example) as the canonical list of supported keys. Create values directly in
the provider dashboard or in an untracked `.env.local`; never create or commit a filled paste template.

## Required for the core workflow

| Key                             | Purpose                                                             |
| ------------------------------- | ------------------------------------------------------------------- |
| `NEXT_PUBLIC_APP_URL`           | Canonical application origin, for example `https://www.unhold.live` |
| `NEXT_PUBLIC_APP_ENV`           | `production`, `preview`, or `local`                                 |
| `NEXT_PUBLIC_SUPABASE_URL`      | Supabase project URL; safe to expose to the browser                 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase publishable/anon key used for authentication only          |
| `SUPABASE_SERVICE_ROLE_KEY`     | Server-only data access; never use in browser code                  |
| `GUEST_JWT_SECRET`              | At least 32 random bytes for guest-session signing                  |
| `CRON_SECRET`                   | At least 32 random bytes for scheduled internal routes              |
| `GROQ_API_KEYS`                 | Primary text and vision inference; comma-separated rotation pool    |
| `NVIDIA_API_KEYS`               | Retrieval embeddings and model fallback; comma-separated pool       |
| `UPSTASH_REDIS_REST_URL`        | Distributed rate limits and locks                                   |
| `UPSTASH_REDIS_REST_TOKEN`      | Server-only Upstash token                                           |

Generate signing secrets locally with a cryptographically secure generator, for example
`openssl rand -base64 32`. Use different values for `GUEST_JWT_SECRET` and `CRON_SECRET`.

## Optional integrations

- `RESEND_*`: email deadline reminders.
- `TWILIO_*`: user-requested WhatsApp/SMS reminders and recovery messages.
- `SUPERMEMORY_*`: optional memory integration; not interchangeable with NVIDIA credentials.

## Deployment checks

1. Add secrets separately for Preview and Production in Vercel.
2. Keep service-role, signing, provider, Redis, messaging, and billing credentials server-only.
3. Set Supabase Auth Site URL and allowed redirects to the deployed application origin.
4. Configure the two external GitHub Actions cron secrets documented in
   [`docs/DEPLOY_VERCEL_HOBBY.md`](../docs/DEPLOY_VERCEL_HOBBY.md).
5. After any suspected exposure, rotate the credential at its provider; deleting it from the current
   source tree is not sufficient because Git history and existing clones may retain it.
