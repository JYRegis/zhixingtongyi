# 知行同驿支教小程序（纯前端 + HTTP 后端）

本目录为**正式小程序工程**：使用微信开发者工具导入 **`zhixingtongyi` 文件夹根目录** 即可。与旧目录 `zhixingtongyi-1` 不同，本工程**不启用微信云开发**，无 `cloudfunctions/`，业务数据请通过自建后端接口对接（见 `miniprogram/utils/env.js`）。

## 如何打开与运行

1. 安装并打开 [微信开发者工具](https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html)，选择「导入项目」，目录选本文件夹 `zhixingtongyi`。
2. 在 `project.config.json` 或工具中填写你的 **AppID**（测试可用测试号）。
3. 联调 HTTP 时，在「详情 → 本地设置」勾选 **不校验合法域名**；上线前在微信公众平台配置 **request 合法域名**。

## 目录说明

| 路径 | 说明 |
|------|------|
| `miniprogram/` | 小程序源码：首页选身份、工作台、匹配、聊天、会议、学校/平台管理等页面 |
| `miniprogram/utils/env.js` | HTTP 请求封装与 `dev/test/prod` 基地址（占位域名需换成真实后端） |
| `docs/` | 产品/前端说明；**Mock 与测试用数据**见 [docs/MOCK_DATA.md](docs/MOCK_DATA.md) ；**四角色界面色板与主题**见 [../docs/ROLE_UI_THEME.md](../docs/ROLE_UI_THEME.md)（`miniprogram/styles/role-theme.wxss` + `Page` 注入 `_roleThemeClass`） |

## 与后端（如 `zhixingtongyi-zyh`）联调

- **基地址**：`miniprogram/utils/env.js` 中 `dev` 默认为 `http://localhost:8080/api/v1`（与 Spring `context-path: /api/v1` 一致）。
- **登录**：`pages/common/auth` 在点击「完成并进入/登录」时会请求 **`POST /auth/phone-login`**；注册且首页身份为**支教志愿者**时，在写入 Token 后依次调用 **`POST /auth/role-apply`（`targetRole: TEACHER`）** 与**第二次 `phone-login`**，以拿带教师角色的 JWT。学员注册不必再调 `role-apply`（后端新用户默认可视为学员 role=3）。
- **管理端**（学校老师/平台运营）：若首页选了管理员，但手机账号在库中不是 role 0/1，会弹窗；可用「仅本机演示」回退为原有本地登录。**真实管理员**请在后端为手机号建好 role=0/1 的账号，再与首页选项一致时即可直接用手机号登录。
- **退出登录**：`app.logout` 在存在 `token` 时会 **`POST /auth/logout`**（再清本地态）。
- **其它业务**（**管理端待审/区域**等）大量仍以**本机** `onboardingStore` 等为主，与 `zhixingtongyi-zyh` 的 `AdminController` 并非一一对应，需另排期对齐。**入驻**在已登录且 `miniprogram/config/demoBackend.js` 中 `USE_BACKEND_ONBOARDING: true` 时，**学员/支教志愿者**会先用 JWT 调 **`POST/PUT /student|teacher/profile`**（学员再 **`POST /student/profile/submit`**），成功后再**双写**本机 `onboardingStore` + `userProfileStore`；接口失败可弹窗选择**仅本机保存**。
- **演示配置**（`miniprogram/config/demoBackend.js`）：
  - **`DEMO_L2_USER_ID`**：学员档案 `bindAdminId` 用的二级管理员 `user.id`，需与**你本机 MySQL** 中已有二级管理员主键一致（默认 `1`；不一致请改配置）。
  - **学校与 mock**：`utils/schoolsMock.js` 中学校 `id` 为 **数字 1–10**（与库里 `school` 表主键**自行对齐**；联调前请保证库中存在对应行，否则 `schoolId` 会不合法）。
  - **匹配**（`USE_BACKEND_MATCH`）：有 JWT 时，**学员**在匹配中心拉取 **`GET /match/recommendations`**，「申请结对」走 **`POST /match/apply`**（`teacherId`）；**支教志愿者**在「结对待办」拉取 **`GET /match/pending-applications`**，接受/拒绝走 **`PUT /match/application/{id}/process`**。失败时各页回退本地 mock/种子数据。后端仅对学员开放推荐接口，**志愿者侧推荐列表仍为本地演示**。
  - **会议**（`USE_BACKEND_MEETING`）：有 JWT 时，**列表**走 **`GET /meetings/my`**；**新建**在结对下拉中使用 **`GET /match/my-pairs?status=1`**（`matchPairId` 为数据库**数字主键**，与本地 `pair_001` 类 mock **不同**），提交 **`POST /meetings`**（`topic`、开始/结束时间字符串、`meetingLink` 必填；结束时间取开始时间 +1 小时）。成功即返回列表，不双写本机；失败可选**仅本机**写入 `meetingStore`。无 JWT 或关闭开关时**全部**为原本地登记逻辑。
  - **解绑**（`USE_BACKEND_UNBIND`）：有 JWT 时，**学员/志愿者**解绑页用 **`GET /match/my-pairs`** 与 **`unbindRequest` / `unbindConfirm` / `unbindProgress`**；结对 id 为**后端 Long**。**受援方 L2** 解绑待办仍走本机 `pairingStore` 演示。失败时回退本地结对数据。
  - **通知**（`USE_BACKEND_NOTIFICATION`）：`设置 → 消息通知` 使用 **`GET /notifications`**、单条/批量已读；关闭或无 token 时仅提示说明文案。
  - **支教·持续匹配**（`USE_BACKEND_TEACHER_CONTINUOUS_MATCH`）：`资料与账号` 页对**支教志愿者**显示开关，拉取 `GET /teacher/profile` 中 `continuousMatch`，变更时 **`PUT /teacher/continuous-match`**。以下接口仍仅封装于 `api.js`、**业务页未接**：`GET /match/{pairId}` 结对详情、`GET /meetings` 与 `GET /{id}` 详情及 `PUT .../status`（管理/详情流）、`POST /auth/wx-login`·`/mock-login`·`/auth/refresh` 等，见代码检索。

