#!/usr/bin/env bash
# Copy Paprika recipe export into public/recipes so the Recipe Cost library can load it.
# Usage: ./scripts/copy-paprika-recipes.sh [path-to-export]
# Default: My Recipes.paprikarecipes (in project root)

set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_DIR"

SOURCE="${1:-My Recipes.paprikarecipes}"
DEST="public/recipes"

if [[ ! -d "$SOURCE" ]]; then
  echo "Source not found: $SOURCE"
  echo "Usage: $0 [path-to-paprika-export]"
  echo "Example: $0 \"My Recipes.paprikarecipes\""
  exit 1
fi

echo "Copying $SOURCE -> $DEST"
rm -rf "$DEST"
cp -R "$SOURCE" "$DEST"
echo "Done. Recipe library will load from $DEST"
exit 0
