ALTER TABLE recipe_components ADD COLUMN position INTEGER;

WITH ranked AS (
    SELECT id, ROW_NUMBER() OVER (PARTITION BY recipe_id ORDER BY id) - 1 AS position
    FROM recipe_components
)
UPDATE recipe_components AS component
SET position = ranked.position
FROM ranked
WHERE component.id = ranked.id;

ALTER TABLE recipe_components ALTER COLUMN position SET DEFAULT 0;
ALTER TABLE recipe_components ALTER COLUMN position SET NOT NULL;
ALTER TABLE recipe_components ADD CONSTRAINT ck_recipe_component_position CHECK (position >= 0);
