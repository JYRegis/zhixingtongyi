# Spring Boot + MyBatis-Plus 项目结构设计

## 项目基本信息
- 项目名称：rural-education-platform（知行同驿）
- 构建工具：Maven
- Java版本：17
- Spring Boot版本：3.2.6
- ORM：MyBatis-Plus 3.5.5 + Druid 1.2.20
- 数据库：MySQL 8.0（`aid_education_platform`）
- 缓存：Redis 7
- 消息队列：RabbitMQ 3（异步消息推送）
- 微信 SDK：weixin-java-miniapp 4.6.0
- API文档：SpringDoc OpenAPI 3（2.3.0）

## 项目目录结构
```text
src/main/java/com/rural/education/
├── EducationPlatformApplication.java           # 启动类
├── config/                                     # 配置类
│   ├── WebConfig.java                          # Web/CORS 配置
│   ├── SecurityConfig.java                     # Spring Security 安全配置
│   ├── JwtAuthenticationFilter.java            # JWT 鉴权过滤器
│   ├── MybatisPlusConfig.java                  # MyBatis-Plus 分页插件配置
│   ├── MetaObjectHandlerConfig.java            # MyBatis-Plus 自动填充（createTime/updateTime）
│   ├── RedisConfig.java                        # Redis 序列化与连接配置
│   ├── SwaggerConfig.java                      # SpringDoc OpenAPI 配置
│   ├── WxConfig.java                           # 微信小程序 SDK 配置
│   ├── MqConfig.java                           # RabbitMQ 交换机/队列/绑定配置
│   └── RabbitJackson2Config.java               # RabbitMQ Jackson 序列化配置
├── controller/                                 # 控制器层
│   ├── auth/                                   # 认证相关
│   │   ├── AuthController.java                 # 手机号登录
│   │   └── WxAuthController.java               # 微信小程序登录
│   ├── admin/                                  # 管理员功能
│   │   ├── AdminUserController.java            # 用户管理（创建/禁用/查询）
│   │   ├── AdminTeacherController.java         # 志愿者审核与管理
│   │   ├── AdminStudentController.java         # 学生审核与管理
│   │   ├── AdminRecordController.java          # 管理员审核时长记录
│   │   ├── AdminChatController.java            # 管理员聊天会话列表
│   │   ├── AdminProfileController.java         # 管理员个人资料
│   │   └── DashboardController.java            # 数据仪表盘
│   ├── teacher/                                # 志愿者功能
│   │   ├── TeacherProfileController.java       # 资料管理
│   │   ├── TeacherMatchController.java         # 匹配操作（接受/拒绝/解绑）
│   │   └── TeacherRecordController.java        # 提交时长记录与AI纪要
│   ├── student/                                # 学生功能
│   │   ├── StudentProfileController.java       # 资料管理
│   │   ├── StudentMatchController.java         # 匹配申请
│   │   └── StudentRecordController.java        # 确认/拒绝时长记录
│   ├── match/                                  # 匹配功能
│   │   ├── MatchController.java                # 匹配流程（申请/处理/解绑）
│   │   └── MatchAlgorithmController.java       # 匹配算法权重配置
│   ├── notification/                           # 消息通知
│   │   ├── NotificationController.java         # 用户通知（列表/已读）
│   │   └── InternalNotificationController.java # 内部通知发送
│   ├── meeting/                                # 会议管理
│   │   └── MeetingController.java
│   ├── chat/                                   # 聊天功能
│   │   └── ChatController.java
│   └── volunteer/                              # 志愿时长记录
│       └── VolunteerRecordController.java      # 记录查询
│   ├── school/                                  # 学校公开查询
│   │   └── SchoolController.java
├── websocket/                                   # WebSocket 实时通信
│   ├── WebSocketConfig.java
│   ├── WebSocketAuthInterceptor.java
│   ├── ChatStompController.java
│   └── UserSessionRegistry.java
├── service/                                    # 服务层
│   ├── impl/                                   # 服务实现
│   │   ├── AuthServiceImpl.java
│   │   ├── AdminServiceImpl.java
│   │   ├── TeacherServiceImpl.java
│   │   ├── StudentServiceImpl.java
│   │   ├── MatchServiceImpl.java
│   │   ├── NotificationServiceImpl.java
│   │   ├── MeetingServiceImpl.java
│   │   ├── UserAccessServiceImpl.java
│   │   ├── NotificationAsyncPublisherImpl.java # 异步事件发布
│   │   ├── ChatServiceImpl.java
│   │   ├── AlgorithmServiceImpl.java
│   │   ├── VolunteerRecordServiceImpl.java
│   │   ├── DashboardServiceImpl.java
│   │   ├── SchoolServiceImpl.java
│   │   └── NotificationEventListenerImpl.java  # 事件监听与通知分发
│   ├── AuthService.java
│   ├── AdminService.java
│   ├── TeacherService.java
│   ├── StudentService.java
│   ├── MatchService.java
│   ├── NotificationService.java
│   ├── MeetingService.java
│   ├── UserAccessService.java
│   ├── NotificationAsyncPublisher.java
│   ├── ChatService.java
│   ├── AlgorithmService.java
│   ├── VolunteerRecordService.java
│   ├── DashboardService.java
│   ├── SchoolService.java
│   └── NotificationEventListener.java          
├── model/                                      # 数据模型
│   ├── mapper/                                 # MyBatis-Plus Mapper 接口
│   │   ├── UserMapper.java
│   │   ├── SchoolMapper.java
│   │   ├── AdminProfileMapper.java
│   │   ├── TeacherProfileMapper.java
│   │   ├── StudentProfileMapper.java
│   │   ├── MatchPairMapper.java
│   │   ├── MessageNotificationMapper.java
│   │   ├── MeetingMapper.java
│   │   ├── ChatMessageMapper.java
│   │   ├── ChatParticipantMapper.java
│   │   ├── AlgorithmWeightConfigMapper.java
│   │   └── VolunteerRecordMapper.java
│   └── entity/                                 # 实体类（对应数据库表）
│       ├── User.java
│       ├── School.java
│       ├── AdminProfile.java
│       ├── TeacherProfile.java
│       ├── StudentProfile.java
│       ├── MatchPair.java
│       ├── MessageNotification.java
│       ├── Meeting.java
│       ├── ChatMessage.java
│       ├── ChatParticipant.java
│       ├── AlgorithmWeightConfig.java
│       └── VolunteerRecord.java
├── dto/                                        # 数据传输对象
│   ├── common/                                 # 通用 DTO
│   │   ├── ApiResponse.java                    # 统一响应格式
│   │   ├── PageResponse.java                   # 分页响应
│   │   └── NotificationEvent.java              # MQ 消息体
│   ├── request/                                # 请求 DTO
│   │   ├── auth/
│   │   │   ├── LoginRequest.java
│   │   │   ├── WxLoginRequest.java
│   │   │   ├── RoleApplyRequest.java
│   │   │   └── UpdateProfileRequest.java
│   │   ├── admin/
│   │   │   ├── SchoolRequest.java
│   │   │   ├── SecondaryAdminRequest.java
│   │   │   ├── UpdateUserStatusRequest.java
│   │   │   ├── AuditRequest.java
│   │   │   ├── BatchCreateStudentsRequest.java
│   │   │   └── ManagedStudentRequest.java
│   │   ├── teacher/
│   │   │   ├── TeacherProfileRequest.java
│   │   │   └── ContinuousMatchRequest.java
│   │   ├── student/
│   │   │   └── StudentProfileRequest.java
│   │   ├── match/
│   │   │   ├── MatchApplyRequest.java
│   │   │   ├── ProcessMatchRequest.java
│   │   │   └── UnbindConfirmRequest.java
│   │   ├── algorithm/
│   │   │   └── UpdateWeightRequest.java
│   │   ├── record/
│   │   │   ├── SubmitRecordRequest.java
│   │   │   ├── StudentConfirmRequest.java
│   │   │   └── AdminAuditRecordRequest.java
│   │   ├── notification/
│   │   │   ├── NotificationReadRequest.java
│   │   │   └── InternalNotificationRequest.java
│   │   ├── meeting/
│   │   │   ├── CreateMeetingRequest.java
│   │   │   └── UpdateStatusRequest.java
│   │   └── chat/
│   │       ├── SendMessageRequest.java
│   │       ├── AddParticipantRequest.java
│   │       ├── MarkReadRequest.java
│   │       └── JoinChatRequest.java
│   └── response/                               # 响应 DTO
│       ├── auth/
│       │   └── LoginResponse.java
│       └── admin/
│           ├── DashboardOverviewResponse.java
│           ├── MatchSuccessRateResponse.java
│           ├── RegionDistributionResponse.java
│           └── SubjectDistributionResponse.java
├── vo/                                         # 视图对象（用于前端展示）
│   ├── TeacherVO.java
│   ├── StudentVO.java
│   ├── MatchPairVO.java
│   ├── MeetingVO.java
│   ├── ChatMessageVO.java
│   ├── ChatParticipantVO.java
│   ├── ChatConversationVO.java
│   ├── AdminProfileVO.java
│   └── VolunteerRecordVO.java
├── enums/                                      # 枚举类
│   ├── UserRole.java                           # 0-L1_ADMIN, 1-L2_ADMIN, 2-TEACHER, 3-STUDENT
│   ├── UserStatus.java                         # 0-DISABLED, 1-ENABLED
│   ├── MatchStatus.java                        # 0-APPLIED,1-ACCEPTED,2-REJECTED,3-UNBIND_CONFIRMING,4-UNBOUND,5-UNBIND_REJECTED
│   ├── NotificationType.java                   # 0..8（结对/解绑/会议/时长通知）
│   ├── MeetingStatus.java                      # 0-NOT_STARTED,1-IN_PROGRESS,2-FINISHED,3-CANCELLED
│   ├── MessageType.java                        # 0-TEXT,1-IMAGE,2-VOICE
│   ├── AuditStatus.java                        # 0-PENDING,1-APPROVED,2-REJECTED
│   └── RecordStatus.java                       # 0-DRAFT,1-PENDING_STUDENT_CONFIRM,2-PENDING_ADMIN_AUDIT,3-APPROVED,4-REJECTED
├── utils/                                      # 工具类
│   ├── JwtUtil.java                            # JWT 生成与验证（auth0 java-jwt）
│   ├── RedisUtil.java                          # Redis 缓存操作
│   ├── JsonUtil.java                           # JSON 序列化/反序列化
│   ├── CurrentUserContext.java                 # ThreadLocal 存储当前用户
│   └── CurrentUserUtil.java                    # 获取当前登录用户信息
├── filter/                                     # 过滤器
│   └── JwtAuthenticationFilter.java            # JWT 鉴权过滤器
├── exception/                                  # 异常处理
│   ├── GlobalExceptionHandler.java             # 全局异常处理（@RestControllerAdvice）
│   ├── BusinessException.java                  # 业务异常
│   ├── AuthException.java                      # 认证异常
│   └── PermissionException.java                # 权限异常
└── scheduler/                                  # 定时任务
    ├── MeetingReminderScheduler.java           # 会议开始前提醒
    ├── MatchRecommendationScheduler.java       # 智能匹配推荐
    └── DataCleanupScheduler.java               # 过期数据清理

src/main/resources/
├── application.yml                             # 主配置文件（context-path: /api/v1）
├── application-dev.yml                         # 开发环境（MySQL:3307）
├── application-docker.yml                      # Docker 环境（MySQL:3306）
├── mapper/                                     # MyBatis XML 映射文件
│   ├── MatchPairMapper.xml
│   ├── MeetingMapper.xml
│   ├── SchoolMapper.xml
│   ├── StudentProfileMapper.xml
│   ├── TeacherProfileMapper.xml
│   └── VolunteerRecordMapper.xml
├── static/                                     # 静态资源
└── templates/                                  # 模板文件

src/test/                                       # 测试代码
└── java/com/rural/education/
    └── EducationPlatformApplicationTests.java
```

