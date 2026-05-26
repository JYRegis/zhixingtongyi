package com.rural.education.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.rural.education.dto.response.admin.DashboardOverviewResponse;
import com.rural.education.dto.response.admin.MatchSuccessRateResponse;
import com.rural.education.dto.response.admin.RegionDistributionResponse;
import com.rural.education.dto.response.admin.SubjectDistributionResponse;
import com.rural.education.enums.AuditStatus;
import com.rural.education.enums.MatchStatus;
import com.rural.education.enums.MeetingStatus;
import com.rural.education.enums.UserStatus;
import com.rural.education.model.entity.MatchPair;
import com.rural.education.model.entity.Meeting;
import com.rural.education.model.entity.StudentProfile;
import com.rural.education.model.entity.TeacherProfile;
import com.rural.education.model.entity.User;
import com.rural.education.model.mapper.MatchPairMapper;
import com.rural.education.model.mapper.MeetingMapper;
import com.rural.education.model.mapper.SchoolMapper;
import com.rural.education.model.mapper.StudentProfileMapper;
import com.rural.education.model.mapper.TeacherProfileMapper;
import com.rural.education.model.mapper.UserMapper;
import com.rural.education.model.mapper.VolunteerRecordMapper;
import com.rural.education.service.DashboardService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class DashboardServiceImpl implements DashboardService {

    private final UserMapper userMapper;
    private final MatchPairMapper matchPairMapper;
    private final MeetingMapper meetingMapper;
    private final VolunteerRecordMapper volunteerRecordMapper;
    private final SchoolMapper schoolMapper;
    private final StudentProfileMapper studentProfileMapper;
    private final TeacherProfileMapper teacherProfileMapper;
    private final ObjectMapper objectMapper;

    @Override
    public DashboardOverviewResponse getOverview(Long userId) {


        Long totalUsers = userMapper.selectCount(
                new LambdaQueryWrapper<User>().eq(User::getStatus, UserStatus.ENABLED.getCode()));

        Long matchedPairs = matchPairMapper.selectCount(
                new LambdaQueryWrapper<MatchPair>().eq(MatchPair::getMatchStatus, MatchStatus.ACCEPTED.getCode()));

        Long activeMeetings = meetingMapper.selectCount(
                new LambdaQueryWrapper<Meeting>().eq(Meeting::getStatus, MeetingStatus.IN_PROGRESS.getCode()));

        Long totalServiceHours = volunteerRecordMapper.selectTotalApprovedDuration();
        if (totalServiceHours == null) {
            totalServiceHours = 0L;
        }

        return new DashboardOverviewResponse(totalUsers, matchedPairs, activeMeetings, totalServiceHours);
    }

    @Override
    public MatchSuccessRateResponse getMatchSuccessRate(Long userId, String startDate, String endDate) {


        LambdaQueryWrapper<MatchPair> totalWrapper = new LambdaQueryWrapper<MatchPair>()
                .in(MatchPair::getMatchStatus,
                        MatchStatus.APPLIED.getCode(),
                        MatchStatus.ACCEPTED.getCode(),
                        MatchStatus.REJECTED.getCode());
        LambdaQueryWrapper<MatchPair> acceptedWrapper = new LambdaQueryWrapper<MatchPair>()
                .eq(MatchPair::getMatchStatus, MatchStatus.ACCEPTED.getCode());

        if (startDate != null && !startDate.isBlank()) {
            LocalDateTime start = LocalDate.parse(startDate).atStartOfDay();
            totalWrapper.ge(MatchPair::getApplyTime, start);
            acceptedWrapper.ge(MatchPair::getApplyTime, start);
        }
        if (endDate != null && !endDate.isBlank()) {
            LocalDateTime end = LocalDate.parse(endDate).atTime(LocalTime.MAX);
            totalWrapper.le(MatchPair::getApplyTime, end);
            acceptedWrapper.le(MatchPair::getApplyTime, end);
        }

        Long total = matchPairMapper.selectCount(totalWrapper);
        Long accepted = matchPairMapper.selectCount(acceptedWrapper);

        BigDecimal rate = BigDecimal.ZERO;
        if (total != null && total > 0 && accepted != null) {
            rate = BigDecimal.valueOf(accepted)
                    .divide(BigDecimal.valueOf(total), 4, RoundingMode.HALF_UP)
                    .multiply(BigDecimal.valueOf(100));
        }

        MatchSuccessRateResponse resp = new MatchSuccessRateResponse();
        resp.setStartDate(startDate);
        resp.setEndDate(endDate);
        resp.setTotalApplications(total != null ? total : 0L);
        resp.setAcceptedCount(accepted != null ? accepted : 0L);
        resp.setSuccessRate(rate);
        return resp;
    }

    @Override
    public List<RegionDistributionResponse> getRegionDistribution(Long userId) {

        return schoolMapper.selectRegionDistribution();
    }

    @Override
    public List<SubjectDistributionResponse> getSubjectDistribution(Long userId) {


        List<TeacherProfile> teachers = teacherProfileMapper.selectList(
                new LambdaQueryWrapper<TeacherProfile>()
                        .eq(TeacherProfile::getCertificationStatus, AuditStatus.APPROVED.getCode()));
        List<StudentProfile> students = studentProfileMapper.selectList(
                new LambdaQueryWrapper<StudentProfile>()
                        .eq(StudentProfile::getAuditStatus, AuditStatus.APPROVED.getCode()));

        Map<String, Long> teacherCount = new HashMap<>();
        Map<String, Long> studentCount = new HashMap<>();
        Set<String> allSubjects = new HashSet<>();

        for (TeacherProfile t : teachers) {
            List<String> subjects = parseJsonArray(t.getSkilledSubjects());
            for (String subject : subjects) {
                teacherCount.merge(subject, 1L, (a, b) -> a + b);
                allSubjects.add(subject);
            }
        }
        for (StudentProfile s : students) {
            List<String> subjects = parseJsonArray(s.getSubjectsNeeded());
            for (String subject : subjects) {
                studentCount.merge(subject, 1L, (a, b) -> a + b);
                allSubjects.add(subject);
            }
        }

        return allSubjects.stream()
                .map(subject -> new SubjectDistributionResponse(
                        subject,
                        teacherCount.getOrDefault(subject, 0L),
                        studentCount.getOrDefault(subject, 0L)))
                .sorted((a, b) -> Long.compare(
                        b.getTeacherCount() + b.getStudentCount(),
                        a.getTeacherCount() + a.getStudentCount()))
                .toList();
    }

    private List<String> parseJsonArray(String json) {
        if (json == null || json.isBlank()) {
            return List.of();
        }
        try {
            return objectMapper.readValue(json, new TypeReference<List<String>>() {});
        } catch (Exception e) {
            return List.of();
        }
    }
}
