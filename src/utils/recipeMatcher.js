/**
 * Fuzzy match recipe ingredient text to directory rows (row[0] = item name).
 * Only uses "food" tokens from the ingredient (from category/emoji keyword data) and exact token match.
 */

import { getIngredientFoodTokens } from '../data/recipeMatchFoodWords'

const MIN_SCORE_THRESHOLD = 0.15

function normalize(s) {
  return (s || '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[\u2013\u2014\u2015\-–—]/g, ' ') // en-dash, em-dash, horizontal bar, hyphen
    .replace(/\s+/g, ' ')
    .trim()
}

function tokenize(s) {
  return normalize(s)
    .split(/\s+/)
    .filter(Boolean)
}

/**
 * Extract meaningful tokens from directory item name (skip units/numbers for matching).
 */
function directoryTokens(name) {
  const s = normalize(name)
  const stop = new Set([
    'pound', 'pounds', 'lb', 'lbs', 'oz', 'can', 'cans', 'pint', 'quart',
    'large', 'small', 'medium', 'per', 'og', 'bs', 'skin', 'on', 'air', 'chilled',
    'or', 'and', 'of', 'in', 'to', 'at', 'by', 'for', 'no', 'with', 'la',
  ])
  return tokenize(s).filter((t) => t.length > 1 && !stop.has(t) && !/^\d+$/.test(t))
}

/**
 * Score how well recipe phrase matches a directory item name.
 * Only ingredient tokens that are in the food-words set are used; match requires exact token equality
 * so e.g. "honey" does not match "honeycrisp".
 */
function scoreMatch(ingredientText, directoryName) {
  const ing = normalize(ingredientText)
  const dir = normalize(directoryName)
  if (!ing || !dir) return 0

  const ingTokens = getIngredientFoodTokens(ingredientText)
  const dirTokens = directoryTokens(directoryName)
  if (ingTokens.length === 0 || dirTokens.length === 0) return 0

  let matchCount = 0
  let longestMatch = 0
  for (const t of ingTokens) {
    const tNorm = t.replace(/^[^\w]+|[^\w]+$/g, '').toLowerCase()
    if (tNorm.length < 2) continue
    for (const d of dirTokens) {
      if (tNorm === d) {
        matchCount += 1
        if (tNorm.length > longestMatch) longestMatch = tNorm.length
      }
    }
  }

  const substringBonus = (dir.includes(ing) || ing.includes(dir)) ? 0.5 : 0
  const overlapScore = dirTokens.length > 0 ? (matchCount / Math.max(ingTokens.length, dirTokens.length)) : 0
  const longestScore = longestMatch / Math.max(ing.length, dir.length, 1)
  let score = overlapScore * 0.6 + longestScore * 0.2 + substringBonus * 0.2
  if (ing.includes(dir) && score < MIN_SCORE_THRESHOLD) {
    score = MIN_SCORE_THRESHOLD + 0.05
  }
  return score
}

/**
 * @param {string} ingredientText - Normalized ingredient phrase from recipe
 * @param {string[][]} rows - Directory rows, row[i][0] = item name
 * @returns {{ rowIndex: number, directoryName: string } | null}
 */
export function matchIngredientToDirectory(ingredientText, rows) {
  if (!ingredientText || !rows || rows.length === 0) return null
  const ing = normalize(ingredientText)
  if (!ing) return null

  let best = { rowIndex: -1, directoryName: '', score: 0 }
  for (let i = 0; i < rows.length; i++) {
    const name = (rows[i][0] ?? '').trim()
    if (!name) continue
    const s = scoreMatch(ingredientText, name)
    if (s > best.score) {
      best = { rowIndex: i, directoryName: name, score: s }
    }
  }

  if (best.score < MIN_SCORE_THRESHOLD) return null
  return { rowIndex: best.rowIndex, directoryName: best.directoryName }
}
