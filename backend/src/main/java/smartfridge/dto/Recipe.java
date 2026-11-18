package smartfridge.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Recipe {
    private Long id;
    private Long version;
    private String title;
    private String slug;
    private String description;
    private String image;
    private Integer calories;
    private String approximateTime;
    private Integer prepTimeMinutes;
    private String[] components;
    private java.util.List<RecipeIngredient> ingredients;
    private String contentJson;
    private Integer protein;
    private Integer fat;
    private Integer carbohydrates;
}
