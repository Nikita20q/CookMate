package smartfridge.parser.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import smartfridge.parser.entity.RecipeEntity;


import java.util.Optional;

public interface RecipeRepository extends JpaRepository<RecipeEntity, Long> {
    Optional<RecipeEntity> findBySourceUrl(String sourceUrl);
    Optional<RecipeEntity> findBySlug(String slug);
    boolean existsBySlug(String slug);
}