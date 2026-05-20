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
import com.rural.education.exception.BusinessException;
import com.rural.education.model.entity.AdminProfile;
import com.rural.education.model.entity.MatchPair;
import com.rural.education.model.entity.StudentProfile;
import com.rural.education.model.entity.TeacherProfile;
import com.rural.education.model.entity.User;
import com.rural.education.model.entity.VolunteerRecord;
import com.rural.education.model.mapper.AdminProfileMapper;
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
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class VolunteerRecordServiceImpl extends ServiceImpl<VolunteerRecordMapper, VolunteerRecord> implements VolunteerRecordService {
    private final VolunteerRecordMapper volunteerRecordMapper;
    private final MatchPairMapper matchPairMapper;
    private final StudentProfileMapper studentProfileMapper;
    private final TeacherProfileMapper teacherProfileMapper;
    private final AdminProfileMapper adminProfileMapper;
    private final UserAccessService userAccessService;
    private final NotificationAsyncPublisher notificationAsyncPublisher;
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
        record.setStatus(RecordStatus.PENDING_ADMIN_AUDIT.getCode());
        record.setCreateTime(LocalDateTime.now());
        if (request.getEvidenceImages() != null && !request.getEvidenceImages().isEmpty()) {
            try {
                record.setEvidenceImages(objectMapper.writeValueAsString(request.getEvidenceImages()));
            } catch (Exception e) {
                throw new BusinessException("证据图片序列化失败，请检查图片格式");
            }
        }
        volunteerRecordMapper.insert(record);

        // 直接通知管理员审核，跳过学员确认环节
        StudentProfile studentProfile = studentProfileMapper.selectOne(
                new LambdaQueryWrapper<StudentProfile>().eq(StudentProfile::getUserId, pair.getStudentId())
        );
        if (studentProfile != null && studentProfile.getBindAdminId() != null) {
            NotificationEvent adminEvent = new NotificationEvent();
            adminEvent.setUserId(studentProfile.getBindAdminId());
            adminEvent.setType(NotificationType.DURATION_STUDENT_CONFIRM.getCode());
            adminEvent.setTitle("志愿时长待审核");
            adminEvent.setContent("志愿者提交了新的服务时长记录，请审核");
            adminEvent.setParamsJson(jsonParam("recordId", record.getId()));
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
            int updated = volunteerRecordMapper.updateById(record);
            if (updated == 0) {
                throw new BusinessException("记录已被其他操作更新，请刷新后重试");
            }

            NotificationEvent event = new NotificationEvent();
            event.setUserId(record.getTeacherId());
            event.setType(NotificationType.DURATION_ADMIN_AUDIT.getCode());
            event.setTitle("服务记录待审核");
            event.setContent("学员已确认服务记录，等待管理员审核");
            event.setParamsJson(jsonParam("recordId", recordId));
            notificationAsyncPublisher.publish(event);
        } else if ("reject".equalsIgnoreCase(request.getAction())) {
            if (request.getRejectReason() == null || request.getRejectReason().isBlank()) {
                throw new BusinessException("rejectReason 必填");
            }
            record.setStatus(RecordStatus.STUDENT_REJECTED.getCode());
            record.setRejectReason(request.getRejectReason());
            record.setStudentConfirmTime(LocalDateTime.now());
            volunteerRecordMapper.updateById(record);

            NotificationEvent event = new NotificationEvent();
            event.setUserId(record.getTeacherId());
            event.setType(NotificationType.DURATION_AUDIT_RESULT.getCode());
            event.setTitle("服务记录被拒绝");
            event.setContent("学员拒绝了服务记录，原因: " + request.getRejectReason());
            event.setParamsJson(jsonParam("recordId", recordId));
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
        if (user.getRole() == null) {
            throw new BusinessException("无权限操作");
        }
        Long filterSchoolId = schoolId;

        if (user.getRole() == UserRole.L2_ADMIN.getCode()) {
            userAccessService.requireL2WithPermission(userId, "student_manage");
            if (filterSchoolId == null) {
                AdminProfile adminProfile = adminProfileMapper.selectOne(
                        new LambdaQueryWrapper<AdminProfile>().eq(AdminProfile::getUserId, userId)
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
        List<VolunteerRecordVO> records = volunteerRecordMapper.selectPendingBySchool(mpPage, filterSchoolId);
        mpPage.setRecords(records);
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
        AdminProfile adminProfile = adminProfileMapper.selectOne(
                new LambdaQueryWrapper<AdminProfile>().eq(AdminProfile::getUserId, userId)
        );
        User operator = userAccessService.requireUser(userId);
        if (Integer.valueOf(UserRole.L2_ADMIN.getCode()).equals(operator.getRole())) {
            if (studentProfile == null || adminProfile == null || !studentProfile.getSchoolId().equals(adminProfile.getSchoolId())) {
                throw new BusinessException("仅同校二级管理员可审核该记录");
            }
        }
        if ("approve".equalsIgnoreCase(request.getAction())) {
            record.setStatus(RecordStatus.APPROVED.getCode());
            record.setAdminAuditTime(LocalDateTime.now());
            record.setAuditorId(userId);
            int updated = volunteerRecordMapper.updateById(record);
            if (updated == 0) {
                throw new BusinessException("记录已被其他管理员处理，请刷新后重试");
            }

            teacherProfileMapper.accumulateDuration(record.getTeacherId(), record.getDuration());

            NotificationEvent event = new NotificationEvent();
            event.setUserId(record.getTeacherId());
            event.setType(NotificationType.DURATION_AUDIT_RESULT.getCode());
            event.setTitle("服务记录审核通过");
            event.setContent("管理员已审核通过你的服务时长记录，时长已累计");
            event.setParamsJson(jsonParam("recordId", recordId));
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

            NotificationEvent event = new NotificationEvent();
            event.setUserId(record.getTeacherId());
            event.setType(NotificationType.DURATION_AUDIT_RESULT.getCode());
            event.setTitle("服务记录审核拒绝");
            event.setContent("管理员拒绝了服务记录，原因: " + request.getRejectReason());
            event.setParamsJson(jsonParam("recordId", recordId));
            notificationAsyncPublisher.publish(event);
        } else {
            throw new BusinessException("action 只能为 approve 或 reject");
        }
    }

    @Override
    public Page<VolunteerRecordVO> queryRecords(Long userId, Long teacherId, Long studentId, Integer status, Long page, Long size) {
        User user = userAccessService.requireUser(userId);
        if (user.getRole() == null) {
            throw new BusinessException("请先选择身份");
        }
        int role = user.getRole();
        Long filterTeacherId = teacherId;
        Long filterStudentId = studentId;
        Long filterSchoolId = null;

        if (role == UserRole.TEACHER.getCode()) {
            filterTeacherId = userId;
        } else if (role == UserRole.STUDENT.getCode()) {
            filterStudentId = userId;
        } else if (role == UserRole.L2_ADMIN.getCode()) {
            AdminProfile adminProfile = adminProfileMapper.selectOne(
                    new LambdaQueryWrapper<AdminProfile>().eq(AdminProfile::getUserId, userId)
            );
            if (adminProfile != null) {
                filterSchoolId = adminProfile.getSchoolId();
            }
        }

        long current = page == null || page < 1 ? 1 : page;
        long pageSize = size == null || size < 1 ? 10 : Math.min(size, 100);
        Page<VolunteerRecordVO> mpPage = new Page<>(current, pageSize);
        List<VolunteerRecordVO> records = volunteerRecordMapper.selectRecords(mpPage, filterTeacherId, filterStudentId, status, filterSchoolId);
        mpPage.setRecords(records);
        return mpPage;
    }

    @Override
    public VolunteerRecordVO getRecordDetail(Long userId, Long recordId) {
        VolunteerRecord record = volunteerRecordMapper.selectById(recordId);
        if (record == null) {
            throw new BusinessException("服务记录不存在");
        }
        User user = userAccessService.requireUser(userId);
        if (user.getRole() == null) {
            throw new BusinessException("请先选择身份");
        }
        int role = user.getRole();
        if (role == UserRole.TEACHER.getCode() && !userId.equals(record.getTeacherId())) {
            throw new BusinessException("无权限查看该记录");
        }
        if (role == UserRole.STUDENT.getCode() && !userId.equals(record.getStudentId())) {
            throw new BusinessException("无权限查看该记录");
        }
        if (role == UserRole.L2_ADMIN.getCode()) {
            userAccessService.requireL2WithPermission(userId, "student_manage");
            StudentProfile sp = studentProfileMapper.selectOne(
                    new LambdaQueryWrapper<StudentProfile>().eq(StudentProfile::getUserId, record.getStudentId())
            );
            AdminProfile ap = adminProfileMapper.selectOne(
                    new LambdaQueryWrapper<AdminProfile>().eq(AdminProfile::getUserId, userId)
            );
            if (sp == null || ap == null || !sp.getSchoolId().equals(ap.getSchoolId())) {
                throw new BusinessException("无权限查看该记录");
            }
        } else if (role != UserRole.L1_ADMIN.getCode()
                && role != UserRole.TEACHER.getCode()
                && role != UserRole.STUDENT.getCode()) {
            throw new BusinessException("无权限操作");
        }
        VolunteerRecordVO vo = volunteerRecordMapper.selectRecordById(recordId);
        if (vo == null) {
            throw new BusinessException("服务记录不存在");
        }
        return vo;
    }

    private String jsonParam(String key, Object value) {
        try {
            Map<String, Object> params = new HashMap<>();
            params.put(key, value);
            return objectMapper.writeValueAsString(params);
        } catch (Exception e) {
            throw new BusinessException("参数序列化失败");
        }
    }
}
