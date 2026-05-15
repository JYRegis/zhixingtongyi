package com.rural.education.filter;

import com.rural.education.exception.AuthException;
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
                    if (Boolean.TRUE.equals(isBlacklisted)) {
                        filterChain.doFilter(request, response);
                        return;
                    }
                } catch (Exception e) {
                    // 如果 Redis 连不上，记录警告日志但继续往下走，保证核心登录功能不挂掉
                    log.warn("Redis连接失败，跳过黑名单校验: {}", e.getMessage());
                }

                // 3. 解析 Token；匿名放行路径上若带过期/错误 Token，不得拦截登录与学校列表
                try {
                    Long userId = jwtUtil.getUserIdFromToken(jwt);
                    if (userId != null) {
                        CurrentUserContext.setUserId(userId);
                    }
                    if (userId != null && SecurityContextHolder.getContext().getAuthentication() == null) {
                        UsernamePasswordAuthenticationToken authentication =
                                new UsernamePasswordAuthenticationToken(userId, null, Collections.emptyList());
                        authentication.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                        SecurityContextHolder.getContext().setAuthentication(authentication);
                    }
                } catch (AuthException e) {
                    if (allowsInvalidBearerToken(request)) {
                        log.debug("匿名放行路径上忽略无效 Authorization: path={}, msg={}", resolvePath(request), e.getMessage());
                    } else {
                        throw e;
                    }
                }
            }
            filterChain.doFilter(request, response);
        } catch (AuthException e) {
            log.warn("Token 无效或已过期: {}", e.getMessage());
            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            response.setContentType("application/json;charset=UTF-8");
            response.getWriter().write("{\"code\":401,\"message\":\"" + escapeJson(e.getMessage()) + "\",\"data\":null}");
        } catch (Exception e) {
            log.error("Token 解析失败: {}", e.getMessage());
            filterChain.doFilter(request, response);
        } finally {
            CurrentUserContext.clear();
        }
    }

    /**
     * 与 {@link com.rural.education.config.SecurityConfig} 中 permitAll 对齐：这些路径不应因「带了坏 Token」而 401。
     * 典型场景：小程序全局请求头仍挂着旧 JWT，用户再次调用登录接口。
     */
    private boolean allowsInvalidBearerToken(HttpServletRequest request) {
        String path = resolvePath(request);
        if (path == null) {
            return false;
        }
        if ("/auth/wx-login".equals(path) || "/auth/mock-login".equals(path) || "/auth/phone-login".equals(path)) {
            return true;
        }
        String method = request.getMethod();
        if (method != null && "GET".equalsIgnoreCase(method)
                && ("/schools".equals(path) || path.startsWith("/schools/"))) {
            return true;
        }
        if (path.startsWith("/swagger-ui") || path.startsWith("/v3/api-docs") || "/swagger-ui.html".equals(path)
                || path.startsWith("/swagger-resources") || path.startsWith("/webjars") || "/error".equals(path)) {
            return true;
        }
        return false;
    }

    private String resolvePath(HttpServletRequest request) {
        String uri = request.getRequestURI();
        String ctx = request.getContextPath();
        if (uri != null && ctx != null && !ctx.isEmpty() && uri.startsWith(ctx)) {
            return uri.substring(ctx.length());
        }
        String sp = request.getServletPath();
        if (sp != null && !sp.isEmpty()) {
            return sp;
        }
        return uri;
    }

    private static String escapeJson(String s) {
        if (s == null) {
            return "";
        }
        return s.replace("\\", "\\\\").replace("\"", "\\\"");
    }

    private String getJwtFromRequest(HttpServletRequest request) {
        String bearerToken = request.getHeader("Authorization");
        if (StringUtils.hasText(bearerToken) && bearerToken.startsWith("Bearer ")) {
            return bearerToken.substring(7); // 截取 "Bearer " 后面的真实 Token
        }
        return null;
    }
}