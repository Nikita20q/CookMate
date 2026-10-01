package smartfridge.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;
import smartfridge.exceptions.BusinessException;

@Service
@RequiredArgsConstructor
@Slf4j
public class EmailService {

    private final JavaMailSender mailSender;

    @Value("${spring.mail.username}")
    private String fromEmail;

    public void sendVerificationCode(String toEmail, String code) {
        try {
            SimpleMailMessage message = new SimpleMailMessage();

            message.setFrom("CookMate <" + fromEmail + ">");
            message.setTo(toEmail);
            message.setSubject("Подтверждение регистрации в CookMate");
            message.setText(String.format("""
                Здравствуйте!
                
                Спасибо за регистрацию в CookMate!
                
                Ваш код подтверждения: %s
                
                Код действителен в течение 10 минут.
                
                Если вы не регистрировались, просто проигнорируйте это письмо.
                
                С уважением,
                Команда CookMate
                """, code));

            mailSender.send(message);
            log.info("Email с кодом {} отправлен на {}", code, toEmail);
        } catch (Exception e) {
            log.error("Ошибка при отправке email на {}: {}", toEmail, e.getMessage(), e);
            throw BusinessException.badRequest("Не удалось отправить email. Проверьте настройки SMTP.");
        }
    }
}