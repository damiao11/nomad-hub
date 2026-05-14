# 部署文档

## 部署环境

| 项目 | 内容 |
|------|------|
| 云服务商 | 阿里云 ECS |
| 实例规格 | 1 核 2GB (t6 共享型) |
| 操作系统 | Ubuntu 22.04 LTS |
| 公网 IP | 115.29.209.243 |
| 域名 | nomadmap13.duckdns.org |
| SSL 证书 | Let's Encrypt (免费, 自动续期) |

## 部署架构

```
用户浏览器 (HTTPS)
    │
    ▼
Nginx (反向代理)
├── :80  → 301 重定向到 :443
├── :443 → SSL 终端
│   ├── /api/*        → http://127.0.0.1:4000  (Express)
│   ├── /socket.io/*  → http://127.0.0.1:4000  (WebSocket)
│   └── /*            → http://127.0.0.1:3000  (Next.js)
└── HTTP/2 + 限速 (10r/s, burst 20)

PM2 进程守护
├── nomad-backend  (Express)
└── nomad-frontend (Next.js)

MySQL 8.0 (本地)
```

## Nginx 配置要点

```nginx
# HTTP → HTTPS
server { listen 80; return 301 https://$host$request_uri; }

server {
    listen 443 ssl http2;
    ssl_certificate     /etc/letsencrypt/live/nomadmap13.duckdns.org/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/nomadmap13.duckdns.org/privkey.pem;

    location /api/ {
        limit_req zone=api burst=20 nodelay;
        proxy_pass http://127.0.0.1:4000;
    }

    location /socket.io/ {
        proxy_pass http://127.0.0.1:4000;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }

    location / { proxy_pass http://127.0.0.1:3000; }
}
```

## 部署流程

### 首次部署

```bash
# 1. 安装依赖
apt install -y nginx mysql-server nodejs npm certbot

# 2. 克隆代码
git clone https://github.com/damiao11/nomad-hub.git
cd nomad-map-project

# 3. 配置环境变量
cp backend/.env.example backend/.env
# 编辑 .env: DB_PASS, SMTP_USER, SMTP_PASS

# 4. 安装并构建
cd backend && npm install
cd ../frontend && npm install && npm run build

# 5. 启动服务
pm2 start node --name nomad-backend -- backend/src/simple-server.js
pm2 start npm --name nomad-frontend -- run start

# 6. 配置 Nginx + SSL
# (见上方 Nginx 配置)
nginx -t && nginx -s reload
```

### 日常更新

```bash
cd /root/nomad-map-project
git pull github main

# 后端更新
cd backend && pm2 restart nomad-backend

# 前端更新
cd ../frontend && npm run build && pm2 restart nomad-frontend
```

## CI/CD

采用**手动触发 + Git 拉取**的简化流程：

1. 本地开发 → git commit → git push 到 GitHub
2. SSH 登录服务器 → git pull → 重新构建 → PM2 重启

未来可升级为 GitHub Actions 自动部署：

```yaml
# .github/workflows/deploy.yml
on: push
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Deploy via SSH
        uses: appleboy/ssh-action@v1
        with:
          host: ${{ secrets.SSH_HOST }}
          script: |
            cd /root/nomad-map-project && git pull
            cd frontend && npm run build && pm2 restart nomad-frontend
            cd ../backend && pm2 restart nomad-backend
```

## 运维脚本

| 脚本 | 用途 | 频率 |
|------|------|------|
| scripts/db-backup.sh | mysqldump 备份 MySQL | 每天 02:00 |
| scripts/cert-renewal.sh | DNS 验证续期 SSL | 每月 1 号 03:00 |
| scripts/cert-cleanup.sh | 清理 DNS TXT 记录 | 续期后执行 |

## HTTPS 证书

- 申请方式：`certbot certonly --manual --preferred-challenges dns`
- 验证：DuckDNS TXT 记录
- 有效期：90 天
- 续期：cron 自动执行

## 访问地址

- **主域名**：https://nomadmap13.duckdns.org
- **直连 IP**：https://115.29.209.243（证书不匹配，有警告）
