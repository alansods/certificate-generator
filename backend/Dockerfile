# syntax=docker/dockerfile:1

# --- Build stage -------------------------------------------------------
FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /workspace

# Dependency layer cached separately from source: as long as pom.xml is
# unchanged, this layer survives across source-only rebuilds.
COPY pom.xml .
COPY .mvn .mvn
COPY mvnw .
RUN chmod +x mvnw && ./mvnw -B dependency:go-offline

COPY src src
# Tests already gate merges via CI; skipped here so the image build only
# packages, rather than duplicating the test run.
RUN ./mvnw -B -DskipTests package

# --- Runtime stage -------------------------------------------------------
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app

RUN addgroup -S app && adduser -S app -G app
COPY --from=build /workspace/target/*.jar app.jar
USER app

EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
