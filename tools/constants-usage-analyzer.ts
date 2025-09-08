#!/usr/bin/env bun

/**
 * 常量使用情况分析器
 * 🎯 识别未使用的常量字段，为清理提供数据支持
 * 
 * 功能：
 * 1. 扫描所有常量定义
 * 2. 检查项目中的使用情况
 * 3. 生成未使用常量报告
 * 4. 提供清理建议
 */

import { execSync } from 'child_process';
import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from 'fs';
import { join, relative, extname, dirname } from 'path';

interface ConstantDefinition {
  name: string;
  value: any;
  file: string;
  line: number;
  type: 'export' | 'const' | 'enum' | 'interface' | 'type';
  category: 'foundation' | 'semantic' | 'domain' | 'application';
  nested?: ConstantDefinition[];
}

interface UsageInfo {
  file: string;
  line: number;
  context: string;
  usage: 'import' | 'reference' | 'assignment';
}

interface AnalysisResult {
  constant: ConstantDefinition;
  usages: UsageInfo[];
  isUsed: boolean;
  usageCount: number;
  recommendation: 'keep' | 'remove' | 'merge' | 'review';
  reason: string;
}

class ConstantsUsageAnalyzer {
  private readonly rootDir: string;
  private readonly constantsDir: string;
  private readonly srcDir: string;
  private readonly testDir: string;
  private readonly outputFile: string;

  private constants: ConstantDefinition[] = [];
  private results: AnalysisResult[] = [];

  constructor() {
    this.rootDir = process.cwd();
    this.constantsDir = join(this.rootDir, 'src/common/constants');
    this.srcDir = join(this.rootDir, 'src');
    this.testDir = join(this.rootDir, 'test');
    this.outputFile = join(this.rootDir, 'constants-usage-analysis.json');
  }

  /**
   * 执行完整分析
   */
  async analyze(): Promise<void> {
    console.log('🔍 开始常量使用情况分析...');
    
    // 1. 扫描所有常量定义
    await this.scanConstantDefinitions();
    console.log(`📊 发现 ${this.constants.length} 个常量定义`);

    // 2. 分析使用情况
    await this.analyzeUsages();
    console.log(`📈 分析完成，共检查 ${this.results.length} 个常量`);

    // 3. 生成报告
    await this.generateReport();
    console.log(`📄 报告已生成: ${this.outputFile}`);

    // 4. 显示摘要
    this.displaySummary();
  }

  /**
   * 扫描常量定义
   */
  private async scanConstantDefinitions(): Promise<void> {
    const categories = ['foundation', 'semantic', 'domain', 'application'];
    
    for (const category of categories) {
      const categoryDir = join(this.constantsDir, category);
      if (existsSync(categoryDir)) {
        await this.scanDirectory(categoryDir, category as any);
      }
    }

    // 也扫描根目录的index.ts
    const indexFile = join(this.constantsDir, 'index.ts');
    if (existsSync(indexFile)) {
      await this.scanFile(indexFile, 'application');
    }
  }

  /**
   * 扫描目录
   */
  private async scanDirectory(dir: string, category: ConstantDefinition['category']): Promise<void> {
    const files = readdirSync(dir);
    
    for (const file of files) {
      const fullPath = join(dir, file);
      const stat = statSync(fullPath);
      
      if (stat.isDirectory()) {
        await this.scanDirectory(fullPath, category);
      } else if (extname(file) === '.ts' && !file.includes('.spec.') && !file.includes('.test.')) {
        await this.scanFile(fullPath, category);
      }
    }
  }

