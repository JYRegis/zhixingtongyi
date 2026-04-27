# 四角色界面：风格选型与分色策略

> 当前已落地：**候选 B：温暖成长系**（轻激励、不幼龄；奶白/暖色点缀/克制饱和度）。实现见 `miniprogram/utils/roleTheme.js`、`miniprogram/styles/role-theme.wxss`、各页根节点 `{{_roleThemeClass}}`、底栏 `custom-tab-bar`（`app.js` 内包装 `Page` 注入主题 class）。

## 分角色色板（与你确认的口径一致）

| `role` | 中文 | 主题 class | 说明 |
|--------|------|------------|------|
| `student` | 乡村学员 | `theme-student` | 主/辅**暖橙、杏色**；Hero 柔和暖渐变，成长感 |
| `teacher` | 支教志愿者 | `theme-teacher` | 主色**青蓝/蓝绿**（行动、连接） |
| `admin_level_2` | 学校老师 | `theme-l2` | **米白底**感 + **墨绿/橄榄**点缀、书卷气 |
| `admin_level_1` | 平台运营 | `theme-l1` | **降饱和**；中性灰 + **靛色单点**作链接/高亮，避免整页过暖像活动页 |
| `''` / 未登录 | — | `theme-guest` | 与首页/选角前一致：**奶白 + 暖杏强调** |

## CSS 变量约定

- 在带 `theme-*` 的**根节点**上定义 `--ui-primary`、`--ui-hero-start/end`、`--ui-page-bg-*` 等，全局 [`app.wxss`](../frontend/miniprogram/app.wxss) 的 `.page-shell`、`.page-hero`、`.btn-primary` 等用 `var(--ui-…)` 继承。
- 首页 [`home/index.wxss`](../frontend/miniprogram/pages/common/home/index.wxss)、注册/登录 [`auth/index.wxss`](../frontend/miniprogram/pages/common/auth/index.wxss) 对品牌区、主按钮等单独引用同一套变量，保证身份切换后色系统一。

## 品牌 VI

- 无单独 VI 文件时，**以本表与 `roleTheme.js` 为准**；若后续有校色/品牌主色，优先只改 `role-theme.wxss` 中各 `.theme-*` 块，少改页面结构。

## 维护

- 新页面：最外层 `view` 增加 `{{_roleThemeClass}}`（与全项目 `Page` 包装一致即可）。
- 新角色：在 `roleTheme.js` 增加映射，在 `role-theme.wxss` 增加一套 `.theme-…` 变量与底栏高亮色。
