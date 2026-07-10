# Connect Unhold services (Twilio · Resend · Vercel)

Local secrets live in **`D:\unhold\.env.local`** (never commit).  
Vercel import file (generated from that): **`D:\unhold-env-backup\vercel-import.env`**

## Status after agent wiring

| Service | Local `.env.local` | Vercel Production | Notes |
|---------|--------------------|-------------------|--------|
| **Twilio** | ✅ SID + Auth Token + SMS From + WA From | ⬜ paste import file | API check returned **200**. Trial: only verified destinations. |
| **Resend** | ⬜ need API key | ⬜ | New account — create key in dashboard |
| **Supabase / Groq / NVIDIA / Upstash** | ✅ most keys present | ⬜ paste import file | From previous setup |
| **Vercel CLI** | ⬜ run `vercel login` | — | CLI token was invalid |

## 1. Twilio (done locally)

Already written from your console (Account **My first Twilio account**):

- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_SMS_FROM` = trial US number
- `TWILIO_WHATSAPP_FROM` = `whatsapp:+14155238886` (sandbox)

**You still must:**

1. WhatsApp: message sandbox `+1 415 523 8886` with the join code from Twilio → Messaging → Try WhatsApp  
2. Verify your Indian mobile under Phone Numbers → **Verified Caller IDs** (trial SMS/calls only go there)  
3. In app: case → Deadline reminders → WhatsApp → Save → **Send test WhatsApp**

## 2. Resend (new account — 2 minutes)

1. Open https://resend.com → sign up / log in (Google or GitHub)  
2. **API Keys** → Create → name `unhold` → copy `re_…`  
3. Add to `D:\unhold\.env.local`:

```env
RESEND_API_KEY=re_...
RESEND_FROM_EMAIL=onboarding@resend.dev
```

(`onboarding@resend.dev` only delivers to **your** Resend login email until you verify a domain.)

4. Re-run generator (optional): after saving `.env.local`, regenerate Vercel import (ask the agent or re-run the sync steps).

## 3. Vercel (empty env → full import)

### Option A — Dashboard (easiest)

1. Open https://vercel.com → log in → project **unhold** (or create/link)  
2. **Settings → Environment Variables → Import .env**  
3. Select file: `D:\unhold-env-backup\vercel-import.env`  
4. Environments: **Production** + **Preview**  
5. **Deployments → Redeploy** latest production

### Option B — CLI

```powershell
cd D:\unhold
vercel login
vercel link
# then for each key, or use dashboard import — CLI bulk import varies by version
```

## 4. After import — feature map

| User feature | Needs |
|--------------|--------|
| Case create / guest / recovery | Supabase + `GUEST_JWT_SECRET` |
| AI letters / OCR | Groq (+ NVIDIA embeddings for RAG) |
| Deadline email | Resend |
| Deadline WhatsApp | Twilio + sandbox join |
| Recovery SMS | Twilio SMS + verified number |
| Cron reminders | `CRON_SECRET` + Vercel cron routes |

## 5. Security

- Never commit `.env.local` or `vercel-import.env`  
- Auth tokens shown in automation snapshots should be rotated if the machine is shared  
- Twilio trial ≠ production WhatsApp Business sender
