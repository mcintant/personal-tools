/**
 * Metadata for the price directory UI (not from the spreadsheet).
 * Item names (first column) → emoji for display.
 * Column headers (store names) → optional logo image URL or emoji.
 */

/** Map column header (store name) → logo image URL. Keys normalized lowercase for matching. */
export const storeHeaderImages = {
  'tj': 'https://graphicdesignfall16.wordpress.com/wp-content/uploads/2016/10/trader.png',
  "trader joe's": 'https://graphicdesignfall16.wordpress.com/wp-content/uploads/2016/10/trader.png',
  'wf': 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcR68wtPyth6Piw-GtNlGp596LMAsXgjK5AcYQ&s',
  'union market': 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSbdAGftrmIO8Ri6UinlX7IGS2too3zTc-4eg&s',
  'urban market': 'https://keyfoodstores.keyfood.com/store/medias/urbanMarket-logo.png?context=bWFzdGVyfHJvb3R8NjQ0MzF8aW1hZ2UvcG5nfGFEZGhMMmc0T0M4NE9ETTRNVFExTWpFeU5EUTJMM1Z5WW1GdVRXRnlhMlYwTFd4dloyOHVjRzVufGIwYWNjNDdiNjY0YzNmOTU5OGU5M2FhZDA4MDkzZWZmNzkwODhlZDM0ZTQwNWI5NTgzZDc4YjVjNWY5YjE4YzY',
  'k slope': 'https://keyfoodstores.keyfood.com/store/medias/Asset-122x-1-.png?context=bWFzdGVyfGltYWdlc3wyOTc5M3xpbWFnZS9wbmd8YURKbUwyZ3paaTh4TURRMU9UQTFOREUwTlRVMk5pOUJjM05sZEY4eE1qSjRJQ2d4S1M1d2JtY3w1NWJkMTM0N2E0N2ZkYjlmMjhhMjk3OTIyNjgzMzFjYmExOTMzYTJiZWMwYzkxMWVjMzM2YWJmZDhhOTE3ZDY4',
  'lidl': 'https://logos-world.net/wp-content/uploads/2020/12/Lidl-Emblem.png',
  'cvs': 'https://goldenharvest.org/wp-content/uploads/2020/01/cvs-pharmacy-logo-brand-cvs-health-font-png-favpng-wxjA4NU0StS5QERTpaQwNGUQG.jpg',
  'cvs pharmacy': 'https://goldenharvest.org/wp-content/uploads/2020/01/cvs-pharmacy-logo-brand-cvs-health-font-png-favpng-wxjA4NU0StS5QERTpaQwNGUQG.jpg',
  'amazon': 'https://icon2.cleanpng.com/lnd/20250106/vq/b6ec1349ec840f22996f1e32f6e983.webp',
  'amazon fresh': 'https://icon2.cleanpng.com/lnd/20250106/vq/b6ec1349ec840f22996f1e32f6e983.webp',
  'costco': 'https://banner2.cleanpng.com/lnd/20250119/vx/6718c3b5f01ebb0b5448f3b73f51e3.webp',
  'costco wholesale': 'https://banner2.cleanpng.com/lnd/20250119/vx/6718c3b5f01ebb0b5448f3b73f51e3.webp',
}

/** Map column header (store name) → emoji when no image (e.g. Mr Lime). */
export const storeHeaderEmojis = {
  'mr lime': '🍋',
}

/**
 * Get store header display: { imageUrl } or { emoji }. Normalizes header for lookup.
 */
export function getStoreHeaderDisplay(header) {
  if (!header || typeof header !== 'string') return {}
  const key = header.trim().toLowerCase()
  if (storeHeaderEmojis[key] !== undefined) {
    return { emoji: storeHeaderEmojis[key] }
  }
  const imageUrl = storeHeaderImages[key] || storeHeaderImages[Object.keys(storeHeaderImages).find((k) => key.includes(k) || k.includes(key))]
  if (imageUrl) return { imageUrl }
  return {}
}

