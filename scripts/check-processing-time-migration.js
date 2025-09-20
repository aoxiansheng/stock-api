#!/usr/bin/env node
/**
 * processingTime字段迁移检测脚本
 *
 * 功能：
 * 1. 扫描代码库中processingTime和processingTimeMs字段的使用情况
 * 2. 生成迁移进度报告
 * 3. 检测字段使用不一致的问题
 * 4. 提供迁移建议
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// 配置
const CONFIG = {
  // 搜索根目录
  searchRoots: ['src/', 'test/'],

  // 忽略的目录和文件
  ignorePatterns: [
    'node_modules/',
    'dist/',
    'backup/',
    '*.d.ts',
    '*.js.map',
    'scripts/'
  ],

  // 文件扩展名
  fileExtensions: ['.ts', '.js', '.tsx', '.jsx'],

  // 输出目录
  outputDir: 'reports/migration/'
};

// 结果统计
const stats = {
  filesScanned: 0,
  filesWithProcessingTime: 0,
  filesWithProcessingTimeMs: 0,
  filesWithBothFields: 0,
  totalProcessingTimeRefs: 0,
  totalProcessingTimeMsRefs: 0,
  inconsistentFiles: [],
  migrationProgress: 0
};

// 详细结果
const detailedResults = {
  processingTimeFiles: new Map(),
  processingTimeMsFiles: new Map(),
  bothFieldsFiles: new Map(),
  migrationSuggestions: []
};

/**
 * 主执行函数
 */
async function main() {
  console.log('🔍 开始检测processingTime字段迁移状态...\n');

  try {
    // 创建输出目录
    ensureOutputDirectory();

    // 扫描文件
    await scanFiles();

    // 分析结果
    analyzeResults();

    // 生成报告
    generateReports();

    // 输出总结
    printSummary();

  } catch (error) {
    console.error('❌ 检测过程中发生错误:', error.message);
    process.exit(1);
  }
}

/**
 * 确保输出目录存在
 */
function ensureOutputDirectory() {
  const outputPath = path.join(process.cwd(), CONFIG.outputDir);
  if (!fs.existsSync(outputPath)) {
    fs.mkdirSync(outputPath, { recursive: true });
    console.log(`📁 创建输出目录: ${outputPath}`);
  }
}

/**
 * 扫描文件
 */
async function scanFiles() {
  console.log('📁 扫描文件中...');

  for (const root of CONFIG.searchRoots) {
    const rootPath = path.join(process.cwd(), root);
    if (fs.existsSync(rootPath)) {
      await scanDirectory(rootPath);
    }
  }

  console.log(`✅ 扫描完成，共检查 ${stats.filesScanned} 个文件\n`);
}

/**
 * 递归扫描目录
 */
async function scanDirectory(dirPath) {
  const items = fs.readdirSync(dirPath);

  for (const item of items) {
    const itemPath = path.join(dirPath, item);
    const stat = fs.statSync(itemPath);

    if (stat.isDirectory()) {
      // 检查是否应该忽略此目录
      if (!shouldIgnore(itemPath)) {
        await scanDirectory(itemPath);
      }
    } else if (stat.isFile()) {
      // 检查文件扩展名
      if (CONFIG.fileExtensions.some(ext => item.endsWith(ext))) {
        await scanFile(itemPath);
      }
    }
  }
}

/**
 * 检查是否应该忽略文件/目录
 */
function shouldIgnore(filePath) {
  const relativePath = path.relative(process.cwd(), filePath);
  return CONFIG.ignorePatterns.some(pattern => {
    if (pattern.endsWith('/')) {
      return relativePath.includes(pattern.slice(0, -1));
    }
    return relativePath.includes(pattern);
  });
}

/**
 * 扫描单个文件
 */
async function scanFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const relativePath = path.relative(process.cwd(), filePath);

    stats.filesScanned++;

    // 查找processingTime引用
    const processingTimeMatches = findFieldReferences(content, 'processingTime', relativePath);
    const processingTimeMsMatches = findFieldReferences(content, 'processingTimeMs', relativePath);

    // 统计和记录
    if (processingTimeMatches.length > 0) {
      stats.filesWithProcessingTime++;
      stats.totalProcessingTimeRefs += processingTimeMatches.length;
      detailedResults.processingTimeFiles.set(relativePath, processingTimeMatches);
    }

    if (processingTimeMsMatches.length > 0) {
      stats.filesWithProcessingTimeMs++;
      stats.totalProcessingTimeMsRefs += processingTimeMsMatches.length;
      detailedResults.processingTimeMsFiles.set(relativePath, processingTimeMsMatches);
    }

    if (processingTimeMatches.length > 0 && processingTimeMsMatches.length > 0) {
      stats.filesWithBothFields++;
      detailedResults.bothFieldsFiles.set(relativePath, {
        processingTime: processingTimeMatches,
        processingTimeMs: processingTimeMsMatches
      });
    }

  } catch (error) {
    console.warn(`⚠️  无法读取文件 ${filePath}: ${error.message}`);
  }
}

