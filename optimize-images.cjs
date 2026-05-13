const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const PUBLIC_DIR = path.join(__dirname, 'public');

// Find all PNG files recursively
function findPngFiles(dir, files = []) {
  const items = fs.readdirSync(dir);
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      findPngFiles(fullPath, files);
    } else if (item.endsWith('.png')) {
      files.push(fullPath);
    }
  }
  return files;
}

async function optimizeImage(inputPath) {
  const outputPath = inputPath.replace('.png', '.webp');
  const filename = path.basename(inputPath);
  
  try {
    // Get original file size
    const originalStat = fs.statSync(inputPath);
    const originalSize = originalStat.size;
    
    // Convert to WebP with quality 80 (good balance between quality and size)
    await sharp(inputPath)
      .webp({ 
        quality: 80,
        effort: 6 // compression effort (0-6, higher = smaller file but slower)
      })
      .toFile(outputPath);
    
    // Get new file size
    const newStat = fs.statSync(outputPath);
    const newSize = newStat.size;
    const savings = ((originalSize - newSize) / originalSize * 100).toFixed(1);
    
    console.log(`✓ ${filename}: ${(originalSize/1024).toFixed(1)}KB → ${(newSize/1024).toFixed(1)}KB (${savings}% reduction)`);
    
    return { inputPath, outputPath, originalSize, newSize };
  } catch (err) {
    console.error(`✗ Failed to convert ${filename}:`, err.message);
    return null;
  }
}

async function main() {
  console.log('🔍 Finding PNG images...\n');
  const pngFiles = findPngFiles(PUBLIC_DIR);
  
  if (pngFiles.length === 0) {
    console.log('No PNG files found.');
    return;
  }
  
  console.log(`Found ${pngFiles.length} PNG files\n`);
  console.log('🚀 Converting to WebP...\n');
  
  let totalOriginal = 0;
  let totalNew = 0;
  
  for (const file of pngFiles) {
    const result = await optimizeImage(file);
    if (result) {
      totalOriginal += result.originalSize;
      totalNew += result.newSize;
    }
  }
  
  const totalSavings = ((totalOriginal - totalNew) / totalOriginal * 100).toFixed(1);
  console.log(`\n📊 Total: ${(totalOriginal/1024/1024).toFixed(2)}MB → ${(totalNew/1024/1024).toFixed(2)}MB (${totalSavings}% reduction)`);
}

main().catch(console.error);
