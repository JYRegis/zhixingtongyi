package com.rural.education.controller.admin;

import com.rural.education.dto.common.ApiResponse;
import com.rural.education.service.ChatService;
import com.rural.education.utils.CurrentUserUtil;
import com.rural.education.vo.ChatConversationVO;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/admin/chat")
@RequiredArgsConstructor
public class AdminChatController {
    private final CurrentUserUtil currentUserUtil;
    private final ChatService chatService;

    @GetMapping("/conversations")
    public ApiResponse<List<ChatConversationVO>> conversations() {
        Long userId = currentUserUtil.getCurrentUserId();
        return ApiResponse.success(chatService.listAdminConversations(userId));
    }
}
