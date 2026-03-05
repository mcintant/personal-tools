/**
 * Generates SVG placeholder images for price directory items.
 * Run: node scripts/generate-food-svgs.js
 * Then replace with real photos in public/images/items/ if desired.
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const OUT_DIR = path.join(__dirname, '..', 'public', 'images', 'items')
const UNIQUE_ITEMS = [
  'banana', 'avocado', 'bell-pepper', 'chicken', 'eggs', 'milk', 'onion', 'yogurt',
  'bacon', 'ground-beef', 'half-half', 'lemon', 'lime', 'carrots', 'sweet-potato',
  'potato', 'cilantro', 'garlic', 'cucumber', 'tomato', 'butter', 'sour-cream',
  'feta', 'beans', 'blueberries', 'strawberries', 'raspberries', 'apple', 'orange',
  'peas', 'spinach', 'lentils', 'rice', 'tortilla', 'lacroix', 'coke', 'beer', 'whiteclaw'
]

const LABELS = {
  'bell-pepper': 'Pepper',
  'ground-beef': 'Beef',
  'half-half': 'Half&Half',
  'sweet-potato': 'Sweet Potato',
  'sour-cream': 'Sour Cream',
  'lacroix': 'LaCroix'
}

function label(filename) {
  if (LABELS[filename]) return LABELS[filename]
  return filename.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
}

function svg(filename) {
  const text = label(filename)
  return `<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 80 80">
  <rect width="80" height="80" rx="8" fill="#667eea" opacity="0.15"/>
  <text x="40" y="48" font-family="system-ui,sans-serif" font-size="14" font-weight="600" fill="#667eea" text-anchor="middle">${text}</text>
</svg>`
}

if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true })

UNIQUE_ITEMS.forEach((name) => {
  const file = path.join(OUT_DIR, `${name}.svg`)
  fs.writeFileSync(file, svg(name), 'utf8')
  console.log('Wrote', file)
})

console.log('Done. Update metadata to use .svg instead of .png for item images.')
