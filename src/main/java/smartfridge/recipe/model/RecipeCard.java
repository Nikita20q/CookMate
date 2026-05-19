package smartfridge.recipe.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
//@Table(name = "recipes")
public class RecipeCard {
//    @Id
//    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    private String linkUrl;
//    @Column(nullable = false)
    private String title;
    private String description;
    private String imageUrl;
    private String calories;
    private String approximateTime;
    @Builder.Default
    private List<String> ingredients = new ArrayList<>();
}
