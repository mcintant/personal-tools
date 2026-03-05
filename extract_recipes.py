#!/usr/bin/env python3
"""
Script to extract recipe data from HTML files and generate a CSV.
"""

import os
import csv
import re
from pathlib import Path
from bs4 import BeautifulSoup
from html import unescape

def parse_nutrition(nutrition_text):
    """Parse nutrition information from text into a dictionary."""
    nutrition = {}
    if not nutrition_text:
        return nutrition
    
    # Common patterns for nutrition values
    patterns = {
        'calories': r'Calories:\s*(\d+)',
        'fat': r'Fat:\s*(\d+)\s*grams?',
        'saturated_fat': r'Saturated Fat:\s*(\d+)\s*grams?',
        'trans_fat': r'Trans Fat:\s*(\d+)\s*grams?',
        'unsaturated_fat': r'Unsaturated Fat:\s*(\d+)\s*grams?',
        'sodium': r'Sodium:\s*(\d+)\s*milligrams?',
        'sugar': r'Sugar:\s*(\d+)\s*grams?',
        'fiber': r'Fiber:\s*(\d+)\s*grams?',
        'carbohydrate': r'Carbohydrate:\s*(\d+)\s*grams?',
        'protein': r'Protein:\s*(\d+)\s*grams?',
    }
    
    for key, pattern in patterns.items():
        match = re.search(pattern, nutrition_text, re.IGNORECASE)
        if match:
            nutrition[key] = match.group(1)
    
    return nutrition

