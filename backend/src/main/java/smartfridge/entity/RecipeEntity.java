package smartfridge.entity;

import jakarta.persistence.*;
import lombok.*;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "recipes")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RecipeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 255)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(unique = true, length = 255)
    private String slug;

    private String imageUrl;

    @Column(columnDefinition = "jsonb")
    @org.hibernate.annotations.JdbcTypeCode(org.hibernate.type.SqlTypes.JSON)
    private String contentJson;

    private Integer prepTimeMinutes;
    private Integer calories;
    private Integer protein;
    private Integer fat;
    private Integer carbohydrates;

    @Column(unique = true, length = 500)
    private String sourceUrl;

    private java.time.LocalDateTime updatedAt;

    @Version
    private Long version;

    @Column(nullable = false)
    @Builder.Default
    private boolean archived = false;

    @OneToMany(mappedBy = "recipe", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<RecipeComponentEntity> components = new ArrayList<>();
}