-- Keep V0/V1 unchanged so databases that already applied them can upgrade.
ALTER TABLE users ALTER COLUMN email_verified SET NOT NULL;
ALTER TABLE recipes ALTER COLUMN slug DROP NOT NULL;
ALTER TABLE recipes ADD COLUMN source_url VARCHAR(500) UNIQUE;
ALTER TABLE recipe_components ADD COLUMN count DOUBLE PRECISION;
ALTER TABLE recipe_components ADD COLUMN measurement VARCHAR(5);

CREATE TABLE user_favorites (
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    recipe_id BIGINT NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, recipe_id)
);
