/**
 * Konfido Lead Handler - Cloudflare Worker
 * Handles form submissions and sends emails via ZeptoMail API
 */

export default {
  async fetch(request, env) {
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return handleCORS();
    }

    // Only accept POST requests
    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    try {
      // Parse form data
      const formData = await request.json();
      
      // Validate required fields
      const { name, email, phone, university } = formData;
      
      if (!name || !email || !phone) {
        return jsonResponse({ 
          success: false, 
          error: 'Missing required fields' 
        }, 400);
      }

      // Send email via ZeptoMail
      const emailSent = await sendEmail(formData, env);

      if (emailSent) {
        return jsonResponse({ 
          success: true, 
          message: 'Lead submitted successfully' 
        });
      } else {
        return jsonResponse({ 
          success: false, 
          error: 'Failed to send email' 
        }, 500);
      }

    } catch (error) {
      console.error('Error processing request:', error);
      return jsonResponse({ 
        success: false, 
        error: 'Internal server error' 
      }, 500);
    }
  }
};

/**
 * Send email via ZeptoMail API
 */
async function sendEmail(formData, env) {
  const { name, email, phone, university, source, submittedAt } = formData;

  // Create email HTML body
  const htmlBody = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #0d2b55 0%, #1a3a6b 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
        .header h1 { margin: 0; font-size: 24px; }
        .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 8px 8px; }
        .field { margin-bottom: 20px; padding: 15px; background: white; border-radius: 6px; border-left: 4px solid #c8102e; }
        .field-label { font-weight: 600; color: #0d2b55; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 5px; }
        .field-value { font-size: 16px; color: #333; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        .badge { display: inline-block; background: #c8102e; color: white; padding: 4px 12px; border-radius: 12px; font-size: 11px; font-weight: 600; margin-bottom: 10px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🎓 New Lead Enquiry</h1>
          <p style="margin: 5px 0 0 0; opacity: 0.9;">Konfido Education & Training</p>
        </div>
        <div class="content">
          <div class="badge">${university || 'General Enquiry'}</div>
          
          <div class="field">
            <div class="field-label">Full Name</div>
            <div class="field-value">${name}</div>
          </div>

          <div class="field">
            <div class="field-label">Email Address</div>
            <div class="field-value"><a href="mailto:${email}" style="color: #c8102e; text-decoration: none;">${email}</a></div>
          </div>

          <div class="field">
            <div class="field-label">Phone Number</div>
            <div class="field-value"><a href="tel:${phone}" style="color: #c8102e; text-decoration: none;">${phone}</a></div>
          </div>

          ${university ? `
          <div class="field">
            <div class="field-label">University Interest</div>
            <div class="field-value">${university}</div>
          </div>
          ` : ''}

          ${source ? `
          <div class="field">
            <div class="field-label">Source Page</div>
            <div class="field-value" style="font-size: 13px; word-break: break-all;">${source}</div>
          </div>
          ` : ''}

          <div class="field">
            <div class="field-label">Submitted At</div>
            <div class="field-value">${new Date(submittedAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</div>
          </div>
        </div>
        <div class="footer">
          <p>This is an automated notification from your website enquiry form.</p>
          <p style="margin-top: 10px;">© ${new Date().getFullYear()} Konfido Education & Training</p>
        </div>
      </div>
    </body>
    </html>
  `;

  // ZeptoMail API request
  const zeptoMailPayload = {
    from: {
      address: env.FROM_EMAIL,
      name: "Konfido Enquiry System"
    },
    to: [{
      email_address: {
        address: env.TO_EMAIL,
        name: "Konfido Team"
      }
    }],
    subject: `New Lead: ${name} - ${university || 'General Enquiry'}`,
    htmlbody: htmlBody
  };

  try {
    const response = await fetch('https://api.zeptomail.com/v1.1/email', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': env.ZEPTOMAIL_API_TOKEN
      },
      body: JSON.stringify(zeptoMailPayload)
    });

    if (response.ok) {
      console.log('Email sent successfully');
      return true;
    } else {
      const errorData = await response.text();
      console.error('ZeptoMail API error:', errorData);
      return false;
    }
  } catch (error) {
    console.error('Error sending email:', error);
    return false;
  }
}

/**
 * Handle CORS preflight requests
 */
function handleCORS() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
    }
  });
}

/**
 * Create JSON response with CORS headers
 */
function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    }
  });
}
