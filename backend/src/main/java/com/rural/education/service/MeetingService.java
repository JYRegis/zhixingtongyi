package com.rural.education.service;

import com.baomidou.mybatisplus.extension.service.IService;
import com.rural.education.pojo.dto.*;
import com.rural.education.pojo.vo.*;
import com.rural.education.pojo.po.Meeting;

import java.util.List;

public interface MeetingService extends IService<Meeting> {
    void create(Long userId, MeetingCreateRequest request);

    List<Meeting> list(Long userId, Long matchPairId, Integer status, String startTimeFrom, String startTimeTo);

    MeetingDetailVO detail(Long userId, Long meetingId);

    void updateStatus(Long userId, Long meetingId, UpdateStatusRequest request);

    List<MeetingItemVO> myMeetings(Long userId);
}

