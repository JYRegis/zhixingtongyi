package com.rural.education.service;

import com.baomidou.mybatisplus.extension.service.IService;
import com.rural.education.dto.common.PageResponse;
import com.rural.education.dto.request.admin.AuditRequest;
import com.rural.education.dto.request.admin.BatchCreateStudentsRequest;
import com.rural.education.dto.request.admin.SchoolRequest;
import com.rural.education.dto.request.admin.SecondaryAdminRequest;
import com.rural.education.dto.request.admin.UpdateUserStatusRequest;
import com.rural.education.model.entity.User;
import com.rural.education.vo.StudentVO;

import java.util.List;

public interface AdminService extends IService<User> {
    PageResponse<User> users(Long operatorId, Integer role, Integer status, Integer page, Integer size, String keyword);

    User userDetail(Long operatorId, Long userId);

    void updateUserStatus(Long operatorId, Long userId, UpdateUserStatusRequest request);

    void createSchool(Long operatorId, SchoolRequest request);

    void assignSecondaryAdmin(Long operatorId, SecondaryAdminRequest request);

    void auditTeacher(Long operatorId, Long teacherId, AuditRequest request);

    void auditStudent(Long operatorId, Long studentId, AuditRequest request);

    void batchCreateManagedStudents(Long operatorId, BatchCreateStudentsRequest request);

    List<StudentVO> managedStudents(Long operatorId);

    void switchManagedStudent(Long operatorId, Long studentId);
}

