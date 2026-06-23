package smartfridge.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class MlService {

    private final RestTemplate restTemplate;

    @Value("${ml.service.url:http://ml-service:8000}")
    private String mlServiceUrl;

    private static final Map<String, String> CLASS_TO_RUSSIAN = Map.ofEntries(
            Map.entry("egg", "яйца"),
            Map.entry("milk", "молоко"),
            Map.entry("yogurt", "йогурт"),
            Map.entry("sour_cream", "сметана"),
            Map.entry("cheese", "сыр"),
            Map.entry("butter", "масло"),
            Map.entry("cream", "сливки"),
            Map.entry("cottage_cheese", "творог"),
            Map.entry("cream_cheese", "сыр творожный"),
            Map.entry("kefir", "кефир"),
            Map.entry("condensed_milk", "сгущенка"),
            Map.entry("tomato", "помидоры"),
            Map.entry("cucumber", "огурцы"),
            Map.entry("pickle", "соленые огурцы"),
            Map.entry("bell_pepper", "болгарский перец"),
            Map.entry("onion", "лук"),
            Map.entry("garlic", "чеснок"),
            Map.entry("carrot", "морковь"),
            Map.entry("potato", "картофель"),
            Map.entry("cabbage", "капуста"),
            Map.entry("eggplant", "баклажан"),
            Map.entry("pumpkin", "тыква"),
            Map.entry("strawberry", "клубника"),
            Map.entry("corn", "кукуруза"),
            Map.entry("peas", "горошек"),
            Map.entry("ginger", "имбирь"),
            Map.entry("lettuce", "салат"),
            Map.entry("spinach", "шпинат"),
            Map.entry("apple", "яблоки"),
            Map.entry("banana", "бананы"),
            Map.entry("orange", "апельсин"),
            Map.entry("lemon", "лимон"),
            Map.entry("pineapple", "ананас"),
            Map.entry("watermelon", "арбуз"),
            Map.entry("chicken", "курица"),
            Map.entry("turkey", "индейка"),
            Map.entry("meat", "мясо"),
            Map.entry("minced_meat", "фарш"),
            Map.entry("bacon", "бекон"),
            Map.entry("sausage", "колбаса"),
            Map.entry("white_fish", "рыба"),
            Map.entry("shrimp", "креветки"),
            Map.entry("canned_fish", "рыбные консервы"),
            Map.entry("bread", "хлеб"),
            Map.entry("flatbread", "лаваш"),
            Map.entry("pasta", "макароны"),
            Map.entry("rice", "рис"),
            Map.entry("canned_beans", "фасоль"),
            Map.entry("canned_corn", "кукуруза консервы"),
            Map.entry("canned_peas", "горошек консервы"),
            Map.entry("tomato_paste", "томатная паста"),
            Map.entry("ketchup", "кетчуп"),
            Map.entry("mayonnaise", "майонез"),
            Map.entry("mustard", "горчица"),
            Map.entry("soy_sauce", "соевый соус"),
            Map.entry("juice", "сок"),
            Map.entry("coffee", "кофе"),
            Map.entry("tea", "чай"),
            Map.entry("herbs", "зелень"),
            Map.entry("spices", "специи"),
            Map.entry("chocolate", "шоколад"),
            Map.entry("honey", "мед")
    );

    /**
     * Отправляет фото на ML-сервис и получает список ингредиентов на русском
     */
    public List<String> recognizeIngredients(MultipartFile file) {
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.MULTIPART_FORM_DATA);

            MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
            body.add("file", new ByteArrayResource(file.getBytes()) {
                @Override
                public String getFilename() {
                    return file.getOriginalFilename();
                }
            });

            HttpEntity<MultiValueMap<String, Object>> requestEntity =
                    new HttpEntity<>(body, headers);

            String url = mlServiceUrl + "/predict";
            log.info("Отправка фото на ML-сервис: {}", url);

            ResponseEntity<Map> response = restTemplate.postForEntity(
                    url,
                    requestEntity,
                    Map.class
            );

            if (response.getBody() == null) {
                throw new RuntimeException("ML-сервис вернул пустой ответ");
            }

            List<Map<String, Object>> detections =
                    (List<Map<String, Object>>) response.getBody().get("detections");

            if (detections == null || detections.isEmpty()) {
                log.warn("ML-сервис не нашёл ингредиентов на фото");
                return Collections.emptyList();
            }

            Set<String> englishClasses = detections.stream()
                    .map(det -> (String) det.get("class"))
                    .filter(Objects::nonNull)
                    .collect(Collectors.toSet());

            List<String> russianIngredients = englishClasses.stream()
                    .map(cls -> CLASS_TO_RUSSIAN.getOrDefault(cls, cls))
                    .distinct()
                    .collect(Collectors.toList());

            log.info("ML распознал: {} → {}", englishClasses, russianIngredients);
            return russianIngredients;

        } catch (IOException e) {
            log.error("Ошибка при чтении файла: {}", e.getMessage());
            throw new RuntimeException("Ошибка при обработке фото", e);
        } catch (Exception e) {
            log.error("Ошибка при вызове ML-сервиса: {}", e.getMessage());
            throw new RuntimeException("ML-сервис недоступен: " + e.getMessage(), e);
        }
    }
}