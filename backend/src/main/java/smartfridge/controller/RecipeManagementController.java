package smartfridge.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import io.swagger.v3.oas.annotations.tags.Tag;
import smartfridge.dto.admin.*;
import smartfridge.service.RecipeManagementService;
import java.net.URI;

@RestController
@RequestMapping("/api/v1/admin/recipes")
@RequiredArgsConstructor
@Tag(name="Управление рецептами (ADMIN)")
public class RecipeManagementController {
    private final RecipeManagementService service;
    @io.swagger.v3.oas.annotations.Operation(summary="Список рецептов с фильтром архивности",
            description="archived=true — архивные, false — активные, без параметра — все")
    @GetMapping
    public ManagedRecipePage list(@RequestParam(defaultValue="0") int page,
                                  @RequestParam(defaultValue="20") int size,
                                  @io.swagger.v3.oas.annotations.Parameter(description="true — архивные, false — активные; не указывать для всех")
                                  @RequestParam(required=false) Boolean archived) {
        return service.list(page, size, archived);
    }
    @GetMapping("/{id}")
    public ManagedRecipeResponse get(@PathVariable Long id) { return service.get(id); }
    @PostMapping
    public ResponseEntity<ManagedRecipeResponse> create(@Valid @RequestBody RecipeWriteRequest request) {
        var result = service.create(request);
        return ResponseEntity.created(URI.create("/api/v1/admin/recipes/"+result.id())).body(result);
    }
    @PutMapping("/{id}")
    public ManagedRecipeResponse update(@PathVariable Long id, @Valid @RequestBody RecipeUpdateRequest request) {
        return service.update(id, request);
    }
    @PatchMapping("/{id}/status")
    public ManagedRecipeResponse status(@PathVariable Long id, @Valid @RequestBody RecipeStatusRequest request) {
        return service.setStatus(id, request);
    }
}
