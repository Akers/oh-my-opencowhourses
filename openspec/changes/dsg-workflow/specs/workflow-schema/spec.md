## ADDED Requirements

### Requirement: Define 8 node type schemas
The system SHALL define Zod schemas for 8 DAG node types: AgentNode, AutoAgentNode, PromptNode, BashNode, ScriptNode, LoopNode, ApprovalNode, and CancelNode. Each node type SHALL extend a common DagNodeBase with fields: id (string, required), depends_on (string[], optional), when (string, optional), trigger_rule (enum: all_success | one_success | all_done, optional), retry (object with max_attempts 1-5 and delay_ms 1000-60000, optional).

#### Scenario: Valid AgentNode schema
- **WHEN** a node object with `id`, `agent`, and `prompt` fields is parsed
- **THEN** the schema SHALL validate successfully and infer the correct AgentNode type

#### Scenario: Node with all optional base fields
- **WHEN** a node includes `depends_on`, `when`, `trigger_rule`, and `retry`
- **THEN** all optional fields SHALL be parsed and typed correctly

#### Scenario: Invalid trigger_rule rejected
- **WHEN** a node has trigger_rule set to an invalid value like "any"
- **THEN** the schema SHALL reject the input with a validation error

### Requirement: Define WorkflowDefinition schema
The system SHALL define a WorkflowDefinition schema with required `name` (string, min 1), `description` (string, min 1), and `nodes` (array of DagNode, min 1) fields.

#### Scenario: Valid workflow definition
- **WHEN** an object with name, description, and at least one node is parsed
- **THEN** the schema SHALL validate successfully

#### Scenario: Empty nodes array rejected
- **WHEN** a workflow definition has an empty nodes array
- **THEN** the schema SHALL reject the input

### Requirement: Node kind discriminator
The system SHALL provide a `getNodeKind` function that returns the node type as a union type: 'agent' | 'auto_agent' | 'prompt' | 'bash' | 'script' | 'loop' | 'approval' | 'cancel'.

#### Scenario: Identify AgentNode
- **WHEN** getNodeKind is called with an object containing `agent` field
- **THEN** it SHALL return 'agent'

#### Scenario: Identify PromptNode
- **WHEN** getNodeKind is called with an object containing only `prompt` field (no agent, auto_agent, bash, script, loop, approval, cancel)
- **THEN** it SHALL return 'prompt'
