package smartfridge.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import smartfridge.dto.Recipe;
import smartfridge.entity.RecipeEntity;
import smartfridge.entity.UserFavoriteEntity;
import smartfridge.mapper.RecipeMapper;
import smartfridge.repository.RecipeRepository;
import smartfridge.repository.UserFavoriteRepository;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class FavoriteService {

    private final UserFavoriteRepository favoriteRepository;
    private final RecipeRepository recipeRepository;
    private final RecipeMapper recipeMapper;

    @Transactional(readOnly = true)
    public List<Recipe> getUserFavorites(Long userId) {
        return favoriteRepository.findByUserId(userId).stream()
                .map(fav -> recipeRepository.findById(fav.getRecipeId()).orElse(null))
                .filter(recipe -> recipe != null)
                .map(recipeMapper::toRecipe)
                .collect(Collectors.toList());
    }

    @Transactional
    public void addFavorite(Long userId, Long recipeId) {
        if (!recipeRepository.existsById(recipeId)) {
            throw new RuntimeException("Рецепт не найден: " + recipeId);
        }

        if (favoriteRepository.existsByUserIdAndRecipeId(userId, recipeId)) {
            log.debug("Рецепт {} уже в избранном у пользователя {}", recipeId, userId);
            return;
        }

        UserFavoriteEntity favorite = UserFavoriteEntity.builder()
                .userId(userId)
                .recipeId(recipeId)
                .build();

        favoriteRepository.save(favorite);
        log.info("Пользователь {} добавил рецепт {} в избранное", userId, recipeId);
    }

    @Transactional
    public void removeFavorite(Long userId, Long recipeId) {
        favoriteRepository.deleteByUserIdAndRecipeId(userId, recipeId);
        log.info("Пользователь {} удалил рецепт {} из избранного", userId, recipeId);
    }
}