package com.rural.education.scheduler;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.rural.education.dto.common.NotificationEvent;
import com.rural.education.enums.MeetingStatus;
import com.rural.education.enums.NotificationType;
import com.rural.education.model.entity.Meeting;
import com.rural.education.model.mapper.MeetingMapper;
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
                NotificationEvent event = new NotificationEvent();
                event.setType(NotificationType.MEETING_REMINDER.getCode());
                event.setTitle("会议即将开始");
                event.setContent("您参与的会议「" + meeting.getTopic() + "」将在" +
                        meeting.getStartTime().toLocalTime() + "开始");
                try {
                    Map<String, Object> params = new HashMap<>();
                    params.put("meetingId", meeting.getId());
                    event.setParamsJson(objectMapper.writeValueAsString(params));
                } catch (Exception e) {
                    event.setParamsJson("{}");
                }
                notificationAsyncPublisher.publish(event);
            }
        } catch (Exception e) {
            log.warn("会议提醒扫描异常: {}", e.getMessage());
        }
    }
}
