## 1. Setup & Dependencies

- [x] 1.1 Install `yaml` npm dependency
- [x] 1.2 Create `src/workflows/` directory with empty index.ts export barrel

## 2. Schema & Types (workflow-schema)

- [x] 2.1 Create `src/workflows/schemas.ts` with Zod schemas for DagNodeBase (id, depends_on, when, trigger_rule, retry)
- [x] 2.2 Add 8 node type schemas: AgentNode, AutoAgentNode, PromptNode, BashNode, ScriptNode, LoopNode, ApprovalNode, CancelNode
- [x] 2.3 Add WorkflowDefinition schema (name, description, nodes array)
- [x] 2.4 Add getNodeKind() discriminator function and TypeScript type exports
- [x] 2.5 Write tests in `src/workflows/schemas.test.ts`: valid/invalid node parsing, trigger_rule enum, WorkflowDefinition validation

## 3. Condition Evaluator (workflow-condition-evaluator)

- [x] 3.1 Create `src/workflows/condition-evaluator.ts` with evaluateCondition() function
- [x] 3.2 Implement $nodeId.output == 'VALUE' and != 'VALUE' string equality/inequality
- [x] 3.3 Implement $nodeId.output.field dot notation JSON field access
- [x] 3.4 Implement >, >=, <, <= numeric comparison operators
- [x] 3.5 Implement && and || compound expression parsing and evaluation
- [x] 3.6 Implement fail-closed: return false on parse failure, undefined when condition is undefined
- [x] 3.7 Write tests in `src/workflows/condition-evaluator.test.ts`: string ops, dot notation, numeric comparison, compound expressions, edge cases

## 4. Workflow Loader (workflow-loader)

- [x] 4.1 Create `src/workflows/loader.ts` with parseWorkflowYaml() function (YAML string → WorkflowDefinition | null)
- [x] 4.2 Implement loadWorkflowsFromDirectory() scanning .yaml/.yml files, non-existent dir returns empty
- [x] 4.3 Handle mixed valid/invalid files (skip invalid with warning)
- [x] 4.4 Write tests in `src/workflows/loader.test.ts`: valid YAML, invalid YAML, schema validation failure, directory scanning, non-YAML file filtering

## 5. DAG Executor (workflow-dag-executor)

- [x] 5.1 Create `src/workflows/dag-executor.ts` with WorkflowExecutor class and WorkflowCycleError
- [x] 5.2 Implement buildTopologicalLayers() using Kahn's algorithm with cycle and missing dependency detection
- [x] 5.3 Implement resolveReferences() for $nodeId.output and $nodeId.output.field replacement
- [x] 5.4 Implement execute() method: layer-by-layer execution with Promise.allSettled
- [x] 5.5 Implement trigger_rule evaluation (all_success, one_success, all_done)
- [x] 5.6 Implement Agent node execution via Session API (create → prompt → extract → abort)
- [x] 5.7 Implement AutoAgent node execution (delegate to Orchestrator via Session API)
- [x] 5.8 Implement Prompt node execution (create session, send prompt, extract result)
- [x] 5.9 Implement Bash node execution via child_process with 120s timeout
- [x] 5.10 Implement Loop node: iterate prompt via session, check until signal, respect max_iterations
- [x] 5.11 Implement Approval node: call questionFn or auto-approve, capture response
- [x] 5.12 Implement Cancel node: throw WorkflowCancelledError
- [x] 5.13 Implement retry mechanism: re-execute up to max_attempts with delay_ms
- [x] 5.14 Write tests in `src/workflows/dag-executor.test.ts`: topological sorting, cycle detection, reference resolution, layer parallelism, trigger rules, node execution mocks, retry, cancel

## 6. Configuration Integration (workflow-config)

- [x] 6.1 Add WorkflowsConfigSchema to `src/config/schema.ts` (enabled, auto_route, default_workflow)
- [x] 6.2 Add workflows field to PluginConfigSchema
- [x] 6.3 Add workflows to deepMerge in `src/config/loader.ts`
- [x] 6.4 Write/update config tests to verify workflows config parsing and merge

## 7. Command Integration (workflow-command)

- [x] 7.1 Register `/workflow` command in config() hook (src/index.ts) when workflows enabled
- [x] 7.2 Implement command.execute.before handler: /workflow list and /workflow \<name\>
- [x] 7.3 Initialize WorkflowExecutor with Session API context and loaded workflows
- [x] 7.4 Write tests for command registration and handler logic

## 8. Module Export & Integration

- [x] 8.1 Export all public types and functions from `src/workflows/index.ts`
- [x] 8.2 Wire workflow initialization into plugin bootstrap (src/index.ts)
- [x] 8.3 Run full test suite (`bun test`) and verify all tests pass
- [x] 8.4 Run linter (`bun run check:ci`) and fix any issues
- [x] 8.5 Run typecheck (`bun run typecheck`) and fix any issues
