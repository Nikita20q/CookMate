package smartfridge.controller;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import smartfridge.BaseIntegrationTest;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@DisplayName("Валидация защищённых endpoints без токена")
public class ProtectedEndpointsValidationTest extends BaseIntegrationTest {

    @Test
    @DisplayName("TC-P01: GET /favorites без токена — 401")
    void favoritesWithoutTokenRejected() throws Exception {
        mockMvc.perform(get("/api/v1/favorites"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("TC-P02: GET /search-history без токена — 401")
    void searchHistoryWithoutTokenRejected() throws Exception {
        mockMvc.perform(get("/api/v1/search-history"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("TC-P03: GET /favorites с невалидным токеном — 401")
    void favoritesWithInvalidTokenRejected() throws Exception {
        mockMvc.perform(get("/api/v1/favorites")
                        .header("Authorization", "Bearer invalid.token.here"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("TC-P04: GET /favorites с пустым токеном — 401")
    void favoritesWithEmptyTokenRejected() throws Exception {
        mockMvc.perform(get("/api/v1/favorites")
                        .header("Authorization", "Bearer "))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("TC-P05: GET /favorites с просроченным токеном — 401")
    void favoritesWithExpiredTokenRejected() throws Exception {
        //eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIiwiZW1haWwiOiJ0ZXN0QGV4YW1wbGUuY29tIiwiZXhwIjoxNjAwMDAwMDAwfQ.expired
        String expiredToken = "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIiwiZW1haWwiOiJ0ZXN0QGV4YW1wbGUuY29tIiwiZXhwIjoxNjAwMDAwMDAwfQ.expired_signature";

        mockMvc.perform(get("/api/v1/favorites")
                        .header("Authorization", "Bearer " + expiredToken))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("TC-P06: Ответ 401 не содержит внутренних деталей")
    void unauthorizedResponseDoesNotLeakInternals() throws Exception {
        var result = mockMvc.perform(get("/api/v1/favorites"))
                .andExpect(status().isUnauthorized())
                .andReturn();

        String body = result.getResponse().getContentAsString();
        assert !body.contains("stacktrace");
        assert !body.contains("JwtFilter");
        assert !body.contains("smartfridge.");
    }
}