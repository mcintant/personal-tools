/**
 * Metadata for the price directory UI (not from the spreadsheet).
 * - Store images: column header text → image path under public/images/
 * - Item images: row "Item" cell value → image path under public/images/
 *
 * Add image files to public/images/stores/ and public/images/items/.
 * Paths are relative to public/ (e.g. "images/stores/tj.png").
 */

/** Map column header (store name) → image path */
export const storeImages = {
  TJ: 'images/stores/tj.png',
  WF: 'images/stores/wf.png',
  Union: 'images/stores/union.png',
  Urban: 'images/stores/urban.png',
  'K slope': 'images/stores/kslope.png',
  'Mr lime': 'images/stores/mrlime.png',
  'bad wife': 'images/stores/badwife.png',
  CVS: 'images/stores/cvs.png',
  Target: 'images/stores/target.png',
  Amazon: 'images/stores/amazon.png',
  Costco: 'images/stores/costco.png',
  Lidl: 'images/stores/lidl.png',
  'NYC Pet': 'images/stores/nycpet.png',
  Sahadis: 'images/stores/sahadis.png',
  Ulta: 'images/stores/ulta.png',
  Chewy: 'images/stores/chewy.png',
}

/** Map item name (first column cell) → image path. Add more as needed. */
export const itemImages = {
  'Bananas pound': 'images/items/banana.png',
  'Avocado large': 'images/items/avocado.png',
  'Avocado small/medium': 'images/items/avocado.png',
  'Bell pepper pound': 'images/items/bell-pepper.png',
  'Chicken Breast': 'images/items/chicken.png',
  'Chicken thigh BS': 'images/items/chicken.png',
  'Chicken thigh skin on (air chilled)': 'images/items/chicken.png',
  Eggs: 'images/items/eggs.png',
  'Milk quart': 'images/items/milk.png',
  'Milk half gal': 'images/items/milk.png',
  'Onion pound': 'images/items/onion.png',
  'Red onions': 'images/items/onion.png',
  'Greek yogurt': 'images/items/yogurt.png',
  'Yogurt Greek Fage 5% 16oz (pint)': 'images/items/yogurt.png',
  'Yogurt Greek Fage any% 32oz (quart)': 'images/items/yogurt.png',
  'Yogurt Greek Fage any% 6oz (individual cup)': 'images/items/yogurt.png',
  Bacon: 'images/items/bacon.png',
  'Ground beef 80/20': 'images/items/ground-beef.png',
  'Ground beef 90/10': 'images/items/ground-beef.png',
  'Half half': 'images/items/half-half.png',
  Lemon: 'images/items/lemon.png',
  Lime: 'images/items/lime.png',
  'Carrots pound': 'images/items/carrots.png',
  'Sweet potato pound': 'images/items/sweet-potato.png',
  'Yukon gold': 'images/items/potato.png',
  'baby gold potatos': 'images/items/potato.png',
  Cilantro: 'images/items/cilantro.png',
  'Cilantro bunch': 'images/items/cilantro.png',
  Garlic: 'images/items/garlic.png',
  'Garlic head': 'images/items/garlic.png',
  'Garlic pound': 'images/items/garlic.png',
  Cucumber: 'images/items/cucumber.png',
  'Cucumber persian/hot house long wrapped': 'images/items/cucumber.png',
  'Cucumbers mini': 'images/items/cucumber.png',
  'Tomato crushed or diced': 'images/items/tomato.png',
  "Tomato's cherry 10oz": 'images/items/tomato.png',
  Butter: 'images/items/butter.png',
  'Sour cream (14-16 ounces)': 'images/items/sour-cream.png',
  'Feta pound': 'images/items/feta.png',
  'Beans can': 'images/items/beans.png',
  'Blueberries frozen wild per oz': 'images/items/blueberries.png',
  'Blueberries wymans frozen 3 lb': 'images/items/blueberries.png',
  'Fresh blueberries og': 'images/items/blueberries.png',
  'Fresh blueberries pint': 'images/items/blueberries.png',
  'Fresh strawberries': 'images/items/strawberries.png',
  'Strawberries og': 'images/items/strawberries.png',
  Raspberries: 'images/items/raspberries.png',
  'Raspberries og': 'images/items/raspberries.png',
  'Apples honeycrisp': 'images/items/apple.png',
  'Apples cosmic crisp': 'images/items/apple.png',
  'Orange Navel': 'images/items/orange.png',
  'Orange Cara Cara': 'images/items/orange.png',
  'Orange Mandarin sumo/dekopon': 'images/items/orange.png',
  'Frozen pea 16oz': 'images/items/peas.png',
  'Frozen spinach 16oz': 'images/items/spinach.png',
  'Red Lentils (1 lb)': 'images/items/lentils.png',
  'Rice per pound': 'images/items/rice.png',
  'Tortilla 8 count medium flour': 'images/items/tortilla.png',
  'La croix': 'images/items/lacroix.png',
  'Coke Zero': 'images/items/coke.png',
  'Athletic NA beer 6 pack': 'images/items/beer.png',
  'Whiteclaw per 12oz can': 'images/items/whiteclaw.png',
}

/**
 * Get store image URL for a column header (uses base URL for deployment).
 */
export function getStoreImageUrl(header, baseUrl = '') {
  const path = storeImages[header] || storeImages[header?.trim()]
  return path ? `${baseUrl}/${path}` : null
}

/**
 * Get item image URL for an item name. Tries exact match then trim/lowercase.
 */
export function getItemImageUrl(itemName, baseUrl = '') {
  if (!itemName || typeof itemName !== 'string') return null
  const key = itemName.trim()
  const path =
    itemImages[key] ||
    itemImages[key.toLowerCase()] ||
    itemImages[Object.keys(itemImages).find((k) => k.toLowerCase() === key.toLowerCase())]
  return path ? `${baseUrl}/${path}` : null
}