/**
 * 查找字段引用
 */
function findFieldReferences(content, fieldName, filePath) {
  const matches = [];
  const lines = content.split('\n');

  lines.forEach((line, index) => {
    // 查找字段定义和使用
    const patterns = [
      new RegExp(`\\b${fieldName}\\s*[:=]`, 'g'),           // 字段定义
      new RegExp(`\\.${fieldName}\\b`, 'g'),                // 属性访问
      new RegExp(`\\[["']${fieldName}["']\\]`, 'g'),        // 括号访问
      new RegExp(`\\b${fieldName}\\s*\\?`, 'g'),            // 可选字段
      new RegExp(`@deprecated.*${fieldName}`, 'gi'),        // 废弃标记
      new RegExp(`/\\*\\*.*${fieldName}.*\\*/`, 'gs'),      // 注释中提及
    ];

    patterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(line)) !== null) {
        matches.push({
          line: index + 1,
          column: match.index + 1,
          text: line.trim(),
          matchedText: match[0],
          context: getLineContext(lines, index, 2)
        });
      }
    });
  });

  return matches;
}

/**
 * 获取行的上下文
 */
function getLineContext(lines, lineIndex, contextSize = 2) {
  const start = Math.max(0, lineIndex - contextSize);
  const end = Math.min(lines.length, lineIndex + contextSize + 1);

  return lines.slice(start, end).map((line, index) => ({
    lineNumber: start + index + 1,
    content: line,
    isCurrent: start + index === lineIndex
  }));
}

/**
 * 分析结果
 */
function analyzeResults() {
  console.log('📊 分析结果中...');

  // 计算迁移进度
  const totalReferences = stats.totalProcessingTimeRefs + stats.totalProcessingTimeMsRefs;
  if (totalReferences > 0) {
    stats.migrationProgress = Math.round((stats.totalProcessingTimeMsRefs / totalReferences) * 100);
  }

  // 检测不一致的文件
  detailedResults.bothFieldsFiles.forEach((references, filePath) => {
    const processingTimeCount = references.processingTime.length;
    const processingTimeMsCount = references.processingTimeMs.length;

    // 如果一个文件中processingTime引用多于processingTimeMs，可能存在问题
    if (processingTimeCount > processingTimeMsCount * 2) {
      stats.inconsistentFiles.push({
        file: filePath,
        issue: '大量使用废弃的processingTime字段',
        processingTimeCount,
        processingTimeMsCount,
        severity: 'high'
      });
    }
  });

  // 生成迁移建议
  generateMigrationSuggestions();

  console.log('✅ 分析完成\n');
}

/**
 * 生成迁移建议
 */
function generateMigrationSuggestions() {
  // 高优先级：只有processingTime的文件
  detailedResults.processingTimeFiles.forEach((references, filePath) => {
    if (!detailedResults.processingTimeMsFiles.has(filePath)) {
      detailedResults.migrationSuggestions.push({
        priority: 'high',
        file: filePath,
        action: 'migrate_to_processing_time_ms',
        description: `文件只使用废弃的processingTime字段，需要迁移到processingTimeMs`,
        references: references.length,
        estimatedEffort: references.length > 5 ? 'medium' : 'low'
      });
    }
  });

  // 中优先级：同时使用两个字段的文件
  detailedResults.bothFieldsFiles.forEach((references, filePath) => {
    detailedResults.migrationSuggestions.push({
      priority: 'medium',
      file: filePath,
      action: 'cleanup_dual_fields',
      description: `文件同时使用两个字段，建议清理processingTime字段`,
      processingTimeRefs: references.processingTime.length,
      processingTimeMsRefs: references.processingTimeMs.length,
      estimatedEffort: 'low'
    });
  });
}

/**
 * 生成报告
 */
function generateReports() {
  console.log('📄 生成报告中...');

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

  // 生成JSON详细报告
  const detailedReport = {
    timestamp: new Date().toISOString(),
    summary: stats,
    details: {
      processingTimeFiles: Array.from(detailedResults.processingTimeFiles.entries()),
      processingTimeMsFiles: Array.from(detailedResults.processingTimeMsFiles.entries()),
      bothFieldsFiles: Array.from(detailedResults.bothFieldsFiles.entries()),
      inconsistentFiles: stats.inconsistentFiles,
      migrationSuggestions: detailedResults.migrationSuggestions
    }
  };

  const jsonReportPath = path.join(CONFIG.outputDir, `migration-detailed-${timestamp}.json`);
  fs.writeFileSync(jsonReportPath, JSON.stringify(detailedReport, null, 2));

  // 生成Markdown摘要报告
  const markdownReport = generateMarkdownReport();
  const mdReportPath = path.join(CONFIG.outputDir, `migration-summary-${timestamp}.md`);
  fs.writeFileSync(mdReportPath, markdownReport);

  console.log(`📊 详细报告: ${jsonReportPath}`);
  console.log(`📋 摘要报告: ${mdReportPath}`);
}

