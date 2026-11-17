package smartfridge.dto.admin;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
public record RecipeUpdateRequest(@NotNull @PositiveOrZero Long version,
                                  @NotNull @Valid RecipeWriteRequest recipe) {}
