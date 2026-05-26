package com.rural.education.controller.chat;

import com.rural.education.security.SecurityUtils;
import com.rural.education.dto.common.ApiResponse;
import com.rural.education.dto.request.chat.AddParticipantRequest;
import com.rural.education.dto.request.chat.SendMessageRequest;
import com.rural.education.service.ChatService;
import com.rural.education.vo.ChatMessageVO;
import com.rural.education.vo.ChatParticipantVO;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.DeleteMapping;
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
@RequestMapping("/chat")
@RequiredArgsConstructor
public class ChatController {
    private final ChatService chatService;

    @PostMapping("/messages")
    public ApiResponse<ChatMessageVO> sendMessage(@Valid @RequestBody SendMessageRequest request) {
        Long userId = SecurityUtils.getCurrentUserId();
        return ApiResponse.success(chatService.sendMessage(userId, request));
    }

    @GetMapping("/messages")
    public ApiResponse<List<ChatMessageVO>> getMessages(@RequestParam Long matchPairId,
                                                         @RequestParam(required = false) Long lastMessageId,
                                                         @RequestParam(required = false, defaultValue = "50") Integer limit) {
        Long userId = SecurityUtils.getCurrentUserId();
        return ApiResponse.success(chatService.getMessages(userId, matchPairId, lastMessageId, limit));
    }

    @PutMapping("/messages/{messageId}/read")
    public ApiResponse<Void> markRead(@PathVariable Long messageId) {
        Long userId = SecurityUtils.getCurrentUserId();
        chatService.markRead(userId, messageId);
        return ApiResponse.success();
    }

    @PreAuthorize("hasRole('0') or @auth.hasL2Permission('student_manage')")
    @PostMapping("/pairs/{pairId}/participants")
    public ApiResponse<Void> addParticipant(@PathVariable Long pairId, @Valid @RequestBody AddParticipantRequest request) {
        Long userId = SecurityUtils.getCurrentUserId();
        chatService.addParticipant(userId, pairId, request.getUserId());
        return ApiResponse.success();
    }

    @PreAuthorize("hasRole('0') or @auth.hasL2Permission('student_manage')")
    @DeleteMapping("/pairs/{pairId}/participants/{targetUserId}")
    public ApiResponse<Void> removeParticipant(@PathVariable Long pairId, @PathVariable Long targetUserId) {
        Long userId = SecurityUtils.getCurrentUserId();
        chatService.removeParticipant(userId, pairId, targetUserId);
        return ApiResponse.success();
    }

    @GetMapping("/pairs/{pairId}/participants")
    public ApiResponse<List<ChatParticipantVO>> getParticipants(@PathVariable Long pairId) {
        Long userId = SecurityUtils.getCurrentUserId();
        return ApiResponse.success(chatService.getParticipants(userId, pairId));
    }
}
