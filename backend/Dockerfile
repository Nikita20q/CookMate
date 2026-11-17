# Сборка
FROM eclipse-temurin:17-jdk-alpine AS build
WORKDIR /app

COPY build.gradle.kts settings.gradle.kts ./
COPY gradle gradle
COPY gradlew ./
RUN chmod +x gradlew

RUN ./gradlew dependencies --no-daemon

COPY src ./src
RUN test -f src/main/java/smartfridge/CookMateBackendApplication.java \
    && test -f src/main/resources/application.yml \
    && ./gradlew bootJar --no-daemon

# Запуск
FROM eclipse-temurin:17-jre-alpine
WORKDIR /app

COPY --from=build /app/build/libs/*.jar app.jar

EXPOSE 8080

ENTRYPOINT ["java", "-jar", "app.jar"]