def extract_recipe_data(html_file_path):
    """Extract recipe data from an HTML file."""
    try:
        with open(html_file_path, 'r', encoding='utf-8') as f:
            soup = BeautifulSoup(f.read(), 'html.parser')
        
        recipe = {}
        
        # Name
        name_elem = soup.find(itemprop='name')
        recipe['name'] = name_elem.get_text(strip=True) if name_elem else ''
        
        # Categories
        category_elems = soup.find_all(itemprop='recipeCategory')
        categories = [cat.get_text(strip=True) for cat in category_elems]
        recipe['categories'] = '; '.join(categories) if categories else ''
        
        # Prep Time
        prep_time_elem = soup.find(itemprop='prepTime')
        recipe['prep_time'] = prep_time_elem.get_text(strip=True) if prep_time_elem else ''
        
        # Cook Time
        cook_time_elem = soup.find(itemprop='cookTime')
        recipe['cook_time'] = cook_time_elem.get_text(strip=True) if cook_time_elem else ''
        
        # Total Time
        time_elem = soup.find(itemprop='totalTime')
        recipe['total_time'] = time_elem.get_text(strip=True) if time_elem else ''
        
        # Servings
        servings_elem = soup.find(itemprop='recipeYield')
        recipe['servings'] = servings_elem.get_text(strip=True) if servings_elem else ''
        
        # Rating
        rating_elem = soup.find(itemprop='aggregateRating')
        if rating_elem:
            recipe['rating_value'] = rating_elem.get('value', '')
            rating_text = rating_elem.get_text(strip=True)
            recipe['rating_text'] = rating_text if rating_text else ''
        else:
            recipe['rating_value'] = ''
            recipe['rating_text'] = ''
        
        # Source URL and Author
        url_elem = soup.find(itemprop='url')
        recipe['source_url'] = url_elem.get('href', '') if url_elem else ''
        
        author_elem = soup.find(itemprop='author')
        recipe['author'] = author_elem.get_text(strip=True) if author_elem else ''
        
        # Image URL
        image_elem = soup.find(itemprop='image')
        if image_elem:
            # Get the src attribute
            recipe['image_src'] = image_elem.get('src', '')
            # Try to get the href from parent <a> tag
            parent_link = image_elem.find_parent('a')
            if parent_link:
                recipe['image_url'] = parent_link.get('href', '')
            else:
                recipe['image_url'] = ''
        else:
            recipe['image_src'] = ''
            recipe['image_url'] = ''
        
        # Ingredients
        ingredient_elems = soup.find_all(itemprop='recipeIngredient')
        ingredients = []
        for ing in ingredient_elems:
            # Remove <strong> tags but keep the text
            text = ing.get_text(separator=' ', strip=True)
            ingredients.append(text)
        recipe['ingredients'] = ' | '.join(ingredients) if ingredients else ''
        
        # Description
        description_elem = soup.find(itemprop='description')
        if description_elem:
            # Get all paragraph texts if they exist
            desc_paras = description_elem.find_all('p')
            if desc_paras:
                descriptions = [p.get_text(separator=' ', strip=True) for p in desc_paras]
                recipe['description'] = ' | '.join(descriptions)
            else:
                recipe['description'] = description_elem.get_text(separator=' ', strip=True)
        else:
            recipe['description'] = ''
        
        # Directions
        directions_elem = soup.find(itemprop='recipeInstructions')
        if directions_elem:
            # Get all paragraph texts
            direction_paras = directions_elem.find_all('p', class_='line')
            if direction_paras:
                directions = [p.get_text(strip=True) for p in direction_paras]
            else:
                directions = [directions_elem.get_text(strip=True)]
            recipe['directions'] = ' | '.join(directions)
        else:
            recipe['directions'] = ''
        
        # Notes
        notes_elem = soup.find(itemprop='comment')
        if notes_elem:
            # Get all paragraph texts if they exist
            notes_paras = notes_elem.find_all('p')
            if notes_paras:
                notes = [p.get_text(separator=' ', strip=True) for p in notes_paras]
                recipe['notes'] = ' | '.join(notes)
            else:
                recipe['notes'] = notes_elem.get_text(separator=' ', strip=True)
        else:
            recipe['notes'] = ''
        
        # Nutrition
        nutrition_elem = soup.find(itemprop='nutrition')
        if nutrition_elem:
            nutrition_text = nutrition_elem.get_text(separator=' ', strip=True)
            nutrition_dict = parse_nutrition(nutrition_text)
            recipe['nutrition_text'] = nutrition_text
            recipe['calories'] = nutrition_dict.get('calories', '')
            recipe['fat'] = nutrition_dict.get('fat', '')
            recipe['saturated_fat'] = nutrition_dict.get('saturated_fat', '')
            recipe['trans_fat'] = nutrition_dict.get('trans_fat', '')
            recipe['unsaturated_fat'] = nutrition_dict.get('unsaturated_fat', '')
            recipe['sodium'] = nutrition_dict.get('sodium', '')
            recipe['sugar'] = nutrition_dict.get('sugar', '')
            recipe['fiber'] = nutrition_dict.get('fiber', '')
            recipe['carbohydrate'] = nutrition_dict.get('carbohydrate', '')
            recipe['protein'] = nutrition_dict.get('protein', '')
        else:
            recipe['nutrition_text'] = ''
            recipe['calories'] = ''
            recipe['fat'] = ''
            recipe['saturated_fat'] = ''
            recipe['trans_fat'] = ''
            recipe['unsaturated_fat'] = ''
            recipe['sodium'] = ''
            recipe['sugar'] = ''
            recipe['fiber'] = ''
            recipe['carbohydrate'] = ''
            recipe['protein'] = ''
        
        # File name
        recipe['filename'] = os.path.basename(html_file_path)
        
        return recipe
    
    except Exception as e:
        print(f"Error processing {html_file_path}: {e}")
        return None

def main():
    recipes_dir = Path('/Users/Tony/dev/kobo/recipeinfo/My Recipes/Recipes')
    output_csv = Path('/Users/Tony/dev/kobo/recipes.csv')
    
    # Find all HTML files
    html_files = sorted(recipes_dir.glob('*.html'))
    print(f"Found {len(html_files)} recipe files")
    
    # Extract data from all recipes
    recipes = []
    for html_file in html_files:
        print(f"Processing: {html_file.name}")
        recipe_data = extract_recipe_data(html_file)
        if recipe_data:
            recipes.append(recipe_data)
    
    # Write to CSV
    if recipes:
        fieldnames = [
            'filename', 'name', 'categories', 'prep_time', 'cook_time', 'total_time', 
            'servings', 'rating_value', 'rating_text', 'author', 'source_url', 
            'image_src', 'image_url', 'description', 'ingredients', 'directions', 
            'notes', 'calories', 'fat', 'saturated_fat', 'trans_fat', 'unsaturated_fat',
            'sodium', 'sugar', 'fiber', 'carbohydrate', 'protein', 'nutrition_text'
        ]
        
        with open(output_csv, 'w', newline='', encoding='utf-8') as csvfile:
            writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
            writer.writeheader()
            writer.writerows(recipes)
        
        print(f"\nSuccessfully extracted {len(recipes)} recipes to {output_csv}")
    else:
        print("No recipes found to extract")

if __name__ == '__main__':
    main()

