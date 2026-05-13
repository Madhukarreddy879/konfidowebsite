# Konfido Lead Integration - Deployment Guide

Complete guide to deploy the Cloudflare Worker + ZeptoMail integration for capturing leads.

---

## 📋 Prerequisites Checklist

- [x] Domain verified in ZeptoMail: `konfido.co.in`
- [x] Sender email verified: `enquiry@konfido.co.in`
- [ ] ZeptoMail API Token obtained
- [ ] Cloudflare account created
- [ ] Wrangler CLI installed

---

## 🚀 Step-by-Step Deployment

### Step 1: Get ZeptoMail API Token

1. Login to [ZeptoMail Dashboard](https://www.zoho.com/zeptomail/)
2. Navigate to **Setup** → **SMTP/API**
3. Click on the **API** tab
4. Copy your **Send Mail Token** (starts with `Zoho-enczapikey`)
5. Keep it safe - you'll need it in Step 3

### Step 2: Install Wrangler CLI

```bash
# Install globally
npm install -g wrangler

# Or use npx (no installation needed)
npx wrangler --version
```

### Step 3: Configure the Worker

1. Open `cloudflare-worker/wrangler.toml`
2. Replace the dummy token with your real token:

```toml
[vars]
ZEPTOMAIL_API_TOKEN = "Zoho-enczapikey YOUR_ACTUAL_TOKEN_HERE"
TO_EMAIL = "info@konfido.co.in"
FROM_EMAIL = "enquiry@konfido.co.in"
```

### Step 4: Login to Cloudflare

```bash
cd cloudflare-worker
wrangler login
```

This will open a browser window to authenticate.

### Step 5: Deploy the Worker

```bash
# Install dependencies
npm install

# Deploy to Cloudflare
wrangler deploy
```

After deployment, you'll see output like:
```
✨ Successfully published your Worker
🌍 https://konfido-lead-handler.YOUR_SUBDOMAIN.workers.dev
```

**Copy this URL** - you'll need it for Step 6.

### Step 6: Update Astro Form

1. Open `konfido-site/src/pages/universities/marwadi.astro`
2. Find this line in the `<script>` section:

```javascript
const WORKER_URL = 'https://konfido-lead-handler.YOUR_SUBDOMAIN.workers.dev';
```

3. Replace it with your actual Worker URL from Step 5

### Step 7: Deploy Astro Site

```bash
cd konfido-site

# Build the site
npm run build

# Deploy to your hosting (Vercel/Netlify/Cloudflare Pages)
# Example for Cloudflare Pages:
npx wrangler pages deploy dist
```

---

## ✅ Testing

### Test the Worker Directly

```bash
curl -X POST https://YOUR_WORKER_URL \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test@example.com",
    "phone": "9876543210",
    "university": "Marwadi University",
    "source": "https://konfido.co.in/universities/marwadi",
    "submittedAt": "2025-01-15T10:30:00.000Z"
  }'
```

Expected response:
```json
{
  "success": true,
  "message": "Lead submitted successfully"
}
```

### Test the Form

1. Visit your deployed site
2. Go to `/universities/marwadi`
3. Fill out the enquiry form
4. Submit
5. Check `info@konfido.co.in` for the email

---

## 📧 Email Template Preview

The email sent to `info@konfido.co.in` will look like:

```
┌─────────────────────────────────────┐
│   🎓 New Lead Enquiry               │
│   Konfido Education & Training      │
├─────────────────────────────────────┤
│                                     │
│   [Marwadi University]              │
│                                     │
│   Full Name                         │
│   John Doe                          │
│                                     │
│   Email Address                     │
│   john@example.com                  │
│                                     │
│   Phone Number                      │
│   9876543210                        │
│                                     │
│   University Interest               │
│   Marwadi University                │
│                                     │
│   Source Page                       │
│   https://konfido.co.in/...         │
│                                     │
│   Submitted At                      │
│   15/01/2025, 4:00:00 PM IST        │
│                                     │
└─────────────────────────────────────┘
```

---

## 🔧 Troubleshooting

### Issue: "Authorization failed"
**Solution**: Check your ZeptoMail API token in `wrangler.toml`

### Issue: "Email not received"
**Solution**: 
1. Check ZeptoMail dashboard for delivery status
2. Verify `enquiry@konfido.co.in` is verified
3. Check spam folder in `info@konfido.co.in`

### Issue: "CORS error"
**Solution**: Worker already has CORS enabled. Check browser console for actual error.

### Issue: "Worker not found"
**Solution**: Make sure you deployed with `wrangler deploy` and updated the URL in Astro

---

## 📊 Monitoring

### View Worker Logs

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Navigate to **Workers & Pages**
3. Click on **konfido-lead-handler**
4. Go to **Logs** tab

### Check Email Delivery

1. Login to [ZeptoMail Dashboard](https://www.zoho.com/zeptomail/)
2. Go to **Reports** → **Email Logs**
3. Filter by date/recipient

---

## 🔐 Security Best Practices

1. **Never commit** your real API token to Git
2. Use Cloudflare **Secrets** for production:
   ```bash
   wrangler secret put ZEPTOMAIL_API_TOKEN
   ```
3. Enable **rate limiting** in Cloudflare if needed
4. Monitor logs for suspicious activity

---

## 📝 Next Steps

1. ✅ Deploy Worker
2. ✅ Update Astro form URL
3. ✅ Test submission
4. ✅ Verify email received
5. 🔄 Replicate for other university pages (NIMS, SGVU, KARE)
6. 📊 Set up analytics tracking
7. 🎨 Customize email template if needed

---

## 🆘 Support

If you encounter issues:
1. Check the troubleshooting section above
2. Review Worker logs in Cloudflare Dashboard
3. Check ZeptoMail email logs
4. Contact your development team

---

## 📚 Resources

- [Cloudflare Workers Docs](https://developers.cloudflare.com/workers/)
- [ZeptoMail API Docs](https://www.zoho.com/zeptomail/help/api-index.html)
- [Wrangler CLI Docs](https://developers.cloudflare.com/workers/wrangler/)

---

**Last Updated**: January 2025
**Version**: 1.0.0
