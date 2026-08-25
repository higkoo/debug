## Purpose

集成 GitHub API，实现 Marivo 项目的拉取、推送和管理功能。

## ADDED Requirements

### Requirement: 用户能够拉取 GitHub 上的 Marivo 项目
系统 SHALL 允许用户通过 GitHub URL 或用户名/仓库名拉取现有的 Marivo 项目。

#### Scenario: 通过 URL 拉取项目
- **WHEN** 用户输入 GitHub 仓库 URL（如 https://github.com/higkoo/marivo-demo）
- **THEN** 系统验证项目是否为有效的 Marivo 项目（检查 marivo.toml 是否存在）
- **AND** 克隆项目到本地并使用目录，展示项目信息

#### Scenario: 拉取示例项目
- **WHEN** 用户选择预定义的示例项目（如 Marivo-GCN、marivo-yellow-taxi-demo）
- **THEN** 系统自动克隆项目并提供分析环境

#### Scenario: 验证 Marivo 项目有效性
- **WHEN** 系统拉取项目时
- **THEN** 系统检查项目是否包含 marivo.toml 文件和 models/ 目录
- **AND** 如果无效，显示错误提示并说明原因

### Requirement: 用户能够提交自己的 Marivo 项目
系统 SHALL 允许用户将本地或 GitHub 上的 Marivo 项目提交到平台。

#### Scenario: 提交 GitHub 仓库
- **WHEN** 用户提供 GitHub 仓库 URL 并授权访问
- **THEN** 系统克隆仓库并验证是否为有效的 Marivo 项目
- **AND** 保存到用户的项目列表中

#### Scenario: 提交本地项目
- **WHEN** 用户上传包含 marivo.toml 的本地项目文件夹
- **THEN** 系统解析项目结构并上传到 GitHub 仓库
- **AND** 创建或更新平台上的项目记录

#### Scenario: 权限验证
- **WHEN** 用户尝试拉取或提交项目
- **THEN** 系统验证用户的 GitHub 权限
- **AND** 对于私有仓库，要求用户授权并处理认证

### Requirement: 系统能够管理项目同步
系统 SHALL 保持平台上的项目与 GitHub 仓库的同步。

#### Scenario: 自动同步
- **WHEN** 项目在 GitHub 上有新提交
- **THEN** 系统检测到变更并提示用户同步
- **AND** 用户可以选择一键同步最新代码

#### Scenario: 手动同步
- **WHEN** 用户点击"同步"按钮
- **THEN** 系统拉取 GitHub 上的最新变更并更新本地项目
