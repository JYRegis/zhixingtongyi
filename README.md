# zhixingtongyi
知行同驿支教云平台

## 本地启动（Docker Compose）

1. 复制环境变量模板并按需修改

```bash
copy .env.example .env
```

> [!IMPORTANT]
> 安全提醒：请把敏感配置（如 `JWT_SECRET`、`WX_MINIAPP_APPID`、`WX_MINIAPP_SECRET`）只写在本机 `.env`。
> `docker-compose.yml` 会进入版本库，不能填写真实密钥。

2. 启动 MySQL + Redis + RabbitMQ + 后端（会自动执行 `design/init.sql` 初始化库表）

```bash
docker compose up --build
```

> **说明**：`init.sql` 只在 MySQL **空数据目录**时执行一次。若你曾用旧版脚本建过库，数据卷里仍是旧表结构，升级代码后可能出现 `Unknown column 'deleted' in 'field list'`。任选其一处理：
>
> - **保留数据**：连上库后执行（与当前 `design/init.sql` 一致）：
>
> ```sql
> USE aid_education_platform; -- 或你的 DB_NAME
> ALTER TABLE `user`
>   ADD COLUMN `deleted` tinyint NOT NULL DEFAULT 0 COMMENT '逻辑删除：0-未删除，1-已删除';
> ```
>
> - **可清空数据**：见下文「数据库重建选项」——可只删 MySQL 卷，或删掉全部 Compose 卷。

3. 接口访问

后端启动后访问：
- Swagger：`http://localhost:8080/api/v1/swagger-ui.html`

RabbitMQ 管理台：
- `http://localhost:15672`（账号/密码见 `.env`，默认 `admin/admin`）

## 数据库重建选项

均在包含 `docker-compose.yml` 的目录（本仓库 `zhixingtongyi/`）下执行。`init.sql` 仅在 MySQL **使用全新空数据卷**时执行；删卷后首次启动 MySQL 会重新建库。

### 仅重建 MySQL（保留 Redis、RabbitMQ 数据）

Compose 工程名为 `rural-education-platform`（见 `docker-compose.yml` 顶层 `name`），MySQL 命名卷一般为 **`rural-education-platform_mysql_data`**。若你设置过 `COMPOSE_PROJECT_NAME`，请用 `docker volume ls` 核对实际卷名后再 `docker volume rm`。

```bash
docker compose stop mysql
docker compose rm -f mysql
docker volume rm rural-education-platform_mysql_data
docker compose up -d mysql
```

待 MySQL 健康检查通过后，再启动其余服务（含后端）：

```bash
docker compose up -d
```

如需顺带重建后端镜像，可用 `docker compose up -d --build`。

若 `docker volume rm` 提示卷仍被使用：确认已执行 `docker compose rm -f mysql`，并用 `docker ps -a` 查看是否还有占用该卷的容器。

### 清空全部 Compose 卷（MySQL + Redis + RabbitMQ）

**会丢失上述所有持久化数据。**

```bash
docker compose down -v
docker compose up --build
```

## 本地直接启动后端（推荐开发用）

1. 仅启动中间件（不启动后端容器）

```bash
docker compose up -d mysql redis rabbitmq
```

2. 本机运行后端（使用 `dev` 配置）

```bash
cd backend
mvn spring-boot:run -Dspring-boot.run.profiles=dev
```

3. 端口说明

- 目前 `.env` 中 MySQL 映射端口为 `3307`（宿主机：`127.0.0.1:3307`）。
- 如果你用“本地运行后端”，请确保 `backend/src/main/resources/application-dev.yml` 里的 MySQL 连接端口与实际映射一致（例如改为 `3307`）。

## 可选：启用 Nginx 反代

```bash
docker compose --profile nginx up --build
```