  /**
   * 扫描单个文件
   */
  private async scanFile(filePath: string, category: ConstantDefinition['category']): Promise<void> {
    try {
      const content = readFileSync(filePath, 'utf-8');
      const lines = content.split('\n');
      const relativePath = relative(this.rootDir, filePath);

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        const lineNumber = i + 1;

        // 匹配各种常量定义模式
        const patterns = [
          // export const CONSTANT = value
          /export\s+const\s+([A-Z_][A-Z0-9_]*)\s*[:=]/g,
          // export { CONSTANT }
          /export\s*{\s*([^}]+)\s*}/g,
          // const CONSTANT = value (在对象内部)
          /^\s*([A-Z_][A-Z0-9_]*)\s*[:=]/g,
          // enum定义
          /export\s+enum\s+([A-Z][A-Za-z0-9_]*)/g,
          // interface定义  
          /export\s+interface\s+([A-Z][A-Za-z0-9_]*)/g,
          // type定义
          /export\s+type\s+([A-Z][A-Za-z0-9_]*)/g,
        ];

        for (const pattern of patterns) {
          let match;
          while ((match = pattern.exec(line)) !== null) {
            const name = match[1];
            if (name && this.isValidConstantName(name)) {
              // 尝试提取值
              const value = this.extractConstantValue(line, lines, i);
              
              this.constants.push({
                name,
                value,
                file: relativePath,
                line: lineNumber,
                type: this.determineConstantType(line),
                category,
              });
            }
          }
        }

        // 处理export { } 中的多个导出
        const exportMatch = line.match(/export\s*{\s*([^}]+)\s*}/);
        if (exportMatch) {
          const exports = exportMatch[1].split(',').map(e => e.trim());
          for (const exp of exports) {
            const name = exp.replace(/\s+as\s+.+/, '').trim();
            if (this.isValidConstantName(name)) {
              this.constants.push({
                name,
                value: 'exported',
                file: relativePath,
                line: lineNumber,
                type: 'export',
                category,
              });
            }
          }
        }
      }
    } catch (error) {
      console.warn(`⚠️ 无法读取文件 ${filePath}: ${error}`);
    }
  }

  /**
   * 检查是否为有效的常量名
   */
  private isValidConstantName(name: string): boolean {
    // 过滤掉一些明显不是常量的名称
    const excludePatterns = [
      /^(import|export|from|as|default|if|else|for|while|function|class|interface|type|enum)$/i,
      /^[a-z]/, // 小写开头的一般不是常量
      /^\d/, // 数字开头
    ];

    return !excludePatterns.some(pattern => pattern.test(name)) && name.length > 1;
  }

  /**
   * 确定常量类型
   */
  private determineConstantType(line: string): ConstantDefinition['type'] {
    if (line.includes('export const')) return 'const';
    if (line.includes('export enum')) return 'enum';
    if (line.includes('export interface')) return 'interface';
    if (line.includes('export type')) return 'type';
    if (line.includes('export {')) return 'export';
    return 'const';
  }

  /**
   * 提取常量值
   */
  private extractConstantValue(line: string, lines: string[], startIndex: number): any {
    try {
      // 简单的值提取逻辑
      const equalIndex = line.indexOf('=');
      if (equalIndex === -1) return undefined;

      let value = line.substring(equalIndex + 1).trim();
      
      // 移除注释
      value = value.replace(/\/\/.*$/, '').replace(/\/\*.*?\*\//, '').trim();
      
      // 移除分号
      value = value.replace(/;$/, '');

      // 处理多行对象/数组
      if ((value.includes('{') && !value.includes('}')) || 
          (value.includes('[') && !value.includes(']'))) {
        let fullValue = value;
        let bracketCount = (value.match(/{/g) || []).length - (value.match(/}/g) || []).length;
        let i = startIndex + 1;
        
        while (bracketCount > 0 && i < lines.length) {
          const nextLine = lines[i].trim();
          fullValue += '\n' + nextLine;
          bracketCount += (nextLine.match(/{/g) || []).length - (nextLine.match(/}/g) || []).length;
          i++;
        }
        value = fullValue;
      }

      return value;
    } catch (error) {
      return undefined;
    }
  }

  /**
   * 分析使用情况
   */
  private async analyzeUsages(): Promise<void> {
    for (const constant of this.constants) {
      const usages = await this.findConstantUsages(constant.name);
      const isUsed = usages.length > 0;
      
      this.results.push({
        constant,
        usages,
        isUsed,
        usageCount: usages.length,
        recommendation: this.getRecommendation(constant, usages),
        reason: this.getRecommendationReason(constant, usages),
      });
    }
  }

  /**
   * 查找常量使用情况
   */
  private async findConstantUsages(constantName: string): Promise<UsageInfo[]> {
    const usages: UsageInfo[] = [];

    try {
      // 使用ripgrep搜索使用情况，排除常量定义文件
      const command = `rg --type ts --type tsx --type js --type jsx -n "${constantName}" "${this.srcDir}" "${this.testDir}" --exclude-dir node_modules`;
      
      const output = execSync(command, { 
        encoding: 'utf-8',
        cwd: this.rootDir 
      }).toString();

      const lines = output.split('\n').filter(line => line.trim());
      
      for (const line of lines) {
        const match = line.match(/^([^:]+):(\d+):(.+)$/);
        if (!match) continue;

        const [, file, lineNumber, context] = match;
        const relativePath = relative(this.rootDir, file);
        
        // 跳过常量定义文件中的定义行
        if (relativePath.includes('src/common/constants/') && 
            (context.includes(`const ${constantName}`) || 
             context.includes(`export ${constantName}`) ||
             context.includes(`${constantName}:`))) {
          continue;
        }

        // 确定使用类型
        let usage: UsageInfo['usage'] = 'reference';
        if (context.includes('import') && context.includes(constantName)) {
          usage = 'import';
        } else if (context.includes(`${constantName} =`)) {
          usage = 'assignment';
        }

        usages.push({
          file: relativePath,
          line: parseInt(lineNumber),
          context: context.trim(),
          usage,
        });
      }
    } catch (error: any) {
      // ripgrep未找到结果时会抛出错误，这是正常的
      if (error.status !== 1) {
        console.warn(`⚠️ 搜索常量 ${constantName} 时出错:`, error.message);
      }
    }

    return usages;
  }

  /**
   * 获取推荐操作
   */
  private getRecommendation(constant: ConstantDefinition, usages: UsageInfo[]): AnalysisResult['recommendation'] {
    const usageCount = usages.length;
    
    if (usageCount === 0) {
      return 'remove';
    }
    
    if (usageCount === 1 && usages[0].usage === 'import') {
      return 'review';
    }
    
    if (usageCount < 3 && constant.category === 'application') {
      return 'merge';
    }
    
    return 'keep';
  }

  /**
   * 获取推荐理由
   */
  private getRecommendationReason(constant: ConstantDefinition, usages: UsageInfo[]): string {
    const usageCount = usages.length;
    
    if (usageCount === 0) {
      return '未在项目中找到使用，可以安全移除';
    }
    
    if (usageCount === 1 && usages[0].usage === 'import') {
      return '仅被导入但未实际使用，建议检查是否为无效导入';
    }
    
    if (usageCount < 3 && constant.category === 'application') {
      return '使用频率低，考虑与其他常量合并';
    }
    
    if (usageCount >= 10) {
      return `使用频率高(${usageCount}次)，应保留`;
    }
    
    return `正常使用(${usageCount}次)，建议保留`;
  }

  /**
   * 生成报告
   */
  private async generateReport(): Promise<void> {
    const report = {
      metadata: {
        generatedAt: new Date().toISOString(),
        totalConstants: this.constants.length,
        analyzedConstants: this.results.length,
        projectPath: this.rootDir,
      },
      summary: {
        unused: this.results.filter(r => r.recommendation === 'remove').length,
        lowUsage: this.results.filter(r => r.recommendation === 'merge').length,
        needReview: this.results.filter(r => r.recommendation === 'review').length,
        shouldKeep: this.results.filter(r => r.recommendation === 'keep').length,
      },
      byCategory: {
        foundation: this.results.filter(r => r.constant.category === 'foundation'),
        semantic: this.results.filter(r => r.constant.category === 'semantic'),
        domain: this.results.filter(r => r.constant.category === 'domain'),
        application: this.results.filter(r => r.constant.category === 'application'),
      },
      recommendations: {
        toRemove: this.results.filter(r => r.recommendation === 'remove'),
        toMerge: this.results.filter(r => r.recommendation === 'merge'),
        toReview: this.results.filter(r => r.recommendation === 'review'),
      },
      detailedResults: this.results,
    };

    writeFileSync(this.outputFile, JSON.stringify(report, null, 2));

    // 也生成一个人类可读的文本报告
    const textReport = this.generateTextReport(report);
    writeFileSync(this.outputFile.replace('.json', '.txt'), textReport);
  }

  /**
   * 生成文本报告
   */
  private generateTextReport(report: any): string {
    const { summary, recommendations, byCategory } = report;
    
    // 安全计算百分比的辅助函数
    const calculatePercentage = (part: number, total: number): string => {
      if (total === 0) return '0.0';
      return (part / total * 100).toFixed(1);
    };
    
    // 安全计算使用率的辅助函数
    const calculateUsageRate = (categoryResults: any[]): string => {
      if (categoryResults.length === 0) return '0.0';
      const unusedCount = categoryResults.filter((r: any) => r.recommendation === 'remove').length;
      return (100 - (unusedCount / categoryResults.length * 100)).toFixed(1);
    };

    return `# 常量使用情况分析报告

生成时间: ${report.metadata.generatedAt}
项目路径: ${report.metadata.projectPath}

## 📊 分析摘要

- **总常量数量**: ${report.metadata.totalConstants}
- **已分析**: ${report.metadata.analyzedConstants}
- **未使用**: ${summary.unused} (${calculatePercentage(summary.unused, report.metadata.analyzedConstants)}%)
- **使用频率低**: ${summary.lowUsage}
- **需要审核**: ${summary.needReview}
- **建议保留**: ${summary.shouldKeep}

## 🗑️ 建议移除的常量 (${summary.unused}个)

${recommendations.toRemove.map((r: any) => `
### ${r.constant.name}
- **文件**: \`${r.constant.file}\`
- **行号**: ${r.constant.line}
- **类型**: ${r.constant.type}
- **分类**: ${r.constant.category}
- **理由**: ${r.reason}
`).join('\n') || '无'}

