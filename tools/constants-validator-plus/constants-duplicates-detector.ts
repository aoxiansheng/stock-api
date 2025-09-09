#!/usr/bin/env bun

/**
 * 常量重复检测工具
 * 功能：
 * 1. 扫描所有常量文件，检测值相同但变量名不同的重复定义
 * 2. 生成重复常量分析报告
 * 重复类型：
 * - 直接重复：两个变量赋相同的值 (a = 1000, b = 1000)
 * - 引用重复：一个变量引用另一个变量 (a = 1000, b = a)
 * - 嵌套重复：对象内部的属性值重复
 */

import fs from 'fs';
import path from 'path';
import ts from 'typescript';

// 重复类型枚举
enum DuplicateType {
  DIRECT = 'direct',           // 直接重复：两个变量有相同的值
  REFERENCE = 'reference',     // 引用重复：一个变量引用另一个变量
  NESTED = 'nested',          // 嵌套重复：对象内部属性值重复
}

// 常量定义接口
interface ConstantDefinition {
  name: string;                // 变量名
  value: any;                  // 变量值
  filePath: string;           // 文件路径
  lineNumber: number;         // 行号
  path: string;               // 在对象中的完整路径，如 'CORE_VALUES.TIME_MS.ONE_SECOND'
  rawText: string;            // 原始文本
  type: 'primitive' | 'object' | 'reference'; // 值类型
}

// 重复项接口
interface DuplicateGroup {
  value: any;                 // 重复的值
  type: DuplicateType;       // 重复类型
  occurrences: ConstantDefinition[]; // 出现的位置列表
  count: number;             // 重复次数
  severity: 'low' | 'medium' | 'high'; // 严重程度
}

// 检测报告接口
interface DuplicationReport {
  summary: {
    totalFiles: number;
    totalConstants: number;
    duplicateGroups: number;
    totalDuplicates: number;
    byType: Record<DuplicateType, number>;
    bySeverity: Record<'low' | 'medium' | 'high', number>;
  };
  duplicateGroups: DuplicateGroup[];
  scanInfo: {
    scannedDirectories: string[];
    scanTime: string;
    excludedFiles: string[];
  };
}

export class ConstantsDuplicatesDetector {
  constructor() {
    // 简化构造函数，不需要复杂的 TypeScript 程序创建
  }

  /**
   * 主要检测方法
   */
  async detectDuplicates(
    constantsDir: string = 'src/common/constants',
    options: {
      excludePatterns?: string[];
      includeExtensions?: string[];
      maxDepth?: number;
    } = {}
  ): Promise<DuplicationReport> {
    const startTime = new Date();
    
    const {
      excludePatterns = ['node_modules', '*.spec.ts', '*.test.ts'],
      includeExtensions = ['.ts'],
      maxDepth = 10
    } = options;

    // 1. 扫描所有常量文件
    const constantsFiles = this.findConstantsFiles(constantsDir, includeExtensions, excludePatterns, maxDepth);
    console.log(`🔍 找到 ${constantsFiles.length} 个常量文件`);

    // 2. 解析所有常量定义
    const allConstants: ConstantDefinition[] = [];
    for (const filePath of constantsFiles) {
      try {
        const constants = await this.parseConstantsFromFile(filePath);
        allConstants.push(...constants);
      } catch (error) {
        console.warn(`⚠️  解析文件失败 ${filePath}: ${error.message}`);
      }
    }

    console.log(`📊 解析到 ${allConstants.length} 个常量定义`);

    // 3. 检测重复项
    const duplicateGroups = this.findDuplicateGroups(allConstants);
    
    // 4. 生成报告
    const report: DuplicationReport = {
      summary: this.generateSummary(constantsFiles, allConstants, duplicateGroups),
      duplicateGroups: duplicateGroups.sort((a, b) => b.count - a.count), // 按重复次数排序
      scanInfo: {
        scannedDirectories: [constantsDir],
        scanTime: new Date().toISOString(),
        excludedFiles: []
      }
    };

    console.log(`✅ 检测完成，用时 ${Date.now() - startTime.getTime()}ms`);
    return report;
  }

  /**
   * 递归查找常量文件
   */
  private findConstantsFiles(
    dir: string, 
    includeExtensions: string[], 
    excludePatterns: string[],
    maxDepth: number,
    currentDepth = 0
  ): string[] {
    if (currentDepth >= maxDepth || !fs.existsSync(dir)) {
      return [];
    }

    const files: string[] = [];
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      
      // 检查是否应该排除
      if (this.shouldExclude(fullPath, excludePatterns)) {
        continue;
      }

      if (entry.isDirectory()) {
        // 递归扫描子目录
        files.push(...this.findConstantsFiles(fullPath, includeExtensions, excludePatterns, maxDepth, currentDepth + 1));
      } else if (entry.isFile()) {
        // 检查文件扩展名
        const ext = path.extname(entry.name);
        if (includeExtensions.includes(ext)) {
          files.push(fullPath);
        }
      }
    }