## WeUI 扩展库（主路径示范 UI）

- **如何开启**：`miniprogram/app.json` 中已配置 `"useExtendedLib": { "weui": true }`（[官方说明](https://developers.weixin.qq.com/miniprogram/dev/platform-capabilities/extended/weui/)），**不占用主包代码体积**，由基础能力提供 `weui-miniprogram/...` 路径。
- **本工程已用组件**（在对应页的 `index.json` → `usingComponents` 中按页注册）：

| 页面 | 文件路径 | 组件与用途（简述） |
|------|----------|-------------------|
| 首页 | `pages/common/home/index` | 选身份为**自建卡片列表**（非 WeUI Cell）；头部区 `mp-badge`、`mp-icon` 点缀 |
| 注册/登录 | `pages/common/auth/index` | `mp-toptips` 校验与提示；`mp-cells` / `mp-cell` 身份摘要 |
| 工作台 | `pages/common/workbench/index` | `mp-badge` 角标与数量；`mp-loading` 下拉刷新遮罩 |
| 底栏 | `miniprogram/custom-tab-bar` | 仅 `wxss` 加强（毛玻璃、选中态 pill），**未**用 WeUI 图标组件，仍用原有 PNG 图标 |

- **全局自建样式**（与四角色色板配合）：`miniprogram/app.wxss` 中 `.shell-mesh`、`.card-tier` 等分层背景与卡片壳；`styles/role-theme.wxss` 继续提供 `--ui-*` 变量。
- **自测注意**：在开发者工具中打开**首页 / 注册登录 / 工作台**与**自定义底栏**各角色，确认首页 WeUI 点缀与 `mp-toptips` 等在真机/模拟器下展示正常。若与「增强编译」等选项冲突，可在「项目详情 → 本地设置」中关闭相关实验项后重试（与仓库内 `WAServiceMainContext` timeout 说明类同）。

## 主要页面入口

- **首页（选身份）**：`pages/common/home/index`
- **注册与登录**：`pages/common/auth/index`。**注册/完善**（含头像、昵称、手机号等）用 URL 参数 `flow=register`（**资料页**预填、待入驻重进等入口已带此参数）；**仅手机号登录**用 `flow=login`（首页「已有账号，仅手机号快速登录」选角色后进入）。`prefill=1&returnTo=profile` 为资料页回跳时**强制**走注册/完善形态。
- **入驻申请**：`pages/common/onboarding-apply/index`。**四角色**（乡村学员/支教志愿者/学校老师/平台运营）**都必须**在此页或**登录后**由 `onboardingGuard` / 未入驻拦截等**自动/强制进入**时提交、进入待审；工作台**不**放「入驻与审核」入口。**学员/志愿者/学校老师**为同类卡片式表：**真实姓名、学号或学工号/工号、学校（原生下拉）** 与 **星期+时段** 多选；学员另必填**年级**；**学校老师**的学校列表为**支教点 + 受援校**合并（与学员只选受援校、志愿者只选支教点不同），时段字段含义为**方便联系/办公时间**（与志愿者的「可授课时间」同控件，存 `extra.availableTime`）；时间序列化格式为 `W:1,2,3|S:mor,noon,night`）
- **审核中**（`onboardingStatus === pending`）：`utils/onboardingGuard.js` 会**拦截**各业务页，统一进入 `pages/common/onboarding-pending/index`（可返回首页或**切换账号**重新登录），避免待审态仍使用工作台/匹配等。**已通过**（`approved`）后才会进入 Tab 业务。学员/教师匹配页「**推荐**」含**学科筛选**（学员看志愿者、志愿者看结对学生），**结对待办**（`match/requests`）等仍为**本地演示数据**；**结对待办**入口仅在**匹配中心**页，**不**从工作台我的待办进入；**乡村学员**与**支教志愿者**可点入，**平台/学校老师**不进入此页。与是否过审**无关**。
- **认定义务时长（申请）**：学员与支教志愿者在**工作台**进入「**志愿时长**」→ `pages/common/hours-apply/index`；选择**结对中**的结对、填写小时数与周次，提交后进入与平台/受援方「认定义务时长」同一套**待审**数据（`hoursReviewStore`）。无结对时须先在「匹配」等流程中有结对记录。
- **工作台 / 匹配 / 聊天 / 会议 / 设置**：底部**自定义** Tab（`miniprogram/custom-tab-bar`）。**平台运营（一级）** 底栏为 **工作台 · 平台 · 聊天 · 设置**（**「平台」** 用 `reLaunch` 进 `admin/platform` 主列表，与 `app.json` 的 `switchTab` 五格兼容；该页**内嵌**同款底栏）。**学校二级**不显示「**匹配**」与「**会议**」：底栏为 **工作台 · 聊天 · 设置**（三级）；`match/center`、会议非 Tab 的页面若误进会回工作台/拦回。**受援方** L2 工作台有**区域、聊天、解绑**；**支教** L2 有**区域、聊天**（**无**解绑；误入解绑会回工作台）。**乡村学员/支教志愿者** 底栏为 **五栏**（**含会议**）。在「**聊天**」中：一级可按校筛选看演示会话；**受援/支教** 二级为只读会话。学员/教师业务：工作台「我的待办」**不**再列会议（改由底栏「会议」进入）。
- **资料与账号**：`settings` 中**一条**入口进入 `pages/common/profile/index`，页顶为**头像、昵称、手机**（可跳转 `auth` 修改），其下为各角色**资料表**；学校/年级等同上；星期+时段时间多选
- **管理**：`pages/admin/region/index`（`volunteer_side` 审**志愿者**入驻；`recipient_side` 审**学生**注册与**认定义务时长**）。**平台一级**：`pages/admin/platform/index` 为**总览**入口，可分别进入子页——`platform/review/index?role=student|teacher|admin_level_2|admin_level_1`（**四身份**入驻待审分栏）、`platform/hours`（**认定义务时长**）、`platform/risk`（**异常与预警**）等。学校老师**首次**通过时：在 `platform/review?role=admin_level_2` 点**通过**会**弹出**选择「支教方 / 受援方」及一所对应学校，与 `utils/l2ScopeAssign.js` 中逻辑一致。各待审/时长列表中每条可点 **「申请资料」** 等入口进入 `pages/common/review-submission-detail/index`（`type=onboarding` 为入驻/认证申请内容；`type=hours` 为认定义务时长单），与 `utils/reviewAccess.js` 权限一致。
- **解绑**：`pages/match/unbind/index`（**仅学员或支教志愿者可发起**；受援方学校老师**仅**在**有人发起申请**后，在**待办列表**中点选该条、查看**详情**再确认同意。学员/志愿者端**先点选**结对口，再**对该条**发起/查看三向解绑。**匹配**页「解绑申请」、工作台**解绑**对**学员 / 支教志愿者 / 受援方老师**等展示，**平台运营**不显示该入口，强制解绑走「管理 → 异常与预警」等演示项）

## 角色与本地 Mock 说明

| 角色 | `role` 值 | 说明 |
|------|------------|------|
| 乡村学员 | `student` | 入驻时选受援校；申请路由到对应**受援方**二级或平台 |
| 支教志愿者 | `teacher` | 选支教点学校；路由到**支教方**二级或平台 |
| 学校老师 | `admin_level_2` | 由**平台**分配 `l2Scope` 与**支教点学校/受援校**；`volunteer_side` 仅**区域**审志愿者、**聊天**看本校**已通过**教师会话，**不**用匹配/解绑；`recipient_side` 有**解绑**与区域/聊天；**二者均无会议 Tab/工作台会议入口**；未分配时提示等待 |
| 平台运营 | `admin_level_1` | 可审**全部**入驻与**认定义务时长**；为二级改派学校（支教/受援）。Mock 下**本机首条** L1 入驻**自动过审**（`storage` 键 `l1OnboardingSeeded`），之后 L1 新申请与其它角色一样**待审**，需已由其它账号通过的 L1 在「平台管理」中处理。 |

扩展字段（`userId`/手机号 维度的档案在 `miniprogram/utils/userProfileStore.js`）与入驻队列（`onboardingStore.js`）、**认定义务时长**待审（`hoursReviewStore.js`）、结对与解绑（`pairingStore.js`）均存**本地 `storage`**，可替换为 HTTP 时保持字段同构。

- **认定义务时长**：按受援校路由到**受援方**二级；一级在「平台管理」中也可审。演示数据在区域页仅**自动插入一次**（见 `ensureDemoForRecipientL2` 与 `zhixing_hours_demo_injected_*`）。
- **无对口二级**：`targetL2UserId` 为空时，学生/教师申请**仅**出现在一级待办；二级不展示。

**典型演示顺序**：1）**平台**账号完成入驻后进入 `admin/platform` 总览，再进各子页；2）**学校老师**用另一手机号注册并提交入驻，在 **学校老师待审** 中**通过**；3）在 **二级管理员权限** 页为其分配支教/受援学校；4）再用学生/教师账号提交，申请会出现在**对应二级**的待办，或在平台**对应身份**待审子页看到。

## 三向解绑

由**学员或志愿者**在 `unbind` 点选一条结对口、填原因后发起，学员、志愿者、受援方老师**依次或分别**在该结对的同一条解绑单上确认。**受援方**学校老师端**不能**在空白状态下浏览全校结对，而是**仅当**某条解绑已由其区内学生或志愿者**发起**后，才在列表中出现该申请；**点选一条**可展开**详情**（谁提出、原因、申请时间、学员/志愿者/本端**是否已通过**、必要时发起人手机尾号）。老师端**无「提交解绑申请」**按钮。平台在「平台管理」中仍保留**强制干预**以跳过三方。多结对与解绑单均存 `utils/pairingStore.js`（`getUnbindListForRecipientL2` 等；`zhixing_active_pairs`、`zhixing_unbind_requests`；兼容旧单条 `zhixing_active_pair` 迁移）。

## 会议

- **入口（学员 / 支教志愿者）**：`pages/meeting/index` 在**底部 Tab** 与「设置」之间（共五栏：工作台、匹配、聊天、**会议**、设置）；`pages/meeting/create/index` 为**新建**子页。一级 / 二级管理员**无**会议入口；误入会议页会 `switchTab` 回工作台。
- **不替代腾讯/其它会议平台建会**：在腾讯会议等**外部**建会后，将入会 **URL 粘贴**到「新建会议」；不调腾讯 OpenAPI 自动建会。
- **与结对**（`meetingStore.js`）：**学员/志愿者**必须选择**与聊天一致的 `pairId`**；双方同组可见。数据 `zhixing_meetings_v1` 存本地，可后换 HTTP。
- **仅学员与志愿者**可新建与查看本模块；管理员不使用会议列表。

## 与 `zhixingtongyi-1` 的关系

- 页面与逻辑已从 `zhixingtongyi-1/miniprogram` 迁入本目录 `miniprogram/`。
- 已移除云开发初始化及 `envList.js`；**请勿再**在 `project.config.json` 中配置 `cloudfunctionRoot`。
- 旧工程 `zhixingtongyi-1` 可仅作备份，日常以本目录为准。

## 开发者工具中 `WAServiceMainContext.js: Error: timeout`（说明）

- 该栈在**本仓库源码中无对应行号**，多为**微信基础库/开发者工具**在模拟器里的内部超时，并非必然由业务 `setTimeout` 引起。
- 可依次尝试：工具里 **清缓存并关闭项目 → 重新打开**、升级 **微信开发者工具**、在「项目详情 → 本地设置」**关闭**「**增强编译**」/「**懒注入**」类实验项（若与基础库 3.x 组合有兼容问题）、**重启电脑**、换 **基础库** 小版本重编。
- 若控制台**仅有**此条且小程序能正常进入首页，可暂观察；若同时有**自项目路径**的报错，再对那条堆栈查代码。

## 后续建议

- 在 `miniprogram/utils/env.js` 的 `envMap` 中填写真实 API 地址；登录成功后写入 `getApp().globalData.token`。
- 用户、结对、消息等持久化由后端 API 提供；若曾计划用云函数实现，请改为对应 HTTP 接口。
