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

import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class MlService {

    private final RestTemplate restTemplate;

    @Value("${ML_SERVICE_URL:http://localhost:8000}")
    private String mlServiceUrl;

    /**
     * Отправляет картинку на ML-сервис и получает список ингредиентов
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

            HttpEntity<MultiValueMap<String, Object>> requestEntity = new HttpEntity<>(body, headers);

            String url = mlServiceUrl + "/predict";
            log.info("Отправка картинки на ML-сервис: {}", url);

            ResponseEntity<List> response = restTemplate.exchange(
                    url,
                    HttpMethod.POST,
                    requestEntity,
                    List.class
            );

            if (response.getBody() != null) {
                return response.getBody();
            }
            return List.of();

        } catch (Exception e) {
            log.error("Ошибка при обращении к ML-сервису: {}", e.getMessage());
            return List.of("молоко", "яйца", "мука");
        }
    }
}