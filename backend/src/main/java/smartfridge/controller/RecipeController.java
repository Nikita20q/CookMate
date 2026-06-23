package smartfridge.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import smartfridge.dto.*;
import smartfridge.security.annotation.CurrentUserId;
import smartfridge.service.RecipeService;
import smartfridge.service.SearchHistoryService;

import java.util.List;

@RestController
@RequestMapping("/api/v1/recipes")
@RequiredArgsConstructor
@Tag(name = "Рецепты", description = "API для работы с рецептами и избранным")
@Slf4j
public class RecipeController {

    private final RecipeService recipeService;
    private final SearchHistoryService searchHistoryService;

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
     * 5. POST /recipes/recognize - распознание ингредиентов
     */


    @PostMapping(value = "/recognize", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Operation(summary = "Распознать ингредиенты по фото и найти рецепты")
    public ResponseEntity<RecognitionResponse> recognizeIngredients(
            @Parameter(description = "Фотография продуктов", required = true)
            @RequestPart("file") MultipartFile file,
            @Parameter(hidden = true) @CurrentUserId Long userId) {

        if (file.isEmpty()) {
            return ResponseEntity.badRequest().build();
        }

        List<String> ingredients = recipeService.recognizeIngredients(file);
        List<Recipe> recipes = recipeService.findRecipesByIngredients(ingredients);

        if (userId != null) {
            try {
                searchHistoryService.createSearch(userId, ingredients);
            } catch (Exception e) {
                log.warn("Не удалось сохранить поиск: {}", e.getMessage());
            }
        }

        return ResponseEntity.ok(RecognitionResponse.builder()
                .recognizedIngredients(ingredients)
                .recipeCount(recipes.size())
                .recipes(recipes)
                .build());
    }

    @GetMapping("/recipe/{slug}")
    @Operation(summary = "Получить рецепт по slug")
    public Recipe getRecipeBySlug(
            @Parameter(description = "Slug рецепта")
            @PathVariable String slug) {
        return recipeService.getRecipeBySlug(slug);
    }

    @PostMapping("/search")
    @Operation(summary = "Поиск рецептов по списку ингредиентов (создаёт новую сессию)")
    public ResponseEntity<RecognitionResponse> searchByIngredients(
            @Valid @RequestBody SearchByIngredientsRequest request,
            @Parameter(hidden = true) @CurrentUserId Long userId) {

        List<String> ingredients = request.getIngredients();
        List<Recipe> recipes = recipeService.findRecipesByIngredients(ingredients);

        if (userId != null) {
            try {
                searchHistoryService.createSearch(userId, ingredients);
                log.info("Ручной поиск сохранён в историю для пользователя {}", userId);
            } catch (Exception e) {
                log.warn("Не удалось сохранить поиск в историю: {}", e.getMessage());
            }
        }

        return ResponseEntity.ok(RecognitionResponse.builder()
                .recognizedIngredients(ingredients)
                .recipeCount(recipes.size())
                .recipes(recipes)
                .build());
    }
}