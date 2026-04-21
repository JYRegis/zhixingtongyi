-- --------------------------------------------------------
-- 智慧云支教平台 (Rural Education Platform) 数据库初始化脚本
-- 适配 MySQL 8.0+
-- 字符集: utf8mb4 (支持Emoji，防乱码)
-- --------------------------------------------------------

-- 1. 创建数据库（如果不存在）并指定字符集
CREATE DATABASE IF NOT EXISTS `aid_education_platform` 
DEFAULT CHARACTER SET utf8mb4 
COLLATE utf8mb4_0900_ai_ci;

-- 2. 切换到该数据库
USE `aid_education_platform`;

-- 3. 环境设置
SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0; -- 关闭外键检查，防止因建表顺序导致报错

-- ----------------------------
-- 1. 用户表 (user)
-- ----------------------------
DROP TABLE IF EXISTS `user`;
CREATE TABLE `user` (
  `id` bigint NOT NULL AUTO_INCREMENT COMMENT '主键',
  `username` varchar(64) NOT NULL COMMENT '用户名（可用于登录）',
  `password` varchar(255) NOT NULL COMMENT '加密后的密码',
  `role` tinyint NOT NULL COMMENT '角色：0-一级管理员，1-二级管理员，2-教师（志愿者），3-学员',
  `phone` varchar(20) DEFAULT NULL COMMENT '手机号',
  `wechat_openid` varchar(128) DEFAULT NULL COMMENT '微信OpenID',
  `avatar` varchar(512) DEFAULT NULL COMMENT '头像URL',
  `status` tinyint NOT NULL DEFAULT '1' COMMENT '状态：0-禁用，1-启用',
  `create_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_username` (`username`),
  UNIQUE KEY `uk_phone` (`phone`),
  UNIQUE KEY `uk_wechat_openid` (`wechat_openid`),
  KEY `idx_role_status` (`role`,`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='用户基础信息表';

-- ----------------------------
-- 2. 学校表 (school)
-- ----------------------------
DROP TABLE IF EXISTS `school`;
CREATE TABLE `school` (
  `id` bigint NOT NULL AUTO_INCREMENT COMMENT '主键',
  `name` varchar(128) NOT NULL COMMENT '学校名称',
  `region_code` varchar(32) NOT NULL COMMENT '区域编码',
  `address` varchar(512) DEFAULT NULL COMMENT '详细地址',
  `contact_person` varchar(64) DEFAULT NULL COMMENT '联系人',
  `contact_phone` varchar(20) DEFAULT NULL COMMENT '联系电话',
  `create_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  KEY `idx_region_code` (`region_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='学校及区域信息表';

-- ----------------------------
-- 3. 管理员信息表 (admin_profile)
-- ----------------------------
DROP TABLE IF EXISTS `admin_profile`;
CREATE TABLE `admin_profile` (
  `id` bigint NOT NULL AUTO_INCREMENT COMMENT '主键',
  `user_id` bigint NOT NULL COMMENT '关联用户ID',
  `real_name` varchar(64) NOT NULL COMMENT '真实姓名',
  `school_id` bigint DEFAULT NULL COMMENT '管理的学校ID（二级管理员必填）',
  `region_code` varchar(32) DEFAULT NULL COMMENT '管理区域编码（可多级）',
  `permissions` json DEFAULT NULL COMMENT '权限配置（JSON数组）',
  `create_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_user_id` (`user_id`),
  KEY `idx_school_id` (`school_id`),
  KEY `idx_region_code` (`region_code`),
  CONSTRAINT `fk_admin_user_id` FOREIGN KEY (`user_id`) REFERENCES `user` (`id`),
  CONSTRAINT `fk_admin_school_id` FOREIGN KEY (`school_id`) REFERENCES `school` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='管理员信息表';

-- ----------------------------
-- 4. 志愿者信息表 (teacher_profile)
-- ----------------------------
DROP TABLE IF EXISTS `teacher_profile`;
CREATE TABLE `teacher_profile` (
  `id` bigint NOT NULL AUTO_INCREMENT COMMENT '主键',
  `user_id` bigint NOT NULL COMMENT '关联用户ID',
  `real_name` varchar(64) NOT NULL COMMENT '真实姓名',
  `school` varchar(128) NOT NULL COMMENT '所在学校（志愿者所属学校）',
  `grade` varchar(32) DEFAULT NULL COMMENT '年级（大学生/高中生）',
  `free_time` json NOT NULL COMMENT '空闲时间段（JSON数组）',
  `skilled_subjects` json NOT NULL COMMENT '擅长科目（JSON数组）',
  `personal_skills` text COMMENT '个人特长',
  `personality_desc` text COMMENT '性格自我描述',
  `total_service_duration` int NOT NULL DEFAULT '0' COMMENT '累计志愿服务时长（分钟）',
  `certification_status` tinyint NOT NULL DEFAULT '0' COMMENT '审核状态：0-待审核，1-审核通过，2-审核拒绝',
  `audit_time` datetime DEFAULT NULL COMMENT '审核时间',
  `audit_notes` varchar(512) DEFAULT NULL COMMENT '审核备注',
  `continuous_match` tinyint(1) NOT NULL DEFAULT '1' COMMENT '是否持续接受匹配（1-是，0-否）',
  `create_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_user_id` (`user_id`),
  KEY `idx_certification_status` (`certification_status`),
  CONSTRAINT `fk_teacher_user_id` FOREIGN KEY (`user_id`) REFERENCES `user` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='志愿者（教师）信息表';

-- ----------------------------
-- 5. 学生信息表 (student_profile)
-- ----------------------------
DROP TABLE IF EXISTS `student_profile`;
CREATE TABLE `student_profile` (
  `id` bigint NOT NULL AUTO_INCREMENT COMMENT '主键',
  `user_id` bigint NOT NULL COMMENT '关联用户ID',
  `real_name` varchar(64) NOT NULL COMMENT '真实姓名',
  `school_id` bigint NOT NULL COMMENT '所在学校ID',
  `grade` varchar(32) NOT NULL COMMENT '年级（如：初三）',
  `emergency_weight` int NOT NULL DEFAULT '0' COMMENT '需求紧急程度权重（系统计算）',
  `subjects_needed` json NOT NULL COMMENT '需要辅导的科目（JSON数组）',
  `free_time` json NOT NULL COMMENT '可上课时间段（JSON数组）',
  `personality_desc` text COMMENT '性格描述',
  `bind_admin_id` bigint DEFAULT NULL COMMENT '绑定的二级管理员用户ID（老师代管）',
  `independent` tinyint(1) NOT NULL DEFAULT '1' COMMENT '是否独立操作（1-是，0-否）',
  `create_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_user_id` (`user_id`),
  KEY `idx_school_id` (`school_id`),
  KEY `idx_bind_admin_id` (`bind_admin_id`),
  KEY `idx_emergency_weight` (`emergency_weight`),
  CONSTRAINT `fk_student_user_id` FOREIGN KEY (`user_id`) REFERENCES `user` (`id`),
  CONSTRAINT `fk_student_school_id` FOREIGN KEY (`school_id`) REFERENCES `school` (`id`),
  CONSTRAINT `fk_student_bind_admin_id` FOREIGN KEY (`bind_admin_id`) REFERENCES `user` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='学员（学生）信息表';

-- ----------------------------
-- 6. 匹配结对表 (match_pair)
-- ----------------------------
DROP TABLE IF EXISTS `match_pair`;
CREATE TABLE `match_pair` (
  `id` bigint NOT NULL AUTO_INCREMENT COMMENT '主键',
  `student_id` bigint NOT NULL COMMENT '学员用户ID',
  `teacher_id` bigint NOT NULL COMMENT '志愿者用户ID',
  `match_status` tinyint NOT NULL DEFAULT '0' COMMENT '匹配状态：0-已申请，1-已接受，2-已拒绝，3-解绑申请中，4-已解绑，5-已禁用',
  `apply_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '申请时间',
  `accept_time` datetime DEFAULT NULL COMMENT '接受时间',
  `reject_reason` varchar(512) DEFAULT NULL COMMENT '拒绝理由（志愿者填写）',
  `unbind_request_by` bigint DEFAULT NULL COMMENT '解绑发起方用户ID',
  `unbind_request_time` datetime DEFAULT NULL COMMENT '解绑申请时间',
  `unbind_accept_time` datetime DEFAULT NULL COMMENT '解绑同意时间',
  `create_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_student_teacher` (`student_id`,`teacher_id`),
  KEY `idx_match_status` (`match_status`),
  KEY `idx_teacher_status` (`teacher_id`,`match_status`),
  KEY `idx_student_status` (`student_id`,`match_status`),
  CONSTRAINT `fk_match_student_id` FOREIGN KEY (`student_id`) REFERENCES `user` (`id`),
  CONSTRAINT `fk_match_teacher_id` FOREIGN KEY (`teacher_id`) REFERENCES `user` (`id`),
  CONSTRAINT `fk_match_unbind_by` FOREIGN KEY (`unbind_request_by`) REFERENCES `user` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='学员与志愿者匹配结对表';

-- ----------------------------
-- 7. 消息通知表 (message_notification)
-- ----------------------------
DROP TABLE IF EXISTS `message_notification`;
CREATE TABLE `message_notification` (
  `id` bigint NOT NULL AUTO_INCREMENT COMMENT '主键',
  `user_id` bigint NOT NULL COMMENT '接收用户ID',
  `type` tinyint NOT NULL COMMENT '消息类型：0-结对申请，1-结对接受，2-结对拒绝，3-解绑申请，4-解绑接受，5-会议提醒，6-时长确认提醒，7-时长审核提醒，8-时长审核结果',
  `title` varchar(128) NOT NULL COMMENT '消息标题',
  `content` varchar(512) NOT NULL COMMENT '消息内容',
  `params` json DEFAULT NULL COMMENT '消息参数（JSON格式）',
  `sent_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '发送时间',
  `read_time` datetime DEFAULT NULL COMMENT '阅读时间',
  `wechat_sent` tinyint(1) NOT NULL DEFAULT '0' COMMENT '微信订阅消息是否已发送成功',
  `wechat_msg_id` varchar(128) DEFAULT NULL COMMENT '微信服务器返回的消息ID',
  PRIMARY KEY (`id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_type_sent` (`type`,`sent_time`),
  KEY `idx_wechat_sent` (`wechat_sent`),
  CONSTRAINT `fk_message_user_id` FOREIGN KEY (`user_id`) REFERENCES `user` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='消息与通知表';

-- ----------------------------
-- 8. 会议表 (meeting)
-- ----------------------------
DROP TABLE IF EXISTS `meeting`;
CREATE TABLE `meeting` (
  `id` bigint NOT NULL AUTO_INCREMENT COMMENT '主键',
  `match_pair_id` bigint NOT NULL COMMENT '关联的匹配结对ID',
  `topic` varchar(256) NOT NULL COMMENT '会议主题',
  `start_time` datetime NOT NULL COMMENT '会议开始时间',
  `end_time` datetime NOT NULL COMMENT '会议结束时间',
  `meeting_link` varchar(512) NOT NULL COMMENT '会议链接',
  `created_by` bigint NOT NULL COMMENT '创建人（管理员用户ID）',
  `status` tinyint NOT NULL DEFAULT '0' COMMENT '状态：0-未开始，1-进行中，2-已结束，3-已取消',
  `record_url` varchar(512) DEFAULT NULL COMMENT '录制文件URL',
  `create_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  KEY `idx_match_pair_id` (`match_pair_id`),
  KEY `idx_start_time` (`start_time`),
  KEY `idx_created_by` (`created_by`),
  CONSTRAINT `fk_meeting_match_pair` FOREIGN KEY (`match_pair_id`) REFERENCES `match_pair` (`id`),
  CONSTRAINT `fk_meeting_created_by` FOREIGN KEY (`created_by`) REFERENCES `user` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='视频会议信息表';

-- ----------------------------
-- 9. 聊天消息表 (chat_message)
-- ----------------------------
DROP TABLE IF EXISTS `chat_message`;
CREATE TABLE `chat_message` (
  `id` bigint NOT NULL AUTO_INCREMENT COMMENT '主键',
  `match_pair_id` bigint NOT NULL COMMENT '关联的匹配结对ID',
  `sender_id` bigint NOT NULL COMMENT '发送者用户ID',
  `message_type` tinyint NOT NULL COMMENT '消息类型：0-文本，1-图片，2-语音',
  `content` text NOT NULL COMMENT '消息内容（文本内容或文件URL）',
  `send_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '发送时间',
  `read_time` datetime DEFAULT NULL COMMENT '阅读时间',
  PRIMARY KEY (`id`),
  KEY `idx_match_pair_id` (`match_pair_id`),
  KEY `idx_sender_id` (`sender_id`),
  KEY `idx_send_time` (`send_time`),
  CONSTRAINT `fk_chat_match_pair` FOREIGN KEY (`match_pair_id`) REFERENCES `match_pair` (`id`),
  CONSTRAINT `fk_chat_sender_id` FOREIGN KEY (`sender_id`) REFERENCES `user` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='内置聊天消息表';

-- ----------------------------
-- 10. 算法权重配置表 (algorithm_weight_config)
-- ----------------------------
DROP TABLE IF EXISTS `algorithm_weight_config`;
CREATE TABLE `algorithm_weight_config` (
  `id` bigint NOT NULL AUTO_INCREMENT COMMENT '主键',
  `factor_name` varchar(64) NOT NULL COMMENT '因素名称（如：grade_urgency, subject_match等）',
  `weight` decimal(5,2) NOT NULL COMMENT '权重值（0-1之间）',
  `description` varchar(256) DEFAULT NULL COMMENT '因素描述',
  `enabled` tinyint(1) NOT NULL DEFAULT '1' COMMENT '是否启用',
  `create_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_factor_name` (`factor_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='智能匹配算法权重配置表';

-- ----------------------------
-- 11. 志愿服务时长记录表 (volunteer_record)
-- ----------------------------
DROP TABLE IF EXISTS `volunteer_record`;
CREATE TABLE `volunteer_record` (
  `id` bigint NOT NULL AUTO_INCREMENT COMMENT '主键',
  `match_pair_id` bigint NOT NULL COMMENT '关联的匹配结对ID',
  `teacher_id` bigint NOT NULL COMMENT '教师（志愿者）用户ID',
  `student_id` bigint NOT NULL COMMENT '学员用户ID',
  `meeting_id` bigint DEFAULT NULL COMMENT '关联的内部会议ID（外部会议可为空）',
  `duration` int NOT NULL COMMENT '服务时长（单位：分钟）',
  `meeting_date` date NOT NULL COMMENT '服务日期',
  `ai_summary` text NOT NULL COMMENT 'AI生成的会议纪要/教学总结',
  `status` tinyint NOT NULL DEFAULT '0' COMMENT '状态：0-待学生确认，1-待管理员审核，2-审核通过，3-审核拒绝，4-学生拒绝',
  `reject_reason` varchar(512) DEFAULT NULL COMMENT '拒绝理由',
  `student_confirm_time` datetime DEFAULT NULL COMMENT '学生确认时间',
  `admin_audit_time` datetime DEFAULT NULL COMMENT '管理员审核时间',
  `auditor_id` bigint DEFAULT NULL COMMENT '审核的二级管理员ID',
  `create_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '提交时间',
  `update_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  KEY `idx_match_pair` (`match_pair_id`),
  KEY `idx_teacher_status` (`teacher_id`,`status`),
  KEY `idx_student_status` (`student_id`,`status`),
  KEY `idx_meeting_id` (`meeting_id`),
  KEY `idx_auditor_id` (`auditor_id`),
  CONSTRAINT `fk_record_match_pair` FOREIGN KEY (`match_pair_id`) REFERENCES `match_pair` (`id`),
  CONSTRAINT `fk_record_teacher_id` FOREIGN KEY (`teacher_id`) REFERENCES `user` (`id`),
  CONSTRAINT `fk_record_student_id` FOREIGN KEY (`student_id`) REFERENCES `user` (`id`),
  CONSTRAINT `fk_record_meeting_id` FOREIGN KEY (`meeting_id`) REFERENCES `meeting` (`id`),
  CONSTRAINT `fk_record_auditor_id` FOREIGN KEY (`auditor_id`) REFERENCES `user` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='志愿服务时长及纪要记录表';

-- --------------------------------------------------------
-- 4. 恢复外键检查并写入初始数据
-- --------------------------------------------------------
SET FOREIGN_KEY_CHECKS = 1;

-- 插入默认的匹配算法权重配置数据
INSERT INTO `algorithm_weight_config` (`factor_name`, `weight`, `description`) VALUES 
('subject_match', 0.40, '科目匹配度权重'),
('time_match', 0.30, '空闲时间匹配度权重'),
('emergency_weight', 0.20, '年级与客观需求紧急程度权重'),
('personality_match', 0.10, '性格描述文本相似度权重');