/**
 * 生成Markdown报告
 */
function generateMarkdownReport() {
  const timestamp = new Date().toISOString();

  return `# processingTime字段迁移状态报告

生成时间: ${timestamp}

## 📊 统计摘要

| 指标 | 数值 |
|------|------|
| 扫描文件总数 | ${stats.filesScanned} |
| 使用processingTime的文件 | ${stats.filesWithProcessingTime} |
| 使用processingTimeMs的文件 | ${stats.filesWithProcessingTimeMs} |
| 同时使用两个字段的文件 | ${stats.filesWithBothFields} |
| processingTime引用总数 | ${stats.totalProcessingTimeRefs} |
| processingTimeMs引用总数 | ${stats.totalProcessingTimeMsRefs} |
| **迁移进度** | **${stats.migrationProgress}%** |

## 🎯 迁移状态分析

### 迁移进度评估
- ✅ **已迁移**: ${Math.round((stats.totalProcessingTimeMsRefs / (stats.totalProcessingTimeRefs + stats.totalProcessingTimeMsRefs)) * 100)}% 的引用使用标准字段
- 🔄 **进行中**: ${stats.filesWithBothFields} 个文件处于双字段并存状态
- ❌ **待迁移**: ${stats.filesWithProcessingTime - stats.filesWithBothFields} 个文件仅使用废弃字段

### 问题文件列表

${stats.inconsistentFiles.length > 0 ?
  stats.inconsistentFiles.map(issue =>
    `- **${issue.file}**: ${issue.issue} (processingTime: ${issue.processingTimeCount}, processingTimeMs: ${issue.processingTimeMsCount})`
  ).join('\n') :
  '暂无发现严重不一致的文件'
}

## 🚀 迁移建议

### 高优先级任务
${detailedResults.migrationSuggestions
  .filter(s => s.priority === 'high')
  .map(s => `- **${s.file}**: ${s.description} (${s.references} 个引用)`)
  .join('\n') || '无高优先级任务'}

### 中优先级任务
${detailedResults.migrationSuggestions
  .filter(s => s.priority === 'medium')
  .map(s => `- **${s.file}**: ${s.description}`)
  .join('\n') || '无中优先级任务'}

## 📋 后续行动计划

1. **立即处理**: 迁移仅使用processingTime的文件到processingTimeMs
2. **逐步清理**: 在双字段并存的文件中移除processingTime字段
3. **最终验证**: 确保所有引用都使用标准的processingTimeMs字段

---
*报告由 check-processing-time-migration.js 自动生成*
`;
}

/**
 * 打印总结
 */
function printSummary() {
  console.log('=' .repeat(60));
  console.log('📈 迁移状态总结');
  console.log('=' .repeat(60));
  console.log(`📁 扫描文件: ${stats.filesScanned}`);
  console.log(`📄 使用processingTime: ${stats.filesWithProcessingTime} 文件 (${stats.totalProcessingTimeRefs} 引用)`);
  console.log(`📄 使用processingTimeMs: ${stats.filesWithProcessingTimeMs} 文件 (${stats.totalProcessingTimeMsRefs} 引用)`);
  console.log(`🔄 双字段并存: ${stats.filesWithBothFields} 文件`);
  console.log(`📊 迁移进度: ${stats.migrationProgress}%`);

  if (stats.inconsistentFiles.length > 0) {
    console.log(`\n⚠️  发现 ${stats.inconsistentFiles.length} 个不一致的文件需要关注`);
  }

  console.log(`\n💡 迁移建议: ${detailedResults.migrationSuggestions.length} 项`);
  console.log(`   - 高优先级: ${detailedResults.migrationSuggestions.filter(s => s.priority === 'high').length} 项`);
  console.log(`   - 中优先级: ${detailedResults.migrationSuggestions.filter(s => s.priority === 'medium').length} 项`);

  console.log('\n✅ 检测完成！请查看生成的报告文件了解详细信息。');
}

// 执行主函数
if (require.main === module) {
  main().catch(error => {
    console.error('脚本执行失败:', error);
    process.exit(1);
  });
}

module.exports = {
  main,
  CONFIG,
  stats,
  detailedResults
};