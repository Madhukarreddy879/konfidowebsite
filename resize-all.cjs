const sharp = require('sharp');
const fs = require('fs');

async function resizeImage(input, output, width, height) {
  const info = await sharp(input).metadata();
  console.log(`${input}: ${info.width}x${info.height} → ${width}x${height || 'auto'}`);
  
  await sharp(input)
    .resize(width, height, { 
      fit: 'inside',
      withoutEnlargement: false
    })
    .webp({ quality: 85, effort: 6 })
    .toFile(output);
  
  const originalSize = fs.statSync(input).size;
  const newSize = fs.statSync(output).size;
  console.log(`  ${(originalSize/1024).toFixed(1)}KB → ${(newSize/1024).toFixed(1)}KB`);
}

async function main() {
  // Logo: displayed at 137x54, make it 2x for retina (274x108)
  await resizeImage('public/logo.png', 'public/logo.webp', 274, 108);
  
  // Company logos: displayed at 150x70, make them 300x140 for retina
  const logos = ['amazon', 'tcs', 'congz', 'adani', 'google', 'wipro'];
  for (const logo of logos) {
    await resizeImage(`public/companylogos/${logo}.png`, `public/companylogos/${logo}.webp`, 300, 140);
  }
  
  // Accreditation badges: displayed at 200x90, make them 400x180 for retina
  const accreds = ['naac', 'nirf', 'nba', 'no1_g', 'ranking_w'];
  for (const accred of accreds) {
    await resizeImage(`public/accred/${accred}.png`, `public/accred/${accred}.webp`, 400, 180);
  }
  
  console.log('\nDone!');
}

main().catch(console.error);
