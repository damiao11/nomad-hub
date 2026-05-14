# 数据库配置文档

## 数据库信息

| 项目 | 内容 |
|------|------|
| 数据库 | MySQL 8.0 |
| 数据库名 | nomad_hub |
| 字符集 | utf8mb4 |
| 端口 | 3306 |
| ORM | 无（原生 mysql2 驱动） |

## ER 图

```
┌──────────────────────────┐
│          User            │
├──────────────────────────┤
│ PK  id         INT       │
│     userName   VARCHAR(50)│
│     password   VARCHAR(255)│ bcrypt 哈希
│     email      VARCHAR(255)│ UNIQUE
│     avatar     LONGTEXT   │ base64 Data URL
│     isAdmin    TINYINT(1) │ 默认 0
│     isBanned   TINYINT(1) │ 默认 0
└────────┬─────────────────┘
         │ 1
         │
         │ N
┌────────▼─────────────────┐
│          Trip            │
├──────────────────────────┤
│ PK  id         INT       │
│ FK  userId     INT       │──▶ User.id (CASCADE DELETE)
│     name       VARCHAR   │
│     lat        DOUBLE    │
│     lng        DOUBLE    │
│     note       TEXT      │
│     photoUrl   LONGTEXT   │ JSON 数组 or 单 URL
│     category   VARCHAR(20)│
│     isPublic   TINYINT(1) │ 默认 1
│     createdAt  DATETIME   │
└──────────────────────────┘

┌──────────────────────────┐
│      ChatMessages        │
├──────────────────────────┤
│ PK  id         VARCHAR(50)│
│     groupCode  VARCHAR(8) │ INDEX
│     memberId   VARCHAR(50)│
│     userName   VARCHAR(50)│
│     text       TEXT       │
│     createdAt  DATETIME   │ INDEX
└──────────────────────────┘
```

## 自动迁移

后端启动时自动检测并添加缺失的表/列：

```javascript
ensureTripPhotoLongText();   // Trip.photoUrl → LONGTEXT
ensureUserEmailColumn();     // User.email (如果不存在)
ensureUserAvatarColumn();    // User.avatar (如果不存在)
ensureUserAdminColumn();     // User.isAdmin
ensureUserBannedColumn();    // User.isBanned
ensureChatMessagesTable();   // 创建 ChatMessages 表
```

## 环境变量

```bash
# backend/.env
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASS=your_password
DB_NAME=nomad_hub
```

## 数据备份

每天凌晨 2 点自动备份，保留最近 7 天：

```bash
0 2 * * * /root/nomad-map-project/scripts/db-backup.sh
```
