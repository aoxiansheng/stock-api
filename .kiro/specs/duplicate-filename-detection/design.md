# Design Document

## Overview

This design extends the existing `DuplicateAnalyzer` class to include file name duplicate detection capabilities. The enhancement will add new methods to scan for duplicate file names, categorize them by conflict severity, and integrate the results into the existing reporting system.

## Architecture

### Core Components

The enhancement will add the following components to the existing `DuplicateAnalyzer` class:

1. **File Name Scanner** - Scans all TypeScript files and extracts base names
2. **Conflict Categorizer** - Analyzes duplicate file names and assigns severity levels
3. **Metadata Collector** - Gathers file size, modification date, and directory context
4. **Report Integrator** - Adds file name duplicates to the existing report structure

### Data Structures

```typescript
// New data structure for file name analysis
this.fileNames = {
  byBaseName: new Map(), // baseName -> [{fullPath, directory, size, lastModified}]
  conflicts: []          // [{baseName, files: [...], severity, conflictType}]
};
```

## Components and Interfaces

### Enhanced DuplicateAnalyzer Class

#### New Methods

1. **`scanFileNames()`**
   - Scans all TypeScript files collected in `this.allFiles`
   - Extracts base file names (without path and extension)
   - Groups files by base name
   - Stores results in `this.fileNames.byBaseName`

2. **`categorizeFileNameConflicts()`**
   - Analyzes grouped file names for conflicts
   - Assigns severity levels based on directory relationships
   - Creates conflict objects with metadata
   - Stores results in `this.fileNames.conflicts`

3. **`getFileSeverity(files)`**
   - Determines conflict severity based on file locations
   - Returns: 'high', 'medium', 'low', or 'excluded'

4. **`shouldExcludeFiles(files)`**
   - Filters out acceptable duplicates (e.g., test files)
   - Returns boolean indicating if files should be excluded

#### Enhanced Methods

1. **`run()`** - Add file name scanning step
2. **`generateReport()`** - Include file name duplicates section

### Conflict Severity Logic

#### High Priority
- Files with same base name in the same feature/module directory
- Files that could cause import confusion within the same namespace

#### Medium Priority  
- Files with same base name in different modules/features
- Files that could cause confusion across module boundaries

#### Low Priority
- Files with same base name but clearly different purposes
- Files in completely unrelated directory structures

#### Excluded
- Test files (.spec.ts, .test.ts) vs implementation files
- Index files in different directories
- Configuration files with standard names

## Data Models

### FileNameInfo Interface
```typescript
interface FileNameInfo {
  fullPath: string;
  directory: string;
  baseName: string;
  size: number;
  lastModified: Date;
  relativeDirectory: string; // relative to src/
}
```

### FileNameConflict Interface
```typescript
interface FileNameConflict {
  baseName: string;
  files: FileNameInfo[];
  severity: 'high' | 'medium' | 'low';
  conflictType: string;
  description: string;
}
```

## Error Handling

### File Access Errors
- Gracefully handle files that cannot be read
- Log warnings for inaccessible files
- Continue processing remaining files

### Path Resolution Errors
- Handle edge cases with unusual file paths
- Normalize path separators across platforms
- Validate file extensions before processing

## Testing Strategy

### Unit Tests
1. **File Name Extraction**
   - Test base name extraction from various file paths
   - Test handling of files with multiple dots in names
   - Test edge cases with unusual file names

2. **Conflict Categorization**
   - Test severity assignment for different directory structures
   - Test exclusion logic for test files and standard names
   - Test conflict type determination

3. **Integration with Existing System**
   - Test that new functionality doesn't break existing analysis
   - Test report generation includes file name section
   - Test console output includes file name statistics

### Integration Tests
1. **End-to-End Analysis**
   - Test complete analysis run with file name detection
   - Verify report output format and content
   - Test with various project structures

2. **Performance Testing**
   - Ensure file name analysis doesn't significantly impact runtime
   - Test with large numbers of files
   - Verify memory usage remains reasonable

## Implementation Approach

### Phase 1: Core File Name Detection
- Add basic file name scanning functionality
- Implement conflict detection without severity categorization
- Integrate with existing report structure

### Phase 2: Severity Categorization
- Add conflict severity logic
- Implement exclusion rules for acceptable duplicates
- Enhance report with severity-based organization

### Phase 3: Enhanced Metadata
- Add file size and modification date collection
- Implement directory context analysis
- Add sorting and filtering capabilities

### Phase 4: Report Integration
- Enhance report formatting for file name conflicts
- Add console output for file name statistics
- Optimize report readability and organization