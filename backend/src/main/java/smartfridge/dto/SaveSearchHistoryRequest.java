package smartfridge.dto;

import jakarta.validation.constraints.NotEmpty;
import lombok.Data;

import java.util.List;

@Data
public class SaveSearchHistoryRequest {
    @NotEmpty(message = "Список ингредиентов не может быть пустым")
    private List<String> ingredients;
}