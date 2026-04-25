package com.rural.education.controller;

import com.rural.education.pojo.dto.*;
import com.rural.education.pojo.vo.*;
import com.rural.education.service.TeacherService;
import com.rural.education.utils.CurrentUserUtil;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/teacher")
@RequiredArgsConstructor
public class TeacherController {
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
    public ApiResponse<TeacherProfileVO> getProfile() {
        Long userId = currentUserUtil.getCurrentUserId();
        return ApiResponse.success(teacherService.getProfile(userId));
    }

    @PutMapping("/continuous-match")
    public ApiResponse<Void> updateContinuousMatch(@Valid @RequestBody ContinuousMatchRequest request) {
        Long userId = currentUserUtil.getCurrentUserId();
        teacherService.updateContinuousMatch(userId, request.getEnabled());
        return ApiResponse.success();
    }
}

