## ADDED Requirements

### Requirement: String equality and inequality
The system SHALL evaluate `$nodeId.output == 'VALUE'` and `$nodeId.output != 'VALUE'` expressions against node outputs.

#### Scenario: Equality match
- **WHEN** condition is "$step1.output == 'hello'" and step1 output is "hello"
- **THEN** the evaluator SHALL return true

#### Scenario: Inequality match
- **WHEN** condition is "$step1.output != 'goodbye'" and step1 output is "hello"
- **THEN** the evaluator SHALL return true

### Requirement: Dot notation field access
The system SHALL support `$nodeId.output.field` syntax to access JSON fields from node outputs.

#### Scenario: JSON field access
- **WHEN** condition is "$step2.output.status == 'success'" and step2 output is `{"status": "success"}`
- **THEN** the evaluator SHALL parse the JSON and return true

### Requirement: Numeric comparison operators
The system SHALL support `>`, `>=`, `<`, `<=` operators for numeric comparison of values.

#### Scenario: Greater than comparison
- **WHEN** condition is "$step2.output.count > '40'" and the count field is 42
- **THEN** the evaluator SHALL return true

#### Scenario: Less than or equal comparison
- **WHEN** condition is "$step2.output.count <= '42'" and the count field is 42
- **THEN** the evaluator SHALL return true

### Requirement: Compound expressions
The system SHALL support `&&` (AND) and `||` (OR) compound expressions.

#### Scenario: AND compound expression
- **WHEN** condition is "$a.output == 'x' && $b.output == 'y'" and both match
- **THEN** the evaluator SHALL return true

#### Scenario: OR compound expression
- **WHEN** condition is "$a.output == 'x' || $b.output == 'y'" and only b matches
- **THEN** the evaluator SHALL return true

### Requirement: Fail-closed on error
The system SHALL return false for any unparseable expression or missing reference. When the condition is undefined, the system SHALL return undefined (indicating no condition to evaluate).

#### Scenario: Malformed expression returns false
- **WHEN** condition is "not a valid expression"
- **THEN** the evaluator SHALL return false

#### Scenario: Missing node reference returns false
- **WHEN** condition references a non-existent node ID
- **THEN** the evaluator SHALL return false

#### Scenario: Undefined condition returns undefined
- **WHEN** condition is undefined
- **THEN** the evaluator SHALL return undefined
