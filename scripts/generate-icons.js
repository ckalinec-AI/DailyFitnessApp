#!/usr/bin/env node
/**
 * generate-icons.js
 *
 * Generates PNG icon files for the Kadence PWA from the source SVG.
 *
 * Prerequisites:
 *   npm install --save-dev sharp
 *
 * Usage:
 *   node scripts/generate-icons.js
 *   # or via npm script:
 *   npm run generate-icons
 *
 * Output:
 *   public/icons/icon-192.png  — used in manifest + apple-touch-icon
 *   public/icons/icon-512.png  — used in manifest + splash screens
 */

import { readFileSync, existsSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')

// ─── Icon sizes to generate ───────────────────────────────────────────────────
const ICONS = [
  { size: 192, output: 'public/icons/icon-192.png' },
  { size: 512, output: 'public/icons/icon-512.png' },
]

const SVG_SOURCE = resolve(ROOT, 'public/icons/icon.svg')

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  // Verify source SVG exists
  if (!existsSync(SVG_SOURCE)) {
    console.error(`❌  Source SVG not found: ${SVG_SOURCE}`)
    process.exit(1)
  }

  // Dynamically import sharp (optional devDependency)
  let sharp
  try {
    sharp = (await import('sharp')).default
  } catch {
    console.error('❌  sharp is not installed. Run: npm install --save-dev sharp')
    process.exit(1)
  }

  const svgBuffer = readFileSync(SVG_SOURCE)
  console.log(`📐  Source SVG: ${SVG_SOURCE}`)

  for (const { size, output } of ICONS) {
    const outputPath = resolve(ROOT, output)

    try {
      await sharp(svgBuffer)
        .resize(size, size)
        .png({
          // High quality, reasonably compressed
          compressionLevel: 9,
          adaptiveFiltering: true,
        })
        .toFile(outputPath)

      console.log(`✅  Generated ${size}×${size} → ${output}`)
    } catch (err) {
      console.error(`❌  Failed to generate ${output}:`, err.message)
      process.exit(1)
    }
  }

  console.log('\n🎉  All icons generated successfully.')
  console.log('   You can now commit the PNG files or add them to .gitignore.')
}

main()
