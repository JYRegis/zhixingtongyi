-- ============================================================================
--  后端种子数据（非前端 Mock）
--  用户名统一以 db_ 开头，便于区分后端真实数据与前端本地 Mock
-- ----------------------------------------------------------------------------
--  使用前提：
--    1) 已执行 design/init.sql 建表
--    2) 数据库名 aid_education_platform，字符集 utf8mb4
--    3) 本脚本仅使用主键号段 9001~9099，可重复执行
--  说明：
--    - 手机号段 13900009001 ~ 13900009040
--    - user.password 统一为 BCrypt("Test123456")
--    - 后端手机号登录按 phone 查 user，不校验 password
-- ============================================================================

USE `aid_education_platform`;
SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ----------------------------------------------------------------------------
-- 0) 清理号段 9001~9099 以及可能由登录自动创建的同手机号记录
-- ----------------------------------------------------------------------------
DELETE FROM `volunteer_record`        WHERE `id` BETWEEN 9001 AND 9099;
DELETE FROM `chat_message`            WHERE `id` BETWEEN 9001 AND 9099;
DELETE FROM `chat_participant`        WHERE `id` BETWEEN 9001 AND 9099;
DELETE FROM `message_notification`    WHERE `id` BETWEEN 9001 AND 9099;
DELETE FROM `meeting`                 WHERE `id` BETWEEN 9001 AND 9099;
DELETE FROM `match_pair`              WHERE `id` BETWEEN 9001 AND 9099;
DELETE FROM `student_profile`         WHERE `id` BETWEEN 9001 AND 9099;
DELETE FROM `teacher_profile`         WHERE `id` BETWEEN 9001 AND 9099;
DELETE FROM `admin_profile`           WHERE `id` BETWEEN 9001 AND 9099;
DELETE FROM `student_profile`         WHERE `user_id` IN (SELECT `id` FROM `user` WHERE `phone` LIKE '139000090%');
DELETE FROM `teacher_profile`         WHERE `user_id` IN (SELECT `id` FROM `user` WHERE `phone` LIKE '139000090%');
DELETE FROM `admin_profile`           WHERE `user_id` IN (SELECT `id` FROM `user` WHERE `phone` LIKE '139000090%');
DELETE FROM `user`                    WHERE `id` BETWEEN 9001 AND 9099;
DELETE FROM `user`                    WHERE `phone` LIKE '139000090%';
DELETE FROM `school`                  WHERE `id` BETWEEN 9001 AND 9099;
DELETE FROM `algorithm_weight_config` WHERE `factor_name` IN ('db_debug_factor', 'db_debug_extra');

-- ----------------------------------------------------------------------------
-- 1) 学校（school）
-- ----------------------------------------------------------------------------
INSERT INTO `school` (`id`, `name`, `region_code`, `address`, `contact_person`, `contact_phone`, `type`) VALUES
(9001, '云龙县第一中学',       '532929', '云南省大理州云龙县诺邓镇',       '王校长', '0872-5500001', 0),
(9002, '巍山县民族中学',       '532927', '云南省大理州巍山县南诏镇',       '李校长', '0872-5500002', 0),
(9003, '大理州希望小学',       '532900', '云南省大理州大理市下关镇',       '赵校长', '0872-5500003', 0),
(9004, '同济大学',   '310104', '上海市杨浦区四平路1239号', '校团委', '021-65981111', 1),
(9005, '云南大学',   '530100', '云南省昆明市翠湖北路2号', '校团委', '0871-65031111', 1);

