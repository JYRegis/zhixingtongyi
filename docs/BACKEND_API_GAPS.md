
### `GET /chat/pairs/{pairId}/participants` 和 `ChatMessageVO` 缺少姓名字段

**现象**

管理员进入聊天室查看消息时，所有消息发送者都显示为「学员」「志愿者」等角色标签，无法看到真实姓名。

**根因**

1. `GET /chat/pairs/{pairId}/participants` 返回的是 `ChatParticipant` 实体，只有 `userId` 和 `participantRole`，没有 `realName`。

2. `ChatMessageVO` 只有 `senderId`，没有 `senderName`。

**修复建议**

方案 A：participants 接口返回姓名（推荐）

在 participants 查询时 JOIN `student_profile` / `teacher_profile` / `admin_profile` 取 `real_name`：

```java
// 返回 VO 而非原始实体
public class ChatParticipantVO {
    private Long userId;
    private Integer participantRole;
    private String realName;  // 新增
    private LocalDateTime joinedTime;
}
```

方案 B：ChatMessageVO 增加 senderName

```java
public class ChatMessageVO {
    private Long id;
    private Long matchPairId;
    private Long senderId;
    private String senderName;  // 新增
    private Integer messageType;
    private String content;
    private LocalDateTime sendTime;
    private LocalDateTime readTime;
}
```

在查询消息时 JOIN profile 表填充 `senderName`。

**前端临时方案**

前端先调 `GET /chat/pairs/{pairId}/participants` 获取参与者列表，如果返回了 `realName` 则用姓名显示，否则按 `participantRole` 显示角色标签（学员/志愿者/管理员）。


### `phoneLogin` 接口被滥用为「修改账号信息」导致严重数据污染

**现象**

前端「资料与账号」页面修改昵称/头像/手机号时，调用 `POST /auth/phone-login` 接口，导致：

1. 修改昵称：phoneLogin 内部更新当前用户的 username（实际是昵称）和 avatar
2. 修改头像：同上
3. 修改手机号：传入新手机号 → 后端走「老用户登录」分支 →
   - 如果新手机号已存在，**登录态切换到该用户**，且新昵称/头像被错误地写入对方账号
   - 当前用户的手机号实际未变更

> 注：同样的越权覆盖逻辑也存在于 `AuthServiceImpl.wxLogin`（老用户登录分支会用 `request.getUserInfo().getNickName()` / `getAvatarUrl()` 覆盖 username/avatar），修复时需要一并处理。

**后端日志示例**

```
phone-login request received, phone=130****5201
SELECT ... FROM user WHERE phone = '13046605201'  -- 找到 9042 用户
phone-login processing, phone=130****5201, isNewUser=false
UPDATE user SET username=?, password=?, avatar=?, ... WHERE id=9042  
-- 把当前登录用户的资料强行写入 9042 用户
phone-login success, userId=9042
```

**根因**

`AuthServiceImpl.phoneLogin` 应该只负责「登录或注册」，不应该在已存在的用户上做 UPDATE。但当前实现对 `isNewUser=false` 的用户也做了 UPDATE，并且使用请求体里的 `nickName/avatarUrl` 覆盖现有数据。

更严重的是：phoneLogin **没有验证调用者身份**——任何人传一个手机号都能修改对应用户的 username 和 avatar。

**修复建议**

方案 A：phoneLogin 老用户登录时不更新任何字段

```java
if (!isNewUser) {
    // 仅生成 token 返回，不修改任何字段
    return buildLoginResponse(...);
}
```

方案 B：新增专门的资料更新接口

```http
PUT /auth/me
Body: { nickname?, avatarUrl? }  -- 不允许改 phone
```

只允许更新当前登录用户（从 token 取 userId），且不能修改 phone 和 wechatOpenid。

方案 C：手机号绑定后不可修改

业务上手机号是唯一身份标识，不应支持修改。前端禁用此入口。

**前端临时方案**

前端已禁用「修改手机号」入口，「修改昵称/头像」改为只更新本地缓存（不再调用 phoneLogin），等后端提供专门的资料更新接口后再接入。


### L1 管理员无法读取聊天消息

**现象**

L1 管理员在聊天列表能看到所有会话（`GET /admin/chat/conversations` 已实现并返回 L1 的所有会话），但点击进入聊天室时报错：

