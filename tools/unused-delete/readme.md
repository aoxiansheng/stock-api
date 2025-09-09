npm run remove:unused-constants

bun run tools/unused-delete/remove-unused-constants-advanced.ts


该工具会自动：
解析 constants-usage-analysis.md 报告文件
识别所有未使用的常量
安全地从源文件中删除这些常量
保持代码的语法正确性