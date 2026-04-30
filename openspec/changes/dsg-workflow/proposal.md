## Why

当前 oh-my-opencode-slim 插件仅支持单次 Agent 委托（Orchestrator → 单个 Specialist），缺乏多步骤、多 Agent 编排能力。用户需要反复手动触发多个 Agent 完成复杂任务（如代码审查 + 修复 + 测试），效率低且容易遗漏步骤。集成一个轻量化 DAG 工作流引擎，可让用户通过 YAML 定义可复用的多步骤工作流，一次性自动化完成复杂任务链。

## What Changes

- 新增 `src/workflows/` 独立模块，包含 YAML 加载器、DAG 拓扑排序执行引擎、条件评估器、Zod schema 定义（~660 行核心代码）
- 新增 8 种工作流节点类型：Agent（调用指定 Agent）、AutoAgent（委托 Orchestrator 编排）、Prompt（内联 prompt）、Bash（宿主机 shell）、Script（Bun/uv 脚本）、Loop（循环直到完成信号）、Approval（人工审批门）、Cancel（取消工作流）
- 新增 `$nodeId.output` 节点间数据引用机制和 `when:` 条件表达式评估
- 新增 `/workflow` 命令，支持 `/workflow list` 列出可用工作流、`/workflow <name>` 执行指定工作流
- 在 `oh-my-opencode-slim.jsonc` 配置中新增 `workflows` 配置项（enabled / auto_route / default_workflow）
- 工作流 YAML 文件存放于 `.opencode/workflows/` 项目目录，启动时自动扫描加载
- Agent 节点通过 OpenCode Session API 调用，Bash/Script 节点通过 child_process 在宿主机执行
- 新增 `yaml` npm 依赖用于 YAML 解析

## Capabilities

### New Capabilities

- `workflow-schema`: 工作流定义的 Zod schema 和 TypeScript 类型系统，覆盖 8 种节点类型（Agent、AutoAgent、Prompt、Bash、Script、Loop、Approval、Cancel）及其通用字段（depends_on、when、trigger_rule、retry）
- `workflow-loader`: 从 `.opencode/workflows/` 目录扫描并加载 YAML 工作流文件，解析和校验（Zod）工作流定义
- `workflow-dag-executor`: 轻量 DAG 执行引擎，使用 Kahn 算法拓扑分层，层内并行执行（Promise.allSettled），支持 $nodeId.output 引用替换、when: 条件评估、trigger_rule 触发规则、retry 重试机制、循环依赖检测
- `workflow-condition-evaluator`: when: 条件表达式评估器，支持字符串等值/不等值、点号字段访问、数值比较、&& 和 || 复合表达式，fail-closed 错误处理
- `workflow-command`: `/workflow` 命令注册和处理，支持 list 和 run 子命令，通过 command.execute.before hook 拦截并执行
- `workflow-config`: 在 PluginConfigSchema 中新增 workflows 配置字段，支持 enabled、auto_route、default_workflow 选项

### Modified Capabilities

（无现有 spec 需要修改）

## Impact

- **新增文件**：`src/workflows/` 目录下 5 个 TypeScript 文件（schemas.ts、loader.ts、dag-executor.ts、condition-evaluator.ts、index.ts）+ 3 个测试文件
- **修改文件**：
  - `src/config/schema.ts`：PluginConfigSchema 新增 workflows 字段（+10行）
  - `src/config/loader.ts`：配置合并逻辑新增 workflows deepMerge（+1行）
  - `src/index.ts`：导入工作流模块、初始化引擎、注册 /workflow 命令、command hook 处理（+80行）
  - `package.json`：新增 `yaml` 依赖
- **新增依赖**：`yaml`（YAML 解析库）
- **无破坏性变更**：工作流功能默认启用但仅在 `.opencode/workflows/` 目录存在时激活，不影响现有功能
