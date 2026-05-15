# 城乡结对支教平台数据库设计

## 表结构清单

### 1. 用户表 (user)
存储所有用户的基础信息，通过角色字段区分用户类型。

| 字段名 | 数据类型 | 约束 | 说明 |
|--------|----------|------|------|
| id | bigint | PRIMARY KEY, AUTO_INCREMENT | 主键 |
| username | varchar(64) | NOT NULL | 用户名/昵称（允许重复，与 `init.sql` 一致） |
| password | varchar(255) | NOT NULL | 加密后的密码 |
| role | tinyint | NOT NULL | 角色：0-一级管理员，1-二级管理员，2-教师（志愿者），3-学员 |
| phone | varchar(20) | UNIQUE | 手机号 |
| wechat_openid | varchar(128) | UNIQUE | 微信OpenID |
| avatar | varchar(512) | | 头像URL |
| status | tinyint | NOT NULL DEFAULT 1 | 状态：0-禁用，1-启用 |
| create_time | datetime | NOT NULL DEFAULT CURRENT_TIMESTAMP | 创建时间 |
| update_time | datetime | NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP | 更新时间 |

**索引：**
- KEY `idx_username` (`username`)
- UNIQUE KEY `uk_phone` (`phone`)
- UNIQUE KEY `uk_wechat_openid` (`wechat_openid`)
- KEY `idx_role_status` (`role`, `status`)

### 2. 学校表 (school)
存储学校信息，用于区域管理。

| 字段名 | 数据类型 | 约束 | 说明 |
|--------|----------|------|------|
| id | bigint | PRIMARY KEY, AUTO_INCREMENT | 主键 |
| name | varchar(128) | NOT NULL | 学校名称 |
| region_code | varchar(32) | NOT NULL | 区域编码 |
| address | varchar(512) | | 详细地址 |
| contact_person | varchar(64) | | 联系人 |
| contact_phone | varchar(20) | | 联系电话 |
| create_time | datetime | NOT NULL DEFAULT CURRENT_TIMESTAMP | 创建时间 |
| update_time | datetime | NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP | 更新时间 |

**索引：**
- KEY `idx_region_code` (`region_code`)

### 3. 管理员信息表 (admin_profile)
存储管理员（一、二级）的详细信息。

| 字段名 | 数据类型 | 约束 | 说明 |
|--------|----------|------|------|
| id | bigint | PRIMARY KEY, AUTO_INCREMENT | 主键 |
| user_id | bigint | NOT NULL, FOREIGN KEY (user_id) REFERENCES user(id) | 关联用户ID |
| real_name | varchar(64) | NOT NULL | 真实姓名 |
| school_id | bigint | FOREIGN KEY (school_id) REFERENCES school(id) | 管理的学校ID（二级管理员必填） |
| region_code | varchar(32) | | 管理区域编码（可多级） |
| permissions | json | | 权限配置（JSON数组，仅支持 `student_manage`、`teacher_audit`） |
| create_time | datetime | NOT NULL DEFAULT CURRENT_TIMESTAMP | 创建时间 |
| update_time | datetime | NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP | 更新时间 |

**索引：**
- UNIQUE KEY `uk_user_id` (`user_id`)
- KEY `idx_school_id` (`school_id`)
- KEY `idx_region_code` (`region_code`)

### 4. 志愿者信息表 (teacher_profile)
存储志愿者（教师）的详细信息。

| 字段名 | 数据类型 | 约束 | 说明 |
|--------|----------|------|------|
| id | bigint | PRIMARY KEY, AUTO_INCREMENT | 主键 |
| user_id | bigint | NOT NULL, FOREIGN KEY (user_id) REFERENCES user(id) | 关联用户ID |
| real_name | varchar(64) | NOT NULL | 真实姓名 |
| school | varchar(128) | NOT NULL | 所在学校（志愿者所属学校） |
| grade | varchar(32) | | 年级（大学生/高中生） |
| free_time | json | NOT NULL | 空闲时间段（JSON数组） |
| skilled_subjects | json | NOT NULL | 擅长科目（JSON数组） |
| personal_skills | text | | 个人特长 |
| personality_desc | text | | 性格自我描述 |
| total_service_duration| int | NOT NULL DEFAULT 0 | 累计志愿服务时长（分钟），记录审核通过后自动累加 |
| certification_status | tinyint | NOT NULL DEFAULT 0 | 审核状态：0-待审核，1-审核通过，2-审核拒绝 |
| audit_time | datetime | | 审核时间 |
| audit_notes | varchar(512) | | 审核备注 |
| continuous_match | tinyint(1) | NOT NULL DEFAULT 1 | 是否持续接受匹配（1-是，0-否） |
| create_time | datetime | NOT NULL DEFAULT CURRENT_TIMESTAMP | 创建时间 |
| update_time | datetime | NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP | 更新时间 |

