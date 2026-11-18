package smartfridge.mapper;

import org.springframework.stereotype.Component;
import smartfridge.dto.Recipe;
import smartfridge.dto.RecipeIngredient;
import smartfridge.entity.RecipeComponentEntity;
import smartfridge.entity.RecipeEntity;
import java.util.List;
import java.util.Comparator;


@Component
public class RecipeMapper {
    public Recipe toRecipe(RecipeEntity entity) {
        if (entity == null) {
            return null;
        }

        List<RecipeIngredient> ingredients = getIngredients(entity.getComponents());
        String[] componentNames = ingredients.stream().map(RecipeIngredient::name).toArray(String[]::new);

        return Recipe.builder()
                .id(entity.getId())
                .version(entity.getVersion())
                .title(entity.getTitle())
                .slug(entity.getSlug())
                .description(entity.getDescription())
                .image(entity.getImageUrl())
                .calories(entity.getCalories())
                .approximateTime(formatTime(entity.getPrepTimeMinutes()))
                .prepTimeMinutes(entity.getPrepTimeMinutes())
                .components(componentNames)
                .ingredients(ingredients)
                .contentJson(entity.getContentJson())
                .protein(entity.getProtein())
                .fat(entity.getFat())
                .carbohydrates(entity.getCarbohydrates())
                .build();
    }

    private List<RecipeIngredient> getIngredients(List<RecipeComponentEntity> components) {
        if (components == null) {
            return List.of();
        }
        return components.stream()
                .sorted(Comparator.comparingInt(RecipeComponentEntity::getPosition)
                        .thenComparing(RecipeComponentEntity::getId, Comparator.nullsLast(Long::compareTo)))
                .map(c -> new RecipeIngredient(c.getIngredient().getName(), c.getCount(),
                        c.getMeasurement(), c.getPosition()))
                .toList();
    }

    private String formatTime(Integer minutes) {
        if (minutes == null) {
            return "Не указано";
        }
        return minutes + " мин";
    }
}
