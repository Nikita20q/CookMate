package smartfridge.dto.admin;
import java.util.List;
public record ManagedRecipePage(List<ManagedRecipeResponse> recipes, int page, int size, long total) {}
