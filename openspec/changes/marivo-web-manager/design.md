## Context

当前 Marivo 项目主要通过命令行和 AI 编码助手使用，缺乏 Web 界面。需要构建一个 Web 系统来降低使用门槛，让用户能够方便地发现、管理和运行 Marivo 项目。

系统需要：
- 集成 GitHub API 实现项目的拉取和推送
- 提供项目浏览和管理功能
- 支持 Marivo 分析任务的执行和结果展示
- 确保安全性和性能

## Goals / Non-Goals

**Goals:**
- 构建完整的 Web 应用，支持项目浏览、搜索、创建和管理
- 集成 GitHub OAuth 实现用户认证和项目访问
- 提供安全的容器化环境运行 Marivo 分析任务
- 展示分析结果的可视化界面
- 支持项目同步和版本管理

**Non-Goals:**
- 不构建 Marivo 核心框架（这是 Python 库）
- 不替代现有的 AI 编码助手工作流
- 不提供 Marivo 的完整文档站点功能
- 不在第一版中支持多租户隔离

## Decisions

### 决策 1: 技术栈选择

**选择:** 前端使用 React + TypeScript + Tailwind CSS，后端使用 Node.js + Express，数据库使用 PostgreSQL。

**理由:**
- React 生态成熟，组件复用性好
- TypeScript 提供类型安全，减少运行时错误
- Tailwind CSS 加速 UI 开发
- Node.js 与前端技术栈一致，降低维护成本
- PostgreSQL 适合存储结构化数据和关系

**替代方案:**
- Next.js: 更好的 SEO 和 SSR，但增加了复杂度
- Python FastAPI: 与 Marivo 技术栈一致，但前后端技术栈分离
- SQLite: 简单但扩展性差

### 决策 2: GitHub 集成方式

**选择:** 使用 GitHub OAuth 2.0 进行用户认证，GitHub REST API v3 进行项目操作。

**理由:**
- OAuth 是标准的认证方式，用户体验好
- REST API 稳定且文档完善
- 支持个人访问令牌和 OAuth token 两种模式

**替代方案:**
- GitHub App: 功能更强大但配置复杂
- SSH key: 安全性高但不适合 Web 场景

### 决策 3: 分析任务执行方式

**选择:** 使用 Docker 容器隔离执行 Marivo 分析任务，通过 WebSocket 实时推送进度。

**理由:**
- Docker 提供安全的隔离环境
- 避免宿主机的依赖冲突
- WebSocket 提供实时反馈
- 支持并发执行多个任务

**替代方案:**
- 直接在宿主机执行: 性能更好但有安全风险
- 异步队列: 需要额外的基础设施

### 决策 4: 项目存储方式

**选择:** 项目在 GitHub 上托管，平台只存储元数据和缓存。

**理由:**
- 复用 GitHub 的版本控制和协作能力
- 避免重复建设
- 用户可以方便地在 GitHub 上管理代码

**替代方案:**
- 自建 Git 服务器: 需要额外的维护和基础设施
- 文件系统存储: 不支持版本控制和协作

## Risks / Trade-offs

1. **GitHub API 速率限制** → 实现缓存和分页策略，使用 GitHub App 提高限额
2. **容器执行安全** → 使用 read-only 文件系统、限制资源、网络隔离
3. **大项目克隆性能** → 支持 shallow clone、增量更新、后台任务
4. **用户认证安全** → 使用 HTTPS、token 加密存储、定期轮换

## Migration Plan

1. **Phase 1**: 搭建基础框架，实现项目浏览和 GitHub 登录
2. **Phase 2**: 实现项目创建、克隆和分析执行
3. **Phase 3**: 添加可视化界面和高级功能

**回滚策略:** 每个 phase 独立部署，有问题可以快速回退到上一个稳定版本。

## Open Questions

1. 是否需要支持私有仓库？如何授权？
2. 分析任务的超时时间和资源限制如何设定？
3. 是否需要支持多语言界面？
4. 项目的公开/私有设置由谁控制？
