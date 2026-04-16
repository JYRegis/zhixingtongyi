package com.zhixingtongyi.backend.interceptor;

import com.zhixingtongyi.backend.common.exception.BusinessException;
import com.zhixingtongyi.backend.common.context.UserContext;
import com.zhixingtongyi.backend.utils.JwtUtils;
import io.jsonwebtoken.Claims;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;
import org.apache.commons.lang3.StringUtils;

import java.util.concurrent.TimeUnit;

@Component
@Slf4j
public class JwtInterceptor implements HandlerInterceptor {

    private final JwtUtils jwtUtils;
    private final RedisTemplate redisTemplate;

    public JwtInterceptor(JwtUtils jwtUtils, RedisTemplate redisTemplate) {
        this.jwtUtils = jwtUtils;
        this.redisTemplate = redisTemplate;
    }

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) {
        // 获取请求头中的 Token
        String token = request.getHeader("Authorization");

        // 判空：如果没传 Token，直接抛出未登录异常
        if (StringUtils.isBlank(token)) {
            log.warn("请求拒绝：未检测到 Authorization 头部");
            throw new BusinessException(401, "请先登录");
        }

        // 去除 Bearer 前缀获取真实 JWT 字符串
        if (token.startsWith("Bearer ")) {
            token = token.substring(7);
        }

        try {
            // 解析 JWT 并验证合法性、是否过期（载荷层面的过期）
            Claims claims = jwtUtils.extractClaims(token);

            Long userId = Long.valueOf(claims.get("id").toString());

            // Redis 准入校验
            // 即使 JWT 没过期，如果 Redis 里没有这个用户的 Key，说明登录态已失效（如手动退出或太久没操作）
            String redisKey = "auth:token:" + userId;
            Object storedToken = redisTemplate.opsForValue().get(redisKey);

            if (storedToken == null || !storedToken.equals(token)) {
                log.warn("请求拒绝：用户 {} 的 Redis 登录凭证已失效", userId);
                throw new BusinessException(401, "登录已失效，请重新登录");
            }

            // 滑动续期 只要用户有操作，就将 Redis 中的过期时间重置
            // 这里不生成新 Token，只是给旧 Token 延时
            redisTemplate.expire(redisKey, 7, TimeUnit.DAYS);
            redisKey = "auth:role:" + userId;
            redisTemplate.expire(redisKey, 7, TimeUnit.DAYS);

            // 将 redis 的数据存到 UserContext
            String role = (String) redisTemplate.opsForValue().get(redisKey);
            UserContext.setContext(userId, role);

            log.info("用户 {} 校验通过，Token 已续期", userId);
            return true;

        } catch (Exception e) {
            log.error("令牌验证失败: {}", e.getMessage());
            throw new BusinessException(401, "令牌验证失败，请重新登录");
        }
    }

    @Override
    public void afterCompletion(HttpServletRequest request, HttpServletResponse response, Object handler, Exception ex) {
        // 请求结束后清理 ThreadLocal，防止内存泄漏和用户信息错乱
        UserContext.remove();
    }
}