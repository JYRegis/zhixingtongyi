# Spring Boot + MyBatis-Plus 项目结构设计

## 项目基本信息
- 项目名称：rural-education-platform
- 构建工具：Maven
- Java版本：17
- Spring Boot版本：3.2.x
- 数据库：MySQL 8.0
- 缓存：Redis（用于会话和缓存）
- 消息队列：RabbitMQ（可选，用于异步处理微信消息）

## 项目目录结构
```text
src/main/java/com/rural/education/
├── EducationPlatformApplication.java         # 启动类
├── config/                                   # 配置类
│   ├── WebConfig.java                        # Web配置
│   ├── SecurityConfig.java                   # 安全配置（Spring Security）
│   ├── MybatisPlusConfig.java                # MyBatis-Plus配置
│   ├── RedisConfig.java                      # Redis配置
│   ├── SwaggerConfig.java                    # API文档配置
│   ├── WxConfig.java                         # 微信小程序配置
│   ├── MqConfig.java                         # RabbitMQ交换机/队列配置
│   └── RabbitJackson2Config.java             # RabbitMQ Jackson 序列化配置
├── controller/                               # 控制器层
│   ├── auth/                                 # 认证相关
│   │   ├── AuthController.java
│   │   └── WxAuthController.java
│   ├── admin/                                # 管理员功能
│   │   ├── AdminUserController.java
│   │   ├── AdminTeacherController.java
│   │   ├── AdminStudentController.java
│   │   ├── AdminRecordController.java        # [新增] 管理员审核时长记录
│   │   └── DashboardController.java
│   ├── teacher/                              # 志愿者功能
│   │   ├── TeacherProfileController.java
│   │   ├── TeacherMatchController.java
│   │   └── TeacherRecordController.java      # [新增] 教师提交时长记录与AI纪要
│   ├── student/                              # 学生功能
│   │   ├── StudentProfileController.java
│   │   ├── StudentMatchController.java
│   │   └── StudentRecordController.java      # [新增] 学生确认时长记录
│   ├── match/                                # 匹配功能
│   │   ├── MatchController.java
│   │   └── MatchAlgorithmController.java
│   ├── notification/                         # 消息通知
│   │   └── NotificationController.java
│   ├── meeting/                              # 会议管理
│   │   └── MeetingController.java
│   └── chat/                                 # 聊天功能
│       └── ChatController.java
├── service/                                  # 服务层
│   ├── impl/                                 # 服务实现
│   │   ├── AuthServiceImpl.java
│   │   ├── AdminServiceImpl.java
│   │   ├── TeacherServiceImpl.java
│   │   ├── StudentServiceImpl.java
│   │   ├── MatchServiceImpl.java
│   │   ├── NotificationServiceImpl.java
│   │   ├── MeetingServiceImpl.java
│   │   ├── UserAccessServiceImpl.java
│   │   ├── NotificationAsyncPublisherImpl.java
│   │   ├── ChatServiceImpl.java              # [待实现] 预留
│   │   ├── AlgorithmServiceImpl.java         # [待实现] 预留
│   │   ├── VolunteerRecordServiceImpl.java   # [新增][待实现] 预留
│   │   └── UserServiceImpl.java              # [待实现] 预留
│   ├── AuthService.java
│   ├── AdminService.java
│   ├── TeacherService.java
│   ├── StudentService.java
│   ├── MatchService.java
│   ├── NotificationService.java
│   ├── MeetingService.java
│   ├── UserAccessService.java
│   ├── NotificationAsyncPublisher.java
│   ├── ChatService.java                      # [待实现] 预留
│   ├── AlgorithmService.java                 # [待实现] 预留
│   ├── VolunteerRecordService.java           # [新增][待实现] 预留
│   ├── WxService.java                        # [待实现] 预留
│   └── UserService.java                      # [待实现] 预留
├── model/                                    # 数据模型（统一管理 mapper + entity）
│   ├── mapper/                               # 数据访问层（MyBatis-Plus）
│   │   ├── UserMapper.java
│   │   ├── SchoolMapper.java
│   │   ├── AdminProfileMapper.java
│   │   ├── TeacherProfileMapper.java
│   │   ├── StudentProfileMapper.java
│   │   ├── MatchPairMapper.java
│   │   ├── MessageNotificationMapper.java
│   │   ├── MeetingMapper.java
│   │   ├── ChatMessageMapper.java            # [待实现] 预留
│   │   ├── AlgorithmWeightConfigMapper.java  # [待实现] 预留
│   │   └── VolunteerRecordMapper.java        # [新增][待实现] 预留
│   └── entity/                               # 实体类（对应数据库表）
│       ├── User.java
│       ├── School.java
│       ├── AdminProfile.java
│       ├── TeacherProfile.java
│       ├── StudentProfile.java
│       ├── MatchPair.java
│       ├── MessageNotification.java
│       ├── Meeting.java
│       ├── ChatMessage.java                  # [待实现] 预留
│       ├── AlgorithmWeightConfig.java        # [待实现] 预留
│       └── VolunteerRecord.java              # [新增][待实现] 预留
├── dto/                                      # 数据传输对象
│   ├── request/                              # 请求DTO
│   │   ├── auth/
│   │   │   ├── LoginRequest.java             # 手机号登录请求（已实现）
│   │   │   ├── WxLoginRequest.java
│   │   │   └── RoleApplyRequest.java
│   │   ├── admin/
│   │   │   ├── SchoolRequest.java            # 已实现
│   │   │   ├── SecondaryAdminRequest.java    # 已实现
│   │   │   ├── UpdateUserStatusRequest.java  # 已实现
│   │   │   ├── AuditRequest.java             # 已实现（学生/教师审核共用）
│   │   │   ├── BatchCreateStudentsRequest.java
│   │   │   ├── ManagedStudentRequest.java
│   │   │   ├── CreateUserRequest.java        # [待实现] 预留
│   │   │   └── AuditTeacherRequest.java      # [待实现] 预留（当前由 AuditRequest 统一）
│   │   ├── teacher/
│   │   │   ├── TeacherProfileRequest.java
│   │   │   └── ContinuousMatchRequest.java
│   │   ├── student/
│   │   │   └── StudentProfileRequest.java
│   │   ├── match/
│   │   │   ├── MatchApplyRequest.java
│   │   │   ├── ProcessMatchRequest.java
│   │   │   └── UnbindConfirmRequest.java
│   │   ├── record/                           # [新增] 时长记录相关请求
│   │   │   ├── SubmitRecordRequest.java      # 教师提交DTO
│   │   │   ├── StudentConfirmRequest.java    # 学生确认DTO
│   │   │   └── AdminAuditRecordRequest.java  # 管理员审核DTO
│   │   ├── notification/
│   │   │   ├── NotificationReadRequest.java
│   │   │   └── InternalNotificationRequest.java
│   │   ├── meeting/
│   │   │   ├── CreateMeetingRequest.javas
│   │   │   └── UpdateStatusRequest.java
│   │   └── chat/
│   │       └── SendMessageRequest.java
│   └── response/                            # 响应DTO
│       ├── auth/
│       │   └── LoginResponse.java
│       ├── common/
│       │   ├── ApiResponse.java             # 统一响应格式
│       │   ├── PageResponse.java            # 分页响应
│       │   ├── NotificationEvent.java       # MQ消息DTO（已实现）
│       │   └── UserInfo.java                # [待实现] 预留
│       ├── admin/
│       │   ├── UserDetailResponse.java
│       │   └── DashboardResponse.java
│       ├── teacher/
│       │   └── TeacherProfileResponse.java
│       ├── student/
│       │   └── StudentProfileResponse.java
│       ├── match/
│       │   ├── MatchPairResponse.java
│       │   └── RecommendationResponse.java
│       ├── record/                           # [新增] 时长记录响应
│       │   └── VolunteerRecordResponse.java
│       ├── notification/
│       │   └── NotificationResponse.java
│       ├── meeting/
│       │   └── MeetingResponse.java
│       └── chat/
│           └── ChatMessageResponse.java
├── vo/                                       # 视图对象（用于前端展示）
│   ├── TeacherVO.java
│   ├── StudentVO.java
│   ├── MatchPairVO.java
│   └── MeetingVO.java
├── enums/                                    # 枚举类
│   ├── UserRole.java                         # user.role: 0-L1_ADMIN, 1-L2_ADMIN, 2-TEACHER, 3-STUDENT
│   ├── UserStatus.java                       # user.status: 0-DISABLED, 1-ENABLED
│   ├── MatchStatus.java                      # match_pair.match_status: 0-APPLIED,1-ACCEPTED,2-REJECTED,3-UNBIND_CONFIRMING,4-UNBOUND,5-UNBIND_REJECTED
│   ├── NotificationType.java                 # message_notification.type: 0..8 (结对/解绑/会议/时长通知)
│   ├── MeetingStatus.java                    # meeting.status: 0-NOT_STARTED,1-IN_PROGRESS,2-FINISHED,3-CANCELLED
│   ├── MessageType.java                      # chat_message.message_type: 0-TEXT,1-IMAGE,2-VOICE
│   ├── AuditStatus.java                      # teacher_profile.certification_status & student_profile.audit_status: 0-PENDING,1-APPROVED,2-REJECTED
│   └── RecordStatus.java                     # volunteer_record.status: 0-PENDING_STUDENT_CONFIRM,1-PENDING_ADMIN_AUDIT,2-APPROVED,3-REJECTED,4-STUDENT_REJECTED
├── utils/                                    # 工具类
│   ├── JwtUtil.java
│   ├── SecurityUtil.java                     # 安全上下文工具
│   ├── RedisUtil.java
│   ├── JsonUtil.java
│   ├── CurrentUserContext.java
│   ├── CurrentUserUtil.java
│   ├── WechatUtil.java                       # [待实现] 预留
│   ├── DateUtil.java                         # [待实现] 预留
│   └── BeanCopyUtil.java                     # [待实现] 预留
├── aspect/                                   # 切面 [待实现]
│   ├── LogAspect.java                        # 日志切面
│   ├── PermissionAspect.java                 # 权限切面
│   └── RateLimitAspect.java                  # 限流切面
├── filter/                                   # 过滤器
│   └── JwtAuthenticationFilter.java          # JWT鉴权过滤器
├── exception/                                # 异常处理
│   ├── GlobalExceptionHandler.java           # 全局异常处理
│   ├── BusinessException.java                # 业务异常
│   ├── AuthException.java                    # 认证异常
│   └── PermissionException.java              # 权限异常
├── scheduler/                                # 定时任务
│   ├── MeetingReminderScheduler.java         # 会议提醒
│   ├── MatchRecommendationScheduler.java     # 匹配推荐
│   └── DataCleanupScheduler.java             # 数据清理
└── event/                                    # 事件处理
    ├── event/                                # 事件定义
    │   ├── MatchAppliedEvent.java
    │   ├── MatchAcceptedEvent.java
    │   ├── MeetingCreatedEvent.java
    │   └── RecordStatusChangedEvent.java     # [新增] 时长记录状态变更事件
    ├── listener/                             # 事件监听器
    │   ├── NotificationEventListener.java    # 通知事件监听
    │   └── WechatMessageListener.java        # 微信消息监听
    └── publisher/                            # 事件发布器
        └── EventPublisher.java

src/main/resources/
├── application.yml                           # 主配置文件
├── application-dev.yml                       # 开发环境配置
├── application-prod.yml                      # 生产环境配置
├── mapper/                                   # MyBatis XML映射文件
│   ├── MatchPairMapper.xml
│   ├── TeacherProfileMapper.xml
│   ├── StudentProfileMapper.xml
│   ├── MeetingMapper.xml
│   ├── UserMapper.xml                        # [待实现] 预留
│   ├── VolunteerRecordMapper.xml             # [新增][待实现] 预留
│   └── ...
├── static/                                   # 静态资源
├── templates/                                # 模板文件
└── logback-spring.xml                        # 日志配置

src/test/                                     # 测试代码
├── java/com/rural/education/
│   ├── EducationPlatformApplicationTests.java
│   ├── service/
│   └── controller/
└── resources/
    └── application-test.yml

pom.xml                                       # Maven配置文件
```
## 主要依赖（pom.xml关键依赖）

