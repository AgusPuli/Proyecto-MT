import sharp from 'sharp'
import { mkdir } from 'node:fs/promises'

const SRC = 'C:/Users/agust/OneDrive/Escritorio/my-psychedelic-60s-bass-and-eko-guitar-turned-bass-whats-v0-dzkgbb4ngpu81.jpg'
const OUT = 'C:/Users/agust/OneDrive/Escritorio/ProyectoBajo/assets'

// Fondo oscuro que combina con la app (Tailwind gray-950 = #030712)
const BG = { r: 0x03, g: 0x07, b: 0x12, alpha: 1 }
const SIZE = 1024
const INNER = 820 // foto dentro del foreground (deja margen para el recorte adaptive)

await mkdir(OUT, { recursive: true })

// 1) Recorte centrado a cuadrado 1024×1024 (cover)
const square = await sharp(SRC)
  .resize(SIZE, SIZE, { fit: 'cover', position: 'center' })
  .png()
  .toBuffer()

// icon-only: foto a sangre completa
await sharp(square).png().toFile(`${OUT}/icon-only.png`)

// icon-background: color sólido oscuro
await sharp({ create: { width: SIZE, height: SIZE, channels: 4, background: BG } })
  .png()
  .toFile(`${OUT}/icon-background.png`)

// icon-foreground: foto reducida y centrada sobre fondo oscuro
const inner = await sharp(square).resize(INNER, INNER, { fit: 'cover' }).png().toBuffer()
const offset = Math.round((SIZE - INNER) / 2)
await sharp({ create: { width: SIZE, height: SIZE, channels: 4, background: BG } })
  .composite([{ input: inner, left: offset, top: offset }])
  .png()
  .toFile(`${OUT}/icon-foreground.png`)

console.log('Iconos fuente generados en', OUT)
