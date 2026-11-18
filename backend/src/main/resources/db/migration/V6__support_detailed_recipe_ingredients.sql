ALTER TABLE recipe_components ALTER COLUMN measurement TYPE VARCHAR(100);

ALTER TABLE recipe_components DROP CONSTRAINT recipe_components_recipe_id_ingredient_id_key;
