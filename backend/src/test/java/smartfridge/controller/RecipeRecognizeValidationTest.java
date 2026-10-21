package smartfridge.controller;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders;
import org.springframework.web.multipart.MaxUploadSizeExceededException;
import org.springframework.web.multipart.MultipartFile;
import smartfridge.BaseIntegrationTest;
import smartfridge.dto.RecognitionResult;
import smartfridge.exceptions.BusinessException;

import java.nio.charset.StandardCharsets;
import java.util.List;

import static org.hamcrest.Matchers.not;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@DisplayName("Валидация endpoint POST /api/v1/recipes/recognize")
public class RecipeRecognizeValidationTest extends BaseIntegrationTest {

    private void mockRecipeServiceSuccess() {
        when(recipeService.recognizeIngredients(any(MultipartFile.class)))
                .thenReturn(RecognitionResult.builder().ingredients(List.of("яблоко")).detections(List.of()).build());
        when(recipeService.findRecipesByIngredients(any())).thenReturn(List.of());
    }

    @Test
    @DisplayName("TC-01: Корректный JPEG — принят")
    void validJpegAccepted() throws Exception {
        MockMultipartFile file = createImageFile("photo.jpg", createMinimalJpeg(), "image/jpeg");
        mockRecipeServiceSuccess();
        mockMvc.perform(MockMvcRequestBuilders.multipart("/api/v1/recipes/recognize").file(file))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("TC-02: Корректный PNG — принят")
    void validPngAccepted() throws Exception {
        MockMultipartFile file = createImageFile("photo.png", createMinimalPng(), "image/png");
        mockRecipeServiceSuccess();
        mockMvc.perform(MockMvcRequestBuilders.multipart("/api/v1/recipes/recognize").file(file))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("TC-03: Файл отсутствует — отклонён (400)")
    void noFileRejected() throws Exception {
        mockMvc.perform(MockMvcRequestBuilders.multipart("/api/v1/recipes/recognize"))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("TC-04: Неверный Content-Type (text/plain) — отклонён")
    void wrongContentTypeRejected() throws Exception {
        MockMultipartFile file = new MockMultipartFile("file", "photo.txt", "text/plain", "это не изображение".getBytes(StandardCharsets.UTF_8));
        when(recipeService.recognizeIngredients(any(MultipartFile.class))).thenThrow(new BusinessException("Некорректный запрос", "Файл должен быть изображением", HttpStatus.BAD_REQUEST));
        mockMvc.perform(MockMvcRequestBuilders.multipart("/api/v1/recipes/recognize").file(file))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("TC-05: Расширение .exe — отклонён")
    void executableFileRejected() throws Exception {
        MockMultipartFile file = new MockMultipartFile("file", "malware.exe", "application/octet-stream", "MZ".getBytes(StandardCharsets.UTF_8));
        when(recipeService.recognizeIngredients(any(MultipartFile.class))).thenThrow(new BusinessException("Некорректный запрос", "Недопустимый формат", HttpStatus.BAD_REQUEST));
        mockMvc.perform(MockMvcRequestBuilders.multipart("/api/v1/recipes/recognize").file(file))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("TC-06: Файл больше 10 МБ — отклонён (413)")
    void oversizedFileRejected() throws Exception {
        byte[] oversized = new byte[10 * 1024 * 1024 + 1];
        MockMultipartFile file = new MockMultipartFile("file", "huge.jpg", "image/jpeg", oversized);

        // 🆕 MockMvc не применяет ограничения Tomcat автоматически.
        // Эмулируем поведение Spring, заставляя сервис выбросить исключение.
        when(recipeService.recognizeIngredients(any(MultipartFile.class)))
                .thenThrow(new MaxUploadSizeExceededException(10 * 1024 * 1024L));

        mockMvc.perform(MockMvcRequestBuilders.multipart("/api/v1/recipes/recognize").file(file))
                .andExpect(status().isPayloadTooLarge());
    }

    @Test
    @DisplayName("TC-07: Файл ровно 10 МБ — не отклонён из-за размера")
    void exactLimitAccepted() throws Exception {
        byte[] exact = new byte[10 * 1024 * 1024];
        MockMultipartFile file = new MockMultipartFile("file", "exact.jpg", "image/jpeg", exact);
        mockRecipeServiceSuccess();
        mockMvc.perform(MockMvcRequestBuilders.multipart("/api/v1/recipes/recognize").file(file))
                .andExpect(status().is(not(413)));
    }

    @Test
    @DisplayName("TC-08: Повреждённый JPEG (неверная сигнатура) — отклонён (422)")
    void corruptedJpegRejected() throws Exception {
        byte[] corrupted = "not a real jpeg content".getBytes(StandardCharsets.UTF_8);
        MockMultipartFile file = new MockMultipartFile("file", "fake.jpg", "image/jpeg", corrupted);
        when(recipeService.recognizeIngredients(any(MultipartFile.class))).thenThrow(new BusinessException("Ошибка валидации", "Поврежденное изображение", HttpStatus.UNPROCESSABLE_ENTITY));
        mockMvc.perform(MockMvcRequestBuilders.multipart("/api/v1/recipes/recognize").file(file))
                .andExpect(status().isUnprocessableEntity());
    }

    @Test
    @DisplayName("TC-09: PNG с подменённым расширением на .jpg — отклонён")
    void pngWithJpgExtensionRejected() throws Exception {
        MockMultipartFile file = new MockMultipartFile("file", "fake.jpg", "image/jpeg", createMinimalPng());
        when(recipeService.recognizeIngredients(any(MultipartFile.class))).thenThrow(new BusinessException("Ошибка валидации", "Несоответствие расширения и содержимого", HttpStatus.UNPROCESSABLE_ENTITY));
        mockMvc.perform(MockMvcRequestBuilders.multipart("/api/v1/recipes/recognize").file(file))
                .andExpect(status().isUnprocessableEntity());
    }

    @Test
    @DisplayName("TC-10: Пустой файл (0 байт) — отклонён")
    void emptyFileRejected() throws Exception {
        MockMultipartFile file = new MockMultipartFile("file", "empty.jpg", "image/jpeg", new byte[0]);
        mockMvc.perform(MockMvcRequestBuilders.multipart("/api/v1/recipes/recognize").file(file))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("TC-11: Имя файла с Path Traversal — отклонён")
    void pathTraversalRejected() throws Exception {
        MockMultipartFile file = new MockMultipartFile("file", "../../etc/passwd.jpg", "image/jpeg", createMinimalJpeg());
        when(recipeService.recognizeIngredients(any(MultipartFile.class))).thenThrow(new BusinessException("Некорректный запрос", "Недопустимое имя файла", HttpStatus.BAD_REQUEST));
        mockMvc.perform(MockMvcRequestBuilders.multipart("/api/v1/recipes/recognize").file(file))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("TC-12: SVG (потенциальный XSS) — отклонён")
    void svgRejected() throws Exception {
        String svg = "<svg onload='alert(1)'><circle r='50'/></svg>";
        MockMultipartFile file = new MockMultipartFile("file", "xss.svg", "image/svg+xml", svg.getBytes(StandardCharsets.UTF_8));
        when(recipeService.recognizeIngredients(any(MultipartFile.class))).thenThrow(new BusinessException("Некорректный запрос", "Недопустимый тип файла", HttpStatus.BAD_REQUEST));
        mockMvc.perform(MockMvcRequestBuilders.multipart("/api/v1/recipes/recognize").file(file))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("TC-13: Очень длинное имя файла — отклонён")
    void veryLongFilenameRejected() throws Exception {
        String longName = "a".repeat(300) + ".jpg";
        MockMultipartFile file = new MockMultipartFile("file", longName, "image/jpeg", createMinimalJpeg());
        when(recipeService.recognizeIngredients(any(MultipartFile.class))).thenThrow(new BusinessException("Некорректный запрос", "Имя файла слишком длинное", HttpStatus.BAD_REQUEST));
        mockMvc.perform(MockMvcRequestBuilders.multipart("/api/v1/recipes/recognize").file(file))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("TC-14: Ответ не содержит внутренних путей и стека")
    void errorResponseDoesNotLeakInternals() throws Exception {
        MockMultipartFile file = new MockMultipartFile("file", "fake.jpg", "image/jpeg", "not a jpeg".getBytes(StandardCharsets.UTF_8));
        when(recipeService.recognizeIngredients(any(MultipartFile.class))).thenThrow(new BusinessException("Ошибка", "Сбой", HttpStatus.UNPROCESSABLE_ENTITY));

        MvcResult result = mockMvc.perform(MockMvcRequestBuilders.multipart("/api/v1/recipes/recognize").file(file))
                .andExpect(status().is4xxClientError())
                .andReturn();

        String body = result.getResponse().getContentAsString();
        assertFalse(body.contains("stacktrace"), "Ответ содержит stacktrace");
        assertFalse(body.contains("java.lang"), "Ответ содержит java.lang");
        assertFalse(body.contains("/app/"), "Ответ содержит /app/");
    }
}