# Design Document

## Overview

This feature will create a comprehensive analysis tool to identify duplicate constants, variables, and DTO exports across the TypeScript codebase. The tool will scan the project structure, parse TypeScript files, extract identifiers, and generate a detailed report highlighting potential conflicts and consolidation opportunities.

Based on the codebase analysis, the system needs to handle:
- Constants exported from `.constants.ts` files (like `AUTH_OPERATIONS`, `CACHE_KEYS`, etc.)
- Enum values from `.enum.ts` files (like `UserRole`, `AlertSeverity`, etc.)
- DTO class and interface exports from `.dto.ts` files (like `CreateUserDto`, `LoginDto`, etc.)

## Architecture

The system will follow a modular architecture with the following components:

```
DuplicateAnalyzer
├── FileScanner - Discovers and filters relevant files
├── Parser - Extracts identifiers from TypeScript files
├── DuplicateDetector - Identifies duplicates and conflicts
├── ReportGenerator - Creates structured markdown reports
└── ConfigManager - Handles analysis configuration
```

## Components and Interfaces

### FileScanner
Responsible for discovering and filtering TypeScript files based on patterns.

```typescript
interface IFileScanner {
  scanDirectory(rootPath: string, config: ScanConfig): Promise<string[]>;
  filterFilesByType(files: string[], fileType: FileType): string[];
}

interface ScanConfig {
  includePatterns: string[];
  excludePatterns: string[];
  fileTypes: FileType[];
  caseSensitive: boolean;
}

enum FileType {
  CONSTANTS = 'constants',
  ENUMS = 'enums', 
  DTOS = 'dtos'
}
```

### Parser
Extracts identifiers from TypeScript files using AST parsing.

```typescript
interface IParser {
  parseFile(filePath: string): Promise<ParsedFile>;
  extractConstants(ast: any): ConstantInfo[];
  extractEnums(ast: any): EnumInfo[];
  extractDTOs(ast: any): DTOInfo[];
}

interface ParsedFile {
  filePath: string;
  constants: ConstantInfo[];
  enums: EnumInfo[];
  dtos: DTOInfo[];
}

interface ConstantInfo {
  name: string;
  value: any;
  type: string;
  lineNumber: number;
  exported: boolean;
}

interface EnumInfo {
  name: string;
  values: EnumValueInfo[];
  lineNumber: number;
  exported: boolean;
}

interface EnumValueInfo {
  name: string;
  value: string | number;
  lineNumber: number;
}

interface DTOInfo {
  name: string;
  type: 'class' | 'interface';
  properties: PropertyInfo[];
  lineNumber: number;
  exported: boolean;
}

interface PropertyInfo {
  name: string;
  type: string;
  optional: boolean;
  lineNumber: number;
}
```

### DuplicateDetector
Analyzes parsed data to identify duplicates and conflicts.

```typescript
interface IDuplicateDetector {
  findDuplicates(parsedFiles: ParsedFile[]): DuplicateReport;
  categorizeConflicts(duplicates: Duplicate[]): ConflictCategory[];
}

interface DuplicateReport {
  constants: ConstantDuplicate[];
  enums: EnumDuplicate[];
  dtos: DTODuplicate[];
  summary: DuplicateSummary;
}

interface ConstantDuplicate {
  name: string;
  occurrences: ConstantOccurrence[];
  conflictType: ConflictType;
  severity: SeverityLevel;
}

interface ConstantOccurrence {
  filePath: string;
  value: any;
  lineNumber: number;
  context: string;
}

interface EnumDuplicate {
  enumName?: string;
  valueName: string;
  occurrences: EnumOccurrence[];
  conflictType: ConflictType;
  severity: SeverityLevel;
}

interface EnumOccurrence {
  filePath: string;
  enumName: string;
  value: string | number;
  lineNumber: number;
}

interface DTODuplicate {
  name: string;
  occurrences: DTOOccurrence[];
  conflictType: ConflictType;
  severity: SeverityLevel;
}

interface DTOOccurrence {
  filePath: string;
  type: 'class' | 'interface';
  properties: PropertyInfo[];
  lineNumber: number;
}

enum ConflictType {
  SAME_NAME_SAME_VALUE = 'consolidation_candidate',
  SAME_NAME_DIFFERENT_VALUE = 'potential_conflict',
  SIMILAR_STRUCTURE = 'similar_structure'
}

enum SeverityLevel {
  HIGH = 'high',
  MEDIUM = 'medium', 
  LOW = 'low'
}
```

