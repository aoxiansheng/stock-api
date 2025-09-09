* 嵌套属性使用情况分析器
 * 🎯 正确处理嵌套对象属性的使用情况分析
 * 修复：PARENT.NESTED.PROPERTY 的识别问题


# 1. 运行分析工具生成报告
  bun run tools/unused/property-usage-analyzer-nested.ts > constants-usage-analysis.json

  # 2. 干运行查看删除计划
  bun run tools/unused/property-cleanup-tool.ts property-usage-analysis-nested.json --dry-run

  # 3. 执行实际删除
  bun run tools/unused/property-cleanup-tool.ts property-usage-analysis-nested.json --execute