```
您不是该会话的参与者或已退出会话
```

**根因**

后端 `ChatServiceImpl.getMessages` 严格要求当前用户必须存在于 `chat_participant` 表中：

```java
ChatParticipant participant = chatParticipantMapper.selectOne(
    new LambdaQueryWrapper<ChatParticipant>()
        .eq(ChatParticipant::getMatchPairId, matchPairId)
        .eq(ChatParticipant::getUserId, userId)
        .isNull(ChatParticipant::getLeftTime)
);
if (participant == null) {
    throw new BusinessException("您不是该会话的参与者或已退出会话");
}
```

而 L1 管理员（role=0）在系统中是平台运营，**不应该被自动加入每个聊天的 `chat_participant`**。但 L1 应该有权限查看所有聊天用于监督。

`listAdminConversations` 对 L1 放行返回了所有会话列表，但 `getMessages` 没有对 L1 做同样的放行，导致流程不一致。

**修复建议**

`ChatServiceImpl.getMessages` 和 `getParticipants` 增加 L1 放行逻辑：

```java
public List<ChatMessageVO> getMessages(Long userId, Long matchPairId, ...) {
    User user = userAccessService.requireUser(userId);
    
    // L1 管理员：直接放行（监督所有会话）
    if (user.getRole() != null && user.getRole() == UserRole.L1_ADMIN.getCode()) {
        // 跳过 chat_participant 检查
    } else {
        // L2/学员/志愿者：必须是参与者
        ChatParticipant participant = chatParticipantMapper.selectOne(...);
        if (participant == null) {
            throw new BusinessException("您不是该会话的参与者或已退出会话");
        }
    }
    // ... 原有的查询消息逻辑
}
```

**影响范围**

- `GET /chat/messages` - L1 无法读消息
- `GET /chat/pairs/{pairId}/participants` - L1 可能也无法查看参与者
- `PUT /chat/messages/{messageId}/read` - L1 无法标记已读（但 L1 不需要发消息和标记已读）

**前端临时方案**

无前端临时方案——必须后端修复。当前 L1 管理员点击聊天会话会显示「您不是该会话的参与者或已退出会话」错误。


### L1 管理员的志愿时长待审列表为空

**现象**

L1 管理员（13900009001）进入「认定义务时长」页面，列表始终为空。后端不报错，但 SQL 查询结果为 0 条。

**根因**

`VolunteerRecordMapper.xml` 中 `selectPendingBySchool` SQL：

```xml
<select id="selectPendingBySchool" resultType="...">
    SELECT ...
    FROM volunteer_record vr
    LEFT JOIN teacher_profile t ON vr.teacher_id = t.user_id
    LEFT JOIN student_profile s ON vr.student_id = s.user_id
    WHERE s.school_id = #{schoolId}
      AND vr.status = 1
    ORDER BY vr.create_time DESC
</select>
```

`VolunteerRecordServiceImpl.getPendingRecords` 对 L1 管理员不强制 `schoolId`：

```java
if (user.getRole() == UserRole.L2_ADMIN.getCode()) {
    // L2: 取管辖学校 ID
    if (filterSchoolId == null) {
        // 从 admin_profile 取
    }
} else if (user.getRole() != UserRole.L1_ADMIN.getCode()) {
    throw new BusinessException("无权限操作");
}
// L1 走到这里 filterSchoolId 仍为 null
```

L1 调用时传入 `schoolId = null`，SQL 变成：

```sql
WHERE s.school_id = NULL  -- 永远为 false
```

导致 L1 看不到任何待审记录。

**修复建议**

`selectPendingBySchool` SQL 增加 null 判断：

```xml
<select id="selectPendingBySchool" resultType="...">
    SELECT ...
    FROM volunteer_record vr
    LEFT JOIN teacher_profile t ON vr.teacher_id = t.user_id
    LEFT JOIN student_profile s ON vr.student_id = s.user_id
    <where>
        vr.status = 1
        <if test="schoolId != null">
            AND s.school_id = #{schoolId}
        </if>
    </where>
    ORDER BY vr.create_time DESC
</select>
```

这样 L1（schoolId=null）查所有待审，L2 按管辖学校过滤。

**前端临时方案**

无前端临时方案——必须后端修复。


