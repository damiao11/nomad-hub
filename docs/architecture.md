# NomadFlow 架构设计文档

## 一、项目命题

**NomadFlow** — 一款面向旅行爱好者的 Web 实时地图协作平台。用户可在地图上标记足迹、与朋友分享实时位置、进行群组聊天。解决旅行中"找不到人""记不住去过哪"的痛点。

## 二、整体架构

```
┌─────────────┐     ┌─────────────┐     ┌──────────┐
│   Browser   │────▶│   Nginx     │────▶│ Express  │
│  (React)    │     │  :80/:443   │     │  :4000   │
│  Socket.IO  │◀───▶│  Reverse    │◀───▶│ Socket.IO│
└─────────────┘     │  Proxy      │     └────┬─────┘
                    └─────────────┘          │
                                           │
                                      ┌────▼─────┐
                                      │  MySQL   │
                                      │  :3306   │
                                      └──────────┘
```

### 通信协议

| 场景 | 协议 | 用途 |
|------|------|------|
| 用户认证、足迹 CRUD、地点搜索 | HTTP REST | 无状态请求 |
| 实时消息、位置共享、群组事件 | WebSocket | 双向实时推送 |

## 三、前端架构

### 3.1 目录结构

```
frontend/
├── app/                         # Next.js App Router
│   ├── layout.tsx               # 根布局（viewport、字体）
│   ├── page.tsx                 # 唯一页面 → 动态加载 LeafletMap
│   └── globals.css              # Tailwind + 自定义样式
├── components/                  # 12 个业务组件
│   ├── auth/LoginPanel.tsx      # 登录/注册/资料/赞赏
│   ├── chat/GroupChatPanel.tsx  # 群聊面板（memo）
│   ├── common/
│   │   ├── ConfirmDialog.tsx     # 通用确认弹窗
│   │   └── NoticeDialog.tsx      # 通用通知弹窗
│   ├── group/GroupInvitePanel.tsx # 群组创建/加入
│   ├── guide/OnboardingGuide.tsx  # 新用户引导
│   ├── map/
│   │   ├── LeafletMap.tsx        # 主地图（聚合所有子组件）
│   │   └── BottomControlBar.tsx  # 底部控制栏
│   ├── media/ImagePreviewOverlay.tsx # 图片全屏预览
│   ├── search/MapSearchBar.tsx   # 统一搜索框
│   └── trip/
│       ├── TripCreateDialog.tsx  # 创建足迹（memo）
│       └── TripEditDialog.tsx    # 编辑足迹（memo）
├── hooks/                       # 4 个自定义 Hook
│   ├── useAuth.ts               # 认证（登录/注册/资料修改）
│   ├── useTrip.ts               # 足迹 CRUD
│   ├── useGroupChat.ts          # 群聊状态
│   └── useGroupInvite.ts        # 群组操作
├── lib/auth/authRules.ts        # 密码/邮箱校验规则
├── next.config.ts               # Next.js 配置（allowedDevOrigins）
└── public/                      # 静态资源（收款码等）
```

### 3.2 组件关系

```
page.tsx
  └── LeafletMap.tsx (主组件, 管理所有状态)
        ├── LoginPanel (未登录时)
        ├── MapSearchBar (搜索框)
        ├── TripCreateDialog / TripEditDialog (足迹表单)
        ├── GroupInvitePanel (群组管理)
        ├── GroupChatPanel (群聊)
        ├── BottomControlBar (定位/共享/群组按钮)
        ├── OnboardingGuide (首次引导)
        ├── ImagePreviewOverlay (图片预览)
        ├── NoticeDialog / ConfirmDialog (通用弹窗)
        ├── LiveLocationTracker (内部组件, 实时定位)
        ├── TripMarkers (内部组件, 聚类标记)
        └── MapClickHandler (内部组件, 点击创建足迹)
```

### 3.3 数据流

```
用户操作 → LeafletMap 状态 → 自定义 Hook → API/Socket.IO → 后端 → MySQL
                                                                    ↓
用户看到 ← LeafletMap 重渲染 ← 状态更新 ← Hook 回调 ←────────── 响应
```

### 3.4 关键设计决策

