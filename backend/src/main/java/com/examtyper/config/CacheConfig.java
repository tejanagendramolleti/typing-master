package com.examtyper.config;

import com.github.benmanes.caffeine.cache.Caffeine;
import org.springframework.cache.CacheManager;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.cache.caffeine.CaffeineCacheManager;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.time.Duration;

/**
 * Cache configuration.
 *
 * <p>Uses Caffeine in-process so the application needs no Redis and no extra
 * service to run. The exam-profile and passage-list caches are what matter:
 * they are read on every test start but change only when an administrator edits
 * them.
 *
 * <p>For a multi-instance deployment, replace this bean with a Redis-backed
 * {@code CacheManager}. Nothing else in the codebase needs to change.
 */
@Configuration
@EnableCaching
public class CacheConfig {

    public static final String EXAM_PROFILES = "examProfiles";
    public static final String PASSAGE_LIST = "passageList";
    public static final String PLANS = "plans";

    @Bean
    public CacheManager cacheManager() {
        CaffeineCacheManager manager = new CaffeineCacheManager();
        manager.setCaffeine(Caffeine.newBuilder()
                .maximumSize(1_000)
                .expireAfterWrite(Duration.ofMinutes(10)));
        // Never cache null values: a missing entity should be re-read, not
        // remembered as absent for ten minutes.
        manager.setAllowNullValues(false);
        return manager;
    }
}
