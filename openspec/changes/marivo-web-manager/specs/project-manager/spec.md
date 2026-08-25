## Purpose

提供 Marivo 项目的管理功能，包括项目的浏览、搜索、详情查看和基本操作。

## ADDED Requirements

### Requirement: 用户能够浏览 Marivo 项目列表
系统 SHALL 展示所有可用的 Marivo 项目，包括示例项目和用户提交的项目。

#### Scenario: 浏览项目列表
- **WHEN** 用户访问主页或项目列表页面
- **THEN** 系统展示项目卡片列表，包含项目名称、描述、作者、标签和创建时间

#### Scenario: 搜索项目
- **WHEN** 用户在搜索框中输入关键词
- **THEN** 系统实时过滤项目列表，只显示匹配的项目
- **AND** 支持按名称、描述、标签搜索

#### Scenario: 筛选项目
- **WHEN** 用户选择筛选条件（如分类、热度）
- **THEN** 系统按条件过滤项目列表

### Requirement: 用户能够查看项目详情
系统 SHALL 提供项目的详细信息页面，展示项目结构和关键信息。

#### Scenario: 查看项目基本信息
- **WHEN** 用户点击某个项目
- **THEN** 系统显示项目详情，包括名称、描述、作者、README、标签和统计信息

#### Scenario: 查看项目文件结构
- **WHEN** 用户在项目详情页点击"查看代码"
- **THEN** 系统展示项目的文件树结构，突出显示 marivo.toml 和 models/ 目录

### Requirement: 用户能够创建新项目
系统 SHALL 允许用户基于模板或从空白创建新的 Marivo 项目。

#### Scenario: 从空白创建项目
- **WHEN** 用户点击"创建项目"并填写项目信息
- **THEN** 系统创建一个新的 GitHub 仓库，包含基础的 Marivo 项目结构
- **AND** 自动初始化 marivo.toml 配置文件

#### Scenario: 从模板创建项目
- **WHEN** 用户选择预设模板（如基础模板、交通数据分析模板）
- **THEN** 系统基于模板创建项目，预填配置和示例模型定义
