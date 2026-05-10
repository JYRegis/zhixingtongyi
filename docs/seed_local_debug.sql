-- ============================================================================
-- 知行同驿 - 本地联调种子数据
-- 数据库: aid_education_platform
--
-- 使用方式:
--   1. 先执行后端设计库表脚本 init.sql，确保表结构已创建。
--   2. 再在 MySQL 客户端执行本文件：
--      SOURCE d:/homework/WeChatProjects/zhixingtongyi/docs/seed_local_debug.sql;
--
-- 说明:
--   - 本脚本使用 9001~9012 号段主键，尽量避免与已有业务数据冲突。
--   - 再次执行前会清理同一批 seed 主键数据，便于本地重复调试。
--   - 手机号登录可直接使用下方 user.phone，当前后端 phone-login 不校验 password。
-- ============================================================================

USE `aid_education_platform`;
SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- --------------------------------------------------------------------------
-- 0) 清理本脚本创建的数据（按子表到父表顺序）
-- --------------------------------------------------------------------------
DELETE FROM `volunteer_record` WHERE `id` BETWEEN 9001 AND 9010;
DELETE FROM `message_notification` WHERE `id` BETWEEN 9001 AND 9010;
DELETE FROM `chat_message` WHERE `id` BETWEEN 9001 AND 9010;
DELETE FROM `chat_participant` WHERE `id` BETWEEN 9001 AND 9020;
DELETE FROM `meeting` WHERE `id` BETWEEN 9001 AND 9010;
DELETE FROM `match_pair` WHERE `id` BETWEEN 9001 AND 9010;
DELETE FROM `student_profile` WHERE `id` BETWEEN 9001 AND 9010;
DELETE FROM `teacher_profile` WHERE `id` BETWEEN 9001 AND 9010;
DELETE FROM `admin_profile` WHERE `id` BETWEEN 9001 AND 9010;
DELETE FROM `school` WHERE `id` BETWEEN 9001 AND 9010;
DELETE FROM `user` WHERE `id` BETWEEN 9001 AND 9010;
DELETE FROM `algorithm_weight_config` WHERE `factor_name` = 'local_debug_factor';

-- --------------------------------------------------------------------------
-- 1) 学校
-- --------------------------------------------------------------------------
INSERT INTO `school` (`id`, `name`, `region_code`, `address`, `contact_person`, `contact_phone`) VALUES
(9001, '本地调试-云龙县第一中学', '532929', '云南省大理州云龙县本地调试地址', '本地赵老师', '08725529001'),
(9002, '本地调试-昆明志愿者学校', '530100', '云南省昆明市本地调试地址', '本地李老师', '08716559002');

-- --------------------------------------------------------------------------
-- 2) 用户
-- role: 0 一级管理员, 1 二级管理员, 2 教师/志愿者, 3 学员
-- password 为 BCrypt(Test123456)，手机号登录场景通常不校验该字段。
-- --------------------------------------------------------------------------
INSERT INTO `user` (`id`, `username`, `password`, `role`, `phone`, `wechat_openid`, `avatar`, `status`) VALUES
(9001, 'local_l1_admin', '$2b$10$Ijd2tXn77kVkIq/7v47qeu6E7enDy5UMQSUCYP4GGvPqnDZfWsMOy', 0, '13900009001', 'wx_local_l1_9001', 'https://example.com/avatar/local-l1.png', 1),
(9002, 'local_l2_admin', '$2b$10$Ijd2tXn77kVkIq/7v47qeu6E7enDy5UMQSUCYP4GGvPqnDZfWsMOy', 1, '13900009002', 'wx_local_l2_9002', 'https://example.com/avatar/local-l2.png', 1),
(9003, 'local_teacher_passed', '$2b$10$Ijd2tXn77kVkIq/7v47qeu6E7enDy5UMQSUCYP4GGvPqnDZfWsMOy', 2, '13900009003', 'wx_local_teacher_9003', 'https://example.com/avatar/local-t1.png', 1),
(9004, 'local_student_passed', '$2b$10$Ijd2tXn77kVkIq/7v47qeu6E7enDy5UMQSUCYP4GGvPqnDZfWsMOy', 3, '13900009004', 'wx_local_student_9004', 'https://example.com/avatar/local-s1.png', 1),
(9005, 'local_teacher_pending', '$2b$10$Ijd2tXn77kVkIq/7v47qeu6E7enDy5UMQSUCYP4GGvPqnDZfWsMOy', 2, '13900009005', 'wx_local_teacher_9005', 'https://example.com/avatar/local-t2.png', 1),
(9006, 'local_student_pending', '$2b$10$Ijd2tXn77kVkIq/7v47qeu6E7enDy5UMQSUCYP4GGvPqnDZfWsMOy', 3, '13900009006', 'wx_local_student_9006', 'https://example.com/avatar/local-s2.png', 1),
(9007, 'local_student_rejected', '$2b$10$Ijd2tXn77kVkIq/7v47qeu6E7enDy5UMQSUCYP4GGvPqnDZfWsMOy', 3, '13900009007', 'wx_local_student_9007', 'https://example.com/avatar/local-s3.png', 1),
(9008, 'local_disabled_user', '$2b$10$Ijd2tXn77kVkIq/7v47qeu6E7enDy5UMQSUCYP4GGvPqnDZfWsMOy', 3, '13900009008', 'wx_local_student_9008', 'https://example.com/avatar/local-disabled.png', 0);

