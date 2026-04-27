package com.rural.education.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.conditions.update.LambdaUpdateWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.rural.education.dto.common.PageResponse;
import com.rural.education.enums.AuditStatus;
import com.rural.education.enums.UserRole;
import com.rural.education.enums.UserStatus;
import com.rural.education.exception.BizException;
import com.rural.education.model.mapper.*;
import com.rural.education.dto.request.admin.*;
import com.rural.education.model.entity.*;
import com.rural.education.vo.*;
import com.rural.education.service.AdminService;
import com.rural.education.service.UserAccessService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AdminServiceImpl extends ServiceImpl<UserMapper, User> implements AdminService {
    private final UserAccessService userAccessService;
    private final UserMapper userMapper;
    private final SchoolMapper schoolMapper;
    private final AdminProfileMapper adminProfileMapper;
    private final StudentProfileMapper studentProfileMapper;
    private final TeacherProfileMapper teacherProfileMapper;
    private final ObjectMapper objectMapper;
    private final StringRedisTemplate redisTemplate;

    @Override
    public PageResponse<User> users(Long operatorId, Integer role, Integer status, Integer page, Integer size, String keyword) {
        requireL1OrL2Permission(operatorId, "user_manage");
        LambdaQueryWrapper<User> wrapper = new LambdaQueryWrapper<>();
        if (role != null) {
            wrapper.eq(User::getRole, role);
        }
        if (status != null) {
            wrapper.eq(User::getStatus, status);
        }
        if (keyword != null && !keyword.isBlank()) {
            wrapper.and(w -> w.like(User::getUsername, keyword).or().like(User::getPhone, keyword));
        }
        wrapper.orderByDesc(User::getId);
        Page<User> p = userMapper.selectPage(new Page<>(page, size), wrapper);
        return PageResponse.from(p);
    }

    @Override
    public User userDetail(Long operatorId, Long userId) {
        requireL1OrL2Permission(operatorId, "user_manage");
        User user = userMapper.selectById(userId);
        if (user == null) {
            throw new BizException("用户不存在");
        }
        return user;
    }

    @Override
    public void updateUserStatus(Long operatorId, Long userId, UpdateUserStatusRequest request) {
        requireL1OrL2Permission(operatorId, "user_manage");
        userMapper.update(null, new LambdaUpdateWrapper<User>().eq(User::getId, userId).set(User::getStatus, request.getStatus()));
    }

    @Override
    public void createSchool(Long operatorId, SchoolRequest request) {
        userAccessService.requireL1Admin(operatorId);
        School school = new School();
        school.setName(request.getName());
        school.setRegionCode(request.getRegionCode());
        school.setAddress(request.getAddress());
        school.setContactPerson(request.getContactPerson());
        school.setContactPhone(request.getContactPhone());
        schoolMapper.insert(school);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void assignSecondaryAdmin(Long operatorId, SecondaryAdminRequest request) {
        userAccessService.requireL1Admin(operatorId);
        userMapper.update(null, new LambdaUpdateWrapper<User>().eq(User::getId, request.getUserId()).set(User::getRole, UserRole.L2_ADMIN.getCode()));
        String permissions = toJson(request.getPermissions());
        AdminProfile admin = adminProfileMapper.selectOne(
                new LambdaQueryWrapper<AdminProfile>().eq(AdminProfile::getUserId, request.getUserId())
        );
        if (admin != null) {
            adminProfileMapper.update(
                    null,
                    new LambdaUpdateWrapper<AdminProfile>()
                            .eq(AdminProfile::getUserId, request.getUserId())
                            .set(AdminProfile::getRealName, request.getRealName() == null ? "二级管理员" : request.getRealName())
                            .set(AdminProfile::getSchoolId, request.getSchoolId())
                            .set(AdminProfile::getRegionCode, request.getRegionCode())
                            .set(AdminProfile::getPermissions, permissions)
            );
        } else {
            AdminProfile newAdmin = new AdminProfile();
            newAdmin.setUserId(request.getUserId());
            newAdmin.setRealName(request.getRealName() == null ? "二级管理员" : request.getRealName());
            newAdmin.setSchoolId(request.getSchoolId());
            newAdmin.setRegionCode(request.getRegionCode());
            newAdmin.setPermissions(permissions);
            adminProfileMapper.insert(newAdmin);
        }
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void auditTeacher(Long operatorId, Long teacherId, AuditRequest request) {
        userAccessService.requireL2WithPermission(operatorId, "teacher_audit");
        teacherProfileMapper.update(
                null,
                new LambdaUpdateWrapper<TeacherProfile>()
                        .eq(TeacherProfile::getUserId, teacherId)
                        .set(TeacherProfile::getCertificationStatus, request.getStatus())
                        .set(TeacherProfile::getAuditTime, LocalDateTime.now())
                        .set(TeacherProfile::getAuditNotes, request.getNotes())
        );
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void auditStudent(Long operatorId, Long studentId, AuditRequest request) {
        userAccessService.requireL2WithPermission(operatorId, "student_manage");
        StudentProfile studentProfile = studentProfileMapper.selectOne(
                new LambdaQueryWrapper<StudentProfile>().eq(StudentProfile::getUserId, studentId)
        );
        if (studentProfile == null) {
            throw new BizException("学生资料不存在");
        }
        AdminProfile adminProfile = adminProfileMapper.selectOne(
                new LambdaQueryWrapper<AdminProfile>().eq(AdminProfile::getUserId, operatorId)
        );
        Long adminSchoolId = adminProfile == null ? null : adminProfile.getSchoolId();
        Long studentSchoolId = studentProfile.getSchoolId();
        if (adminSchoolId == null || !adminSchoolId.equals(studentSchoolId)) {
            throw new BizException("只能审核本校学生");
        }
        studentProfileMapper.update(
                null,
                new LambdaUpdateWrapper<StudentProfile>()
                        .eq(StudentProfile::getUserId, studentId)
                        .set(StudentProfile::getAuditStatus, request.getStatus())
                        .set(StudentProfile::getAuditTime, LocalDateTime.now())
                        .set(StudentProfile::getAuditNotes, request.getNotes())
        );
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void batchCreateManagedStudents(Long operatorId, BatchCreateStudentsRequest request) {
        userAccessService.requireL2WithPermission(operatorId, "student_manage");
        AdminProfile adminProfile = adminProfileMapper.selectOne(
                new LambdaQueryWrapper<AdminProfile>().eq(AdminProfile::getUserId, operatorId)
        );
        Long schoolId = adminProfile == null ? null : adminProfile.getSchoolId();
        for (ManagedStudentRequest student : request.getStudents()) {
            String username = "managed_" + UUID.randomUUID().toString().replace("-", "").substring(0, 10);
            User user = new User();
            user.setUsername(username);
            user.setPassword(UUID.randomUUID().toString());
            user.setRole(UserRole.STUDENT.getCode());
            user.setStatus(UserStatus.ENABLED.getCode());
            userMapper.insert(user);
            StudentProfile sp = new StudentProfile();
            sp.setUserId(user.getId());
            sp.setRealName(student.getRealName());
            sp.setSchoolId(student.getSchoolId() == null ? schoolId : student.getSchoolId());
            sp.setGrade(student.getGrade());
            sp.setSubjectsNeeded(toJson(student.getSubjectsNeeded()));
            sp.setFreeTime(toJson(student.getFreeTime()));
            sp.setPersonalityDesc(student.getPersonalityDesc());
            sp.setProfileStatus(1);
            sp.setBindAdminId(operatorId);
            sp.setAuditStatus(AuditStatus.APPROVED.getCode());
            studentProfileMapper.insert(sp);
        }
    }

    @Override
    public List<StudentVO> managedStudents(Long operatorId) {
        userAccessService.requireL2WithPermission(operatorId, "student_manage");
        return studentProfileMapper.selectManagedStudents(operatorId);
    }

    @Override
    public void switchManagedStudent(Long operatorId, Long studentId) {
        userAccessService.requireL2WithPermission(operatorId, "student_manage");
        Long count = studentProfileMapper.selectCount(
                new LambdaQueryWrapper<StudentProfile>()
                        .eq(StudentProfile::getUserId, studentId)
                        .eq(StudentProfile::getBindAdminId, operatorId)
        );
        if (count == 0) {
            throw new BizException("该学生不在你的代管范围");
        }
        redisTemplate.opsForValue().set("managed:current:admin:" + operatorId, String.valueOf(studentId), 12, java.util.concurrent.TimeUnit.HOURS);
    }

    private String toJson(Object obj) {
        try {
            return objectMapper.writeValueAsString(obj);
        } catch (Exception e) {
            throw new BizException("JSON序列化失败");
        }
    }

    private void requireL1OrL2Permission(Long userId, String permission) {
        User user = userAccessService.requireUser(userId);
        if (Integer.valueOf(UserRole.L1_ADMIN.getCode()).equals(user.getRole())) {
            return;
        }
        if (Integer.valueOf(UserRole.L2_ADMIN.getCode()).equals(user.getRole())) {
            userAccessService.requireL2WithPermission(userId, permission);
            return;
        }
        throw new BizException("无权限操作");
    }
}

