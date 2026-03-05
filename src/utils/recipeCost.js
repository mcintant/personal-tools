/**
 * Given parsed recipe lines + directory data: infer unit from row name,
 * compute  estimated cost per line (avg + per-store), best store per line, totals.
 */

import { matchIngredientToDirectory } from './recipeMatcher'

/** Items we don't price (assumed pantry costs): oils, salt, black pepper, common spices. */
const RECIPE_COST_BLACKLIST_PHRASES = [
  'olive oil',
  'neutral oil',
  'vegetable oil',
  'canola oil',
  'avocado oil',
  'black pepper',
  'red pepper flakes',
  'chili powder',
  'garam masala',
  'onion powder',
  'garlic powder',
  'garlic',
  'bay leaf',
  'bay leaves',
  'dried oregano',
  'dried thyme',
  'dried basil',
  'ground cumin',
  'ground cinnamon',
  'ground nutmeg',
  'ground ginger',
  'cumin',
  'oregano',
  'paprika',
  'cinnamon',
  'nutmeg',
  'thyme',
  'rosemary',
  'cayenne',
  'turmeric',
  'white pepper',
  'ground pepper',
]

/** Salt as whole word / "salt to taste" only (don't match "salted butter"). */
const RECIPE_COST_BLACKLIST_SALT = /\b(?:salt\s+to\s+taste|to\s+taste\s+salt|\bsalt\b)/i

function isBlacklistedIngredient(text) {
  if (!text || typeof text !== 'string') return false
  const lower = text.toLowerCase().trim()
  if (RECIPE_COST_BLACKLIST_SALT.test(lower)) return true
  return RECIPE_COST_BLACKLIST_PHRASES.some((phrase) => lower.includes(phrase.toLowerCase()))
}

function parsePrice(cell) {
  if (cell == null || typeof cell !== 'string') return NaN
  const s = cell.trim().replace(/[$,\s]/g, '')
  if (!s) return NaN
  const n = parseFloat(s)
  return Number.isFinite(n) && n >= 0 ? n : NaN
}

/** Infer directory row unit from item name: 'per_lb' | 'per_unit' | 'per_can' | 'per_oz' | 'per_pack' */
export function inferUnitFromItemName(name) {
  if (!name || typeof name !== 'string') return 'per_unit'
  const n = name.toLowerCase()
  if (/\b\d+\s*count\b|\bcount\s*\d+/.test(n)) return 'per_pack'
  if (/\bpound|\blb\b|per\s*pound/.test(n)) return 'per_lb'
  if (/\bcan\b|16oz|10oz|12oz|\bpint\b|\bquart\b/.test(n)) return 'per_can'
  if (/\bhead\b|\bbunch\b|\bclove\b/.test(n)) return 'per_unit'
  if (/\bper\s*oz\b|per\s*ounce/.test(n)) return 'per_oz'
  return 'per_unit'
}

/** Extract count per package from directory name (e.g. "8 count" -> 8). Returns null if not found. */
export function getCountPerPack(name) {
  if (!name || typeof name !== 'string') return null
  const m = name.match(/\b(\d+)\s*count\b/i) || name.match(/\bcount\s*(\d+)\b/i)
  return m ? parseInt(m[1], 10) : null
}

function getMultiplier(parsed, dirUnit, countPerPack = null) {
  return 1
}

export function computeRecipeCosts(parsedLines, headers, rows, storeIndices, skipColIndices) {
  const skipSet = new Set(skipColIndices)
  const lineResults = []
  for (const parsed of parsedLines) {
    const textToCheck = (parsed.ingredientText || '') + ' ' + (parsed.rawLine || '')
    if (isBlacklistedIngredient(textToCheck)) {
      lineResults.push({ parsed, match: null, estimatedCost: null, unknown: true })
      continue
    }
    const match = matchIngredientToDirectory(parsed.ingredientText, rows)
    if (!match) {
      lineResults.push({ parsed, match: null, estimatedCost: null, unknown: true })
      continue
    }
    const row = rows[match.rowIndex]
    const priceByColIndex = {}
    let sumPrice = 0
    let countPrice = 0
    let minPrice = Infinity
    let bestStoreIndex = -1
    for (const j of storeIndices) {
      if (skipSet.has(j)) continue
      const p = parsePrice(row[j])
      if (Number.isNaN(p)) continue
      priceByColIndex[j] = p
      sumPrice += p
      countPrice += 1
      if (p < minPrice) {
        minPrice = p
        bestStoreIndex = j
      }
    }
    const avgPrice = countPrice > 0 ? sumPrice / countPrice : NaN
    const dirUnit = inferUnitFromItemName(match.directoryName)
    const countPerPack = getCountPerPack(match.directoryName)
    const mult = getMultiplier(parsed, dirUnit, countPerPack)
    const bestPrice = Number.isFinite(minPrice) ? minPrice : avgPrice
    const estimatedCost = Number.isFinite(bestPrice) ? mult * bestPrice : null
    lineResults.push({
      parsed,
      match: {
        rowIndex: match.rowIndex,
        directoryName: match.directoryName,
        priceByColIndex,
        avgPrice,
        bestStoreIndex: bestStoreIndex >= 0 ? bestStoreIndex : null,
        multiplier: mult,
      },
      estimatedCost,
      unknown: false,
    })
  }
  const totalBest = lineResults.reduce((sum, r) => sum + (r.estimatedCost ?? 0), 0)
  const totalAtStore = (storeIndex) =>
    lineResults.reduce((sum, r) => {
      if (r.match == null) return sum
      const p = r.match.priceByColIndex[storeIndex]
      if (p == null || Number.isNaN(p)) return sum
      return sum + (r.match.multiplier ?? 1) * p
    }, 0)
  /** Like totalAtStore but use avg price when store has no price (avoids favoring stores with few items). */
  const totalAtStoreWithAvgFill = (storeIndex) =>
    lineResults.reduce((sum, r) => {
      if (r.match == null) return sum
      const mult = r.match.multiplier ?? 1
      const p = r.match.priceByColIndex[storeIndex]
      const price = p != null && Number.isFinite(p) ? p : r.match.avgPrice
      if (price == null || Number.isNaN(price)) return sum
      return sum + mult * price
    }, 0)
  return { lineResults, totalBest, totalAtStore, totalAtStoreWithAvgFill, storeIndices, headers }
}
