# 后端接口缺口清单

本文档基于当前小程序前端与 `zhixingtongyi-lxy` / `zhixingtongyi-zyh` 后端 Controller、Service 实现核对整理。

目标是说明：哪些能力后端已经提供，哪些能力前端仍无法完全脱离 Mock / 本地 Store。

## 重要结论

- 学校不是枚举字段，后端有 `school` 表和 `School` 实体。
- 管理员资料不是完全没实现，后端有 `admin_profile` 表和 `POST /admin/secondary-admins` 写入逻辑。
- 待审接口不是全部缺失，匹配待审、志愿时长待审、审核动作已实现。
- 目前真正影响前端移除 Mock 的缺口主要集中在：学校查询、学生/教师待审资料列表与详情、管理员资料查询、L2 解绑待办列表。

## 已确认存在的相关接口

### 学校创建

```http
POST /admin/schools
```

说明：

- 仅 L1 管理员可创建学校。
- 当前未看到学校列表/详情查询接口。

### 二级管理员任命

```http
POST /admin/secondary-admins
```

说明：

- L1 管理员传入已有 `userId`，后端将该用户角色改为 L2 管理员。
- 同时创建或更新 `admin_profile`。
- 这是“手动任命二级管理员”能力，不是“管理员申请审核”流程。

请求字段来自 `SecondaryAdminRequest`：

```json
{
  "userId": 1,
  "realName": "管理员姓名",
  "schoolId": 1,
  "regionCode": "530000",
  "permissions": ["student_manage", "teacher_audit"]
}
```

### 用户管理

```http
GET /admin/users
GET /admin/users/{userId}
PUT /admin/users/{userId}/status
```

说明：

- 可按角色、状态、关键词分页查询用户。
- 详情返回 `User` 基础信息，不返回完整学生/教师/AdminProfile 资料。

### 学生/教师审核动作

```http
PUT /admin/students/{studentId}/audit
PUT /admin/teachers/{teacherId}/audit
```

说明：

- 审核动作已实现。
- 学生审核要求当前 L2 有 `student_manage` 权限且学校匹配。
- 教师审核要求当前 L2 有 `teacher_audit` 权限。
- 当前缺的是待审列表和完整资料详情。

### 志愿时长待审与审核

```http
GET /admin/volunteer-records/pending
PUT /admin/volunteer-records/{recordId}/audit
```

说明：

- 志愿时长待审列表和审核动作已实现。

### 匹配申请待审与处理

```http
GET /match/pending-applications
PUT /match/application/{applicationId}/process
```

说明：

- 志愿者可查看和处理匹配申请。

### 解绑流程

```http
POST /match/{pairId}/unbind-request
PUT /match/{pairId}/unbind-confirm
GET /match/{pairId}/unbind-progress
GET /match/{pairId}
```

说明：

- 支持学生/教师发起解绑。
- 支持学生、教师、指定 L2 管理员三方确认或拒绝。
- 支持已知 `pairId` 的进度查询和详情查询。
- 不支持 L2 管理员查询“待我确认的解绑申请列表”。

## 后端真实缺口

## P0：学校查询接口

### 当前后端实现

后端有 `School` 实体：

```java
@TableName("school")
public class School {
    private Long id;
    private String name;
    private String regionCode;
    private String address;
    private String contactPerson;
    private String contactPhone;
}
```

当前已有：

```http
POST /admin/schools
```

### 缺少接口

建议补充：

```http
GET /schools
GET /schools/{schoolId}
```

如果需要管理端路径，也可以是：

```http
GET /admin/schools
GET /admin/schools/{schoolId}
```

### 前端用途

- 入驻申请选择学校。
- 资料页选择学校。
- 二级管理员分配管辖学校。
- 审核详情展示学校名。
- 志愿时长、结对、会议中展示学校信息。

### 建议返回字段

```json
{
  "id": 1,
  "name": "学校名称",
  "regionCode": "530000",
  "address": "学校地址",
  "contactPerson": "联系人",
  "contactPhone": "联系电话"
}
```

### 备注

前端当前 `schoolsMock.js` 应理解为后端 `school` 表查询接口缺失时的临时兜底，不应长期保留。

## P0：学生待审资料列表与详情

### 当前后端实现

已实现审核动作：

```http
PUT /admin/students/{studentId}/audit
```

已实现 L2 代管学生相关接口：

```http
POST /admin/students/batch-create
GET /admin/students/managed
POST /admin/students/{studentId}/switch
```

### 缺少接口

建议补充：

```http
GET /admin/students/pending?page=&size=
GET /admin/students/{studentId}/profile
```

### 前端用途

- 平台/区域审核页展示学生待审列表。
- 审核详情页展示完整学生资料。
- 替换 `onboardingStore` 中学生待审 Mock 数据。

### 建议返回字段

```json
{
  "userId": 123,
  "realName": "学生姓名",
  "schoolId": 1,
  "schoolName": "学校名称",
  "grade": "五年级",
  "subjectsNeeded": ["数学", "英语"],
  "freeTime": [],
  "personalityDesc": "性格描述",
  "profileStatus": 1,
  "auditStatus": 0,
  "auditTime": null,
  "auditNotes": null,
  "updateTime": "2026-05-01 10:00:00"
}
```

