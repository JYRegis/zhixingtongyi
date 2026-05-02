package com.rural.education.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.rural.education.dto.request.chat.SendMessageRequest;
import com.rural.education.enums.MessageType;
import com.rural.education.enums.UserRole;
import com.rural.education.exception.BusinessException;
import com.rural.education.model.entity.ChatMessage;
import com.rural.education.model.entity.ChatParticipant;
import com.rural.education.model.entity.MatchPair;
import com.rural.education.model.entity.StudentProfile;
import com.rural.education.model.mapper.ChatMessageMapper;
import com.rural.education.model.mapper.ChatParticipantMapper;
import com.rural.education.model.mapper.MatchPairMapper;
import com.rural.education.model.mapper.StudentProfileMapper;
import com.rural.education.service.ChatService;
import com.rural.education.service.UserAccessService;
import com.rural.education.vo.ChatMessageVO;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class ChatServiceImpl extends ServiceImpl<ChatMessageMapper, ChatMessage> implements ChatService {
    private final ChatMessageMapper chatMessageMapper;
    private final ChatParticipantMapper chatParticipantMapper;
    private final MatchPairMapper matchPairMapper;
    private final StudentProfileMapper studentProfileMapper;
    private final UserAccessService userAccessService;

    @Override
    @Transactional(rollbackFor = Exception.class)
    public ChatMessageVO sendMessage(Long userId, SendMessageRequest request) {
        userAccessService.requireUser(userId);
        MatchPair pair = matchPairMapper.selectById(request.getMatchPairId());
        if (pair == null) {
            throw new BusinessException("结对不存在");
        }
        ChatParticipant participant = chatParticipantMapper.selectOne(
                new LambdaQueryWrapper<ChatParticipant>()
                        .eq(ChatParticipant::getMatchPairId, request.getMatchPairId())
                        .eq(ChatParticipant::getUserId, userId)
                        .isNull(ChatParticipant::getLeftTime)
        );
        if (participant == null) {
            throw new BusinessException("您不是该会话的参与者或已退出会话");
        }
        String type = request.getMessageType().toUpperCase();
        if (!"TEXT".equals(type) && !"IMAGE".equals(type) && !"VOICE".equals(type)) {
            throw new BusinessException("不支持的消息类型");
        }
        ChatMessage message = new ChatMessage();
        message.setMatchPairId(request.getMatchPairId());
        message.setSenderId(userId);
        message.setMessageType(MessageType.valueOf(type).getCode());
        message.setContent(request.getContent());
        message.setSendTime(LocalDateTime.now());
        chatMessageMapper.insert(message);

        ChatMessageVO vo = new ChatMessageVO();
        vo.setId(message.getId());
        vo.setMatchPairId(message.getMatchPairId());
        vo.setSenderId(message.getSenderId());
        vo.setMessageType(message.getMessageType());
        vo.setContent(message.getContent());
        vo.setSendTime(message.getSendTime());
        return vo;
    }

    @Override
    public List<ChatMessageVO> getMessages(Long userId, Long matchPairId, Long lastMessageId, Integer limit) {
        userAccessService.requireUser(userId);
        ChatParticipant participant = chatParticipantMapper.selectOne(
                new LambdaQueryWrapper<ChatParticipant>()
                        .eq(ChatParticipant::getMatchPairId, matchPairId)
                        .eq(ChatParticipant::getUserId, userId)
                        .isNull(ChatParticipant::getLeftTime)
        );
        if (participant == null) {
            throw new BusinessException("您不是该会话的参与者或已退出会话");
        }
        int size = limit == null || limit <= 0 ? 50 : Math.min(limit, 200);
        LambdaQueryWrapper<ChatMessage> wrapper = new LambdaQueryWrapper<ChatMessage>()
                .eq(ChatMessage::getMatchPairId, matchPairId)
                .orderByDesc(ChatMessage::getId);
        if (lastMessageId != null) {
            wrapper.lt(ChatMessage::getId, lastMessageId);
        }
        wrapper.last("LIMIT " + size);
        return chatMessageMapper.selectList(wrapper).stream()
                .map(m -> {
                    ChatMessageVO vo = new ChatMessageVO();
                    vo.setId(m.getId());
                    vo.setMatchPairId(m.getMatchPairId());
                    vo.setSenderId(m.getSenderId());
                    vo.setMessageType(m.getMessageType());
                    vo.setContent(m.getContent());
                    vo.setSendTime(m.getSendTime());
                    vo.setReadTime(m.getReadTime());
                    return vo;
                })
                .toList();
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void markRead(Long userId, Long messageId) {
        userAccessService.requireUser(userId);
        ChatMessage message = chatMessageMapper.selectById(messageId);
        if (message == null) {
            throw new BusinessException("消息不存在");
        }
        if (message.getSenderId().equals(userId)) {
            throw new BusinessException("不能标记自己发送的消息");
        }
        ChatParticipant participant = chatParticipantMapper.selectOne(
                new LambdaQueryWrapper<ChatParticipant>()
                        .eq(ChatParticipant::getMatchPairId, message.getMatchPairId())
                        .eq(ChatParticipant::getUserId, userId)
                        .isNull(ChatParticipant::getLeftTime)
        );
        if (participant == null) {
            throw new BusinessException("您不是该会话的参与者");
        }
        if (message.getReadTime() == null) {
            message.setReadTime(LocalDateTime.now());
            chatMessageMapper.updateById(message);
        }
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void addParticipant(Long adminUserId, Long pairId, Long targetUserId) {
        userAccessService.requireL2WithPermission(adminUserId, "student_manage");
        MatchPair pair = matchPairMapper.selectById(pairId);
        if (pair == null) {
            throw new BusinessException("结对不存在");
        }
        StudentProfile studentProfile = studentProfileMapper.selectOne(
                new LambdaQueryWrapper<StudentProfile>().eq(StudentProfile::getUserId, pair.getStudentId())
        );
        if (studentProfile == null) {
            throw new BusinessException("学生资料不存在");
        }
        StudentProfile adminProfile = studentProfileMapper.selectOne(
                new LambdaQueryWrapper<StudentProfile>().eq(StudentProfile::getUserId, adminUserId)
        );
        Long adminSchoolId = null;
        if (adminProfile != null) {
            adminSchoolId = adminProfile.getSchoolId();
        }
        if (adminSchoolId == null || !adminSchoolId.equals(studentProfile.getSchoolId())) {
            throw new BusinessException("仅同校二级管理员可加入会话");
        }
        Long existed = chatParticipantMapper.selectCount(
                new LambdaQueryWrapper<ChatParticipant>()
                        .eq(ChatParticipant::getMatchPairId, pairId)
                        .eq(ChatParticipant::getUserId, targetUserId)
                        .isNull(ChatParticipant::getLeftTime)
        );
        if (existed > 0) {
            throw new BusinessException("该用户已在会话中");
        }
        ChatParticipant participant = new ChatParticipant();
        participant.setMatchPairId(pairId);
        participant.setUserId(targetUserId);
        participant.setParticipantRole(UserRole.L2_ADMIN.getCode());
        participant.setIsDefaultMember(0);
        participant.setJoinedTime(LocalDateTime.now());
        chatParticipantMapper.insert(participant);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void removeParticipant(Long adminUserId, Long pairId, Long targetUserId) {
        userAccessService.requireL2WithPermission(adminUserId, "student_manage");
        ChatParticipant participant = chatParticipantMapper.selectOne(
                new LambdaQueryWrapper<ChatParticipant>()
                        .eq(ChatParticipant::getMatchPairId, pairId)
                        .eq(ChatParticipant::getUserId, targetUserId)
                        .isNull(ChatParticipant::getLeftTime)
        );
        if (participant == null) {
            throw new BusinessException("该参与者不在会话中");
        }
        if (Integer.valueOf(1).equals(participant.getIsDefaultMember())) {
            throw new BusinessException("默认成员不能退出会话");
        }
        participant.setLeftTime(LocalDateTime.now());
        chatParticipantMapper.updateById(participant);
    }

    @Override
    public List<ChatParticipant> getParticipants(Long userId, Long pairId) {
        userAccessService.requireUser(userId);
        MatchPair pair = matchPairMapper.selectById(pairId);
        if (pair == null) {
            throw new BusinessException("结对不存在");
        }
        boolean isMember = userId.equals(pair.getStudentId()) || userId.equals(pair.getTeacherId());
        boolean isChatMember = chatParticipantMapper.selectCount(
                new LambdaQueryWrapper<ChatParticipant>()
                        .eq(ChatParticipant::getMatchPairId, pairId)
                        .eq(ChatParticipant::getUserId, userId)
                        .isNull(ChatParticipant::getLeftTime)
        ) > 0;
        if (!isMember && !isChatMember) {
            throw new BusinessException("无权查看会话参与者");
        }
        return chatParticipantMapper.selectList(
                new LambdaQueryWrapper<ChatParticipant>()
                        .eq(ChatParticipant::getMatchPairId, pairId)
                        .isNull(ChatParticipant::getLeftTime)
        );
    }
}