    return files;
  }

  /**
   * 检查是否应该排除文件/目录
   */
  private shouldExclude(filePath: string, excludePatterns: string[]): boolean {
    return excludePatterns.some(pattern => {
      if (pattern.includes('*')) {
        // 简单的通配符匹配
        const regex = new RegExp(pattern.replace(/\*/g, '.*'));
        return regex.test(filePath);
      }
      return filePath.includes(pattern);
    });
  }

  /**
   * 从单个文件解析常量定义
   */
  private async parseConstantsFromFile(filePath: string): Promise<ConstantDefinition[]> {
    const fileContent = await fs.promises.readFile(filePath, 'utf-8');
    const sourceFile = ts.createSourceFile(
      filePath,
      fileContent,
      ts.ScriptTarget.Latest,
      true
    );

    const constants: ConstantDefinition[] = [];
    
    // 遍历 AST 节点
    const visit = (node: ts.Node, parentPath: string = '') => {
      if (ts.isVariableStatement(node)) {
        // 处理变量声明 (export const XXX = ...)
        this.processVariableStatement(node, constants, filePath, parentPath);
      } else if (ts.isModuleDeclaration(node)) {
        // 处理命名空间声明 (export namespace XXX { ... })
        this.processModuleDeclaration(node, constants, filePath, parentPath);
      }
      
      ts.forEachChild(node, child => visit(child, parentPath));
    };

    visit(sourceFile);
    return constants;
  }

  /**
   * 处理变量声明语句
   */
  private processVariableStatement(
    node: ts.VariableStatement,
    constants: ConstantDefinition[],
    filePath: string,
    parentPath: string
  ) {
    for (const declaration of node.declarationList.declarations) {
      if (ts.isIdentifier(declaration.name) && declaration.initializer) {
        const name = declaration.name.text;
        const fullPath = parentPath ? `${parentPath}.${name}` : name;
        
        // 递归解析初始化器中的常量
        this.extractConstantsFromInitializer(
          declaration.initializer,
          fullPath,
          constants,
          filePath
        );
      }
    }
  }

  /**
   * 处理模块/命名空间声明
   */
  private processModuleDeclaration(
    node: ts.ModuleDeclaration,
    constants: ConstantDefinition[],
    filePath: string,
    parentPath: string
  ) {
    if (ts.isIdentifier(node.name) && node.body && ts.isModuleBlock(node.body)) {
      const name = node.name.text;
      const fullPath = parentPath ? `${parentPath}.${name}` : name;
      
      // 递归处理模块体
      for (const statement of node.body.statements) {
        if (ts.isVariableStatement(statement)) {
          this.processVariableStatement(statement, constants, filePath, fullPath);
        }
      }
    }
  }

  /**
   * 从初始化器中提取常量
   */
  private extractConstantsFromInitializer(
    node: ts.Expression,
    basePath: string,
    constants: ConstantDefinition[],
    filePath: string
  ) {
    const sourceFile = node.getSourceFile();
    const lineNumber = sourceFile.getLineAndCharacterOfPosition(node.pos).line + 1;

    if (ts.isStringLiteral(node) || ts.isNumericLiteral(node) || 
        node.kind === ts.SyntaxKind.TrueKeyword || node.kind === ts.SyntaxKind.FalseKeyword) {
      // 基础类型常量
      constants.push({
        name: basePath.split('.').pop() || basePath,
        value: this.getNodeValue(node),
        filePath,
        lineNumber,
        path: basePath,
        rawText: node.getText(sourceFile),
        type: 'primitive'
      });
    } else if (ts.isObjectLiteralExpression(node)) {
      // 对象字面量
      this.extractConstantsFromObjectLiteral(node, basePath, constants, filePath);
    } else if (ts.isCallExpression(node) && 
               ts.isPropertyAccessExpression(node.expression) &&
               ts.isIdentifier(node.expression.name) &&
               node.expression.name.text === 'freeze') {
      // Object.freeze() 调用
      if (node.arguments.length > 0) {
        this.extractConstantsFromInitializer(node.arguments[0], basePath, constants, filePath);
      }
    } else if (ts.isIdentifier(node) || ts.isPropertyAccessExpression(node)) {
      // 引用其他常量
      constants.push({
        name: basePath.split('.').pop() || basePath,
        value: node.getText(sourceFile), // 保存引用文本
        filePath,
        lineNumber,
        path: basePath,
        rawText: node.getText(sourceFile),
        type: 'reference'
      });
    }
  }

  /**
   * 从对象字面量中提取常量
   */
  private extractConstantsFromObjectLiteral(
    node: ts.ObjectLiteralExpression,
    basePath: string,
    constants: ConstantDefinition[],
    filePath: string
  ) {
    for (const property of node.properties) {
      if (ts.isPropertyAssignment(property)) {
        let propertyName: string;
        
        if (ts.isIdentifier(property.name)) {
          propertyName = property.name.text;
        } else if (ts.isStringLiteral(property.name)) {
          propertyName = property.name.text;
        } else {
          continue; // 跳过计算属性名
        }

        const fullPath = `${basePath}.${propertyName}`;
        this.extractConstantsFromInitializer(property.initializer, fullPath, constants, filePath);
      }
    }
  }

  /**
   * 获取 AST 节点的值
   */
  private getNodeValue(node: ts.Expression): any {
    if (ts.isStringLiteral(node)) {
      return node.text;
    } else if (ts.isNumericLiteral(node)) {
      return parseFloat(node.text);
    } else if (node.kind === ts.SyntaxKind.TrueKeyword) {
      return true;
    } else if (node.kind === ts.SyntaxKind.FalseKeyword) {
      return false;
    } else if (node.kind === ts.SyntaxKind.NullKeyword) {
      return null;
    }
    return undefined;
  }

  /**
   * 查找重复组
   */
  private findDuplicateGroups(constants: ConstantDefinition[]): DuplicateGroup[] {
    const groups = new Map<string, ConstantDefinition[]>();
    
    // 按值分组
    for (const constant of constants) {
      if (constant.type === 'reference') {
        continue; // 引用类型单独处理
      }

      const key = this.getValueKey(constant.value);
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(constant);
    }

    const duplicateGroups: DuplicateGroup[] = [];
    
    // 找出重复的组
    for (const [, occurrences] of groups.entries()) {
      if (occurrences.length > 1) {
        const value = occurrences[0].value;
        duplicateGroups.push({
          value,
          type: DuplicateType.DIRECT,
          occurrences,
          count: occurrences.length,
          severity: this.calculateSeverity(occurrences.length, value)
        });
      }
    }

    // 处理引用重复
    const referenceGroups = this.findReferenceDuplicates(constants);
    duplicateGroups.push(...referenceGroups);

    return duplicateGroups;
  }

  /**
   * 查找引用重复
   */
  private findReferenceDuplicates(constants: ConstantDefinition[]): DuplicateGroup[] {
    const referenceGroups = new Map<string, ConstantDefinition[]>();
    
    for (const constant of constants) {
      if (constant.type === 'reference') {
        const refValue = constant.value as string;
        if (!referenceGroups.has(refValue)) {
          referenceGroups.set(refValue, []);
        }
        referenceGroups.get(refValue)!.push(constant);
      }
    }

    const duplicateGroups: DuplicateGroup[] = [];
    for (const [refValue, occurrences] of referenceGroups.entries()) {
      if (occurrences.length > 1) {
        duplicateGroups.push({
          value: refValue,
          type: DuplicateType.REFERENCE,
          occurrences,
          count: occurrences.length,
          severity: this.calculateSeverity(occurrences.length, refValue)
        });
      }
    }

    return duplicateGroups;
  }

  /**
   * 获取值的键（用于分组）
   */
  private getValueKey(value: any): string {
    if (value === null) return 'null';
    if (value === undefined) return 'undefined';
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      return `${typeof value}:${value}`;
    }
    return `object:${JSON.stringify(value)}`;
  }

  /**
   * 计算重复的严重程度
   */
  private calculateSeverity(count: number, value: any): 'low' | 'medium' | 'high' {
    // 数字类型的重复更严重
    if (typeof value === 'number') {
      if (count >= 10) return 'high';
      if (count >= 5) return 'medium';
      return 'low';
    }
    
    // 字符串类型
    if (typeof value === 'string') {
      if (count >= 20) return 'high';
      if (count >= 10) return 'medium';
      return 'low';
    }
    
    // 其他类型
    if (count >= 5) return 'medium';
    return 'low';
  }

  /**
   * 生成摘要统计
   */
  private generateSummary(
    files: string[],
    constants: ConstantDefinition[],
    duplicateGroups: DuplicateGroup[]
  ) {
    const byType = {
      [DuplicateType.DIRECT]: 0,
      [DuplicateType.REFERENCE]: 0,
      [DuplicateType.NESTED]: 0
    };

    const bySeverity = {
      low: 0,
      medium: 0,
      high: 0
    };

    let totalDuplicates = 0;

    for (const group of duplicateGroups) {
      byType[group.type]++;
      bySeverity[group.severity]++;
      totalDuplicates += group.count;
    }

    return {
      totalFiles: files.length,
      totalConstants: constants.length,
      duplicateGroups: duplicateGroups.length,
      totalDuplicates,
      byType,
      bySeverity
    };
  }

  /**
   * 将报告保存到文件
   */
  async saveReport(report: DuplicationReport, outputPath: string): Promise<void> {
    const reportContent = this.formatReport(report);
    await fs.promises.writeFile(outputPath, reportContent, 'utf-8');
    console.log(`📄 报告已保存到: ${outputPath}`);
  }

  /**
   * 格式化报告内容
   */
  private formatReport(report: DuplicationReport): string {
    const { summary, duplicateGroups } = report;
    
    let output = '';
    
    // 标题和摘要
    output += '# 常量重复检测报告\n\n';
    output += `📊 **检测摘要**\n`;
    output += `- 扫描文件数：${summary.totalFiles}\n`;
    output += `- 常量定义数：${summary.totalConstants}\n`;
    output += `- 重复组数：${summary.duplicateGroups}\n`;
    output += `- 重复实例数：${summary.totalDuplicates}\n\n`;
    
    output += `📈 **按类型统计**\n`;
    output += `- 直接重复：${summary.byType.direct}\n`;
    output += `- 引用重复：${summary.byType.reference}\n`;
    output += `- 嵌套重复：${summary.byType.nested}\n\n`;
    
    output += `⚠️ **按严重程度统计**\n`;
    output += `- 高：${summary.bySeverity.high}\n`;
    output += `- 中：${summary.bySeverity.medium}\n`;
    output += `- 低：${summary.bySeverity.low}\n\n`;

    // 详细重复项
    output += '## 详细重复项列表\n\n';
    
    for (let i = 0; i < duplicateGroups.length; i++) {
      const group = duplicateGroups[i];
      const severityIcon = group.severity === 'high' ? '🔴' : group.severity === 'medium' ? '🟡' : '🟢';
      const typeIcon = group.type === 'direct' ? '🎯' : group.type === 'reference' ? '🔗' : '🏗️';
      
      output += `### ${i + 1}. ${severityIcon} ${typeIcon} 重复值: \`${this.formatValue(group.value)}\`\n\n`;
      output += `- **类型**: ${group.type}\n`;
      output += `- **重复次数**: ${group.count}\n`;
      output += `- **严重程度**: ${group.severity}\n\n`;
      output += `**出现位置:**\n`;
      
      for (const occurrence of group.occurrences) {
        output += `- \`${occurrence.path}\` (${path.basename(occurrence.filePath)}:${occurrence.lineNumber})\n`;
      }
      
      output += '\n---\n\n';
    }

    // 扫描信息
    output += '## 扫描信息\n\n';
    output += `- **扫描时间**: ${report.scanInfo.scanTime}\n`;
    output += `- **扫描目录**: ${report.scanInfo.scannedDirectories.join(', ')}\n`;

    return output;
  }

  /**
   * 格式化值用于显示
   */
  private formatValue(value: any): string {
    if (typeof value === 'string') {
      return `"${value}"`;
    }
    if (value === null) return 'null';
    if (value === undefined) return 'undefined';
    return String(value);
  }
}

