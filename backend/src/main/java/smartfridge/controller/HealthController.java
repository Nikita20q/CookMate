package smartfridge.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1")
@Tag(name = "Системные эндпоинты", description = "Эндпоинты для проверки работоспособности")
public class HealthController {

    @GetMapping("/health")
    @Operation(summary = "Проверка здоровья сервиса", description = "Возвращает OK, если Backend запущен")
    public String healthCheck() {
        return "CookMate Backend is running!";
    }
}