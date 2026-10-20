package com.examtyper;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.scheduling.annotation.EnableScheduling;

/**
 * ExamTyper application entry point.
 */
@SpringBootApplication
@EnableCaching
@EnableScheduling
public class ExamTyperApplication {

    public static void main(String[] args) {
        SpringApplication.run(ExamTyperApplication.class, args);
    }
}