### ReportGenerator
Creates structured markdown reports with findings and recommendations.

```typescript
interface IReportGenerator {
  generateReport(duplicateReport: DuplicateReport, config: ReportConfig): Promise<string>;
  formatConstantSection(duplicates: ConstantDuplicate[]): string;
  formatEnumSection(duplicates: EnumDuplicate[]): string;
  formatDTOSection(duplicates: DTODuplicate[]): string;
  generateRecommendations(duplicateReport: DuplicateReport): Recommendation[];
}

interface ReportConfig {
  includeLineNumbers: boolean;
  includeSeverityLevels: boolean;
  includeRecommendations: boolean;
  sortBy: 'severity' | 'name' | 'count';
}

interface Recommendation {
  type: ConflictType;
  description: string;
  action: string;
  priority: SeverityLevel;
  affectedFiles: string[];
}
```

## Data Models

### Analysis Configuration
```typescript
interface AnalysisConfig {
  rootPath: string;
  includePatterns: string[];
  excludePatterns: string[];
  fileTypes: FileType[];
  caseSensitive: boolean;
  reportConfig: ReportConfig;
}
```

### Default Configuration
```typescript
const DEFAULT_CONFIG: AnalysisConfig = {
  rootPath: './src',
  includePatterns: [
    '**/*.constants.ts',
    '**/*.enum.ts', 
    '**/*.dto.ts'
  ],
  excludePatterns: [
    '**/node_modules/**',
    '**/dist/**',
    '**/*.spec.ts',
    '**/*.test.ts'
  ],
  fileTypes: [FileType.CONSTANTS, FileType.ENUMS, FileType.DTOS],
  caseSensitive: true,
  reportConfig: {
    includeLineNumbers: true,
    includeSeverityLevels: true,
    includeRecommendations: true,
    sortBy: 'severity'
  }
};
```

## Error Handling

The system will implement comprehensive error handling:

1. **File System Errors**: Handle missing files, permission issues, and invalid paths
2. **Parse Errors**: Handle malformed TypeScript files and syntax errors
3. **Memory Errors**: Handle large codebases with streaming and chunking
4. **Configuration Errors**: Validate configuration parameters and provide defaults

```typescript
class AnalysisError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly filePath?: string,
    public readonly lineNumber?: number
  ) {
    super(message);
  }
}

enum ErrorCodes {
  FILE_NOT_FOUND = 'FILE_NOT_FOUND',
  PARSE_ERROR = 'PARSE_ERROR',
  INVALID_CONFIG = 'INVALID_CONFIG',
  MEMORY_LIMIT = 'MEMORY_LIMIT'
}
```

## Testing Strategy

### Unit Tests
- Test each component in isolation
- Mock file system operations
- Test various TypeScript syntax patterns
- Validate error handling scenarios

### Integration Tests
- Test end-to-end analysis workflow
- Test with real project files
- Validate report generation accuracy
- Test performance with large codebases

### Test Data
Create test fixtures with known duplicate patterns:
- Constants with same names but different values
- Enum values with conflicts across different enums
- DTO classes with identical names but different structures

```typescript
// Test fixtures structure
test/fixtures/
├── constants/
│   ├── auth.constants.ts
│   ├── cache.constants.ts
│   └── duplicate.constants.ts
├── enums/
│   ├── status.enum.ts
│   ├── type.enum.ts
│   └── duplicate.enum.ts
└── dtos/
    ├── user.dto.ts
    ├── auth.dto.ts
    └── duplicate.dto.ts
```

### Performance Testing
- Test with large codebases (1000+ files)
- Memory usage monitoring
- Processing time benchmarks
- Concurrent file processing validation

## Implementation Approach

### Phase 1: Core Infrastructure
1. Set up TypeScript AST parsing using `@typescript-eslint/parser`
2. Implement file scanning and filtering
3. Create basic identifier extraction

### Phase 2: Duplicate Detection
1. Implement duplicate detection algorithms
2. Add conflict categorization logic
3. Create severity assessment rules

### Phase 3: Report Generation
1. Design markdown report templates
2. Implement report formatting
3. Add recommendation generation

### Phase 4: Configuration & CLI
1. Add configuration file support
2. Create command-line interface
3. Add filtering and customization options

## Dependencies

- `@typescript-eslint/parser`: TypeScript AST parsing
- `glob`: File pattern matching
- `fs-extra`: Enhanced file system operations
- `commander`: CLI argument parsing
- `chalk`: Terminal output coloring
- `jest`: Testing framework