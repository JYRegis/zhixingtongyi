package com.rural.education.controller.admin;

import com.rural.education.dto.common.ApiResponse;
import com.rural.education.dto.common.PageResponse;
import com.rural.education.vo.TeacherVO;
import com.rural.education.dto.request.admin.AuditRequest;
import com.rural.education.service.AdminService;
import com.rural.education.utils.CurrentUserUtil;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/admin")
@RequiredArgsConstructor
public class AdminTeacherController {
    private final CurrentUserUtil currentUserUtil;
    private final AdminService adminService;

    @GetMapping("/teachers/pending")
    public ApiResponse<PageResponse<TeacherVO>> pendingTeachers(
            @RequestParam(required = false, defaultValue = "1") Long page,
            @RequestParam(required = false, defaultValue = "10") Long size,
            @RequestParam(required = false) Long schoolId) {
        Long operatorId = currentUserUtil.getCurrentUserId();
        return ApiResponse.success(adminService.pendingTeachers(operatorId, page, size, schoolId));
    }

    @GetMapping("/teachers/{teacherId}/profile")
    public ApiResponse<TeacherVO> teacherProfile(@PathVariable Long teacherId) {
        Long operatorId = currentUserUtil.getCurrentUserId();
        return ApiResponse.success(adminService.teacherProfileDetail(operatorId, teacherId));
    }

    @PutMapping("/teachers/{teacherId}/audit")
    public ApiResponse<Void> auditTeacher(@PathVariable Long teacherId, @Valid @RequestBody AuditRequest request) {
        Long operatorId = currentUserUtil.getCurrentUserId();
        adminService.auditTeacher(operatorId, teacherId, request);
        return ApiResponse.success();
    }
}