/** Map item name (first column cell) → emoji. Exact matches take precedence over keyword match. */
export const itemEmojis = {
  'Bananas pound': '🍌',
  'Avocado large': '🥑',
  'Avocado small/medium': '🥑',
  'Bell pepper pound': '🫑',
  'Chicken Breast': '🍗',
  'Chicken thigh BS': '🍗',
  'Chicken thigh skin on (air chilled)': '🍗',
  Eggs: '🥚',
  'Milk quart': '🥛',
  'Milk half gal': '🥛',
  'Onion pound': '🧅',
  'Red onions': '🧅',
  'Greek yogurt': '🥛',
  'Yogurt Greek Fage 5% 16oz (pint)': '🥛',
  'Yogurt Greek Fage any% 32oz (quart)': '🥛',
  'Yogurt Greek Fage any% 6oz (individual cup)': '🥛',
  Bacon: '🥓',
  'Ground beef 80/20': '🥩',
  'Ground beef 90/10': '🥩',
  'Half half': '🥛',
  Lemon: '🍋',
  Lime: '🍋',
  'Carrots pound': '🥕',
  'Sweet potato pound': '🍠',
  'Yukon gold': '🥔',
  'baby gold potatos': '🥔',
  Cilantro: '🌿',
  'Cilantro bunch': '🌿',
  Garlic: '🧄',
  'Garlic head': '🧄',
  'Garlic pound': '🧄',
  Cucumber: '🥒',
  'Cucumber persian/hot house long wrapped': '🥒',
  'Cucumbers mini': '🥒',
  'Tomato crushed or diced': '🍅',
  "Tomato's cherry 10oz": '🍅',
  Butter: '🧈',
  'Sour cream (14-16 ounces)': '🥛',
  'Feta pound': '🧀',
  'Beans can': '🫘',
  'Adobo Chipotle can': '🌶',
  'Blueberries frozen wild per oz': '🫐',
  'Blueberries wymans frozen 3 lb': '🫐',
  'Fresh blueberries og': '🫐',
  'Fresh blueberries pint': '🫐',
  'Fresh strawberries': '🍓',
  'Strawberries og': '🍓',
  Raspberries: '🫐',
  'Raspberries og': '🫐',
  'Apples honeycrisp': '🍎',
  'Apples cosmic crisp': '🍎',
  'Orange Navel': '🍊',
  'Orange Cara Cara': '🍊',
  'Orange Mandarin sumo/dekopon': '🍊',
  'Frozen pea 16oz': '🫛',
  'Frozen spinach 16oz': '🥬',
  'Red Lentils (1 lb)': '🫘',
  'Rice per pound': '🍚',
  'Tortilla 8 count medium flour': '🫓',
  'La croix': '🥤',
  'Coke Zero': '🥤',
  'Athletic NA beer 6 pack': '🍺',
  'Whiteclaw per 12oz can': '🍺',
  'Toilet paper': '🧻',
  'Oatmeal': '🥣',
}

/**
 * Emoji → keywords for fuzzy matching. If item name contains a keyword (case-insensitive),
 * that emoji is used. Longest matching keyword wins. Used when item has no exact entry in itemEmojis.
 */
