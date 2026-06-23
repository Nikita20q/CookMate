package smartfridge.parser.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import smartfridge.parser.services.ParserService;

@RestController
@RequestMapping("/api/v1/parser")
@RequiredArgsConstructor
@Tag(name = "Парсер", description = "API для запуска парсинга рецептов")
public class ParserController {

    private final ParserService parserService;

    @PostMapping("/start")
    @Operation(summary = "Запустить парсинг рецептов")
    public ResponseEntity<String> startParsing(
            @RequestParam(defaultValue = "https://1000.menu/catalog/drugoe") String url,
            @RequestParam(defaultValue = "2") int pages) {

        new Thread(() -> parserService.parseAndSave(url, pages)).start();

        return ResponseEntity.ok("Парсинг запущен в фоновом режиме");
    }
}