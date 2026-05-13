const sharp = require('sharp');
const fs = require('fs');

const images = [
  'public/logos/marwadi.png',
  'public/logos/nims.png',
  'public/logos/sgvu.png'
];

async function convert() {
  for (const img of images) {
    const output = img.replace('.png', '.webp');
    const originalSize = fs.statSync(img).size;
    
    await sharp(img)
      .webp({ quality: 80 })
      .toFile(output);
    
    const newSize = fs.statSync(output).size;
    const savings = ((originalSize - newSize) / originalSize * 100).toFixed(1);
    
    console.log(`✓ ${img}: ${(originalSize/1024).toFixed(1)}KB → ${(newSize/1024).toFixed(1)}KB (${savings}% reduction)`);
  }
}

convert().catch(console.error);