**索引：**
- UNIQUE KEY `uk_user_id` (`user_id`)
- KEY `idx_certification_status` (`certification_status`)

### 5. 学生信息表 (student_profile)
存储学员（学生）的详细信息。

| 字段名 | 数据类型 | 约束 | 说明 |
|--------|----------|------|------|
| id | bigint | PRIMARY KEY, AUTO_INCREMENT | 主键 |
| user_id | bigint | NOT NULL, FOREIGN KEY (user_id) REFERENCES user(id) | 关联用户ID |
| real_name | varchar(64) | NOT NULL | 真实姓名 |
| school_id | bigint | NOT NULL, FOREIGN KEY (school_id) REFERENCES school(id) | 所在学校ID |
| grade | varchar(32) | NOT NULL | 年级（如：初三） |
| emergency_weight | int | DEFAULT NULL | 需求紧急程度权重（系统计算） |
| subjects_needed | json | | 需要辅导的科目（JSON数组） |
| free_time | json | | 可上课时间段（JSON数组） |
| profile_status | tinyint | NOT NULL DEFAULT 0 | 资料状态：0-草稿，1-可发起配对 |
| personality_desc | text | | 性格描述 |
| bind_admin_id | bigint | NOT NULL, FOREIGN KEY (bind_admin_id) REFERENCES user(id) | 绑定的二级管理员用户ID（如果由老师代管） |
| audit_status | tinyint | NOT NULL DEFAULT 0 | 学生审核状态：0-待审核，1-通过，2-拒绝 |
| audit_time | datetime | | 学生审核时间 |
| audit_notes | varchar(512) | | 学生审核备注 |
| create_time | datetime | NOT NULL DEFAULT CURRENT_TIMESTAMP | 创建时间 |
| update_time | datetime | NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP | 更新时间 |

**索引：**
- UNIQUE KEY `uk_user_id` (`user_id`)
- KEY `idx_school_id` (`school_id`)
- KEY `idx_bind_admin_id` (`bind_admin_id`)
- KEY `idx_emergency_weight` (`emergency_weight`)

### 6. 匹配结对表 (match_pair)
存储学员与志愿者之间的匹配关系及状态。

| 字段名 | 数据类型 | 约束 | 说明 |
|--------|----------|------|------|
| id | bigint | PRIMARY KEY, AUTO_INCREMENT | 主键 |
| student_id | bigint | NOT NULL, FOREIGN KEY (student_id) REFERENCES user(id) | 学员用户ID |
| teacher_id | bigint | NOT NULL, FOREIGN KEY (teacher_id) REFERENCES user(id) | 志愿者用户ID |
| match_status | tinyint | NOT NULL DEFAULT 0 | 匹配状态：0-已申请，1-已接受，2-已拒绝，3-解绑确认中，4-已解绑，5-已禁用 |
| apply_time | datetime | NOT NULL DEFAULT CURRENT_TIMESTAMP | 申请时间 |
| accept_time | datetime | | 接受时间 |
| reject_reason | varchar(512) | | 拒绝理由（志愿者填写） |
| unbind_request_by | bigint | FOREIGN KEY (unbind_request_by) REFERENCES user(id) | 解绑发起方用户ID |
| unbind_request_time | datetime | | 解绑申请时间 |
| student_unbind_confirm | tinyint(1) | NOT NULL DEFAULT 0 | 学生是否确认解绑 |
| student_unbind_confirm_time | datetime | | 学生确认时间 |
| teacher_unbind_confirm | tinyint(1) | NOT NULL DEFAULT 0 | 志愿者是否确认解绑 |
| teacher_unbind_confirm_time | datetime | | 志愿者确认时间 |
| admin_unbind_confirm | tinyint(1) | NOT NULL DEFAULT 0 | 二级管理员是否确认解绑 |
| admin_unbind_confirm_time | datetime | | 二级管理员确认时间 |
| unbind_admin_id | bigint | FOREIGN KEY (unbind_admin_id) REFERENCES user(id) | 对应二级管理员用户ID |
| unbind_reject_by | bigint | FOREIGN KEY (unbind_reject_by) REFERENCES user(id) | 解绑拒绝方用户ID |
| unbind_reject_reason | varchar(512) | | 解绑拒绝原因 |
| unbind_reject_time | datetime | | 解绑拒绝时间 |
| unbind_accept_time | datetime | | 三方确认完成时间 |
| create_time | datetime | NOT NULL DEFAULT CURRENT_TIMESTAMP | 创建时间 |
| update_time | datetime | NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP | 更新时间 |