-- --------------------------------------------------------------------------
-- 3) 管理员资料
-- permissions 为 JSON 数组，便于二级管理员权限联调。
-- --------------------------------------------------------------------------
INSERT INTO `admin_profile` (`id`, `user_id`, `real_name`, `school_id`, `region_code`, `permissions`) VALUES
(9001, 9001, '本地一级管理员', NULL, '53', '["*"]'),
(9002, 9002, '本地二级管理员', 9001, '532929', '["student_manage", "teacher_audit", "pair_manage", "volunteer_record_audit"]');

-- --------------------------------------------------------------------------
-- 4) 志愿者资料
-- certification_status: 0 待审核, 1 通过, 2 拒绝
-- --------------------------------------------------------------------------
INSERT INTO `teacher_profile` (
  `id`, `user_id`, `real_name`, `school`, `grade`, `free_time`, `skilled_subjects`,
  `personal_skills`, `personality_desc`, `total_service_duration`, `certification_status`, `audit_time`, `audit_notes`, `continuous_match`
) VALUES
(9001, 9003, '本地志愿者张同学', '厦门大学', '本科大三', '["mon_19_21", "wed_19_21", "sat_9_12"]', '["数学", "英语"]', '擅长数学建模和英语口语', '耐心细致，适合基础薄弱学生', 120, 1, '2026-05-01 10:00:00', '本地种子：志愿者审核通过', 1),
(9002, 9005, '本地待审志愿者李同学', '云南大学', '本科大二', '["sun_10_12"]', '["语文"]', '表达能力强', '活泼外向，擅长引导讨论', 0, 0, NULL, NULL, 1);

-- --------------------------------------------------------------------------
-- 5) 学生资料
-- profile_status: 0 草稿, 1 可配对
-- audit_status: 0 待审核, 1 通过, 2 拒绝
-- bind_admin_id 为二级管理员 user.id。
-- --------------------------------------------------------------------------
INSERT INTO `student_profile` (
  `id`, `user_id`, `real_name`, `school_id`, `grade`, `emergency_weight`, `subjects_needed`, `free_time`,
  `profile_status`, `personality_desc`, `bind_admin_id`, `audit_status`, `audit_time`, `audit_notes`
) VALUES
(9001, 9004, '本地学员小明', 9001, '初三', 3, '["数学", "英语"]', '["weekday_19_21", "sat_9_12"]', 1, '较内向，需要鼓励式教学', 9002, 1, '2026-05-01 10:30:00', '本地种子：学生审核通过'),
(9002, 9006, '本地待审学员小红', 9001, '初二', 2, '["语文"]', '["weekend_morning"]', 0, '活泼，阅读理解薄弱', 9002, 0, NULL, NULL),
(9003, 9007, '本地驳回学员小周', 9001, '初一', 1, '["英语"]', '["sun_14_16"]', 0, '资料待补充', 9002, 2, '2026-05-01 11:00:00', '监护人信息不完整');