## 主要依赖（pom.xml 关键依赖）

```xml
<dependencies>
    <!-- Spring Boot Starters -->
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-web</artifactId>
    </dependency>
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-security</artifactId>
    </dependency>
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-data-redis</artifactId>
    </dependency>
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-amqp</artifactId>
    </dependency>
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-validation</artifactId>
    </dependency>

    <!-- Database -->
    <dependency>
        <groupId>com.mysql</groupId>
        <artifactId>mysql-connector-j</artifactId>
        <scope>runtime</scope>
    </dependency>
    <dependency>
        <groupId>com.baomidou</groupId>
        <artifactId>mybatis-plus-spring-boot3-starter</artifactId>
        <version>3.5.5</version>
    </dependency>
    <dependency>
        <groupId>com.alibaba</groupId>
        <artifactId>druid-spring-boot-3-starter</artifactId>
        <version>1.2.20</version>
    </dependency>

    <!-- Utilities -->
    <dependency>
        <groupId>org.projectlombok</groupId>
        <artifactId>lombok</artifactId>
        <optional>true</optional>
    </dependency>
    <dependency>
        <groupId>com.auth0</groupId>
        <artifactId>java-jwt</artifactId>
        <version>4.4.0</version>
    </dependency>
    <dependency>
        <groupId>com.fasterxml.jackson.core</groupId>
        <artifactId>jackson-databind</artifactId>
    </dependency>
    <dependency>
        <groupId>org.apache.commons</groupId>
        <artifactId>commons-lang3</artifactId>
    </dependency>
    <dependency>
        <groupId>commons-codec</groupId>
        <artifactId>commons-codec</artifactId>
    </dependency>

    <!-- WeChat -->
    <dependency>
        <groupId>com.github.binarywang</groupId>
        <artifactId>weixin-java-miniapp</artifactId>
        <version>4.6.0</version>
    </dependency>

    <!-- API Docs -->
    <dependency>
        <groupId>org.springdoc</groupId>
        <artifactId>springdoc-openapi-starter-webmvc-ui</artifactId>
        <version>2.3.0</version>
    </dependency>

    <!-- Test -->
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-test</artifactId>
        <scope>test</scope>
    </dependency>
</dependencies>
```

