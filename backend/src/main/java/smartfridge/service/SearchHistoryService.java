package smartfridge.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import smartfridge.dto.Recipe;
import smartfridge.dto.SearchHistoryDto;
import smartfridge.entity.SearchHistoryEntity;
import smartfridge.repository.SearchHistoryRepository;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class SearchHistoryService {

    private final SearchHistoryRepository historyRepository;
    private final RecipeService recipeService;

    @Transactional(readOnly = true)
    public List<SearchHistoryDto> getUserHistory(Long userId) {
        return historyRepository.findByUserIdOrderByCreatedAtDesc(userId).stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    @Transactional
    public SearchHistoryDto createSearch(Long userId, List<String> ingredients) {
        List<String> normalized = normalizeIngredients(ingredients);

        if (normalized.isEmpty()) {
            throw new RuntimeException("Список ингредиентов пуст");
        }

        SearchHistoryEntity entity = SearchHistoryEntity.builder()
                .userId(userId)
                .ingredients(normalized)
                .build();

        entity = historyRepository.save(entity);
        log.info("Пользователь {} начал новую сессию поиска: {}", userId, normalized);

        return toDto(entity);
    }

    @Transactional
    public List<Recipe> updateSearch(Long userId, Long historyId, List<String> ingredients) {
        SearchHistoryEntity entity = historyRepository.findById(historyId)
                .orElseThrow(() -> new RuntimeException("Запись истории не найдена: " + historyId));

        if (!entity.getUserId().equals(userId)) {
            throw new RuntimeException("Нет доступа к этой записи истории");
        }

        List<String> normalized = normalizeIngredients(ingredients);

        if (normalized.isEmpty()) {
            throw new RuntimeException("Список ингредиентов пуст");
        }

        entity.setIngredients(normalized);
        historyRepository.save(entity);

        log.info("Пользователь {} обновил сессию поиска {}: {}", userId, historyId, normalized);

        return recipeService.findRecipesByIngredients(normalized);
    }

    @Transactional
    public void deleteHistoryItem(Long userId, Long historyId) {
        historyRepository.deleteByIdAndUserId(historyId, userId);
        log.info("Пользователь {} удалил запись истории {}", userId, historyId);
    }

    private List<String> normalizeIngredients(List<String> ingredients) {
        return ingredients.stream()
                .filter(s -> s != null && !s.trim().isEmpty())
                .map(s -> s.trim().toLowerCase())
                .distinct()
                .collect(Collectors.toList());
    }

    private SearchHistoryDto toDto(SearchHistoryEntity entity) {
        return SearchHistoryDto.builder()
                .id(entity.getId())
                .ingredients(entity.getIngredients())
                .createdAt(entity.getCreatedAt())
                .build();
    }

    /**
     * Обновляет ПОСЛЕДНЮЮ запись истории (текущую сессию)
     */
    @Transactional
    public List<Recipe> updateLastSearch(Long userId, List<String> ingredients) {
        List<SearchHistoryEntity> history = historyRepository
                .findByUserIdOrderByCreatedAtDesc(userId);

        if (history.isEmpty()) {
            throw new RuntimeException("История пуста. Сначала создайте запись через POST /recognize");
        }

        SearchHistoryEntity lastRecord = history.get(0);

        List<String> normalized = normalizeIngredients(ingredients);
        lastRecord.setIngredients(normalized);
        historyRepository.save(lastRecord);

        log.info("Пользователь {} обновил последнюю сессию {}: {}", userId, lastRecord.getId(), normalized);

        return recipeService.findRecipesByIngredients(normalized);
    }
}