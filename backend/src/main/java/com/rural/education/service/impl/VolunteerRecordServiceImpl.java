package com.rural.education.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.rural.education.dto.common.NotificationEvent;
import com.rural.education.dto.request.record.AdminAuditRecordRequest;
import com.rural.education.dto.request.record.StudentConfirmRequest;
import com.rural.education.dto.request.record.SubmitRecordRequest;
import com.rural.education.enums.MatchStatus;
import com.rural.education.enums.NotificationType;
import com.rural.education.enums.RecordStatus;
import com.rural.education.enums.UserRole;
import com.rural.education.event.event.RecordStatusChangedEvent;
import com.rural.education.event.publisher.EventPublisher;
import com.rural.education.exception.BusinessException;
import com.rural.education.model.entity.MatchPair;
import com.rural.education.model.entity.StudentProfile;
import com.rural.education.model.entity.TeacherProfile;
import com.rural.education.model.entity.User;
import com.rural.education.model.entity.VolunteerRecord;
import com.rural.education.model.mapper.MatchPairMapper;
import com.rural.education.model.mapper.StudentProfileMapper;
import com.rural.education.model.mapper.TeacherProfileMapper;
import com.rural.education.model.mapper.VolunteerRecordMapper;
import com.rural.education.service.NotificationAsyncPublisher;
import com.rural.education.service.UserAccessService;
import com.rural.education.service.VolunteerRecordService;
import com.rural.education.vo.VolunteerRecordVO;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class VolunteerRecordServiceImpl extends ServiceImpl<VolunteerRecordMapper, VolunteerRecord> implements VolunteerRecordService {
    private final VolunteerRecordMapper volunteerRecordMapper;
    private final MatchPairMapper matchPairMapper;
    private final StudentProfileMapper studentProfileMapper;
    private final TeacherProfileMapper teacherProfileMapper;
    private final UserAccessService userAccessService;
    private final NotificationAsyncPublisher notificationAsyncPublisher;
    private final EventPublisher eventPublisher;
    private final ObjectMapper objectMapper;

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void submitRecord(Long userId, SubmitRecordRequest request) {
        userAccessService.requireRole(userId, UserRole.TEACHER.getCode());
        MatchPair pair = matchPairMapper.selectById(request.getMatchPairId());
        if (pair == null) {
            throw new BusinessException("结对不存在");
        }
        if (!Integer.valueOf(MatchStatus.ACCEPTED.getCode()).equals(pair.getMatchStatus())) {
            throw new BusinessException("仅生效中的结对可提交服务记录");
        }
        if (!userId.equals(pair.getTeacherId())) {
            throw new BusinessException("仅结对志愿者可提交服务记录");
        }
        VolunteerRecord record = new VolunteerRecord();
        record.setMatchPairId(request.getMatchPairId());
        record.setTeacherId(pair.getTeacherId());
        record.setStudentId(pair.getStudentId());
        record.setMeetingId(request.getMeetingId());
        record.setDuration(request.getDuration());
        record.setMeetingDate(request.getMeetingDate());
        record.setServiceDesc(request.getServiceDesc());
        record.setAiSummary(request.getAiSummary());
        record.setStatus(RecordStatus.PENDING_STUDENT_CONFIRM.getCode());
        record.setCreateTime(LocalDateTime.now());
        if (request.getEvidenceImages() != null && !request.getEvidenceImages().isEmpty()) {
            try {
                record.setEvidenceImages(objectMapper.writeValueAsString(request.getEvidenceImages()));
            } catch (Exception ignore) {
                record.setEvidenceImages(null);
            }
        }
        volunteerRecordMapper.insert(record);

        eventPublisher.publish(new RecordStatusChangedEvent(record.getId(), record.getStatus(), userId));

        NotificationEvent studentEvent = new NotificationEvent();
        studentEvent.setUserId(pair.getStudentId());
        studentEvent.setType(NotificationType.DURATION_STUDENT_CONFIRM.getCode());
        studentEvent.setTitle("请确认服务记录");
        studentEvent.setContent("志愿者提交了新的服务时长记录，请确认");
        studentEvent.setParamsJson("{\"recordId\":" + record.getId() + "}");
        notificationAsyncPublisher.publish(studentEvent);

        StudentProfile studentProfile = studentProfileMapper.selectOne(
                new LambdaQueryWrapper<StudentProfile>().eq(StudentProfile::getUserId, pair.getStudentId())
        );
        if (studentProfile != null && studentProfile.getBindAdminId() != null) {
            NotificationEvent adminEvent = new NotificationEvent();
            adminEvent.setUserId(studentProfile.getBindAdminId());
            adminEvent.setType(NotificationType.DURATION_STUDENT_CONFIRM.getCode());
            adminEvent.setTitle("请确认服务记录");
            adminEvent.setContent("志愿者为学生提交了新的服务时长记录，请提醒学生确认");
            adminEvent.setParamsJson("{\"recordId\":" + record.getId() + "}");
            notificationAsyncPublisher.publish(adminEvent);
        }
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void studentConfirm(Long userId, Long recordId, StudentConfirmRequest request) {
        userAccessService.requireRole(userId, UserRole.STUDENT.getCode());
        VolunteerRecord record = volunteerRecordMapper.selectById(recordId);
        if (record == null) {
            throw new BusinessException("服务记录不存在");
        }
        if (!Integer.valueOf(RecordStatus.PENDING_STUDENT_CONFIRM.getCode()).equals(record.getStatus())) {
            throw new BusinessException("当前状态不允许学生确认");
        }
        if (!userId.equals(record.getStudentId())) {
            throw new BusinessException("仅结对学员可确认该记录");
        }
        if ("accept".equalsIgnoreCase(request.getAction())) {
            record.setStatus(RecordStatus.PENDING_ADMIN_AUDIT.getCode());
            record.setStudentConfirmTime(LocalDateTime.now());
            volunteerRecordMapper.updateById(record);

            eventPublisher.publish(new RecordStatusChangedEvent(recordId, record.getStatus(), userId));

            NotificationEvent event = new NotificationEvent();
            event.setUserId(record.getTeacherId());
            event.setType(NotificationType.DURATION_ADMIN_AUDIT.getCode());
            event.setTitle("服务记录待审核");
            event.setContent("学员已确认服务记录，等待管理员审核");
            event.setParamsJson("{\"recordId\":" + recordId + "}");
            notificationAsyncPublisher.publish(event);
        } else if ("reject".equalsIgnoreCase(request.getAction())) {
            if (request.getRejectReason() == null || request.getRejectReason().isBlank()) {
                throw new BusinessException("rejectReason 必填");
            }
            record.setStatus(RecordStatus.STUDENT_REJECTED.getCode());
            record.setRejectReason(request.getRejectReason());
            record.setStudentConfirmTime(LocalDateTime.now());
            volunteerRecordMapper.updateById(record);

            eventPublisher.publish(new RecordStatusChangedEvent(recordId, record.getStatus(), userId));

            NotificationEvent event = new NotificationEvent();
            event.setUserId(record.getTeacherId());
            event.setType(NotificationType.DURATION_AUDIT_RESULT.getCode());
            event.setTitle("服务记录被拒绝");
            event.setContent("学员拒绝了服务记录，原因: " + request.getRejectReason());
            event.setParamsJson("{\"recordId\":" + recordId + "}");
            notificationAsyncPublisher.publish(event);
        } else {
            throw new BusinessException("action 只能为 accept 或 reject");
        }
    }

    @Override
    public Page<VolunteerRecordVO> getPendingRecords(Long userId, Long schoolId, String regionCode, Long page, Long size) {
        long current = page == null || page < 1 ? 1 : page;
        long pageSize = size == null || size < 1 ? 10 : Math.min(size, 100);

        User user = userAccessService.requireUser(userId);
        Long filterSchoolId = schoolId;

        if (user.getRole() == UserRole.L2_ADMIN.getCode()) {
            userAccessService.requireL2WithPermission(userId, "student_manage");
            if (filterSchoolId == null) {
                StudentProfile adminProfile = studentProfileMapper.selectOne(
                        new LambdaQueryWrapper<StudentProfile>().eq(StudentProfile::getUserId, userId)
                );
                if (adminProfile != null) {
                    filterSchoolId = adminProfile.getSchoolId();
                }
                if (filterSchoolId == null) {
                    throw new BusinessException("无法确定管理员的管辖学校");
                }
            }
        } else if (user.getRole() != UserRole.L1_ADMIN.getCode()) {
            throw new BusinessException("无权限操作");
        }

        Page<VolunteerRecordVO> mpPage = new Page<>(current, pageSize);
        volunteerRecordMapper.selectPendingBySchool(mpPage, filterSchoolId);
        return mpPage;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void auditRecord(Long userId, Long recordId, AdminAuditRecordRequest request) {
        userAccessService.requireL2WithPermission(userId, "student_manage");
        VolunteerRecord record = volunteerRecordMapper.selectById(recordId);
        if (record == null) {
            throw new BusinessException("服务记录不存在");
        }
        if (!Integer.valueOf(RecordStatus.PENDING_ADMIN_AUDIT.getCode()).equals(record.getStatus())) {
            throw new BusinessException("当前状态不允许管理员审核");
        }
        StudentProfile studentProfile = studentProfileMapper.selectOne(
                new LambdaQueryWrapper<StudentProfile>().eq(StudentProfile::getUserId, record.getStudentId())
        );
        StudentProfile adminProfile = studentProfileMapper.selectOne(
                new LambdaQueryWrapper<StudentProfile>().eq(StudentProfile::getUserId, userId)
        );
        if (studentProfile == null || adminProfile == null || !studentProfile.getSchoolId().equals(adminProfile.getSchoolId())) {
            throw new BusinessException("仅同校二级管理员可审核该记录");
        }
        if ("approve".equalsIgnoreCase(request.getAction())) {
            record.setStatus(RecordStatus.APPROVED.getCode());
            record.setAdminAuditTime(LocalDateTime.now());
            record.setAuditorId(userId);
            int updated = volunteerRecordMapper.updateById(record);
            if (updated == 0) {
                throw new BusinessException("记录已被其他管理员处理，请刷新后重试");
            }

            TeacherProfile teacherProfile = teacherProfileMapper.selectOne(
                    new LambdaQueryWrapper<TeacherProfile>().eq(TeacherProfile::getUserId, record.getTeacherId())
            );
            if (teacherProfile != null) {
                teacherProfile.setTotalServiceDuration(
                        teacherProfile.getTotalServiceDuration() + record.getDuration()
                );
                teacherProfileMapper.updateById(teacherProfile);
            }

            eventPublisher.publish(new RecordStatusChangedEvent(recordId, record.getStatus(), userId));

            NotificationEvent event = new NotificationEvent();
            event.setUserId(record.getTeacherId());
            event.setType(NotificationType.DURATION_AUDIT_RESULT.getCode());
            event.setTitle("服务记录审核通过");
            event.setContent("管理员已审核通过你的服务时长记录，时长已累计");
            event.setParamsJson("{\"recordId\":" + recordId + "}");
            notificationAsyncPublisher.publish(event);
        } else if ("reject".equalsIgnoreCase(request.getAction())) {
            if (request.getRejectReason() == null || request.getRejectReason().isBlank()) {
                throw new BusinessException("rejectReason 必填");
            }
            record.setStatus(RecordStatus.REJECTED.getCode());
            record.setRejectReason(request.getRejectReason());
            record.setAdminAuditTime(LocalDateTime.now());
            record.setAuditorId(userId);
            int updated = volunteerRecordMapper.updateById(record);
            if (updated == 0) {
                throw new BusinessException("记录已被其他管理员处理，请刷新后重试");
            }

            eventPublisher.publish(new RecordStatusChangedEvent(recordId, record.getStatus(), userId));

            NotificationEvent event = new NotificationEvent();
            event.setUserId(record.getTeacherId());
            event.setType(NotificationType.DURATION_AUDIT_RESULT.getCode());
            event.setTitle("服务记录审核拒绝");
            event.setContent("管理员拒绝了服务记录，原因: " + request.getRejectReason());
            event.setParamsJson("{\"recordId\":" + recordId + "}");
            notificationAsyncPublisher.publish(event);
        } else {
            throw new BusinessException("action 只能为 approve 或 reject");
        }
    }

    @Override
    public Page<VolunteerRecordVO> queryRecords(Long userId, Long teacherId, Long studentId, Integer status, Long page, Long size) {
        User user = userAccessService.requireUser(userId);
        int role = user.getRole();
        Long filterTeacherId = teacherId;
        Long filterStudentId = studentId;
        Long filterSchoolId = null;

        if (role == UserRole.TEACHER.getCode()) {
            filterTeacherId = userId;
        } else if (role == UserRole.STUDENT.getCode()) {
            filterStudentId = userId;
        } else if (role == UserRole.L2_ADMIN.getCode()) {
            StudentProfile adminProfile = studentProfileMapper.selectOne(
                    new LambdaQueryWrapper<StudentProfile>().eq(StudentProfile::getUserId, userId)
            );
            if (adminProfile != null) {
                filterSchoolId = adminProfile.getSchoolId();
            }
        }

        long current = page == null || page < 1 ? 1 : page;
        long pageSize = size == null || size < 1 ? 10 : Math.min(size, 100);
        Page<VolunteerRecordVO> mpPage = new Page<>(current, pageSize);
        volunteerRecordMapper.selectRecords(mpPage, filterTeacherId, filterStudentId, status, filterSchoolId);
        return mpPage;
    }
}
