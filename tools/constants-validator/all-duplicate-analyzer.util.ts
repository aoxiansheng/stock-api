#!/usr/bin/env bun
/**
 * 常量系统重复项分析工具
 * 🔍 系统化分析所有重复的数字、字段名、字符串值等
 * 📊 生成详细报告以制定针对性的去重策略
 */

import { readFileSync, writeFileSync } from 'fs';
import { glob } from 'glob';
import * as path from 'path';

interface DuplicateItem {
  value: string | number;
  type: 'number' | 'string' | 'field_name' | 'constant_name';
  locations: Array<{
    file: string;
    line: number;
    context: string;
    fullLine: string;
  }>;
  count: number;
}

interface DuplicateAnalysisReport {
  summary: {
    totalFiles: number;
    duplicateNumbers: number;
    duplicateStrings: number;
    duplicateFieldNames: number;
    duplicateConstantNames: number;
    totalDuplicates: number;
  };
  duplicates: {
    numbers: DuplicateItem[];
    strings: DuplicateItem[];
    fieldNames: DuplicateItem[];
    constantNames: DuplicateItem[];
  };
  recommendations: string[];
}

export class DuplicateAnalyzer {
  private duplicates: Map<string, DuplicateItem> = new Map();
  private numberPattern = /\b\d+\b/g;
  private stringPattern = /["']([^"']+)["']/g;
  private fieldNamePattern = /(\w+):\s*[^,}]+/g;
  private constantNamePattern = /^export\s+const\s+(\w+)/gm;
  private objectKeyPattern = /(\w+):\s*/g;

  /**
   * 分析指定目录下的所有常量文件
   */
  async analyzeDirectory(directory: string): Promise<DuplicateAnalysisReport> {
    console.log(`🔍 开始分析目录: ${directory}`);
    
    // 查找所有常量文件
    const constantFiles = await glob(`${directory}/**/*.ts`, { 
      ignore: ['**/node_modules/**', '**/dist/**', '**/*.d.ts'] 
    });
    
    console.log(`📁 找到 ${constantFiles.length} 个TypeScript文件`);
    
    // 分析每个文件
    for (const filePath of constantFiles) {
      await this.analyzeFile(filePath);
    }
    
    // 生成报告
    const report = this.generateReport(constantFiles.length);
    return report;
  }

  /**
   * 分析单个文件
   */
  private async analyzeFile(filePath: string): Promise<void> {
    try {
      const content = readFileSync(filePath, 'utf-8');
      const lines = content.split('\n');
      
      lines.forEach((line, lineIndex) => {
        const lineNumber = lineIndex + 1;
        
        // 分析数字
        this.analyzeNumbers(line, filePath, lineNumber);
        
        // 分析字符串
        this.analyzeStrings(line, filePath, lineNumber);
        
        // 分析字段名
        this.analyzeFieldNames(line, filePath, lineNumber);
        
        // 分析常量名
        this.analyzeConstantNames(line, filePath, lineNumber);
      });
      
    } catch (error) {
      console.warn(`⚠️ 无法读取文件 ${filePath}: ${error}`);
    }
  }

  /**
   * 分析数字重复
   */
  private analyzeNumbers(line: string, filePath: string, lineNumber: number): void {
    let match;
    while ((match = this.numberPattern.exec(line)) !== null) {
      const number = parseInt(match[0]);
      const matchStart = match.index;
      const matchEnd = match.index + match[0].length;
      
      // 检查是否为完整的独立数字（不是小数或更大数字的一部分）
      if (!this.isIndependentNumber(line, matchStart, matchEnd, match[0])) {
        continue;
      }
      
      // 忽略行号、单个数字、版本号等
      if (number <= 1 || number === lineNumber || this.isVersionNumber(line) || this.isIgnorableNumber(number, line)) {
        continue;
      }
      
      const key = `number_${number}`;
      const context = this.extractContext(line, match.index, match[0].length);
      
      this.addDuplicate(key, {
        file: filePath,
        line: lineNumber,
        context,
        fullLine: line.trim()
      });
    }
    
    // 重置正则表达式的lastIndex
    this.numberPattern.lastIndex = 0;
  }

  /**
   * 检查数字是否为独立数字（不是小数或更大数字的一部分，且不在注释中）
   */
  private isIndependentNumber(line: string, start: number, end: number, numberStr: string): boolean {
    // 检查前面的字符
    const prevChar = start > 0 ? line[start - 1] : '';
    const nextChar = end < line.length ? line[end] : '';
    
    // 如果前面是数字或小数点，说明是更大数字的一部分
    if (/\d|\./.test(prevChar)) {
      return false;
    }
    
    // 如果后面是数字或小数点，说明是更大数字的一部分
    if (/\d|\./.test(nextChar)) {
      return false;
    }
    
    // 检查是否在注释中
    if (this.isInComment(line, start)) {
      return false;
    }
    
    return true;
  }

  /**
   * 检查指定位置是否在注释中
   */
  private isInComment(line: string, position: number): boolean {
    // 检查单行注释 //
    const singleLineCommentIndex = line.indexOf('//');
    if (singleLineCommentIndex !== -1 && position > singleLineCommentIndex) {
      return true;
    }
    
    // 检查多行注释 /* */ (简单检查，假设注释在同一行内)
    const multiLineStartIndex = line.indexOf('/*');
    const multiLineEndIndex = line.indexOf('*/');
    
    if (multiLineStartIndex !== -1) {
      // 如果有结束标记，检查是否在注释区间内
      if (multiLineEndIndex !== -1 && multiLineEndIndex > multiLineStartIndex) {
        return position > multiLineStartIndex && position < multiLineEndIndex;
      }
      // 如果没有结束标记，假设注释延续到行尾
      return position > multiLineStartIndex;
    }
    
    return false;
  }

  /**
   * 判断是否为可忽略的数字
   */
  private isIgnorableNumber(number: number, line: string): boolean {
    // 标准HTTP状态码 (合理重复)
    const httpStatusCodes = [200, 201, 204, 301, 302, 304, 400, 401, 403, 404, 409, 422, 429, 500, 502, 503, 504];
    
    // 标准端口号 (合理重复) 
    const standardPorts = [80, 443, 3000, 3001, 8080, 8081, 6379, 27017];
    
    // 年份数字 (合理重复)
    const isYear = number >= 1970 && number <= 2030;
    
    // 标准进制 (合理重复)
    const standardRadix = [2, 8, 10, 16, 32, 36];
    
    // 百分比计算中的常见数字 (合理重复)
    const percentageNumbers = [25, 50, 75]; // 1/4, 1/2, 3/4
    
    // 时间单位转换 (合理重复)
    const timeUnits = [60, 24, 7, 30, 31, 365, 366]; // 秒/分, 小时/天, 天/周, 天/月, 天/年
    
    // 标准文件大小单位 (合理重复)
    const fileSizeUnits = [1024, 1048576]; // KB, MB
    
    // 如果是在导入路径、版本号、或者模块路径中，通常是合理的
    if (/import|from|version|\/\d+\/|@\d+|v\d+/i.test(line)) {
      return true;
    }
    
    return httpStatusCodes.includes(number) ||
           standardPorts.includes(number) ||
           isYear ||
           standardRadix.includes(number) ||
           percentageNumbers.includes(number) ||
           timeUnits.includes(number) ||
           fileSizeUnits.includes(number);
  }

  /**
   * 分析字符串重复
   */
  private analyzeStrings(line: string, filePath: string, lineNumber: number): void {
    let match;
    while ((match = this.stringPattern.exec(line)) !== null) {
      const string = match[1];
      
      // 忽略太短的字符串、路径、注释等
      if (string.length < 3 || this.isIgnorableString(string)) {
        continue;
      }
      
      const key = `string_${string}`;
      const context = this.extractContext(line, match.index, match[0].length);
      
      this.addDuplicate(key, {
        file: filePath,
        line: lineNumber,
        context,
        fullLine: line.trim()
      });
    }
    
    this.stringPattern.lastIndex = 0;
  }

  /**
   * 分析字段名重复
   */
  private analyzeFieldNames(line: string, filePath: string, lineNumber: number): void {
    // 分析对象字段名
    let match;
    while ((match = this.objectKeyPattern.exec(line)) !== null) {
      const fieldName = match[1];
      
      // 忽略太短或太常见的字段名
      if (fieldName.length < 3 || this.isCommonFieldName(fieldName)) {
        continue;
      }
      
      const key = `field_${fieldName}`;
      const context = this.extractContext(line, match.index, fieldName.length);
      
      this.addDuplicate(key, {
        file: filePath,
        line: lineNumber,
        context,
        fullLine: line.trim()
      });
    }
    
    this.objectKeyPattern.lastIndex = 0;
  }

  /**
   * 分析常量名重复
   */
  private analyzeConstantNames(line: string, filePath: string, lineNumber: number): void {
    let match;
    while ((match = this.constantNamePattern.exec(line)) !== null) {
      const constantName = match[1];
      
      const key = `constant_${constantName}`;
      const context = this.extractContext(line, match.index, constantName.length);
      
      this.addDuplicate(key, {
        file: filePath,
        line: lineNumber,
        context,
        fullLine: line.trim()
      });
    }
    
    this.constantNamePattern.lastIndex = 0;
  }

  /**
   * 添加重复项
   */
  private addDuplicate(key: string, location: Omit<DuplicateItem['locations'][0], 'context'> & { context: string }): void {
    if (!this.duplicates.has(key)) {
      const [type, value] = key.split('_', 2);
      this.duplicates.set(key, {
        value: type === 'number' ? parseInt(value) : value,
        type: type as DuplicateItem['type'],
        locations: [],
        count: 0
      });
    }
    
    const item = this.duplicates.get(key)!;
    item.locations.push(location);
    item.count = item.locations.length;
  }

  /**
   * 提取上下文
   */
  private extractContext(line: string, index: number, length: number): string {
    const start = Math.max(0, index - 20);
    const end = Math.min(line.length, index + length + 20);
    return line.substring(start, end).trim();
  }

  /**
   * 判断是否为版本号
   */
  private isVersionNumber(line: string): boolean {
    return /version|VERSION|v\d|Version/i.test(line);
  }

  /**
   * 判断是否为可忽略的字符串
   */
  private isIgnorableString(str: string): boolean {
    const ignorablePatterns = [
      /^[/.\\]+$/,  // 路径分隔符
      /^\w{1,2}$/,  // 太短
      /^(true|false|null|undefined)$/, // 基础值
      /^[A-Z_]{1,3}$/, // 太短的大写字母组合
      /^\d+$/, // 纯数字字符串
      /^(GET|POST|PUT|DELETE|PATCH)$/, // HTTP方法
      /^(info|error|warn|debug)$/, // 日志级别
    ];
    
    // 通用状态词汇 (合理重复)
    const commonStatusWords = [
      'success', 'failure', 'pending', 'completed', 'processing',
      'high', 'medium', 'low', 'normal', 'urgent', 'critical',
      'warning', 'info', 'error', 'debug', 'trace',
      'active', 'inactive', 'enabled', 'disabled',
      'online', 'offline', 'connected', 'disconnected'
    ];
    
    // TypeScript 基础类型 (合理重复)
    const typescriptTypes = [
      'string', 'number', 'boolean', 'object', 'undefined', 'null',
      'function', 'array', 'unknown', 'any', 'void', 'never'
    ];
    
    // 所有导入路径都是合理重复，不需要优化
    const importPaths = [
      '@nestjs/common', '@nestjs/core', '@nestjs/swagger', '@nestjs/platform-express',
      '@nestjs/event-emitter', '@nestjs/config', '@nestjs/testing', '@nestjs/mongoose',
      'class-validator', 'class-transformer', 'rxjs', 'lodash',
      '@app/logging/logger.factory', '@common/constants', '../constants', './constants',
      '../../constants', '../../../constants', '@app/config', '@common/utils'
    ];
    
    // 标准时间格式 (合理重复)
    const standardFormats = [
      'YYYY-MM-DDTHH:mm:ss.sssZ', 'YYYY-MM-DD', 'HH:mm:ss',
      '1970-01-01T00:00:00.000Z', 'ISO', 'UTC'
    ];
    
    // 通用业务词汇 (合理重复) 
    const commonBusinessWords = [
      'cache', 'database', 'api', 'rest', 'websocket', 'stream',
      'config', 'service', 'controller', 'module', 'provider',
      'health', 'monitor', 'metric', 'log', 'audit'
    ];
    
    const allIgnorableWords = [
      ...commonStatusWords,
      ...typescriptTypes, 
      ...importPaths,
      ...standardFormats,
      ...commonBusinessWords
    ];
    
    return ignorablePatterns.some(pattern => pattern.test(str)) ||
           allIgnorableWords.includes(str.toLowerCase());
  }

  /**
   * 判断是否为常见字段名
   */
  private isCommonFieldName(fieldName: string): boolean {
    const commonFields = [
      'id', 'name', 'type', 'value', 'key', 'data', 'config', 'options',
      'url', 'path', 'method', 'status', 'code', 'message', 'error',
      'min', 'max', 'len', 'size', 'count', 'limit', 'page'
    ];
    
    return commonFields.includes(fieldName.toLowerCase());
  }

  /**
   * 生成分析报告
   */
  private generateReport(totalFiles: number): DuplicateAnalysisReport {
    // 过滤出真正的重复项 (count > 1)
    const duplicateItems = Array.from(this.duplicates.values()).filter(item => item.count > 1);
    
    const numbers = duplicateItems.filter(item => item.type === 'number')
      .sort((a, b) => b.count - a.count);
    
    const strings = duplicateItems.filter(item => item.type === 'string')
      .sort((a, b) => b.count - a.count);
    
    const fieldNames = duplicateItems.filter(item => item.type === 'field_name')
      .sort((a, b) => b.count - a.count);
    
    const constantNames = duplicateItems.filter(item => item.type === 'constant_name')
      .sort((a, b) => b.count - a.count);

    return {
      summary: {
        totalFiles,
        duplicateNumbers: numbers.length,
        duplicateStrings: strings.length,
        duplicateFieldNames: fieldNames.length,
        duplicateConstantNames: constantNames.length,
        totalDuplicates: duplicateItems.length
      },
      duplicates: {
        numbers,
        strings,
        fieldNames,
        constantNames
      },
      recommendations: this.generateRecommendations(duplicateItems)
    };
  }

  /**
   * 生成优化建议
   */
  private generateRecommendations(duplicates: DuplicateItem[]): string[] {
    const recommendations: string[] = [];
    
    // 分析数字重复
    const numbers = duplicates.filter(item => item.type === 'number');
    if (numbers.length > 0) {
      const topNumbers = numbers.slice(0, 10).map(item => `${item.value} (${item.count}次)`);
      recommendations.push(
        `🔢 发现 ${numbers.length} 个重复数字，建议统一到 Foundation 层。` +
        `最频繁的: ${topNumbers.join(', ')}`
      );
    }

    // 分析字符串重复
    const strings = duplicates.filter(item => item.type === 'string');
    if (strings.length > 0) {
      recommendations.push(
        `📝 发现 ${strings.length} 个重复字符串，建议创建统一的字符串常量。`
      );
    }

    // 分析字段名重复
    const fieldNames = duplicates.filter(item => item.type === 'field_name');
    if (fieldNames.length > 0) {
      recommendations.push(
        `🏷️ 发现 ${fieldNames.length} 个重复字段名，建议标准化对象结构。`
      );
    }

    // 分析常量名重复
    const constantNames = duplicates.filter(item => item.type === 'constant_name');
    if (constantNames.length > 0) {
      recommendations.push(
        `🔤 发现 ${constantNames.length} 个重复常量名，建议合并相似功能的常量。`
      );
    }

    return recommendations;
  }

  /**
   * 保存报告到文件
   */
  async saveReport(report: DuplicateAnalysisReport, outputPath: string): Promise<void> {
    const markdown = this.generateMarkdownReport(report);
    writeFileSync(outputPath, markdown, 'utf-8');
    console.log(`📄 报告已保存到: ${outputPath}`);
  }

  /**
   * 生成Markdown格式报告
   */
  private generateMarkdownReport(report: DuplicateAnalysisReport): string {
    const { summary, duplicates, recommendations } = report;
    
    let markdown = `# 常量系统重复项分析报告

## 📊 总览

- **总文件数**: ${summary.totalFiles}
- **重复数字**: ${summary.duplicateNumbers} 个
- **重复字符串**: ${summary.duplicateStrings} 个  
- **重复字段名**: ${summary.duplicateFieldNames} 个
- **重复常量名**: ${summary.duplicateConstantNames} 个
- **总重复项**: ${summary.totalDuplicates} 个

## 🎯 优化建议

${recommendations.map(rec => `- ${rec}`).join('\n')}

`;

    // 重复数字详情
    if (duplicates.numbers.length > 0) {
      markdown += `## 🔢 重复数字详情

| 数字 | 重复次数 | 主要出现位置 |
|------|----------|-------------|
`;
      
      duplicates.numbers.slice(0, 20).forEach(item => {
        const mainLocations = item.locations.slice(0, 3).map(loc => 
          `${path.basename(loc.file)}:${loc.line}`
        ).join(', ');
        
        markdown += `| ${item.value} | ${item.count} | ${mainLocations} |\n`;
      });
      
      markdown += '\n';
    }

    // 重复字符串详情
    if (duplicates.strings.length > 0) {
      markdown += `## 📝 重复字符串详情

| 字符串 | 重复次数 | 主要出现位置 |
|--------|----------|-------------|
`;
      
      duplicates.strings.slice(0, 20).forEach(item => {
        const mainLocations = item.locations.slice(0, 3).map(loc => 
          `${path.basename(loc.file)}:${loc.line}`
        ).join(', ');
        
        markdown += `| "${item.value}" | ${item.count} | ${mainLocations} |\n`;
      });
      
      markdown += '\n';
    }

    // 重复字段名详情
    if (duplicates.fieldNames.length > 0) {
      markdown += `## 🏷️ 重复字段名详情

| 字段名 | 重复次数 | 主要出现位置 |
|--------|----------|-------------|
`;
      
      duplicates.fieldNames.slice(0, 20).forEach(item => {
        const mainLocations = item.locations.slice(0, 3).map(loc => 
          `${path.basename(loc.file)}:${loc.line}`
        ).join(', ');
        
        markdown += `| ${item.value} | ${item.count} | ${mainLocations} |\n`;
      });
      
      markdown += '\n';
    }

    // 重复常量名详情
    if (duplicates.constantNames.length > 0) {
      markdown += `## 🔤 重复常量名详情

| 常量名 | 重复次数 | 主要出现位置 |
|--------|----------|-------------|
`;
      
      duplicates.constantNames.slice(0, 20).forEach(item => {
        const mainLocations = item.locations.slice(0, 3).map(loc => 
          `${path.basename(loc.file)}:${loc.line}`
        ).join(', ');
        
        markdown += `| ${item.value} | ${item.count} | ${mainLocations} |\n`;
      });
      
      markdown += '\n';
    }

    // 详细位置信息
    markdown += `## 📍 详细位置信息

### 高频重复数字 (前10名)

`;

    duplicates.numbers.slice(0, 10).forEach(item => {
      markdown += `#### 数字 ${item.value} (${item.count}次重复)\n\n`;
      item.locations.forEach(loc => {
        markdown += `- **${loc.file}:${loc.line}**: \`${loc.fullLine}\`\n`;
      });
      markdown += '\n';
    });

    return markdown;
  }
}

// 主函数 - 用于命令行执行
async function main() {
  const analyzer = new DuplicateAnalyzer();
  
  // 分析 src 目录
  console.log('🚀 开始分析常量系统重复项...');
  const report = await analyzer.analyzeDirectory('./src');
  
  // 保存报告
  const reportPath = './docs/duplicate-analysis-report.md';
  await analyzer.saveReport(report, reportPath);
  
  // 输出摘要
  console.log('\n📊 分析完成！');
  console.log(`总共分析了 ${report.summary.totalFiles} 个文件`);
  console.log(`发现 ${report.summary.totalDuplicates} 个重复项：`);
  console.log(`  - 重复数字: ${report.summary.duplicateNumbers} 个`);
  console.log(`  - 重复字符串: ${report.summary.duplicateStrings} 个`);
  console.log(`  - 重复字段名: ${report.summary.duplicateFieldNames} 个`);
  console.log(`  - 重复常量名: ${report.summary.duplicateConstantNames} 个`);
  console.log(`\n详细报告请查看: ${reportPath}`);
}

// 如果直接运行此脚本，执行分析
if (require.main === module) {
  main().catch(console.error);
}

export default DuplicateAnalyzer;