## 🔍 需要审核的常量 (${summary.needReview}个)

${recommendations.toReview.map((r: any) => `
### ${r.constant.name}
- **文件**: \`${r.constant.file}\`
- **使用次数**: ${r.usageCount}
- **理由**: ${r.reason}
- **使用情况**:
${r.usages.map((u: any) => `  - ${u.file}:${u.line} (${u.usage})`).join('\n')}
`).join('\n') || '无'}

## 🔄 建议合并的常量 (${summary.lowUsage}个)

${recommendations.toMerge.map((r: any) => `
### ${r.constant.name}
- **文件**: \`${r.constant.file}\`
- **使用次数**: ${r.usageCount}
- **理由**: ${r.reason}
`).join('\n') || '无'}

## 📈 按分类统计

| 分类 | 总数 | 未使用 | 使用率 |
|------|------|--------|--------|
| Foundation | ${byCategory.foundation.length} | ${byCategory.foundation.filter((r: any) => r.recommendation === 'remove').length} | ${calculateUsageRate(byCategory.foundation)}% |
| Semantic | ${byCategory.semantic.length} | ${byCategory.semantic.filter((r: any) => r.recommendation === 'remove').length} | ${calculateUsageRate(byCategory.semantic)}% |
| Domain | ${byCategory.domain.length} | ${byCategory.domain.filter((r: any) => r.recommendation === 'remove').length} | ${calculateUsageRate(byCategory.domain)}% |
| Application | ${byCategory.application.length} | ${byCategory.application.filter((r: any) => r.recommendation === 'remove').length} | ${calculateUsageRate(byCategory.application)}% |

