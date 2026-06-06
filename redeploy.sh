#!/usr/bin/env bash
# 服务器端自动部署脚本（被 GitHub Actions 通过 SSH 调用，也可手动执行）
set -euo pipefail

APP_DIR="/root/zhixingtongyi"
BRANCH="dev"

cd "$APP_DIR"

echo "==> 拉取最新代码 (origin/${BRANCH})"
git fetch --all --prune
# 保留服务器本地的 .env（含密钥），仅同步代码
git stash push -- .env 2>/dev/null || true
git reset --hard "origin/${BRANCH}"
git stash pop 2>/dev/null || true

echo "==> 构建并启动容器"
# 若需要 nginx 反向代理，把下面命令换成： docker compose --profile nginx up -d --build backend nginx
docker compose build backend
docker compose up -d

echo "==> 清理悬空镜像"
docker image prune -f || true

echo "==> 当前容器状态"
docker compose ps
echo "==> 部署完成"
