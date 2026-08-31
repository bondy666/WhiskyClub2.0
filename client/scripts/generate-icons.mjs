import sharp from 'sharp'
import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const dir = path.dirname(fileURLToPath(import.meta.url))
const pub = path.join(dir, '..', 'public')

// Prefer a real raster logo (logo-source.*) if present, else fall back to the SVG.
const raster = ['logo-source.png', 'logo-source.jpg', 'logo-source.jpeg', 'logo-source.webp']
  .map((f) => path.join(pub, f))
  .find(existsSync)
const source = raster ?? path.join(pub, 'icon-source.svg')
console.log('source icon:', path.basename(source))

const targets = [
  { name: 'pwa-192x192.png', size: 192 },
  { name: 'pwa-512x512.png', size: 512 },
  { name: 'apple-touch-icon.png', size: 180 },
  { name: 'favicon-32x32.png', size: 32 },
]

for (const t of targets) {
  await sharp(source)
    .resize(t.size, t.size, { fit: 'contain', background: '#0c0a09' })
    .png()
    .toFile(path.join(pub, t.name))
  console.log('generated', t.name)
}

