// Genera src/generated/exerciseImages.ts a partir de assets/exercises/<id>.(gif|jpg|png)
// Uso: node scripts/gen-exercise-images.js  (ejecutar tras copiar imágenes nuevas, antes de compilar)
const fs = require('fs')
const path = require('path')

const ASSETS_DIR = path.join(__dirname, '..', 'assets', 'exercises')
const OUT_FILE = path.join(__dirname, '..', 'src', 'generated', 'exerciseImages.ts')

const files = fs.existsSync(ASSETS_DIR) ? fs.readdirSync(ASSETS_DIR) : []
const images = files.filter((f) => /\.(gif|jpg|jpeg|png)$/i.test(f))

const entries = images.map((f) => {
  const id = 'gv-' + path.basename(f, path.extname(f))
  return `  '${id}': require('../../assets/exercises/${f}'),`
}).join('\n')

const out = `// AUTOGENERADO por scripts/gen-exercise-images.js — no editar a mano
import type { ImageSourcePropType } from 'react-native'

export const EXERCISE_IMAGES: Record<string, ImageSourcePropType> = {
${entries}
}
`

fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true })
fs.writeFileSync(OUT_FILE, out)
console.log(`Generadas ${images.length} imágenes en ${path.relative(process.cwd(), OUT_FILE)}`)
