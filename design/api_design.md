# 城乡结对支教平台API设计

## API规范
- 基础路径：`/api`（当前实现；由 `server.servlet.context-path` 提供）
- 请求头：`Content-Type: application/json`
- 认证方式：JWT Token（除登录注册外都需要在Header中携带`Authorization: Bearer {token}`）
- 响应格式：
```json
{
  "code": 200,
  "message": "success",
  "data": {...}
}
```

## 1. 认证授权模块

### 1.1 微信小程序登录
```
POST /auth/wx-login
```
请求参数：
```json
{
  "code": "wx.login 返回的 code",
  "userInfo": {
    "nickName": "微信昵称",
    "avatarUrl": "头像URL"
  }
}
```
响应：
```json
{
  "token": "JWT token",
  "user": {
    "id": 1,
    "username": "用户名",
    "role": 0,
    "avatar": "头像URL",
    "hasProfile": false, // 是否已完善个人信息
    "roleApplied": false // 是否已申请学生/志愿者角色
  }
}
```

说明：
- 当前登录链路使用 `wx.login` 获取身份，不依赖微信手机号授权能力。
- 首次登录自动创建基础用户账号（未绑定学生/志愿者扩展资料），后续通过角色申请接口进入审核流。

### 1.2 手机号注册/登录（手动输入）
```
POST /auth/phone-login
```
请求参数：
```json
{
  "phone": "13800138000",
  "nickName": "可选昵称",
  "avatarUrl": "可选头像URL"
}
```
响应：
```json
{
  "token": "JWT token",
  "user": {
    "id": 1,
    "username": "用户名",
    "role": 3,
    "avatar": "头像URL",
    "phone": "13800138000",
    "hasProfile": false,
    "roleApplied": false
  }
}
```
说明：手机号不存在则自动注册并登录；已存在则直接登录。

### 1.3 申请角色（学生/志愿者）
```
POST /auth/role-apply
```
```json
{
  "targetRole": "STUDENT" // STUDENT 或 TEACHER
}
```
说明：提交后进入对应审核流程。

### 1.4 退出登录
```
POST /auth/logout
```

### 1.5 刷新Token
```
POST /auth/refresh
```

## 2. 用户管理模块

### 2.1 管理员用户管理

#### 2.1.1 获取用户列表
```
GET /admin/users
```
查询参数：`role`, `status`, `page`, `size`, `keyword` (用户名/手机号/姓名)

#### 2.1.2 获取用户详情
```
GET /admin/users/{userId}
```

约束说明：管理员（含一级管理员）不能直接创建用户账号，平台用户由小程序登录自动注册。

#### 2.1.3 更新用户状态
```
PUT /admin/users/{userId}/status
```
```json
{
  "status": 0
}
```

#### 2.1.4 一级管理员创建学校
```
POST /admin/schools
```
```json
{
  "name": "示例中学",
  "regionCode": "510100",
  "address": "xx路xx号",
  "contactPerson": "张老师",
  "contactPhone": "13800000000"
}
```

#### 2.1.5 一级管理员指定二级管理员并分配学校/地区权限
```
POST /admin/secondary-admins
```
```json
{
  "userId": 1,
  "schoolId": 1,
  "regionCode": "510100",
  "permissions": ["student_manage"]
}
```

权限说明：
- `student_manage`：本校学生注册审核、学生监管、本校学生关联志愿者时长审核
- `teacher_audit`：志愿者注册审核
说明：一级管理员可只授予其中一种权限，也可同时授予两种权限。
地域约束：
- 学生侧以云南地区学校体系为主，`student_manage` 按学校/地区进行隔离审核。
- 志愿者侧为上海来源用户，志愿者审核不受学校/地区隔离限制。

### 2.2 志愿者管理

#### 2.2.1 志愿者注册（完善信息）
```
POST /teacher/profile
```
```json
{
  "realName": "真实姓名",
  "school": "北京大学",
  "grade": "大一",
  "freeTime": [
    {"dayOfWeek": 1, "start": "19:00", "end": "21:00"},
    {"dayOfWeek": 3, "start": "19:00", "end": "21:00"}
  ],
  "skilledSubjects": ["数学", "物理"],
  "personalSkills": "擅长奥数教学",
  "personalityDesc": "耐心细致"
}
```

#### 2.2.2 获取志愿者个人信息
```
GET /teacher/profile
```

#### 2.2.3 更新志愿者信息
```
PUT /teacher/profile
```

#### 2.2.4 管理员审核志愿者
```
PUT /admin/teachers/{teacherId}/audit
```
```json
{
  "status": 1, // 1-通过，2-拒绝
  "notes": "审核备注"
}
```
权限要求：需具备 `teacher_audit`。
审核规则：任意具备 `teacher_audit` 权限的二级管理员均可对志愿者申请执行审核通过/拒绝，不要求与学生学校或地区一致。

