package com.rural.education.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.conditions.update.LambdaUpdateWrapper;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.rural.education.enums.MatchStatus;
import com.rural.education.enums.MeetingStatus;
import com.rural.education.enums.UserRole;
import com.rural.education.exception.BusinessException;
import com.rural.education.model.mapper.MatchPairMapper;
import com.rural.education.model.mapper.MeetingMapper;
import com.rural.education.model.mapper.UserMapper;
import com.rural.education.dto.request.meeting.CreateMeetingRequest;
import com.rural.education.dto.request.meeting.UpdateStatusRequest;
import com.rural.education.model.entity.MatchPair;
import com.rural.education.model.entity.Meeting;
import com.rural.education.model.entity.User;
import com.rural.education.vo.MeetingVO;
import com.rural.education.service.MeetingService;
import com.rural.education.service.UserAccessService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class MeetingServiceImpl extends ServiceImpl<MeetingMapper, Meeting> implements MeetingService {
    private final UserAccessService userAccessService;
    private final MeetingMapper meetingMapper;
    private final UserMapper userMapper;
    private final MatchPairMapper matchPairMapper;

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void create(Long userId, CreateMeetingRequest request) {
        User user = userAccessService.requireUser(userId);
        MatchPair pair = matchPairMapper.selectById(request.getMatchPairId());
        if (pair == null) {
            throw new BusinessException("结对关系不存在");
        }
        Integer role = user.getRole();
        boolean isAdmin = Integer.valueOf(UserRole.L1_ADMIN.getCode()).equals(role)
                || Integer.valueOf(UserRole.L2_ADMIN.getCode()).equals(role);
        boolean isPairMember = userId.equals(pair.getStudentId()) || userId.equals(pair.getTeacherId());
        if (!isAdmin && !isPairMember) {
            throw new BusinessException("无权创建该结对会议");
        }
        if (!Integer.valueOf(MatchStatus.ACCEPTED.getCode()).equals(pair.getMatchStatus())) {
            throw new BusinessException("仅生效中的结对可创建会议");
        }
        Meeting meeting = new Meeting();
        meeting.setMatchPairId(request.getMatchPairId());
        meeting.setTopic(request.getTopic());
        meeting.setStartTime(LocalDateTime.parse(request.getStartTime().replace(" ", "T")));
        meeting.setEndTime(LocalDateTime.parse(request.getEndTime().replace(" ", "T")));
        meeting.setMeetingLink(request.getMeetingLink());
        meeting.setMeetingPassword(request.getMeetingPassword());
        meeting.setCreatedBy(userId);
        meeting.setStatus(MeetingStatus.NOT_STARTED.getCode());
        meetingMapper.insert(meeting);
    }

    @Override
    public List<Meeting> list(Long userId, Long matchPairId, Integer status, String startTimeFrom, String startTimeTo) {

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
    public MeetingVO detail(Long userId, Long meetingId) {
        MeetingVO meeting = meetingMapper.selectMeetingDetail(meetingId);
        if (meeting == null) {
            throw new BusinessException("会议不存在");
        }
        User user = userMapper.selectById(userId);
        Integer role = user == null ? null : user.getRole();
        Long studentId = meeting.getStudentId();
        Long teacherId = meeting.getTeacherId();
        if (!Integer.valueOf(UserRole.L1_ADMIN.getCode()).equals(role)
                && !Integer.valueOf(UserRole.L2_ADMIN.getCode()).equals(role)
                && !userId.equals(studentId)
                && !userId.equals(teacherId)) {
            throw new BusinessException("无权查看会议详情");
        }
        return meeting;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void updateStatus(Long userId, Long meetingId, UpdateStatusRequest request) {
        MeetingVO meeting = meetingMapper.selectMeetingDetail(meetingId);
        if (meeting == null) {
            throw new BusinessException("会议不存在");
        }
        User user = userAccessService.requireUser(userId);
        Integer role = user.getRole();
        Long studentId = meeting.getStudentId();
        Long teacherId = meeting.getTeacherId();
        boolean isAdmin = Integer.valueOf(UserRole.L1_ADMIN.getCode()).equals(role)
                || Integer.valueOf(UserRole.L2_ADMIN.getCode()).equals(role);
        if (!isAdmin && !userId.equals(studentId) && !userId.equals(teacherId)) {
            throw new BusinessException("无权更新会议状态");
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
    public List<MeetingVO> myMeetings(Long userId) {
        User user = userMapper.selectById(userId);
        Integer role = user == null ? null : user.getRole();
        if (role == null || (role != UserRole.TEACHER.getCode() && role != UserRole.STUDENT.getCode())) {
            throw new BusinessException("仅学生和志愿者可查看我的会议");
        }
        return role == UserRole.TEACHER.getCode()
                ? meetingMapper.selectTeacherMeetings(userId)
                : meetingMapper.selectStudentMeetings(userId);
    }
}

