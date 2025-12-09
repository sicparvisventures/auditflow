/**
 * Generate all favicon and app icon sizes from source image
 * Usage: npx tsx scripts/generate-icons.ts
 */

import fs from 'node:fs';
import path from 'node:path';
import pngToIco from 'png-to-ico';
import sharp from 'sharp';

const SOURCE_IMAGE = path.join(process.cwd(), 'public', 'ad.png');
const OUTPUT_DIR = path.join(process.cwd(), 'public');

interface IconConfig {
  name: string;
  size: number;
}

const icons: IconConfig[] = [
  // Apple Touch Icon
  { name: 'apple-touch-icon.png', size: 180 },
  // Favicons
  { name: 'favicon-32x32.png', size: 32 },
  { name: 'favicon-16x16.png', size: 16 },
  // Additional sizes for PWA / Android
  { name: 'icon-192x192.png', size: 192 },
  { name: 'icon-512x512.png', size: 512 },
  // Sizes for ICO generation
  { name: 'favicon-48x48.png', size: 48 },
  { name: 'favicon-64x64.png', size: 64 },
];

async function generateIcons() {
  console.log('🎨 Generating AuditFlow icons from:', SOURCE_IMAGE);
  console.log('📁 Output directory:', OUTPUT_DIR);
  console.log('');

  // Generate PNG icons
  for (const icon of icons) {
    const outputPath = path.join(OUTPUT_DIR, icon.name);

    try {
      await sharp(SOURCE_IMAGE)
        .resize(icon.size, icon.size, {
          fit: 'contain',
          background: { r: 0, g: 0, b: 0, alpha: 0 }, // Transparent background
        })
        .png()
        .toFile(outputPath);

      console.log(`✅ Generated: ${icon.name} (${icon.size}x${icon.size})`);
    } catch (error) {
      console.error(`❌ Failed to generate ${icon.name}:`, error);
    }
  }

  // Generate favicon.ico from multiple sizes
  console.log('');
  console.log('🔧 Generating favicon.ico...');

  try {
    const icoSizes = [16, 32, 48, 64];
    const pngPaths = icoSizes.map(size => path.join(OUTPUT_DIR, `favicon-${size}x${size}.png`));

    // Only use existing files
    const existingPaths = pngPaths.filter(p => fs.existsSync(p));

    if (existingPaths.length > 0) {
      const icoBuffer = await pngToIco(existingPaths);
      fs.writeFileSync(path.join(OUTPUT_DIR, 'favicon.ico'), icoBuffer);
      console.log('✅ Generated: favicon.ico (multi-size: 16, 32, 48, 64)');
    } else {
      console.error('❌ No PNG files found for ICO generation');
    }
  } catch (error) {
    console.error('❌ Failed to generate favicon.ico:', error);
  }

  // Clean up intermediate files (keep only the essential ones)
  console.log('');
  console.log('🧹 Cleaning up intermediate files...');
  const filesToRemove = ['favicon-48x48.png', 'favicon-64x64.png'];
  for (const file of filesToRemove) {
    const filePath = path.join(OUTPUT_DIR, file);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log(`   Removed: ${file}`);
    }
  }

  console.log('');
  console.log('🎉 Icon generation complete!');
  console.log('');
  console.log('Generated files:');
  console.log('  📱 apple-touch-icon.png (180x180) - iOS home screen');
  console.log('  🌐 favicon.ico (multi-size) - Browser tab');
  console.log('  🖼️  favicon-32x32.png - High-res favicon');
  console.log('  🖼️  favicon-16x16.png - Standard favicon');
  console.log('  📲 icon-192x192.png - Android/PWA');
  console.log('  📲 icon-512x512.png - Android/PWA splash');
}

generateIcons().catch(console.error);
