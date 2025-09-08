#!/usr/bin/env bun

/**
 * 属性清理工具
 * 🗑️ 基于嵌套属性分析结果自动删除未使用的属性
 * 
 * 功能：
 * 1. 读取分析报告
 * 2. 按文件分组删除计划
 * 3. 逐行删除未使用的属性
 * 4. 生成删除日志
 */

import { readFileSync, writeFileSync, copyFileSync } from 'fs';
import { basename, dirname, join } from 'path';

interface DeletionItem {
  line: number;
  property: string;
  propertyName: string;
  parentObject: string;
  nestedPath: string;
  value: string;
}

interface AnalysisReport {
  metadata: {
    generatedAt: string;
    totalProperties: number;
    analyzedProperties: number;
    unusedProperties: number;
    projectPath: string;
    version: string;
  };
  deletionPlan: {
    [filePath: string]: DeletionItem[];
  };
}

class PropertyCleanupTool {
  private readonly rootDir: string;
  private readonly reportFile: string;
  private readonly logFile: string;
  private report!: AnalysisReport;
  private cleanupLog: string[] = [];

  constructor(reportPath: string) {
    this.rootDir = process.cwd();
    this.reportFile = reportPath;
    this.logFile = join(this.rootDir, 'property-cleanup-log.md');
    
    console.log('🗑️ 属性清理工具启动...');
    console.log(`📄 分析报告: ${this.reportFile}`);
  }

  /**
   * 执行清理
   */
  async cleanup(dryRun: boolean = true): Promise<void> {
    try {
      // 1. 读取分析报告
      this.loadReport();
      
      // 2. 显示清理计划
      this.displayCleanupPlan();
      
      // 3. 执行清理（如果不是试运行）
      if (dryRun) {
        console.log('\n🔍 试运行模式 - 不会实际修改文件');
        await this.performDryRun();
      } else {
        console.log('\n🚀 执行实际清理...');
        await this.performCleanup();
      }
      
      // 4. 生成日志
      await this.generateLog();
      
    } catch (error) {
      console.error('❌ 清理失败:', error);
      throw error;
    }
  }

  /**
   * 读取分析报告
   */
  private loadReport(): void {
    console.log('\n📖 读取分析报告...');
    
    const reportContent = readFileSync(this.reportFile, 'utf-8');
    this.report = JSON.parse(reportContent);
    
    console.log(`✅ 报告加载成功:`);
    console.log(`   - 分析属性数: ${this.report.metadata.analyzedProperties}`);
    console.log(`   - 可删除属性: ${this.report.metadata.unusedProperties}`);
    console.log(`   - 涉及文件数: ${Object.keys(this.report.deletionPlan).length}`);
  }

  /**
   * 显示清理计划
   */
  private displayCleanupPlan(): void {
    console.log('\n📋 清理计划:');
    
    let totalDeletions = 0;
    
    for (const [filePath, items] of Object.entries(this.report.deletionPlan)) {
      console.log(`\n📁 ${filePath} (${items.length}个属性):`);
      
      // 按行号排序
      items.sort((a, b) => a.line - b.line);
      
      items.forEach(item => {
        console.log(`   ❌ 第${item.line}行: ${item.property}`);
        totalDeletions++;
      });
    }
    
    console.log(`\n📊 总计要删除: ${totalDeletions} 个属性`);
  }

  /**
   * 执行试运行
   */
  private async performDryRun(): Promise<void> {
    console.log('\n🔍 试运行 - 检查删除计划可行性...');
    
    for (const [filePath, items] of Object.entries(this.report.deletionPlan)) {
      const fullPath = join(this.rootDir, filePath);
      
      try {
        const content = readFileSync(fullPath, 'utf-8');
        const lines = content.split('\n');
        
        console.log(`\n📄 检查文件: ${filePath}`);
        
        // 验证每个要删除的行
        for (const item of items) {
          const lineIndex = item.line - 1;
          if (lineIndex >= 0 && lineIndex < lines.length) {
            const line = lines[lineIndex].trim();
            
            // 验证行内容包含属性名
            if (line.includes(item.propertyName)) {
              console.log(`   ✅ 第${item.line}行确认: ${item.propertyName}`);
            } else {
              console.log(`   ⚠️ 第${item.line}行可能不匹配: 期望 ${item.propertyName}, 实际 "${line}"`);
            }
          } else {
            console.log(`   ❌ 第${item.line}行超出文件范围`);
          }
        }
        
      } catch (error) {
        console.log(`   ❌ 无法读取文件: ${error}`);
      }
    }
    
    console.log('\n✅ 试运行完成 - 请检查以上信息确认无误后执行实际清理');
  }

