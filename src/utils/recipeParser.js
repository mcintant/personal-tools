/**
 * Parse recipe text: split by line, extract quantity/amount/unit, normalize ingredient text.
 * Output: array of { rawLine, quantity?, amount?, unit?, ingredientText }
 */

const RECIPE_WORDS_TO_STRIP = [
  'tablespoons', 'tablespoon', 'tbsp', 'teaspoons', 'teaspoon', 'tsp',
  'cups', 'cup', 'ounces', 'ounce', 'oz', 'pounds', 'pound', 'lb', 'lbs',
  'minced', 'chopped', 'diced', 'sliced', 'grated', 'crushed', 'whole',
  'left whole', 'branch', 'branches', 'sprigs', 'sprig', 'wedges', 'wedge',
  'cloves', 'clove', 'berry', 'berries', 'fresh', 'frozen', 'dried',
  'large', 'small', 'medium', 'finely', 'roughly', 'thinly', 'thickly',
  'from the can', 'from can', 'drained', 'rinsed', 'soaked', 'optional',
  'for serving', 'to taste', 'divided', 'plus more', 'and drained',
  'in ice water for 10 minutes', 'in ice water', 'peeled', 'seeded',
  'ripe', 'halved', 'pitted', 'scooped', 'pieces', 'but', 'very', 'delicious',
]

const WEIGHT_VOLUME_REGEXES = [
  { pattern: /\babout\s+(\d+(?:\s+\d+\/\d+)?)\s*(?:pounds?|lbs?)\b/i, unit: 'lb' },
  { pattern: /\b(\d+(?:\s+\d+\/\d+)?)\s*(?:pounds?|lbs?)\b/i, unit: 'lb' },
  { pattern: /\b(\d+)\s*\/\s*(\d+)\s*(?:pounds?|lbs?)\b/i, unit: 'lb', fraction: true },
  { pattern: /\b(\d+(?:\s+\d+\/\d+)?)\s*cups?\b/i, unit: 'cup' },
  { pattern: /\b(\d+)\s*\/\s*(\d+)\s*cups?\b/i, unit: 'cup', fraction: true },
  { pattern: /\b(\d+(?:\s+\d+\/\d+)?)\s*tablespoons?\b/i, unit: 'tbsp' },
  { pattern: /\b(\d+)\s*\/\s*(\d+)\s*tablespoons?\b/i, unit: 'tbsp', fraction: true },
  { pattern: /\b(\d+(?:\s+\d+\/\d+)?)\s*teaspoons?\b/i, unit: 'tsp' },
  { pattern: /\b(\d+)\s*\/\s*(\d+)\s*teaspoons?\b/i, unit: 'tsp', fraction: true },
  { pattern: /\b(\d+)\s*cloves?\b/i, unit: 'count' },
]

const LEADING_NUMBER_REGEX = /^\s*(\d+)\s+or\s+(\d+)\s+/i
const LEADING_FRACTION_REGEX = /^\s*(\d+)\s*\/\s*(\d+)\s+/
const LEADING_MIXED_REGEX = /^\s*(\d+)\s+(\d+)\s*\/\s*(\d+)\s+/
const LEADING_SIMPLE_NUMBER = /^\s*(\d+)\s+/

function parseFraction(match, fraction = false) {
  if (fraction && match[1] != null && match[2] != null) {
    return parseInt(match[1], 10) / parseInt(match[2], 10)
  }
  if (match[1] != null && match[2] != null && match[3] != null) {
    return parseInt(match[1], 10) + parseInt(match[2], 10) / parseInt(match[3], 10)
  }
  if (match[1] != null && match[2] != null) {
    return parseInt(match[1], 10) / parseInt(match[2], 10)
  }
  const n = parseFloat(String(match[1]).replace(/\s+/g, ''))
  return Number.isFinite(n) ? n : null
}

function extractAmountAndUnit(line) {
  let amount = null
  let unit = null
  const lbMix = line.match(/\b(\d+)\s+(\d+)\s*\/\s*(\d+)\s*(?:pounds?|lbs?)/i)
  if (lbMix) {
    amount = parseInt(lbMix[1], 10) + parseInt(lbMix[2], 10) / parseInt(lbMix[3], 10)
    unit = 'lb'
  }
  if (amount == null) {
    for (const { pattern, unit: u, fraction } of WEIGHT_VOLUME_REGEXES) {
      const m = line.match(pattern)
      if (m) {
        amount = parseFraction(m, fraction)
        if (amount != null) {
          unit = u
          break
        }
      }
    }
  }
  return { amount, unit }
}

function extractLeadingQuantity(line) {
  let qty = null
  let rest = line
  const orMatch = rest.match(LEADING_NUMBER_REGEX)
  if (orMatch) {
    const a = parseInt(orMatch[1], 10)
    const b = parseInt(orMatch[2], 10)
    qty = (a + b) / 2
    rest = rest.slice(orMatch[0].length)
  } else {
    const mixedMatch = rest.match(LEADING_MIXED_REGEX)
    if (mixedMatch) {
      qty = parseInt(mixedMatch[1], 10) + parseInt(mixedMatch[2], 10) / parseInt(mixedMatch[3], 10)
      rest = rest.slice(mixedMatch[0].length)
    } else {
      const fracMatch = rest.match(LEADING_FRACTION_REGEX)
      if (fracMatch) {
        qty = parseInt(fracMatch[1], 10) / parseInt(fracMatch[2], 10)
        rest = rest.slice(fracMatch[0].length)
      } else {
        const numMatch = rest.match(LEADING_SIMPLE_NUMBER)
        if (numMatch) {
          qty = parseInt(numMatch[1], 10)
          rest = rest.slice(numMatch[0].length)
        }
      }
    }
  }
  return { quantity: qty, rest }
}

function toIngredientText(raw) {
  let s = raw
    .replace(/[\u2013\u2014\u2015\-–—]/g, ' ') // en-dash, em-dash, hyphen variants → space
    .replace(/\s*\([^)]*\)\s*/g, ' ') // parentheticals e.g. "(optional, but very delicious)"
    .replace(/,/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
  for (const w of RECIPE_WORDS_TO_STRIP) {
    const re = new RegExp(`\\b${w.replace(/\s+/g, '\\s+')}\\b`, 'gi')
    s = s.replace(re, ' ')
  }
  s = s.replace(/\s+/g, ' ').trim()
  return s || raw.trim().toLowerCase()
}

/**
 * @param {string} recipeText - Full recipe text, one ingredient per line
 * @returns {{ rawLine: string, quantity?: number, amount?: number, unit?: string, ingredientText: string }[]}
 */
export function parseRecipe(recipeText) {
  if (!recipeText || typeof recipeText !== 'string') return []
  const lines = recipeText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .filter((line) => !/^Ingredients\b/i.test(line))
  return lines.map((rawLine) => {
    const { amount, unit } = extractAmountAndUnit(rawLine)
    const { quantity, rest } = extractLeadingQuantity(rawLine)
    const ingredientText = toIngredientText(rest || rawLine)
    return {
      rawLine,
      ...(quantity != null && { quantity }),
      ...(amount != null && { amount }),
      ...(unit != null && { unit }),
      ingredientText: ingredientText || rawLine.trim().toLowerCase(),
    }
  })
}
