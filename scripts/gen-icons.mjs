// Zero-dependency PNG icon generator: blue gradient rounded square + gold tent + campfire dot.
import { deflateSync } from 'node:zlib'
import { writeFileSync, mkdirSync } from 'node:fs'

function crc32(buf) {
  let c, table = []
  for (let n = 0; n < 256; n++) {
    c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1
    table[n] = c >>> 0
  }
  let crc = 0xFFFFFFFF
  for (const b of buf) crc = table[(crc ^ b) & 0xFF] ^ (crc >>> 8)
  return (crc ^ 0xFFFFFFFF) >>> 0
}
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length)
  const body = Buffer.concat([Buffer.from(type), data])
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(body))
  return Buffer.concat([len, body, crc])
}
function png(size, draw) {
  const raw = Buffer.alloc(size * (size * 4 + 1))
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0
    for (let x = 0; x < size; x++) {
      const [r, g, b, a] = draw(x / size, y / size)
      const o = y * (size * 4 + 1) + 1 + x * 4
      raw[o] = r; raw[o + 1] = g; raw[o + 2] = b; raw[o + 3] = a
    }
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8; ihdr[9] = 6
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]),
    chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))
  ])
}
const lerp = (a, b, t) => Math.round(a + (b - a) * t)
function draw(u, v) {
  // rounded-square mask
  const r = 0.22
  const cx = Math.max(0, Math.abs(u - 0.5) - (0.5 - r)), cy = Math.max(0, Math.abs(v - 0.5) - (0.5 - r))
  if (cx * cx + cy * cy > r * r) return [0, 0, 0, 0]
  // blue gradient ground
  let R = lerp(0x6F, 0x1D, v), G = lerp(0xB0, 0x5A, v), B = lerp(0xFF, 0xC4, v)
  // gold tent: triangle
  const tx = Math.abs(u - 0.5)
  if (v > 0.34 && v < 0.78 && tx < (v - 0.34) * 0.62) {
    // door
    if (v > 0.58 && tx < (0.78 - v) * 0.35) { R = 0x1D; G = 0x3A; B = 0x6E }
    else { R = 0xF0; G = 0xB4; B = 0x29 }
  }
  // campfire dot
  const dx = u - 0.5, dy = v - 0.86
  if (dx * dx + dy * dy < 0.0016) { R = 0xFF; G = 0xD8; B = 0x66 }
  return [R, G, B, 255]
}
mkdirSync('public/icons', { recursive: true })
for (const size of [180, 192, 512]) {
  writeFileSync(`public/icons/icon-${size}.png`, png(size, draw))
  console.log(`icon-${size}.png`)
}
