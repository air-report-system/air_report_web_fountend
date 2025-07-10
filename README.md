# 室内空气检测数据处理系统 - 前端

基于 AI 的室内空气质量检测报告生成系统前端应用，提供直观的用户界面和完整的数据处理工作流。

## 📋 项目简介

本系统是一个专业的室内空气质量检测数据处理平台，主要功能包括：

- **OCR 图像识别**：自动识别检测报告图片中的文字信息
- **智能报告生成**：基于 AI 技术生成专业的检测报告
- **批量数据处理**：支持大量检测数据的批量处理和分析
- **月度报表统计**：生成详细的月度数据统计报表
- **订单信息管理**：智能提取和管理客户订单信息
- **用户权限管理**：完整的用户认证和权限控制系统

## 🚀 主要功能

### 1. OCR 处理与报告生成

- 上传检测报告图片，自动识别文字信息
- 提取关键数据：客户信息、检测点位、环境条件等
- 生成标准化的检测报告（Word/PDF 格式）
- 支持微信模板生成

### 2. 批量处理

- 批量上传和处理多个检测报告
- 实时监控处理进度
- 批量生成报告和下载

### 3. 月度报表

- 基于数据库的月度统计报表
- CSV 格式的数据导出
- 可视化数据展示

### 4. 订单信息记录

- AI 智能提取订单关键信息
- 客户信息管理（姓名、电话、地址）
- 商品信息记录（类型、金额、面积）
- 服务信息跟踪（履约时间、CMA 点位）

## 🛠 技术栈

### 核心框架

- **Next.js 15.3.4** - React 全栈框架，支持 SSR/SSG
- **React 19.0.0** - 用户界面库
- **TypeScript 5** - 类型安全的 JavaScript

### UI 组件与样式

- **Tailwind CSS 3.4.17** - 原子化 CSS 框架
- **Headless UI 2.2.4** - 无样式可访问组件
- **Radix UI** - 高质量组件库
- **Lucide React 0.523.0** - 现代图标库

### 状态管理与数据获取

- **TanStack Query 5.81.2** - 服务端状态管理
- **Axios 1.10.0** - HTTP 客户端
- **React Context** - 全局状态管理（认证）

### 开发工具

- **ESLint 9** - 代码质量检查
- **PostCSS 8.4.49** - CSS 后处理器
- **Autoprefixer 10.4.20** - CSS 前缀自动添加

### 文件处理

- **React Dropzone 14.3.8** - 文件拖拽上传组件

## 📁 项目结构

```text
src/
├── app/                    # Next.js App Router
│   ├── api/               # API 路由
│   ├── globals.css        # 全局样式
│   ├── layout.tsx         # 根布局组件
│   └── page.tsx           # 主页面
├── components/            # React 组件
│   ├── auth/             # 认证相关组件
│   ├── batch/            # 批量处理组件
│   ├── monthly/          # 月度报表组件
│   ├── ocr/              # OCR 处理组件
│   ├── orders/           # 订单管理组件
│   ├── reports/          # 报告生成组件
│   ├── test/             # 测试组件
│   └── ui/               # 基础 UI 组件
├── contexts/             # React Context
│   └── auth-context.tsx  # 认证上下文
└── lib/                  # 工具库
    ├── api.ts            # API 客户端
    ├── query-client.ts   # Query 客户端配置
    ├── utils.ts          # 工具函数
    └── websocket.ts      # WebSocket 客户端
```

## 🔧 安装和运行

### 环境要求

- Node.js 18+
- npm 或 yarn

### 安装依赖

```bash
# 使用 npm（推荐，支持 legacy-peer-deps）
npm install --legacy-peer-deps

# 或使用 yarn
yarn install
```

### 环境配置

1. 复制环境变量模板：

```bash
cp .env.example .env.local
```

1. 配置环境变量：

```env
# 后端 API 地址
BACKEND_URL=https://your-backend-url.com
NEXT_PUBLIC_API_URL=https://your-backend-url.com/api/v1

# 应用配置
NODE_ENV=production
PORT=3000
```

### 开发模式

```bash
npm run dev
```

