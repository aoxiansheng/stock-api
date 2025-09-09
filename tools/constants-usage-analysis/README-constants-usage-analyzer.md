# Constants Usage Analyzer

A comprehensive TypeScript tool that analyzes constant files usage patterns in the `/backend/src/common/constants` directory.

## Features

✅ **基于 AST 的分析**：利用 TypeScript 的 AST 解析技术进行精确的代码分析
✅ **全面覆盖**：扫描常量目录中的所有 `.ts` 文件以及整个 `backend/src` 目录
✅ **使用追踪**：识别哪些常量被其他文件导入和使用
✅ **统计分析**：为每个常量生成详细的使用统计信息
✅ **模式识别**：区分单引用常量和多引用常量
✅ **路径追踪**：记录导入每个常量的确切文件路径
✅ **全面报告**：生成包含建议的详细 Markdown 报告
✅ **冗余检测**：识别可能存在的冗余常量
✅ **合并建议**：提出可以合并的常量建议

## Installation & Requirements

The tool uses `ts-morph` which is already included in the project's `package.json` dependencies.

## Usage

### Run with default output location
```bash
bun run analyze:constants-usage
```

### Generate report in docs directory
```bash
bun run analyze:constants-usage:report
```

### Custom output location
```bash
bun run analyze:constants-usage:custom path/to/your/report.md
```

### Direct execution
```bash
cd /Users/honor/Documents/code/newstockapi/backend
bun run tools/constants-usage-analyzer.ts [optional-output-file]
```

## Generated Report Sections

### 📊 Executive Summary
- Total constants count
- Usage statistics
- File statistics
- Key metrics overview

### 🎯 Key Recommendations
- Unused constants to remove
- Single-use constants to review
- Heavily used constants (good practices)
- File organization suggestions

### 📈 Most Used Constants (Top 10)
- Detailed breakdown of most frequently used constants
- Source files and usage counts
- Referencing file lists

### 🚨 Potentially Redundant Constants
- **Unused Constants**: Can be safely removed
- **Single-use Constants**: Consider inlining or consolidation

### 📁 Constants by File
- Per-file breakdown of exports and imports
- Import/export counts
- Dependency relationships

### 📊 Detailed Usage Statistics
- Complete table of all constants with usage counts
- File distribution metrics
- Value information where available

### 🔍 Usage Patterns Analysis
- Constants grouped by usage frequency
- File distribution patterns
- Cross-file usage analysis

### 📋 Action Items
- **Immediate Actions**: Quick wins for cleanup
- **Medium-term Improvements**: Architectural improvements
- **Long-term Strategy**: Process and governance

## Sample Output

```
🚀 Constants Usage Analyzer v1.0
📊 Analysis Results:
   - Total Constants: 237
   - Total Usages: 894
   - Unused Constants: 193
   - Single-use Constants: 6
   - Multi-use Constants: 38
   - Average Usage: 3.77

🎯 Key Recommendations:
   🗑️ Remove 193 unused constants to reduce codebase bloat
   ⚡ Review 6 single-use constants for potential inlining
   ✅ 22 constants are heavily used (10+ references) - good centralization
```

## Analysis Algorithm

### 1. **Discovery Phase**
- Recursively scan `/src/common/constants` for TypeScript files
- Recursively scan `/src` for all TypeScript source files
- Filter out test files and build artifacts

### 2. **Parsing Phase**
- Use TypeScript compiler API via `ts-morph` to parse AST
- Extract all exported constants from constant files
- Identify export types (named, default, namespace)
- Extract constant values, types, and documentation

### 3. **Usage Analysis Phase**
- Analyze import statements in all source files
- Track both direct imports and indirect references
- Search file content for constant usage patterns
- Avoid false positives from definitions and comments

### 4. **Statistics Generation**
- Calculate usage counts per constant
- Identify single-use, multi-use, and unused constants
- Generate file-level and system-level statistics
- Create recommendations based on usage patterns

### 5. **Report Generation**
- Generate comprehensive markdown report
- Include executive summary and detailed breakdowns
- Provide actionable recommendations
- Format data in tables and lists for readability

## Configuration

The tool uses these default configurations:

```typescript
const CONFIG = {
  CONSTANTS_DIR: '/Users/honor/Documents/code/newstockapi/backend/src/common/constants',
  BACKEND_SRC_DIR: '/Users/honor/Documents/code/newstockapi/backend/src',
  OUTPUT_FILE: process.argv[2] || 'docs/constants-usage-analysis.md',
  IGNORE_PATTERNS: [
    'node_modules', '.git', 'dist', 'coverage', '.next',
    '__tests__', '.test.', '.spec.', 'test/', 'tests/'
  ]
};
```

## Integration with Existing Tools

This tool complements the existing constants optimization tools:

- **`npm run check-constants`**: Detects duplicate constants
- **`npm run detect-constants-duplicates`**: Alternative duplicate detector
- **`npm run optimize:constants`**: Optimizes constant definitions
- **`npm run analyze:constants-usage`**: **[NEW]** Analyzes usage patterns

## Troubleshooting

### Common Issues

**Issue**: `ts-morph` parsing errors
**Solution**: Ensure TypeScript files compile successfully first

**Issue**: Permission errors accessing files
**Solution**: Check file permissions and paths are correct

**Issue**: Memory issues with large codebases
**Solution**: The tool processes files incrementally to manage memory

**Issue**: Incomplete analysis results
**Solution**: Check that all TypeScript files are accessible and not corrupted

### Debug Mode

For debugging, you can modify the tool to add more verbose logging:

```typescript
// In constants-usage-analyzer.ts, add more console.log statements
console.log(`Processing file: ${filePath}`);
console.log(`Found ${constants.length} constants`);
```

## Performance

- **Analysis Time**: ~30-60 seconds for typical backend codebases
- **Memory Usage**: ~200-500MB during peak analysis
- **File Processing**: Processes ~500-1000 TypeScript files per minute
- **Report Generation**: Instant after analysis completes

## Future Enhancements

Potential improvements for future versions:

1. **Cache System**: Cache parsed ASTs for faster re-analysis
2. **Incremental Analysis**: Only re-analyze changed files
3. **Visual Reports**: Generate HTML reports with charts
4. **Integration**: Direct integration with IDEs and CI/CD
5. **Advanced Patterns**: Detect more complex usage patterns
6. **Refactoring Suggestions**: Generate automated refactoring scripts

## Contributing

To enhance this tool:

1. Fork the repository
2. Make changes to `tools/constants-usage-analyzer.ts`
3. Test with your local constants
4. Submit a pull request with improvements

## License

This tool is part of the smart-stock-data-system project and follows the same MIT license.