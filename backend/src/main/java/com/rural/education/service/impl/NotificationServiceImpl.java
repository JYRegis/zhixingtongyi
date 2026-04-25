package com.rural.education.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.conditions.update.LambdaUpdateWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.rural.education.exception.BizException;
import com.rural.education.mapper.MessageNotificationMapper;
import com.rural.education.pojo.dto.*;
import com.rural.education.pojo.po.MessageNotification;
import com.rural.education.service.NotificationAsyncPublisher;
import com.rural.education.service.NotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class NotificationServiceImpl extends ServiceImpl<MessageNotificationMapper, MessageNotification> implements NotificationService {
    private final MessageNotificationMapper messageNotificationMapper;
    private final NotificationAsyncPublisher notificationAsyncPublisher;
    private final ObjectMapper objectMapper;

    @Override
    public List<MessageNotification> list(Long userId, Integer type, Boolean unreadOnly, Integer page, Integer size) {
        LambdaQueryWrapper<MessageNotification> wrapper = new LambdaQueryWrapper<MessageNotification>()
                .eq(MessageNotification::getUserId, userId);
        if (type != null) {
            wrapper.eq(MessageNotification::getType, type);
        }
        if (Boolean.TRUE.equals(unreadOnly)) {
            wrapper.isNull(MessageNotification::getReadTime);
        }
        wrapper.orderByDesc(MessageNotification::getSentTime);
        Page<MessageNotification> p = messageNotificationMapper.selectPage(new Page<>(page, size), wrapper);
        return p.getRecords();
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void read(Long userId, Long notificationId) {
        messageNotificationMapper.update(
                null,
                new LambdaUpdateWrapper<MessageNotification>()
                        .eq(MessageNotification::getId, notificationId)
                        .eq(MessageNotification::getUserId, userId)
                        .set(MessageNotification::getReadTime, LocalDateTime.now())
        );
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void batchRead(Long userId, BatchReadRequest request) {
        if (request.getNotificationIds() == null || request.getNotificationIds().isEmpty()) {
            return;
        }
        messageNotificationMapper.update(
                null,
                new LambdaUpdateWrapper<MessageNotification>()
                        .in(MessageNotification::getId, request.getNotificationIds())
                        .eq(MessageNotification::getUserId, userId)
                        .set(MessageNotification::getReadTime, LocalDateTime.now())
        );
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void sendInternalWechat(InternalNotificationRequest request) {
        NotificationEvent event = new NotificationEvent();
        event.setUserId(request.getUserId());
        event.setType(typeFromCode(request.getType()));
        event.setTitle(request.getType());
        event.setContent("业务通知：" + request.getType());
        try {
            event.setParamsJson(objectMapper.writeValueAsString(request.getTemplateData()));
        } catch (Exception e) {
            throw new BizException("templateData 序列化失败");
        }
        notificationAsyncPublisher.publish(event);
    }

    private Integer typeFromCode(String code) {
        if ("MATCH_APPLY".equalsIgnoreCase(code)) {
            return 0;
        }
        if ("MATCH_ACCEPT".equalsIgnoreCase(code)) {
            return 1;
        }
        if ("MATCH_REJECT".equalsIgnoreCase(code)) {
            return 2;
        }
        return 9;
    }
}

