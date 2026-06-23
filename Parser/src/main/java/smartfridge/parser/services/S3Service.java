package smartfridge.parser.services;

import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import lombok.extern.slf4j.Slf4j;
import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.Response;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.S3Configuration;
import software.amazon.awssdk.services.s3.model.ObjectCannedACL;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;

import java.io.IOException;
import java.net.InetAddress;
import java.net.URI;
import java.util.UUID;
import java.util.concurrent.TimeUnit;

@Service
@Slf4j
public class S3Service {

    @Value("${cloud.aws.s3.endpoint:https://s3.regru.cloud}")
    private String endpoint;

    @Value("${cloud.aws.s3.bucket:cookmate-images}")
    private String bucketName;

    @Value("${cloud.aws.s3.region:ru-1}")
    private String region;

    @Value("${cloud.aws.credentials.access-key:}")
    private String accessKey;

    @Value("${cloud.aws.credentials.secret-key:}")
    private String secretKey;

    private S3Client s3Client;

    private final OkHttpClient httpClient = new OkHttpClient.Builder()
            .connectTimeout(10, TimeUnit.SECONDS)
            .readTimeout(30, TimeUnit.SECONDS)
            .followRedirects(true)
            .build();

    @PostConstruct
    public void init() {
        if (accessKey == null || accessKey.isEmpty() || secretKey == null || secretKey.isEmpty()) {
            log.warn("S3 credentials не заданы! S3Service будет работать в режиме fallback.");
            return;
        }

        try {
            AwsBasicCredentials credentials = AwsBasicCredentials.create(accessKey, secretKey);
            s3Client = S3Client.builder()
                    .region(Region.of(region))
                    .endpointOverride(URI.create(endpoint))
                    .credentialsProvider(StaticCredentialsProvider.create(credentials))
                    .serviceConfiguration(S3Configuration.builder()
                            .pathStyleAccessEnabled(true)
                            .build())
                    .build();
            log.info("S3 клиент инициализирован: bucket={}, endpoint={}", bucketName, endpoint);

            try {
                String host = URI.create(endpoint).getHost();
                InetAddress[] addresses = InetAddress.getAllByName(host);
                log.info("DNS для S3 ({}): {}", host, java.util.Arrays.toString(addresses));
            } catch (Exception e) {
                log.error("DNS для S3 не работает: {}", e.getMessage());
            }

        } catch (Exception e) {
            log.error("Ошибка инициализации S3 клиента: {}", e.getMessage());
        }
    }

    @PreDestroy
    public void cleanup() {
        if (s3Client != null) {
            s3Client.close();
        }
    }

    private String normalizeUrl(String url) {
        if (url == null || url.isEmpty()) {
            return url;
        }

        if (url.startsWith("//")) {
            return "https:" + url;
        }

        if (url.startsWith("/")) {
            return "https://1000.menu" + url;
        }

        return url;
    }

    public String uploadRecipeImage(String imageUrl, String recipeSlug) {
        if (imageUrl == null || imageUrl.isEmpty()) {
            log.warn("Пустой URL картинки для рецепта {}", recipeSlug);
            return null;
        }

        if (s3Client == null) {
            log.error("S3 клиент не инициализирован! Картинка НЕ будет загружена.");
            return null;
        }

        String normalizedUrl = normalizeUrl(imageUrl);

        log.info("Рецепт {}: оригинальный URL → {}", recipeSlug, imageUrl);
        log.info("Рецепт {}: нормализованный URL → {}", recipeSlug, normalizedUrl);

        try {
            byte[] imageBytes = downloadImage(normalizedUrl);
            String fileName = generateRecipeImageFileName(recipeSlug, normalizedUrl);
            String contentType = getContentType(normalizedUrl);
            String s3Url = uploadToS3(imageBytes, fileName, contentType);

            log.info("Рецепт {}: картинка загружена в S3 → {}", recipeSlug, s3Url);
            return s3Url;

        } catch (Exception e) {
            log.error("Ошибка при загрузке картинки рецепта {}: {}", recipeSlug, e.getMessage());
            log.error("Тип ошибки: {}", e.getClass().getName());
            if (e.getCause() != null) {
                log.error("Причина: {} - {}", e.getCause().getClass().getName(), e.getCause().getMessage());
            }
            return null;
        }
    }

