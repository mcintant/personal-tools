/**
 * Food/product words used only for recipe→directory matching.
 * Built from the same sources as categories and emojis so we only match on real food terms.
 */

import { categoryKeywords } from './itemCategories'
import { itemEmojis, itemEmojiKeywords } from './priceDirectoryMetadata'

function normalizeToken(t) {
  return (t || '').toLowerCase().replace(/[^\w\s-]|_/g, '').trim()
}

function addWord(set, word) {
  const w = normalizeToken(word)
  if (w.length >= 2 && !/^\d+$/.test(w)) set.add(w)
}

function addPhraseWords(set, phrase) {
  const p = (phrase || '').toLowerCase().trim()
  if (!p) return
  addWord(set, p)
  p.split(/\s+/).forEach((word) => addWord(set, word))
}

/** Set of single words that count as "food" for recipe matching. */
function buildFoodWordsSet() {
  const set = new Set()

  // From category keywords (each keyword and each word in it)
  for (const keywords of Object.values(categoryKeywords)) {
    for (const kw of keywords) {
      addPhraseWords(set, kw)
    }
  }

  // From itemEmojis keys (e.g. "Chicken Breast" → chicken, breast)
  for (const key of Object.keys(itemEmojis)) {
    key.split(/\s+/).forEach((word) => addWord(set, word))
  }

  // From itemEmojiKeywords (each keyword and each word in it)
  for (const keywords of Object.values(itemEmojiKeywords)) {
    for (const kw of keywords) {
      addPhraseWords(set, kw)
    }
  }

  // Extra words for recipe phrasing (not in categories/emoji)
  const extra = [
    'mayo', 'mayonnaise', 'mustard', 'wiener', 'wieners', 'franks', 'hotdog', 'hotdogs',
    'chips', 'crackers', 'salt', 'pepper', 'cumin', 'oregano', 'paprika', 'vanilla',
    'cinnamon', 'nutmeg', 'ginger', 'cilantro', 'thyme', 'rosemary', 'bay', 'leaf',
    'leek', 'leeks',
  ]
  extra.forEach((w) => addWord(set, w))

  // "half" causes false matches (e.g. "half-moons" → Half half). Remove so leeks etc. win.
  set.delete('half')
  return set
}

const FOOD_WORDS_SET = buildFoodWordsSet()

/**
 * Return only tokens from the ingredient text that are in the food-words set.
 * Used so recipe matching only considers real food terms (e.g. "flour" not "all-purpose").
 * @param {string} ingredientText - Normalized ingredient phrase
 * @returns {string[]} Tokens that are food words (lowercase, punctuation stripped)
 */
export function getIngredientFoodTokens(ingredientText) {
  if (!ingredientText || typeof ingredientText !== 'string') return []
  const s = ingredientText
    .toLowerCase()
    .replace(/[\u2013\u2014\u2015\-–—]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  if (!s) return []
  const tokens = s.split(/\s+/).filter(Boolean)
  return tokens.filter((t) => {
    const normalized = t.replace(/^[^\w]+|[^\w]+$/g, '').toLowerCase()
    return normalized.length >= 2 && FOOD_WORDS_SET.has(normalized)
  })
}

export { FOOD_WORDS_SET }