**索引：**
- UNIQUE KEY `uk_student_teacher` (`student_id`, `teacher_id`)
- KEY `idx_match_status` (`match_status`)
- KEY `idx_teacher_status` (`teacher_id`, `match_status`)
- KEY `idx_student_status` (`student_id`, `match_status`)
- KEY `idx_unbind_admin_id` (`unbind_admin_id`)
- KEY `idx_unbind_reject_by` (`unbind_reject_by`)

### 7. 消息通知表 (message_notification)
存储系统内站内信及微信订阅消息发送记录（完整恢复原有字段，并增加新状态）。

| 字段名 | 数据类型 | 约束 | 说明 |
|--------|----------|------|------|
| id | bigint | PRIMARY KEY, AUTO_INCREMENT | 主键 |
| user_id | bigint | NOT NULL, FOREIGN KEY (user_id) REFERENCES user(id) | 接收用户ID |
| type | tinyint | NOT NULL | 消息类型：0-结对申请，1-结对接受，2-结对拒绝，3-解绑申请，4-解绑接受，5-会议提醒，6-时长确认提醒(发给学生)，7-时长审核提醒(发给管理员)，8-时长审核结果(发给教师) |
| title | varchar(128) | NOT NULL | 消息标题 |
| content | varchar(512) | NOT NULL | 消息内容 |
| params | json | | 消息参数（JSON格式，用于模板替换及跳转路由参数） |
| sent_time | datetime | NOT NULL DEFAULT CURRENT_TIMESTAMP | 发送时间 |
| read_time | datetime | | 阅读时间（标识站内信是否已读） |
| wechat_sent | tinyint(1) | NOT NULL DEFAULT 0 | 微信订阅消息是否已发送成功（1-是，0-否） |
| wechat_msg_id | varchar(128) | | 微信服务器返回的消息ID |

**索引：**
- KEY `idx_user_id` (`user_id`)
- KEY `idx_type_sent` (`type`, `sent_time`)
- KEY `idx_wechat_sent` (`wechat_sent`)

### 8. 会议表 (meeting)
存储视频会议信息。

| 字段名 | 数据类型 | 约束 | 说明 |
|--------|----------|------|------|
| id | bigint | PRIMARY KEY, AUTO_INCREMENT | 主键 |
| match_pair_id | bigint | NOT NULL, FOREIGN KEY (match_pair_id) REFERENCES match_pair(id) | 关联的匹配结对ID |
| topic | varchar(256) | NOT NULL | 会议主题 |
| start_time | datetime | NOT NULL | 会议开始时间 |
| end_time | datetime | NOT NULL | 会议结束时间 |
| meeting_link | varchar(512) | NOT NULL | 腾讯会议链接 |
| created_by | bigint | NOT NULL, FOREIGN KEY (created_by) REFERENCES user(id) | 创建人（管理员用户ID） |
| status | tinyint | NOT NULL DEFAULT 0 | 状态：0-未开始，1-进行中，2-已结束，3-已取消 |
| record_url | varchar(512) | | 录制文件URL |
| create_time | datetime | NOT NULL DEFAULT CURRENT_TIMESTAMP | 创建时间 |
| update_time | datetime | NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP | 更新时间 |

**索引：**
- KEY `idx_match_pair_id` (`match_pair_id`)
- KEY `idx_start_time` (`start_time`)
- KEY `idx_created_by` (`created_by`)

### 9. 聊天消息表 (chat_message)
存储结对双方的内置聊天消息。

| 字段名 | 数据类型 | 约束 | 说明 |
|--------|----------|------|------|
| id | bigint | PRIMARY KEY, AUTO_INCREMENT | 主键 |
| match_pair_id | bigint | NOT NULL, FOREIGN KEY (match_pair_id) REFERENCES match_pair(id) | 关联的匹配结对ID |
| sender_id | bigint | NOT NULL, FOREIGN KEY (sender_id) REFERENCES user(id) | 发送者用户ID |
| message_type | tinyint | NOT NULL | 消息类型：0-文本，1-图片，2-语音 |
| content | text | NOT NULL | 消息内容（文本内容或文件URL） |
| send_time | datetime | NOT NULL DEFAULT CURRENT_TIMESTAMP | 发送时间 |
| read_time | datetime | | 阅读时间 |
| (match_pair_id, sender_id) | 复合外键 | REFERENCES chat_participant(match_pair_id, user_id) | 发送者必须是该会话参与者 |

