CREATE INDEX IF NOT EXISTS idx_ingredients_name_lower
    ON ingredients (LOWER(name));

CREATE INDEX IF NOT EXISTS idx_recipe_components_ingredient_id
    ON recipe_components (ingredient_id);

CREATE INDEX IF NOT EXISTS idx_recipe_components_recipe_id
    ON recipe_components (recipe_id);