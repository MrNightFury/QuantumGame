// Пост-сборочное сжатие картинок в dist. Исходники в src не трогаются.
// Запускается автоматически после vite build (см. package.json -> "build").
import { readdir, stat, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import sharp from 'sharp'

const DIST_DIR = 'dist'
// Максимальный реальный размер показа карточки в интерфейсе.
const MAX_WIDTH = 448
const MAX_HEIGHT = 640
const PNG_QUALITY = 80
const SIZE_LIMIT_BYTES = 1408 * 1024

async function* walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) yield* walk(path)
    else yield path
  }
}

async function dirSize(dir) {
  let total = 0
  for await (const path of walk(dir)) {
    total += (await stat(path)).size
  }
  return total
}

const formatKB = (bytes) => `${(bytes / 1024).toFixed(1)} КБ`

let optimized = 0
let saved = 0

for await (const path of walk(DIST_DIR)) {
  if (!path.endsWith('.png')) continue

  const original = await readFile(path)
  const compressed = await sharp(original)
    .resize(MAX_WIDTH, MAX_HEIGHT, { fit: 'inside', withoutEnlargement: true })
    .png({ palette: true, quality: PNG_QUALITY, compressionLevel: 9 })
    .toBuffer()

  // Уже оптимально (например, маленький logo.png) — не ухудшаем.
  if (compressed.length >= original.length) continue

  await writeFile(path, compressed)
  optimized += 1
  saved += original.length - compressed.length
  console.log(`  ${path}: ${formatKB(original.length)} -> ${formatKB(compressed.length)}`)
}

const total = await dirSize(DIST_DIR)
console.log(`\nСжато картинок: ${optimized}, сэкономлено ${formatKB(saved)}`)
console.log(`Итоговый размер dist: ${formatKB(total)} (лимит ${formatKB(SIZE_LIMIT_BYTES)})`)

if (total > SIZE_LIMIT_BYTES) {
  console.error('ОШИБКА: dist превышает лимит 3 МБ')
  process.exit(1)
}
