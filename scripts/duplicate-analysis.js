#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * 重复标识符分析工具
 * 扫描项目中的常量、枚举和DTO文件，查找重复的导出名称
 */

class DuplicateAnalyzer {
  constructor() {
    this.results = {
      constants: new Map(), // name -> [{file, value, line}]
      enums: new Map(),     // name -> [{file, value, line}]
      dtos: new Map()       // name -> [{file, type, line}]
    };
  }

  /**
   * 递归扫描目录查找指定类型的文件
   */
  findFiles(dir, pattern) {
    const files = [];
    
    const scanDir = (currentDir) => {
      try {
        const items = fs.readdirSync(currentDir);
        
        for (const item of items) {
          const fullPath = path.join(currentDir, item);
          const stat = fs.statSync(fullPath);
          
          if (stat.isDirectory()) {
            // 跳过 node_modules, dist, coverage 等目录
            if (!['node_modules', 'dist', 'coverage', '.git'].includes(item)) {
              scanDir(fullPath);
            }
          } else if (stat.isFile() && item.match(pattern)) {
            files.push(fullPath);
          }
        }
      } catch (error) {
        console.warn(`无法读取目录 ${currentDir}: ${error.message}`);
      }
    };

    scanDir(dir);
    return files;
  }

  /**
   * 扫描常量文件
   */
  scanConstantsFiles() {
    console.log('🔍 扫描常量文件...');
    
    const constantsFiles = this.findFiles('./src', /\.constants\.ts$/);
    console.log(`找到 ${constantsFiles.length} 个常量文件`);

    for (const file of constantsFiles) {
      this.parseConstantsFile(file);
    }
  }