export const itemEmojiKeywords = {
  '🍌': ['banana', 'bananas'],
  '🥑': ['avocado', 'avocados'],
  '🫑': ['bell pepper', 'peppers'],
  '🌶': ['chipotle', 'adobo', 'chili', 'chile', 'jalapeño', 'habanero'],
  '🍗': ['chicken', 'thigh', 'breast', 'turkey', 'poultry'],
  '🥚': ['egg', 'eggs'],
  '🥛': ['milk', 'cream', 'half half', 'half and half', 'yogurt', 'greek yogurt', 'fage', 'sour cream', 'cottage cheese'],
  '🧅': ['onion', 'onions', 'scallion', 'scallions'],
  '🥓': ['bacon'],
  '🥩': ['ground beef', 'beef', 'pork', 'lamb', 'sausage', 'steak'],
  '🍋': ['lemon', 'lemons', 'lime', 'limes'],
  '🥕': ['carrot', 'carrots'],
  '🍠': ['sweet potato', 'sweet potatoes', 'yam', 'yams'],
  '🥔': ['potato', 'potatoes', 'potatos', 'yukon gold'],
  '🌿': ['cilantro', 'parsley', 'basil', 'mint', 'dill', 'rosemary', 'herb', 'herbs'],
  '🧄': ['garlic'],
  '🥒': ['cucumber', 'cucumbers', 'pickle', 'pickles'],
  '🍅': ['tomato', 'tomatoes', 'cherry'],
  '🧈': ['butter'],
  '🧀': ['cheese', 'feta', 'mozzarella', 'cheddar', 'parmesan'],
  '🫘': ['bean', 'beans', 'lentil', 'lentils', 'chickpea', 'chickpeas'],
  '🫐': ['blueberr', 'raspberr', 'blackberr', 'cranberr', 'berr'], // substring to cover blueberry/berries etc.
  '🍓': ['strawberr'],
  '🍎': ['apple', 'apples', 'honeycrisp', 'cosmic crisp', 'gala', 'fuji'],
  '🍊': ['orange', 'oranges', 'navel', 'cara cara', 'mandarin', 'tangerine', 'clementine', 'sumo', 'dekopon', 'grapefruit'],
  '🫛': ['pea', 'peas', 'edamame'],
  '🥬': ['spinach', 'kale', 'lettuce', 'chard', 'collard', 'bok choy', 'cabbage', 'brussels', 'arugula'],
  '🍚': ['rice', 'rice per'],
  '🫓': ['tortilla', 'tortillas', 'wrap', 'pita', 'bread', 'bagel', 'croissant', 'muffin', 'roll'],
  '🥤': ['la croix', 'soda', 'coke', 'pepsi', 'seltzer', 'sparkling', 'seltzer', 'water'],
  '🍺': ['beer', 'whiteclaw', 'athletic na', 'na beer', 'lager', 'ipa'],
  '🧻': ['toilet paper', 'paper towel'],
  '🥣': ['oatmeal'],
  '🍇': ['grape', 'grapes'],
  '🍑': ['peach', 'peaches', 'nectarine'],
  '🍐': ['pear', 'pears'],
  '🥭': ['mango', 'mangoes'],
  '🍍': ['pineapple', 'pineapples'],
  '🥥': ['coconut', 'coconuts'],
  '🥦': ['broccoli', 'cauliflower', 'romanesco'],
  '🌽': ['corn'],
  '🍄': ['mushroom', 'mushrooms'],
  '🥗': ['salad', 'lettuce', 'mixed greens'],
  '🐟': ['salmon', 'tuna', 'tilapia', 'cod', 'fish', 'seafood'],
  '🦐': ['shrimp', 'prawn'],
  '🍝': ['pasta', 'noodle', 'noodles'],
  '🥫': ['canned', 'can ', 'crushed', 'diced', 'sauce', 'sauces'],
  '🍯': ['honey', 'jam', 'jelly', 'peanut butter', 'nut butter'],
  '☕': ['coffee'],
  '🫖': ['tea'],
}

const itemEmojiKeywordOrder = Object.keys(itemEmojiKeywords)

/**
 * Get emoji for an item name. Tries exact match first, then fuzzy keyword match (longest match wins).
 */
export function getItemEmoji(itemName) {
  if (!itemName || typeof itemName !== 'string') return null
  const key = itemName.trim()
  if (!key) return null

  // 1. Exact match (and case-insensitive) from itemEmojis
  const exact =
    itemEmojis[key] ||
    itemEmojis[key.toLowerCase()] ||
    itemEmojis[Object.keys(itemEmojis).find((k) => k.toLowerCase() === key.toLowerCase())]
  if (exact) return exact

  // 2. Fuzzy: longest keyword contained in item name wins
  const lower = key.toLowerCase()
  let bestEmoji = null
  let bestKeywordLength = 0

  for (const emoji of itemEmojiKeywordOrder) {
    const keywords = itemEmojiKeywords[emoji]
    for (const keyword of keywords) {
      if (keyword.length > bestKeywordLength && lower.includes(keyword)) {
        bestKeywordLength = keyword.length
        bestEmoji = emoji
      }
    }
  }

  return bestEmoji
}
