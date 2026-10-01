package smartfridge.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import smartfridge.dto.DetectionDto;
import smartfridge.dto.Recipe;
import smartfridge.dto.RecognitionResult;
import smartfridge.entity.RecipeEntity;
import smartfridge.exceptions.BusinessException;
import smartfridge.mapper.RecipeMapper;
import smartfridge.repository.RecipeRepository;

import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
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

    @Transactional(readOnly = true)
    public Recipe getRecipeBySlug(String slug) {
        RecipeEntity entity = recipeRepository.findBySlug(slug)
                .orElseThrow(() -> new RuntimeException("Рецепт не найден: " + slug));
        return recipeMapper.toRecipe(entity);
    }

    @Transactional
    public RecognitionResult recognizeIngredients(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw BusinessException.badRequest("Файл не загружен");
        }

        String contentType = file.getContentType();
        if (contentType == null || !contentType.startsWith("image/")) {
            throw BusinessException.badRequest("Файл должен быть изображением (JPEG, PNG)");
        }

        long fileSize = file.getSize();
        if (fileSize > 10 * 1024 * 1024) {
            throw BusinessException.badRequest("Размер файла превышает 10MB");
        }

        log.info("Распознавание ингредиентов для файла: {} ({} bytes)",
                file.getOriginalFilename(), fileSize);

        List<DetectionDto> detections = mlService.recognizeIngredients(file);

        List<String> ingredients = detections.stream()
                .map(DetectionDto::getClassName)
                .distinct()
                .collect(Collectors.toList());

        log.info("Распознаны ингредиенты: {}", ingredients);

        return RecognitionResult.builder()
                .ingredients(ingredients)
                .detections(detections)
                .build();
    }
}