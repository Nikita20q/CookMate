package smartfridge.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.RandomStringUtils;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import smartfridge.dto.*;
import smartfridge.entity.UserEntity;
import smartfridge.repository.UserRepository;
import smartfridge.security.utils.JwtUtil;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
@Slf4j
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;
    private final EmailService emailService;

    /**
     * Регистрация нового пользователя
     */
    @Transactional
    public AuthResponse register(RegisterRequest request) {
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new RuntimeException("Пользователь с таким email уже существует");
        }

        String verificationCode = RandomStringUtils.randomNumeric(6);
        LocalDateTime expiryTime = LocalDateTime.now().plusMinutes(UserEntity.VERIFICATION_CODE_EXPIRY_MINUTES);

        UserEntity user = UserEntity.builder()
                .email(request.getEmail())
                .passwordHash(passwordEncoder.encode(request.getPassword()))
                .emailVerified(false)
                .verificationCode(verificationCode)
                .verificationCodeExpiry(expiryTime)
                .build();

        user = userRepository.save(user);

        emailService.sendVerificationCode(request.getEmail(), verificationCode);

        log.info("Пользователь {} зарегистрирован, ожидает подтверждения email", request.getEmail());

        return AuthResponse.builder()
                .message("Регистрация успешна. Проверьте email для подтверждения.")
                .userId(user.getId())
                .email(user.getEmail())
                .build();
    }

    /**
     * Подтверждение email
     */
    @Transactional
    public AuthResponse verifyEmail(VerifyEmailRequest request) {
        UserEntity user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new RuntimeException("Пользователь не найден"));

        if (!user.getVerificationCode().equals(request.getCode())) {
            throw new RuntimeException("Неверный код подтверждения");
        }

        if (user.getVerificationCodeExpiry().isBefore(LocalDateTime.now())) {
            throw new RuntimeException("Срок действия кода истёк. Запросите новый код.");
        }

        user.setEmailVerified(true);
        user.setVerificationCode(null);
        user.setVerificationCodeExpiry(null);
        userRepository.save(user);

        String token = jwtUtil.generateToken(user.getId(), user.getEmail());

        log.info("Email пользователя {} подтверждён", user.getEmail());

        return AuthResponse.builder()
                .token(token)
                .userId(user.getId())
                .email(user.getEmail())
                .message("Email успешно подтверждён")
                .build();
    }

    /**
     * Повторная отправка кода подтверждения
     */
    @Transactional
    public void resendVerificationCode(String email) {
        UserEntity user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Пользователь не найден"));

        if (user.getEmailVerified()) {
            throw new RuntimeException("Email уже подтверждён");
        }

        String newCode = RandomStringUtils.randomNumeric(6);
        user.setVerificationCode(newCode);
        user.setVerificationCodeExpiry(LocalDateTime.now().plusMinutes(UserEntity.VERIFICATION_CODE_EXPIRY_MINUTES));
        userRepository.save(user);

        emailService.sendVerificationCode(email, newCode);

        log.info("Новый код подтверждения отправлен на {}", email);
    }

    /**
     * Вход в систему (только для подтверждённых пользователей)
     */
    public AuthResponse login(LoginRequest request) {
        UserEntity user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new RuntimeException("Пользователь не найден"));

        if (!passwordEncoder.matches(request.getPassword(), user.getPasswordHash())) {
            throw new RuntimeException("Неверный пароль");
        }

        if (!user.getEmailVerified()) {
            throw new RuntimeException("Email не подтверждён. Проверьте почту.");
        }

        String token = jwtUtil.generateToken(user.getId(), user.getEmail());

        return AuthResponse.builder()
                .token(token)
                .userId(user.getId())
                .email(user.getEmail())
                .build();
    }
}