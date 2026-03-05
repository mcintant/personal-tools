/**
 * Load and parse Paprika-recipe export (index + recipe HTML) from public/recipes.
 * Assumes export is copied to public/recipes/ (e.g. contents of My Recipes.paprikarecipes).
 */

export function getRecipesBaseUrl() {
  const base = (import.meta.env.BASE_URL || '/').replace(/\/$/, '')
  return `${base}/recipes`
}

/**
 * Fetch recipe index (index.html), parse and return list of { title, href }.
 * href is e.g. "Recipes/Chicken Tacos with Chipotle.html"
 * @returns {Promise<{ title: string, href: string }[] | null>}
 */
export async function fetchRecipeIndex() {
  const baseUrl = getRecipesBaseUrl()
  const url = `${baseUrl}/index.html`
  try {
    const res = await fetch(url)
    if (!res.ok) return null
    const html = await res.text()
    const doc = new DOMParser().parseFromString(html, 'text/html')
    const links = doc.querySelectorAll('ul li a[href^="Recipes/"]')
    return Array.from(links).map((a) => ({
      title: (a.textContent || '').trim(),
      href: a.getAttribute('href') || '',
    })).filter((r) => r.href)
  } catch {
    return null
  }
}

/**
 * Fetch a single recipe by href, parse and return name, ingredients text, image URL.
 * @param {string} href - e.g. "Recipes/Chicken Tacos with Chipotle.html"
 * @returns {Promise<{ name: string, ingredientsText: string, imageUrl: string | null, meta?: object } | null>}
 */
export async function fetchRecipeByHref(href) {
  if (!href || !href.startsWith('Recipes/')) return null
  const baseUrl = getRecipesBaseUrl()
  const url = `${baseUrl}/${href}`
  try {
    const res = await fetch(url)
    if (!res.ok) return null
    const html = await res.text()
    const doc = new DOMParser().parseFromString(html, 'text/html')

    const nameEl = doc.querySelector('[itemprop="name"]')
    const name = (nameEl?.textContent || '').trim()

    const ingredientEls = doc.querySelectorAll('[itemprop="recipeIngredient"]')
    const ingredientsText = Array.from(ingredientEls)
      .map((el) => (el.textContent || '').trim())
      .filter(Boolean)
      .join('\n')

    const img = doc.querySelector('img[itemprop="image"]')
    let imageUrl = null
    if (img) {
      const src = img.getAttribute('src')
      if (src) {
        if (src.startsWith('http')) {
          imageUrl = src
        } else {
          imageUrl = `${baseUrl}/Recipes/${src}`
        }
      }
    }

    return { name, ingredientsText, imageUrl }
  } catch {
    return null
  }
}
