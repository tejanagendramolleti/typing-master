package com.examtyper.support;

import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.util.concurrent.atomic.AtomicInteger;

/**
 * The base class for the integration tests.
 *
 * The tests run against a real PostgreSQL started by Testcontainers, because
 * the application uses PostgreSQL-specific features — sequences,
 * `TIMESTAMPTZ`, check constraints and partial indexes — and a different
 * engine would let real bugs through. See `DECISIONS.md` D17.
 *
 * <p>The container is started once and shared by every test class, because
 * starting PostgreSQL is slow and the schema is the same for all of them.
 */
@SpringBootTest
@ActiveProfiles("test")
@Testcontainers
public abstract class PostgresIntegrationTest {

    /** The database the integration tests run against. */
    @Container
    public static final PostgreSQLContainer<?> POSTGRES = new PostgreSQLContainer<>("postgres:16-alpine")
            .withDatabaseName("examtyper")
            .withUsername("examtyper")
            .withPassword("examtyper")
            .withReuse(true);

    /**
     * Points the application at the container.
     *
     * The port is read from the running container rather than hard-coded,
     * because Testcontainers picks a free port each time.
     */
    @DynamicPropertySource
    static void configureDatabase(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", POSTGRES::getJdbcUrl);
        registry.add("spring.datasource.username", POSTGRES::getUsername);
        registry.add("spring.datasource.password", POSTGRES::getPassword);
        registry.add("spring.jpa.hibernate.ddl-auto", () -> "validate");
        registry.add("spring.flyway.enabled", () -> "true");
    }
}
