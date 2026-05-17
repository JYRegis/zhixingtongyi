package com.rural.education.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.rural.education.dto.request.chat.SendMessageRequest;
import com.rural.education.enums.MessageType;
import com.rural.education.enums.UserRole;
import com.rural.education.exception.BusinessException;
import com.rural.education.model.entity.AdminProfile;
import com.rural.education.model.entity.ChatMessage;
import com.rural.education.model.entity.ChatParticipant;
import com.rural.education.model.entity.MatchPair;
import com.rural.education.model.entity.User;
import com.rural.education.enums.MatchStatus;
import com.rural.education.model.entity.School;
import com.rural.education.model.entity.StudentProfile;
import com.rural.education.model.entity.TeacherProfile;
import com.rural.education.model.mapper.SchoolMapper;
import com.rural.education.model.mapper.TeacherProfileMapper;
import com.rural.education.vo.ChatConversationVO;
import com.rural.education.vo.ChatParticipantVO;
import com.rural.education.model.mapper.AdminProfileMapper;
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
    private final AdminProfileMapper adminProfileMapper;
    private final UserAccessService userAccessService;
    private final TeacherProfileMapper teacherProfileMapper;
    private final SchoolMapper schoolMapper;

    @Override
    @Transactional(rollbackFor = Exception.class)
    public ChatMessageVO sendMessage(Long userId, SendMessageRequest request) {
        User user = userAccessService.requireUser(userId);
        MatchPair pair = matchPairMapper.selectById(request.getMatchPairId());
        if (pair == null) {
            throw new BusinessException("结对不存在");
        }
        boolean isL1Admin = user.getRole() != null && Integer.valueOf(UserRole.L1_ADMIN.getCode()).equals(user.getRole());
        if (!isL1Admin) {
            ChatParticipant participant = chatParticipantMapper.selectOne(
                    new LambdaQueryWrapper<ChatParticipant>()
                            .eq(ChatParticipant::getMatchPairId, request.getMatchPairId())
                            .eq(ChatParticipant::getUserId, userId)
                            .isNull(ChatParticipant::getLeftTime)
            );
            if (participant == null) {
                throw new BusinessException("您不是该会话的参与者或已退出会话");
            }
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
        vo.setSenderName(resolveSenderName(userId));
        return vo;
    }

    @Override
    public List<ChatMessageVO> getMessages(Long userId, Long matchPairId, Long lastMessageId, Integer limit) {
        User user = userAccessService.requireUser(userId);
        boolean isL1Admin = user.getRole() != null && Integer.valueOf(UserRole.L1_ADMIN.getCode()).equals(user.getRole());
        if (!isL1Admin) {
            ChatParticipant participant = chatParticipantMapper.selectOne(
                    new LambdaQueryWrapper<ChatParticipant>()
                            .eq(ChatParticipant::getMatchPairId, matchPairId)
                            .eq(ChatParticipant::getUserId, userId)
                            .isNull(ChatParticipant::getLeftTime)
            );
            if (participant == null) {
                throw new BusinessException("您不是该会话的参与者或已退出会话");
            }
        }
        int size = limit == null || limit <= 0 ? 50 : Math.min(limit, 200);
        LambdaQueryWrapper<ChatMessage> wrapper = new LambdaQueryWrapper<ChatMessage>()
                .eq(ChatMessage::getMatchPairId, matchPairId)
                .orderByDesc(ChatMessage::getId);
        if (lastMessageId != null) {
            wrapper.lt(ChatMessage::getId, lastMessageId);
        }
        Page<ChatMessage> page = new Page<>(1, size);
        return chatMessageMapper.selectPage(page, wrapper).getRecords().stream()
                .map(m -> {
                    ChatMessageVO vo = new ChatMessageVO();
                    vo.setId(m.getId());
                    vo.setMatchPairId(m.getMatchPairId());
                    vo.setSenderId(m.getSenderId());
                    vo.setMessageType(m.getMessageType());
                    vo.setContent(m.getContent());
                    vo.setSendTime(m.getSendTime());
                    vo.setReadTime(m.getReadTime());
                    vo.setSenderName(resolveSenderName(m.getSenderId()));
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
        if (participant == null || !participant.getMatchPairId().equals(message.getMatchPairId())) {
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
        AdminProfile adminProfile = adminProfileMapper.selectOne(
                new LambdaQueryWrapper<AdminProfile>().eq(AdminProfile::getUserId, adminUserId)
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
    public List<ChatParticipantVO> getParticipants(Long userId, Long pairId) {
        User user = userAccessService.requireUser(userId);
        MatchPair pair = matchPairMapper.selectById(pairId);
        if (pair == null) {
            throw new BusinessException("结对不存在");
        }
        boolean isL1Admin = user.getRole() != null && Integer.valueOf(UserRole.L1_ADMIN.getCode()).equals(user.getRole());
        if (!isL1Admin) {
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
        }
        List<ChatParticipant> list = chatParticipantMapper.selectList(
                new LambdaQueryWrapper<ChatParticipant>()
                        .eq(ChatParticipant::getMatchPairId, pairId)
                        .isNull(ChatParticipant::getLeftTime)
        );
        return list.stream().map(p -> {
            ChatParticipantVO vo = new ChatParticipantVO();
            vo.setId(p.getId());
            vo.setMatchPairId(p.getMatchPairId());
            vo.setUserId(p.getUserId());
            vo.setParticipantRole(p.getParticipantRole());
            vo.setIsDefaultMember(p.getIsDefaultMember());
            vo.setJoinedTime(p.getJoinedTime());
            vo.setLeftTime(p.getLeftTime());
            vo.setRealName(resolveParticipantName(p.getUserId()));
            return vo;
        }).toList();
    }

    @Override
    public List<ChatConversationVO> listAdminConversations(Long userId) {
        User user = userAccessService.requireUser(userId);
        if (user.getRole() == null
                || (user.getRole() != UserRole.L1_ADMIN.getCode() && user.getRole() != UserRole.L2_ADMIN.getCode())) {
            throw new BusinessException("无权限操作");
        }
        LambdaQueryWrapper<MatchPair> wrapper = new LambdaQueryWrapper<MatchPair>()
                .eq(MatchPair::getMatchStatus, MatchStatus.ACCEPTED.getCode())
                .orderByDesc(MatchPair::getAcceptTime);
        if (Integer.valueOf(UserRole.L2_ADMIN.getCode()).equals(user.getRole())) {
            AdminProfile admin = adminProfileMapper.selectOne(
                    new LambdaQueryWrapper<AdminProfile>().eq(AdminProfile::getUserId, userId)
            );
            if (admin == null || admin.getSchoolId() == null) {
                return List.of();
            }
            List<Long> studentIds = studentProfileMapper.selectList(
                    new LambdaQueryWrapper<StudentProfile>()
                            .eq(StudentProfile::getSchoolId, admin.getSchoolId())
            ).stream().map(StudentProfile::getUserId).toList();
            if (studentIds.isEmpty()) {
                return List.of();
            }
            wrapper.in(MatchPair::getStudentId, studentIds);
        }
        return matchPairMapper.selectList(wrapper).stream().map(pair -> {
            ChatConversationVO vo = new ChatConversationVO();
            vo.setMatchPairId(pair.getId());
            vo.setStudentId(pair.getStudentId());
            vo.setTeacherId(pair.getTeacherId());
            StudentProfile sp = studentProfileMapper.selectOne(
                    new LambdaQueryWrapper<StudentProfile>().eq(StudentProfile::getUserId, pair.getStudentId())
            );
            if (sp != null) {
                vo.setStudentName(sp.getRealName());
                vo.setSchoolId(sp.getSchoolId());
                if (sp.getSchoolId() != null) {
                    School school = schoolMapper.selectById(sp.getSchoolId());
                    if (school != null) {
                        vo.setSchoolName(school.getName());
                    }
                }
            }
            TeacherProfile tp = teacherProfileMapper.selectOne(
                    new LambdaQueryWrapper<TeacherProfile>().eq(TeacherProfile::getUserId, pair.getTeacherId())
            );
            if (tp != null) {
                vo.setTeacherName(tp.getRealName());
            }
            ChatMessage last = chatMessageMapper.selectOne(
                    new LambdaQueryWrapper<ChatMessage>()
                            .eq(ChatMessage::getMatchPairId, pair.getId())
                            .orderByDesc(ChatMessage::getSendTime)
                            .last("LIMIT 1")
            );
            if (last != null) {
                vo.setLastMessage(last.getContent());
                vo.setLastMessageTime(last.getSendTime());
            }
            Long unread = chatMessageMapper.selectCount(
                    new LambdaQueryWrapper<ChatMessage>()
                            .eq(ChatMessage::getMatchPairId, pair.getId())
                            .ne(ChatMessage::getSenderId, userId)
                            .isNull(ChatMessage::getReadTime)
            );
            vo.setUnreadCount(unread == null ? 0 : unread.intValue());
            return vo;
        }).toList();
    }

    private String resolveSenderName(Long senderId) {
        StudentProfile sp = studentProfileMapper.selectOne(
                new LambdaQueryWrapper<StudentProfile>().eq(StudentProfile::getUserId, senderId));
        if (sp != null && sp.getRealName() != null) return sp.getRealName();

        TeacherProfile tp = teacherProfileMapper.selectOne(
                new LambdaQueryWrapper<TeacherProfile>().eq(TeacherProfile::getUserId, senderId));
        if (tp != null && tp.getRealName() != null) return tp.getRealName();

        AdminProfile ap = adminProfileMapper.selectOne(
                new LambdaQueryWrapper<AdminProfile>().eq(AdminProfile::getUserId, senderId));
        if (ap != null && ap.getRealName() != null) return ap.getRealName();

        return null;
    }

    private String resolveParticipantName(Long userId) {
        StudentProfile sp = studentProfileMapper.selectOne(
                new LambdaQueryWrapper<StudentProfile>().eq(StudentProfile::getUserId, userId));
        if (sp != null && sp.getRealName() != null) return sp.getRealName();

        TeacherProfile tp = teacherProfileMapper.selectOne(
                new LambdaQueryWrapper<TeacherProfile>().eq(TeacherProfile::getUserId, userId));
        if (tp != null && tp.getRealName() != null) return tp.getRealName();

        AdminProfile ap = adminProfileMapper.selectOne(
                new LambdaQueryWrapper<AdminProfile>().eq(AdminProfile::getUserId, userId));
        if (ap != null && ap.getRealName() != null) return ap.getRealName();

        return null;
    }
}
