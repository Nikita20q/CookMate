package smartfridge.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RecognitionResponse {
    private List<String> recognizedIngredients;
    private Integer recipeCount;
    private List<Recipe> recipes;
}