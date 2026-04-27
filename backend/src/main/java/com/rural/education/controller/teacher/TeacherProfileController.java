package com.rural.education.controller.teacher;

import com.rural.education.dto.common.ApiResponse;
import com.rural.education.dto.request.teacher.TeacherProfileRequest;
import com.rural.education.vo.TeacherVO;
import com.rural.education.service.TeacherService;
import com.rural.education.utils.CurrentUserUtil;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/teacher")
@RequiredArgsConstructor
public class TeacherProfileController {
    private final CurrentUserUtil currentUserUtil;
    private final TeacherService teacherService;

    @PostMapping("/profile")
    public ApiResponse<Void> createProfile(@Valid @RequestBody TeacherProfileRequest request) {
        Long userId = currentUserUtil.getCurrentUserId();
        teacherService.createProfile(userId, request);
        return ApiResponse.success();
    }

    @PutMapping("/profile")
    public ApiResponse<Void> updateProfile(@Valid @RequestBody TeacherProfileRequest request) {
        Long userId = currentUserUtil.getCurrentUserId();
        teacherService.updateProfile(userId, request);
        return ApiResponse.success();
    }

    @GetMapping("/profile")
    public ApiResponse<TeacherVO> getProfile() {
        Long userId = currentUserUtil.getCurrentUserId();
        return ApiResponse.success(teacherService.getProfile(userId));
    }
}

