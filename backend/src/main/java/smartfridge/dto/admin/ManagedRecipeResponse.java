package smartfridge.dto.admin;
public record ManagedRecipeResponse(Long id, Long version, boolean archived,
                                    RecipeWriteRequest recipe) {}
