# 城乡结对支教平台API设计

## API规范
- 基础路径：`/api/v1`
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
  "code": "微信登录code",
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
    "hasProfile": false // 是否已完善个人信息
  }
}
```

### 1.2 完善个人信息
根据用户角色调用不同的接口（见下方各角色模块）

### 1.3 退出登录
```
POST /auth/logout
```

### 1.4 刷新Token
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

#### 2.1.3 创建用户（管理员手动创建）
```
POST /admin/users
```
请求参数根据角色不同而不同

#### 2.1.4 更新用户状态
```
PUT /admin/users/{userId}/status
```
```json
{
  "status": 0
}
```

#### 2.1.5 分配二级管理员权限
```
POST /admin/secondary-admins
```
```json
{
  "userId": 1,
  "schoolId": 1,
  "regionCode": "510100",
  "permissions": ["student_audit", "student_manage"]
}
```

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

#### 2.3.1 学生注册（完善信息）
```
POST /student/profile
```
```json
{
  "realName": "真实姓名",
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

#### 2.3.2 获取学生个人信息
```
GET /student/profile
```

#### 2.3.3 更新学生信息
```
PUT /student/profile
```

#### 2.3.4 二级管理员代管学生

##### 2.3.4.1 为代管学生创建账号
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

##### 2.3.4.2 获取代管学生列表
```
GET /admin/students/managed
```

##### 2.3.4.3 切换当前操作的学生（代管模式）
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

### 3.7 处理解绑申请
```
PUT /match/{pairId}/unbind-process
```
```json
{
  "action": "accept" // accept 或 reject
}
```

### 3.8 获取结对详情
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

### 6.2 获取聊天记录
```
GET /chat/messages
```
查询参数：`matchPairId`, `lastMessageId`（用于分页）, `limit`（默认50）

### 6.3 标记消息已读
```
PUT /chat/messages/{messageId}/read
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

## 9. 系统管理模块

### 9.1 获取系统配置
```
GET /system/configs
```

### 9.2 更新系统配置
```
PUT /system/configs/{key}
```

## 10. 志愿时长与纪要管理模块

### 10.1 提交服务记录（教师端）
POST /volunteer-records

请求参数：
```json
{
  "matchPairId": 1,
  "meetingId": 123, 
  "duration": 60, 
  "meetingDate": "2026-04-09",
  "aiSummary": "本次课程主要复习了二次函数，学生掌握良好，课后作业已布置。"
}
```

### 10.2 确认/拒绝服务记录（学生端）
PUT /volunteer-records/{recordId}/student-confirm
请求参数：

```json
{
  "action": "accept", // accept 或 reject
  "rejectReason": "时长不符，实际只上了40分钟" // action为reject时必填
}
```

### 10.3 获取待审核的记录列表（二级管理员端）
GET /admin/volunteer-records/pending
查询参数：schoolId, regionCode, page, size（根据管理员管辖范围及权限过滤）

### 10.4 审核服务记录（二级管理员端）
(需拥有 volunteer_record_audit 权限)

PUT /admin/volunteer-records/{recordId}/audit
请求参数：

```json
{
  "action": "approve", // approve 或 reject
  "rejectReason": "纪要内容敷衍，请重新提交" // action为reject时必填
}
```

### 10.5 查询个人服务记录（通用）
GET /volunteer-records
查询参数：teacherId, studentId, status, page, size

## 权限说明
- 所有API需要根据用户角色进行权限校验
- 二级管理员只能操作其管辖区域的数据
- 志愿者和学生只能操作自己的数据
- 一级管理员拥有所有权限