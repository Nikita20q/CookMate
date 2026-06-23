package smartfridge.mapper;

import org.springframework.stereotype.Component;
import smartfridge.dto.Recipe;
import smartfridge.entity.RecipeComponentEntity;
import smartfridge.entity.RecipeEntity;
import java.util.List;


@Component
public class RecipeMapper {
    public Recipe toRecipe(RecipeEntity entity) {
        if (entity == null) {
            return null;
        }

        String[] componentNames = getIngredientNames(entity.getComponents());

        return Recipe.builder()
                .id(entity.getId())
                .title(entity.getTitle())
                .description(entity.getDescription())
                .image(entity.getImageUrl())
                .calories(entity.getCalories())
                .approximateTime(formatTime(entity.getPrepTimeMinutes()))
                .components(componentNames)
                .build();
    }

    private String[] getIngredientNames(List<RecipeComponentEntity> components) {
        if (components == null) {
            return new String[0];
        }
        return components.stream()
                .map(c -> c.getIngredient().getName())
                .toArray(String[]::new);
    }

    private String formatTime(Integer minutes) {
        if (minutes == null) {
            return "Не указано";
        }
        return minutes + " мин";
    }
}