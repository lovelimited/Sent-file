// Pure Node.js PNG Generator using built-in zlib
import fs from 'fs'
import path from 'path'
import zlib from 'zlib'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const publicDir = path.resolve(__dirname, '../public')

function crc32(buf) {
  let table = []
  for (let i = 0; i < 256; i++) {
    let c = i
    for (let j = 0; j < 8; j++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    }
    table[i] = c
  }

  let crc = 0xffffffff
  for (let i = 0; i < buf.length; i++) {
    crc = table[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8)
  }
  return (crc ^ 0xffffffff) >>> 0
}

function createChunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length, 0)

  const typeBuf = Buffer.from(type, 'ascii')
  const crcBuf = Buffer.alloc(4)
  const toCrc = Buffer.concat([typeBuf, data])
  crcBuf.writeUInt32BE(crc32(toCrc), 0)

  return Buffer.concat([len, typeBuf, data, crcBuf])
}

function generatePng(width, height) {
  // Signature
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])

  // IHDR
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 2 // color type: truecolor (RGB)
  ihdr[10] = 0 // compression
  ihdr[11] = 0 // filter
  ihdr[12] = 0 // interlace

  const ihdrChunk = createChunk('IHDR', ihdr)

  // Raw image data: filter byte (0) + RGB per row
  const rowSize = 1 + width * 3
  const rawData = Buffer.alloc(rowSize * height)

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowSize
    rawData[rowOffset] = 0 // Filter type: None

    const ratioY = y / height

    for (let x = 0; x < width; x++) {
      const ratioX = x / width
      const pixelOffset = rowOffset + 1 + x * 3

      // Beautiful deep indigo / blue gradient
      const r = Math.floor(15 + ratioY * 20)
      const g = Math.floor(30 + ratioX * 50 + ratioY * 50)
      const b = Math.floor(100 + ratioX * 120 + ratioY * 80)

      rawData[pixelOffset] = Math.min(255, r)
      rawData[pixelOffset + 1] = Math.min(255, g)
      rawData[pixelOffset + 2] = Math.min(255, b)
    }
  }

  // Deflate IDAT
  const compressed = zlib.deflateSync(rawData)
  const idatChunk = createChunk('IDAT', compressed)

  // IEND
  const iendChunk = createChunk('IEND', Buffer.alloc(0))

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk])
}

const pwa192 = generatePng(192, 192)
const pwa512 = generatePng(512, 512)
const appleTouch = generatePng(180, 180)

fs.writeFileSync(path.join(publicDir, 'pwa-192x192.png'), pwa192)
fs.writeFileSync(path.join(publicDir, 'pwa-512x512.png'), pwa512)
fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), appleTouch)

console.log('Generated pwa-192x192.png, pwa-512x512.png, and apple-touch-icon.png successfully.')
