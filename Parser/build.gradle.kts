plugins {
    id("java")
    id("org.springframework.boot") version "3.4.2"
    id("io.spring.dependency-management") version "1.1.7"
}

group = "org.example"
version = "1.0-SNAPSHOT"

repositories {
    maven { url = uri("https://maven.aliyun.com/repository/public") }
    maven { url = uri("https://mirrors.cloud.tencent.com/nexus/repository/maven-public/") }
    mavenCentral()
}

dependencies {
    implementation("org.springframework.boot:spring-boot-starter-web")
    implementation("org.springframework.boot:spring-boot-starter-data-jpa")
    implementation("org.springframework.boot:spring-boot-starter-aop")
    implementation("org.springdoc:springdoc-openapi-starter-webmvc-ui:2.3.0")

    runtimeOnly("org.postgresql:postgresql")
    implementation("org.jsoup:jsoup:1.17.2")
    implementation("com.fasterxml.jackson.core:jackson-databind:2.18.1")

    compileOnly("org.projectlombok:lombok")
    annotationProcessor("org.projectlombok:lombok")

    testImplementation("org.springframework.boot:spring-boot-starter-test")
    testImplementation("org.junit.jupiter:junit-jupiter")

    implementation("com.squareup.okhttp3:okhttp:4.12.0")
    implementation("software.amazon.awssdk:s3:2.20.26")
}

tasks.test {
    useJUnitPlatform()
}
