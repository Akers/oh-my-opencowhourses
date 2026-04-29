## ADDED Requirements

### Requirement: Parse YAML to WorkflowDefinition
The system SHALL provide a `parseWorkflowYaml` function that accepts a YAML string and returns a validated `WorkflowDefinition` or `null` if parsing or schema validation fails.

#### Scenario: Valid YAML workflow
- **WHEN** a valid YAML string containing name, description, and nodes is parsed
- **THEN** the function SHALL return a WorkflowDefinition object

#### Scenario: Invalid YAML syntax
- **WHEN** a malformed YAML string is parsed
- **THEN** the function SHALL return null

#### Scenario: Valid YAML but invalid schema
- **WHEN** a syntactically valid YAML that doesn't match WorkflowDefinitionSchema is parsed
- **THEN** the function SHALL return null

#### Scenario: Workflow with all node types
- **WHEN** a YAML containing all 8 node types is parsed
- **THEN** all nodes SHALL be parsed and validated correctly

### Requirement: Load workflows from directory
The system SHALL provide a `loadWorkflowsFromDirectory` function that scans a directory for `.yaml`/`.yml` files, parses each one, and returns an array of valid WorkflowDefinitions. Non-existent directories SHALL return an empty array. Invalid files SHALL be silently skipped with a warning.

#### Scenario: Non-existent directory returns empty
- **WHEN** the specified directory does not exist
- **THEN** the function SHALL return an empty array

#### Scenario: Mixed valid and invalid files
- **WHEN** a directory contains both valid YAML workflows and non-YAML files
- **THEN** only valid YAML workflows SHALL be returned, non-YAML files skipped

#### Scenario: Invalid workflow files skipped
- **WHEN** a directory contains a .yaml file with invalid schema
- **THEN** the invalid file SHALL be skipped and other valid files SHALL still be loaded