## 配置示例（application.yml）

```yaml
server:
  port: ${SERVER_PORT:8080}
  servlet:
    context-path: /api/v1

spring:
  application:
    name: rural-education-platform
  profiles:
    active: dev
  datasource:
    driver-class-name: com.mysql.cj.jdbc.Driver
    url: jdbc:mysql://127.0.0.1:3307/aid_education_platform?useUnicode=true&characterEncoding=utf8&serverTimezone=Asia/Shanghai
    username: root
    password: ${MYSQL_ROOT_PASSWORD:root}
    druid:
      initial-size: 5
      min-idle: 5
      max-active: 20
  redis:
    host: ${REDIS_HOST:127.0.0.1}
    port: ${REDIS_PORT:6379}
    database: 0

mybatis-plus:
  mapper-locations: classpath:mapper/*.xml
  type-aliases-package: com.rural.education.model.entity
  configuration:
    map-underscore-to-camel-case: true
  global-config:
    db-config:
      id-type: auto
      logic-delete-field: deleted
      logic-delete-value: 1
      logic-not-delete-value: 0

jwt:
  secret: ${JWT_SECRET}
  expiration: 86400000  # 24小时

wechat:
  miniapp:
    appid: ${WX_MINIAPP_APPID}
    secret: ${WX_MINIAPP_SECRET}
```

