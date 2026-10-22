package com.examtyper.support;

import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.PostgreSQLContainer;

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
public abstract class PostgresIntegrationTest {

    /**
     * The database the integration tests run against.
     *
     * <p>It is started by hand rather than declared as a {@code @Container}
     * field, and that is deliberate. The JUnit extension manages the
     * lifetime of a container around the class that declares it, but the
     * Spring context is cached and handed to the classes that follow, so
     * the second class would be given a context whose data source points at
     * a container that has already been stopped — and every test in it
     * would fail with a refused connection. Starting the container here
     * gives the whole run one database, on one port, for as long as the
     * JVM is alive.
     */
    public static final PostgreSQLContainer<?> POSTGRES = startPostgres();

    /**
     * Starts the container and makes sure it goes away with the JVM.
     */
    private static PostgreSQLContainer<?> startPostgres() {
        PostgreSQLContainer<?> container = new PostgreSQLContainer<>("postgres:16-alpine")
                .withDatabaseName("examtyper")
                .withUsername("examtyper")
                .withPassword("examtyper");

        try {
            container.start();
        } catch (RuntimeException cause) {
            throw new IllegalStateException("The test database could not be started.", cause);
        }

        // Ryuk collects the container when the JVM exits, but a shutdown
        // hook is tidier: the database is stopped deliberately, in order,
        // rather than being killed with whatever else is running.
        Runtime.getRuntime().addShutdownHook(new Thread(() -> {
            try {
                container.stop();
            } catch (RuntimeException ignored) {
                // Nothing useful can be done while the JVM is shutting down.
            }
        }));

        return container;
    }

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
