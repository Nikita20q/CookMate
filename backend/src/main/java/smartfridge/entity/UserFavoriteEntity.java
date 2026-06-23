package smartfridge.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "user_favorites")
@IdClass(UserFavoriteEntity.UserFavoriteId.class)
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserFavoriteEntity {

    @Id
    @Column(name = "user_id")
    private Long userId;

    @Id
    @Column(name = "recipe_id")
    private Long recipeId;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @PrePersist
    public void prePersist() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class UserFavoriteId implements java.io.Serializable {
        private Long userId;
        private Long recipeId;
    }
}