  /**
   * 解析常量文件内容
   */
  parseConstantsFile(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const lines = content.split('\n');

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const lineNumber = i + 1;

        // 匹配导出的常量定义: export const CONSTANT_NAME = 
        const exportConstMatch = line.match(/export\s+const\s+([A-Z_][A-Z0-9_]*)\s*=/);
        if (exportConstMatch) {
          const constantName = exportConstMatch[1];
          
          // 尝试获取值（简单的字符串或对象）
          let value = 'unknown';
          if (line.includes('Object.freeze')) {
            value = 'Object.freeze({...})';
          } else if (line.includes('=')) {
            const valuePart = line.split('=')[1].trim();
            if (valuePart.length > 50) {
              value = valuePart.substring(0, 50) + '...';
            } else {
              value = valuePart;
            }
          }

          this.addResult('constants', constantName, {
            file: filePath,
            value: value,
            line: lineNumber
          });
        }
      }
    } catch (error) {
      console.warn(`解析文件失败 ${filePath}: ${error.message}`);
    }
  }

  /**
   * 扫描枚举文件
   */
  scanEnumFiles() {
    console.log('🔍 扫描枚举文件...');
    
    const enumFiles = this.findFiles('./src', /\.enum\.ts$/);
    console.log(`找到 ${enumFiles.length} 个枚举文件`);

    for (const file of enumFiles) {
      this.parseEnumFile(file);
    }
  }

  /**
   * 解析枚举文件内容
   */
  parseEnumFile(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const lines = content.split('\n');

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const lineNumber = i + 1;

        // 匹配导出的枚举定义: export enum EnumName {
        const exportEnumMatch = line.match(/export\s+enum\s+([A-Z][a-zA-Z0-9]*)\s*\{/);
        if (exportEnumMatch) {
          const enumName = exportEnumMatch[1];
          
          this.addResult('enums', enumName, {
            file: filePath,
            value: 'enum',
            line: lineNumber
          });
        }

        // 匹配枚举值: ENUM_VALUE = "value" 或 ENUM_VALUE = 'value'
        const enumValueMatch = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*["']([^"']+)["']/);
        if (enumValueMatch) {
          const enumValueName = enumValueMatch[1];
          const enumValue = enumValueMatch[2];
          
          this.addResult('enums', enumValueName, {
            file: filePath,
            value: `"${enumValue}"`,
            line: lineNumber
          });
        }

        // 匹配数字枚举值: ENUM_VALUE = 123
        const numericEnumValueMatch = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(\d+)/);
        if (numericEnumValueMatch) {
          const enumValueName = numericEnumValueMatch[1];
          const enumValue = numericEnumValueMatch[2];
          
          this.addResult('enums', enumValueName, {
            file: filePath,
            value: enumValue,
            line: lineNumber
          });
        }
      }
    } catch (error) {
      console.warn(`解析枚举文件失败 ${filePath}: ${error.message}`);
    }
  }

  /**
   * 扫描DTO文件
   */
  scanDTOFiles() {
    console.log('🔍 扫描DTO文件...');
    
    const dtoFiles = this.findFiles('./src', /\.dto\.ts$/);
    console.log(`找到 ${dtoFiles.length} 个DTO文件`);

    for (const file of dtoFiles) {
      this.parseDTOFile(file);
    }
  }

  /**
   * 解析DTO文件内容
   */
  parseDTOFile(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const lines = content.split('\n');

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const lineNumber = i + 1;

        // 匹配导出的类定义: export class ClassName
        const exportClassMatch = line.match(/export\s+class\s+([A-Z][a-zA-Z0-9]*)/);
        if (exportClassMatch) {
          const className = exportClassMatch[1];
          
          this.addResult('dtos', className, {
            file: filePath,
            type: 'class',
            line: lineNumber
          });
        }

        // 匹配导出的接口定义: export interface InterfaceName
        const exportInterfaceMatch = line.match(/export\s+interface\s+([A-Z][a-zA-Z0-9]*)/);
        if (exportInterfaceMatch) {
          const interfaceName = exportInterfaceMatch[1];
          
          this.addResult('dtos', interfaceName, {
            file: filePath,
            type: 'interface',
            line: lineNumber
          });
        }

        // 匹配导出的类型定义: export type TypeName
        const exportTypeMatch = line.match(/export\s+type\s+([A-Z][a-zA-Z0-9]*)/);
        if (exportTypeMatch) {
          const typeName = exportTypeMatch[1];
          
          this.addResult('dtos', typeName, {
            file: filePath,
            type: 'type',
            line: lineNumber
          });
        }
      }
    } catch (error) {
      console.warn(`解析DTO文件失败 ${filePath}: ${error.message}`);
    }
  }

  /**
   * 添加结果到对应的集合中
   */
  addResult(type, name, info) {
    if (!this.results[type].has(name)) {
      this.results[type].set(name, []);
    }
    this.results[type].get(name).push(info);
  }

  /**
   * 查找重复项和相似模式
   */
  findDuplicates() {
    const duplicates = {
      constants: [],
      enums: [],
      dtos: []
    };

    // 查找完全相同的名称
    for (const [type, map] of Object.entries(this.results)) {
      for (const [name, occurrences] of map.entries()) {
        if (occurrences.length > 1) {
          duplicates[type].push({
            name,
            occurrences,
            count: occurrences.length,
            type: 'exact_duplicate'
          });
        }
      }
    }

    // 查找相似的命名模式
    const patterns = this.findSimilarPatterns();
    duplicates.patterns = patterns;

    return duplicates;
  }

  /**
   * 查找相似的命名模式
   */
  findSimilarPatterns() {
    const patterns = [];
    const constantNames = Array.from(this.results.constants.keys());

    // 查找以相同后缀结尾的常量
    const suffixGroups = {};
    const commonSuffixes = ['_OPERATIONS', '_MESSAGES', '_CONFIG', '_CONSTANTS', '_DEFAULTS', '_METRICS', '_VALIDATION_RULES', '_ERROR_MESSAGES', '_WARNING_MESSAGES', '_SUCCESS_MESSAGES'];

    for (const suffix of commonSuffixes) {
      const matching = constantNames.filter(name => name.endsWith(suffix));
      if (matching.length > 1) {
        suffixGroups[suffix] = matching.map(name => ({
          name,
          occurrences: this.results.constants.get(name)
        }));
      }
    }

    // 转换为模式格式
    for (const [suffix, constants] of Object.entries(suffixGroups)) {
      patterns.push({
        pattern: `*${suffix}`,
        description: `Constants ending with ${suffix}`,
        constants: constants,
        count: constants.length
      });
    }

    return patterns;
  }

  /**
   * 生成报告
   */
  generateReport(duplicates) {
    let report = '# 重复标识符分析报告\n\n';
    report += `生成时间: ${new Date().toLocaleString()}\n\n`;

    // 统计信息
    const totalConstants = this.results.constants.size;
    const totalEnums = this.results.enums.size;
    const totalDtos = this.results.dtos.size;
    const duplicateConstants = duplicates.constants.length;
    const duplicateEnums = duplicates.enums.length;
    const duplicateDtos = duplicates.dtos.length;

    report += '## 📊 统计摘要\n\n';
    report += `- 扫描的常量: ${totalConstants} (重复: ${duplicateConstants})\n`;
    report += `- 扫描的枚举: ${totalEnums} (重复: ${duplicateEnums})\n`;
    report += `- 扫描的DTO: ${totalDtos} (重复: ${duplicateDtos})\n\n`;

    // 常量重复
    if (duplicates.constants.length > 0) {
      report += '## 🔄 重复的常量\n\n';
      for (const duplicate of duplicates.constants) {
        report += `### ${duplicate.name}\n\n`;
        report += `发现 ${duplicate.count} 处重复:\n\n`;
        
        for (const occurrence of duplicate.occurrences) {
          report += `- **文件**: \`${occurrence.file}\`\n`;
          report += `  - **行号**: ${occurrence.line}\n`;
          report += `  - **值**: \`${occurrence.value}\`\n\n`;
        }
      }
    }

    // 枚举重复
    if (duplicates.enums.length > 0) {
      report += '## 🔄 重复的枚举\n\n';
      for (const duplicate of duplicates.enums) {
        report += `### ${duplicate.name}\n\n`;
        report += `发现 ${duplicate.count} 处重复:\n\n`;
        
        for (const occurrence of duplicate.occurrences) {
          report += `- **文件**: \`${occurrence.file}\`\n`;
          report += `  - **行号**: ${occurrence.line}\n`;
          report += `  - **值**: \`${occurrence.value}\`\n\n`;
        }
      }
    }

    // DTO重复
    if (duplicates.dtos.length > 0) {
      report += '## 🔄 重复的DTO\n\n';
      for (const duplicate of duplicates.dtos) {
        report += `### ${duplicate.name}\n\n`;
        report += `发现 ${duplicate.count} 处重复:\n\n`;
        
        for (const occurrence of duplicate.occurrences) {
          report += `- **文件**: \`${occurrence.file}\`\n`;
          report += `  - **行号**: ${occurrence.line}\n`;
          report += `  - **类型**: ${occurrence.type}\n\n`;
        }
      }
    }

    // 相似命名模式
    if (duplicates.patterns && duplicates.patterns.length > 0) {
      report += '## 🎯 相似命名模式\n\n';
      report += '发现以下相似的命名模式，建议考虑统一或重构:\n\n';
      
      for (const pattern of duplicates.patterns) {
        report += `### ${pattern.pattern}\n\n`;
        report += `${pattern.description} (${pattern.count} 个常量)\n\n`;
        
        for (const constant of pattern.constants) {
          report += `#### ${constant.name}\n\n`;
          for (const occurrence of constant.occurrences) {
            report += `- **文件**: \`${occurrence.file}\`\n`;
            report += `  - **行号**: ${occurrence.line}\n`;
            report += `  - **值**: \`${occurrence.value}\`\n\n`;
          }
        }
      }
    }

    if (duplicateConstants === 0 && duplicateEnums === 0 && duplicateDtos === 0 && (!duplicates.patterns || duplicates.patterns.length === 0)) {
      report += '## ✅ 结果\n\n';
      report += '未发现重复的标识符或相似的命名模式。\n\n';
    }

    return report;
  }

  /**
   * 运行分析
   */
  async run() {
    console.log('🚀 开始重复标识符分析...\n');

    // 扫描常量文件
    this.scanConstantsFiles();

    // 扫描枚举文件
    this.scanEnumFiles();

    // 扫描DTO文件
    this.scanDTOFiles();

    // 查找重复项
    console.log('\n🔍 查找重复项...');
    const duplicates = this.findDuplicates();

    // 生成报告
    console.log('📝 生成报告...');
    const report = this.generateReport(duplicates);

    // 保存报告
    const reportPath = path.join('./docs', 'duplicate-analysis-report.md');
    
    // 确保docs目录存在
    if (!fs.existsSync('./docs')) {
      fs.mkdirSync('./docs', { recursive: true });
    }
    
    fs.writeFileSync(reportPath, report, 'utf8');
    
    console.log(`\n✅ 分析完成！报告已保存到: ${reportPath}`);
    
    // 显示简要结果
    const totalDuplicates = duplicates.constants.length + duplicates.enums.length + duplicates.dtos.length;
    const totalPatterns = duplicates.patterns ? duplicates.patterns.length : 0;
    
    if (totalDuplicates > 0) {
      console.log(`\n⚠️  发现 ${totalDuplicates} 个重复标识符:`);
      console.log(`   - 常量: ${duplicates.constants.length}`);
      console.log(`   - 枚举: ${duplicates.enums.length}`);
      console.log(`   - DTO: ${duplicates.dtos.length}`);
    } else {
      console.log('\n✅ 未发现完全重复的标识符');
    }

    if (totalPatterns > 0) {
      console.log(`\n🎯 发现 ${totalPatterns} 种相似命名模式:`);
      for (const pattern of duplicates.patterns) {
        console.log(`   - ${pattern.pattern}: ${pattern.count} 个常量`);
      }
    }
  }
}

// 运行分析
if (require.main === module) {
  const analyzer = new DuplicateAnalyzer();
  analyzer.run().catch(console.error);
}

module.exports = DuplicateAnalyzer;