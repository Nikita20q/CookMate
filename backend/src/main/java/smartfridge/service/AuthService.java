package smartfridge.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.RandomStringUtils;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import smartfridge.dto.*;
import smartfridge.entity.UserEntity;
import smartfridge.exceptions.BusinessException;
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

    @Transactional
    public AuthResponse register(RegisterRequest request) {
        if (userRepository.existsByEmail(request.getEmail())) {
            throw BusinessException.conflict("Пользователь с email '" + request.getEmail() + "' уже существует");
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

    @Transactional
    public AuthResponse verifyEmail(VerifyEmailRequest request) {
        UserEntity user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> BusinessException.notFound("Пользователь", request.getEmail()));

        if (Boolean.TRUE.equals(user.getEmailVerified())) {
            throw BusinessException.conflict("Email уже подтверждён");
        }

        if (user.getVerificationCode() == null ||
                !user.getVerificationCode().equals(request.getCode())) {
            throw BusinessException.badRequest("Неверный код подтверждения");
        }

        if (user.getVerificationCodeExpiry() != null &&
                LocalDateTime.now().isAfter(user.getVerificationCodeExpiry())) {
            throw BusinessException.badRequest("Срок действия кода истёк. Запросите новый код.");
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

    @Transactional
    public void resendVerificationCode(String email) {
        UserEntity user = userRepository.findByEmail(email)
                .orElseThrow(() -> BusinessException.notFound("Пользователь", email));

        if (Boolean.TRUE.equals(user.getEmailVerified())) {
            throw BusinessException.conflict("Email уже подтверждён");
        }

        String newCode = RandomStringUtils.randomNumeric(6);
        user.setVerificationCode(newCode);
        user.setVerificationCodeExpiry(LocalDateTime.now().plusMinutes(UserEntity.VERIFICATION_CODE_EXPIRY_MINUTES));
        userRepository.save(user);

        emailService.sendVerificationCode(email, newCode);

        log.info("Новый код подтверждения отправлен на {}", email);
    }

    public AuthResponse login(LoginRequest request) {
        UserEntity user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> BusinessException.badRequest("Неверный email или пароль"));

        if (!passwordEncoder.matches(request.getPassword(), user.getPasswordHash())) {
            throw BusinessException.badRequest("Неверный email или пароль");
        }

        if (!Boolean.TRUE.equals(user.getEmailVerified())) {
            throw BusinessException.forbidden("Email не подтверждён. Проверьте почту.");
        }

        String token = jwtUtil.generateToken(user.getId(), user.getEmail());

        return AuthResponse.builder()
                .token(token)
                .userId(user.getId())
                .email(user.getEmail())
                .build();
    }
}