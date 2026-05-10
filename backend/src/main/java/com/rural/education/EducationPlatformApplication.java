package com.rural.education;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class EducationPlatformApplication {
    public static void main(String[] args) {
        SpringApplication.run(EducationPlatformApplication.class, args);
    }
}