-- --------------------------------------------------------------------------
-- 6) 匹配结对
-- match_status: 0 已申请, 1 已接受, 2 已拒绝, 3 解绑确认中, 4 已解绑, 5 已禁用
-- --------------------------------------------------------------------------
INSERT INTO `match_pair` (
  `id`, `student_id`, `teacher_id`, `match_status`, `apply_time`, `accept_time`,
  `unbind_request_by`, `unbind_request_time`, `student_unbind_confirm`, `teacher_unbind_confirm`, `admin_unbind_confirm`, `unbind_admin_id`
) VALUES
(9001, 9004, 9003, 1, '2026-05-01 19:00:00', '2026-05-01 20:00:00', NULL, NULL, 0, 0, 0, NULL),
(9002, 9006, 9005, 0, '2026-05-02 09:30:00', NULL, NULL, NULL, 0, 0, 0, NULL),
(9003, 9007, 9003, 3, '2026-04-25 15:00:00', '2026-04-25 16:00:00', 9003, '2026-05-02 10:00:00', 1, 1, 0, 9002);

-- --------------------------------------------------------------------------
-- 7) 会议
-- status: 0 未开始, 1 进行中, 2 已结束, 3 已取消
-- --------------------------------------------------------------------------
INSERT INTO `meeting` (
  `id`, `match_pair_id`, `topic`, `start_time`, `end_time`, `meeting_link`, `created_by`, `status`, `record_url`
) VALUES
(9001, 9001, '本地调试-一次函数专题辅导', '2026-05-01 20:00:00', '2026-05-01 21:00:00', 'https://meeting.tencent.com/local-debug-9001', 9003, 2, 'https://example.com/record/local-debug-9001.mp4'),
(9002, 9001, '本地调试-英语阅读陪伴', '2026-05-03 19:30:00', '2026-05-03 20:30:00', 'https://meeting.tencent.com/local-debug-9002', 9003, 0, NULL);

-- --------------------------------------------------------------------------
-- 8) 聊天参与者（必须早于 chat_message）
-- participant_role: 1 二级管理员, 2 志愿者, 3 学生
-- --------------------------------------------------------------------------
INSERT INTO `chat_participant` (`id`, `match_pair_id`, `user_id`, `participant_role`, `is_default_member`, `joined_time`, `left_time`) VALUES
(9001, 9001, 9002, 1, 1, '2026-05-01 20:00:00', NULL),
(9002, 9001, 9003, 2, 0, '2026-05-01 20:00:00', NULL),
(9003, 9001, 9004, 3, 0, '2026-05-01 20:00:00', NULL),
(9004, 9002, 9002, 1, 1, '2026-05-02 09:30:00', NULL),
(9005, 9002, 9005, 2, 0, '2026-05-02 09:30:00', NULL),
(9006, 9002, 9006, 3, 0, '2026-05-02 09:30:00', NULL),
(9007, 9003, 9002, 1, 1, '2026-04-25 16:00:00', NULL),
(9008, 9003, 9003, 2, 0, '2026-04-25 16:00:00', NULL),
(9009, 9003, 9007, 3, 0, '2026-04-25 16:00:00', NULL);

-- --------------------------------------------------------------------------
-- 9) 聊天消息
-- message_type: 0 文本, 1 图片, 2 语音
-- --------------------------------------------------------------------------
INSERT INTO `chat_message` (`id`, `match_pair_id`, `sender_id`, `message_type`, `content`, `send_time`, `read_time`) VALUES
(9001, 9001, 9004, 0, '老师好，我想复习一次函数。', '2026-05-01 20:05:00', '2026-05-01 20:06:00'),
(9002, 9001, 9003, 0, '好的，我们先从图像和斜率开始。', '2026-05-01 20:06:00', '2026-05-01 20:06:30'),
(9003, 9001, 9002, 0, '双方注意保护隐私，课程结束后请及时提交时长记录。', '2026-05-01 20:10:00', NULL),
(9004, 9001, 9003, 1, 'https://example.com/chat/local-debug-image.png', '2026-05-01 20:20:00', NULL);

