package smartfridge.parser.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import smartfridge.parser.entity.IngredientEntity;

import java.util.Optional;

public interface IngredientRepository extends JpaRepository<IngredientEntity, Long> {
    Optional<IngredientEntity> findByName(String name);
}