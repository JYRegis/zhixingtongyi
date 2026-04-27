# 本地 Mock 数据说明（测试用）

本文件汇总小程序内**与页面展示相关**的 Mock/演示数据、**微信 Storage 键**、以及「一键铺数」的用法。正式联调 API 后，用接口数据替换下表文件即可。

**各测试手机号、身份、是否过审的说明**（以 seed 为准，纯文字表）：[MOCK_ACCOUNTS.md](./MOCK_ACCOUNTS.md)

**学员 / 支教志愿者「只看我自己的结对」（聊天列表、解绑选结对、新建会议选结对）**：演示数据下，按**手机号**稳定映射到 `pairingStore` 中的 `stu_001`～`stu_003` 或 `vol_001`～`vol_004`，只展示与当前账号**该身份**匹配的那条结对口（与全量演示表 `PAIRED_LIST` 中「同角色全部会话」区分）。实现见 `miniprogram/utils/chatPartners.js` 的 `getPairedListForUser`。

---

## 一、一键注入「完整测试包」

在**微信开发者工具**中：

1. 打开：调试器 → **Storage**（或「存储」）  
2. 新增或修改：键 `zhixing_run_mock_seed` = 字符串 `1`  
3. **重新编译**或**冷启动**小程序（会执行 `app.js` 的 `onLaunch`）  
4. 注入完成后该键会被**自动删除**；需再次注入时重新设为 `1`

**脚本入口**：`frontend/miniprogram/utils/mockDataSeed.js` 的 `runFullMockSeed()`，会执行：

- 写入若干**测试账号**到 `zhixing_user_profiles`（见下表；同号多笔入驻时，以**时间最新**一条定 `onboardingStatus`）  
- **覆盖** `zhixing_onboarding_applications`：学生/教师/**仅一级审**/**仅二级审**/L1/L2 自申；**待审、已通过、已驳回**；含**同一人多笔**（如：先驳后重提、先驳后过）  
- **覆盖** `zhixing_hours_reviews`：认定义务时长 **待审 / 已通过 / 已驳回**；含无对口 L2（`targetL2` 空）及一级已审样例  
- 覆盖 `zhixing_unbind_requests`：**待三方、已完成、已拒绝** 各一条样例（解绑列表页/逻辑若有展示）  
- 写入 `zhixing_saved_phones` 若干保存号码，便于登录页点选  
- 覆盖当前**结对**（`setActivePair`）一条演示数据  

> 会**覆盖**上述 key 的已有内容；建议仅测试机使用或先备份 Storage。

---

## 二、核心测试手机号（与 seed 强相关）

| 手机号 | 角色 / 说明 |
|--------|-------------|
| `13800138000` | 平台 L1，**已通过**（可进平台管理看全量待审） |
| `13800138001` | 平台 L1，**待审**（在入驻队列里有一条 app） |
| `13800138010` | 学校 L2，**支教方二级**，已审，支教点含 `sup_xmu`、`sup_ynu`（审志愿者 + 路由教师申请） |
| `13800138020` | 学校 L2，**受援方二级**，已审，受援校多校（审学生、审时长 + 路由学生） |
| `13800138011` 起 | 学生/教师/其它申请：由 `MOCK_APPLICATIONS` 与 `writeApplicantsFromQueue` 自动写档案，用于列表与联调展示 |

在模拟器里：首页选身份 → 登录页**手动输入**上表手机号 + 任意昵称，即可用该身份测（需与 seed 中 `role` 一致时最贴近；仅看「平台待办」时可用 `13800138000`）。

---

## 三、按文件/模块分类的 Mock 源

| 位置 | 内容 |
|------|------|
| `frontend/miniprogram/utils/schoolsMock.js` | 支教/受援学校、片区 `REGIONS`（已扩充多校，供下拉与 schoolId 引用） |
| `frontend/miniprogram/utils/proxyStudents.js` | 历史遗留：曾用于代选学员本地缓存；产品已**不再**在 UI 中提供代操作，本文件可保留为接口对接占位或后续清理 |
| `frontend/miniprogram/utils/userProfileStore.js` | 键 `zhixing_user_profiles`：按手机号的用户档案，**由 seed 或正常登录/入驻写入** |
| `frontend/miniprogram/utils/onboardingStore.js` | 键 `zhixing_onboarding_applications`；`l1OnboardingSeeded`；`replaceApplicationsForDev` |
| `frontend/miniprogram/utils/hoursReviewStore.js` | 键 `zhixing_hours_reviews`；`zhixing_hours_demo_injected_{phone}` 防区域重复演示 |
| `frontend/miniprogram/utils/pairingStore.js` | `zhixing_active_pairs`（多结对）、`zhixing_unbind_requests`；兼容旧 `zhixing_active_pair`；种子用 `replaceActivePairListForDev(mergeListWithDefaults(...))` |
| `frontend/miniprogram/utils/chatPartners.js` | 会话列表与 `zhixing_chat_{partnerId}` 首屏种子消息 |
| `frontend/miniprogram/pages/match/center/index.js` | `rawList`：推荐志愿者（`timeRaw` + 匹配分） |
| `frontend/miniprogram/pages/match/requests/index.js` | `SEED`：结对待办（希望上课时间与提交时间） |
| `frontend/miniprogram/pages/admin/platform/index.js` | 总览：KPI；各子项入口见同目录 `review`/`hours`/`risk`；`stats` 等仍为展示 Mock |
| `frontend/miniprogram/app.js` | `zhixing_run_mock_seed` 触发 `runFullMockSeed` |
| 其它 | 见 `frontend/README.md` 中 `zhixing_*` 与角色说明 |

---

## 四、Mock 已注入时的典型「测什么」

- **平台管理 `13800138000` 已通过**：身份待审中可见学生/教师/L2/第二条 L1；认定义务时长多笔待审。  
- **区域管理 `13800138020` 受援**：学生注册、认定义务时长与路由一致。  
- **区域 `13800138010` 支教**：志愿者待审。  
- **无对口二级**：`rec_lushi` 学员单（`app_seed_040`）`targetL2` 空，**仅**出现在一级。  
- **解绑/结对**：seed 后结对在龙兴；受援 L2 与 `getRecipientL2ForSchool` 一致时三向有 L2 槽。  

---

## 五、清空/重置建议

- 全清：开发者工具 **清缓存** → 存储 / 或删除项目 Storage。  
- 只重做 seed：设 `zhixing_run_mock_seed=1` 后重启。  
- 与 **首条 L1 自动过审** 强相关：键名 `l1OnboardingSeeded`；要复测「首条 L1 自动过」可删掉该键再提交一次 L1。

---

## 六、后续接后端

保持字段同构时，可保留 `mockDataSeed` 的**测试账号表**作 Postman/接口联调参考；页面侧删除 `onLaunch` 的 seed 分支与 `replaceApplicationsForDev` 调用点即可切生产。