### 是否能用已实现接口替代

只能部分替代。

当前前端可以用：

```http
GET /admin/users?role=3
```

但它只返回 `User` 基础信息，不能展示完整学生申请资料，也不能可靠筛出“待审学生资料”。

## P0：教师/志愿者待审资料列表与详情

### 当前后端实现

已实现审核动作：

```http
PUT /admin/teachers/{teacherId}/audit
```

### 缺少接口

建议补充：

```http
GET /admin/teachers/pending?page=&size=
GET /admin/teachers/{teacherId}/profile
```

### 前端用途

- 平台/区域审核页展示志愿者待审列表。
- 审核详情页展示完整志愿者资料。
- 替换 `onboardingStore` 中教师待审 Mock 数据。

### 建议返回字段

```json
{
  "userId": 456,
  "realName": "志愿者姓名",
  "school": "学校名称",
  "grade": "本科",
  "skilledSubjects": ["数学", "物理"],
  "freeTime": [],
  "personalSkills": "能力说明",
  "personalityDesc": "性格描述",
  "certificationStatus": 0,
  "auditTime": null,
  "auditNotes": null
}
```

### 是否能用已实现接口替代

只能部分替代。

当前前端可以用：

```http
GET /admin/users?role=2
```

但它只返回 `User` 基础信息，不能展示完整教师/志愿者资料，也不能可靠筛出“待审资料”。

## P0：管理员资料查询接口

### 当前后端实现

后端有 `AdminProfile` 实体：

```java
@TableName("admin_profile")
public class AdminProfile {
    private Long id;
    private Long userId;
    private String realName;
    private Long schoolId;
    private String regionCode;
    private String permissions;
}
```

并且 `POST /admin/secondary-admins` 会创建或更新 `admin_profile`。

### 缺少接口

建议补充：

```http
GET /admin/profile/me
```

或：

```http
GET /admin/secondary-admins/me
GET /admin/secondary-admins/{userId}
```

### 前端用途

- 判断当前 L2 管辖学校。
- 判断当前 L2 权限，如 `student_manage`、`teacher_audit`。
- 替换本地 `userProfileStore.l2Scope`、`permissions`、`schoolId` 判断。
- 决定区域管理、审核、解绑、聊天旁听等页面权限。

### 建议返回字段

```json
{
  "userId": 2,
  "realName": "二级管理员",
  "schoolId": 1,
  "schoolName": "学校名称",
  "regionCode": "530000",
  "permissions": ["student_manage", "teacher_audit"]
}
```

### 备注

当前后端没有 `scopeType` 字段。前端原来的 `recipient_side` / `volunteer_side` 是本地测试概念。正式逻辑建议以后端 `permissions` 和 `schoolId` 为准。

## P1：L2 解绑待办列表

### 当前后端实现

已实现单个结对维度的解绑流程：

```http
POST /match/{pairId}/unbind-request
PUT /match/{pairId}/unbind-confirm
GET /match/{pairId}/unbind-progress
GET /match/{pairId}
```

解绑发起时，后端会从学生资料取：

```java
studentProfile.bindAdminId
```

写入：

```java
unbindAdminId
```

后续只有该学生、该教师、该 `unbindAdminId` 可以查看进度或确认。

### 缺少接口

建议补充：

```http
GET /match/unbind-requests/pending
```

或管理端路径：

```http
GET /admin/match/unbind-requests/pending
```

### 前端用途

- L2 管理员进入解绑页面时，查看“待我确认”的解绑申请列表。
- 替换 `pairingStore.getUnbindListForRecipientL2()`。

### 建议查询逻辑

按当前登录用户过滤：

```text
unbind_admin_id = currentUserId
AND match_status = UNBIND_CONFIRMING
```

### 建议返回字段

```json
{
  "pairId": 1001,
  "studentId": 123,
  "studentName": "学生姓名",
  "teacherId": 456,
  "teacherName": "志愿者姓名",
  "unbindRequestBy": 123,
  "unbindRequestTime": "2026-05-01 10:00:00",
  "studentUnbindConfirm": 1,
  "teacherUnbindConfirm": 0,
  "adminUnbindConfirm": 0,
  "unbindRejectReason": null,
  "matchStatus": 3
}
```

### 是否能用已实现接口替代

不能完整替代。

如果前端已经知道 `pairId`，可以用已实现接口：

```http
GET /match/{pairId}/unbind-progress
PUT /match/{pairId}/unbind-confirm
```

但 L2 管理员没有办法通过现有接口知道“哪些 `pairId` 等我确认”。因此列表页必须补接口，或由其他接口返回这些 pairId。

## P1：管理端聊天会话列表

### 当前后端实现

已实现单个会话消息相关接口：

```http
GET /chat/messages?matchPairId=
POST /chat/messages
PUT /chat/messages/{messageId}/read
GET /chat/pairs/{pairId}/participants
POST /chat/pairs/{pairId}/participants
DELETE /chat/pairs/{pairId}/participants/{targetUserId}
```

