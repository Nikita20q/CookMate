package smartfridge.parser.services;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import smartfridge.parser.ThousandMenuParser;
import smartfridge.parser.entity.IngredientEntity;
import smartfridge.parser.entity.RecipeComponentEntity;
import smartfridge.parser.entity.RecipeEntity;
import smartfridge.parser.repository.IngredientRepository;
import smartfridge.parser.repository.RecipeRepository;
import smartfridge.parser.utils.SlugUtil;
import smartfridge.recipe.model.RecipeCard;

import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
public class ParserService {

    private final ThousandMenuParser parser;
    private final RecipeRepository recipeRepository;
    private final IngredientRepository ingredientRepository;

    public void parseAndSave(String baseUrl, int pages) {
        log.info("Начинаем парсинг {} страниц с {}", pages, baseUrl);

        int totalSaved = 0;
        int totalSkipped = 0;

        for (int pageNumber = 1; pageNumber <= pages; pageNumber++) {
            log.info("Обрабатываем страницу {}/{}", pageNumber, pages);

            List<RecipeCard> pageCards = parser.parseOnePage(baseUrl, pageNumber);

            if (pageCards.isEmpty()) {
                log.warn("Страница {} пуста", pageNumber);
                continue;
            }

            int[] pageStats = saveRecipeBatch(pageCards);
            totalSaved += pageStats[0];
            totalSkipped += pageStats[1];

            log.info("Страница {} обработана. Сохранено: {}, Пропущено: {}",
                    pageNumber, pageStats[0], pageStats[1]);

            try {
                Thread.sleep(1000);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                break;
            }
        }

        log.info("Парсинг завершен. Всего сохранено: {}, Пропущено: {}", totalSaved, totalSkipped);
    }

    @Transactional
    public int[] saveRecipeBatch(List<RecipeCard> cards) {
        int saved = 0;
        int skipped = 0;

        for (RecipeCard card : cards) {
            try {
                if (saveRecipe(card)) {
                    saved++;
                } else {
                    skipped++;
                }
            } catch (Exception e) {
                log.error("Ошибка при сохранении рецепта: {}", card.getLinkUrl(), e);
                skipped++;
            }
        }

        return new int[]{saved, skipped};
    }

    private boolean saveRecipe(RecipeCard card) {
        Optional<RecipeEntity> existing = recipeRepository.findBySourceUrl(card.getLinkUrl());
        if (existing.isPresent()) {
            log.debug("Рецепт уже существует: {}", card.getLinkUrl());
            return false;
        }

        String contentJson = parser.parseRecipeDetails(card.getLinkUrl());

        String slug = generateSlugFromUrl(card);

        if (recipeRepository.existsBySlug(slug)) {
            log.warn("Slug {} уже существует, пропускаем рецепт", slug);
            return false;
        }

        RecipeEntity recipe = RecipeEntity.builder()
                .title(card.getTitle())
                .slug(slug)
                .description(card.getDescription())
                .imageUrl(card.getImageUrl())
                .sourceUrl(card.getLinkUrl())
                .prepTimeMinutes(parseMinutes(card.getApproximateTime()))
                .calories(parseCalories(card.getCalories()))
                .contentJson(contentJson)
                .build();

        for (String ingredientName : card.getIngredients()) {
            if (ingredientName == null || ingredientName.trim().isEmpty()) continue;

            String normalizedName = ingredientName.trim();

            IngredientEntity ingredient = ingredientRepository.findByName(normalizedName)
                    .orElse(null);

            if (ingredient == null) {
                ingredient = IngredientEntity.builder()
                        .name(normalizedName)
                        .build();
                ingredient = ingredientRepository.save(ingredient);
            }

            RecipeComponentEntity component = RecipeComponentEntity.builder()
                    .recipe(recipe)
                    .ingredient(ingredient)
                    .count(0.0)
                    .measurement("")
                    .build();

            recipe.getComponents().add(component);
        }

        recipeRepository.save(recipe);
        log.info("Сохранен рецепт: {} (slug: {})", recipe.getTitle(), slug);
        return true;
    }

    private String generateSlugFromUrl(RecipeCard card) {
        Long idFromUrl = SlugUtil.extractIdFromUrl(card.getLinkUrl());

        if (idFromUrl != null) {
            return SlugUtil.generateSlug(card.getTitle(), idFromUrl);
        }

        return SlugUtil.generateSlug(card.getTitle(), System.currentTimeMillis());
    }

    private Integer parseMinutes(String timeStr) {
        if (timeStr == null || timeStr.isEmpty()) return null;
        try {
            return Integer.parseInt(timeStr.replaceAll("[^\\d]", ""));
        } catch (NumberFormatException e) {
            return null;
        }
    }

    private Integer parseCalories(String kcalStr) {
        if (kcalStr == null || kcalStr.isEmpty()) return null;
        try {
            return Integer.parseInt(kcalStr.replaceAll("[^\\d]", ""));
        } catch (NumberFormatException e) {
            return null;
        }
    }
}