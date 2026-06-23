package smartfridge.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import smartfridge.dto.Recipe;
import smartfridge.entity.RecipeEntity;
import smartfridge.mapper.RecipeMapper;
import smartfridge.repository.RecipeRepository;

import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class RecipeService {
    private final RecipeRepository recipeRepository;
    private final RecipeMapper recipeMapper;
    private final MlService mlService;

    @Transactional(readOnly = true)
    public List<Recipe> findRecipesByIngredients(List<String> ingredientNames) {
        if (ingredientNames == null || ingredientNames.isEmpty()) {
            return Collections.emptyList();
        }

        List<String> normalizedNames = ingredientNames.stream()
                .map(name -> name.toLowerCase().trim())
                .collect(Collectors.toList());

        List<RecipeEntity> recipes = recipeRepository.findRecipesByIngredientsWithRanking(normalizedNames);

        return recipes.stream()
                .map(recipeMapper::toRecipe)
                .collect(Collectors.toList());
    }

    public List<Recipe> getFavoriteRecipes(Long userId) {
        // TODO: Запрос в БД на получение избранного
        return Collections.emptyList();
    }

    public void addFavorite(Long userId, Long recipeId) {
        // TODO: Сохранение в таблицу favourite_recipes
    }

    public void removeFavorite(Long userId, Long recipeId) {
        // TODO: Удаление из таблицы favourite_recipes
    }

    public List<String> recognizeIngredients(MultipartFile file) {
        return mlService.recognizeIngredients(file);
    }
}