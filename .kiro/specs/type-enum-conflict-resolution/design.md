# Design Document

## Overview

This design resolves two specific conflicts:
1. `OperationStatus` - exists as both a type in system.constants.ts and an enum in auth-type.enum.ts
2. `BLOCKED` - exists as both a string literal in security interfaces and an enum value in auth-type.enum.ts

The solution is to keep the existing enum definitions and remove/update the conflicting type definitions.

## Architecture

### Current Conflicts

1. **OperationStatus Conflict:**
   - Type: `src/common/constants/unified/system.constants.ts` (line 48)
   - Enum: `src/metrics/enums/auth-type.enum.ts` (line 17)
   - **Decision:** Keep the enum, remove the type

2. **BLOCKED Conflict:**
   - Type literal: `src/security/interfaces/security-audit.interface.ts` (line 97) 
   - Enum value: `src/metrics/enums/auth-type.enum.ts` (line 21)
   - **Decision:** Use the enum value, update security interfaces

## Components and Interfaces

### 1. OperationStatus Resolution

**Keep existing enum in `src/metrics/enums/auth-type.enum.ts`:**
```typescript
export enum OperationStatus {
  SUCCESS = "success",
  ERROR = "error", 
  ALLOWED = "allowed",
  BLOCKED = "blocked",
  HIT = "hit",
  MISS = "miss",
}
```

**Remove type from `src/common/constants/unified/system.constants.ts`:**
- Delete the `OperationStatus` type definition
- Update utility functions to use the enum instead
- Update exports in index.ts

### 2. BLOCKED Value Resolution

**Use existing enum value from `src/metrics/enums/auth-type.enum.ts`:**
```typescript
OperationStatus.BLOCKED = "blocked"
```

**Update security interfaces to import and use the enum:**
```typescript
// src/security/interfaces/security-audit.interface.ts
import { OperationStatus } from '../../metrics/enums/auth-type.enum';

export type SecurityEventOutcome = "success" | "failure" | `${OperationStatus.BLOCKED}`;
```

## Data Models

### Updated Security Interface
```typescript
// Instead of hardcoded "blocked", use the enum value
outcome: "success" | "failure" | "blocked" // Current
outcome: "success" | "failure" | `${OperationStatus.BLOCKED}` // Updated
```

### Updated System Constants
```typescript
// Remove this type definition:
// export type OperationStatus = (typeof SYSTEM_CONSTANTS.OPERATION_STATUS)[keyof typeof SYSTEM_CONSTANTS.OPERATION_STATUS];

// Update utility functions to import and use the enum:
import { OperationStatus } from '../../metrics/enums/auth-type.enum';

export function isValidOperationStatus(status: string): status is OperationStatus {
  return Object.values(OperationStatus).includes(status as OperationStatus);
}
```

## Testing Strategy

### Simple Validation Tests
- Test that OperationStatus enum works correctly
- Test that security interfaces accept the enum value
- Test that existing functionality is preserved

## Implementation Approach

1. **Remove conflicting type definition** from system.constants.ts
2. **Update imports** to use the existing enum
3. **Update security interfaces** to reference the enum value
4. **Test** that everything still works