-- --------------------------------------------------------------------------
-- 10) 消息通知
-- type: 0 结对申请, 1 结对接受, 5 会议提醒, 6 时长确认提醒, 8 时长审核结果
-- --------------------------------------------------------------------------
INSERT INTO `message_notification` (`id`, `user_id`, `type`, `title`, `content`, `params`, `sent_time`, `read_time`, `wechat_sent`, `wechat_msg_id`) VALUES
(9001, 9003, 0, '本地调试-新的结对申请', '学员 本地学员小明 向您发起了结对申请', '{"pairId":9001}', '2026-05-01 19:00:00', '2026-05-01 19:10:00', 0, NULL),
(9002, 9004, 1, '本地调试-结对已通过', '志愿者 本地志愿者张同学 已接受您的结对', '{"pairId":9001}', '2026-05-01 20:00:00', NULL, 0, NULL),
(9003, 9004, 5, '本地调试-会议提醒', '今晚 20:00 有「一次函数专题辅导」', '{"meetingId":9001}', '2026-05-01 18:00:00', NULL, 0, NULL),
(9004, 9004, 6, '本地调试-待确认服务时长', '志愿者提交了 60 分钟服务记录，请确认真实性', '{"recordId":9001}', '2026-05-02 09:05:00', NULL, 0, NULL),
(9005, 9003, 8, '本地调试-时长审核通过', '您的 60 分钟志愿服务时长已通过审核', '{"recordId":9002}', '2026-05-02 11:00:00', NULL, 0, NULL);

-- --------------------------------------------------------------------------
-- 11) 算法配置演示项
-- --------------------------------------------------------------------------
INSERT INTO `algorithm_weight_config` (`factor_name`, `weight`, `description`, `enabled`) VALUES
('local_debug_factor', 0.00, '本地调试种子数据标记项，可忽略', 0);

-- --------------------------------------------------------------------------
-- 12) 志愿服务时长记录
-- status: 0 待学生确认, 1 待管理员审核, 2 审核通过, 3 审核拒绝, 4 学生拒绝
-- --------------------------------------------------------------------------
INSERT INTO `volunteer_record` (
  `id`, `match_pair_id`, `teacher_id`, `student_id`, `meeting_id`, `duration`, `meeting_date`,
  `service_desc`, `evidence_images`, `ai_summary`, `status`, `reject_reason`,
  `student_confirm_time`, `admin_audit_time`, `auditor_id`
) VALUES
(9001, 9001, 9003, 9004, 9001, 60, '2026-05-01', '本节课复习一次函数图像、斜率和简单应用题。', '["https://example.com/evidence/local-9001-1.png", "https://example.com/evidence/local-9001-2.png"]', '学生能够理解一次函数图像含义，后续需要加强综合题训练。', 0, NULL, NULL, NULL, NULL),
(9002, 9001, 9003, 9004, 9001, 60, '2026-04-28', '讲解英语阅读中的关键词定位与长难句拆分。', '["https://example.com/evidence/local-9002-1.png"]', '本次课程主要训练阅读理解技巧，学生参与度较高。', 2, NULL, '2026-04-29 09:00:00', '2026-04-29 10:00:00', 9002),
(9003, 9001, 9003, 9004, NULL, 45, '2026-04-20', '课后答疑与作业订正。', NULL, NULL, 3, '服务描述过于简单，请补充凭证后重新提交', '2026-04-20 22:00:00', '2026-04-21 09:00:00', 9002);

SET FOREIGN_KEY_CHECKS = 1;

-- --------------------------------------------------------------------------
-- 13) 本地调试账号速查
-- --------------------------------------------------------------------------
-- 一级管理员: 13900009001 / user.id=9001
-- 二级管理员: 13900009002 / user.id=9002
-- 已审核志愿者: 13900009003 / user.id=9003
-- 已审核学员: 13900009004 / user.id=9004
-- 待审志愿者: 13900009005 / user.id=9005
-- 待审学员: 13900009006 / user.id=9006
-- 驳回学员: 13900009007 / user.id=9007
-- 禁用用户: 13900009008 / user.id=9008
