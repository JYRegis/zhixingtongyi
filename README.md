# zhixingtongyi
知行同驿支教云平台

## 本地启动（Docker Compose）

1. 复制环境变量模板并按需修改

```bash
copy .env.example .env
```

2. 启动 MySQL + Redis + RabbitMQ + 后端（会自动执行 `design/init.sql` 初始化库表）

```bash
docker compose up --build
```

3. 接口访问

后端启动后访问：
- Swagger：`http://localhost:8080/api/v1/swagger-ui.html`

RabbitMQ 管理台：
- `http://localhost:15672`（账号/密码见 `.env`，默认 `admin/admin`）

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
