# Implementation Plan

- [x] 1. Add file name duplicate detection to DuplicateAnalyzer
  - Add `this.fileNames = new Map()` to constructor to track filename -> [file paths]
  - Create `scanFileNames()` method to group files by base name
  - _Requirements: 1.1, 1.2_

- [x] 2. Implement scanFileNames() method
  - Loop through `this.allFiles` and extract base names using `path.basename(file, '.ts')`
  - Group files with same base name in the Map
  - Skip test files (.spec.ts, .test.ts) to avoid false positives
  - _Requirements: 1.1, 1.3, 2.4_

- [x] 3. Add file name duplicates to findDuplicates() method
  - Find entries in `this.fileNames` Map where array length > 1
  - Add `filenames: []` array to duplicates return object
  - Include file paths and basic info for each duplicate group
  - _Requirements: 1.2, 1.4_

- [x] 4. Update generateReport() to include file name duplicates
  - Add "🔄 重复的文件名" section to report
  - Show duplicate file names with their full paths
  - Update statistics summary to include file name duplicate count
  - _Requirements: 4.2, 4.3_

- [x] 5. Update run() method to call scanFileNames()
  - Add `this.scanFileNames()` call after `this.scanAllFiles()`
  - Update console output to show file name duplicate statistics
  - _Requirements: 4.1, 4.4_