### `pendingTeachers` 不支持按学校筛选，且 `teacher_profile.school` 用字符串而非 schoolId

**现象**

L1 管理员的志愿者审核页面无法按学校筛选。后端 `GET /admin/teachers/pending` 接口不接受 `schoolId` 参数。

**根因**

1. 后端 `AdminServiceImpl.pendingTeachers` 没有学校过滤逻辑：

```java
public PageResponse<TeacherVO> pendingTeachers(Long operatorId, Long page, Long size) {
    LambdaQueryWrapper<TeacherProfile> wrapper = new LambdaQueryWrapper<TeacherProfile>()
            .eq(TeacherProfile::getCertificationStatus, AuditStatus.PENDING.getCode())
            .orderByDesc(TeacherProfile::getUpdateTime);
    // 无学校过滤
    Page<TeacherProfile> p = teacherProfileMapper.selectPage(...);
    ...
}
```

2. 数据模型问题：`teacher_profile.school` 是 `String`（学校名字符串），不像 `student_profile` 用 `school_id` 关联 `school` 表。

**修复建议**

方案 A：将 `teacher_profile.school` 改为 `school_id`（推荐，统一数据模型）

修改 `init.sql`：

```sql
-- 修改前
`school` varchar(128) NOT NULL COMMENT '所在学校（志愿者所属学校）',

-- 修改后
`school_id` bigint NOT NULL COMMENT '所在学校ID',
KEY `idx_school_id` (`school_id`),
CONSTRAINT `fk_teacher_school_id` FOREIGN KEY (`school_id`) REFERENCES `school` (`id`)
```

修改 `TeacherProfile` PO、`TeacherVO`、`TeacherProfileRequest` 把 `school` 字段改成 `schoolId: Long`。

`pendingTeachers` 接口增加 `schoolId` 参数：

```java
@GetMapping("/teachers/pending")
public ApiResponse<PageResponse<TeacherVO>> pendingTeachers(
        @RequestParam(required = false) Long page,
        @RequestParam(required = false) Long size,
        @RequestParam(required = false) Long schoolId) {
    ...
}

// Service
LambdaQueryWrapper<TeacherProfile> wrapper = new LambdaQueryWrapper<TeacherProfile>()
        .eq(TeacherProfile::getCertificationStatus, AuditStatus.PENDING.getCode());
if (schoolId != null) {
    wrapper.eq(TeacherProfile::getSchoolId, schoolId);
}
```

方案 B：保留字符串 `school`，但接口支持按学校名过滤（不推荐）

```java
public PageResponse<TeacherVO> pendingTeachers(..., String school) {
    LambdaQueryWrapper<TeacherProfile> wrapper = ...;
    if (school != null && !school.isBlank()) {
        wrapper.eq(TeacherProfile::getSchool, school);
    }
}
```

字符串匹配不精确，前端需要从已知学校列表里选名字传给后端。

**前端用途**

L1 管理员在志愿者审核页面加学校 picker，选择学校后只展示该学校待审志愿者，便于跨校管理。

**前端临时方案**

在后端补字段/参数前，前端 L1 看到的是所有待审志愿者列表，无法按学校筛选。




### `selectManagedStudents` SQL 没有返回 `schoolName`

**现象**

L2 管理员的「学生注册审核」页面学校名显示为「—」（前端兜底文案），看不到真实的学校名。

**根因**

`StudentProfileMapper.xml` 中 `selectManagedStudents` SQL 没有 JOIN `school` 表，VO 的 `schoolName` 字段为 null：

```xml
<select id="selectManagedStudents" parameterType="long" resultType="com.rural.education.vo.StudentVO">
    SELECT
    <include refid="studentProfileColumns"/>,
    u.username,
    u.phone
    FROM student_profile sp
    JOIN user u ON sp.user_id = u.id
    WHERE sp.bind_admin_id = #{adminId}
    ORDER BY sp.update_time DESC
</select>
```

只 JOIN 了 `user` 表，没 JOIN `school` 表，所以无法返回 schoolName 字段。

**修复建议**

