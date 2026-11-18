package smartfridge.dto.admin;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.util.List;

public record RecipeWriteRequest(
        @NotBlank @Size(max=255) String title,
        @NotBlank @Size(max=255) @Pattern(regexp="[a-z0-9]+(?:-[a-z0-9]+)*") String slug,
        @Size(max=20000) String description,
        @Size(max=500) @Pattern(regexp="https?://[^\\s]+") String imageUrl,
        @PositiveOrZero Integer prepTimeMinutes,
        @PositiveOrZero Integer calories,
        @PositiveOrZero Integer protein,
        @PositiveOrZero Integer fat,
        @PositiveOrZero Integer carbohydrates,
        @NotEmpty @Size(max=100) List<@NotNull @Valid IngredientInput> ingredients,
        @NotEmpty @Size(max=100) List<@NotNull @Valid StepInput> steps) {

    public record IngredientInput(@NotBlank @Size(max=100) String name,
                                  @PositiveOrZero Double count,
                                  @NotBlank @Size(max=100) String measurement) {}
    public record StepInput(@NotBlank @Size(max=10000) String text,
                            @Size(max=255) String title,
                            @Size(max=500) @Pattern(regexp="https?://[^\\s]+") String imageUrl) {}
}
