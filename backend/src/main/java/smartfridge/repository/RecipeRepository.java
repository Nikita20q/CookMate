package smartfridge.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import smartfridge.entity.RecipeEntity;

import java.util.List;

public interface RecipeRepository extends JpaRepository<RecipeEntity, Long> {

    /**
     * Поиск рецептов по списку ингредиентов с ранжированием по количеству совпадений
     *
     * @param ingredientNames список названий ингредиентов от ML
     * @return отсортированный список рецептов (от большего совпадения к меньшему)
     */
    @Query(value = """
    SELECT r.*,
           COUNT(rc.ingredient_id) AS match_count,
           (SELECT COUNT(*) FROM recipe_components rc2 WHERE rc2.recipe_id = r.id) AS total_recipe_ingredients,
           ROUND((COUNT(rc.ingredient_id) * 100.0 / (SELECT COUNT(*) FROM recipe_components rc2 WHERE rc2.recipe_id = r.id)), 2) AS match_percent
    FROM recipes r
    JOIN recipe_components rc ON r.id = rc.recipe_id
    JOIN ingredients i ON rc.ingredient_id = i.id
    WHERE i.name IN :ingredientNames
    GROUP BY r.id
    ORDER BY match_percent DESC, match_count DESC
    LIMIT 100
    """, nativeQuery = true)
    List<RecipeEntity> findRecipesByIngredientsWithRanking(
            @Param("ingredientNames") List<String> ingredientNames);
}