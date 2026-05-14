# NomadFlow 游牧地图

基于 Web 的实时地图协作平台，支持足迹记录、位置共享与群组通信。

## 项目结构

```
nomad-map-project/
├── frontend/                     # Next.js 16 前端
│   ├── app/                      # App Router 页面
│   │   ├── page.tsx              # 主页面（SPA，加载 LeafletMap）
│   │   ├── layout.tsx            # 根布局（viewport 适配）
│   │   └── globals.css           # 全局样式（Tailwind + 自定义）
│   ├── components/
│   │   ├── auth/LoginPanel.tsx   # 登录/注册/资料编辑/赞赏
│   │   ├── chat/GroupChatPanel.tsx # 群聊面板
│   │   ├── common/ConfirmDialog.tsx # 确认弹窗
│   │   ├── common/NoticeDialog.tsx  # 通知弹窗
│   │   ├── group/GroupInvitePanel.tsx # 群组管理
│   │   ├── guide/OnboardingGuide.tsx  # 新用户引导
│   │   ├── map/BottomControlBar.tsx   # 底部控制栏
│   │   ├── map/LeafletMap.tsx         # 主地图组件
│   │   ├── media/ImagePreviewOverlay.tsx # 图片预览
│   │   ├── search/MapSearchBar.tsx    # 统一搜索框
│   │   └── trip/                      # 足迹创建/编辑对话框
│   ├── hooks/                    # 自定义 Hooks
│   │   ├── useAuth.ts            # 认证状态管理
│   │   ├── useTrip.ts            # 足迹 CRUD
│   │   ├── useGroupChat.ts       # 群聊消息
│   │   └── useGroupInvite.ts     # 群组操作
│   ├── lib/auth/                 # 认证规则
│   └── public/                   # 静态资源
├── backend/                      # Express 5 后端
│   ├── src/
│   │   ├── simple-server.js      # 入口文件
│   │   ├── app.js                # Express 应用工厂
│   │   ├── server.js             # HTTP + Socket.IO 启动
│   │   ├── config/constants.js   # 环境配置
│   │   ├── db/mysql.js           # MySQL 连接池 + 自动迁移
│   │   ├── routes/               # REST API 路由
│   │   ├── socket/groupSocket.js # Socket.IO 事件处理
│   │   └── utils/                # 工具模块
│   └── .env.example              # 环境变量模板
└── scripts/                      # 运维脚本
    ├── db-backup.sh              # 数据库备份
    ├── cert-renewal.sh           # SSL 证书续期
    └── cert-cleanup.sh           # DNS 验证清理
```

## 技术栈

| 层级 | 技术 | 说明 |
|------|------|------|
| 前端 | Next.js 16 (React 19) | App Router SPA |
| 地图 | Leaflet + react-leaflet | 高德地图瓦片 |
| 样式 | Tailwind CSS 4 | 响应式布局 |
| 实时通信 | Socket.IO Client | WebSocket |
| 后端 | Express 5 | REST API |
| 数据库 | MySQL 8 | mysql2 驱动 |
| 认证 | bcrypt + 邮箱验证码 | Nodemailer (163 SMTP) |
| 部署 | Nginx + PM2 | 阿里云 ECS |
| HTTPS | Let's Encrypt | DuckDNS 动态域名 |

## 快速开始

### 1. 数据库

```sql
CREATE DATABASE nomad_hub DEFAULT CHARSET utf8mb4;
```

后端启动时会自动创建表和添加缺失字段。

### 2. 后端

```bash
cd backend
cp .env.example .env   # 编辑数据库密码、SMTP 等配置
npm install
node src/simple-server.js
```

### 3. 前端

```bash
cd frontend
echo "NEXT_PUBLIC_API_BASE_URL=" > .env.local
npm install
npm run dev
```

打开 `http://localhost:3000`

### 4. 环境变量

**backend/.env**
```ini
SERVER_HOST=0.0.0.0
PORT=4000
API_ORIGINS=http://localhost:3000
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASS=your_password
DB_NAME=nomad_hub
SMTP_USER=your@163.com
SMTP_PASS=your_smtp_auth_code
```

**frontend/.env.local**
```ini
NEXT_PUBLIC_API_BASE_URL=
```

## 部署

已部署于阿里云 ECS，通过 Nginx 反向代理，Let's Encrypt 免费 SSL。

```bash
# 生产构建
cd frontend && npm run build
pm2 start npm --name nomad-frontend -- run start
pm2 start node --name nomad-backend -- backend/src/simple-server.js
```

## 许可证

MIT
