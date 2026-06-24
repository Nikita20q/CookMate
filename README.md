# CookMate Backend - Документация

## Описание

Backend-часть приложения CookMate - REST API сервис, реализованный на Spring Boot. Отвечает за:
- Аутентификацию и авторизацию (JWT)
- Управление рецептами
- Избранное пользователей
- Историю поиска
- Интеграцию с ML-сервисом для распознавания ингредиентов
- Загрузку изображений в S3 хранилище
- Отправку email для подтверждения регистрации

## Архитектура 

Слой контроллеров (Controllers) принимает HTTP-запросы от Gateway и преобразует их в вызовы бизнес-логики. Все контроллеры аннотированы @RestController и @RequestMapping.

Слой сервисов (Services) содержит всю бизнес-логику приложения. Каждый сервис отвечает за свою предметную область: AuthService управляет регистрацией и входом, RecipeService работает с рецептами, EmailService отправляет письма, MlService взаимодействует с ML-сервисом, S3Service загружает файлы в облачное хранилище. Сервисы инжектятся через конструктор с помощью @RequiredArgsConstructor из Lombok.

Слой репозиториев (Repositories) наследуется от JpaRepository и предоставляет методы для работы с базой данных. Spring Data JPA автоматически генерирует SQL-запросы на основе имён методов.

Слой безопасности реализован через Spring Security с использованием JWT-токенов. JwtFilter перехватывает каждый запрос и проверяет наличие валидного токена в заголовке Authorization. SecurityConfig настраивает, какие эндпоинты требуют аутентификации, а какие доступны публично. Пароли хешируются с помощью BCryptPasswordEncoder.

Слой конфигурации включает AppConfig (настройка RestTemplate для HTTP-запросов), OpenApiConfig (генерация Swagger-документации), WebConfig (кастомные резолверы аргументов, например, для извлечения userId из JWT) и SecurityConfig (настройка CORS и безопасности).

Взаимодействие с внешними сервисами:
PostgreSQL - основное хранилище данных (пользователи, рецепты, ингредиенты, избранное, история поиска)
ML-сервис (Python FastAPI) - распознавание ингредиентов на фото через YOLO, вызывается через RestTemplate
S3-хранилище (Reg.ru Cloud) - хранение изображений рецептов, используется AWS S3 SDK
SMTP-сервер (Yandex) - отправка писем с кодами подтверждения
Spring Cloud Gateway - единая точка входа, маршрутизирует запросы от фронтенда к backend

## Технологии

- Java
- Spring boot
- Spring Security
- Spring Data JPA
- PostgreSQL
- JWT
- Swagger/OpenAPI
- Gradle
- Docker

## Развёртывание

### Конфигурация

Сначала необходимо создать .env файл с конфигурацией в папке проекта.

#### PostgreSQL
POSTGRES_DB=cookmate

POSTGRES_USER=postgres

POSTGRES_PASSWORD=postgres

#### Email
MAIL_USERNAME=your-email@yandex.ru

MAIL_PASSWORD=your-app-password

#### JWT
JWT_SECRET=secret-key

#### ML Service
ML_SERVICE_URL=http://ml-service:8000

#### S3
S3_ACCESS_KEY=your-access-key

S3_SECRET_KEY=your-secret-key

S3_BUCKET=cookmate-images

S3_ENDPOINT=your-s3-storage

S3_REGION=your-s3-region

#### URLS
SERVER_URL=http://localhost:8080
GATEWAY_URL=http://localhost:8090

### Запуск

docker-compose up -d