**索引：**
- KEY `idx_match_pair_id` (`match_pair_id`)
- KEY `idx_sender_id` (`sender_id`)
- KEY `idx_pair_sender` (`match_pair_id`, `sender_id`)
- KEY `idx_send_time` (`send_time`)

### 9.1 聊天参与者表 (chat_participant)
存储结对会话参与者，支持同校具备 `student_manage` 权限的二级管理员加入聊天。

| 字段名 | 数据类型 | 约束 | 说明 |
|--------|----------|------|------|
| id | bigint | PRIMARY KEY, AUTO_INCREMENT | 主键 |
| match_pair_id | bigint | NOT NULL, FOREIGN KEY (match_pair_id) REFERENCES match_pair(id) | 关联的匹配结对ID |
| user_id | bigint | NOT NULL, FOREIGN KEY (user_id) REFERENCES user(id) | 参与者用户ID |
| participant_role | tinyint | NOT NULL | 参与者角色：1-二级管理员，2-志愿者，3-学生 |
| is_default_member | tinyint(1) | NOT NULL DEFAULT 0 | 是否默认成员（如学生绑定管理员） |
| joined_time | datetime | NOT NULL DEFAULT CURRENT_TIMESTAMP | 加入时间 |
| left_time | datetime | | 退出时间 |
| create_time | datetime | NOT NULL DEFAULT CURRENT_TIMESTAMP | 创建时间 |
| update_time | datetime | NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP | 更新时间 |

**索引：**
- UNIQUE KEY `uk_pair_user` (`match_pair_id`, `user_id`)
- KEY `idx_user_role` (`user_id`, `participant_role`)

### 10. 算法权重配置表 (algorithm_weight_config)
存储匹配算法中各项因素的权重配置，可由管理员调整。

| 字段名 | 数据类型 | 约束 | 说明 |
|--------|----------|------|------|
| id | bigint | PRIMARY KEY, AUTO_INCREMENT | 主键 |
| factor_name | varchar(64) | NOT NULL UNIQUE | 因素名称（如：grade_urgency, subject_match, time_match等） |
| weight | decimal(5,2) | NOT NULL | 权重值（0-1之间） |
| description | varchar(256) | | 因素描述 |
| enabled | tinyint(1) | NOT NULL DEFAULT 1 | 是否启用 |
| create_time | datetime | NOT NULL DEFAULT CURRENT_TIMESTAMP | 创建时间 |
| update_time | datetime | NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP | 更新时间 |

**索引：**
- UNIQUE KEY `uk_factor_name` (`factor_name`)

### 11. 志愿服务时长记录表 (volunteer_record)
存储教师提交的单次服务记录及流转状态（新增）。

| 字段名 | 数据类型 | 约束 | 说明 |
|--------|----------|------|------|
| id | bigint | PRIMARY KEY, AUTO_INCREMENT | 主键 |
| match_pair_id | bigint | NOT NULL, FOREIGN KEY (match_pair_id) REFERENCES match_pair(id) | 关联的匹配结对ID |
| teacher_id | bigint | NOT NULL, FOREIGN KEY (teacher_id) REFERENCES user(id) | 教师（志愿者）用户ID |
| student_id | bigint | NOT NULL, FOREIGN KEY (student_id) REFERENCES user(id) | 学员用户ID |
| meeting_id | bigint | FOREIGN KEY (meeting_id) REFERENCES meeting(id) | 关联的内部会议ID（若是外部会议可为空） |
| duration | int | NOT NULL | 服务时长（单位：分钟） |
| meeting_date | date | NOT NULL | 服务日期 |
| service_desc | text | NOT NULL | 志愿者提交的服务描述 |
| evidence_images | json | | 服务凭证图片URL数组 |
| ai_summary | text | | AI生成的会议纪要/教学总结 |
| status | tinyint | NOT NULL DEFAULT 0 | 状态：0-待学生确认，1-待管理员审核，2-审核通过，3-审核拒绝，4-学生拒绝 |
| reject_reason | varchar(512) | | 拒绝理由（学生或管理员填写） |
| student_confirm_time| datetime | | 学生确认时间 |
| admin_audit_time | datetime | | 管理员审核时间 |
| auditor_id | bigint | FOREIGN KEY (auditor_id) REFERENCES user(id) | 审核的二级管理员ID |
| create_time | datetime | NOT NULL DEFAULT CURRENT_TIMESTAMP | 提交时间 |
| update_time | datetime | NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP| 更新时间 |

**索引：**
- KEY `idx_teacher_status` (`teacher_id`, `status`)
- KEY `idx_student_status` (`student_id`, `status`)
- KEY `idx_match_pair` (`match_pair_id`)

## 数据库初始化脚本
（可在后续生成SQL文件）