#### 2.2.5 设置是否持续接受匹配
```
PUT /teacher/continuous-match
```
```json
{
  "enabled": true
}
```

### 2.3 学生管理

#### 2.3.1 学生资料草稿保存
```
POST /student/profile
```
```json
{
  "realName": "真实姓名（可选）",
  "schoolId": 1,
  "grade": "初三",
  "subjectsNeeded": ["数学", "英语"],
  "freeTime": [
    {"dayOfWeek": 1, "start": "19:00", "end": "21:00"},
    {"dayOfWeek": 3, "start": "19:00", "end": "21:00"}
  ],
  "personalityDesc": "内向，需要耐心引导"
}
```
字段约束：申请阶段支持草稿保存，`subjectsNeeded`、`freeTime` 可为空；进入配对前必须补全资料。

#### 2.3.2 提交配对资料
```
POST /student/profile/submit
```
说明：将资料状态从 `DRAFT` 提交为 `READY_FOR_MATCH`，校验 `grade`、`subjectsNeeded`、`freeTime` 必填。

#### 2.3.3 二级管理员审核学生资料
```
PUT /admin/students/{studentId}/audit
```
```json
{
  "status": 1, // 1-通过，2-拒绝
  "notes": "审核备注"
}
```
权限要求：需具备 `student_manage`，且只能审核本校学生。

#### 2.3.4 获取学生资料
```
GET /student/profile
```

#### 2.3.5 更新学生资料
```
PUT /student/profile
```

#### 2.3.6 二级管理员代管学生

##### 2.3.6.1 为代管学生创建账号
```
POST /admin/students/batch-create
```
```json
{
  "students": [
    {
      "realName": "学生1",
      "schoolId": 1,
      "grade": "初一",
      "subjectsNeeded": ["数学"],
      "freeTime": [...],
      "personalityDesc": "..."
    }
  ]
}
```

##### 2.3.6.2 获取代管学生列表
```
GET /admin/students/managed
```

##### 2.3.6.3 切换当前操作的学生（代管模式）
```
POST /admin/students/{studentId}/switch
```

## 3. 匹配结对模块

### 3.1 获取推荐志愿者列表（为学生端）
```
GET /match/recommendations
```
根据学生的科目需求、空闲时间、紧急权重等算法推荐

### 3.2 发起结对申请
```
POST /match/apply
```
```json
{
  "teacherId": 1
}
```
前置校验：学生资料状态必须为 `READY_FOR_MATCH`，且 `grade`、`subjectsNeeded`、`freeTime` 均非空。

### 3.3 获取待处理的结对申请（为志愿者端）
```
GET /match/pending-applications
```

### 3.4 处理结对申请
```
PUT /match/application/{applicationId}/process
```
```json
{
  "action": "accept", // accept 或 reject
  "reason": "拒绝理由（可选）"
}
```

### 3.5 获取我的结对列表
```
GET /match/my-pairs
```
查询参数：`status`（过滤状态）

### 3.6 发起解绑申请
```
POST /match/{pairId}/unbind-request
```

### 3.7 三方确认解绑（学生/志愿者/二级管理员）
```
PUT /match/{pairId}/unbind-confirm
```
```json
{
  "action": "accept", // accept 或 reject
  "role": "STUDENT", // STUDENT / TEACHER / SECONDARY_ADMIN
  "rejectReason": "拒绝原因（action=reject时必填）"
}
```
规则：任意一方发起解绑后，学生、志愿者、对应二级管理员三方都确认才最终解绑。
状态机规则：
- 任一方发起后，状态进入 `UNBIND_PENDING`，并重置三方确认位。
- 任一方拒绝后，状态进入 `UNBIND_REJECTED`，记录拒绝方、拒绝原因与拒绝时间。
- 从 `UNBIND_REJECTED` 再次发起解绑时，清理上一次拒绝信息并重新进入 `UNBIND_PENDING`。
- 三方全部同意后，状态进入 `UNBOUND` 并记录 `unbindAcceptTime`。

### 3.8 查询解绑确认进度
```
GET /match/{pairId}/unbind-progress
```
返回三方当前确认状态与确认时间。

### 3.9 获取结对详情
```
GET /match/{pairId}
```

## 4. 消息通知模块

### 4.1 获取消息列表
```
GET /notifications
```
查询参数：`type`, `unreadOnly`, `page`, `size`

### 4.2 标记消息已读
```
PUT /notifications/{notificationId}/read
```

### 4.3 批量标记已读
```
PUT /notifications/batch-read
```
```json
{
  "notificationIds": [1, 2, 3]
}
```

