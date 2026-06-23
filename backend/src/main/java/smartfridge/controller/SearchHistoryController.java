package smartfridge.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import smartfridge.dto.Recipe;
import smartfridge.dto.RecipeSearchResponse;
import smartfridge.dto.SaveSearchHistoryRequest;
import smartfridge.dto.SearchHistoryDto;
import smartfridge.security.annotation.CurrentUserId;
import smartfridge.service.SearchHistoryService;

import java.util.List;

@RestController
@RequestMapping("/api/v1/search-history")
@RequiredArgsConstructor
@Tag(name = "История поиска", description = "История сессий поиска по ингредиентам")
public class SearchHistoryController {

    private final SearchHistoryService historyService;

    @GetMapping
    @Operation(summary = "Получить историю поиска пользователя")
    public List<SearchHistoryDto> getHistory(
            @Parameter(hidden = true) @CurrentUserId Long userId) {
        return historyService.getUserHistory(userId);
    }

    @PostMapping
    @Operation(summary = "Создать новую запись в истории")
    public ResponseEntity<SearchHistoryDto> createSearch(
            @Parameter(hidden = true) @CurrentUserId Long userId,
            @Valid @RequestBody SaveSearchHistoryRequest request) {

        SearchHistoryDto saved = historyService.createSearch(userId, request.getIngredients());
        return ResponseEntity.status(HttpStatus.CREATED).body(saved);
    }

    @PutMapping
    @Operation(summary = "Обновить ингредиенты в текущей (последней) сессии")
    public ResponseEntity<RecipeSearchResponse> updateCurrentSearch(
            @Parameter(hidden = true) @CurrentUserId Long userId,
            @Valid @RequestBody SaveSearchHistoryRequest request) {

        List<Recipe> recipes = historyService.updateLastSearch(userId, request.getIngredients());

        RecipeSearchResponse response = RecipeSearchResponse.builder()
                .recipeNumber(recipes.size())
                .recipes(recipes)
                .build();

        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Удалить запись из истории")
    public ResponseEntity<Void> deleteHistoryItem(
            @Parameter(hidden = true) @CurrentUserId Long userId,
            @Parameter(description = "ID записи истории") @PathVariable Long id) {

        historyService.deleteHistoryItem(userId, id);
        return ResponseEntity.noContent().build();
    }
}