package smartfridge.recipe.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "recipes")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Recipe {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private int id;

    @Column(nullable = false)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String description;

    private String image;

    @Column(columnDefinition = "jsonb")
    private String contentJson;

    private Integer prepTimeMinutes;
    private Integer calories;
    private Integer protein;
    private Integer fat;
    private Integer carbs;

    @Column(name = "source_url",unique = true, length = 500)
    private String sourceUrl;

    @OneToMany(mappedBy = "recipe", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<RecipeComponent> components = new ArrayList<>();
}
