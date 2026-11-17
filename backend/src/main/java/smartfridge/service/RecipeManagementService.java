package smartfridge.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import smartfridge.dto.admin.*;
import smartfridge.entity.*;
import smartfridge.exceptions.BusinessException;
import smartfridge.repository.*;
import java.util.*;

@Service
@RequiredArgsConstructor
public class RecipeManagementService {
    private final RecipeRepository recipes;
    private final IngredientRepository ingredients;
    private final ObjectMapper mapper;

    @Transactional(readOnly=true)
    public ManagedRecipePage list(int page, int size, Boolean archived) {
        if (page < 0 || size < 1 || size > 100) throw BusinessException.badRequest("Некорректная пагинация");
        var pageable = org.springframework.data.domain.PageRequest.of(page, size,
                org.springframework.data.domain.Sort.by("id").descending());
        var result = archived == null ? recipes.findAll(pageable) : recipes.findByArchived(archived, pageable);
        return new ManagedRecipePage(result.getContent().stream().map(this::response).toList(),
                page, size, result.getTotalElements());
    }

    @Transactional(readOnly=true)
    public ManagedRecipeResponse get(Long id) { return response(requireRecipe(id)); }

    @Transactional
    public ManagedRecipeResponse create(RecipeWriteRequest request) {
        if (recipes.existsBySlug(request.slug())) throw BusinessException.conflict("Slug уже используется");
        RecipeEntity recipe = RecipeEntity.builder().build();
        apply(recipe, request);
        return response(recipes.saveAndFlush(recipe));
    }

    @Transactional
    public ManagedRecipeResponse update(Long id, RecipeUpdateRequest request) {
        RecipeEntity recipe = requireRecipe(id);
        checkVersion(recipe, request.version());
        if (recipes.existsBySlugAndIdNot(request.recipe().slug(), id))
            throw BusinessException.conflict("Slug уже используется");
        apply(recipe, request.recipe());
        return response(recipes.saveAndFlush(recipe));
    }

    @Transactional
    public ManagedRecipeResponse setStatus(Long id, RecipeStatusRequest request) {
        RecipeEntity recipe = requireRecipe(id);
        checkVersion(recipe, request.version());
        recipe.setArchived(request.archived());
        recipe.setUpdatedAt(java.time.LocalDateTime.now(java.time.ZoneOffset.UTC));
        return response(recipes.saveAndFlush(recipe));
    }

    private RecipeEntity requireRecipe(Long id) {
        return recipes.findById(id).orElseThrow(() -> BusinessException.notFound("Рецепт", id));
    }
    private void checkVersion(RecipeEntity recipe, Long version) {
        if (!Objects.equals(recipe.getVersion(), version))
            throw BusinessException.conflict("Рецепт уже изменён. Получите актуальную версию.");
    }
    private void apply(RecipeEntity recipe, RecipeWriteRequest request) {
        Set<String> names = new HashSet<>();
        for (var input : request.ingredients()) {
            if (!names.add(input.name().trim().toLowerCase(Locale.ROOT)))
                throw BusinessException.badRequest("Ингредиенты не должны повторяться");
        }
        recipe.setUpdatedAt(java.time.LocalDateTime.now(java.time.ZoneOffset.UTC));
        recipe.setTitle(request.title().trim());
        recipe.setSlug(request.slug());
        recipe.setDescription(request.description());
        recipe.setImageUrl(request.imageUrl());
        recipe.setPrepTimeMinutes(request.prepTimeMinutes());
        recipe.setCalories(request.calories());
        recipe.setProtein(request.protein());
        recipe.setFat(request.fat());
        recipe.setCarbohydrates(request.carbohydrates());
        var content = mapper.createObjectNode();
        content.put("description", request.description());
        var steps = content.putArray("steps");
        int number = 1;
        for (var step : request.steps()) {
            var node = steps.addObject();
            node.put("num", number);
            node.put("stepTitle", step.title() == null ? "Шаг " + number : step.title());
            node.put("stepInstruction", step.text());
            number++;
            if (step.imageUrl() != null) node.put("imageUrl", step.imageUrl());
        }
        recipe.setContentJson(content.toString());
        Map<String, RecipeComponentEntity> existing = new HashMap<>();
        for (var component : recipe.getComponents()) existing.put(component.getIngredient().getName(), component);
        Set<String> requestedNames = new HashSet<>();
        for (var input : request.ingredients()) requestedNames.add(input.name().trim());
        recipe.getComponents().removeIf(c -> !requestedNames.contains(c.getIngredient().getName()));
        for (var input : request.ingredients()) {
            String name = input.name().trim();
            var component = existing.get(name);
            if (component == null) {
                var ingredient = ingredients.findByName(name).orElseGet(() ->
                        ingredients.save(IngredientEntity.builder().name(name).build()));
                component = RecipeComponentEntity.builder().recipe(recipe).ingredient(ingredient).build();
                recipe.getComponents().add(component);
            }
            component.setCount(input.count());
            component.setMeasurement(input.measurement());
        }
    }
    private ManagedRecipeResponse response(RecipeEntity recipe) {
        List<RecipeWriteRequest.StepInput> steps = new ArrayList<>();
        try {
            var root = mapper.readTree(recipe.getContentJson() == null ? "{}" : recipe.getContentJson());
            if (root != null) for (var step : root.path("steps")) {
                var image = step.hasNonNull("imageUrl") ? step.get("imageUrl") : step.get("image");
                steps.add(new RecipeWriteRequest.StepInput(
                        step.path("stepInstruction").asText(step.path("text").asText()),
                        step.path("stepTitle").asText(null),
                        image == null || image.isNull() ? null : image.asText()));
            }
        } catch (JsonProcessingException ex) {
            throw BusinessException.conflict("Сохранённый contentJson рецепта некорректен");
        }
        var components = recipe.getComponents().stream().map(c -> new RecipeWriteRequest.IngredientInput(
                c.getIngredient().getName(), c.getCount(), c.getMeasurement())).toList();
        return new ManagedRecipeResponse(recipe.getId(), recipe.getVersion(), recipe.isArchived(),
                new RecipeWriteRequest(recipe.getTitle(), recipe.getSlug(), recipe.getDescription(),
                        recipe.getImageUrl(), recipe.getPrepTimeMinutes(), recipe.getCalories(),
                        recipe.getProtein(), recipe.getFat(), recipe.getCarbohydrates(), components, steps));
    }
}