访问 [http://localhost:3000](http://localhost:3000)

### 生产构建

```bash
npm run build
npm run start
```

## 🔨 可用脚本

| 脚本                      | 描述               |
| ------------------------- | ------------------ |
| `npm run dev`             | 启动开发服务器     |
| `npm run build`           | 构建生产版本       |
| `npm run start`           | 启动生产服务器     |
| `npm run lint`            | 运行 ESLint 检查   |
| `npm run health-check`    | 检查服务健康状态   |
| `npm run test:connection` | 测试前后端连接     |
| `npm run clean:install`   | 清理并重新安装依赖 |
| `npm run fix:deps`        | 修复依赖问题       |

## 🏗 系统架构

### 前后端分离架构

- **前端**：Next.js + React + TypeScript
- **后端**：Django + Django REST Framework
- **数据库**：PostgreSQL/SQLite
- **AI 服务**：集成多种 OCR 和 NLP 服务

### 数据流

1. **用户上传** → 前端文件处理 → 后端 API
2. **OCR 处理** → AI 服务识别 → 结构化数据
3. **报告生成** → 模板引擎 → Word/PDF 输出
4. **数据存储** → 数据库持久化 → 查询统计

### API 通信

- RESTful API 设计
- Token 认证机制
- 请求/响应拦截器
- 错误处理和重试机制

## 🎨 UI/UX 设计

### 设计系统

- **设计语言**：现代简洁的界面设计
- **颜色主题**：蓝色主色调，支持明暗主题
- **响应式设计**：适配桌面端和移动端
- **无障碍支持**：符合 WCAG 2.1 标准

### 组件库

- 基于 Tailwind CSS 的原子化设计
- 可复用的 UI 组件库
- 统一的设计规范和样式指南

### 用户体验

- 直观的导航结构
- 实时反馈和状态提示
- 拖拽上传和批量操作
- 键盘快捷键支持

## 🔐 认证与权限

### 认证机制

- Token 基础认证
- 自动 Token 刷新
- 安全的会话管理

### 权限控制

- 基于角色的访问控制（RBAC）
- 页面级权限保护
- API 接口权限验证

## 📊 性能优化

### 前端优化

- **代码分割**：按路由和组件分割
- **懒加载**：图片和组件懒加载
- **缓存策略**：TanStack Query 缓存
- **构建优化**：Tree Shaking 和压缩

### 网络优化

- **API 缓存**：智能缓存策略
- **请求合并**：批量请求优化
- **错误重试**：自动重试机制
- **超时处理**：合理的超时设置

## 🧪 测试策略

### 代码质量

- **ESLint**：代码规范检查
- **TypeScript**：类型安全保障
- **Prettier**：代码格式化

### 健康检查

- 前后端连接测试
- API 接口健康检查
- 系统状态监控

## 🚀 部署指南

### 开发环境部署

```bash
# 克隆项目
git clone <repository-url>
cd air_report_web_frontend

# 安装依赖
npm install --legacy-peer-deps

# 配置环境变量
cp .env.example .env.local

# 启动开发服务器
npm run dev
```

### 生产环境部署

#### 1. 传统部署

```bash
# 构建项目
npm run build

# 启动生产服务器
npm run start
```

#### 2. Docker 部署

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --legacy-peer-deps
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "run", "start"]
```

#### 3. Replit 部署

- 项目已配置 Replit 部署支持
- 使用 `.replit` 和 `replit.nix` 配置
- 支持一键部署和自动构建

### 环境变量配置

| 变量名                | 描述          | 示例值                           |
| --------------------- | ------------- | -------------------------------- |
| `BACKEND_URL`         | 后端 API 地址 | `https://api.example.com`        |
| `NEXT_PUBLIC_API_URL` | 公开 API 地址 | `https://api.example.com/api/v1` |
| `NODE_ENV`            | 运行环境      | `production`                     |
| `PORT`                | 服务端口      | `3000`                           |

## 🛠 开发指南

### 开发规范

- 使用 TypeScript 进行类型安全开发
- 遵循 ESLint 代码规范
- 组件采用函数式组件 + Hooks
- 使用 TanStack Query 管理服务端状态

### 代码结构

- **组件命名**：PascalCase
- **文件命名**：kebab-case
- **函数命名**：camelCase
- **常量命名**：UPPER_SNAKE_CASE

### Git 工作流

```bash
# 创建功能分支
git checkout -b feature/new-feature

# 提交代码
git add .
git commit -m "feat: add new feature"

# 推送分支
git push origin feature/new-feature

# 创建 Pull Request
```

### 调试技巧

- 使用浏览器开发者工具
- React DevTools 调试组件状态
- TanStack Query DevTools 调试数据获取
- 网络面板监控 API 请求

## 🔧 故障排除

### 常见问题

#### 1. 依赖安装失败

```bash
# 清理缓存重新安装
npm run clean:install

# 或使用修复脚本
npm run fix:deps
```

#### 2. 构建失败

```bash
# 清理构建缓存
rm -rf .next
npm run build
```

#### 3. API 连接问题

```bash
# 检查服务健康状态
npm run health-check

# 测试前后端连接
npm run test:connection
```

#### 4. 端口占用

```bash
# 查找占用端口的进程
lsof -i :3000

# 杀死进程
kill -9 <PID>
```

### 日志调试

- 查看浏览器控制台日志
- 检查网络请求状态
- 使用 React DevTools 调试组件

## 📚 相关文档

- [Next.js 官方文档](https://nextjs.org/docs)
- [React 官方文档](https://react.dev)
- [Tailwind CSS 文档](https://tailwindcss.com/docs)
- [TanStack Query 文档](https://tanstack.com/query/latest)

## 🤝 贡献指南

### 贡献流程

1. Fork 项目到个人仓库
2. 创建功能分支
3. 提交代码并编写测试
4. 创建 Pull Request
5. 代码审查和合并

### 代码贡献规范

- 遵循现有代码风格
- 添加必要的注释和文档
- 确保代码通过 ESLint 检查
- 提交信息使用约定式提交格式

### 问题反馈

- 使用 GitHub Issues 报告 Bug
- 提供详细的复现步骤
- 包含环境信息和错误日志

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 👥 团队

- **开发团队**：Air Report System Team
- **项目维护**：[GitHub Repository](https://github.com/air-report-system/air_report_web_fountend)

## 📞 联系我们

如有问题或建议，请通过以下方式联系：

- 📧 邮箱：<support@airreport.com>
- 🐛 问题反馈：[GitHub Issues](https://github.com/air-report-system/air_report_web_fountend/issues)
- 📖 文档：[项目文档](https://docs.airreport.com)

---

**感谢使用室内空气检测数据处理系统！** 🎉
