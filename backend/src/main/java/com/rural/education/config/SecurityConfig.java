package com.rural.education.config;

import com.rural.education.filter.JwtAuthenticationFilter;
import com.rural.education.security.JwtAccessDeniedHandler;
import com.rural.education.security.JwtAuthenticationEntryPoint;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
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
@EnableMethodSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthenticationFilter;
    private final JwtAuthenticationEntryPoint jwtAuthenticationEntryPoint;
    private final JwtAccessDeniedHandler jwtAccessDeniedHandler;

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

                // 4. 配置异常处理：统一 401 / 403 响应格式
                .exceptionHandling(ex -> ex
                        .authenticationEntryPoint(jwtAuthenticationEntryPoint)
                        .accessDeniedHandler(jwtAccessDeniedHandler))

                // 5. 配置接口的访问权限拦截规则
                .authorizeHttpRequests(auth -> auth
                        // === 放行区（不需要 Token 即可访问） ===

                        // 放行登录相关接口（微信真实登录 + 开发测试后门）
                        .requestMatchers("/auth/wx-login", "/auth/mock-login", "/auth/phone-login").permitAll()

                        // 学校列表/详情：入驻前未登录即可查询（与 SchoolController GET 对齐）
                        .requestMatchers(HttpMethod.GET, "/schools", "/schools/**").permitAll()

                        // 放行 WebSocket 端点（身份验证在 STOMP 层面完成）
                        .requestMatchers("/ws/**").permitAll()

                        // 放行 Swagger 在线接口文档相关的路径
                        .requestMatchers(
                                "/swagger-ui/**",
                                "/v3/api-docs/**",
                                "/swagger-ui.html",
                                "/swagger-resources/**",
                                "/webjars/**",
                                "/error"
                        ).permitAll()

                        // === 角色级别的 URL 规则（纵深防御第二层） ===
                        // 注意：这里必须先放行 /student/profile 和 /teacher/profile 给任意登录用户（否则刚注册的用户没有 Role 2/3 会报403）
                        .requestMatchers(
                                "/student/profile", "/student/profile/**",
                                "/teacher/profile", "/teacher/profile/**"
                        ).authenticated()
                        .requestMatchers("/admin/**").hasAnyRole("0", "1")
                        .requestMatchers("/student/**").hasRole("3")
                        .requestMatchers("/teacher/**").hasRole("2")

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