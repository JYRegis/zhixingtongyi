


---

### `PUT /auth/me` 不支持修改手机号

**现象**

用户在「资料与账号」页面点击手机号时，提示「手机号绑定后不可修改」。用户无法更换手机号。

**根因**

`UpdateProfileRequest` DTO 只有 `username` 和 `avatar` 两个字段，没有 `phone`：

```java
@Data
public class UpdateProfileRequest {
    private String username;
    private String avatar;
}
```

`AuthServiceImpl.updateProfile` 也只处理这两个字段。后端没有任何接口支持修改 `user.phone`。

数据模型上，`user.phone` 有唯一约束（`UNIQUE KEY uk_phone`），但其他业务表全部通过 `user_id`（bigint 主键）关联用户，**不存在冗余 phone 字段**。因此修改 phone 只需 `UPDATE user SET phone = ? WHERE id = ?`，不涉及其他表。

**修复建议**

新增 `PUT /auth/me/phone` 接口：

```java
// DTO
@Data
public class ChangePhoneRequest {
    @NotBlank(message = "新手机号不能为空")
    @Pattern(regexp = "^1\\d{10}$", message = "手机号格式错误")
    private String newPhone;
}

// Controller
@PutMapping("/me/phone")
public ApiResponse<Void> changePhone(@Valid @RequestBody ChangePhoneRequest request) {
    authService.changePhone(currentUserUtil.getCurrentUserId(), request.getNewPhone());
    return ApiResponse.success();
}

// Service
@Override
public void changePhone(Long userId, String newPhone) {
    Long collide = userMapper.selectCount(
        new LambdaQueryWrapper<User>()
            .eq(User::getPhone, newPhone)
            .ne(User::getId, userId)
    );
    if (collide > 0) {
        throw new BusinessException("该手机号已被其他账号使用");
    }
    userMapper.update(null,
        new LambdaUpdateWrapper<User>()
            .eq(User::getId, userId)
            .set(User::getPhone, newPhone)
    );
}
```

**前端配套改动**

`pages/common/profile/index.js` 的 `onEditPhone` 方法从 toast 改为弹窗输入新手机号，调用 `PUT /auth/me/phone`。

**优先级**

P2。功能缺失但不阻塞核心业务流程。


---

### L1/L2 管理员无法修改姓名（`admin_profile.real_name`）

**现象**

一级或二级管理员在「资料与账号」页面修改「姓名」字段后点击保存，前端 toast「资料已保存」，但实际只写入了本地缓存，后端 `admin_profile.real_name` 未变更。刷新页面后姓名恢复原值。

**根因**

1. 后端 `AdminProfileController` 只有 `GET /admin/profile/me`（查询），没有 `PUT`（更新）。
2. `AdminService` 接口没有 `updateMyProfile` 方法。
3. 前端 `profile/index.js` 的 `onSubmit` 只处理了 `role === "student"` 和 `role === "teacher"` 两个分支，管理员角色走完只调 `saveProfile()` 写本地 storage。

**修复建议**

1. 新建 DTO：

```java
@Data
public class UpdateAdminProfileRequest {
    private String realName;
    private String regionCode;  // 可选
}
```

2. `AdminProfileController` 增加 PUT：

```java
@PutMapping("/me")
public ApiResponse<Void> updateMyProfile(@Valid @RequestBody UpdateAdminProfileRequest request) {
    Long operatorId = currentUserUtil.getCurrentUserId();
    adminService.updateMyProfile(operatorId, request);
    return ApiResponse.success();
}
```

3. `AdminServiceImpl` 增加实现：

```java
@Override
public void updateMyProfile(Long operatorId, UpdateAdminProfileRequest request) {
    userAccessService.requireAnyRole(operatorId, UserRole.L1_ADMIN.getCode(), UserRole.L2_ADMIN.getCode());
    LambdaUpdateWrapper<AdminProfile> wrapper = new LambdaUpdateWrapper<AdminProfile>()
            .eq(AdminProfile::getUserId, operatorId);
    if (request.getRealName() != null && !request.getRealName().isBlank()) {
        wrapper.set(AdminProfile::getRealName, request.getRealName().trim());
    }
    if (request.getRegionCode() != null) {
        wrapper.set(AdminProfile::getRegionCode, request.getRegionCode().trim());
    }
    adminProfileMapper.update(null, wrapper);
}
```

4. 前端 `profile/index.js` 的 `onSubmit` 增加管理员分支：

```js
} else if (role === "admin_level_1" || role === "admin_level_2") {
  const payload = { realName: String(form.name || "").trim() };
  if (form.region) payload.regionCode = String(form.region).trim();
  await adminApi.updateMyProfile(payload);
}
```

5. `api.js` 的 `adminApi` 增加：

```js
updateMyProfile(data) { return request({ url: "/admin/profile/me", method: "PUT", data }); }
```

**优先级**

P1。管理员无法修改自己的姓名，影响日常使用体验。


---

### `NotificationEventListenerImpl` 入库后未通过 WebSocket 推送通知

**现象**

后端已有完整的 STOMP WebSocket 基础设施（`/ws` 端点、JWT 鉴权、`UserSessionRegistry` 在线追踪、`SimpMessagingTemplate`），聊天消息已通过 `/user/{id}/queue/chat` 实时推送。但通知（`message_notification`）入库后没有推送到客户端，前端仍依赖 30 秒轮询。

**根因**

