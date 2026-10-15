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
    SELECT r.id
    FROM (
        -- Шаг 1: Быстро находим рецепты, у которых есть хотя бы minMatches совпадений
        SELECT rc.recipe_id, COUNT(*) as match_count
        FROM recipe_components rc
        JOIN ingredients i ON rc.ingredient_id = i.id
        WHERE LOWER(i.name) IN :ingredientNames
        GROUP BY rc.recipe_id
        HAVING COUNT(*) >= :minMatches
    ) as matched
    JOIN recipes r ON r.id = matched.recipe_id
    -- Шаг 2: Считаем общее число ингредиентов ТОЛЬКО для отобранных рецептов (LATERAL очень быстрый)
    JOIN LATERAL (
        SELECT COUNT(*) as total_count
        FROM recipe_components rc2
        WHERE rc2.recipe_id = r.id
    ) as totals ON true
    ORDER BY 
        -- 1. Сначала рецепты, которые можно приготовить полностью (совпало = всего)
        CASE WHEN matched.match_count = totals.total_count THEN 0 ELSE 1 END ASC,
        -- 2. Затем по абсолютному числу совпавших ингредиентов
        matched.match_count DESC,
        -- 3. Затем по проценту совпадения (без тяжелых ROUND и NULLIF в сортировке)
        (matched.match_count * 100.0 / totals.total_count) DESC
    LIMIT 100
    """, nativeQuery = true)
    List<Long> findRecipeIdsByIngredients(
            @Param("ingredientNames") List<String> ingredientNames,
            @Param("minMatches") int minMatches
    );

    Optional<RecipeEntity> findBySlug(String slug);
    boolean existsBySlug(String slug);
}