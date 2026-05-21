package com.rural.education.scheduler;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.rural.education.dto.common.NotificationEvent;
import com.rural.education.enums.MeetingStatus;
import com.rural.education.enums.NotificationType;
import com.rural.education.model.entity.Meeting;
import com.rural.education.model.entity.MatchPair;
import com.rural.education.model.mapper.MeetingMapper;
import com.rural.education.model.mapper.MatchPairMapper;
import com.rural.education.service.NotificationAsyncPublisher;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

import com.fasterxml.jackson.databind.ObjectMapper;

@Slf4j
@Component
@RequiredArgsConstructor
public class MeetingReminderScheduler {

    private final MeetingMapper meetingMapper;
    private final MatchPairMapper matchPairMapper;
    private final NotificationAsyncPublisher notificationAsyncPublisher;
    private final ObjectMapper objectMapper;

    @Scheduled(cron = "0 */5 * * * *")
    public void remindUpcomingMeetings() {
        try {
            LocalDateTime now = LocalDateTime.now();
            LocalDateTime soon = now.plusMinutes(15);
            var meetings = meetingMapper.selectList(
                    new LambdaQueryWrapper<Meeting>()
                            .eq(Meeting::getStatus, MeetingStatus.NOT_STARTED.getCode())
                            .ge(Meeting::getStartTime, now)
                            .le(Meeting::getStartTime, soon)
            );
            for (Meeting meeting : meetings) {
                String content = "\u60a8\u53c2\u4e0e\u7684\u4f1a\u8bae\u300c" + meeting.getTopic() + "\u300d\u5c06\u5728" +
                        meeting.getStartTime().toLocalTime() + "\u5f00\u59cb";
                String paramsJson;
                try {
                    Map<String, Object> params = new HashMap<>();
                    params.put("meetingId", meeting.getId());
                    paramsJson = objectMapper.writeValueAsString(params);
                } catch (Exception e) {
                    paramsJson = "{}";
                }
                // 通过 matchPairId 查学生和志愿者 ID
                Long studentId = null;
                Long teacherId = null;
                if (meeting.getMatchPairId() != null) {
                    MatchPair pair = matchPairMapper.selectById(meeting.getMatchPairId());
                    if (pair != null) {
                        studentId = pair.getStudentId();
                        teacherId = pair.getTeacherId();
                    }
                }                for (Long uid : new Long[]{studentId, teacherId}) {
                    if (uid == null) continue;
                    NotificationEvent event = new NotificationEvent();
                    event.setUserId(uid);
                    event.setType(NotificationType.MEETING_REMINDER.getCode());
                    event.setTitle("\u4f1a\u8bae\u5373\u5c06\u5f00\u59cb");
                    event.setContent(content);
                    event.setParamsJson(paramsJson);
                    notificationAsyncPublisher.publish(event);
                }
            }
        } catch (Exception e) {
            log.warn("\u4f1a\u8bae\u63d0\u9192\u626b\u63cf\u5f02\u5e38: {}", e.getMessage());
        }
    }
}
