package smartfridge.dto.admin;
import jakarta.validation.constraints.*;
public record RecipeStatusRequest(@NotNull @PositiveOrZero Long version,
                                  @NotNull Boolean archived) {}
