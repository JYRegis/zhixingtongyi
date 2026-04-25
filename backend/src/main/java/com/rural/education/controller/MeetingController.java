package com.rural.education.controller;

import com.rural.education.pojo.dto.*;
import com.rural.education.pojo.vo.*;
import com.rural.education.pojo.po.Meeting;
import com.rural.education.service.MeetingService;
import com.rural.education.utils.CurrentUserUtil;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/meetings")
@RequiredArgsConstructor
public class MeetingController {
    private final CurrentUserUtil currentUserUtil;
    private final MeetingService meetingService;

    @PostMapping
    public ApiResponse<Void> create(@Valid @RequestBody MeetingCreateRequest request) {
        Long userId = currentUserUtil.getCurrentUserId();
        meetingService.create(userId, request);
        return ApiResponse.success();
    }

    @GetMapping
    public ApiResponse<List<Meeting>> list(
            @RequestParam(required = false) Long matchPairId,
            @RequestParam(required = false) Integer status,
            @RequestParam(required = false) String startTimeFrom,
            @RequestParam(required = false) String startTimeTo
    ) {
        Long userId = currentUserUtil.getCurrentUserId();
        return ApiResponse.success(meetingService.list(userId, matchPairId, status, startTimeFrom, startTimeTo));
    }

    @GetMapping("/{meetingId}")
    public ApiResponse<MeetingDetailVO> detail(@PathVariable Long meetingId) {
        Long userId = currentUserUtil.getCurrentUserId();
        return ApiResponse.success(meetingService.detail(userId, meetingId));
    }

    @PutMapping("/{meetingId}/status")
    public ApiResponse<Void> updateStatus(@PathVariable Long meetingId, @Valid @RequestBody UpdateStatusRequest request) {
        Long userId = currentUserUtil.getCurrentUserId();
        meetingService.updateStatus(userId, meetingId, request);
        return ApiResponse.success();
    }

    @GetMapping("/my")
    public ApiResponse<List<MeetingItemVO>> myMeetings() {
        Long userId = currentUserUtil.getCurrentUserId();
        return ApiResponse.success(meetingService.myMeetings(userId));
    }
}

