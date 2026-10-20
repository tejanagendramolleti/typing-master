package com.examtyper;

import com.examtyper.common.config.AppProperties;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.scheduling.annotation.EnableScheduling;

/**
 * ExamTyper application entry point.
 */
@SpringBootApplication
@EnableCaching
@EnableScheduling
@EnableConfigurationProperties(AppProperties.class)
public class ExamTyperApplication {

    public static void main(String[] args) {
        SpringApplication.run(ExamTyperApplication.class, args);
    }
}