学生/教师端可以通过：

```http
GET /match/my-pairs?status=1
```

拿到自己的结对，再进入聊天。

### 缺少接口

建议补充：

```http
GET /admin/chat/conversations
```

或通用路径：

```http
GET /chat/conversations
```

### 前端用途

- L1 管理员查看所有或可管理范围内的会话。
- L2 管理员查看本校/有权限范围内的会话。
- 替换 `chatPartners.js` 管理端会话 Mock。

### 建议返回字段

```json
{
  "matchPairId": 1001,
  "studentId": 123,
  "studentName": "学生姓名",
  "teacherId": 456,
  "teacherName": "志愿者姓名",
  "schoolId": 1,
  "schoolName": "学校名称",
  "lastMessage": "最近一条消息",
  "lastMessageTime": "2026-05-01 10:00:00",
  "unreadCount": 2
}
```

### 是否能用已实现接口替代

学生/教师端可以替代，管理端不能完整替代。

原因：管理端缺少“我可见的会话列表”。只有已知 `matchPairId` 后才能读消息。

## P2：志愿服务记录详情接口

### 当前后端实现

已实现列表查询：

```http
GET /volunteer-records
```

已实现学生确认：

```http
PUT /volunteer-records/{recordId}/student-confirm
```

已实现管理端待审和审核：

```http
GET /admin/volunteer-records/pending
PUT /admin/volunteer-records/{recordId}/audit
```

### 缺少接口

建议补充：

```http
GET /volunteer-records/{recordId}
```

### 前端用途

- 审核详情页直接读取单条服务记录。
- 避免前端从分页列表里查找某个 ID。
- 展示完整服务说明、证据图片、AI 总结、审核信息。

### 是否能用已实现接口替代

可以临时替代，但不理想。

当前前端已经使用：

```http
GET /volunteer-records
```

再从列表中按 ID 查找记录。

问题：

- 如果目标记录不在第一页，需要额外分页查找。
- 性能和稳定性都不如详情接口。

## P2：学生待确认服务记录列表

### 当前后端实现

已实现：

```http
GET /volunteer-records
PUT /volunteer-records/{recordId}/student-confirm
```

### 可能缺少接口

如果 `GET /volunteer-records` 不支持按当前学生和状态筛选，则建议补充：

```http
GET /volunteer-records/pending-student-confirm
```

或明确支持：

```http
GET /volunteer-records?status=0
```

### 前端用途

- 学生查看待确认志愿服务记录。
- 学生确认或拒绝服务记录。

### 是否能用已实现接口替代

取决于 `GET /volunteer-records` 的实际筛选能力。

如果它已经基于当前用户返回相关记录，并支持 `status` 参数，则不需要新增接口。

## 暂不作为核心缺口的内容

## 管理员申请接口

当前前端没有正式管理员申请界面，只保留本地测试数据。因此暂不把以下接口列为核心必需：

```http
POST /admin-applications
GET /admin-applications/pending
GET /admin-applications/{id}
PUT /admin-applications/{id}/audit
```

如果后续产品需要“用户主动申请成为管理员，再由 L1 审核”，再补这组接口。

当前已有 `POST /admin/secondary-admins` 可以支持 L1 手动任命 L2 管理员。

## 风险预警接口

平台风险页面目前仍是演示能力。若后续要真实化，可新增：

```http
GET /admin/risks
GET /admin/risks/{riskId}
PUT /admin/risks/{riskId}/process
```

当前不影响核心注册、匹配、时长、解绑流程。

## 最小补齐列表

如果目标是支持前端删除主要 Mock，建议优先补齐：

1. 学校查询

```http
GET /schools
GET /schools/{schoolId}
```

2. 学生资料审核列表与详情

```http
GET /admin/students/pending?page=&size=
GET /admin/students/{studentId}/profile
```

3. 教师资料审核列表与详情

```http
GET /admin/teachers/pending?page=&size=
GET /admin/teachers/{teacherId}/profile
```

4. 当前管理员资料/权限

```http
GET /admin/profile/me
```

5. L2 解绑待办列表

```http
GET /match/unbind-requests/pending
```

6. 管理端聊天会话列表

```http
GET /admin/chat/conversations
```

7. 志愿服务记录详情

```http
GET /volunteer-records/{recordId}
```

## 前端当前可继续使用的替代方案

| 场景 | 已有接口 | 是否足够 |
|---|---|---|
| 学生/教师聊天 | `GET /match/my-pairs` + `/chat/messages` | 足够 |
| 管理端聊天 | 已知 `matchPairId` 后可读消息 | 不足，缺会话列表 |
| 学生/教师解绑 | `/match/{pairId}/unbind-*` | 足够 |
| L2 处理解绑 | 已知 `pairId` 后可处理 | 不足，缺待办列表 |
| 志愿时长审核 | `/admin/volunteer-records/pending` + audit | 足够 |
| 学生/教师审核动作 | audit 接口 | 动作足够，列表/详情不足 |
| L1 任命 L2 | `POST /admin/secondary-admins` | 足够 |
| 学校选择展示 | 仅有创建接口 | 不足，缺查询 |