  /**
   * 执行实际清理
   */
  private async performCleanup(): Promise<void> {
    let totalDeleted = 0;
    let filesModified = 0;
    
    for (const [filePath, items] of Object.entries(this.report.deletionPlan)) {
      const fullPath = join(this.rootDir, filePath);
      
      try {
        // 创建备份
        const backupPath = fullPath + '.backup';
        copyFileSync(fullPath, backupPath);
        console.log(`💾 已创建备份: ${backupPath}`);
        
        // 读取文件内容
        const content = readFileSync(fullPath, 'utf-8');
        const lines = content.split('\n');
        
        // 按行号倒序删除（避免行号变化影响）
        const sortedItems = [...items].sort((a, b) => b.line - a.line);
        
        console.log(`\n📝 处理文件: ${filePath}`);
        
        for (const item of sortedItems) {
          const lineIndex = item.line - 1;
          
          if (lineIndex >= 0 && lineIndex < lines.length) {
            const originalLine = lines[lineIndex];
            
            // 验证行内容
            if (originalLine.includes(item.propertyName)) {
              // 删除该行
              lines.splice(lineIndex, 1);
              console.log(`   🗑️ 删除第${item.line}行: ${item.propertyName}`);
              
              // 记录日志
              this.cleanupLog.push(`- **${filePath}:${item.line}** - 删除 \`${item.property}\``);
              totalDeleted++;
              
            } else {
              console.log(`   ⚠️ 跳过第${item.line}行: 内容不匹配 "${originalLine.trim()}"`);
            }
          } else {
            console.log(`   ❌ 跳过第${item.line}行: 行号超出范围`);
          }
        }
        
        // 写入修改后的内容
        writeFileSync(fullPath, lines.join('\n'));
        filesModified++;
        console.log(`   ✅ 文件已更新`);
        
      } catch (error) {
        console.error(`   ❌ 处理文件失败 ${filePath}:`, error);
      }
    }
    
    console.log(`\n🎉 清理完成:`);
    console.log(`   - 修改文件数: ${filesModified}`);
    console.log(`   - 删除属性数: ${totalDeleted}`);
    console.log(`   - 备份文件已创建，如需回滚请查看 *.backup 文件`);
  }

  /**
   * 生成清理日志
   */
  private async generateLog(): Promise<void> {
    const now = new Date().toISOString();
    
    const logContent = `# 属性清理日志

**清理时间**: ${now}
**分析报告**: ${basename(this.reportFile)}
**项目路径**: ${this.report.metadata.projectPath}

## 清理摘要

- **原始属性数**: ${this.report.metadata.analyzedProperties}
- **删除属性数**: ${this.report.metadata.unusedProperties}  
- **涉及文件数**: ${Object.keys(this.report.deletionPlan).length}

## 删除详情

${this.cleanupLog.length > 0 ? this.cleanupLog.join('\n') : '*试运行模式，未执行实际删除*'}

## 涉及的文件

${Object.keys(this.report.deletionPlan).map(file => `- \`${file}\``).join('\n')}

## 回滚说明

如需回滚更改，请执行：

\`\`\`bash
# 恢复所有备份文件
find . -name "*.backup" -exec sh -c 'mv "$1" "\${1%.backup}"' _ {} \\;

# 删除备份文件
find . -name "*.backup" -delete
\`\`\`

---
*本日志由属性清理工具自动生成*
`;

    writeFileSync(this.logFile, logContent);
    console.log(`\n📋 清理日志已生成: ${this.logFile}`);
  }
}

// CLI 入口
async function main() {
  const args = process.argv.slice(2);
  const reportPath = args[0];
  const isDryRun = !args.includes('--execute');
  
  if (!reportPath) {
    console.log(`
🗑️ 属性清理工具

用法:
  bun run tools/property-cleanup-tool.ts <报告文件> [--execute]

参数:
  <报告文件>  分析报告的路径 (如: property-usage-analysis-nested.json)
  --execute   执行实际清理 (默认为试运行模式)

示例:
  # 试运行模式 (推荐先执行)
  bun run tools/property-cleanup-tool.ts property-usage-analysis-nested.json

  # 执行实际清理
  bun run tools/property-cleanup-tool.ts property-usage-analysis-nested.json --execute
`);
    process.exit(1);
  }

  try {
    const cleaner = new PropertyCleanupTool(reportPath);
    await cleaner.cleanup(isDryRun);
    
    if (isDryRun) {
      console.log('\n💡 如确认无误，请添加 --execute 参数执行实际清理');
    }
    
  } catch (error) {
    console.error('❌ 程序执行失败:', error);
    process.exit(1);
  }
}

// 执行主程序
if (typeof require !== 'undefined' && require.main === module) {
  main();
}

export default PropertyCleanupTool;