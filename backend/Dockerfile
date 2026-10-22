# ---------- build stage ----------
FROM maven:3.9.9-eclipse-temurin-21 AS build
WORKDIR /build

# Warm the dependency layer first so source edits do not re-download the world.
COPY pom.xml .
RUN mvn -B -q dependency:go-offline

COPY src ./src
RUN mvn -B -q clean package -DskipTests

# ---------- runtime stage ----------
FROM eclipse-temurin:21-jre-jammy AS runtime
WORKDIR /app

# Run as an unprivileged user.
RUN groupadd --system examtyper && useradd --system --gid examtyper --home /app examtyper

COPY --from=build /build/target/examtyper.jar /app/examtyper.jar
RUN chown -R examtyper:examtyper /app
USER examtyper

EXPOSE 8080

ENV JAVA_OPTS="-XX:MaxRAMPercentage=75 -XX:+UseSerialGC" \
    SPRING_PROFILES_ACTIVE=prod

# The address is 127.0.0.1 and not "localhost" on purpose: "localhost" can
# resolve to the IPv6 loopback, where nothing is listening, and the check
# would fail even though the API is up.
HEALTHCHECK --interval=15s --timeout=5s --start-period=60s --retries=5 \
  CMD wget -qO- http://127.0.0.1:8080/actuator/health/readiness || exit 1

ENTRYPOINT ["sh", "-c", "exec java $JAVA_OPTS -jar /app/examtyper.jar"]