```xml
<select id="selectManagedStudents" parameterType="long" resultType="com.rural.education.vo.StudentVO">
    SELECT
    <include refid="studentProfileColumns"/>,
    u.username,
    u.phone,
    sc.name AS schoolName
    FROM student_profile sp
    JOIN user u ON sp.user_id = u.id
    LEFT JOIN school sc ON sp.school_id = sc.id
    WHERE sp.bind_admin_id = #{adminId}
    ORDER BY sp.update_time DESC
</select>
```

`pendingStudents` 接口已通过 `toStudentVO` 方法手动 select school 表填充 schoolName，但 `managedStudents` 走的是直接的 SQL `resultType` 映射，需要在 SQL 里直接 JOIN。

**前端临时方案**

前端 `vo.schoolName || "—"` 兜底显示「—」。后端 SQL 加 JOIN 后会自动正确显示。


### 志愿者审核归属角色不清晰，需后端明确权限边界

**业务规则**

- **支教方 L2 管理员**：审核本校志愿者（teacher_profile.school 是该 L2 管辖的支教方学校）
- **受援方 L2 管理员**：只审核本校学生，**不应**审核志愿者
- **L1 管理员**：审核所有

**当前后端问题**

`AdminServiceImpl.pendingTeachers` 没有任何学校或角色过滤逻辑：

```java
public PageResponse<TeacherVO> pendingTeachers(Long operatorId, Long page, Long size) {
    LambdaQueryWrapper<TeacherProfile> wrapper = new LambdaQueryWrapper<TeacherProfile>()
            .eq(TeacherProfile::getCertificationStatus, AuditStatus.PENDING.getCode())
            .orderByDesc(TeacherProfile::getUpdateTime);
    // 任何 L2 都能查到所有待审志愿者
}
```

任何 L2（无论支教方还是受援方）调用都会返回**所有学校**的待审志愿者，权限不严格。

**修复建议**

1. 数据模型先解决：将 `teacher_profile.school` 改为 `school_id`（参考前面的 gap 条目）

2. `pendingTeachers` 增加学校过滤：

```java
public PageResponse<TeacherVO> pendingTeachers(Long operatorId, Long page, Long size, Long schoolId) {
    User operator = userMapper.selectById(operatorId);
    LambdaQueryWrapper<TeacherProfile> wrapper = new LambdaQueryWrapper<TeacherProfile>()
            .eq(TeacherProfile::getCertificationStatus, AuditStatus.PENDING.getCode());
    if (operator.getRole() == UserRole.L2_ADMIN.getCode()) {
        AdminProfile admin = adminProfileMapper.selectOne(...);
        if (admin == null || admin.getSchoolId() == null) {
            throw new BusinessException("L2 管理员未配置管辖学校");
        }
        // 只查本校志愿者
        wrapper.eq(TeacherProfile::getSchoolId, admin.getSchoolId());
    } else if (schoolId != null) {
        // L1 可以按学校筛选
        wrapper.eq(TeacherProfile::getSchoolId, schoolId);
    }
    // L1 无 schoolId 时返回所有
    ...
}
```

3. 区分支教方/受援方 L2：

```java
// 假设 admin_profile.school_id 关联的 school 表有 type 字段（support/recipient）
// 或在 admin_profile 增加 scope 字段
School school = schoolMapper.selectById(admin.getSchoolId());
if (!"support".equals(school.getType())) {
    throw new BusinessException("受援方管理员不能审核志愿者");
}
```

**前端配套改动**

前端已删除受援方 L2 的「志愿者注册审核」入口（`pages/admin/region/index` 不再显示志愿者列表）。后端权限边界明确后，可以为支教方 L2 单独创建审核入口。


### `getPendingRecords` 返回 records 为空但 total=2

**现象**

L2 管理员查询志愿时长待审记录时，后端日志显示 SQL 查询返回了 2 条记录，但 HTTP 响应里 `records: []` 是空数组：

```json
{"records": [], "total": 2, "current": 1, "size": 50, "pages": 1}
```

**根因**

`VolunteerRecordServiceImpl.getPendingRecords` 调用自定义 SQL 后没有把查询结果设置回 Page 对象：

```java
Page<VolunteerRecordVO> mpPage = new Page<>(current, pageSize);
volunteerRecordMapper.selectPendingBySchool(mpPage, filterSchoolId);  // 返回值被忽略
return mpPage;  // records 仍是空数组
```

