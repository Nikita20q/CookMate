package smartfridge.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Recipe {
    private Long id;
    private String title;
    private String slug;
    private String description;
    private String image;
    private Integer calories;
    private String approximateTime;
    private String[] components;
}