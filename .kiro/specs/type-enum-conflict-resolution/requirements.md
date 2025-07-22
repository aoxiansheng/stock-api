# Requirements Document

## Introduction

This feature resolves two specific type/enum conflicts identified in the duplicate analysis report:
1. `OperationStatus` - defined as both a type and an enum
2. `BLOCKED` - defined as both a type literal and an enum value

The goal is to eliminate these conflicts by choosing one definition approach for each and updating all references accordingly.

## Requirements

### Requirement 1

**User Story:** As a developer, I want to resolve the OperationStatus conflict, so that there is only one definition used consistently across the codebase.

#### Acceptance Criteria

1. WHEN examining OperationStatus definitions THEN there SHALL be only one authoritative definition
2. WHEN the conflict is resolved THEN all imports and usages SHALL reference the single definition
3. WHEN the resolution is complete THEN the type definition in system.constants.ts SHALL be removed or the enum in auth-type.enum.ts SHALL be removed
4. WHEN choosing the approach THEN the enum definition SHALL be preferred for runtime value access

### Requirement 2

**User Story:** As a developer, I want to resolve the BLOCKED value conflict, so that security audit interfaces and metrics use consistent definitions.

#### Acceptance Criteria

1. WHEN examining BLOCKED definitions THEN there SHALL be only one source for this value
2. WHEN the conflict is resolved THEN security interfaces SHALL use enum-based definitions instead of string literals
3. WHEN the resolution is complete THEN all usages of "blocked" SHALL reference the same enum value
4. WHEN updating interfaces THEN existing functionality SHALL remain unchanged