`selectPendingBySchool` 的签名是 `List<VolunteerRecordVO> selectPendingBySchool(Page page, ...)`，MyBatis-Plus 分页插件会自动填充 total，但 records 需要手动从返回值赋值回 Page。

**修复建议**

```java
Page<VolunteerRecordVO> mpPage = new Page<>(current, pageSize);
List<VolunteerRecordVO> list = volunteerRecordMapper.selectPendingBySchool(mpPage, filterSchoolId);
mpPage.setRecords(list);
return mpPage;
```

**前端临时方案**

无前端临时方案——必须后端修复。当前 L2 管理员的「认定义务时长」页面始终显示空。


### `pairDetail` 和 `unbindProgress` 缺少多个关键字段

**现象**

解绑详情页面：
- 「结对双方」显示「学员 — 志愿者」（占位符），看不到真实姓名
- 「发起方」显示空白
- 「解绑原因」显示空（当前 `match_pair` 实体没有 `unbindReason` 字段，无法展示发起原因；只有拒绝场景的 `unbindRejectReason` 在 `unbindProgress` 已暴露）

**根因**

后端 `MatchServiceImpl.pairDetail` 返回的 `MatchPairVO` 缺少：

```java
vo.setId(pair.getId());
vo.setStudentId(pair.getStudentId());
vo.setTeacherId(pair.getTeacherId());
// 没有 setStudentName / setTeacherName
```

后端 `MatchServiceImpl.unbindProgress` 返回的 `MatchPairVO` 缺少：

```java
vo.setPairId(pair.getId());
vo.setMatchStatus(pair.getMatchStatus());
// 缺少：setStudentId, setTeacherId, setStudentName, setTeacherName
// 缺少：setUnbindRequestBy（发起方ID）, setUnbindRequestTime
// 缺少：setUnbindReason（解绑原因）
```

**修复建议**

1. `pairDetail` 增加姓名 JOIN：

```java
public MatchPairVO pairDetail(Long userId, Long pairId) {
    // ... 原有逻辑
    MatchPairVO vo = new MatchPairVO();
    vo.setId(pair.getId());
    vo.setStudentId(pair.getStudentId());
    vo.setTeacherId(pair.getTeacherId());
    // 新增：填充姓名
    StudentProfile sp = studentProfileMapper.selectOne(
        new LambdaQueryWrapper<StudentProfile>().eq(StudentProfile::getUserId, pair.getStudentId())
    );
    if (sp != null) vo.setStudentName(sp.getRealName());
    TeacherProfile tp = teacherProfileMapper.selectOne(
        new LambdaQueryWrapper<TeacherProfile>().eq(TeacherProfile::getUserId, pair.getTeacherId())
    );
    if (tp != null) vo.setTeacherName(tp.getRealName());
    // ... 其他字段
    return vo;
}
```

2. `unbindProgress` 增加发起方信息和姓名：

```java
public MatchPairVO unbindProgress(Long userId, Long pairId) {
    // ... 原有逻辑
    MatchPairVO vo = new MatchPairVO();
    vo.setPairId(pair.getId());
    vo.setStudentId(pair.getStudentId());      // 新增
    vo.setTeacherId(pair.getTeacherId());      // 新增
    vo.setMatchStatus(pair.getMatchStatus());
    vo.setUnbindRequestBy(pair.getUnbindRequestBy());      // 新增
    vo.setUnbindRequestTime(pair.getUnbindRequestTime());  // 新增
    // 注：MatchPair 实体目前没有 unbindReason 字段（只有拒绝场景的 unbindRejectReason），
    //     发起原因若需展示，需要先在 match_pair 表/实体新增 unbind_reason 列，再在 unbindRequest 时落库。
    vo.setStudentUnbindConfirm(pair.getStudentUnbindConfirm());
    vo.setTeacherUnbindConfirm(pair.getTeacherUnbindConfirm());
    vo.setAdminUnbindConfirm(pair.getAdminUnbindConfirm());
    // 填充姓名（同上）
    StudentProfile sp = studentProfileMapper.selectOne(...);
    if (sp != null) vo.setStudentName(sp.getRealName());
    TeacherProfile tp = teacherProfileMapper.selectOne(...);
    if (tp != null) vo.setTeacherName(tp.getRealName());
    // ... 其他字段
    return vo;
}
```

