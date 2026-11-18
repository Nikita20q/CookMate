package smartfridge.parser;

import java.util.List;

public record ParsedRecipeDetails(String contentJson, Integer calories, Integer protein,
                                  Integer fat, Integer carbohydrates, List<Ingredient> ingredients) {
    public record Ingredient(String name, Double count, String measurement) {}
}
