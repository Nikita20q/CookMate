package smartfridge.exceptions;

import lombok.Getter;
import org.springframework.http.HttpStatus;

@Getter
public class BusinessException extends RuntimeException {

    private final HttpStatus status;
    private final String title;

    public BusinessException(String title, String message, HttpStatus status) {
        super(message);
        this.title = title;
        this.status = status;
    }

    public static BusinessException notFound(String entity, Object id) {
        return new BusinessException(
                "Не найдено",
                String.format("%s с id '%s' не найден", entity, id),
                HttpStatus.NOT_FOUND
        );
    }

    public static BusinessException conflict(String message) {
        return new BusinessException("Конфликт", message, HttpStatus.CONFLICT);
    }

    public static BusinessException forbidden(String message) {
        return new BusinessException("Доступ запрещён", message, HttpStatus.FORBIDDEN);
    }

    public static BusinessException badRequest(String message) {
        return new BusinessException("Некорректный запрос", message, HttpStatus.BAD_REQUEST);
    }
}