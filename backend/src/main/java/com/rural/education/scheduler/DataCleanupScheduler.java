package com.rural.education.scheduler;

import com.baomidou.mybatisplus.core.conditions.update.LambdaUpdateWrapper;
import com.rural.education.model.entity.ChatParticipant;
import com.rural.education.model.mapper.ChatParticipantMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;

@Slf4j
@Component
@RequiredArgsConstructor
public class DataCleanupScheduler {

    private final ChatParticipantMapper chatParticipantMapper;

    @Scheduled(cron = "0 0 3 * * *")
    public void cleanupStaleChatParticipants() {
        try {
            LocalDateTime threshold = LocalDateTime.now().minusDays(30);
            chatParticipantMapper.update(
                    null,
                    new LambdaUpdateWrapper<ChatParticipant>()
                            .isNull(ChatParticipant::getLeftTime)
                            .lt(ChatParticipant::getJoinedTime, threshold)
                            .set(ChatParticipant::getLeftTime, LocalDateTime.now())
            );
        } catch (Exception e) {
            log.warn("过期数据清理异常: {}", e.getMessage());
        }
    }
}
