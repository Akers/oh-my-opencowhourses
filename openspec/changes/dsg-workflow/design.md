## Context

oh-my-opencode-slim 是一个 OpenCode 插件，当前仅支持单次 Agent 委托（Orchestrator → 单个 Specialist）。用户需要反复手动触发多个 Agent 完成复杂任务。Archo 项目有一个成熟的 DAG 工作流引擎（~2800 行 dag-executor.ts），但对我们来说过于重量级。本设计将 Archo 核心概念轻量化移植到 oh-my-opencode-slim 插件体系中。

**当前架构约束：**
- 插件通过 `Plugin` 函数导出，hook 入 OpenCode 生命周期
- Agent 调用通过 Session API（create → prompt → extract → abort）
- 命令通过 `config()` hook 注册 + `command.execute.before` hook 拦截
- 配置使用 Zod schema 验证 + 分层合并（user + project + preset）
- 测试框架：Bun test，Linter：Biome，行宽 80 字符

## Goals / Non-Goals

**Goals:**
- 提供轻量 YAML 定义的多步骤工作流能力（~660 行核心代码）
- 支持 8 种节点类型、条件分支、循环、审批、重试
- 通过 `/workflow` 命令触发，无需 UI
- 与现有插件体系无缝集成（config、hooks、session API）
- 完整测试覆盖（TDD）

**Non-Goals:**
- 不做可视化工作流编辑器或 UI
- 不做工作流持久化存储（无 DB/文件状态）
- 不做工作流 API server 或远程触发
- 不做嵌套工作流（工作流调用工作流）
- 不做 Archo 的 Provider 抽象（仅使用 OpenCode Session API）
- 不做 Script 节点的 uv runtime（仅支持 bun）
- 不做 effort/thinking/sandbox/betas 等 Archo 特有字段

## Decisions

### D1: 独立 `src/workflows/` 模块 vs 内嵌现有模块

**选择：独立 `src/workflows/` 模块（5 个文件）**

理由：
- 工作流引擎是自包含的 DAG 执行器，与现有 Agent/Config/Hook 系统松耦合
- 仅在 `src/index.ts` 入口处集成（初始化 + 命令注册），改动最小
- 便于独立测试和未来移除

替代方案：将 schema 放 config/、executor 放 tools/ — 拒绝，因为跨目录耦合增加维护成本。

### D2: YAML 工作流目录 vs 内联配置

**选择：`.opencode/workflows/` 独立 YAML 文件**

理由：
- YAML 可读性优于 JSON，Archo 已验证此格式
- 独立文件便于版本控制和共享（`.opencode/` 已在 .gitignore 白名单中）
- 启动时扫描加载，无需运行时文件监视

替代方案：在 jsonc 配置中内联定义 — 拒绝，因为 jsonc 不支持多行字符串，且工作流定义会膨胀配置文件。

### D3: Session API 调用 vs Task tool 委托

**选择：Session API 直接调用**

理由：
- Council 系统已验证此模式（council-manager.ts 的 runAgentSession）
- 可精确控制 agent、model、timeout、tools 权限
- 可提取结构化输出

替代方案：通过 task tool 委托 — 拒绝，因为 task tool 是 Orchestrator 级别的抽象，工作流引擎需要更细粒度的控制。

### D4: yaml npm 包选择

**选择：`yaml` 包（非 js-yaml）**

理由：
- `yaml` 包是 YAML 1.2 标准实现，活跃维护
- 支持 CST 解析和良好的错误报告
- 体积小（~70KB minified）

### D5: 条件评估器实现方式

**选择：正则解析 + 手动评估（无 AST/表达式引擎）**

理由：
- when: 表达式语法固定且简单（等值、不等值、数值比较、&&、||）
- 无需引入表达式引擎依赖
- fail-closed 语义：解析失败返回 false，安全跳过

### D6: 循环检测算法

**选择：Kahn 拓扑排序内置循环检测**

理由：
- Kahn 算法在排序完成后若存在未处理的节点，即表明有环
- 零额外开销，不需要额外的 DFS 检测

### D7: 错误处理策略

**选择：fail-closed，单节点失败不中断同层其他节点**

理由：
- Promise.allSettled 确保同层节点全部完成
- 后续层通过 trigger_rule 判断是否继续
- Cancel 节点通过 WorkflowCancelledError 中断整个工作流

## Risks / Trade-offs

**[R1] Agent 节点执行延迟** → 工作流中 Agent 节点需要创建/销毁 Session，开销较大。缓解：复用 AutoAgent 模式让 Orchestrator 在单 Session 中完成多步骤任务。

**[R2] Bash 节点安全风险** → 用户定义的 Bash 命令在宿主机直接执行。缓解：明确文档说明安全注意事项，仅扫描 `.opencode/workflows/` 目录（项目受控）。

**[R3] 条件表达式健壮性** → 正则解析对复杂表达式可能不够健壮。缓解：fail-closed 语义 + 充分测试覆盖。未来可考虑引入表达式引擎。

**[R4] 工作流 YAML 加载性能** → 启动时扫描并解析所有 YAML 文件。缓解：YAML 解析速度快（毫秒级），且仅在 `.opencode/workflows/` 存在时激活。

**[R5] 与 OpenCode SDK 版本耦合** → Session API 和 Command hook 依赖特定 SDK 版本。缓解：仅使用已验证的 API 模式（Council 系统已使用相同 API）。

## Migration Plan

本变更为纯新增功能，无迁移需求：

1. 安装 `yaml` 依赖
2. 新增 `src/workflows/` 模块
3. 修改 3 个现有文件（schema.ts、loader.ts、index.ts）
4. 用户在项目 `.opencode/workflows/` 目录添加 YAML 文件即可使用

**回滚策略**：删除 `src/workflows/` 目录，还原 3 个文件的改动，移除 `yaml` 依赖。

## Open Questions

（无 — 所有关键决策已在头脑风暴阶段与用户确认）
