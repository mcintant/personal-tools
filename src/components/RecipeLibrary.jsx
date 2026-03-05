import React, { useState, useEffect } from 'react'
import { fetchRecipeIndex, fetchRecipeByHref } from '../utils/paprikaRecipes'
import './RecipeLibrary.css'

function RecipeLibrary({ onSelectRecipe, selectedRecipe }) {
  const [recipeIndex, setRecipeIndex] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [loadingIndex, setLoadingIndex] = useState(true)
  const [loadingRecipe, setLoadingRecipe] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false
    setLoadingIndex(true)
    setError(null)
    fetchRecipeIndex()
      .then((list) => {
        if (!cancelled) {
          setRecipeIndex(list || [])
          setLoadingIndex(false)
          if (list === null) setError('Recipe library not available')
        }
      })
      .catch(() => {
        if (!cancelled) {
          setRecipeIndex([])
          setLoadingIndex(false)
          setError('Recipe library not available')
        }
      })
    return () => { cancelled = true }
  }, [])

  const filteredRecipes = recipeIndex && recipeIndex.length > 0
    ? recipeIndex.filter((r) =>
        r.title.toLowerCase().includes(searchQuery.toLowerCase().trim())
      )
    : []

  async function handleSelectRecipe(entry) {
    setLoadingRecipe(true)
    setError(null)
    try {
      const recipe = await fetchRecipeByHref(entry.href)
      if (recipe) {
        onSelectRecipe({
          name: recipe.name,
          ingredientsText: recipe.ingredientsText,
          imageUrl: recipe.imageUrl,
        })
      } else {
        setError('Could not load recipe')
      }
    } catch {
      setError('Could not load recipe')
    } finally {
      setLoadingRecipe(false)
    }
  }

  return (
    <div className="recipe-library">
      <h3 className="recipe-library-title">Recipe library</h3>
      {error && <p className="recipe-library-error" role="alert">{error}</p>}
      {loadingIndex ? (
        <p className="recipe-library-loading">Loading recipes…</p>
      ) : recipeIndex && recipeIndex.length === 0 ? (
        <p className="recipe-library-empty">
          No recipes found. Add your Paprika export to <code>public/recipes</code> to use the library.
        </p>
      ) : (
        <>
          <input
            type="search"
            placeholder="Search recipes…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="recipe-library-search"
            aria-label="Search recipes"
          />
          <ul className="recipe-library-list" aria-label="Recipes">
            {filteredRecipes.map((entry) => (
              <li key={entry.href}>
                <button
                  type="button"
                  className={`recipe-library-card ${selectedRecipe?.name === entry.title ? 'recipe-library-card-selected' : ''}`}
                  onClick={() => handleSelectRecipe(entry)}
                  disabled={loadingRecipe}
                >
                  <span className="recipe-library-card-title">{entry.title}</span>
                </button>
              </li>
            ))}
          </ul>
          {recipeIndex && recipeIndex.length > 0 && filteredRecipes.length === 0 && (
            <p className="recipe-library-no-match">No recipes match your search.</p>
          )}
        </>
      )}
      {loadingRecipe && <p className="recipe-library-loading-recipe">Loading recipe…</p>}
    </div>
  )
}

export default RecipeLibrary
