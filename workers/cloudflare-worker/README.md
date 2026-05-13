# Konfido Lead Handler - Cloudflare Worker

This Cloudflare Worker handles form submissions from the Konfido website and sends lead notifications via ZeptoMail API.

## Features

- ✅ Receives form submissions from Astro website
- ✅ Validates required fields (name, email, phone)
- ✅ Sends professional HTML emails via ZeptoMail
- ✅ CORS enabled for cross-origin requests
- ✅ Error handling and logging
- ✅ Beautiful email template with branding

## Setup Instructions

### 1. Install Wrangler CLI

```bash
npm install -g wrangler
```

### 2. Login to Cloudflare

```bash
wrangler login
```

### 3. Update Configuration

Edit `wrangler.toml` and replace the dummy values:

```toml
[vars]
ZEPTOMAIL_API_TOKEN = "Zoho-enczapikey YOUR_ACTUAL_TOKEN_HERE"
TO_EMAIL = "info@konfido.co.in"
FROM_EMAIL = "enquiry@konfido.co.in"
```

### 4. Get Your ZeptoMail API Token

1. Login to [ZeptoMail](https://www.zoho.com/zeptomail/)
2. Go to **Setup** → **SMTP/API**
3. Navigate to the **API** tab
4. Copy your **Send Mail Token**
5. Paste it in `wrangler.toml`

### 5. Deploy to Cloudflare

```bash
cd cloudflare-worker
npm install
wrangler deploy
```

After deployment, you'll get a Worker URL like:
```
https://konfido-lead-handler.YOUR_SUBDOMAIN.workers.dev
```

### 6. Update Astro Form

Update the form submission URL in your Astro page to point to your Worker URL.

## Email Configuration

### Domain Verification (Already Done ✅)
- Domain: `konfido.co.in` - Verified
- Sender: `enquiry@konfido.co.in` - Verified
- Recipient: `info@konfido.co.in`

## Testing Locally

```bash
wrangler dev
```

This starts a local development server at `http://localhost:8787`

## API Endpoint

### POST /

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "9876543210",
  "university": "Marwadi University",
  "source": "https://konfido.co.in/universities/marwadi",
  "submittedAt": "2025-01-15T10:30:00.000Z"
}
```

**Success Response:**
```json
{
  "success": true,
  "message": "Lead submitted successfully"
}
```

**Error Response:**
```json
{
  "success": false,
  "error": "Missing required fields"
}
```

## Email Template

The worker sends a beautifully formatted HTML email with:
- Professional header with Konfido branding
- All lead details in organized fields
- University badge
- Clickable email and phone links
- Timestamp in IST timezone
- Responsive design

## Security

- API token stored as environment variable
- CORS enabled for your domain
- Input validation
- Error handling

## Monitoring

View logs in Cloudflare Dashboard:
1. Go to **Workers & Pages**
2. Select **konfido-lead-handler**
3. Click **Logs** tab

## Support

For issues or questions, contact your development team.
