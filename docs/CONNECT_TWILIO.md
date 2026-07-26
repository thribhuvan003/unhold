# Connect Twilio to Unhold (WhatsApp + SMS)

Code is already wired. Connection fails only when **Auth Token is missing** or sandbox is not joined.

## 1. Local `.env.local` (`D:\unhold`)

```env
TWILIO_ACCOUNT_SID=ACxxxxxxxx   # from Twilio Console → Account info
TWILIO_AUTH_TOKEN=               # show Auth Token → paste here (never commit)
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886   # sandbox default
# Optional SMS from-number (E.164). Trial needs verified destination numbers.
TWILIO_SMS_FROM=
```

Restart after editing: stop `pnpm dev`, run `pnpm dev` again.

## 2. WhatsApp Sandbox (once)

1. Twilio Console → Messaging → Try it out → WhatsApp  
2. From your phone, message the sandbox number  
3. Send the join code shown (e.g. `join something`)  
4. Within 24h of your last message you can receive freeform replies

## 3. In the app

1. Open a case → **Deadline reminders**  
2. Tick WhatsApp → enter 10-digit mobile → **Save**  
3. Tap **Send test WhatsApp now**  
4. Check phone

## 4. Vercel Production

Add the same three `TWILIO_*` keys under Project → Settings → Environment Variables → Production.  
For real India traffic later: register a WhatsApp Business sender (sandbox is trial-only).

## 5. Invariants

- Messages go **only to the user** (reminders / recovery / connection test)  
- **Never** to banks, police, or GRM  
- Letters stay **copy/send yourself**
