/**
 * Generate PNG icons from icon.svg
 * Requires: npm install --save-dev sharp
 *
 * Usage: node scripts/generate-icons.js
 */

import { readFileSync, existsSync, mkdirSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const rootDir = join(__dirname, '..')
const iconsDir = join(rootDir, 'public', 'icons')

async function generateIcons() {
  let sharp
  try {
    const sharpModule = await import('sharp')
    sharp = sharpModule.default
  } catch {
    console.error('sharp is not installed. Run: npm install --save-dev sharp')
    process.exit(1)
  }

  if (!existsSync(iconsDir)) {
    mkdirSync(iconsDir, { recursive: true })
  }

  const svgPath = join(iconsDir, 'icon.svg')
  if (!existsSync(svgPath)) {
    console.error(`SVG not found at ${svgPath}`)
    process.exit(1)
  }

  const svgBuffer = readFileSync(svgPath)
  const sizes = [192, 512]

  for (const size of sizes) {
    const outputPath = join(iconsDir, `icon-${size}.png`)
    await sharp(svgBuffer)
      .resize(size, size)
      .png()
      .toFile(outputPath)
    console.log(`Generated ${outputPath}`)
  }

  console.log('Icon generation complete!')
}

generateIcons().catch(console.error)
