package com.rural.education.websocket;

import com.rural.education.dto.request.chat.MarkReadRequest;
import com.rural.education.dto.request.chat.SendMessageRequest;
import com.rural.education.service.ChatService;
import com.rural.education.vo.ChatMessageVO;
import com.rural.education.vo.ChatParticipantVO;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.stereotype.Controller;

import java.util.List;

@Controller
@RequiredArgsConstructor
public class ChatStompController {

    private final ChatService chatService;
    private final UserSessionRegistry sessionRegistry;
    private final SimpMessagingTemplate messagingTemplate;

    @MessageMapping("/chat.send")
    public void sendMessage(@Payload SendMessageRequest request,
                            @AuthenticationPrincipal Long userId) {
        ChatMessageVO vo = chatService.sendMessage(userId, request);

        List<ChatParticipantVO> participants = chatService.getParticipants(userId, request.getMatchPairId());
        for (ChatParticipantVO p : participants) {
            if (!p.getUserId().equals(userId) && sessionRegistry.isOnline(p.getUserId())) {
                messagingTemplate.convertAndSendToUser(
                        p.getUserId().toString(), "/queue/chat", vo);
            }
        }
    }

    @MessageMapping("/chat.read")
    public void markRead(@Payload MarkReadRequest request,
                         @AuthenticationPrincipal Long userId) {
        chatService.markRead(userId, request.getMessageId());
    }

    @MessageMapping("/chat.ping")
    public void ping() {
    }
}
