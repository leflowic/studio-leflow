import sharp from 'sharp';
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const sourceImage = 'attached_assets/icon_1762539841884.png';
const outputDir = 'client/public';

const sizes = [
  { name: 'favicon-16x16.png', size: 16 },
  { name: 'favicon-32x32.png', size: 32 },
  { name: 'favicon.png', size: 48 }, // Default favicon
  { name: 'favicon-192x192.png', size: 192 }, // Android
  { name: 'favicon-512x512.png', size: 512 }, // Google Search recommended
  { name: 'apple-touch-icon.png', size: 180 }, // iOS
];

async function generateFavicons() {
  console.log('🎨 Generating favicons...');
  
  for (const { name, size } of sizes) {
    try {
      await sharp(sourceImage)
        .resize(size, size, {
          fit: 'contain',
          background: { r: 0, g: 0, b: 0, alpha: 0 } // Transparent background
        })
        .png()
        .toFile(join(outputDir, name));
      
      console.log(`✅ Generated ${name} (${size}x${size})`);
    } catch (error) {
      console.error(`❌ Failed to generate ${name}:`, error);
    }
  }
  
  // Generate ICO file for older browsers (32x32)
  try {
    await sharp(sourceImage)
      .resize(32, 32, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      })
      .toFile(join(outputDir, 'favicon.ico'));
    
    console.log('✅ Generated favicon.ico (32x32)');
  } catch (error) {
    console.error('❌ Failed to generate favicon.ico:', error);
  }
  
  console.log('🎉 All favicons generated successfully!');
}

generateFavicons().catch(console.error);