// CLI 接口
if (require.main === module) {
  const detector = new ConstantsDuplicatesDetector();
  
  detector.detectDuplicates('src/common/constants')
    .then(async (report) => {
      console.log('\n' + '='.repeat(60));
      console.log('📊 常量重复检测报告摘要');
      console.log('='.repeat(60));
      console.log(`扫描文件数: ${report.summary.totalFiles}`);
      console.log(`常量定义数: ${report.summary.totalConstants}`);
      console.log(`重复组数: ${report.summary.duplicateGroups}`);
      console.log(`重复实例数: ${report.summary.totalDuplicates}`);
      console.log('='.repeat(60));
      
      // 保存详细报告
      const outputPath = 'tools/constants-validator/constants-duplicates-report.md';
      await detector.saveReport(report, outputPath);
      
      // 显示前5个最严重的重复项
      console.log('\n🔍 前5个重复项:');
      const topDuplicates = report.duplicateGroups.slice(0, 5);
      for (let i = 0; i < topDuplicates.length; i++) {
        const group = topDuplicates[i];
        const severityIcon = group.severity === 'high' ? '🔴' : group.severity === 'medium' ? '🟡' : '🟢';
        console.log(`${i + 1}. ${severityIcon} 值 "${detector['formatValue'](group.value)}" - 重复 ${group.count} 次`);
      }
    })
    .catch(error => {
      console.error('❌ 检测失败:', error);
      process.exit(1);
    });
}

export default ConstantsDuplicatesDetector;