或者直接复用 `populateNames` 方法（如果存在）统一填充。

**前端临时方案**

前端通过 `studentUnbindConfirm` / `teacherUnbindConfirm` 状态推断发起方（谁先确认就是谁发起的），双方姓名用「学员/志愿者」作为占位。后端补全字段后自动正确显示。


### `selectRecommendations` 返回的 `freeTime` 和 `skilledSubjects` 为 null

**现象**

学员进入匹配中心，志愿者卡片：
- 「可授课时间」显示为「—」
- 「擅长科目」显示为「综合」（兜底）

后端返回的 JSON：

```json
{
  "realName": "张明远",
  "school": "厦门大学",
  "grade": "大三",
  "freeTime": null,           // 应该有值
  "skilledSubjects": null,    // 应该有值
  "teacherId": 9010,
  "matchScore": 0.36
}
```

**根因**

`TeacherProfileMapper.xml` 中 `selectRecommendations` SQL：

```xml
<select id="selectRecommendations" resultType="com.rural.education.vo.TeacherVO">
    SELECT user_id AS teacherId,
           real_name AS realName,
           school,
           grade,
           skilled_subjects AS skilledSubjects,
           free_time AS freeTime
    FROM teacher_profile
    ...
</select>
```

但 `TeacherVO` 的字段类型是：

```java
private List<Map<String, Object>> freeTime;
private List<Object> skilledSubjects;
```

数据库 `teacher_profile.skilled_subjects` 和 `free_time` 是 `String`（存 JSON 字符串），MyBatis 无法直接把 String 映射到 `List`，于是设为 null。

**修复建议**

方案 A：在 Service 层手动解析（推荐）

```java
public List<TeacherVO> recommendations(Long userId) {
    // ... 原有逻辑
    List<TeacherVO> list = teacherProfileMapper.selectRecommendations();
    list.forEach(t -> {
        // 假设 selectRecommendations 返回 String，VO 用 Object 接收
        if (t.getFreeTime() instanceof String) {
            t.setFreeTime(parseJsonMapList((String) t.getFreeTime()));
        }
        if (t.getSkilledSubjects() instanceof String) {
            t.setSkilledSubjects(parseJsonList((String) t.getSkilledSubjects()));
        }
    });
    return list;
}
```

方案 B：SQL 用 resultMap 配合 typeHandler 自动转换 JSON String 到 List。

方案 C：把 `TeacherVO.freeTime` 和 `skilledSubjects` 改为 `Object` 类型（前端兜底解析）。

**前端临时方案**

前端 `parseFreeTimeField` 函数已支持多种格式（数组、JSON 字符串、序列化字符串），但接收到 null 仍然会返回空。后端补上后会自动正确显示。


### `Meeting` 实体缺少会议密码字段（可选）

**业务需求**

腾讯会议、Zoom 等第三方会议工具通常需要「会议号 + 密码」才能入会。当前后端 `meeting` 表只有 `meeting_link` 一个字段，用户必须把密码塞进链接里或在备注中说明，体验不友好。

**修复建议（可选实现）**

1. 数据库 `meeting` 表新增字段：

```sql
ALTER TABLE `meeting`
ADD COLUMN `meeting_password` VARCHAR(64) DEFAULT NULL COMMENT '会议密码（可选）'
AFTER `meeting_link`;
```

2. `Meeting` 实体增加字段：

```java
@Data
public class Meeting {
    private String meetingLink;
    private String meetingPassword;  // 新增
    // ...
}
```

3. `MeetingVO` 增加字段：

```java
public class MeetingVO {
    private String meetingLink;
    private String meetingPassword;  // 新增
    // ...
}
```

4. `CreateMeetingRequest` 增加字段：

```java
public class CreateMeetingRequest {
    private String meetingLink;
    private String meetingPassword;  // 新增，可选
    // ...
}
```

5. 在 `MeetingServiceImpl.createMeeting` 中保存该字段。

**前端配套改动**

- 新建会议页面增加「会议密码」输入框（可选）
- 会议详情/列表显示时，如果有密码，单独展示一行：「会议密码：XXX」（支持复制）

**优先级**

P3 / 可选。当前用户可以把密码拼接在「会议链接 / 会议码」字段里，业务上能跑通。



---

