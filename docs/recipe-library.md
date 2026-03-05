# Recipe library (Paprika export)

The Recipe Cost view can load recipes from a Paprika app export.

## Setup

1. Export your recipes from the Paprika app (File → Export on desktop, or share/export from mobile).
2. Copy the export folder into the project so it is served at `public/recipes/`:

   ```bash
   ./scripts/copy-paprika-recipes.sh
   ```

   Or manually:

   ```bash
   cp -r "My Recipes.paprikarecipes" public/recipes
   ```

3. Open the app, switch to the **Recipe cost** tab. The **Recipe library** panel will load the index from `public/recipes/index.html`. Search and click a recipe to see its cost breakdown and image.

## Structure

The app expects the export to contain:

- `index.html` – list of recipe links (e.g. `<a href="Recipes/Recipe Name.html">Recipe Name</a>`)
- `Recipes/*.html` – one HTML file per recipe with `[itemprop="recipeIngredient"]` and `img[itemprop="image"]`
- `Recipes/Images/` – recipe images (paths are relative to the recipe HTML)

If the index or a recipe fails to load (e.g. 404), the UI shows an error message.
