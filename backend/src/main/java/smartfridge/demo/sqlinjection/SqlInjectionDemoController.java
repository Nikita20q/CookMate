package smartfridge.demo.sqlinjection;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/admin/sql-demo")
@Tag(name = "УЧЕБНЫЕ SQL-инъекции, только ADMIN,")
public class SqlInjectionDemoController {
    private final SqlInjectionDemoService service;

    @GetMapping("/recipes")
    @Operation(summary = "НЕБЕЗОПАСНЫЙ аналог поиска по ингредиентам")
    public SqlInjectionDemoService.DemoResult recipes(@RequestParam List<String> components) {
        return service.byIngredients(components);
    }

    @GetMapping("/recipe/{slug}")
    @Operation(summary = "НЕБЕЗОПАСНЫЙ аналог поиска по slug")
    public SqlInjectionDemoService.DemoResult recipe(@PathVariable String slug) {
        return service.bySlug(slug);
    }
}
