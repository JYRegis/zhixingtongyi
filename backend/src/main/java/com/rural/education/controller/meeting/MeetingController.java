package com.rural.education.controller.meeting;

import com.rural.education.security.SecurityUtils;
import com.rural.education.dto.common.ApiResponse;
import com.rural.education.dto.request.meeting.CreateMeetingRequest;
import com.rural.education.dto.request.meeting.UpdateStatusRequest;
import com.rural.education.model.entity.Meeting;
import com.rural.education.vo.MeetingVO;
import com.rural.education.service.MeetingService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/meetings")
@RequiredArgsConstructor
public class MeetingController {
    private final MeetingService meetingService;

    @PostMapping
    public ApiResponse<Void> create(@Valid @RequestBody CreateMeetingRequest request) {
        Long userId = SecurityUtils.getCurrentUserId();
        meetingService.create(userId, request);
        return ApiResponse.success();
    }

    @PreAuthorize("hasAnyRole('0','1')")
    @GetMapping
    public ApiResponse<List<Meeting>> list(
            @RequestParam(required = false) Long matchPairId,
            @RequestParam(required = false) Integer status,
            @RequestParam(required = false) String startTimeFrom,
            @RequestParam(required = false) String startTimeTo
    ) {
        Long userId = SecurityUtils.getCurrentUserId();
        return ApiResponse.success(meetingService.list(userId, matchPairId, status, startTimeFrom, startTimeTo));
    }

    @GetMapping("/{meetingId}")
    public ApiResponse<MeetingVO> detail(@PathVariable Long meetingId) {
        Long userId = SecurityUtils.getCurrentUserId();
        return ApiResponse.success(meetingService.detail(userId, meetingId));
    }

    @PutMapping("/{meetingId}/status")
    public ApiResponse<Void> updateStatus(@PathVariable Long meetingId, @Valid @RequestBody UpdateStatusRequest request) {
        Long userId = SecurityUtils.getCurrentUserId();
        meetingService.updateStatus(userId, meetingId, request);
        return ApiResponse.success();
    }

    @GetMapping("/my")
    public ApiResponse<List<MeetingVO>> myMeetings() {
        Long userId = SecurityUtils.getCurrentUserId();
        return ApiResponse.success(meetingService.myMeetings(userId));
    }
}

