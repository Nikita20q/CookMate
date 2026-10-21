CREATE TABLE IF NOT EXISTS users (
                                     id BIGSERIAL PRIMARY KEY,
                                     email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    email_verified BOOLEAN DEFAULT FALSE,
    verification_code VARCHAR(6),
    verification_code_expiry TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

CREATE TABLE IF NOT EXISTS ingredients (
                                           id BIGSERIAL PRIMARY KEY,
                                           name VARCHAR(255) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

CREATE TABLE IF NOT EXISTS recipes (
                                       id BIGSERIAL PRIMARY KEY,
                                       title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    image_url VARCHAR(500),
    prep_time_minutes INTEGER,
    calories INTEGER,
    protein INTEGER,
    fat INTEGER,
    carbohydrates INTEGER,
    content_json JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

CREATE TABLE IF NOT EXISTS recipe_components (
                                                 id BIGSERIAL PRIMARY KEY,
                                                 recipe_id BIGINT NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
    ingredient_id BIGINT NOT NULL REFERENCES ingredients(id) ON DELETE CASCADE,
    quantity VARCHAR(100),
    UNIQUE(recipe_id, ingredient_id)
    );

CREATE TABLE IF NOT EXISTS search_history (
                                              id BIGSERIAL PRIMARY KEY,
                                              user_id BIGINT NOT NULL,
                                              ingredients JSONB NOT NULL,
                                              created_at TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS favourite_recipes (
                                                 user_id BIGINT NOT NULL,
                                                 recipe_id BIGINT NOT NULL,
                                                 PRIMARY KEY (user_id, recipe_id)
    );

ALTER TABLE search_history
    ADD CONSTRAINT fk_search_history_user
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE favourite_recipes
    ADD CONSTRAINT fk_favourite_user
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE favourite_recipes
    ADD CONSTRAINT fk_favourite_recipe
        FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE;