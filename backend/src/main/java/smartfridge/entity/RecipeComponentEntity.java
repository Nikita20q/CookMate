package smartfridge.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "recipe_components")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RecipeComponentEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "recipe_id", nullable = false)
    private RecipeEntity recipe;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "ingredient_id", nullable = false)
    private IngredientEntity ingredient;

    private Double count;

    @Column(nullable = false)
    private int position;

    @Column(length = 100)
    private String measurement;
}
