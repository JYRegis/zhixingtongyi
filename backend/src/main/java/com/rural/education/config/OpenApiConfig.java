package com.rural.education.config;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class OpenApiConfig {

    @Bean
    public OpenAPI customOpenAPI() {
        return new OpenAPI()
                // 1. 配置基础的文档信息
                .info(new Info()
                        .title("乡村教育平台 API 文档")
                        .version("1.0")
                        .description("包含微信登录、JWT鉴权等接口测试"))

                // 2. 召唤右上角的 Authorize 小锁 🔒！
                .components(new Components()
                        .addSecuritySchemes("bearer-jwt", // 给这个安全方案起个名字
                                new SecurityScheme()
                                        .type(SecurityScheme.Type.HTTP)
                                        .scheme("bearer")
                                        .bearerFormat("JWT")
                                        .in(SecurityScheme.In.HEADER)
                                        .name("Authorization")))

                // 3. 将这个 Token 规则全局应用到所有接口（这样每次请求都会自动带上请求头）
                .addSecurityItem(new SecurityRequirement().addList("bearer-jwt"));
    }
}