package com.rural.education.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.conditions.update.LambdaUpdateWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.rural.education.dto.common.PageResponse;
import com.fasterxml.jackson.core.type.TypeReference;
import com.rural.education.enums.AuditStatus;
import com.rural.education.enums.UserRole;
import com.rural.education.enums.UserStatus;
import com.rural.education.exception.BusinessException;
import com.rural.education.model.mapper.*;
import com.rural.education.dto.request.admin.*;
import com.rural.education.model.entity.*;
import com.rural.education.model.entity.TeacherProfile;
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
        userAccessService.requireAnyRole(operatorId, UserRole.L1_ADMIN.getCode(), UserRole.L2_ADMIN.getCode());
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
        userAccessService.requireAnyRole(operatorId, UserRole.L1_ADMIN.getCode(), UserRole.L2_ADMIN.getCode());
        User user = userMapper.selectById(userId);
        if (user == null) {
            throw new BusinessException("用户不存在");
        }
        return user;
    }

    @Override
    public void updateUserStatus(Long operatorId, Long userId, UpdateUserStatusRequest request) {
        userAccessService.requireAnyRole(operatorId, UserRole.L1_ADMIN.getCode(), UserRole.L2_ADMIN.getCode());
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

        // 解析 userId：优先使用 userId，否则按 phone 查找或创建
        Long userId = request.getUserId();
        if (userId == null) {
            String phone = request.getPhone();
            if (phone == null || phone.isBlank()) {
                throw new BusinessException("userId 与 phone 至少传一个");
            }
            User existing = userMapper.selectOne(new LambdaQueryWrapper<User>().eq(User::getPhone, phone));
            if (existing != null) {
                userId = existing.getId();
            } else {
                // 新建一个待激活的 L2 账号
                User newUser = new User();
                newUser.setPhone(phone);
                newUser.setUsername(request.getRealName() == null || request.getRealName().isBlank() ? ("L2_" + phone.substring(phone.length() - 4)) : request.getRealName());
                newUser.setPassword(java.util.UUID.randomUUID().toString());
                newUser.setRole(UserRole.L2_ADMIN.getCode());
                newUser.setStatus(UserStatus.ENABLED.getCode());
                userMapper.insert(newUser);
                userId = newUser.getId();
            }
        }

        // 升级角色为 L2
        userMapper.update(null, new LambdaUpdateWrapper<User>().eq(User::getId, userId).set(User::getRole, UserRole.L2_ADMIN.getCode()));

        String permissions = toJson(request.getPermissions());
        Long finalUserId = userId;
        AdminProfile admin = adminProfileMapper.selectOne(
                new LambdaQueryWrapper<AdminProfile>().eq(AdminProfile::getUserId, finalUserId)
        );
        if (admin != null) {
            adminProfileMapper.update(
                    null,
                    new LambdaUpdateWrapper<AdminProfile>()
                            .eq(AdminProfile::getUserId, finalUserId)
                            .set(AdminProfile::getRealName, request.getRealName() == null ? "二级管理员" : request.getRealName())
                            .set(AdminProfile::getSchoolId, request.getSchoolId())
                            .set(AdminProfile::getRegionCode, request.getRegionCode())
                            .set(AdminProfile::getPermissions, permissions)
            );
        } else {
            AdminProfile newAdmin = new AdminProfile();
            newAdmin.setUserId(finalUserId);
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
            throw new BusinessException("学生资料不存在");
        }
        User operator = userMapper.selectById(operatorId);
        if (operator != null && !Integer.valueOf(UserRole.L1_ADMIN.getCode()).equals(operator.getRole())) {
            AdminProfile adminProfile = adminProfileMapper.selectOne(
                    new LambdaQueryWrapper<AdminProfile>().eq(AdminProfile::getUserId, operatorId)
            );
            Long adminSchoolId = adminProfile == null ? null : adminProfile.getSchoolId();
            Long studentSchoolId = studentProfile.getSchoolId();
            if (adminSchoolId == null || !adminSchoolId.equals(studentSchoolId)) {
                throw new BusinessException("只能审核本校学生");
            }
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
            throw new BusinessException("该学生不在你的代管范围");
        }
        redisTemplate.opsForValue().set("managed:current:admin:" + operatorId, String.valueOf(studentId), 12, java.util.concurrent.TimeUnit.HOURS);
    }

    @Override
    public PageResponse<StudentVO> pendingStudents(Long operatorId, Long page, Long size, Long schoolId) {
        userAccessService.requireAnyRole(operatorId, UserRole.L1_ADMIN.getCode(), UserRole.L2_ADMIN.getCode());
        long current = page == null || page < 1 ? 1 : page;
        long pageSize = size == null || size < 1 ? 10 : Math.min(size, 100);
        LambdaQueryWrapper<StudentProfile> wrapper = new LambdaQueryWrapper<StudentProfile>()
                .eq(StudentProfile::getAuditStatus, AuditStatus.PENDING.getCode())
                .eq(StudentProfile::getProfileStatus, 1)
                .orderByDesc(StudentProfile::getUpdateTime);
        User operator = userMapper.selectById(operatorId);
        if (operator != null && Integer.valueOf(UserRole.L2_ADMIN.getCode()).equals(operator.getRole())) {
            AdminProfile admin = adminProfileMapper.selectOne(
                    new LambdaQueryWrapper<AdminProfile>().eq(AdminProfile::getUserId, operatorId)
            );
            if (admin != null && admin.getSchoolId() != null) {
                wrapper.eq(StudentProfile::getSchoolId, admin.getSchoolId());
            }
        } else if (schoolId != null) {
            // L1 按学校筛选
            wrapper.eq(StudentProfile::getSchoolId, schoolId);
        }
        Page<StudentProfile> p = studentProfileMapper.selectPage(new Page<>(current, pageSize), wrapper);
        Page<StudentVO> voPage = new Page<>(p.getCurrent(), p.getSize(), p.getTotal());
        voPage.setRecords(p.getRecords().stream().map(this::toStudentVO).toList());
        return PageResponse.from(voPage);
    }

    @Override
    public StudentVO studentProfileDetail(Long operatorId, Long studentId) {
        userAccessService.requireAnyRole(operatorId, UserRole.L1_ADMIN.getCode(), UserRole.L2_ADMIN.getCode());
        StudentProfile row = studentProfileMapper.selectOne(
                new LambdaQueryWrapper<StudentProfile>().eq(StudentProfile::getUserId, studentId)
        );
        if (row == null) {
            throw new BusinessException("学生资料不存在");
        }
        return toStudentVO(row);
    }

    @Override
    public PageResponse<TeacherVO> pendingTeachers(Long operatorId, Long page, Long size, Long schoolId) {
        userAccessService.requireAnyRole(operatorId, UserRole.L1_ADMIN.getCode(), UserRole.L2_ADMIN.getCode());
        long current = page == null || page < 1 ? 1 : page;
        long pageSize = size == null || size < 1 ? 10 : Math.min(size, 100);
        LambdaQueryWrapper<TeacherProfile> wrapper = new LambdaQueryWrapper<TeacherProfile>()
                .eq(TeacherProfile::getCertificationStatus, AuditStatus.PENDING.getCode())
                .orderByDesc(TeacherProfile::getUpdateTime);
        if (schoolId != null) {
            wrapper.eq(TeacherProfile::getSchoolId, schoolId);
        }
        Page<TeacherProfile> p = teacherProfileMapper.selectPage(new Page<>(current, pageSize), wrapper);
        Page<TeacherVO> voPage = new Page<>(p.getCurrent(), p.getSize(), p.getTotal());
        voPage.setRecords(p.getRecords().stream().map(this::toTeacherVO).toList());
        return PageResponse.from(voPage);
    }

    @Override
    public TeacherVO teacherProfileDetail(Long operatorId, Long teacherId) {
        userAccessService.requireAnyRole(operatorId, UserRole.L1_ADMIN.getCode(), UserRole.L2_ADMIN.getCode());
        TeacherProfile row = teacherProfileMapper.selectOne(
                new LambdaQueryWrapper<TeacherProfile>().eq(TeacherProfile::getUserId, teacherId)
        );
        if (row == null) {
            throw new BusinessException("志愿者资料不存在");
        }
        return toTeacherVO(row);
    }

    @Override
    public AdminProfileVO myProfile(Long operatorId) {
        userAccessService.requireAnyRole(operatorId, UserRole.L1_ADMIN.getCode(), UserRole.L2_ADMIN.getCode());
        AdminProfile admin = adminProfileMapper.selectOne(
                new LambdaQueryWrapper<AdminProfile>().eq(AdminProfile::getUserId, operatorId)
        );
        if (admin == null) {
            throw new BusinessException("管理员资料不存在");
        }
        AdminProfileVO vo = new AdminProfileVO();
        vo.setUserId(admin.getUserId());
        vo.setRealName(admin.getRealName());
        vo.setSchoolId(admin.getSchoolId());
        vo.setRegionCode(admin.getRegionCode());
        if (admin.getSchoolId() != null) {
            School school = schoolMapper.selectById(admin.getSchoolId());
            if (school != null) {
                vo.setSchoolName(school.getName());
            }
        }
        if (admin.getPermissions() != null && !admin.getPermissions().isBlank()) {
            try {
                vo.setPermissions(objectMapper.readValue(admin.getPermissions(), new TypeReference<List<String>>() {}));
            } catch (Exception e) {
                vo.setPermissions(List.of());
            }
        } else {
            vo.setPermissions(List.of());
        }
        return vo;
    }

    @Override
    public void updateMyProfile(Long operatorId, com.rural.education.dto.request.admin.UpdateAdminProfileRequest request) {
        userAccessService.requireAnyRole(operatorId, UserRole.L1_ADMIN.getCode(), UserRole.L2_ADMIN.getCode());
        LambdaUpdateWrapper<AdminProfile> wrapper = new LambdaUpdateWrapper<AdminProfile>()
                .eq(AdminProfile::getUserId, operatorId);
        boolean hasUpdate = false;
        if (request.getRealName() != null && !request.getRealName().isBlank()) {
            wrapper.set(AdminProfile::getRealName, request.getRealName().trim());
            hasUpdate = true;
        }
        if (request.getRegionCode() != null) {
            wrapper.set(AdminProfile::getRegionCode, request.getRegionCode().trim());
            hasUpdate = true;
        }
        if (hasUpdate) {
            adminProfileMapper.update(null, wrapper);
        }
    }

    private StudentVO toStudentVO(StudentProfile row) {
        StudentVO vo = new StudentVO();
        vo.setId(row.getId());
        vo.setUserId(row.getUserId());
        vo.setRealName(row.getRealName());
        vo.setSchoolId(row.getSchoolId());
        vo.setGrade(row.getGrade());
        vo.setPersonalityDesc(row.getPersonalityDesc());
        vo.setProfileStatus(row.getProfileStatus());
        vo.setBindAdminId(row.getBindAdminId());
        vo.setAuditStatus(row.getAuditStatus());
        vo.setAuditTime(row.getAuditTime());
        vo.setAuditNotes(row.getAuditNotes());
        vo.setUpdateTime(row.getUpdateTime());
        if (row.getSchoolId() != null) {
            School school = schoolMapper.selectById(row.getSchoolId());
            if (school != null) {
                vo.setSchoolName(school.getName());
            }
        }
        // 补充 user 表的 username 和 phone
        User user = userMapper.selectById(row.getUserId());
        if (user != null) {
            vo.setUsername(user.getUsername());
            vo.setPhone(user.getPhone());
        }
        try {
            if (row.getSubjectsNeeded() != null) {
                vo.setSubjectsNeeded(objectMapper.readValue(row.getSubjectsNeeded(), new TypeReference<List<Object>>() {}));
            }
            if (row.getFreeTime() != null) {
                vo.setFreeTime(objectMapper.readValue(row.getFreeTime(), new TypeReference<List<java.util.Map<String, Object>>>() {}));
            }
        } catch (Exception ignored) {
        }
        return vo;
    }

    private TeacherVO toTeacherVO(TeacherProfile row) {
        TeacherVO vo = new TeacherVO();
        vo.setUserId(row.getUserId());
        vo.setRealName(row.getRealName());
        vo.setSchoolId(row.getSchoolId());
        if (row.getSchoolId() != null) {
            School school = schoolMapper.selectById(row.getSchoolId());
            if (school != null) {
                vo.setSchoolName(school.getName());
            }
        }
        vo.setGrade(row.getGrade());
        vo.setPersonalSkills(row.getPersonalSkills());
        vo.setPersonalityDesc(row.getPersonalityDesc());
        vo.setCertificationStatus(row.getCertificationStatus());
        vo.setAuditTime(row.getAuditTime());
        vo.setAuditNotes(row.getAuditNotes());
        vo.setContinuousMatch(row.getContinuousMatch());
        vo.setTotalServiceDuration(row.getTotalServiceDuration());
        try {
            if (row.getSkilledSubjects() != null) {
                vo.setSkilledSubjects(objectMapper.readValue(row.getSkilledSubjects(), new TypeReference<List<Object>>() {}));
            }
            if (row.getFreeTime() != null) {
                vo.setFreeTime(objectMapper.readValue(row.getFreeTime(), new TypeReference<List<java.util.Map<String, Object>>>() {}));
            }
        } catch (Exception ignored) {
        }
        return vo;
    }

    private String toJson(Object obj) {
        try {
            return objectMapper.writeValueAsString(obj);
        } catch (Exception e) {
            throw new BusinessException("JSON序列化失败");
        }
    }

}

