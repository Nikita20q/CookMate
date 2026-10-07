package smartfridge.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import smartfridge.entity.RecipeEntity;

import java.util.List;
import java.util.Optional;

public interface RecipeRepository extends JpaRepository<RecipeEntity, Long> {

    /**
     * Поиск рецептов по списку ингредиентов с ранжированием по количеству совпадений
     *
     * @param ingredientNames список названий ингредиентов от ML
     * @return отсортированный список рецептов (от большего совпадения к меньшему)
     */
    @Query(value = """
    WITH RecipeTotals AS (
        SELECT recipe_id, COUNT(*) as total_count
        FROM recipe_components
        GROUP BY recipe_id
    )
    SELECT r.id
    FROM recipes r
    JOIN recipe_components rc ON r.id = rc.recipe_id
    JOIN ingredients i ON rc.ingredient_id = i.id
    LEFT JOIN RecipeTotals rt ON r.id = rt.recipe_id
    WHERE LOWER(i.name) IN :ingredientNames
    GROUP BY r.id, rt.total_count
    HAVING COUNT(rc.ingredient_id) >= :minMatches
    ORDER BY 
        CASE 
            WHEN ROUND((COUNT(rc.ingredient_id) * 100.0 / NULLIF(COALESCE(rt.total_count, 0), 0)), 2) = 100.00 
            THEN 0 
            ELSE 1 
        END ASC,
        COUNT(rc.ingredient_id) DESC,
        ROUND(
            (COUNT(rc.ingredient_id) * 100.0 / NULLIF(COALESCE(rt.total_count, 0), 0)), 
            2
        ) DESC
    LIMIT 100
    """, nativeQuery = true)
    List<Long> findRecipeIdsByIngredients(
            @Param("ingredientNames") List<String> ingredientNames,
            @Param("minMatches") int minMatches
    );

    Optional<RecipeEntity> findBySlug(String slug);
    boolean existsBySlug(String slug);
}