-- ----------------------------------------------------------------------------
-- 2) 用户（user）
--    用户名以 db_ 开头，明确标识为后端数据库数据
--    role: 0-L1, 1-L2, 2-志愿者, 3-学员
-- ----------------------------------------------------------------------------
INSERT INTO `user` (`id`, `username`, `password`, `role`, `phone`, `wechat_openid`, `avatar`, `status`, `create_time`, `update_time`) VALUES
-- 一级管理员
(9001, 'db_平台管理员_陈运营', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 0, '13900009001', 'wx_local_debug_9001', NULL, 1, '2026-04-01 08:00:00', '2026-05-01 08:00:00'),
-- 二级管理员
(9002, 'db_云龙管理员_王老师', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 1, '13900009002', 'wx_local_debug_9002', NULL, 1, '2026-04-01 08:00:00', '2026-05-01 08:00:00'),
(9003, 'db_巍山管理员_李老师', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 1, '13900009003', 'wx_local_debug_9003', NULL, 1, '2026-04-01 08:00:00', '2026-05-01 08:00:00'),
(9004, 'db_同济管理员_张老师', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 1, '13900009004', 'wx_local_debug_9004', NULL, 1, '2026-04-01 08:00:00', '2026-05-01 08:00:00'),
-- 志愿者 9010-9015
(9010, 'db_志愿者_张明远',     '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 2, '13900009010', 'wx_local_debug_9010', NULL, 1, '2026-03-15 08:00:00', '2026-05-01 08:00:00'),
(9011, 'db_志愿者_李文静',     '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 2, '13900009011', 'wx_local_debug_9011', NULL, 1, '2026-03-15 08:00:00', '2026-05-01 08:00:00'),
(9012, 'db_志愿者_赵新宇',     '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 2, '13900009012', 'wx_local_debug_9012', NULL, 1, '2026-04-25 08:00:00', '2026-05-01 08:00:00'),
(9013, 'db_志愿者_孙浩然',     '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 2, '13900009013', 'wx_local_debug_9013', NULL, 1, '2026-04-20 08:00:00', '2026-05-01 08:00:00'),
(9014, 'db_志愿者_周思远',     '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 2, '13900009014', 'wx_local_debug_9014', NULL, 1, '2025-09-01 08:00:00', '2026-05-01 08:00:00'),
(9015, 'db_志愿者_吴晓燕',     '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 2, '13900009015', 'wx_local_debug_9015', NULL, 1, '2026-04-28 08:00:00', '2026-05-01 08:00:00'),
-- 学员 9020-9030
(9020, 'db_学员_杨小明',       '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 3, '13900009020', 'wx_local_debug_9020', NULL, 1, '2026-03-15 08:00:00', '2026-05-01 08:00:00'),
(9021, 'db_学员_陈小红',       '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 3, '13900009021', 'wx_local_debug_9021', NULL, 1, '2026-04-01 08:00:00', '2026-05-01 08:00:00'),
(9022, 'db_学员_刘小波',       '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 3, '13900009022', 'wx_local_debug_9022', NULL, 1, '2026-04-26 08:00:00', '2026-05-01 08:00:00'),
(9023, 'db_学员_王小亮',       '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 3, '13900009023', 'wx_local_debug_9023', NULL, 1, '2026-04-15 08:00:00', '2026-05-01 08:00:00'),
(9024, 'db_学员_何小英',       '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 3, '13900009024', 'wx_local_debug_9024', NULL, 1, '2026-03-20 08:00:00', '2026-05-01 08:00:00'),
(9025, 'db_学员_林小梅',       '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 3, '13900009025', 'wx_local_debug_9025', NULL, 1, '2026-04-05 08:00:00', '2026-05-01 08:00:00'),
(9026, 'db_学员_马小峰',       '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 3, '13900009026', 'wx_local_debug_9026', NULL, 1, '2026-03-20 08:00:00', '2026-05-01 08:00:00'),
(9027, 'db_学员_黄小刚',       '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 3, '13900009027', 'wx_local_debug_9027', NULL, 1, '2026-02-15 08:00:00', '2026-05-01 08:00:00'),
(9028, 'db_学员_郑小晴',       '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 3, '13900009028', 'wx_local_debug_9028', NULL, 1, '2026-03-25 08:00:00', '2026-05-01 08:00:00'),
(9029, 'db_学员_吴小雨',       '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 3, '13900009029', 'wx_local_debug_9029', NULL, 1, '2026-04-22 08:00:00', '2026-05-01 08:00:00'),
(9030, 'db_学员_孙小路',       '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 3, '13900009030', 'wx_local_debug_9030', NULL, 1, '2026-04-28 08:00:00', '2026-05-01 08:00:00'),
-- 禁用用户
(9040, 'db_禁用账号_测试',     '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 3, '13900009040', 'wx_local_debug_9040', NULL, 0, '2026-04-01 08:00:00', '2026-05-01 08:00:00');

-- ----------------------------------------------------------------------------
-- 3) 管理员资料（admin_profile）
-- ----------------------------------------------------------------------------
INSERT INTO `admin_profile` (`id`, `user_id`, `real_name`, `school_id`, `region_code`, `permissions`) VALUES
(9001, 9001, '陈运营', NULL,  '530000', JSON_ARRAY('*')),
(9002, 9002, '王老师', 9001, '532929',
       JSON_ARRAY('user_manage','student_manage','pair_manage','volunteer_record_audit')),
(9003, 9003, '李老师', 9002, '532927',
       JSON_ARRAY('user_manage','student_manage','pair_manage','volunteer_record_audit')),
(9004, 9004, '张老师', 9004, '350200',
       JSON_ARRAY('user_manage','teacher_audit'));

-- ----------------------------------------------------------------------------
-- 4) 志愿者资料（teacher_profile）
-- ----------------------------------------------------------------------------
INSERT INTO `teacher_profile` (
  `id`, `user_id`, `real_name`, `school_id`, `grade`,
  `free_time`, `skilled_subjects`, `personal_skills`, `personality_desc`,
  `total_service_duration`, `certification_status`, `audit_time`, `audit_notes`,
  `continuous_match`, `create_time`, `update_time`
) VALUES
(9001, 9010, '张明远', 9004, '大三',
  JSON_ARRAY(JSON_OBJECT('week', 1, 'slot', 'night'), JSON_OBJECT('week', 3, 'slot', 'night'), JSON_OBJECT('week', 5, 'slot', 'night')),
  JSON_ARRAY('数学','物理'),
  '校级数学建模二等奖，擅长函数与电学。',
  '耐心细致，善于把抽象概念讲成具体例子。',
  720, 1, '2026-03-20 09:00:00', '资料完整，审核通过',
  1, '2026-03-15 08:00:00', '2026-05-01 08:00:00'),
(9002, 9011, '李文静', 9004, '研一',
  JSON_ARRAY(JSON_OBJECT('week', 6, 'slot', 'mor'), JSON_OBJECT('week', 7, 'slot', 'mor')),
  JSON_ARRAY('英语','语文'),
  '英语六级600+，曾任校英语角主讲。',
  '近期论文压力大，暂停接收新匹配。',
  360, 1, '2026-03-22 09:00:00', '通过',
  0, '2026-03-15 08:00:00', '2026-05-01 08:00:00'),
(9003, 9012, '赵新宇', 9005, '大二',
  JSON_ARRAY(JSON_OBJECT('week', 2, 'slot', 'night'), JSON_OBJECT('week', 4, 'slot', 'night')),
  JSON_ARRAY('化学','生物'),
  '化学竞赛省二等奖。',
  '性格开朗，喜欢举生活化的例子。',
  0, 0, NULL, NULL,
  1, '2026-04-25 08:00:00', '2026-05-01 08:00:00'),
(9004, 9013, '孙浩然', 9005, '大一',
  JSON_ARRAY(JSON_OBJECT('week', 1, 'slot', 'noon'), JSON_OBJECT('week', 2, 'slot', 'noon'), JSON_OBJECT('week', 3, 'slot', 'noon')),
  JSON_ARRAY('数学'),
  '暂无突出经历。',
  '希望尝试支教。',
  0, 2, '2026-04-22 10:00:00', '在校证明缺失，请补充材料后重新提交',
  1, '2026-04-20 08:00:00', '2026-05-01 08:00:00'),
(9005, 9014, '周思远', 9004, '研三',
  JSON_ARRAY(JSON_OBJECT('week', 1, 'slot', 'night'), JSON_OBJECT('week', 3, 'slot', 'night'), JSON_OBJECT('week', 5, 'slot', 'night'), JSON_OBJECT('week', 7, 'slot', 'noon')),
  JSON_ARRAY('数学','物理','英语'),
  '累计1200分钟支教经验，带过3名学生升入重点高中。',
  '风格沉稳，善于针对薄弱点定向训练。',
  1200, 1, '2025-09-10 09:00:00', '资深志愿者',
  1, '2025-09-01 08:00:00', '2026-05-01 08:00:00'),
(9006, 9015, '吴晓燕', 9005, '大三',
  JSON_ARRAY(JSON_OBJECT('week', 4, 'slot', 'night'), JSON_OBJECT('week', 6, 'slot', 'night')),
  JSON_ARRAY('语文','历史'),
  '校文学社主席。',
  '希望帮助乡村学生改善作文表达。',
  0, 1, '2026-04-29 10:00:00', '通过',
  1, '2026-04-28 08:00:00', '2026-05-01 08:00:00');

-- ----------------------------------------------------------------------------
-- 5) 学生资料（student_profile）
-- ----------------------------------------------------------------------------
INSERT INTO `student_profile` (
  `id`, `user_id`, `real_name`, `school_id`, `grade`, `emergency_weight`,
  `subjects_needed`, `free_time`, `profile_status`, `personality_desc`,
  `bind_admin_id`, `audit_status`, `audit_time`, `audit_notes`,
  `create_time`, `update_time`
) VALUES
(9001, 9020, '杨小明', 9001, '初二', 80,
  JSON_ARRAY('数学','物理'),
  JSON_ARRAY(JSON_OBJECT('week', 1, 'slot', 'night'), JSON_OBJECT('week', 3, 'slot', 'night'), JSON_OBJECT('week', 5, 'slot', 'night')),
  1, '内向，理解能力强，需要更多互动。',
  9002, 1, '2026-03-18 09:00:00', '通过', '2026-03-15 08:00:00', '2026-05-01 08:00:00'),
(9002, 9021, '陈小红', 9001, '初三', 90,
  JSON_ARRAY('英语','语文'),
  JSON_ARRAY(JSON_OBJECT('week', 6, 'slot', 'mor'), JSON_OBJECT('week', 7, 'slot', 'mor')),
  1, '中考冲刺阶段，需要英语阅读重点辅导。',
  9002, 1, '2026-04-03 09:00:00', '通过', '2026-04-01 08:00:00', '2026-05-01 08:00:00'),
(9003, 9022, '刘小波', 9001, '初一', 50,
  JSON_ARRAY('数学'),
  JSON_ARRAY(JSON_OBJECT('week', 2, 'slot', 'noon'), JSON_OBJECT('week', 4, 'slot', 'noon')),
  1, '资料已提交，等待审核。',
  9002, 0, NULL, NULL, '2026-04-26 08:00:00', '2026-05-01 08:00:00'),
(9004, 9023, '王小亮', 9001, '小六', 40,
  JSON_ARRAY('数学','英语'),
  JSON_ARRAY(JSON_OBJECT('week', 1, 'slot', 'noon'), JSON_OBJECT('week', 3, 'slot', 'noon')),
  1, '希望辅导小升初。',
  9002, 2, '2026-04-17 10:00:00', '监护人信息不完整，请补充后重新提交',
  '2026-04-15 08:00:00', '2026-05-01 08:00:00'),
(9005, 9024, '何小英', 9002, '高一', 75,
  JSON_ARRAY('数学','物理','英语'),
  JSON_ARRAY(JSON_OBJECT('week', 2, 'slot', 'night'), JSON_OBJECT('week', 4, 'slot', 'night'), JSON_OBJECT('week', 6, 'slot', 'night')),
  1, '希望系统提升理科。',
  9003, 1, '2026-03-22 09:00:00', '通过', '2026-03-20 08:00:00', '2026-05-01 08:00:00'),
(9006, 9025, '林小梅', 9002, '高二', 60,
  JSON_ARRAY('英语'),
  JSON_ARRAY(JSON_OBJECT('week', 1, 'slot', 'night'), JSON_OBJECT('week', 5, 'slot', 'night')),
  1, '希望突破英语写作。',
  9003, 1, '2026-04-08 09:00:00', '通过', '2026-04-05 08:00:00', '2026-05-01 08:00:00'),
(9007, 9026, '马小峰', 9001, '初二', 70,
  JSON_ARRAY('数学'),
  JSON_ARRAY(JSON_OBJECT('week', 3, 'slot', 'night'), JSON_OBJECT('week', 5, 'slot', 'night')),
  1, '时间冲突，希望调整志愿者。',
  9002, 1, '2026-03-22 09:00:00', '通过', '2026-03-20 08:00:00', '2026-05-01 08:00:00'),
(9008, 9027, '黄小刚', 9001, '初三', 55,
  JSON_ARRAY('物理'),
  JSON_ARRAY(JSON_OBJECT('week', 2, 'slot', 'night'), JSON_OBJECT('week', 4, 'slot', 'night')),
  1, '此前已完成一轮辅导。',
  9002, 1, '2026-02-18 09:00:00', '通过', '2026-02-15 08:00:00', '2026-05-01 08:00:00'),
(9009, 9028, '郑小晴', 9001, '初二', 65,
  JSON_ARRAY('英语'),
  JSON_ARRAY(JSON_OBJECT('week', 1, 'slot', 'night'), JSON_OBJECT('week', 3, 'slot', 'night')),
  1, '希望长期辅导英语口语。',
  9002, 1, '2026-03-27 09:00:00', '通过', '2026-03-25 08:00:00', '2026-05-01 08:00:00'),
(9010, 9029, '吴小雨', 9001, '初三', 85,
  JSON_ARRAY('物理','化学'),
  JSON_ARRAY(JSON_OBJECT('week', 5, 'slot', 'night'), JSON_OBJECT('week', 7, 'slot', 'night')),
  1, '想冲击重点高中。',
  9002, 1, '2026-04-23 09:00:00', '通过', '2026-04-22 08:00:00', '2026-05-01 08:00:00'),
(9011, 9030, '孙小路', 9001, '初一', 30,
  JSON_ARRAY('数学'),
  JSON_ARRAY(JSON_OBJECT('week', 1, 'slot', 'night')),
  1, '已提交资料等待审核。',
  9002, 0, NULL, NULL, '2026-04-28 08:00:00', '2026-05-01 08:00:00');

-- ----------------------------------------------------------------------------
-- 6) 结对（match_pair）
--    match_status: 0已申请 1已接受 2已拒绝 3解绑确认中 4已解绑 5解绑被拒
-- ----------------------------------------------------------------------------
INSERT INTO `match_pair` (
  `id`, `student_id`, `teacher_id`, `match_status`,
  `apply_time`, `accept_time`, `reject_reason`,
  `unbind_request_by`, `unbind_request_time`,
  `student_unbind_confirm`, `student_unbind_confirm_time`,
  `teacher_unbind_confirm`, `teacher_unbind_confirm_time`,
  `admin_unbind_confirm`,  `admin_unbind_confirm_time`,
  `unbind_admin_id`, `unbind_reject_by`, `unbind_reject_reason`, `unbind_reject_time`,
  `unbind_accept_time`, `create_time`, `update_time`
) VALUES
-- 杨小明 + 张明远，已接受活跃中
(9001, 9020, 9010, 1, '2026-04-10 09:00:00', '2026-04-10 20:00:00', NULL,
  NULL, NULL, 0, NULL, 0, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL,
  '2026-04-10 09:00:00', '2026-05-01 08:00:00'),
-- 陈小红 申请 张明远，待教师处理
(9002, 9021, 9010, 0, '2026-04-30 10:00:00', NULL, NULL,
  NULL, NULL, 0, NULL, 0, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL,
  '2026-04-30 10:00:00', '2026-04-30 10:00:00'),
-- 陈小红 申请 李文静，被拒绝
(9003, 9021, 9011, 2, '2026-04-15 10:00:00', NULL, '当前时间段不匹配，建议换志愿者',
  NULL, NULL, 0, NULL, 0, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL,
  '2026-04-15 10:00:00', '2026-04-15 11:00:00'),
-- 马小峰 + 张明远，解绑确认中（学生已确认，教师未确认）
(9004, 9026, 9010, 3, '2026-03-22 09:00:00', '2026-03-22 18:00:00', NULL,
  9026, '2026-05-01 10:00:00',
  1, '2026-05-01 10:00:00', 0, NULL, 0, NULL,
  9002, NULL, NULL, NULL, NULL,
  '2026-03-22 09:00:00', '2026-05-01 10:00:00'),
-- 黄小刚 + 张明远，历史已解绑
(9005, 9027, 9010, 4, '2026-02-20 09:00:00', '2026-02-20 18:00:00', NULL,
  9027, '2026-03-18 09:00:00',
  1, '2026-03-18 09:00:00', 1, '2026-03-18 10:00:00', 1, '2026-03-18 11:00:00',
  9002, NULL, NULL, NULL, '2026-03-18 11:00:00',
  '2026-02-20 09:00:00', '2026-03-18 11:00:00'),
-- 郑小晴 + 周思远，解绑被L2拒绝
(9006, 9028, 9014, 5, '2026-03-28 09:00:00', '2026-03-28 18:00:00', NULL,
  9028, '2026-04-25 09:00:00',
  1, '2026-04-25 09:00:00', 1, '2026-04-25 10:00:00', 0, NULL,
  9002, 9002, '解绑原因不充分，请先沟通调整辅导节奏', '2026-04-25 11:00:00', NULL,
  '2026-03-28 09:00:00', '2026-04-25 11:00:00'),
-- 何小英 + 周思远，已接受（巍山）
(9007, 9024, 9014, 1, '2026-04-08 09:00:00', '2026-04-08 18:00:00', NULL,
  NULL, NULL, 0, NULL, 0, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL,
  '2026-04-08 09:00:00', '2026-05-01 08:00:00'),
-- 吴小雨 申请 周思远，待处理
(9008, 9029, 9014, 0, '2026-04-30 11:00:00', NULL, NULL,
  NULL, NULL, 0, NULL, 0, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL,
  '2026-04-30 11:00:00', '2026-04-30 11:00:00'),
-- 杨小明 + 周思远，已接受（一个学生多志愿者）
(9009, 9020, 9014, 1, '2026-04-20 09:00:00', '2026-04-20 18:00:00', NULL,
  NULL, NULL, 0, NULL, 0, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL,
  '2026-04-20 09:00:00', '2026-05-01 08:00:00'),
-- 林小梅 申请 李文静，被拒
(9010, 9025, 9011, 2, '2026-04-18 10:00:00', NULL, '研究生阶段课业较重，无法接新结对',
  NULL, NULL, 0, NULL, 0, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL,
  '2026-04-18 10:00:00', '2026-04-18 11:00:00');

-- ----------------------------------------------------------------------------
-- 7) 志愿服务时长记录（volunteer_record）
--    status: 0待学员确认 1待管理员审核 2已通过 3管理员驳回 4学员驳回
-- ----------------------------------------------------------------------------
INSERT INTO `volunteer_record` (
  `id`, `match_pair_id`, `teacher_id`, `student_id`, `meeting_id`, `duration`, `meeting_date`,
  `service_desc`, `evidence_images`, `ai_summary`, `status`, `reject_reason`,
  `student_confirm_time`, `admin_audit_time`, `auditor_id`,
  `create_time`, `update_time`
) VALUES
-- pair 9001 张明远+杨小明
(9001, 9001, 9010, 9020, NULL, 60, '2026-04-28',
  '复习一次函数图像、斜率和简单应用题。',
  JSON_ARRAY('https://example.com/evidence/9001-1.png'),
  '学生理解一次函数图像含义，后续加强综合题。',
  0, NULL, NULL, NULL, NULL,
  '2026-04-29 09:00:00', '2026-04-29 09:00:00'),
(9002, 9001, 9010, 9020, NULL, 60, '2026-04-25',
  '英语阅读关键词定位与长难句拆分。',
  JSON_ARRAY('https://example.com/evidence/9002-1.png'),
  '阅读理解技巧训练，学生参与度较高。',
  1, NULL, '2026-04-26 09:00:00', NULL, NULL,
  '2026-04-25 22:00:00', '2026-04-26 09:00:00'),
(9003, 9001, 9010, 9020, NULL, 60, '2026-04-20',
  '函数图像分析与基础练习。',
  JSON_ARRAY('https://example.com/evidence/9003-1.png'),
  '学生掌握良好，可推进下一阶段。',
  2, NULL, '2026-04-21 09:00:00', '2026-04-22 10:00:00', 9002,
  '2026-04-20 22:00:00', '2026-04-22 10:00:00'),
(9004, 9001, 9010, 9020, NULL, 30, '2026-04-18',
  '课后答疑与作业订正。',
  NULL, NULL,
  3, '服务描述过于简单，请补充凭证后重新提交',
  '2026-04-19 09:00:00', '2026-04-21 08:00:00', 9002,
  '2026-04-18 22:00:00', '2026-04-21 08:00:00'),
(9005, 9001, 9010, 9020, NULL, 30, '2026-04-15',
  '简短答疑。', NULL, NULL,
  4, '学生拒绝：实际辅导不足30分钟',
  NULL, NULL, NULL,
  '2026-04-15 22:00:00', '2026-04-16 09:00:00'),
-- pair 9007 周思远+何小英（巍山）
(9006, 9007, 9014, 9024, NULL, 90, '2026-04-26',
  '高一物理力学基础梳理。',
  JSON_ARRAY('https://example.com/evidence/9006-1.png'),
  '学生对牛顿定律掌握尚可，需加强受力分析。',
  0, NULL, NULL, NULL, NULL,
  '2026-04-26 22:00:00', '2026-04-26 22:00:00'),
(9007, 9007, 9014, 9024, NULL, 60, '2026-04-22',
  '高一英语语法精讲。',
  JSON_ARRAY('https://example.com/evidence/9007-1.png'),
  '语法体系梳理，重点训练时态。',
  1, NULL, '2026-04-23 09:00:00', NULL, NULL,
  '2026-04-22 22:00:00', '2026-04-23 09:00:00'),
(9008, 9007, 9014, 9024, NULL, 90, '2026-04-18',
  '高一数学函数综合。',
  JSON_ARRAY('https://example.com/evidence/9008-1.png'),
  '综合题训练，学生表现稳定。',
  2, NULL, '2026-04-19 09:00:00', '2026-04-19 18:00:00', 9003,
  '2026-04-18 22:00:00', '2026-04-19 18:00:00'),
-- pair 9009 周思远+杨小明
(9009, 9009, 9014, 9020, NULL, 45, '2026-04-25',
  '初二物理拓展专题。',
  JSON_ARRAY('https://example.com/evidence/9009-1.png'),
  '拓展题目演练，学生需加强思路总结。',
  1, NULL, '2026-04-26 09:00:00', NULL, NULL,
  '2026-04-25 22:00:00', '2026-04-26 09:00:00'),
-- pair 9005 历史已解绑记录
(9010, 9005, 9010, 9027, NULL, 60, '2026-03-10',
  '初三物理总复习。',
  JSON_ARRAY('https://example.com/evidence/9010-1.png'),
  '总复习节奏紧凑，学生信心提升。',
  2, NULL, '2026-03-11 09:00:00', '2026-03-12 10:00:00', 9002,
  '2026-03-10 22:00:00', '2026-03-12 10:00:00');

-- ----------------------------------------------------------------------------
-- 8) 会议（meeting）
--    status: 0未开始 1进行中 2已结束 3已取消
-- ----------------------------------------------------------------------------
INSERT INTO `meeting` (
  `id`, `match_pair_id`, `topic`, `start_time`, `end_time`, `meeting_link`,
  `created_by`, `status`, `record_url`, `create_time`, `update_time`
) VALUES
(9001, 9001, '一次函数图像与斜率', '2026-04-28 20:00:00', '2026-04-28 21:00:00',
  'https://meeting.tencent.com/dm/db9001', 9010, 2, NULL, '2026-04-25 08:00:00', '2026-04-28 21:05:00'),
(9002, 9001, '电学综合训练', '2026-05-20 20:00:00', '2026-05-20 21:00:00',
  'https://meeting.tencent.com/dm/db9002', 9010, 0, NULL, '2026-05-10 08:00:00', '2026-05-10 08:00:00'),
(9003, 9007, '高一物理-力学初步', '2026-04-26 20:00:00', '2026-04-26 21:30:00',
  'https://meeting.tencent.com/dm/db9003', 9014, 2, NULL, '2026-04-22 08:00:00', '2026-04-26 21:35:00'),
(9004, 9007, '高一英语-语法精讲', '2026-05-18 20:00:00', '2026-05-18 21:00:00',
  'https://meeting.tencent.com/dm/db9004', 9014, 0, NULL, '2026-05-10 08:00:00', '2026-05-10 08:00:00'),
(9005, 9009, '初二物理拓展', '2026-05-22 20:00:00', '2026-05-22 21:00:00',
  'https://meeting.tencent.com/dm/db9005', 9014, 0, NULL, '2026-05-10 08:00:00', '2026-05-10 08:00:00');

-- ----------------------------------------------------------------------------
-- 9) 聊天参与者（chat_participant）
-- ----------------------------------------------------------------------------
INSERT INTO `chat_participant` (
  `id`, `match_pair_id`, `user_id`, `participant_role`, `is_default_member`, `joined_time`, `left_time`
) VALUES
-- pair 9001 杨小明+张明远
(9001, 9001, 9002, 1, 1, '2026-04-10 20:01:00', NULL),
(9002, 9001, 9010, 2, 1, '2026-04-10 20:01:00', NULL),
(9003, 9001, 9020, 3, 1, '2026-04-10 20:01:00', NULL),
-- pair 9007 何小英+周思远（巍山）
(9004, 9007, 9003, 1, 1, '2026-04-08 18:01:00', NULL),
(9005, 9007, 9014, 2, 1, '2026-04-08 18:01:00', NULL),
(9006, 9007, 9024, 3, 1, '2026-04-08 18:01:00', NULL),
-- pair 9009 杨小明+周思远
(9007, 9009, 9002, 1, 1, '2026-04-20 18:01:00', NULL),
(9008, 9009, 9014, 2, 1, '2026-04-20 18:01:00', NULL),
(9009, 9009, 9020, 3, 1, '2026-04-20 18:01:00', NULL),
-- pair 9004 解绑确认中
(9010, 9004, 9002, 1, 1, '2026-03-22 18:01:00', NULL),
(9011, 9004, 9010, 2, 1, '2026-03-22 18:01:00', NULL),
(9012, 9004, 9026, 3, 1, '2026-03-22 18:01:00', NULL);

-- ----------------------------------------------------------------------------
-- 10) 聊天消息（chat_message）
-- ----------------------------------------------------------------------------
INSERT INTO `chat_message` (
  `id`, `match_pair_id`, `sender_id`, `message_type`, `content`, `send_time`, `read_time`
) VALUES
(9001, 9001, 9020, 0, '张老师好，我想复习一次函数。', '2026-04-28 19:50:00', '2026-04-28 19:55:00'),
(9002, 9001, 9010, 0, '好的，我们先从图像和斜率开始。', '2026-04-28 19:55:00', '2026-04-28 19:56:00'),
(9003, 9001, 9020, 0, '老师我作业里第3题不懂。', '2026-04-30 21:00:00', '2026-04-30 21:05:00'),
(9004, 9001, 9010, 0, '稍等，我画一下示意图。', '2026-04-30 21:05:00', NULL),
(9005, 9007, 9024, 0, '周老师，下周二我有补课，可以提前到19:30吗？', '2026-05-01 16:00:00', '2026-05-01 16:05:00'),
(9006, 9007, 9014, 0, '可以的，我也提前10分钟到。', '2026-05-01 16:05:00', NULL),
(9007, 9004, 9026, 0, '老师我最近时间冲突比较多，想申请解绑。', '2026-05-01 09:30:00', '2026-05-01 09:35:00'),
(9008, 9004, 9010, 0, '没问题，我这边确认一下。', '2026-05-01 09:36:00', NULL);

-- ----------------------------------------------------------------------------
-- 11) 消息通知（message_notification）
-- ----------------------------------------------------------------------------
INSERT INTO `message_notification` (
  `id`, `user_id`, `type`, `title`, `content`, `params`,
  `sent_time`, `read_time`, `wechat_sent`, `wechat_msg_id`
) VALUES
(9001, 9010, 0, '新的结对申请', '学员陈小红向您发起了结对申请', JSON_OBJECT('pairId', 9002), '2026-04-30 10:01:00', NULL, 0, NULL),
(9002, 9014, 0, '新的结对申请', '学员吴小雨向您发起了结对申请', JSON_OBJECT('pairId', 9008), '2026-04-30 11:01:00', NULL, 0, NULL),
(9003, 9020, 1, '结对已通过', '志愿者张明远已接受您的结对', JSON_OBJECT('pairId', 9001), '2026-04-10 20:01:00', '2026-04-10 20:05:00', 0, NULL),
(9004, 9024, 1, '结对已通过', '志愿者周思远已接受您的结对', JSON_OBJECT('pairId', 9007), '2026-04-08 18:01:00', '2026-04-08 18:10:00', 0, NULL),
(9005, 9021, 2, '结对申请被拒', '志愿者表示时间不匹配，请重新选择', JSON_OBJECT('pairId', 9003), '2026-04-15 11:00:00', NULL, 0, NULL),
(9006, 9010, 3, '解绑申请', '马小峰与张明远的结对，学员发起解绑，等待您确认', JSON_OBJECT('pairId', 9004), '2026-05-01 10:01:00', NULL, 0, NULL),
(9007, 9002, 3, '解绑待管理员确认', '马小峰与张明远的结对等待二级管理员确认', JSON_OBJECT('pairId', 9004), '2026-05-01 10:02:00', NULL, 0, NULL),
(9008, 9020, 6, '待确认服务时长', '志愿者提交了60分钟服务记录，请确认', JSON_OBJECT('recordId', 9001), '2026-04-29 09:05:00', NULL, 0, NULL),
(9009, 9024, 6, '待确认服务时长', '志愿者提交了90分钟服务记录，请确认', JSON_OBJECT('recordId', 9006), '2026-04-26 22:10:00', NULL, 0, NULL),
(9010, 9002, 7, '待审核服务时长', '云龙校区有1条时长待审核', JSON_OBJECT('recordId', 9002), '2026-04-29 22:00:00', NULL, 0, NULL),
(9011, 9003, 7, '待审核服务时长', '巍山校区有1条时长待审核', JSON_OBJECT('recordId', 9007), '2026-04-27 09:00:00', NULL, 0, NULL),
(9012, 9010, 8, '时长审核通过', '您60分钟志愿服务时长已通过审核', JSON_OBJECT('recordId', 9003), '2026-04-22 11:00:00', NULL, 0, NULL);

SET FOREIGN_KEY_CHECKS = 1;
