package smartfridge.entity;

import jakarta.persistence.*;
import lombok.*;


@Entity
@Table(name = "favourite_recipes")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FavouriteRecipeEntity {

    @EmbeddedId
    private FavouriteRecipeId id;

    @ManyToOne(fetch = FetchType.LAZY)
    @MapsId("userId")
    @JoinColumn(name = "user_id")
    private UserEntity user;

    @ManyToOne(fetch = FetchType.LAZY)
    @MapsId("recipeId")
    @JoinColumn(name = "recipe_id")
    private RecipeEntity recipe;
}