package com.rural.education.service;

import com.baomidou.mybatisplus.extension.service.IService;
import com.rural.education.pojo.dto.*;
import com.rural.education.pojo.vo.*;
import com.rural.education.pojo.po.User;

import java.util.List;

public interface AdminService extends IService<User> {
    List<User> users(Long operatorId, Integer role, Integer status, Integer page, Integer size, String keyword);

    User userDetail(Long operatorId, Long userId);

    void updateUserStatus(Long operatorId, Long userId, UpdateUserStatusRequest request);

    void createSchool(Long operatorId, SchoolRequest request);

    void assignSecondaryAdmin(Long operatorId, SecondaryAdminRequest request);

    void auditTeacher(Long operatorId, Long teacherId, AuditRequest request);

    void auditStudent(Long operatorId, Long studentId, AuditRequest request);

    void batchCreateManagedStudents(Long operatorId, BatchCreateStudentsRequest request);

    List<ManagedStudentVO> managedStudents(Long operatorId);

    void switchManagedStudent(Long operatorId, Long studentId);
}

