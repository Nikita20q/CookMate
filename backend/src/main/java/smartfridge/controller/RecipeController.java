package smartfridge.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import smartfridge.dto.Recipe;
import smartfridge.dto.RecipeSearchResponse;
import smartfridge.dto.RecognitionResponse;
import smartfridge.security.annotation.CurrentUserId;
import smartfridge.service.RecipeService;

import java.util.List;

@RestController
@RequestMapping("/api/v1/recipes")
@RequiredArgsConstructor
@Tag(name = "Рецепты", description = "API для работы с рецептами и избранным")
public class RecipeController {

    private final RecipeService recipeService;

    /**
     * 1. GET /recipes/ - получение рецептов по компонентам
     */
    @GetMapping
    @Operation(summary = "Поиск рецептов по ингредиентам")
    public RecipeSearchResponse getRecipesByIngredients(
            @Parameter(description = "Список названий ингредиентов")
            @RequestParam List<String> components) {

        List<Recipe> recipes = recipeService.findRecipesByIngredients(components);

        return RecipeSearchResponse.builder()
                .recipeNumber(recipes.size())
                .recipes(recipes)
                .build();
    }

    /**
     * 2. GET /recipes/favorite - получение понравившихся рецептов
     */
    @GetMapping("/favorite")
    @Operation(summary = "Получить список избранных рецептов пользователя")
    public RecipeSearchResponse getFavoriteRecipes(
            @Parameter(description = "ID пользователя")
            @CurrentUserId Long userId) {

        List<Recipe> recipes = recipeService.getFavoriteRecipes(userId);

        return RecipeSearchResponse.builder()
                .recipeNumber(recipes.size())
                .recipes(recipes)
                .build();
    }

    /**
     * 3. POST /recipes/favorite/{recipeId} - добавление в избранное
     */
    @PostMapping("/favorite/{recipeId}")
    @Operation(summary = "Добавить рецепт в избранное")
    public ResponseEntity<Void> addFavorite(
            @CurrentUserId Long userId,
            @PathVariable Long recipeId) {

        recipeService.addFavorite(userId, recipeId);
        return ResponseEntity.ok().build();
    }

    /**
     * 4. DELETE /recipes/favorite/{recipeId} - удаление из избранного
     */
    @DeleteMapping("/favorite/{recipeId}")
    @Operation(summary = "Удалить рецепт из избранного")
    public ResponseEntity<Void> removeFavorite(
            @CurrentUserId Long userId,
            @PathVariable Long recipeId) {

        recipeService.removeFavorite(userId, recipeId);
        return ResponseEntity.ok().build();
    }


    @PostMapping(value = "/recognize", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Operation(summary = "Распознать ингредиенты по фото и найти рецепты")
    public ResponseEntity<RecognitionResponse> recognizeIngredients(
            @Parameter(description = "Фотография продуктов", required = true)
            @RequestPart("file") MultipartFile file) {

        if (file.isEmpty()) {
            return ResponseEntity.badRequest().build();
        }

        List<String> ingredients = recipeService.recognizeIngredients(file);

        List<Recipe> recipes = recipeService.findRecipesByIngredients(ingredients);

        RecognitionResponse response = RecognitionResponse.builder()
                .recognizedIngredients(ingredients)
                .recipeCount(recipes.size())
                .recipes(recipes)
                .build();

        return ResponseEntity.ok(response);
    }
}