## 🛠️ 清理建议

### 立即可以移除
\`\`\`bash
# 移除未使用的常量定义
${recommendations.toRemove.map((r: any) => `# ${r.constant.file}:${r.constant.line} - ${r.constant.name}`).join('\n') || '# 暂无'}
\`\`\`

### 需要手动审核
1. 检查仅被导入但未使用的常量
2. 考虑将低频使用的常量合并
3. 验证某些常量是否为预留的接口定义

### 自动化清理脚本
可以运行以下命令生成自动清理脚本：
\`\`\`bash
bun run constants-usage-analyzer --generate-cleanup-script
\`\`\`
`;
  }

  /**
   * 显示摘要信息
   */
  private displaySummary(): void {
    const summary = {
      total: this.results.length,
      unused: this.results.filter(r => r.recommendation === 'remove').length,
      lowUsage: this.results.filter(r => r.recommendation === 'merge').length,
      needReview: this.results.filter(r => r.recommendation === 'review').length,
      shouldKeep: this.results.filter(r => r.recommendation === 'keep').length,
    };

    console.log('\n📊 分析结果摘要:');
    console.log(`   总计: ${summary.total} 个常量`);
    console.log(`   🗑️  未使用: ${summary.unused} 个 (${(summary.unused/summary.total*100).toFixed(1)}%)`);
    console.log(`   🔄 使用频率低: ${summary.lowUsage} 个`);
    console.log(`   🔍 需要审核: ${summary.needReview} 个`);
    console.log(`   ✅ 建议保留: ${summary.shouldKeep} 个`);
    
    if (summary.unused > 0) {
      console.log(`\n💡 发现 ${summary.unused} 个未使用的常量可以清理`);
      console.log(`   清理后可以减少 ${Math.round(summary.unused/summary.total*100)}% 的常量定义`);
    }

    console.log(`\n📄 详细报告已生成:`);
    console.log(`   - JSON: ${this.outputFile}`);
    console.log(`   - Text: ${this.outputFile.replace('.json', '.txt')}`);
  }
}

// 执行分析
if (typeof require !== 'undefined' && require.main === module) {
  const analyzer = new ConstantsUsageAnalyzer();
  analyzer.analyze().catch(error => {
    console.error('❌ 分析失败:', error);
    process.exit(1);
  });
}

export default ConstantsUsageAnalyzer;