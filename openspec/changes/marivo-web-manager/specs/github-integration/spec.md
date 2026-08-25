## Purpose

集成 GitHub/GitLab API 和 ZIP 上传功能，实现 Marivo 项目的拉取、提交和导入管理。

## ADDED Requirements

### Requirement: 用户能够拉取 GitHub/GitLab 上的 Marivo 项目
系统 SHALL 允许用户通过仓库 URL 拉取现有的 Marivo 项目。

#### Scenario: 通过 GitHub URL 拉取项目
- **WHEN** 用户输入 GitHub 仓库 URL（如 https://github.com/higkoo/marivo-demo）
- **THEN** 系统验证项目是否为有效的 Marivo 项目（检查 marivo.toml 是否存在）
- **AND** 克隆项目到本地并使用目录，展示项目信息

#### Scenario: 通过 GitLab URL 拉取项目
- **WHEN** 用户输入 GitLab 仓库 URL
- **THEN** 系统通过 GitLab API 克隆项目
- **AND** 验证 Marivo 项目结构并展示项目信息

#### Scenario: 拉取示例项目
- **WHEN** 用户选择预定义的示例项目（如 Marivo-GCN、marivo-yellow-taxi-demo）
- **THEN** 系统自动从对应源克隆项目并提供分析环境

#### Scenario: 验证 Marivo 项目有效性
- **WHEN** 系统拉取项目时
- **THEN** 系统检查项目是否包含 marivo.toml 文件和 models/ 目录
- **AND** 如果无效，显示错误提示并说明原因

### Requirement: 用户能够通过 ZIP 上传 Marivo 项目
系统 SHALL 允许用户通过上传 ZIP 压缩包导入本地 Marivo 项目。

#### Scenario: 上传 ZIP 包
- **WHEN** 用户选择本地 ZIP 文件并上传
- **THEN** 系统解压 ZIP 包并检查项目结构
- **AND** 验证是否包含 marivo.toml 和 models/ 目录
- **AND** 如果有效，加载项目并展示项目信息

#### Scenario: ZIP 格式校验
- **WHEN** 用户上传的 ZIP 包不是有效的 Marivo 项目
- **THEN** 系统显示明确的错误提示，说明缺少的文件或目录
- **AND** 提供示例项目链接供参考

#### Scenario: 大文件处理
- **WHEN** 用户上传的 ZIP 包超过大小限制（如 100MB）
- **THEN** 系统拒绝上传并提示用户使用仓库地址方式提交

### Requirement: 用户能够提交自己的 Marivo 项目
系统 SHALL 允许用户将本地或 GitHub/GitLab 上的 Marivo 项目提交到平台。

#### Scenario: 提交 GitHub 仓库
- **WHEN** 用户提供 GitHub 仓库 URL 并授权访问
- **THEN** 系统克隆仓库并验证是否为有效的 Marivo 项目
- **AND** 保存到用户的项目列表中

#### Scenario: 提交 GitLab 仓库
- **WHEN** 用户提供 GitLab 仓库 URL 并授权访问
- **THEN** 系统通过 GitLab API 克隆仓库并验证
- **AND** 保存到用户的项目列表中

#### Scenario: 权限验证
- **WHEN** 用户尝试拉取或提交项目
- **THEN** 系统验证用户的平台权限（GitHub/GitLab）
- **AND** 对于私有仓库，要求用户授权并处理认证

### Requirement: 系统能够管理项目同步
系统 SHALL 保持平台上的项目与远程仓库的同步。

#### Scenario: 自动同步
- **WHEN** 项目在远程仓库上有新提交
- **THEN** 系统检测到变更并提示用户同步
- **AND** 用户可以选择一键同步最新代码

#### Scenario: 手动同步
- **WHEN** 用户点击"同步"按钮
- **THEN** 系统拉取远程仓库上的最新变更并更新本地项目
