package com.rural.education.controller.admin;

import com.rural.education.dto.common.ApiResponse;
import com.rural.education.dto.request.admin.AuditRequest;
import com.rural.education.service.AdminService;
import com.rural.education.utils.CurrentUserUtil;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/admin")
@RequiredArgsConstructor
public class AdminTeacherController {
    private final CurrentUserUtil currentUserUtil;
    private final AdminService adminService;

    @PutMapping("/teachers/{teacherId}/audit")
    public ApiResponse<Void> auditTeacher(@PathVariable Long teacherId, @Valid @RequestBody AuditRequest request) {
        Long operatorId = currentUserUtil.getCurrentUserId();
        adminService.auditTeacher(operatorId, teacherId, request);
        return ApiResponse.success();
    }
}

