package smartfridge.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import smartfridge.entity.UserFavoriteEntity;

import java.util.List;
import java.util.Optional;

public interface UserFavoriteRepository extends JpaRepository<UserFavoriteEntity, UserFavoriteEntity.UserFavoriteId> {
    List<UserFavoriteEntity> findByUserId(Long userId);
    Optional<UserFavoriteEntity> findByUserIdAndRecipeId(Long userId, Long recipeId);
    boolean existsByUserIdAndRecipeId(Long userId, Long recipeId);
    void deleteByUserIdAndRecipeId(Long userId, Long recipeId);
}