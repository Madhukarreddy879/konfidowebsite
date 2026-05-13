/**
 * Konfido Lead Handler - Cloudflare Worker
 * Handles form submissions and sends emails via ZeptoMail API
 * 
 * Security: API key auth, IP-based rate limiting, origin-restricted CORS,
 *            server-side input validation, and HTML sanitization.
 */

// --- Rate Limiter ---
const RATE_LIMIT_WINDOW = 60_000;       // 1 minute
const RATE_LIMIT_MAX = 5;               // 5 requests per window
const RATE_LIMIT_CLEANUP = 300_000;     // Cleanup stale entries every 5 min
const rateLimitMap = new Map();
let lastCleanup = Date.now();

// --- CORS ---
const ALLOWED_ORIGINS = [
  'https://konfido.co.in',
  'https://www.konfido.co.in',
  'http://localhost:4321',
];

// --- Course Whitelist ---
const ALLOWED_COURSES = [
  'Engineering (B.Tech)',
  'Management (MBA/BBA)',
  'Medical / Para-Medical',
  'Law',
  'Arts & Science',
  'Other',
];

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';
    const corsHeaders = corsHeadersFor(origin);

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    // Only accept POST
    if (request.method !== 'POST') {
      return jsonResponse({ success: false, error: 'Method not allowed' }, 405, corsHeaders);
    }

    // Auth: check X-API-Key header
    if (!checkAuth(request, env)) {
      return jsonResponse({ success: false, error: 'Unauthorized' }, 401, corsHeaders);
    }

    // Rate limit by IP
    if (isRateLimited(request)) {
      return jsonResponse({ success: false, error: 'Too many requests. Please try again later.' }, 429, corsHeaders);
    }

    // Parse body
    let formData;
    try {
      formData = await request.json();
    } catch {
      return jsonResponse({ success: false, error: 'Invalid JSON' }, 400, corsHeaders);
    }

    // Validate
    const { valid, errors } = validateInput(formData);
    if (!valid) {
      return jsonResponse({ success: false, error: 'Validation failed', errors }, 400, corsHeaders);
    }

    // Sanitize
    const clean = sanitizeForm(formData);

    // Send email
    const emailSent = await sendEmail(clean, env);

    if (emailSent) {
      return jsonResponse({ success: true, message: 'Lead submitted successfully' }, 200, corsHeaders);
    }
    return jsonResponse({ success: false, error: 'Failed to send email' }, 500, corsHeaders);
  }
};

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------
function checkAuth(request, env) {
  const key = request.headers.get('X-API-Key');
  return key && key === env.SHARED_SECRET;
}

// ---------------------------------------------------------------------------
// Rate Limiting (in-memory, per isolate — good enough for low-traffic site)
// ---------------------------------------------------------------------------
function isRateLimited(request) {
  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  const now = Date.now();

  // Periodic cleanup of stale entries
  if (now - lastCleanup > RATE_LIMIT_CLEANUP) {
    for (const [key, entry] of rateLimitMap) {
      if (now > entry.windowEnd) rateLimitMap.delete(key);
    }
    lastCleanup = now;
  }

  const entry = rateLimitMap.get(ip);

  // First request or window expired
  if (!entry || now > entry.windowEnd) {
    rateLimitMap.set(ip, { count: 1, windowEnd: now + RATE_LIMIT_WINDOW });
    return false;
  }

  // Within window
  entry.count++;
  if (entry.count > RATE_LIMIT_MAX) {
    return true;
  }
  return false;
}

// ---------------------------------------------------------------------------
// Input Validation
// ---------------------------------------------------------------------------
function validateInput(data) {
  const errors = {};

  const name = (data.name || '').trim();
  if (!name || name.length < 2 || name.length > 100) {
    errors.name = 'Name must be between 2 and 100 characters';
  }

  const email = (data.email || '').trim();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email || !emailRegex.test(email) || email.length > 254) {
    errors.email = 'A valid email address is required';
  }

  const phoneRaw = (data.phone || '').replace(/\D/g, '');
  if (!phoneRaw || phoneRaw.length < 10 || phoneRaw.length > 15) {
    errors.phone = 'A valid phone number is required (10-15 digits)';
  }

  // Optional: course (whitelist check)
  if (data.course && !ALLOWED_COURSES.includes(data.course)) {
    errors.course = 'Invalid course selection';
  }

  // Optional: university (max length)
  if (data.university && data.university.length > 100) {
    errors.university = 'University name is too long';
  }

  return { valid: Object.keys(errors).length === 0, errors };
}

