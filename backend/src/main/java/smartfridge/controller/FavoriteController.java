package smartfridge.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import smartfridge.dto.Recipe;
import smartfridge.dto.RecipeSearchResponse;
import smartfridge.security.annotation.CurrentUserId;
import smartfridge.service.FavoriteService;

import java.util.List;

@RestController
@RequestMapping("/api/v1/favorites")
@RequiredArgsConstructor
@Tag(name = "Избранное", description = "Управление избранными рецептами")
public class FavoriteController {

    private final FavoriteService favoriteService;

    @GetMapping
    @Operation(summary = "Получить список избранных рецептов")
    public RecipeSearchResponse getFavorites(
            @Parameter(description = "ID пользователя (из JWT)")
            @CurrentUserId Long userId) {

        List<Recipe> recipes = favoriteService.getUserFavorites(userId);

        return RecipeSearchResponse.builder()
                .recipeNumber(recipes.size())
                .recipes(recipes)
                .build();
    }

    @PostMapping("/{recipeId}")
    @Operation(summary = "Добавить рецепт в избранное")
    public ResponseEntity<Void> addFavorite(
            @CurrentUserId Long userId,
            @PathVariable Long recipeId) {

        favoriteService.addFavorite(userId, recipeId);
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/{recipeId}")
    @Operation(summary = "Удалить рецепт из избранного")
    public ResponseEntity<Void> removeFavorite(
            @CurrentUserId Long userId,
            @PathVariable Long recipeId) {

        favoriteService.removeFavorite(userId, recipeId);
        return ResponseEntity.ok().build();
    }
}