### `POST /match/{pairId}/unbind-request` 发起人应自动计为「已确认」

**现象**

学员/志愿者发起解绑申请后，进入解绑详情页，仍然看到「我同意解绑 / 不同意」按钮，被要求对自己刚刚发起的申请再次确认。

**根因**

`MatchServiceImpl.unbindRequest` 在切换 `matchStatus = UNBIND_CONFIRMING` 时，把 `studentUnbindConfirm`、`teacherUnbindConfirm`、`adminUnbindConfirm` 三方都重置为 0，包括发起人自己。这意味着发起人也必须再次调用 `unbind-confirm` 才能让流程完整推进，体验上很奇怪（自己同意自己的申请）。

**期望修复**

发起人对应的确认位在 `unbindRequest` 时直接置 1，并写入 `*UnbindConfirmTime`：

```java
boolean isStudent = userId.equals(pair.getStudentId());
boolean isTeacher = userId.equals(pair.getTeacherId());
LambdaUpdateWrapper<MatchPair> wrapper = new LambdaUpdateWrapper<MatchPair>()
        .eq(MatchPair::getId, pairId)
        .set(MatchPair::getMatchStatus, MatchStatus.UNBIND_CONFIRMING.getCode())
        .set(MatchPair::getUnbindRequestBy, userId)
        .set(MatchPair::getUnbindRequestTime, LocalDateTime.now())
        .set(MatchPair::getStudentUnbindConfirm, isStudent ? 1 : 0)
        .set(MatchPair::getTeacherUnbindConfirm, isTeacher ? 1 : 0)
        .set(MatchPair::getAdminUnbindConfirm, 0)
        .set(MatchPair::getStudentUnbindConfirmTime, isStudent ? LocalDateTime.now() : null)
        .set(MatchPair::getTeacherUnbindConfirmTime, isTeacher ? LocalDateTime.now() : null)
        .set(MatchPair::getAdminUnbindConfirmTime, null);
matchPairMapper.update(null, wrapper);
```

**前端临时绕过**

`pages/match/unbind-detail/index.js` 当前会：

1. 在调用 `unbindRequest` 成功后，把当前 `userId` 写入 `wx.storage.unbindInitiators[pairId]`。
2. 进入详情页时如果识别出当前用户是发起人但其确认位仍为 0，则自动调用一次 `unbindConfirm({ action: "accept" })`，避免再问一遍。
3. 发起人页面隐藏「同意/不同意」按钮，改为显示「您是发起方，已自动同意」徽标。

后端落地修复后，前端的本地标记和自动 accept 逻辑可以直接保留（幂等，对已确认的发起人不会再触发自动调用）。


---

### 实时消息推送通道：WebSocket 端点 `/ws/notifications`（可实现，优先级 P3）

**现状**

后端已有完整的「消息生成」机制（`NotificationEvent` → RabbitMQ → 入库 `message_notification`），前端通过 `GET /notifications?unreadOnly=1` 拉取。前端目前实现了 30 秒短轮询 + 顶部横幅 + 自定义 tabBar 红点（见 `utils/notificationCenter.js`、`custom-tab-bar/index.js`），最坏延迟 30 秒。

如需做到秒级实时推送，缺 WebSocket 通道。

**期望接口**

| 项 | 内容 |
|---|---|
| 协议 | `wss://` （生产）/ `ws://` （本地） |
| 路径 | `/ws/notifications` |
| 鉴权 | 握手时通过 query string `?token=<jwt>` 或 `Sec-WebSocket-Protocol` 携带 token；解析失败拒绝握手 |
| 推送方向 | 仅服务端 → 客户端（客户端不发业务消息，可定时发 ping） |
| 心跳 | 客户端 25s 发 `{"type":"ping"}`；服务端可回 `{"type":"pong"}` |
| 消息体 | `{ "type": "notification", "data": <MessageNotification 完整字段> }` |

**期望实现要点**

1. 引入 `spring-boot-starter-websocket` 依赖。
2. 新建 `WsNotificationHandler extends TextWebSocketHandler`，内部维护 `Map<Long userId, Set<WebSocketSession>>` 连接表（一个用户允许多端登录）。
3. 新建 `WebSocketConfig implements WebSocketConfigurer`，注册 `/ws/notifications` 端点，挂上 `HandshakeInterceptor` 解析 token 写入 `attributes.userId`。
4. 在 `NotificationEventListenerImpl.handle()` 中，落库后追加一行：
   ```java
   wsHandler.pushTo(event.getUserId(), Map.of(
       "type", "notification",
       "data", notification
   ));
   ```
