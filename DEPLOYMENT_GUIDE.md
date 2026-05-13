# Konfido Lead Integration - Deployment Guide

Complete guide to deploy the Cloudflare Worker + ZeptoMail integration for capturing leads.

---

## 📋 Prerequisites Checklist

- [x] Domain verified in ZeptoMail: `konfido.co.in`
- [x] Sender email verified: `enquiry@konfido.co.in`
- [x] Custom domain `api.konfido.co.in` added to Cloudflare (DNS proxied / orange-cloud)
- [ ] ZeptoMail API Token obtained
- [ ] Cloudflare account with access to `konfido.co.in` zone
- [ ] Wrangler CLI installed

---

## 🚀 Step-by-Step Deployment

### Step 1: Get ZeptoMail API Token

1. Login to [ZeptoMail Dashboard](https://www.zoho.com/zeptomail/)
2. Navigate to **Setup** → **SMTP/API**
3. Click on the **API** tab
4. Copy your **Send Mail Token** (starts with `Zoho-enczapikey`)
5. Keep it safe — you'll need it in Step 3

### Step 2: Install Wrangler CLI

```bash
npm install -g wrangler
wrangler --version
```

### Step 3: Configure Secrets

```bash
cd workers/cloudflare-worker

# Store sensitive values as encrypted secrets (NOT in wrangler.toml)
wrangler secret put ZEPTOMAIL_API_TOKEN
wrangler secret put SHARED_SECRET
```

Generate a random 32-character string for `SHARED_SECRET`:
```bash
node -e "console.log(require('crypto').randomBytes(16).toString('hex'))"
```

Then update `.env` in the project root with the same value:
```
PUBLIC_API_KEY=your-generated-32-char-secret
```

This single `.env` file feeds both forms — the Contact form and the Marwadi enquiry form — via `import.meta.env.PUBLIC_API_KEY`. No duplicate copies needed.

The `TO_EMAIL` and `FROM_EMAIL` vars can stay in `wrangler.toml` (they're not sensitive).

### Step 4: Login to Cloudflare

```bash
wrangler login
```

### Step 5: Deploy the Worker + Set Up Custom Domain

```bash
# Install dependencies
cd workers/cloudflare-worker
npm install

# Deploy the Worker
wrangler deploy
```

After deploying, add the custom domain route in the Cloudflare Dashboard:

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/) → your zone (`konfido.co.in`)
2. Navigate to **DNS** → **Records**
3. Ensure `api.konfido.co.in` is a proxied (orange-cloud) A/AAAA/CNAME record pointing to any IP (e.g., `192.0.2.1`) — Cloudflare only needs it proxied
4. Navigate to **Workers Routes** (or Workers & Pages → konfido-lead-handler → Triggers → Routes)
5. Add route: `api.konfido.co.in/*` → select `konfido-lead-handler`

Or via CLI:
```bash
wrangler routes add api.konfido.co.in/*
```

### Step 6: Verify Frontend Config

The frontend already points to `https://api.konfido.co.in`. Just make sure `.env` has your real key:

```
PUBLIC_API_KEY=your-generated-32-char-secret
```

This value is used by both `src/pages/universities/marwadi.astro` and `src/components/Contact.astro` via `import.meta.env.PUBLIC_API_KEY` — no duplicate copies to maintain.

### Step 7: Deploy Astro Site

```bash
cd konfido-site
npm run build

# Deploy to Cloudflare Pages
npx wrangler pages deploy dist
```

---

## ✅ Testing

### Test the Worker Directly

```bash
# Should FAIL without API key
curl -X POST https://api.konfido.co.in \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","email":"test@example.com","phone":"9876543210","university":"Marwadi University"}'

# Should SUCCEED with API key
curl -X POST https://api.konfido.co.in \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-generated-32-char-secret" \
  -d '{
    "name": "Test User",
    "email": "test@example.com",
    "phone": "9876543210",
    "university": "Marwadi University"
  }'

# Should FAIL after 5 rapid requests (rate limit)
for i in {1..6}; do
  curl -X POST https://api.konfido.co.in \
    -H "Content-Type: application/json" \
    -H "X-API-Key: your-generated-32-char-secret" \
    -d '{"name":"T","email":"t@t.com","phone":"1234567890"}' &
done
```

Expected responses:
- No API key → `401 {"success":false,"error":"Unauthorized"}`
- Valid request → `200 {"success":true,"message":"Lead submitted successfully"}`
- Rate limited → `429 {"success":false,"error":"Too many requests. Please try again later."}`
- Bad input → `400 {"success":false,"error":"Validation failed","errors":{...}}`

### Test Both Forms

1. Visit `https://konfido.co.in` → fill out and submit the Contact form
2. Visit `https://konfido.co.in/universities/marwadi` → fill out and submit the Enquiry form
3. Check `info@konfido.co.in` for both emails

---

## 🔐 Security Architecture

| Layer | Implementation |
|---|---|
| **Auth** | `X-API-Key` header checked against `SHARED_SECRET` (encrypted via `wrangler secrets`) |
| **CORS** | Restricted to `https://konfido.co.in`, `https://www.konfido.co.in`, and `http://localhost:4321` (dev) |
| **Rate Limit** | 5 requests per IP per 60 seconds (in-memory per Worker isolate) |
| **Input Validation** | Server-side: name (2-100 chars), email (regex + len), phone (10-15 digits), course (whitelist) |
| **HTML Sanitize** | All user input escaped before embedding in email HTML body |
| **Secrets** | API tokens stored via `wrangler secret put`, never committed to git |

### Important Notes

- The `API_KEY` value is **visible in the browser** since the Astro site is static. This is acceptable — it prevents other websites from calling your Worker directly, but an attacker could extract it from your site's JS. The rate limiter + CORS provide defense-in-depth.
- For production, consider moving the key to a backend or using Cloudflare Access/Zero Trust if you need stronger auth.
- Rate limiting is **per Worker isolate** (not global). For a low-traffic marketing site this is fine. If you need global limits, use Cloudflare KV or Durable Objects.

---

## 📧 Email Template

Emails include:
- University or Course name as a badge
- Full name, email (mailto link), phone (tel link)
- Source page URL
- Submission timestamp (IST timezone)

---

## 🔧 Troubleshooting

| Issue | Solution |
|---|---|
| 401 Unauthorized | Check `X-API-Key` header matches `SHARED_SECRET` in Worker |
| 429 Rate Limited | Wait 60 seconds. Increase limit in Worker if needed. |
| CORS error | Verify request `Origin` is in the allowed origins list |
| Email not received | Check ZeptoMail dashboard, verify sender is verified, check spam |
| Custom domain not resolving | Ensure DNS is proxied (orange cloud) in Cloudflare, route is configured |
| Worker not found on route | Verify the Worker Route is correctly set up for `api.konfido.co.in/*` |

---

## 📊 Monitoring

### Worker Logs
1. [Cloudflare Dashboard](https://dash.cloudflare.com/) → **Workers & Pages** → `konfido-lead-handler` → **Logs**

### Email Delivery
1. [ZeptoMail Dashboard](https://www.zoho.com/zeptomail/) → **Reports** → **Email Logs**

---

## 📚 Resources

- [Cloudflare Workers Docs](https://developers.cloudflare.com/workers/)
- [Cloudflare Worker Routes](https://developers.cloudflare.com/workers/configuration/routing/routes/)
- [ZeptoMail API Docs](https://www.zoho.com/zeptomail/help/api-index.html)
- [Wrangler CLI Docs](https://developers.cloudflare.com/workers/wrangler/)

---

**Last Updated**: May 2026
**Version**: 2.0.0
