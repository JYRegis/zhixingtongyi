package com.rural.education.service;

import com.baomidou.mybatisplus.extension.service.IService;
import com.rural.education.dto.request.chat.SendMessageRequest;
import com.rural.education.model.entity.ChatMessage;
import com.rural.education.model.entity.ChatParticipant;
import com.rural.education.vo.ChatConversationVO;
import com.rural.education.vo.ChatMessageVO;

import java.util.List;

public interface ChatService extends IService<ChatMessage> {

    ChatMessageVO sendMessage(Long userId, SendMessageRequest request);

    List<ChatMessageVO> getMessages(Long userId, Long matchPairId, Long lastMessageId, Integer limit);

    void markRead(Long userId, Long messageId);

    void addParticipant(Long adminUserId, Long pairId, Long targetUserId);

    void removeParticipant(Long adminUserId, Long pairId, Long targetUserId);

    List<ChatParticipant> getParticipants(Long userId, Long pairId);

    List<ChatConversationVO> listAdminConversations(Long userId);
}
