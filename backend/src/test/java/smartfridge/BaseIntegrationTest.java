package smartfridge;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import smartfridge.config.SecurityConfig;
import smartfridge.security.utils.JwtUtil;
import smartfridge.service.*;

import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@WebMvcTest
@Import(SecurityConfig.class)
public abstract class BaseIntegrationTest {

    @Autowired protected MockMvc mockMvc;
    @Autowired protected ObjectMapper objectMapper;

    @MockBean protected RecipeService recipeService;
    @MockBean protected SearchHistoryService searchHistoryService;
    @MockBean protected AuthService authService;
    @MockBean protected MlService mlService;
    @MockBean protected EmailService emailService;
    @MockBean protected FavoriteService favoriteService;

    @MockBean protected JwtUtil jwtUtil;
    @MockBean protected UserDetailsService userDetailsService;
    @MockBean protected PasswordEncoder passwordEncoder;

    @BeforeEach
    void setUpMocks() {
        when(mlService.recognizeIngredients(any())).thenReturn(List.of());

        // ВАЖНО: По умолчанию токены НЕВАЛИДНЫ, чтобы защищенные эндпоинты возвращали 401
        when(jwtUtil.validateToken(any())).thenReturn(false);

        when(jwtUtil.getUserIdFromToken(any())).thenReturn(1L);
        when(jwtUtil.getEmailFromToken(any())).thenReturn("test@example.com");
        when(passwordEncoder.encode(any())).thenReturn("hashedPassword");
        when(passwordEncoder.matches(any(), any())).thenReturn(true);
    }

    protected MockMultipartFile createImageFile(String name, byte[] content, String contentType) {
        return new MockMultipartFile("file", name, contentType, content);
    }

    protected byte[] createMinimalJpeg() {
        return new byte[]{(byte) 0xFF, (byte) 0xD8, (byte) 0xFF, (byte) 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00, (byte) 0xFF, (byte) 0xD9};
    }

    protected byte[] createMinimalPng() {
        return new byte[]{(byte) 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x08, 0x02, 0x00, 0x00, 0x00, (byte) 0x90, 0x77, 0x53, (byte) 0xDE, 0x00, 0x00, 0x00, 0x0C, 0x49, 0x44, 0x41, 0x54, 0x08, (byte) 0xD7, 0x63, (byte) 0xF8, (byte) 0xCF, (byte) 0xC0, 0x00, 0x00, 0x00, 0x02, 0x00, 0x01, (byte) 0xE2, 0x21, (byte) 0xBC, 0x33, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, 0x44, (byte) 0xAE, 0x42, 0x60, (byte) 0x82};
    }
}