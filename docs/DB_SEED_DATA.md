# 后端真库：全表联调种子数据说明

> **和 [MOCK_ACCOUNTS.md](./MOCK_ACCOUNTS.md) 的区别**：[MOCK_ACCOUNTS.md](./MOCK_ACCOUNTS.md) 描述的是**小程序端本地 Storage Mock** 的手机号与场景；本文件描述的是 **MySQL 中 12 张业务表** 的测试行，用 **DataGrip / mysql 命令行** 在跑通 `init.sql` 之后**手动执行**一份 SQL 脚本。两者用途不同，手机号段也不相同。

---

## 使用前提

1. 已建库并执行过 [`init.sql`](../../zhixingtongyi-zyh/design/init.sql)（`aid_education_platform`）。
2. 库内**尚未**插入与种子脚本冲突的主键/唯一键（如 `user.id` 1～6、固定手机号、`wechat_openid` 等）。最稳妥：整库**删库重建**后再执行 init，再执行种子。
3. 脚本位置：[seed_test_data.sql](../../zhixingtongyi-zyh/design/seed_test_data.sql)。

### 如何执行

在能连上本机/容器内 MySQL 的客户端中：

```text
-- 将路径换成你本机项目路径
SOURCE d:/homework/WeChatProjects/zhixingtongyi-zyh/design/seed_test_data.sql;
```

或命令行（端口以 `application-dev.yml` / Docker 映射为准，示例 `3307`）：

```bash
mysql -h 127.0.0.1 -P 3307 -u root -p aid_education_platform < zhixingtongyi-zyh/design/seed_test_data.sql
```

执行成功后，12 张表均有**至少一行**可联调数据（`algorithm_weight_config` 在 init 中已有 4 条，种子再 `INSERT IGNORE` 第 5 条演示用）。

### 若执行失败

- **主键/唯一键冲突**：说明库中已有数据。请清空后重导 init，或自行按**依赖顺序**从子表到父表删除再执行（见下文「外键与插入顺序」）。
- **外键错误**：请确认已完整执行 `init.sql`（含 `chat_message` 对 `chat_participant` 的复合外键）。

---

## 外键与插入顺序（脚本已按此顺序书写）

1. `school` → 2) `user` → 3) `admin_profile` → 4) `teacher_profile` → 5) `student_profile`  
2. `match_pair` → `meeting`  
3. `chat_participant`（**必须早于** `chat_message`，因 `chat_message` 有 `(match_pair_id, sender_id)` → `chat_participant`）  
4. `chat_message` → `message_notification`  
5. `algorithm_weight_config`（与 init 不冲突的一行，或二次执行时 `IGNORE`）  
6. `volunteer_record`（可引用 `meeting.id`）

---

## 按角色：测试用手机号与 user.id

> 后端**手机号登录**只按 `phone` 查用户，不校验 `password` 字段。下列号码可直接在「手机登录/演示」中输入（若你的接口有验证码流，以实际环境配置为准）。  
> **user.password** 在种子中为 **BCrypt( Test123456 )**（同脚本内哈希值），供将来若有**账号密码**类接口时自测。

| user.id | 角色 | phone | 用户名（username） | 说明 |
|--------:|------|--------|-------------------|------|
| 1 | 一级管理员 | 13800100001 | seed_l1_admin | 有 `admin_profile`，管全省 |
| 2 | 二级管理员 | 13800100010 | seed_l2_云龙 | 绑定 `school_id=1`，可建会、审时长、代管所在校结对 |
| 3 | 志愿者 | 13800100020 | seed_vol_张老师 | `certification_status=1`，与学员 4 已结对 `match_pair.id=1` |
| 4 | 学员 | 13800100012 | seed_stu_小李 | 资料**可发起配对** `profile_status=1`，`audit_status=1` |
| 5 | 志愿者 | 13800100021 | seed_vol_待审 | `certification_status=0`，与学员 6 结对**待接受** `match_pair.id=2` |
| 6 | 学员 | 13800100018 | seed_stu_王同学 | 资料草稿 `profile_status=0`，`audit_status=0` |

---

## 表与样例行（便于接口联调）

| 表名 | 种子中的要点 |
|------|----------------|
| `school` | `id=1` 云龙县一中；`id=2` 昆明示范小学。 |
| `user` | `id` 1～6 如上表；`wechat_openid` 以 `wx_seed_` 开头，唯一。 |
| `admin_profile` | L1 对应 `user_id=1`；L2 对应 `user_id=2`，`school_id=1`。 |
| `teacher_profile` | `user_id=3` 已审核；`user_id=5` 待审核。 |
| `student_profile` | 学员 4 绑定 `bind_admin_id=2`；学员 6 同绑定 2。 |
| `match_pair` | `id=1`：`student_id=4`，`teacher_id=3`，`match_status=1`（已接受）；`id=2`：`6`/`5`，`match_status=0`（已申请）。 |
| `meeting` | `id=1` 属于 `match_pair_id=1`，`created_by=2`，`status=2`（已结束）。 |
| `chat_participant` | 结对 1 含 L2(2)、教师(3)、学生(4)；结对 2 含 2/5/6。 |
| `chat_message` | 3 条，发送者均在该结对的 `chat_participant` 中。 |
| `message_notification` | 结对申请/通过/会议提醒 各 1 条样例。 |
| `algorithm_weight_config` | init 中已有 4 行；种子再补 `id=5` `seed_demo_factor`（`INSERT IGNORE`）。 |
| `volunteer_record` | 1 条：`match_pair_id=1`，`meeting_id=1`，`status=2`（审核通过），`auditor_id=2`。 |

---

## 改进与注意

- **重复执行**：本脚本**不是**完全幂等（多数字段为硬编码 `INSERT`）。开发环境建议**整库重导**后再执行一次。若需可重复跑，可后续改为：先 `DELETE` 子表再父表、或 `REPLACE`/事务+条件插入。
- **与小程序 Mock 联调**：若前端写死了「二级管理员 `userId`」等常量，请对照本表 `user.id=2` 等自行对齐，或改前端指向种子里的固定 id。

---

## 为什么登了种子手机号还被要求填「入驻申请表」？

小程序是否进工作台，看的是**本机 Storage** 里 `zhixing_user_profiles` 中该手机号的 **`onboardingStatus`**（以及本地入驻申请队列），**不是**直接读 MySQL 的 `audit_status`。仅往数据库灌种子，若登录后没有同步，会仍被 [`onboardingGuard.js`](../frontend/miniprogram/utils/onboardingGuard.js) 判为未入驻，从而跳「身份入驻申请」。

**当前工程已做**：在 `config/demoBackend.js` 中 `USE_BACKEND_ONBOARDING === true` 时，**手机号登录成功**后会根据后端接口拉取档案并写入本机状态（学员看 `auditStatus`、志愿者看 `certificationStatus`、一/二级管理员直接视为已通过），并清理该号在**本地**的 `zhixing_onboarding_applications` 队列，避免与后端态冲突。

若仍异常，请检查：① 后端已启动且小程序 `env` 能连上；② 该号在库里**确有**对应 `student_profile` / `teacher_profile`；③ 若曾用同一号码跑过本地 Mock 入驻，可尝试在开发者工具中**清除 Storage** 后重新登录。

**与 [MOCK_ACCOUNTS.md](./MOCK_ACCOUNTS.md) 的号段**：文档里 `138001380xx` 多为 **Mock 种子**专用；本页的 `138001000xx` 为 **MySQL 种子**专用，二者不是同一套号码。
