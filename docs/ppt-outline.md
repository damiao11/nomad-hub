# 期末答辩 PPT 大纲

## 一、项目概述（2 分钟）

**Slide 1: 封面**
- 项目名称：NomadFlow 游牧地图
- 一句话介绍：实时地图协作平台
- 姓名、学号、日期

**Slide 2: 项目背景 & 痛点**
- 旅行中找不到同伴 → 实时位置共享
- 去过的地方记不住 → 地图标记足迹
- 群聊消息不保留 → MySQL 持久化存储

**Slide 3: 核心功能一览**
- 🗺️ 足迹记录 · 📍 实时定位 · 💬 群组聊天 · 🔍 智能搜索
- 截图展示主界面

---

## 二、架构设计（3 分钟）

**Slide 4: 整体架构图**
```
Browser ←→ Nginx(HTTPS/HTTP2) ←→ Express + Socket.IO ←→ MySQL
```
- 前端：Next.js 16 + React 19 + Leaflet 地图
- 后端：Express 5 REST API + Socket.IO WebSocket
- 数据库：MySQL 8.0
- 部署：阿里云 ECS + PM2 进程守护

**Slide 5: 前端架构**
- 12 个业务组件 + 4 个自定义 Hook
- 单页应用（SPA），所有状态集中在 LeafletMap
- React.memo 优化性能
- GCJ-02 坐标转换（高德地图合规）
- 手机端图片压缩简化（640px 单次处理）

**Slide 6: 后端架构**
- REST API（认证、足迹 CRUD、地点搜索）
- Socket.IO 事件驱动（消息、位置、群组管理）
- bcrypt 密码哈希 + 邮箱验证码注册
- 三层搜索：Nominatim → Photon → 本地兜底，按距离排序

**Slide 7: 数据库设计**
- User 表（bcrypt 密码、邮箱、头像、管理员标记）
- Trip 表（经纬度、照片、分类）
- ChatMessages 表（群聊持久化）
- 自动迁移机制

**Slide 8: 通信设计**
- REST：无状态请求（登录、足迹 CRUD）
- WebSocket：实时推送（消息、位置、群组事件）
- 对比表格展示两种协议的适用场景

---

## 三、功能实现（3 分钟）

**Slide 9: 用户系统**
- 邮箱验证码注册（163 SMTP 真实发送）
- bcrypt 密码加密存储
- 忘记密码重置
- 登录/验证码频率限制
- 个人资料编辑（用户名 + 头像）

**Slide 10: 足迹管理**
- 点击地图创建足迹，配照片和备注
- 客户端 Canvas 压缩（桌面迭代优化，手机单次简化）
- 标记聚类（leaflet.markercluster）
- 不同标记按 ID 分色

**Slide 11: 群组功能**
- 创建/加入群组（6 位邀请码）
- 实时位置共享（浏览器 Geolocation API + 桌面 IP 降级）
- 群聊消息 Socket.IO 实时推送 + MySQL 持久化
- 群主禁言/踢人，管理员删消息/封禁
- 消息已读状态

**Slide 12: 其他亮点**
- 深色模式（CSS filter 反转瓦片）
- 统一搜索（地点 + 足迹，按位置排序）
- 新用户引导弹窗
- 赞赏作者
- 网站自适应手机/电脑

---

## 四、页面设计（2 分钟）

**Slide 13: 界面展示**
- 主地图页面截图
- 手机端截图
- 深色模式对比图
- 登录/注册面板
- 足迹弹窗截图
- 群聊面板截图

**Slide 14: UI 设计要点**
- 配色方案：#7E9D82 主色调（森林绿）
- 毛玻璃效果（backdrop-blur）
- 圆形头像 + 彩色标记
- 手机端 iPhone 刘海屏适配（viewport-fit: cover）
- 低保真原型 → 高保真页面演进过程

---

## 五、部署 & 总结（2 分钟）

**Slide 15: 部署方案**
- 阿里云 ECS（1核2G Ubuntu 22.04）
- DuckDNS 动态域名 + Let's Encrypt 免费 SSL
- Nginx 反向代理 + HTTP/2 + 限速
- PM2 进程守护 + 数据库定时备份
- 简化 CI/CD（Git Push → SSH Pull → Build → Restart）

**Slide 16: 技术栈汇总**
| 层级 | 技术 |
|------|------|
| 前端 | Next.js 16, React 19, Leaflet, Tailwind CSS |
| 后端 | Express 5, Socket.IO, MySQL2, bcrypt, Nodemailer |
| 部署 | 阿里云 ECS, Nginx, PM2, Let's Encrypt |

**Slide 17: 项目难点 & 收获**
- 难点1：中国地图 GCJ-02 坐标转换
- 难点2：手机端图片压缩性能优化
- 难点3：实时通信 WebSocket + REST 双协议协调
- 难点4：自签名证书 → 受信 HTTPS 证书
- 收获：全栈开发、服务器运维、安全实践

**Slide 18: 致谢**
- 感谢老师
- 项目地址：https://nomadmap13.duckdns.org
- GitHub：https://github.com/damiao11/nomad-hub
- Q&A

---

## 演讲时间分配（总计 12 分钟）

| 部分 | 时间 | 幻灯片 |
|------|------|--------|
| 项目概述 | 2 分钟 | 1-3 |
| 架构设计 | 3 分钟 | 4-8 |
| 功能实现 | 3 分钟 | 9-12 |
| 页面设计 | 2 分钟 | 13-14 |
| 部署总结 | 2 分钟 | 15-18 |
