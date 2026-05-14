# CI/CD 与自动化部署

## 当前方案：手动触发 + Git 拉取

开发 → GitHub Push → SSH 登录服务器 → Pull → Build → PM2 Restart

## 未来升级：GitHub Actions 自动部署

### 工作流设计

```yaml
# .github/workflows/deploy.yml
name: Deploy to Alibaba Cloud

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Deploy via SSH
        uses: appleboy/ssh-action@v1
        with:
          host: ${{ secrets.SERVER_HOST }}
          username: root
          key: ${{ secrets.SSH_PRIVATE_KEY }}
          script: |
            cd /root/nomad-map-project
            git pull origin main
            cd backend && npm install && pm2 restart nomad-backend
            cd ../frontend && npm install && npm run build && pm2 restart nomad-frontend
```

### 需要的 GitHub Secrets

| Secret | 说明 |
|--------|------|
| SERVER_HOST | 服务器 IP 或域名 |
| SSH_PRIVATE_KEY | SSH 私钥（对应服务器 ~/.ssh/authorized_keys） |

## 部署命令速查

```bash
# 完整更新流程
cd /root/nomad-map-project
git pull github main
cd backend && pm2 restart nomad-backend
cd ../frontend && npm run build && pm2 restart nomad-frontend

# 仅前端更新
cd /root/nomad-map-project/frontend
git pull github main
npm run build && pm2 restart nomad-frontend

# 仅后端更新
cd /root/nomad-map-project/backend
git pull github main
pm2 restart nomad-backend
```

## 回滚方案

```bash
# 回滚到上一个版本
cd /root/nomad-map-project
git log --oneline -5          # 查看最近提交
git reset --hard <commit-id>  # 回滚到指定提交
cd frontend && npm run build && pm2 restart nomad-frontend
cd ../backend && pm2 restart nomad-backend
```

## 数据库备份

```bash
# 手动备份
/root/nomad-map-project/scripts/db-backup.sh

# 自动备份 cron
0 2 * * * /root/nomad-map-project/scripts/db-backup.sh
```

## 健康检查

```bash
# 服务状态
pm2 list

# API 健康检查
curl http://localhost:4000/api/search/places?q=test

# Nginx 状态
nginx -t && systemctl status nginx
```