## 关键实现说明

- **志愿时长数据一致性**：
  在 `VolunteerRecordServiceImpl` 中，管理员审核通过操作使用 `@Transactional(rollbackFor = Exception.class)` 确保记录状态更新与 `TeacherProfile.total_service_duration` 累加保持原子性。时长记录状态机：`DRAFT → PENDING_STUDENT_CONFIRM → PENDING_ADMIN_AUDIT → APPROVED/REJECTED`，学生也可直接拒绝（`STUDENT_REJECTED`）。

- **二级管理员权限控制**：
  Spring Security + JWT 过滤器鉴权。L2 管理员权限以 JSON 数组存储在 `admin_profile.permissions` 字段（如 `["student_manage", "teacher_audit"]`），`student_manage` 权限仅能访问本校学生和记录，`teacher_audit` 可跨校审核志愿者。

- **事件驱动通知**：
  业务操作（匹配申请/接受、时长状态变更、会议创建）通过 `NotificationEventListener` 捕获事件，调用 `NotificationAsyncPublisher` 异步发送 RabbitMQ 消息，实现业务逻辑与消息推送的解耦。微信模板消息通过 `weixin-java-miniapp` SDK 发送。

- **智能匹配算法**：
  `AlgorithmService` 实现基于权重的推荐算法（科目 40%、时间 30%、紧急度 20%、性格 10%），权重从 `algorithm_weight_config` 表动态读取，管理员可通过 `/admin/dashboard/weights` API 实时调整。

- **数据隔离**：
  L2 管理员查询时自动按 `school_id` + `region_code` 过滤，确保只能操作本校或代管学校数据。聊天参与者校验使用复合外键 `(match_pair_id, sender_id)` 防伪造。

- **解绑流程**：
  三方确认机制 — 学生、志愿者、L2 管理员均需同意，`match_pair` 表追踪各自确认/拒绝状态，全部同意后状态变为 `UNBOUND`。
