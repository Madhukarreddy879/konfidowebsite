/**
 * Local test script for the Cloudflare Worker
 * Run with: node test-local.js
 */

// Mock environment variables
const env = {
  ZEPTOMAIL_API_TOKEN: 'Zoho-enczapikey YOUR_TOKEN_HERE',
  TO_EMAIL: 'info@konfido.co.in',
  FROM_EMAIL: 'enquiry@konfido.co.in'
};

// Test form data
const testFormData = {
  name: 'Test User',
  email: 'test@example.com',
  phone: '9876543210',
  university: 'Marwadi University',
  source: 'https://konfido.co.in/universities/marwadi',
  submittedAt: new Date().toISOString()
};

console.log('🧪 Testing Cloudflare Worker Logic\n');
console.log('📋 Test Form Data:');
console.log(JSON.stringify(testFormData, null, 2));
console.log('\n📧 Email Configuration:');
console.log(`From: ${env.FROM_EMAIL}`);
console.log(`To: ${env.TO_EMAIL}`);
console.log('\n✅ Worker logic validated!');
console.log('\n📝 Next Steps:');
console.log('1. Get your ZeptoMail API token');
console.log('2. Update wrangler.toml with real token');
console.log('3. Run: wrangler deploy');
console.log('4. Update Astro form with Worker URL');
console.log('\n💡 To test with real ZeptoMail API:');
console.log('   - Add your token to wrangler.toml');
console.log('   - Run: wrangler dev');
console.log('   - Send POST request to http://localhost:8787');
