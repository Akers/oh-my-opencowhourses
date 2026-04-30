## ADDED Requirements

### Requirement: Register /workflow command
The system SHALL register a `/workflow` slash command with OpenCode via the config() hook, with template and description fields.

#### Scenario: Command registered in config
- **WHEN** workflows are enabled and the config() hook runs
- **THEN** a "workflow" command SHALL be registered in opencodeConfig.command with template and description

#### Scenario: Command not registered when disabled
- **WHEN** workflows are disabled or no workflows exist
- **THEN** the "workflow" command SHALL NOT be registered

### Requirement: Handle /workflow list
The `/workflow list` command SHALL display all available workflow names and their descriptions, formatted as a markdown list.

#### Scenario: List shows all workflows
- **WHEN** user runs /workflow list
- **THEN** output SHALL contain each workflow name and its description's first line

#### Scenario: List with no arguments
- **WHEN** user runs /workflow with no arguments
- **THEN** output SHALL behave the same as /workflow list

### Requirement: Handle /workflow run
The `/workflow <name>` command SHALL find the named workflow and execute it via WorkflowExecutor. If the workflow is not found, an error message SHALL be displayed.

#### Scenario: Execute existing workflow
- **WHEN** user runs /workflow code-review-workflow
- **THEN** the WorkflowExecutor SHALL be instantiated and execute() called with the matching workflow

#### Scenario: Workflow not found
- **WHEN** user runs /workflow nonexistent
- **THEN** output SHALL display an error listing available workflow names

#### Scenario: Command with run prefix
- **WHEN** user runs /workflow run code-review-workflow
- **THEN** the behavior SHALL be the same as /workflow code-review-workflow
