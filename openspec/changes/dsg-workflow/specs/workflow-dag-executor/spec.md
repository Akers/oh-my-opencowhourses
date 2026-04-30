## ADDED Requirements

### Requirement: Topological layer sorting
The system SHALL provide a `buildTopologicalLayers` function that uses Kahn's algorithm to sort DAG nodes into layers. Layer 0 contains nodes with no dependencies. Layer N contains nodes whose dependencies all appear in layers 0 through N-1.

#### Scenario: Independent nodes in single layer
- **WHEN** all nodes have no dependencies
- **THEN** all nodes SHALL be placed in a single layer (Layer 0)

#### Scenario: Sequential chain produces N layers
- **WHEN** 3 nodes form a chain (A → B → C)
- **THEN** 3 layers SHALL be produced with one node each in order

#### Scenario: Diamond DAG produces correct layers
- **WHEN** a diamond-shaped DAG exists (start → left, start → right, left → end, right → end)
- **THEN** 3 layers SHALL be produced: Layer 0 = [start], Layer 1 = [left, right], Layer 2 = [end]

#### Scenario: Circular dependency detected
- **WHEN** nodes form a cycle (A depends on B, B depends on A)
- **THEN** the function SHALL throw a WorkflowCycleError

#### Scenario: Missing dependency detected
- **WHEN** a node depends on a non-existent node ID
- **THEN** the function SHALL throw an error identifying the missing dependency

### Requirement: Reference resolution
The system SHALL provide a `resolveReferences` function that replaces `$nodeId.output` with the full output and `$nodeId.output.field` with the JSON-parsed field value. Unresolvable references SHALL be left unchanged.

#### Scenario: Full output reference
- **WHEN** text contains `$step1.output` and step1 output is "search results"
- **THEN** the reference SHALL be replaced with "search results"

#### Scenario: JSON field reference
- **WHEN** text contains `$step2.output.count` and step2 output is `{"count": 5}`
- **THEN** the reference SHALL be replaced with "5"

#### Scenario: Unresolvable reference preserved
- **WHEN** text contains `$nonexistent.output`
- **THEN** the reference SHALL remain as `$nonexistent.output` unchanged

### Requirement: Workflow execution with layer parallelism
The system SHALL execute workflows layer by layer, with all nodes in the same layer executing in parallel via Promise.allSettled.

#### Scenario: Parallel execution within layer
- **WHEN** Layer 1 contains nodes A and B (both depend on Layer 0 node)
- **THEN** A and B SHALL execute concurrently

#### Scenario: Failed node marked in outputs
- **WHEN** a node execution fails
- **THEN** its output SHALL have state "failed" with an error message

#### Scenario: Skipped node for unmet condition
- **WHEN** a node's `when:` condition evaluates to false
- **THEN** the node SHALL be skipped with state "skipped"

### Requirement: Trigger rule evaluation
The system SHALL evaluate `trigger_rule` to determine if a node can execute based on its dependency states. Default rule is `all_success`.

#### Scenario: all_success requires all deps completed
- **WHEN** trigger_rule is "all_success" and one dependency failed
- **THEN** the node SHALL be skipped

#### Scenario: one_success requires at least one success
- **WHEN** trigger_rule is "one_success" and one of two dependencies succeeded
- **THEN** the node SHALL execute

### Requirement: Agent node execution via Session API
Agent nodes SHALL create an OpenCode child session, send the resolved prompt to the specified agent, extract the result, and clean up the session.

#### Scenario: Agent node executes and returns output
- **WHEN** an AgentNode with agent "explorer" and prompt "find files" is executed
- **THEN** a child session SHALL be created for "explorer", the prompt sent, result extracted, session aborted, and output returned with state "completed"

### Requirement: Bash node execution on host
Bash nodes SHALL execute shell commands on the host machine via child_process with a 120-second timeout.

#### Scenario: Successful bash execution
- **WHEN** a BashNode with `bash: "echo hello"` is executed
- **THEN** the output SHALL be "hello" with state "completed"

#### Scenario: Failed bash command
- **WHEN** a bash command exits with non-zero code
- **THEN** the node SHALL fail with an error message containing the command output

### Requirement: Loop node iteration
Loop nodes SHALL iterate up to max_iterations, executing the prompt via session each time, and stop when the output contains the `until` signal string.

#### Scenario: Loop completes on signal
- **WHEN** a LoopNode with until "DONE" and max_iterations 5 receives output containing "DONE" on iteration 2
- **THEN** the node SHALL complete with state "completed" after 2 iterations

#### Scenario: Loop exceeds max iterations
- **WHEN** a LoopNode reaches max_iterations without the until signal
- **THEN** the node SHALL fail with an error indicating max_iterations exceeded

### Requirement: Approval node with question function
Approval nodes SHALL call the provided question function to prompt the user. If no question function is available, auto-approve.

#### Scenario: User approves
- **WHEN** the question function returns "yes"
- **THEN** the node SHALL complete with output "Approved"

#### Scenario: No question function auto-approves
- **WHEN** no questionFn is provided in executor options
- **THEN** the node SHALL auto-approve with a note

### Requirement: Cancel node stops workflow
Cancel nodes SHALL throw a WorkflowCancelledError that causes all remaining nodes to be marked as cancelled.

#### Scenario: Cancel node halts execution
- **WHEN** a CancelNode is reached during execution
- **THEN** a WorkflowCancelledError SHALL be thrown, and all unexecuted nodes SHALL be marked as "cancelled"

### Requirement: Retry mechanism
Nodes with retry configuration SHALL be re-executed up to max_attempts times with delay_ms between attempts.

#### Scenario: Retry succeeds on second attempt
- **WHEN** a node with retry max_attempts 3 fails on first attempt but succeeds on second
- **THEN** the node SHALL complete successfully

#### Scenario: All retries exhausted
- **WHEN** a node with retry max_attempts 2 fails both times
- **THEN** the node SHALL fail with the last error
