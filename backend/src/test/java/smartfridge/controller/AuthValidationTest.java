package smartfridge.controller;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import smartfridge.BaseIntegrationTest;
import smartfridge.exceptions.BusinessException;

import java.util.Map;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@DisplayName("Валидация endpoint POST /api/v1/auth/register и /login")
public class AuthValidationTest extends BaseIntegrationTest {

    @Test
    @DisplayName("TC-R01: Валидная регистрация — 201")
    void validRegistrationAccepted() throws Exception {
        Map<String, String> body = Map.of("email", "test@example.com", "password", "SecurePass123!");
        mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isCreated());
    }

    @Test
    @DisplayName("TC-R02: Пустой email — отклонён")
    void emptyEmailRejected() throws Exception {
        Map<String, String> body = Map.of("email", "", "password", "SecurePass123!");
        mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("TC-R03: Email без @ — отклонён")
    void invalidEmailFormatRejected() throws Exception {
        Map<String, String> body = Map.of("email", "notanemail", "password", "SecurePass123!");
        mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("TC-R04: Слишком длинный email (>254) — отклонён")
    void tooLongEmailRejected() throws Exception {
        String longEmail = "a".repeat(250) + "@example.com";
        Map<String, String> body = Map.of("email", longEmail, "password", "SecurePass123!");
        mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("TC-R05: Короткий пароль (<8 символов) — отклонён")
    void shortPasswordRejected() throws Exception {
        Map<String, String> body = Map.of("email", "test@example.com", "password", "123");
        mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("TC-R06: Отсутствует поле password — отклонён")
    void missingPasswordRejected() throws Exception {
        Map<String, String> body = Map.of("email", "test@example.com");
        mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("TC-R07: Неизвестное поле is_admin — отклонён")
    void unknownFieldRejected() throws Exception {
        String json = "{\"email\": \"test@example.com\", \"password\": \"SecurePass123!\", \"is_admin\": true}";
        mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("TC-R08: SQL-инъекция в email — отклонён")
    void sqlInjectionInEmailRejected() throws Exception {
        Map<String, String> body = Map.of("email", "admin' OR '1'='1'@example.com", "password", "SecurePass123!");
        mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("TC-R09: XSS в email — отклонён")
    void xssInEmailRejected() throws Exception {
        Map<String, String> body = Map.of("email", "<script>alert(1)</script>@example.com", "password", "SecurePass123!");
        mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("TC-R10: Не-JSON тело — отклонён")
    void nonJsonBodyRejected() throws Exception {
        mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.TEXT_PLAIN)
                        .content("not json"))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("TC-R11: Невалидный JSON — отклонён")
    void malformedJsonRejected() throws Exception {
        // 🆕 Выносим в переменную, чтобы избежать глюков парсера IDE с экранированными кавычками
        String invalidJson = "{ \"broken\": ";

        mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(invalidJson))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("TC-L01: Вход без подтверждения email — 403")
    void loginWithoutEmailConfirmationRejected() throws Exception {
        when(authService.login(any())).thenThrow(new BusinessException("Доступ запрещён", "Email не подтверждён", HttpStatus.FORBIDDEN));

        Map<String, String> loginBody = Map.of("email", "unverified@example.com", "password", "SecurePass123!");
        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(loginBody)))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("TC-L02: Неверный пароль — 401")
    void wrongPasswordRejected() throws Exception {
        when(authService.login(any())).thenThrow(new BusinessException("Неавторизован", "Неверный email или пароль", HttpStatus.UNAUTHORIZED));

        Map<String, String> body = Map.of("email", "nonexistent@example.com", "password", "wrong");
        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isUnauthorized());
    }
}