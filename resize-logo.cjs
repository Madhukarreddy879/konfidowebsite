const sharp = require('sharp');
const fs = require('fs');

// Resize to 2x display size for retina (500px width)
async function resizeLogo() {
  const input = 'public/logos/marwadi.png';
  const output = 'public/logos/marwadi.webp';
  
  const originalSize = fs.statSync(input).size;
  
  await sharp(input)
    .resize(500, null, { 
      withoutEnlargement: false,
      fit: 'inside'
    })
    .webp({ quality: 85, effort: 6 })
    .toFile(output);
  
  const newSize = fs.statSync(output).size;
  const savings = ((originalSize - newSize) / originalSize * 100).toFixed(1);
  
  console.log(`✓ Resized marwadi logo:`);
  console.log(`  Original: ${(originalSize/1024).toFixed(0)}KB PNG (11495x3719)`);
  console.log(`  New: ${(newSize/1024).toFixed(1)}KB WebP (500px width)`);
  console.log(`  Reduction: ${savings}%`);
}

resizeLogo().catch(console.error);