| 决策 | 理由 |
|------|------|
| 单页应用（无路由） | 地图为唯一界面，不需要页面切换 |
| 所有状态在 LeafletMap | 避免跨组件状态同步，简化数据流 |
| React.memo 包裹重组件 | 群聊面板/表单避免无关重渲染 |
| CSS filter 深色模式 | 高德无暗色瓦片，颜色反转实现 |
| GCJ-02 坐标转换 | 高德地图必须用火星坐标显示 |

## 四、后端架构

### 4.1 目录结构

```
backend/src/
├── simple-server.js         # 入口（加载 .env → 创建 app → 启动 server → 数据库迁移）
├── app.js                   # Express 应用（CORS + JSON + 路由注册）
├── server.js                # HTTP Server 创建 + Socket.IO 绑定
├── config/constants.js      # 环境变量集中管理
├── db/mysql.js              # 连接池 + photo/email/avatar/isAdmin 自动迁移
├── routes/
│   ├── authRoutes.js        # 注册/登录/发验证码/重置密码/修改资料
│   ├── tripRoutes.js        # 足迹 CRUD（含搜索）
│   └── searchRoutes.js      # 地点搜索（Nominatim → Photon → 本地兜底）
├── socket/groupSocket.js    # Socket.IO 群组事件处理
└── utils/
    ├── authRules.js          # 密码/邮箱正则
    ├── mailer.js             # 163 SMTP 邮件发送
    ├── verificationCodes.js  # 验证码生成/存储/校验
    ├── rateLimiter.js        # 登录/验证码频率限制
    └── contentModeration.js  # 阿里云内容安全审核
```

### 4.2 API 路由表

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /api/auth/send-code | 发送邮箱验证码 |
| POST | /api/register | 注册（需验证码） |
| POST | /api/login | 登录（bcrypt 校验） |
| POST | /api/auth/reset-password | 重置密码 |
| PUT  | /api/user/profile | 修改用户名/头像 |
| GET  | /api/search/places?q=&lat=&lng= | 地点搜索（按距离排序） |
| GET  | /api/trips?userId=&q= | 足迹列表/搜索 |
| POST | /api/trips | 创建足迹 |
| PUT  | /api/trips/:id | 修改足迹 |
| DELETE | /api/trips/:id | 删除足迹 |

### 4.3 Socket.IO 事件表

| 客户端 emit | 服务端 emit | 说明 |
|------------|------------|------|
| create-group | group-joined | 创建群组 |
| join-group | group-members | 加入群组 |
| leave-group | - | 离开群组 |
| group-message | group-message | 发送消息 |
| update-location | group-locations | 更新位置 |
| mark-read | group-members | 标记已读 |
| mute-member | group-members | 禁言成员 |
| kick-member | kicked | 踢出成员 |
| admin-delete-message | admin-message-deleted | 管理员删消息 |
| admin-ban-member | kicked | 管理员封禁用户 |
| request-group-history | group-history | 加载历史消息 |
| request-group-members | group-members | 请求成员列表 |

### 4.4 数据库设计

| 表 | 字段 | 说明 |
|----|------|------|
| User | id, userName, password(bcrypt), email, avatar(LONGTEXT), isAdmin, isBanned | 用户表 |
| Trip | id, name, lat, lng, userId(FK), note, photoUrl(LONGTEXT), category, isPublic, createdAt | 足迹表 |
| ChatMessages | id, groupCode, memberId, userName, text, createdAt | 群聊消息（持久化） |

## 五、部署架构

```
Internet (HTTPS)
    │
    ▼
Nginx (:80 → 301 :443)
    │  SSL: Let's Encrypt (nomadmap13.duckdns.org)
    │  HTTP/2
    │  限速: 10r/s per IP (burst 20)
    │
    ├── /api/*      → localhost:4000 (Express)
    ├── /socket.io/* → localhost:4000 (Socket.IO, WebSocket upgrade)
    └── /*          → localhost:3000 (Next.js)
```

- **云服务商**: 阿里云 ECS
- **操作系统**: Ubuntu 22.04
- **进程管理**: PM2
- **域名**: nomadmap13.duckdns.org (DuckDNS 动态 DNS)
- **证书**: Let's Encrypt (certbot manual DNS challenge, 每 3 月续期)
- **备份**: mysqldump + cron 每天凌晨 2 点
