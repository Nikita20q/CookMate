package smartfridge.recipe.model;

import lombok.*;
import java.util.ArrayList;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RecipeCard {
    private Long id;
    private String linkUrl;
    private String title;
    private String description;
    private String imageUrl;
    private String calories;
    private String approximateTime;
    @Builder.Default
    private List<String> ingredients = new ArrayList<>();
}