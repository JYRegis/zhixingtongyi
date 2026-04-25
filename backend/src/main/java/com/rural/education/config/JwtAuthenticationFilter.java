package com.rural.education.config;

import com.rural.education.utils.JwtUtil;
import com.rural.education.utils.CurrentUserContext;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Collections;

@Slf4j
@Component
@RequiredArgsConstructor
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtUtil jwtUtil;
    private final StringRedisTemplate redisTemplate;

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {

        try {
            // 1. 从请求头提取 Token
            String jwt = getJwtFromRequest(request);

            if (StringUtils.hasText(jwt)) {
                // 2. 检查 Token 是否在黑名单中
                try {
                    Boolean isBlacklisted = redisTemplate.hasKey("jwt:blacklist:" + jwt);
                    if (isBlacklisted) {
                        filterChain.doFilter(request, response);
                        return;
                    }
                } catch (Exception e) {
                    // 如果 Redis 连不上，记录警告日志但继续往下走，保证核心登录功能不挂掉
                    log.warn("Redis连接失败，跳过黑名单校验: {}", e.getMessage());
                }

                // 3. 解析 Token 获取用户信息
                Long userId = jwtUtil.getUserIdFromToken(jwt);
                if (userId != null) {
                    CurrentUserContext.setUserId(userId);
                }

                // 4. 将用户认证信息存入 Spring Security 上下文
                if (userId != null && SecurityContextHolder.getContext().getAuthentication() == null) {
                    UsernamePasswordAuthenticationToken authentication =
                            new UsernamePasswordAuthenticationToken(userId, null, Collections.emptyList());
                    authentication.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));

                    SecurityContextHolder.getContext().setAuthentication(authentication);
                }
            }
            // 5. 放行请求（无论 Token 是否存在或解析是否失败）
            filterChain.doFilter(request, response);
        } catch (Exception e) {
            log.error("Token 解析失败: {}", e.getMessage());
            // Token 解析失败不阻断请求链路
            filterChain.doFilter(request, response);
        } finally {
            CurrentUserContext.clear();
        }
    }

    private String getJwtFromRequest(HttpServletRequest request) {
        String bearerToken = request.getHeader("Authorization");
        if (StringUtils.hasText(bearerToken) && bearerToken.startsWith("Bearer ")) {
            return bearerToken.substring(7); // 截取 "Bearer " 后面的真实 Token
        }
        return null;
    }
}