```xml
<dependencies>
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
        <artifactId>spring-boot-starter-aop</artifactId>
    </dependency>
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-validation</artifactId>
    </dependency>

    <dependency>
        <groupId>com.mysql</groupId>
        <artifactId>mysql-connector-j</artifactId>
        <scope>runtime</scope>
    </dependency>
    <dependency>
        <groupId>com.baomidou</groupId>
        <artifactId>mybatis-plus-boot-starter</artifactId>
        <version>3.5.5</version>
    </dependency>
    <dependency>
        <groupId>com.alibaba</groupId>
        <artifactId>druid-spring-boot-starter</artifactId>
        <version>1.2.20</version>
    </dependency>

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

    <dependency>
        <groupId>com.github.binarywang</groupId>
        <artifactId>weixin-java-miniapp</artifactId>
        <version>4.6.0</version>
    </dependency>

    <dependency>
        <groupId>org.springdoc</groupId>
        <artifactId>springdoc-openapi-starter-webmvc-ui</artifactId>
        <version>2.3.0</version>
    </dependency>

    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-test</artifactId>
        <scope>test</scope>
    </dependency>
</dependencies>
```
配置示例（application.yml）
```yaml
server:
  port: 8080
  servlet:
    context-path: /api

spring:
  application:
    name: rural-education-platform
  profiles:
    active: dev
  datasource:
    driver-class-name: com.mysql.cj.jdbc.Driver
    url: jdbc:mysql://localhost:3306/education_platform?useUnicode=true&characterEncoding=utf8&serverTimezone=Asia/Shanghai
    username: root
    password: root
    druid:
      initial-size: 5
      min-idle: 5
      max-active: 20
  redis:
    host: localhost
    port: 6379
    password:
    database: 0
  security:
    oauth2:
      resourceserver:
        jwt:
          issuer-uri: http://localhost:8080

mybatis-plus:
  mapper-locations: classpath:mapper/*.xml
  type-aliases-package: com.rural.education.entity
  configuration:
    map-underscore-to-camel-case: true
    log-impl: org.apache.ibatis.logging.stdout.StdOutImpl
  global-config:
    db-config:
      id-type: auto
      logic-delete-field: deleted
      logic-delete-value: 1
      logic-not-delete-value: 0

jwt:
  secret: your-jwt-secret-key
  expiration: 86400000  # 24小时

wechat:
  miniapp:
    appid: your-appid
    secret: your-secret
```
## 关键实现说明
- 志愿时长数据一致性控制：
  在 VolunteerRecordServiceImpl.java 中，针对管理员“审核通过”的操作，必须开启数据库事务 @Transactional(rollbackFor = Exception.class)。确保将记录状态更新为“审核通过(APPROVED)”与将对应的 duration 累加到 TeacherProfile 的 total_service_duration 字段中这两个操作保持严格的原子性。

- 二级管理员权限拦截：
  使用 Spring Security 配合自定义 PermissionInterceptor。RecordAdminController.java 中的时长审核接口，需要校验当前登录管理员（通过 SecurityUtil.getCurrentUserId() 提取）的 permissions JSON 字段中是否包含 "student_manage" 权限标识。

- 数据隔离（代管与管辖区域）：
  二级管理员（老师）在查询待审核时长列表时，业务层 VolunteerRecordService 必须根据该管理员关联的 school_id 进行隐式条件过滤，确保老师只能审核本校（或代管）学员产生的服务记录。

- 解耦的事件与消息通知联动：
  当一条时长记录状态发生变更（如：教师提交后 -> 状态变为 PENDING_STUDENT），通过 EventPublisher 抛出 RecordStatusChangedEvent。由底层的 WechatMessageListener 捕获该事件并调用微信小程序 SDK 异步发送订阅消息给学员（或代管老师），从而实现了核心业务逻辑与消息推送的深度解耦。

- 匹配算法：
  AlgorithmService 实现基于权重的推荐算法（科目、时间、紧急程度），并从 AlgorithmWeightConfigMapper 动态读取管理员在后台配置的最新权重参数。