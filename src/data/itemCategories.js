/**
 * Auto-categorize price directory items by name using keyword matching.
 * Category order and keyword lists can be extended; longest match wins.
 */

/** Category name → keywords (substring match, case-insensitive). Order matters for tie-breaking. */
export const categoryKeywords = {
  Fruit: [
    'apple', 'apples', 'banana', 'bananas', 'orange', 'oranges', 'grape', 'grapes',
    'berry', 'berries', 'blueberry', 'blueberries', 'strawberry', 'strawberries',
    'raspberry', 'raspberries', 'blackberry', 'blackberries', 'cranberry', 'cranberries',
    'melon', 'watermelon', 'cantaloupe', 'honeydew', 'peach', 'peaches', 'pear', 'pears',
    'plum', 'plums', 'mango', 'mangoes', 'avocado', 'avocados', 'lemon', 'lemons',
    'lime', 'limes', 'cherry', 'cherries', 'pineapple', 'pineapples', 'kiwi', 'kiwis',
    'coconut', 'coconuts', 'grapefruit', 'grapefruits', 'apricot', 'apricots',
    'fig', 'figs', 'date', 'dates', 'pomegranate', 'pomegranates', 'mandarin', 'sumo', 'dekopon', 'navel', 'cara cara', 'honeycrisp', 'cosmic crisp',
  ],
  Vegetables: [
    'broccoli', 'carrot', 'carrots', 'lettuce', 'spinach', 'tomato', 'tomatoes',
    'potato', 'potatoes', 'potatos', 'yukon gold', 'onion', 'onions', 'garlic',
    'celery', 'cucumber', 'cucumbers', 'pepper', 'peppers', 'bell pepper',
    'corn', 'pea', 'peas', 'bean', 'beans', 'kale', 'cabbage', 'cauliflower',
    'zucchini', 'squash', 'asparagus', 'mushroom', 'mushrooms', 'radish', 'radishes',
    'beet', 'beets', 'turnip', 'turnips', 'sweet potato', 'sweet potatoes',
    'brussels', 'artichoke', 'eggplant', 'okra', 'cilantro', 'parsley', 'basil', 'herb',
  ],
  'Dairy & Eggs': [
    'milk', 'cream', 'half half', 'half and half', 'butter', 'yogurt', 'yogurt greek', 'fage',
    'cheese', 'feta', 'cottage cheese', 'sour cream', 'eggs',
  ],
  'Meat & Seafood': [
    'chicken', 'beef', 'ground beef', 'pork', 'bacon', 'salmon', 'tuna', 'shrimp',
    'fish', 'turkey', 'lamb', 'sausage', 'thigh', 'breast',
  ],
  Bakery: [
    'bread', 'bagel', 'bagels', 'croissant', 'croissants', 'muffin', 'muffins',
    'roll', 'rolls', 'tortilla', 'tortillas', 'wrap', 'pita',
  ],
  Beverages: [
    'beer', 'whiteclaw', 'athletic na', 'la croix', 'soda', 'coke', 'pepsi',
    'juice', 'coffee', 'tea', 'water', 'sparkling', 'seltzer', 'na beer',
  ],
  Pantry: [
    'rice', 'pasta', 'flour', 'sugar', 'oil', 'vinegar', 'sauce', 'sauces',
    'cereal', 'oat', 'oats', 'lentil', 'lentils', 'beans can', 'beans 1 lb',
    'nut', 'nuts', 'peanut butter', 'honey', 'jam', 'jelly', 'crushed', 'diced',
    'frozen pea', 'frozen spinach', 'frozen ', 'adobo', 'chipotle', 'canned',
  ],
  Pet: [
    'pet', 'dog', 'cat', 'kibble', 'dog food', 'cat food', 'treat', 'treats',
    'litter', 'chewy', 'puppy', 'kitten', 'fish food', 'bird', 'hamster',
  ],
  'Cleaning & Household': [
    'cleaner', 'cleaning', 'detergent', 'soap', 'dish soap', 'laundry',
    'paper towel', 'paper towels', 'tissue', 'tissues', 'trash bag', 'trash bags',
    'sponge', 'sponges', 'mop', 'broom', 'bleach', 'wipe', 'wipes', 'household',
    'napkin', 'napkins', 'toilet paper', 'fabric softener', 'dryer sheet',
  ],
}

const categoryOrder = Object.keys(categoryKeywords)

/** Category → emoji for quick filter chips */
export const categoryEmojis = {
  'Fruit': '🍎',
  'Vegetables': '🥬',
  'Dairy & Eggs': '🥛',
  'Meat & Seafood': '🍗',
  'Bakery': '🫓',
  'Beverages': '🥤',
  'Pantry': '📦',
  'Pet': '🐾',
  'Cleaning & Household': '🧹',
}

/** List of category names in display order (for quick filters) */
export const categoryList = categoryOrder.map((name) => ({
  name,
  emoji: categoryEmojis[name] ?? '📋',
}))

/**
 * Get category for an item name by keyword match. Longest matching keyword wins.
 * @param {string} itemName - Item name (e.g. "Apples honeycrisp", "Chicken Breast")
 * @returns {string|null} Category name or null if no match
 */
export function getCategoryForItem(itemName) {
  if (!itemName || typeof itemName !== 'string') return null
  const lower = itemName.trim().toLowerCase()
  if (!lower) return null

  let bestCategory = null
  let bestKeywordLength = 0

  for (const category of categoryOrder) {
    const keywords = categoryKeywords[category]
    for (const keyword of keywords) {
      if (keyword.length > bestKeywordLength && lower.includes(keyword)) {
        bestKeywordLength = keyword.length
        bestCategory = category
      }
    }
  }

  return bestCategory
}
