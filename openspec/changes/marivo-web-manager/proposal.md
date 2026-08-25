## Why

Marivo 是一个强大的 AI 数据分析框架，但目前用户需要手动克隆仓库、配置环境和运行命令才能使用。缺乏一个友好的 Web 界面来发现、管理和使用 Marivo 项目，导致新手入门门槛高，用户难以快速体验和分析数据。

参考 OpenDeepWiki 的设计理念——用户只需输入仓库地址或上传 ZIP 包，即可加载项目并立即通过对话式交互进行分析和提问。本系统旨在为 Marivo 项目提供类似的一站式 Web 体验。

## What Changes

- 创建一个 Web 系统，让用户能够浏览和管理 Marivo 项目
- 支持从 GitHub/GitLab 导入现有 Marivo 项目（如示例项目）
- 支持通过 ZIP 压缩包上传本地 Marivo 项目
- 加载项目后支持交互式提问（Q&A），用户可对项目进行多轮对话分析
- 集成 Marivo 分析能力，允许用户直接运行数据分析任务并查看结果
- 整体交互形式参考 OpenDeepWiki 的设计风格

## Capabilities

### New Capabilities
- `project-manager`: 管理 Marivo 项目的创建、导入、浏览和操作
- `project-integration`: 与 GitHub/GitLab 集成，支持 ZIP 上传，实现项目的拉取和提交
- `interactive-chat`: 加载项目后提供交互式 Q&A 对话界面，支持多轮分析提问
- `analysis-dashboard`: 提供数据分析的可视化界面和结果展示

### Modified Capabilities


## Impact

- 新增 Web 前端（React + TypeScript），参考 OpenDeepWiki 交互设计
- 新增后端 API（Node.js + Express 或 Python + FastAPI）
- 集成 GitHub/GitLab API 实现项目拉取和推送
- 新增 ZIP 包解析和 Marivo 项目验证模块
- 新增 WebSocket/SSE 实时对话接口，支持流式响应
- 需要数据库存储项目元数据、对话历史和分析记录
- 支持 Docker 容器化部署