// ---------------------------------------------------------------------------
// Sanitize
// ---------------------------------------------------------------------------
function sanitize(str) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function sanitizeForm(data) {
  return {
    name: sanitize(data.name),
    email: sanitize(data.email),
    phone: sanitize(data.phone),
    phoneRaw: (data.phone || '').replace(/\D/g, ''),
    university: sanitize(data.university || ''),
    course: sanitize(data.course || ''),
    source: sanitize(data.source || ''),
    submittedAt: data.submittedAt || new Date().toISOString(),
  };
}

// ---------------------------------------------------------------------------
// Email via ZeptoMail
// ---------------------------------------------------------------------------
async function sendEmail(formData, env) {
  const { name, email, phoneRaw, university, course, source, submittedAt } = formData;

  // Determine label: course (contact form) or university (marwadi form)
  const leadType = course || university || 'General Enquiry';
  const leadLabel = course ? 'Stream of Interest' : (university ? 'University Interest' : 'Source');
  const hasSource = source && source !== '';

  const htmlBody = `<!DOCTYPE html>
<html>
<head>
<style>
body{font-family:Arial,Helvetica,sans-serif;line-height:1.6;color:#333}
.container{max-width:600px;margin:0 auto;padding:20px}
.header{background:#0d2b55;color:#fff;padding:30px;text-align:center;border-radius:8px 8px 0 0}
.header h1{margin:0;font-size:24px}
.content{background:#f8f9fa;padding:30px;border-radius:0 0 8px 8px}
.field{margin-bottom:20px;padding:15px;background:#fff;border-radius:6px;border-left:4px solid #c8102e}
.field-label{font-weight:600;color:#0d2b55;font-size:12px;text-transform:uppercase;letter-spacing:.5px;margin-bottom:5px}
.field-value{font-size:16px;color:#333}
.footer{text-align:center;padding:20px;color:#666;font-size:12px}
.badge{display:inline-block;background:#c8102e;color:#fff;padding:4px 12px;border-radius:12px;font-size:11px;font-weight:600;margin-bottom:10px}
</style>
</head>
<body>
<div class="container">
<div class="header">
<h1>&#x1F393; New Lead Enquiry</h1>
<p style="margin:5px 0 0 0;opacity:.9">Konfido Education &amp; Training</p>
</div>
<div class="content">
<div class="badge">${leadType}</div>

<div class="field">
<div class="field-label">Full Name</div>
<div class="field-value">${name}</div>
</div>

<div class="field">
<div class="field-label">Email Address</div>
<div class="field-value"><a href="mailto:${email}" style="color:#c8102e;text-decoration:none">${email}</a></div>
</div>

<div class="field">
<div class="field-label">Phone Number</div>
<div class="field-value"><a href="tel:${phoneRaw}" style="color:#c8102e;text-decoration:none">${phoneRaw}</a></div>
</div>

${course ? `<div class="field">
<div class="field-label">Stream of Interest</div>
<div class="field-value">${course}</div>
</div>` : ''}

${university ? `<div class="field">
<div class="field-label">University Interest</div>
<div class="field-value">${university}</div>
</div>` : ''}

${hasSource ? `<div class="field">
<div class="field-label">Source Page</div>
<div class="field-value" style="font-size:13px;word-break:break-all">${source}</div>
</div>` : ''}

<div class="field">
<div class="field-label">Submitted At</div>
<div class="field-value">${new Date(submittedAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</div>
</div>
</div>
<div class="footer">
<p>Automated notification from your website enquiry form.</p>
<p style="margin-top:10px">&copy; ${new Date().getFullYear()} Konfido Education &amp; Training</p>
</div>
</div>
</body>
</html>`;

  try {
    const response = await fetch('https://api.zeptomail.in/v1.1/email', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': env.ZEPTOMAIL_API_TOKEN,
      },
      body: JSON.stringify({
        from: {
          address: env.FROM_EMAIL,
          name: 'Konfido Enquiry System',
        },
        to: [{
          email_address: {
            address: env.TO_EMAIL,
            name: 'Konfido Team',
          }
        }],
        subject: `New Lead: ${name} - ${leadType}`,
        htmlbody: htmlBody,
      }),
    });

    if (response.ok) {
      console.log('Email sent successfully');
      return true;
    }
    const errorData = await response.text();
    console.error('ZeptoMail API error:', errorData);
    return false;
  } catch (error) {
    console.error('Error sending email:', error);
    return false;
  }
}

// ---------------------------------------------------------------------------
// CORS Helpers
// ---------------------------------------------------------------------------
function corsHeadersFor(origin) {
  if (ALLOWED_ORIGINS.includes(origin)) {
    return {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, X-API-Key',
      'Access-Control-Max-Age': '86400',
    };
  }
  // No origin match — return minimal headers, browser will block
  return {};
}

// ---------------------------------------------------------------------------
// Response Helper
// ---------------------------------------------------------------------------
function jsonResponse(data, status, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...extraHeaders,
    },
  });
}
