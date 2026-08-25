## Purpose

提供数据分析的可视化界面，让用户能够直接运行 Marivo 分析任务并查看结果。

## ADDED Requirements

### Requirement: 用户能够运行 Marivo 分析
系统 SHALL 提供界面让用户执行 Marivo 分析命令并查看结果。

#### Scenario: 运行预设分析
- **WHEN** 用户选择项目并点击"运行分析"
- **THEN** 系统在隔离环境中执行 `make setup` 和 `make verify` 命令
- **AND** 实时显示命令输出和进度

#### Scenario: 自定义分析问题
- **WHEN** 用户在分析界面输入业务问题
- **THEN** 系统集成 AI 助手（如 Claude Code）理解问题
- **AND** 调用 Marivo 分析能力执行分析并返回结果

#### Scenario: 查看分析历史
- **WHEN** 用户查看某个项目的分析历史
- **THEN** 系统展示之前的分析会话、问题和结果摘要

### Requirement: 系统能够展示分析结果
系统 SHALL 以可视化的方式展示 Marivo 分析的结果和证据。

#### Scenario: 展示结构化结果
- **WHEN** 分析完成后
- **THEN** 系统解析并展示分析结果，包括指标值、对比数据、证据链条
- **AND** 高亮显示关键发现和限制说明

#### Scenario: 导出分析结果
- **WHEN** 用户点击"导出"按钮
- **THEN** 系统生成 Markdown 或 PDF 格式的分析报告
- **AND** 包含完整的分析过程、结果和证据引用

#### Scenario: 可视化数据
- **WHEN** 分析包含数值型数据
- **THEN** 系统自动生成图表（折线图、柱状图、表格等）
- **AND** 支持交互式缩放和筛选

### Requirement: 用户能够管理分析会话
系统 SHALL 保存和恢复用户的分析会话状态。

#### Scenario: 保存会话
- **WHEN** 用户正在进行分析时
- **THEN** 系统自动保存当前会话状态（问题、中间结果、证据）
- **AND** 允许用户手动保存为书签

#### Scenario: 恢复会话
- **WHEN** 用户重新打开之前的分析会话
- **THEN** 系统恢复完整的分析上下文和结果
- **AND** 用户可以直接继续分析