`NotificationEventListenerImpl.handle()` 只做了 `messageNotificationMapper.insert(notification)`，没有调用 `messagingTemplate.convertAndSendToUser()` 推送给在线用户。

**修复建议**

在 `NotificationEventListenerImpl` 中注入 `SimpMessagingTemplate` 和 `UserSessionRegistry`，入库后追加推送：

```java
@Component
@RequiredArgsConstructor
public class NotificationEventListenerImpl implements NotificationEventListener {
    private final MessageNotificationMapper messageNotificationMapper;
    private final SimpMessagingTemplate messagingTemplate;      // 新增
    private final UserSessionRegistry sessionRegistry;          // 新增

    @Override
    @RabbitListener(queues = MqConfig.NOTIFICATION_QUEUE)
    public void handle(NotificationEvent event) {
        MessageNotification notification = new MessageNotification();
        notification.setUserId(event.getUserId());
        notification.setType(event.getType());
        notification.setTitle(event.getTitle());
        notification.setContent(event.getContent());
        notification.setParams(event.getParamsJson());
        notification.setSentTime(LocalDateTime.now());
        notification.setWechatSent(0);
        messageNotificationMapper.insert(notification);

        // 新增：如果用户在线，通过 WebSocket 实时推送
        if (sessionRegistry.isOnline(event.getUserId())) {
            messagingTemplate.convertAndSendToUser(
                event.getUserId().toString(),
                "/queue/notifications",
                Map.of(
                    "type", "notification",
                    "id", notification.getId(),
                    "title", notification.getTitle(),
                    "content", notification.getContent(),
                    "sentTime", notification.getSentTime().toString()
                )
            );
        }
    }
}
```

**前端配套改动**

前端 `utils/notificationCenter.js` 在启动时额外订阅 `/user/queue/notifications`：

```js
stompClient.subscribe("/user/queue/notifications", function(msg) {
  // 收到实时通知，立即刷新未读数 + 弹顶部横幅
  notificationCenter.refreshNow();
});
```

轮询逻辑保留作为兜底（WebSocket 断连时仍能工作）。

**优先级**

P3。当前 30 秒轮询对一般业务体验已够用，实时推送可在产品对即时性要求提高时启动。


---

### `ChatStompController.sendMessage` 的 `@AuthenticationPrincipal Long userId` 反序列化失败

**现象**

前端通过 STOMP WebSocket 向 `/app/chat.send` 发送消息时，后端报错：

```
Cannot deserialize value of type `java.lang.Long` from Object value (token `JsonToken.START_OBJECT`)
at [Source: (byte[])"{"matchPairId":9009,"messageType":"TEXT","content":"1111"}"; line: 1, column: 1]
```

消息发送失败，对方收不到实时推送。

**根因**

`ChatStompController.sendMessage` 方法签名：

```java
@MessageMapping("/chat.send")
public void sendMessage(@Payload SendMessageRequest request,
                        @AuthenticationPrincipal Long userId) {
    ...
}
```

在 STOMP 消息处理中，`@AuthenticationPrincipal` 的解析方式与 REST Controller 不同。REST 中 Spring Security 从 `SecurityContext` 取 `Authentication.getPrincipal()`；但 STOMP 中 `@AuthenticationPrincipal` 默认尝试从消息 payload 反序列化目标类型。

`WebSocketAuthInterceptor` 在 CONNECT 时设置了 `UsernamePasswordAuthenticationToken(userId, null, ...)`，其中 principal 是 `Long` 类型。但 Spring Messaging 的 `AuthenticationPrincipalArgumentResolver` 在处理 `@MessageMapping` 方法时，可能因为参数解析顺序问题，把 JSON body 错误地尝试反序列化为 `Long`。

**修复建议**

方案 A：改用 `Principal` 参数手动取 userId（推荐）

```java
@MessageMapping("/chat.send")
public void sendMessage(@Payload SendMessageRequest request,
                        Principal principal) {
    Long userId = Long.valueOf(principal.getName());
    ChatMessageVO vo = chatService.sendMessage(userId, request);
    // ... 推送逻辑
}
```

`WebSocketAuthInterceptor` 中 `UsernamePasswordAuthenticationToken` 的 `getName()` 返回的就是 `userId.toString()`（因为 principal 是 Long，`toString()` 即数字字符串）。

方案 B：自定义 `AuthenticationPrincipalArgumentResolver` 注册到 STOMP inbound channel

```java
@Override
public void addArgumentResolvers(List<HandlerMethodArgumentResolver> resolvers) {
    resolvers.add(new AuthenticationPrincipalArgumentResolver());
}
```

确保 resolver 优先级高于默认的 payload 解析器。

**前端临时方案**

前端 WebSocket 仅用于**接收**对方消息（订阅 `/user/queue/chat`），**发送**消息始终走 REST 接口 `POST /chat/messages`。REST 接口的 `@AuthenticationPrincipal` 工作正常。

**优先级**

P2。WebSocket 发送不可用意味着发送方看不到即时反馈（需等 REST 响应），但接收方仍能实时收到推送（因为 REST 发送成功后后端 `ChatStompController` 不参与，推送由 `chatService.sendMessage` 内部触发）。

> 注：实际上当前后端 `chatService.sendMessage`（REST 路径）执行后**不会**主动推送给对方——推送逻辑只写在了 `ChatStompController.sendMessage` 里。这意味着在此 bug 修复前，WebSocket 实时接收也无法工作。修复此 bug 后，REST 发送 + WebSocket 接收的组合才能完整跑通。