5. **多实例部署时的连接归属问题**：用户连接可能落在 A 实例，消息消费可能落在 B 实例。两种解决：
   - 简单做法：所有实例共享 RabbitMQ 队列消费同一份消息，自己有连就推，没连就忽略（每条消息全实例尝试，幂等）。
   - 标准做法：用 Redis Pub/Sub 在实例间广播 `userId + payload`。
6. 部署侧：Nginx / API 网关需要打开 `Upgrade` / `Connection: upgrade` 头转发，`proxy_read_timeout` 至少 600s。
7. 小程序合法域名：在微信公众平台「开发设置 → socket 合法域名」中加入 `wss://your-domain`。

**前端预留**

前端 `utils/notificationCenter.js` 当前以 `setInterval` 周期轮询为内部实现，对外暴露 `subscribe / refreshNow / decrement / start / stop`。后端落地 WebSocket 后，仅需把内部 `_tick + setInterval` 替换为 `wx.connectSocket` + 心跳 + 重连，**对外 API 与所有业务页面零改动**。

**优先级**

P3（可实现，非阻塞）。当前轮询方案对一般业务体验已够，可在产品对实时性要求提高（如 IM 消息直推、会议即将开始秒级提醒）时再启动改造。


---

### `GET /match/pending-applications` 缺少学员的「希望上课时间」字段

**现象**

志愿者进入「结对代办」页，每张申请卡片上「对方希望上课时间」一栏永远显示 `—`。

**根因**

`MatchPairMapper.xml` 中 `selectPendingApplications` SQL 没有 SELECT 学员 profile 中的 `free_time` 字段（`student_profile` 表只有 `free_time` 列，没有 `student_available_time` 列），前端拿到的 `timeRaw` 永远为空字符串：

```xml
<!-- 当前 SQL -->
SELECT mp.id,
       mp.student_id AS studentId,
       sp.real_name AS studentName,
       mp.teacher_id AS teacherId,
       tp.real_name AS teacherName,
       mp.apply_time AS applyTime,
       mp.match_status AS matchStatus
FROM match_pair mp
LEFT JOIN student_profile sp ON sp.user_id = mp.student_id
LEFT JOIN teacher_profile tp ON tp.user_id = mp.teacher_id
WHERE mp.teacher_id = #{teacherId}
  AND mp.match_status = 0
ORDER BY mp.apply_time DESC
```

**期望修复**

在 SQL 中追加学员可上课时间字段，并在 `MatchPairVO` 增加对应字段：

```xml
SELECT mp.id,
       mp.student_id AS studentId,
       sp.real_name AS studentName,
       sp.free_time AS studentFreeTime,             -- 新增（DB 列名 free_time，存 JSON 字符串）
       sp.grade AS studentGrade,                    -- 顺便建议补
       mp.teacher_id AS teacherId,
       tp.real_name AS teacherName,
       mp.apply_time AS applyTime,
       mp.match_status AS matchStatus
FROM match_pair mp
LEFT JOIN student_profile sp ON sp.user_id = mp.student_id
LEFT JOIN teacher_profile tp ON tp.user_id = mp.teacher_id
WHERE mp.teacher_id = #{teacherId}
  AND mp.match_status = 0
ORDER BY mp.apply_time DESC
```

`MatchPairVO` 同步加：

```java
private String studentFreeTime;   // JSON 字符串：[{"dayOfWeek":1,"start":"...","end":"..."}, ...]
private String studentGrade;
```

> 字段名前端用 `studentFreeTime` 与现有学生侧字段统一；如果想沿用 `studentAvailableTime` 这种语义化名字，也可以在 SQL 别名里改成 `AS studentAvailableTime`，VO/前端三处一起改。

**前端临时绕过**

学员侧已用本地 profile 兜底显示自己的「希望上课时间」（自己填的，本地有缓存）；志愿者侧没有兜底数据源，只能等后端修复 SQL。

**优先级**

P2（影响志愿者审核体验，但非阻塞流程）。
