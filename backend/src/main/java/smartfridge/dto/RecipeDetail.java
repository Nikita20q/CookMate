package smartfridge.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import smartfridge.model.Pfc;
import smartfridge.model.RecipeComponent;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RecipeDetail {
    private Long id;
    private String title;
    private String image;
    private RecipeComponent[] components;
    private String description;
    private Integer calories;
    private Pfc pfc;
    private Integer prepTimeMinutes;
    private String content;
}