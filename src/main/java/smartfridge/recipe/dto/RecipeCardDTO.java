package smartfridge.recipe.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RecipeCardDTO {
    private Long id;
    private String title;
    private String description;
    private String imageUrl;
    private String calories;
    private String approximateTime;
    private String[] comments;
}