### 4.4 发送微信订阅消息（内部接口，供业务调用）
```
POST /internal/notifications/wechat
```
```json
{
  "userId": 1,
  "type": "MATCH_APPLY",
  "templateData": {...}
}
```

## 5. 会议管理模块

### 5.1 创建会议（管理员）
```
POST /meetings
```
```json
{
  "matchPairId": 1,
  "topic": "数学辅导课",
  "startTime": "2026-03-27 19:00:00",
  "endTime": "2026-03-27 20:00:00",
  "meetingLink": "https://meeting.tencent.com/xxx"
}
```

### 5.2 获取会议列表
```
GET /meetings
```
查询参数：`matchPairId`, `status`, `startTimeFrom`, `startTimeTo`

### 5.3 获取会议详情
```
GET /meetings/{meetingId}
```

### 5.4 更新会议状态
```
PUT /meetings/{meetingId}/status
```
```json
{
  "status": 1
}
```

### 5.5 获取我的会议（志愿者/学生）
```
GET /meetings/my
```

## 6. 聊天模块

### 6.1 发送消息
```
POST /chat/messages
```
```json
{
  "matchPairId": 1,
  "messageType": "TEXT", // TEXT, IMAGE, VOICE
  "content": "你好，今天学习如何？"
}
```
权限校验：发送者必须存在于 `chat_participant`，且当前未退出会话（`leftTime` 为空）。

### 6.2 获取聊天记录
```
GET /chat/messages
```
查询参数：`matchPairId`, `lastMessageId`（用于分页）, `limit`（默认50）

### 6.3 标记消息已读
```
PUT /chat/messages/{messageId}/read
```

### 6.4 管理员加入会话
```
POST /chat/pairs/{pairId}/participants
```
```json
{
  "userId": 2001
}
```
规则：仅同校且具备 `student_manage` 权限的二级管理员可加入；学生绑定管理员默认已加入。

### 6.5 管理员退出会话
```
DELETE /chat/pairs/{pairId}/participants/{userId}
```

### 6.6 获取会话参与者列表
```
GET /chat/pairs/{pairId}/participants
```

## 7. 算法配置模块（管理员）

### 7.1 获取权重配置列表
```
GET /algorithm/weights
```

### 7.2 更新权重配置
```
PUT /algorithm/weights/{configId}
```
```json
{
  "weight": 0.8,
  "enabled": true
}
```

### 7.3 重新计算学生紧急权重
```
POST /algorithm/recalculate-weights
```

## 8. 数据统计模块（管理员）

### 8.1 平台概览数据
```
GET /admin/dashboard/overview
```
返回：总用户数、结对成功数、活跃会议数等

### 8.2 匹配成功率统计
```
GET /admin/statistics/match-success-rate
```
查询参数：`startDate`, `endDate`

### 8.3 区域分布统计
```
GET /admin/statistics/region-distribution
```

### 8.4 志愿者科目分布
```
GET /admin/statistics/subject-distribution
```

## 9. 志愿时长与纪要管理模块

### 9.1 提交服务记录（教师端）
POST /volunteer-records

请求参数：
```json
{
  "matchPairId": 1,
  "meetingId": 123, 
  "duration": 60, 
  "meetingDate": "2026-04-09",
  "serviceDesc": "讲解一元二次方程并批改作业",
  "evidenceImages": [
    "https://cdn.xxx.com/record/1.png"
  ],
  "aiSummary": "本次课程主要复习了二次函数，学生掌握良好，课后作业已布置。"
}
```

### 9.2 确认/拒绝服务记录（学生端）
PUT /volunteer-records/{recordId}/student-confirm
请求参数：

```json
{
  "action": "accept", // accept 或 reject
  "rejectReason": "时长不符，实际只上了40分钟" // action为reject时必填
}
```

### 9.3 获取待审核的记录列表（二级管理员端）
GET /admin/volunteer-records/pending
查询参数：schoolId, regionCode, page, size（根据管理员管辖范围及权限过滤）

### 9.4 审核服务记录（二级管理员端）
(需拥有 `student_manage` 权限)

PUT /admin/volunteer-records/{recordId}/audit
请求参数：

```json
{
  "action": "approve", // approve 或 reject
  "rejectReason": "纪要内容敷衍，请重新提交" // action为reject时必填
}
```

### 9.5 查询个人服务记录（通用）
GET /volunteer-records
查询参数：teacherId, studentId, status, page, size

## 权限说明
- 所有API需要根据用户角色进行权限校验
- 二级管理员在学生侧只能操作其管辖区域的数据
- 志愿者审核（`teacher_audit`）为跨区域能力，可由任意具备权限的二级管理员执行
- 志愿者和学生只能操作自己的数据
- 一级管理员拥有所有权限