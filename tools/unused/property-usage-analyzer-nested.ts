#!/usr/bin/env bun

/**
 * 嵌套属性使用情况分析器
 * 🎯 正确处理嵌套对象属性的使用情况分析
 * 修复：PARENT.NESTED.PROPERTY 的识别问题
 */

import { execSync } from 'child_process';
import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from 'fs';
import { join, relative, extname } from 'path';

interface PropertyDefinition {
  propertyName: string;
  parentObject: string;
  nestedPath: string; // 完整的嵌套路径，如 "CONCURRENCY.DEFAULT_WORKERS"
  value: string;
  file: string;
  line: number;
  fullPath: string; // 如 "CORE_LIMITS.CONCURRENCY.DEFAULT_WORKERS"
}

interface PropertyUsage {
  file: string;
  line: number;
  context: string;
  usageType: 'direct' | 'destructuring';
}

interface PropertyAnalysisResult {
  property: PropertyDefinition;
  usages: PropertyUsage[];
  isUsed: boolean;
  usageCount: number;
  recommendation: 'keep' | 'remove' | 'review';
  reason: string;
}

class NestedPropertyUsageAnalyzer {
  private readonly rootDir: string;
  private readonly constantsDir: string;
  private readonly srcDir: string;
  private readonly testDir: string;
  private readonly outputFile: string;

  private properties: PropertyDefinition[] = [];
  private results: PropertyAnalysisResult[] = [];
  private allCodeContent: string = '';

  constructor() {
    this.rootDir = process.cwd();
    this.constantsDir = join(this.rootDir, 'src/providers/constants');
    this.srcDir = join(this.rootDir, 'src');
    this.testDir = join(this.rootDir, 'test');
    this.outputFile = join(this.rootDir, 'property-usage-analysis-nested.json');
  }

  /**
   * 执行分析
   */
  async analyze(maxProperties: number = 20000): Promise<void> {
    console.log('🚀 开始嵌套属性分析...');
    const startTime = Date.now();
    
    // 1. 加载所有代码内容
    console.log('📖 读取所有代码文件...');
    await this.loadAllCodeContent();
    
    // 2. 扫描嵌套属性定义
    console.log('🔍 扫描嵌套属性定义...');
    await this.scanNestedPropertyDefinitions();
    console.log(`📊 发现 ${this.properties.length} 个属性定义`);

    // 3. 分析属性使用情况
    const sampleProperties = this.properties.slice(0, maxProperties);
    console.log(`⚡ 分析 ${sampleProperties.length} 个属性...`);
    
    await this.batchAnalyzeNestedUsages(sampleProperties);

    // 4. 生成报告
    await this.generateReport();
    
    const endTime = Date.now();
    console.log(`⚡ 分析完成，耗时 ${((endTime - startTime) / 1000).toFixed(2)}s`);
    this.displaySummary();
  }

  /**
   * 加载所有代码内容
   */
  private async loadAllCodeContent(): Promise<void> {
    const allFiles: string[] = [];
    
    await this.collectTSFiles(this.srcDir, allFiles);
    await this.collectTSFiles(this.testDir, allFiles);
    
    const contents: string[] = [];
    for (const file of allFiles) {
      try {
        const content = readFileSync(file, 'utf-8');
        const relativePath = relative(this.rootDir, file);
        const lines = content.split('\n').map((line, index) => 
          `${relativePath}:${index + 1}:${line}`
        );
        contents.push(lines.join('\n'));
      } catch (error) {
        // 忽略读取错误
      }
    }
    
    this.allCodeContent = contents.join('\n');
    console.log(`📚 已加载 ${allFiles.length} 个文件，共 ${this.allCodeContent.length} 字符`);
  }

  private async collectTSFiles(dir: string, files: string[]): Promise<void> {
    if (!existsSync(dir)) return;
    
    const items = readdirSync(dir);
    for (const item of items) {
      const fullPath = join(dir, item);
      const stat = statSync(fullPath);
      
      if (stat.isDirectory()) {
        await this.collectTSFiles(fullPath, files);
      } else if (extname(item) === '.ts' && !item.includes('.spec.') && !item.includes('.test.')) {
        files.push(fullPath);
      }
    }
  }

