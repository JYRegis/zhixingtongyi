package com.rural.education.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.conditions.update.LambdaUpdateWrapper;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.rural.education.exception.BizException;
import com.rural.education.mapper.MatchPairMapper;
import com.rural.education.mapper.MeetingMapper;
import com.rural.education.mapper.UserMapper;
import com.rural.education.pojo.dto.*;
import com.rural.education.pojo.vo.*;
import com.rural.education.pojo.po.MatchPair;
import com.rural.education.pojo.po.Meeting;
import com.rural.education.pojo.po.User;
import com.rural.education.service.MeetingService;
import com.rural.education.service.UserAccessService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class MeetingServiceImpl extends ServiceImpl<MeetingMapper, Meeting> implements MeetingService {
    private final UserAccessService userAccessService;
    private final MeetingMapper meetingMapper;
    private final UserMapper userMapper;
    private final MatchPairMapper matchPairMapper;
    private final ObjectMapper objectMapper;

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void create(Long userId, MeetingCreateRequest request) {
        User user = userAccessService.requireUser(userId);
        MatchPair pair = matchPairMapper.selectById(request.getMatchPairId());
        if (pair == null) {
            throw new BizException("结对关系不存在");
        }
        Integer role = user.getRole();
        boolean isAdmin = Integer.valueOf(0).equals(role) || Integer.valueOf(1).equals(role);
        boolean isPairMember = userId.equals(pair.getStudentId()) || userId.equals(pair.getTeacherId());
        if (!isAdmin && !isPairMember) {
            throw new BizException("无权创建该结对会议");
        }
        if (!Integer.valueOf(1).equals(pair.getMatchStatus())) {
            throw new BizException("仅生效中的结对可创建会议");
        }
        Meeting meeting = new Meeting();
        meeting.setMatchPairId(request.getMatchPairId());
        meeting.setTopic(request.getTopic());
        meeting.setStartTime(LocalDateTime.parse(request.getStartTime().replace(" ", "T")));
        meeting.setEndTime(LocalDateTime.parse(request.getEndTime().replace(" ", "T")));
        meeting.setMeetingLink(request.getMeetingLink());
        meeting.setCreatedBy(userId);
        meeting.setStatus(0);
        meetingMapper.insert(meeting);
    }

    @Override
    public List<Meeting> list(Long userId, Long matchPairId, Integer status, String startTimeFrom, String startTimeTo) {
        userAccessService.requireAnyRole(userId, 0, 1);
        LambdaQueryWrapper<Meeting> wrapper = new LambdaQueryWrapper<>();
        if (matchPairId != null) {
            wrapper.eq(Meeting::getMatchPairId, matchPairId);
        }
        if (status != null) {
            wrapper.eq(Meeting::getStatus, status);
        }
        if (startTimeFrom != null && !startTimeFrom.isBlank()) {
            wrapper.ge(Meeting::getStartTime, LocalDateTime.parse(startTimeFrom.replace(" ", "T")));
        }
        if (startTimeTo != null && !startTimeTo.isBlank()) {
            wrapper.le(Meeting::getStartTime, LocalDateTime.parse(startTimeTo.replace(" ", "T")));
        }
        wrapper.orderByDesc(Meeting::getStartTime);
        return meetingMapper.selectList(wrapper);
    }

    @Override
    public MeetingDetailVO detail(Long userId, Long meetingId) {
        Map<String, Object> row = meetingMapper.selectMeetingDetail(meetingId);
        if (row == null) {
            throw new BizException("会议不存在");
        }
        User user = userMapper.selectById(userId);
        Integer role = user == null ? null : user.getRole();
        Long studentId = ((Number) row.get("student_id")).longValue();
        Long teacherId = ((Number) row.get("teacher_id")).longValue();
        if (!Integer.valueOf(0).equals(role) && !Integer.valueOf(1).equals(role) && !userId.equals(studentId) && !userId.equals(teacherId)) {
            throw new BizException("无权查看会议详情");
        }
        return objectMapper.convertValue(row, MeetingDetailVO.class);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void updateStatus(Long userId, Long meetingId, UpdateStatusRequest request) {
        Map<String, Object> row = meetingMapper.selectMeetingDetail(meetingId);
        if (row == null) {
            throw new BizException("会议不存在");
        }
        User user = userAccessService.requireUser(userId);
        Integer role = user.getRole();
        Long studentId = ((Number) row.get("student_id")).longValue();
        Long teacherId = ((Number) row.get("teacher_id")).longValue();
        boolean isAdmin = Integer.valueOf(0).equals(role) || Integer.valueOf(1).equals(role);
        if (!isAdmin && !userId.equals(studentId) && !userId.equals(teacherId)) {
            throw new BizException("无权更新会议状态");
        }
        meetingMapper.update(
                null,
                new LambdaUpdateWrapper<Meeting>()
                        .eq(Meeting::getId, meetingId)
                        .set(Meeting::getStatus, request.getStatus())
                        .set(Meeting::getUpdateTime, LocalDateTime.now())
        );
    }

    @Override
    public List<MeetingItemVO> myMeetings(Long userId) {
        User user = userMapper.selectById(userId);
        Integer role = user == null ? null : user.getRole();
        if (role == null || (role != 2 && role != 3)) {
            throw new BizException("仅学生和志愿者可查看我的会议");
        }
        List<Map<String, Object>> rows = role == 2
                ? meetingMapper.selectTeacherMeetings(userId)
                : meetingMapper.selectStudentMeetings(userId);
        return rows.stream()
                .map(row -> objectMapper.convertValue(row, MeetingItemVO.class))
                .toList();
    }
}

