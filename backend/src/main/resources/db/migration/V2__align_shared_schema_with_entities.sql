ALTER TABLE recipes ADD COLUMN IF NOT EXISTS source_url VARCHAR(500);
CREATE UNIQUE INDEX IF NOT EXISTS idx_recipes_source_url ON recipes(source_url);

ALTER TABLE recipe_components ADD COLUMN IF NOT EXISTS count DOUBLE PRECISION;
ALTER TABLE recipe_components ADD COLUMN IF NOT EXISTS measurement VARCHAR(5);

CREATE TABLE IF NOT EXISTS user_favorites (
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    recipe_id BIGINT NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, recipe_id)
);

CREATE INDEX IF NOT EXISTS idx_user_favorites_user ON user_favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_search_history_created
    ON search_history(user_id, created_at DESC);