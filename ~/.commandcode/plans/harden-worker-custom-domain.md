# Plan: Migrate Worker to Custom Domain + Harden + Wire Contact Form

## Summary
Replace the `workers.dev` URL with `https://api.konfido.co.in`, harden the Worker with CORS restriction, API key auth, rate limiting, and server-side validation. Wire up the homepage Contact form to the same endpoint.

---

## Files to Modify

| File | Change |
|---|---|
| `workers/cloudflare-worker/src/index.js` | Major rewrite — add auth, rate limiting, validation, course field |
| `workers/cloudflare-worker/wrangler.toml` | Add SHARED_SECRET env var |
| `src/pages/universities/marwadi.astro` | Update WORKER_URL, add API key header |
| `src/components/Contact.astro` | Add submit handler, success message UI, API key header |
| `DEPLOYMENT_GUIDE.md` | Update Step 6 (custom domain setup), add security section |

---

## 1. Worker Changes (`workers/cloudflare-worker/src/index.js`)

### Add before `export default`:
```
- SHARED_SECRET — env var checked against X-API-Key header
- Rate limit Map: IP → {count, resetTime}, 5 req/min per IP
- CORS origin whitelist: ['https://konfido.co.in', 'http://localhost:4321']
```

### New helper functions:
- **`checkAuth(request, env)`** — read `X-API-Key` header, compare to `env.SHARED_SECRET`, return 401 if mismatch
- **`isRateLimited(request)`** — extract IP from `CF-Connecting-IP` header, check/update Map, return true if rate limited. Cleanup stale entries periodically.
- **`validateInput(formData)`** — returns `{valid, errors}`:
  - name: 2–100 chars, strip HTML tags
  - email: regex validation, max 254 chars
  - phone: strip non-digits, 10–15 digit range
  - course (optional): whitelist array match
  - university (optional): max 100 chars, strip tags
- **`sanitize(str)`** — escape `<`, `>`, `&`, `"`, `'`
- **`getCORSHeaders(origin)`** — return CORS headers only if origin is in whitelist

### Modified flow in `fetch()`:
1. Handle OPTIONS → return CORS preflight (whitelist-aware)
2. Check POST method → 405 otherwise
3. Check auth → 401 if no/invalid API key
4. Rate limit check → 429 if exceeded
5. Parse JSON body → 400 if invalid JSON
6. Validate input → 400 with field-level errors
7. Sanitize all user input before email
8. Send via ZeptoMail → return success/error
9. Add `course` field to email template (conditionally rendered, like `university`)

---

## 2. Worker Config (`workers/cloudflare-worker/wrangler.toml`)

Add to `[vars]`:
```toml
SHARED_SECRET = "generate-a-random-32-char-string-here"
```

> **After deploy, replace with `wrangler secret put SHARED_SECRET`** to keep it out of git.

---

## 3. Frontend — Marwadi Form (`src/pages/universities/marwadi.astro`)

- Change `WORKER_URL` from `https://konfido-lead-handler.madhukarreddy879.workers.dev` to `https://api.konfido.co.in`
- Add `X-API-Key` header to the fetch call (value: same shared secret, hardcoded — it's a static site, unavoidable but acceptable since it's only in the browser JS)
- Update error handling: show field-specific validation errors if the Worker returns them

---

## 4. Frontend — Contact Form (`src/components/Contact.astro`)

Add a `<script>` block at bottom (before closing `</section>` or after the form):

### Submit handler:
- Prevent default, disable button, show "Sending..."
- Collect: name, email, phone, course (from select), source (window.location.href)
- POST to `https://api.konfido.co.in` with `X-API-Key` header
- On success: hide form, show success message (same pattern as Marwadi)
- On error: show inline error or alert

### New markup needed:
- A `#contactFormSuccess` div (hidden by default) with checkmark icon and "Thank you! We'll contact you within 24 hours."
- Form note text below the success message

### Shared secret:
- Define `WORKER_URL` and `API_KEY` as consts in the script
- These will be duplicated across both forms — acceptable for a static site. Could be extracted to a shared `<script>` or Astro partial later if needed.

---

## 5. Deployment Guide (`DEPLOYMENT_GUIDE.md`)

Update sections:
- **Step 5 (Deploy Worker)**: Add instructions for adding the custom domain route via Cloudflare dashboard or `wrangler routes add api.konfido.co.in/*`
- **Step 6 (Update Astro Form)**: Now references `https://api.konfido.co.in` instead of workers.dev. Mention the `X-API-Key` header.
- **New Security section**: Cover SHARED_SECRET (use wrangler secrets, not wrangler.toml), rate limiting behavior, CORS restriction
- **DNS requirement**: `api.konfido.co.in` must be an A/AAAA/CNAME record proxied through Cloudflare (orange cloud) pointing to Cloudflare's edge

---

## Verification

1. **Local Worker test**: `cd workers/cloudflare-worker && npx wrangler dev` — test with curl:
   ```bash
   # Should fail without API key
   curl -X POST localhost:8787 -H 'Content-Type: application/json' -d '{"name":"Test","email":"t@t.com","phone":"1234567890"}'
   
   # Should succeed with API key
   curl -X POST localhost:8787 -H 'Content-Type: application/json' -H 'X-API-Key: <secret>' -d '{"name":"Test","email":"t@t.com","phone":"1234567890"}'
   
   # Should rate limit after 5 rapid requests
   ```

2. **Frontend**: `npm run dev` → test both forms at `localhost:4321` and `localhost:4321/universities/marwadi`

3. **Production**: After deploying Worker + custom domain route, test `https://api.konfido.co.in` directly, then test live forms on `https://konfido.co.in`
