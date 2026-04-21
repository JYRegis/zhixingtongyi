package com.rural.education.config;

import org.mybatis.spring.annotation.MapperScan;
import org.springframework.context.annotation.Configuration;

@Configuration
@MapperScan("com.rural.education.mapper")
public class MybatisPlusConfig {
}

