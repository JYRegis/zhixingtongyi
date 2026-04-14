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
| `docs/` | 产品/前端说明（如页面清单） |

## 主要页面入口

- **首页（选身份）**：`pages/common/home/index`
- **注册与登录**：`pages/common/auth/index`
- **工作台 / 匹配 / 聊天 / 设置**：底部 TabBar
- **资料**：`pages/common/profile/index`
- **管理**：`pages/admin/region/index`（区域）、`pages/admin/platform/index`（平台）

更细的列表见 `docs/frontend-page-list.md`。

## 与 `zhixingtongyi-1` 的关系

- 页面与逻辑已从 `zhixingtongyi-1/miniprogram` 迁入本目录 `miniprogram/`。
- 已移除云开发初始化及 `envList.js`；**请勿再**在 `project.config.json` 中配置 `cloudfunctionRoot`。
- 旧工程 `zhixingtongyi-1` 可仅作备份，日常以本目录为准。

## 后续建议

- 在 `miniprogram/utils/env.js` 的 `envMap` 中填写真实 API 地址；登录成功后写入 `getApp().globalData.token`。
- 用户、结对、消息等持久化由后端 API 提供；若曾计划用云函数实现，请改为对应 HTTP 接口。
