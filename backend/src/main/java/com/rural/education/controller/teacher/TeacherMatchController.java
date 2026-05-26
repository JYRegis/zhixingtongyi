package com.rural.education.controller.teacher;

import com.rural.education.security.SecurityUtils;
import com.rural.education.dto.common.ApiResponse;
import com.rural.education.dto.request.teacher.ContinuousMatchRequest;
import com.rural.education.service.TeacherService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/teacher")
@RequiredArgsConstructor
@PreAuthorize("hasRole('2')")
public class TeacherMatchController {
    private final TeacherService teacherService;

    @PutMapping("/continuous-match")
    public ApiResponse<Void> updateContinuousMatch(@Valid @RequestBody ContinuousMatchRequest request) {
        Long userId = SecurityUtils.getCurrentUserId();
        teacherService.updateContinuousMatch(userId, request.getEnabled());
        return ApiResponse.success();
    }
}