  /**
   * 扫描嵌套属性定义 - 改进版
   */
  private async scanNestedPropertyDefinitions(): Promise<void> {
    const categories = ['foundation', 'semantic', 'domain', 'application', '/', 'config', 'messages', 'status', 'operations'];
    
    for (const category of categories) {
      const categoryDir = join(this.constantsDir, category);
      if (existsSync(categoryDir)) {
        await this.scanDirectory(categoryDir);
      }
    }
  }

  private async scanDirectory(dir: string): Promise<void> {
    const files = readdirSync(dir);
    
    for (const file of files) {
      const fullPath = join(dir, file);
      const stat = statSync(fullPath);
      
      if (stat.isDirectory()) {
        await this.scanDirectory(fullPath);
      } else if (extname(file) === '.ts' && !file.includes('.spec.') && !file.includes('.test.')) {
        await this.scanFileWithNesting(fullPath);
      }
    }
  }

  /**
   * 扫描文件中的嵌套属性 - 支持多层嵌套
   */
  private async scanFileWithNesting(filePath: string): Promise<void> {
    try {
      const content = readFileSync(filePath, 'utf-8');
      const lines = content.split('\n');
      const relativePath = relative(this.rootDir, filePath);

      let currentObject = '';
      let nestedPath: string[] = [];
      let bracketStack: number[] = [];
      let inObjectDefinition = false;

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmedLine = line.trim();
        const lineNumber = i + 1;
        const indentLevel = line.length - line.trimLeft().length;

        // 检测顶级对象定义
        const objectMatch = trimmedLine.match(/export\s+const\s+([A-Z_][A-Z0-9_]*)\s*=\s*(?:Object\.freeze\s*\()?\s*\{/);
        if (objectMatch) {
          currentObject = objectMatch[1];
          nestedPath = [];
          bracketStack = [0];
          inObjectDefinition = true;
          continue;
        }

        if (inObjectDefinition && currentObject) {
          const openBrackets = (line.match(/\{/g) || []).length;
          const closeBrackets = (line.match(/\}/g) || []).length;
          
          // 检测嵌套对象开始
          const nestedObjectMatch = trimmedLine.match(/([A-Z_][A-Z0-9_]*)\s*:\s*\{/);
          if (nestedObjectMatch && openBrackets > 0) {
            const nestedObjectName = nestedObjectMatch[1];
            nestedPath.push(nestedObjectName);
            bracketStack.push(bracketStack[bracketStack.length - 1] + openBrackets - closeBrackets);
            continue;
          }

          // 检测属性定义
          const propertyMatch = trimmedLine.match(/([A-Z_][A-Z0-9_]*)\s*:\s*([^,}]+)/);
          if (propertyMatch && !trimmedLine.includes('{')) {
            const propertyName = propertyMatch[1];
            let value = propertyMatch[2].trim();
            
            // 清理值
            value = value.replace(/,\s*$/, '');
            value = value.replace(/\/\/.*$/, '');
            value = value.trim();

            // 构建完整路径
            const fullNestedPath = nestedPath.length > 0 ? nestedPath.join('.') + '.' + propertyName : propertyName;
            const fullPath = `${currentObject}.${fullNestedPath}`;

            this.properties.push({
              propertyName,
              parentObject: currentObject,
              nestedPath: fullNestedPath,
              value: value.length > 50 ? value.substring(0, 50) + '...' : value,
              file: relativePath,
              line: lineNumber,
              fullPath,
            });
          }

          // 处理括号闭合
          if (closeBrackets > 0) {
            let currentLevel = bracketStack[bracketStack.length - 1];
            currentLevel -= closeBrackets;
            
            if (currentLevel <= 0) {
              // 退出当前嵌套层级
              bracketStack.pop();
              if (nestedPath.length > 0) {
                nestedPath.pop();
              }
              
              // 如果回到顶级，结束对象定义
              if (bracketStack.length === 0) {
                inObjectDefinition = false;
                currentObject = '';
                nestedPath = [];
              }
            } else {
              bracketStack[bracketStack.length - 1] = currentLevel;
            }
          }
        }
      }
    } catch (error) {
      console.warn(`⚠️ 无法读取文件 ${filePath}: ${error}`);
    }
  }

  /**
   * 批量分析嵌套属性使用情况
   */
  private async batchAnalyzeNestedUsages(properties: PropertyDefinition[]): Promise<void> {
    let processed = 0;
    const total = properties.length;

    for (const property of properties) {
      const usages = await this.findNestedPropertyUsages(property);
      const isUsed = usages.length > 0;
      
      this.results.push({
        property,
        usages,
        isUsed,
        usageCount: usages.length,
        recommendation: this.getRecommendation(property, usages),
        reason: this.getRecommendationReason(property, usages),
      });

      processed++;
      if (processed % 20 === 0) {
        console.log(`⚡ 已分析 ${processed}/${total} 个属性`);
      }
    }
  }

  /**
   * 查找嵌套属性的使用情况 - 改进版
   */
  private async findNestedPropertyUsages(property: PropertyDefinition): Promise<PropertyUsage[]> {
    const usages: PropertyUsage[] = [];
    const { propertyName, parentObject, nestedPath } = property;
    
    // 构建所有可能的搜索模式
    const searchPatterns: string[] = [];
    
    // 1. 完整嵌套路径使用：PARENT.NESTED.PROPERTY
    searchPatterns.push(`${parentObject}\\.${nestedPath.replace(/\./g, '\\.')}`);
    
    // 2. 如果是二级嵌套，也搜索简化版本：NESTED.PROPERTY
    if (nestedPath.includes('.')) {
      searchPatterns.push(nestedPath.replace(/\./g, '\\.'));
    }
    
    // 3. 解构使用模式
    searchPatterns.push(`{[^}]*${propertyName}[^}]*}`);

    for (const pattern of searchPatterns) {
      try {
        const regex = new RegExp(`^([^:]+:[^:]+:.*${pattern}.*)$`, 'gm');
        const matches = this.allCodeContent.match(regex) || [];
        
        for (const match of matches) {
          const lineMatch = match.match(/^([^:]+):(\d+):(.+)$/);
          if (!lineMatch) continue;
          
          const [, file, lineNumber, context] = lineMatch;
          
          // 跳过定义文件中的定义行
          if (this.shouldSkipAsDefinition(file, context, property)) {
            continue;
          }

          // 避免重复添加
          const existingUsage = usages.find(u => 
            u.file === file && u.line === parseInt(lineNumber) && u.context === context.trim()
          );
          
          if (!existingUsage) {
            usages.push({
              file,
              line: parseInt(lineNumber),
              context: context.trim(),
              usageType: context.includes('{') && context.includes('}') ? 'destructuring' : 'direct',
            });
          }
        }
      } catch (error) {
        console.warn(`⚠️ 搜索模式错误: ${pattern}`, error);
      }
    }
    
    return usages;
  }

  /**
   * 判断是否应该跳过为定义行
   */
  private shouldSkipAsDefinition(filePath: string, context: string, property: PropertyDefinition): boolean {
    const trimmedContext = context.trim();
    
    // 跳过定义文件中的属性定义行
    if (filePath === property.file) {
      return trimmedContext.includes(`${property.propertyName}:`) || 
             trimmedContext.includes(`export const ${property.parentObject}`);
    }
    
    // 跳过其他常量文件中的重新定义
    if (filePath.includes('src/common/constants/')) {
      return trimmedContext.includes(`${property.propertyName}:`);
    }
    
    return false;
  }

  private getRecommendation(property: PropertyDefinition, usages: PropertyUsage[]): PropertyAnalysisResult['recommendation'] {
    const usageCount = usages.length;
    
    if (usageCount === 0) {
      return 'remove';
    }
    
    if (usageCount === 1) {
      return 'review';
    }
    
    return 'keep';
  }

  private getRecommendationReason(property: PropertyDefinition, usages: PropertyUsage[]): string {
    const usageCount = usages.length;
    
    if (usageCount === 0) {
      return `属性 ${property.fullPath} 未被使用，可以移除`;
    }
    
    if (usageCount === 1) {
      return `属性 ${property.fullPath} 仅被使用1次，建议检查是否必要`;
    }
    
    if (usageCount >= 3) {
      return `属性 ${property.fullPath} 使用频率高(${usageCount}次)，应保留`;
    }
    
    return `属性 ${property.fullPath} 正常使用(${usageCount}次)，建议保留`;
  }

  /**
   * 生成报告
   */
  private async generateReport(): Promise<void> {
    const unusedResults = this.results.filter(r => r.recommendation === 'remove');
    
    const report = {
      metadata: {
        generatedAt: new Date().toISOString(),
        totalProperties: this.properties.length,
        analyzedProperties: this.results.length,
        unusedProperties: unusedResults.length,
        projectPath: this.rootDir,
        version: 'nested-fix-1.0',
      },
      summary: {
        unused: this.results.filter(r => r.recommendation === 'remove').length,
        needReview: this.results.filter(r => r.recommendation === 'review').length,
        shouldKeep: this.results.filter(r => r.recommendation === 'keep').length,
      },
      unusedProperties: unusedResults,
      deletionPlan: this.generateDeletionPlan(unusedResults),
    };

    writeFileSync(this.outputFile, JSON.stringify(report, null, 2));
    console.log(`📄 报告已生成: ${this.outputFile}`);
  }

  private generateDeletionPlan(unusedResults: PropertyAnalysisResult[]): any {
    const plan: any = {};
    
    unusedResults.forEach(result => {
      const file = result.property.file;
      if (!plan[file]) {
        plan[file] = [];
      }
      plan[file].push({
        line: result.property.line,
        property: result.property.fullPath,
        propertyName: result.property.propertyName,
        parentObject: result.property.parentObject,
        nestedPath: result.property.nestedPath,
        value: result.property.value,
      });
    });

    for (const file in plan) {
      plan[file].sort((a: any, b: any) => a.line - b.line);
    }

    return plan;
  }

  /**
   * 显示摘要信息
   */
  private displaySummary(): void {
    const summary = {
      total: this.results.length,
      unused: this.results.filter(r => r.recommendation === 'remove').length,
      needReview: this.results.filter(r => r.recommendation === 'review').length,
      shouldKeep: this.results.filter(r => r.recommendation === 'keep').length,
    };

    console.log('\n📊 嵌套属性分析结果摘要:');
    console.log(`   总计: ${summary.total} 个属性`);
    console.log(`   🗑️  未使用: ${summary.unused} 个`);
    console.log(`   🔍 需要审核: ${summary.needReview} 个`);
    console.log(`   ✅ 建议保留: ${summary.shouldKeep} 个`);
    
    if (summary.unused > 0) {
      console.log(`\n🗑️ 未使用可删除的属性列表:`);
      const unusedProperties = this.results.filter(r => r.recommendation === 'remove');
      
      const groupedByFile = new Map<string, PropertyDefinition[]>();
      unusedProperties.forEach(result => {
        const file = result.property.file;
        if (!groupedByFile.has(file)) {
          groupedByFile.set(file, []);
        }
        groupedByFile.get(file)!.push(result.property);
      });

      for (const [file, properties] of groupedByFile) {
        console.log(`\n📁 ${file}:`);
        properties.forEach(prop => {
          console.log(`   ❌ 第${prop.line}行: ${prop.fullPath} (嵌套路径: ${prop.nestedPath})`);
        });
      }
      
      console.log(`\n💾 完整报告: ${this.outputFile}`);
    } else {
      console.log(`\n✅ 所有分析的属性都在使用中！`);
    }

    // 显示一些正确识别的使用情况示例
    const usedProperties = this.results.filter(r => r.usageCount > 0).slice(0, 3);
    if (usedProperties.length > 0) {
      console.log(`\n✅ 正确识别使用情况的示例:`);
      usedProperties.forEach(result => {
        console.log(`   ✓ ${result.property.fullPath}: ${result.usageCount} 次使用`);
        result.usages.slice(0, 2).forEach(usage => {
          console.log(`      └─ ${usage.file}:${usage.line} (${usage.usageType})`);
        });
      });
    }
  }
}

// 执行分析
if (typeof require !== 'undefined' && require.main === module) {
  const maxProperties = process.argv[2] ? parseInt(process.argv[2]) : 20000;
  const analyzer = new NestedPropertyUsageAnalyzer();
  analyzer.analyze(maxProperties).catch(error => {
    console.error('❌ 分析失败:', error);
    process.exit(1);
  });
}

export default NestedPropertyUsageAnalyzer;