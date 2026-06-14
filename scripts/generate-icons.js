/**
 * Generate PNG icons from icon.svg
 * Uses sharp for high-quality SVG-to-PNG conversion
 *
 * Usage: node scripts/generate-icons.js
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const rootDir = join(__dirname, '..')
const iconsDir = join(rootDir, 'public', 'icons')

async function generateIcons() {
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

  // Try sharp first (best quality SVG rendering)
  try {
    const sharpModule = await import('sharp')
    const sharp = sharpModule.default || sharpModule

    for (const size of sizes) {
      const outputPath = join(iconsDir, `icon-${size}.png`)
      const png = await sharp(svgBuffer)
        .resize(size, size)
        .png()
        .toBuffer()
      writeFileSync(outputPath, png)
      console.log(`Generated ${outputPath} (${png.length} bytes)`)
    }

    console.log('Icon generation complete!')
    return
  } catch (err) {
    console.warn('sharp failed:', err.message)
  }

  // Fallback: create solid-color PNG icons using raw PNG encoding
  console.log('Falling back to raw PNG generation...')
  for (const size of sizes) {
    const outputPath = join(iconsDir, `icon-${size}.png`)
    const png = createSolidPNG(size, 0x11, 0x18, 0x27) // #111827
    writeFileSync(outputPath, png)
    console.log(`Generated fallback ${outputPath} (${png.length} bytes)`)
  }
}

/**
 * Create a minimal valid PNG with a solid color background.
 * Implements the PNG spec: signature + IHDR + IDAT + IEND chunks with CRC.
 */
function createSolidPNG(size, r, g, b) {
  const { deflateSync } = require('zlib')

  // Build raw image data: filter byte (0 = None) + RGB pixels per row
  const rowSize = 1 + size * 3
  const raw = Buffer.alloc(rowSize * size)
  for (let y = 0; y < size; y++) {
    const rowStart = y * rowSize
    raw[rowStart] = 0 // filter type: None
    for (let x = 0; x < size; x++) {
      const off = rowStart + 1 + x * 3
      raw[off] = r
      raw[off + 1] = g
      raw[off + 2] = b
    }
  }

  const compressed = deflateSync(raw)

  function crc32(buf) {
    let crc = 0xffffffff
    const table = crc32Table()
    for (let i = 0; i < buf.length; i++) {
      crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xff]
    }
    return (crc ^ 0xffffffff) >>> 0
  }

  function crc32Table() {
    const t = new Uint32Array(256)
    for (let n = 0; n < 256; n++) {
      let c = n
      for (let k = 0; k < 8; k++) {
        c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
      }
      t[n] = c
    }
    return t
  }

  function makeChunk(type, data) {
    const typeBytes = Buffer.from(type, 'ascii')
    const lenBuf = Buffer.alloc(4)
    lenBuf.writeUInt32BE(data.length, 0)
    const crcInput = Buffer.concat([typeBytes, data])
    const crcBuf = Buffer.alloc(4)
    crcBuf.writeUInt32BE(crc32(crcInput), 0)
    return Buffer.concat([lenBuf, typeBytes, data, crcBuf])
  }

  // PNG signature
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])

  // IHDR: width, height, bit depth, color type (2=RGB), compression, filter, interlace
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8  // bit depth
  ihdr[9] = 2  // color type: RGB
  ihdr[10] = 0 // compression
  ihdr[11] = 0 // filter
  ihdr[12] = 0 // interlace

  // IEND
  const iend = Buffer.alloc(0)

  return Buffer.concat([
    sig,
    makeChunk('IHDR', ihdr),
    makeChunk('IDAT', compressed),
    makeChunk('IEND', iend),
  ])
}

generateIcons().catch(console.error)
