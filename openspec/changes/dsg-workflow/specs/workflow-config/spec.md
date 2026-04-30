## ADDED Requirements

### Requirement: Workflows config schema
The PluginConfigSchema SHALL include an optional `workflows` field with sub-fields: `enabled` (boolean, default true), `auto_route` (boolean, default true), `default_workflow` (string, optional).

#### Scenario: Default values applied
- **WHEN** config is loaded without a workflows section
- **THEN** enabled SHALL default to true and auto_route SHALL default to true

#### Scenario: Custom values parsed
- **WHEN** config has `workflows: { enabled: false, auto_route: false }`
- **THEN** both values SHALL be parsed as boolean false

### Requirement: Config deep merge
The workflows config SHALL be deep-merged between user-level and project-level configs, consistent with other nested config fields.

#### Scenario: Project overrides user config
- **WHEN** user config has `workflows.enabled: true` and project config has `workflows.enabled: false`
- **THEN** the merged config SHALL have `workflows.enabled: false`
