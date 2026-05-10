package com.rural.education.scheduler;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.util.HashSet;

@Slf4j
@Component
@RequiredArgsConstructor
public class MatchRecommendationScheduler {

    private final StringRedisTemplate redisTemplate;

    @Scheduled(cron = "0 0 * * * *")
    public void evictExpiredRecommendationCaches() {
        try {
            var keys = new HashSet<String>();
            try (var cursor = redisTemplate.scan(
                    org.springframework.data.redis.core.ScanOptions.scanOptions()
                            .match("match:recommendations:student:*")
                            .count(100)
                            .build())) {
                cursor.forEachRemaining(keys::add);
            }
            if (!keys.isEmpty()) {
                redisTemplate.delete(keys);
                log.info("已清理 {} 个过期推荐缓存", keys.size());
            }
        } catch (Exception e) {
            log.warn("推荐缓存清理异常: {}", e.getMessage());
        }
    }
}
