package com.rural.education.config;

import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.Arrays;

@Configuration
@EnableWebSecurity
@RequiredArgsConstructor // 必须加这个注解，用于自动注入 jwtAuthenticationFilter
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthenticationFilter;
    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
                // 1. 关闭 CSRF 保护
                // 前后端分离项目必须关闭，否则所有的 POST/PUT 请求都会默认被拦截并返回 403
                .csrf(csrf -> csrf.disable())

                // 2. 开启跨域支持 (CORS)
                // 允许前端（如 Web 管理后台）跨域调用接口
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))

                // 3. 设置 Session 管理为无状态 (STATELESS)
                // 极其重要：告诉 Spring Security 我们使用 JWT Token，不需要为其创建和维护传统的 Session
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))

                // 4. 配置接口的访问权限拦截规则
                .authorizeHttpRequests(auth -> auth
                        // === 放行区（不需要 Token 即可访问） ===

                        // 放行登录相关接口（微信真实登录 + 开发测试后门）
                        .requestMatchers("/auth/wx-login", "/auth/mock-login").permitAll()

                        // 放行 Swagger 在线接口文档相关的路径
                        .requestMatchers(
                                "/swagger-ui/**",
                                "/v3/api-docs/**",
                                "/swagger-ui.html",
                                "/swagger-resources/**",
                                "/webjars/**",
                                "/error"
                        ).permitAll()

                        // === 拦截区 ===
                        // 其他所有未在上面列出的接口，都必须经过身份认证（携带合法的 Token）才能访问
                        .anyRequest().authenticated()
                );

        http.addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    /**
     * 全局跨域配置
     */
    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        // 允许所有来源，生产环境建议替换为具体的域名
        configuration.setAllowedOriginPatterns(Arrays.asList("*"));
        // 允许的 HTTP 方法
        configuration.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "DELETE", "OPTIONS"));
        // 允许携带的请求头
        configuration.setAllowedHeaders(Arrays.asList("*"));
        // 允许携带凭证（如 Cookie，但使用 JWT 时一般不需要）
        configuration.setAllowCredentials(true);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        // 对所有路径生效
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }
}