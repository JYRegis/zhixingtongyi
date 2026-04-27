package com.rural.education.service;

import com.baomidou.mybatisplus.extension.service.IService;
import com.rural.education.dto.request.meeting.CreateMeetingRequest;
import com.rural.education.dto.request.meeting.UpdateStatusRequest;
import com.rural.education.model.entity.Meeting;
import com.rural.education.vo.MeetingVO;


import java.util.List;

public interface MeetingService extends IService<Meeting> {
    void create(Long userId, CreateMeetingRequest request);

    List<Meeting> list(Long userId, Long matchPairId, Integer status, String startTimeFrom, String startTimeTo);

    MeetingVO detail(Long userId, Long meetingId);

    void updateStatus(Long userId, Long meetingId, UpdateStatusRequest request);

    List<MeetingVO> myMeetings(Long userId);
}