    public String uploadStepImage(String imageUrl, String recipeSlug, int stepNumber) {
        if (imageUrl == null || imageUrl.isEmpty()) {
            log.warn("Пустой URL картинки для шага {} рецепта {}", stepNumber, recipeSlug);
            return null;
        }

        if (s3Client == null) {
            log.error("S3 клиент не инициализирован! Картинка шага НЕ будет загружена.");
            return null;
        }

        String normalizedUrl = normalizeUrl(imageUrl);

        log.info("Шаг {} для {}: нормализованный URL → {}", stepNumber, recipeSlug, normalizedUrl);

        try {
            byte[] imageBytes = downloadImage(normalizedUrl);
            String fileName = generateStepImageFileName(recipeSlug, stepNumber, normalizedUrl);
            String contentType = getContentType(normalizedUrl);
            String s3Url = uploadToS3(imageBytes, fileName, contentType);

            log.info("Рецепт {}: шаг {} загружен в S3 → {}", recipeSlug, stepNumber, s3Url);
            return s3Url;

        } catch (Exception e) {
            log.error("Ошибка при загрузке картинки шага {} рецепта {}: {}",
                    stepNumber, recipeSlug, e.getMessage());
            return null;
        }
    }

    private byte[] downloadImage(String imageUrl) throws IOException {
        log.info("Скачивание картинки: {}", imageUrl);

        try {
            String host = URI.create(imageUrl).getHost();
            InetAddress[] addresses = InetAddress.getAllByName(host);
            log.info("DNS для {}: {}", host, java.util.Arrays.toString(addresses));
        } catch (Exception e) {
            log.error("DNS не работает для {}: {}", imageUrl, e.getMessage());
        }

        Request request = new Request.Builder()
                .url(imageUrl)
                .header("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36")
                .build();

        try (Response response = httpClient.newCall(request).execute()) {
            if (!response.isSuccessful()) {
                throw new IOException("Failed to download image: HTTP " + response.code());
            }

            if (response.body() == null) {
                throw new IOException("Empty response body");
            }

            byte[] bytes = response.body().bytes();
            log.info("Картинка скачана: {} байт", bytes.length);
            return bytes;
        }
    }

    private String generateRecipeImageFileName(String recipeSlug, String imageUrl) {
        String extension = getFileExtension(imageUrl);
        String uniqueId = UUID.randomUUID().toString().substring(0, 8);
        return String.format("recipes/%s/main-%s%s", recipeSlug, uniqueId, extension);
    }

    private String generateStepImageFileName(String recipeSlug, int stepNumber, String imageUrl) {
        String extension = getFileExtension(imageUrl);
        String uniqueId = UUID.randomUUID().toString().substring(0, 8);
        return String.format("recipes/%s/step-%d-%s%s", recipeSlug, stepNumber, uniqueId, extension);
    }

    private String uploadToS3(byte[] imageBytes, String fileName, String contentType) {
        log.debug("Загрузка в S3: {} ({} байт, {})", fileName, imageBytes.length, contentType);

        PutObjectRequest putObjectRequest = PutObjectRequest.builder()
                .bucket(bucketName)
                .key(fileName)
                .contentType(contentType)
                .acl(ObjectCannedACL.PUBLIC_READ)
                .build();

        s3Client.putObject(putObjectRequest, RequestBody.fromBytes(imageBytes));

        String publicUrl = String.format("%s/%s/%s",
                endpoint.replaceAll("/$", ""),
                bucketName,
                fileName);

        log.info("Картинка загружена в S3: {}", publicUrl);
        return publicUrl;
    }

    private String getFileExtension(String url) {
        if (url == null)
            return ".jpg";
        String lowerUrl = url.toLowerCase();
        int queryIndex = lowerUrl.indexOf('?');
        if (queryIndex > 0) {
            lowerUrl = lowerUrl.substring(0, queryIndex);
        }
        if (lowerUrl.contains(".png"))
            return ".png";
        if (lowerUrl.contains(".webp"))
            return ".webp";
        if (lowerUrl.contains(".gif"))
            return ".gif";
        if (lowerUrl.contains(".jpg") || lowerUrl.contains(".jpeg"))
            return ".jpg";
        return ".jpg";
    }

    private String getContentType(String imageUrl) {
        if (imageUrl == null)
            return "image/jpeg";
        String lowerUrl = imageUrl.toLowerCase();
        if (lowerUrl.contains(".png"))
            return "image/png";
        if (lowerUrl.contains(".webp"))
            return "image/webp";
        if (lowerUrl.contains(".gif"))
            return "image/gif";
        return "image/jpeg";
    }
}