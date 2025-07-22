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
      dtos: new Map(),      // name -> [{file, type, line}]
      types: new Map()      // name -> [{file, definition, line}]
    };
    
    // 新增：用于跟踪使用情况
    this.usage = {
      files: new Set(),           // 被引用的文件
      constants: new Set(),       // 被使用的常量
      enums: new Set(),          // 被使用的枚举值
      imports: new Map()         // 文件 -> 导入的标识符列表
    };
    
    this.allFiles = [];           // 所有扫描的文件
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
   * 扫描Type定义
   */
  scanTypeDefinitions() {
    console.log('🔍 扫描Type定义...');
    
    // 获取所有TypeScript文件来扫描type定义
    const allTsFiles = this.findFiles('./src', /\.ts$/);
    console.log(`在 ${allTsFiles.length} 个TypeScript文件中扫描type定义`);

    for (const file of allTsFiles) {
      this.parseTypeDefinitions(file);
    }
  }

  /**
   * 解析Type定义内容
   */
  parseTypeDefinitions(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const lines = content.split('\n');

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const lineNumber = i + 1;

        // 匹配导出的type定义: export type TypeName = 
        const exportTypeMatch = line.match(/export\s+type\s+([A-Z][a-zA-Z0-9]*)\s*=/);
        if (exportTypeMatch) {
          const typeName = exportTypeMatch[1];
          
          // 尝试获取type定义的内容
          let definition = 'unknown';
          if (line.includes('=')) {
            const definitionPart = line.split('=')[1].trim();
            if (definitionPart.length > 100) {
              definition = definitionPart.substring(0, 100) + '...';
            } else {
              definition = definitionPart;
            }
          }

          this.addResult('types', typeName, {
            file: filePath,
            definition: definition,
            line: lineNumber
          });
        }

        // 匹配联合类型中的字符串字面量: "value1" | "value2"
        const unionTypeMatch = line.match(/export\s+type\s+[A-Z][a-zA-Z0-9]*\s*=.*["']([^"']+)["']/);
        if (unionTypeMatch) {
          const literalValue = unionTypeMatch[1];
          
          // 将字符串字面量也作为类型值记录
          this.addResult('types', literalValue.toUpperCase(), {
            file: filePath,
            definition: `"${literalValue}"`,
            line: lineNumber
          });
        }
      }
    } catch (error) {
      console.warn(`解析Type定义失败 ${filePath}: ${error.message}`);
    }
  }

  /**
   * 扫描所有TypeScript文件以分析使用情况
   */
  scanAllFiles() {
    console.log('🔍 扫描所有文件以分析使用情况...');
    
    // 获取所有TypeScript文件
    this.allFiles = this.findFiles('./src', /\.ts$/);
    console.log(`找到 ${this.allFiles.length} 个TypeScript文件`);

    for (const file of this.allFiles) {
      this.analyzeFileUsage(file);
    }
  }

  /**
   * 分析单个文件的使用情况
   */
  analyzeFileUsage(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const lines = content.split('\n');

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        // 匹配import语句
        const importMatch = line.match(/import\s*\{([^}]+)\}\s*from\s*['"]([^'"]+)['"]/);
        if (importMatch) {
          const imports = importMatch[1].split(',').map(imp => imp.trim());
          const fromPath = importMatch[2];
          
          // 记录被引用的文件
          this.usage.files.add(fromPath);
          
          // 记录导入的标识符
          if (!this.usage.imports.has(filePath)) {
            this.usage.imports.set(filePath, []);
          }
          this.usage.imports.get(filePath).push(...imports);
          
          // 记录被使用的常量和枚举
          for (const imp of imports) {
            this.usage.constants.add(imp);
            this.usage.enums.add(imp);
          }
        }

        // 匹配直接使用的标识符（简单匹配）
        for (const [constantName] of this.results.constants) {
          if (line.includes(constantName) && !line.includes('export const ' + constantName)) {
            this.usage.constants.add(constantName);
          }
        }

        for (const [enumName] of this.results.enums) {
          if (line.includes(enumName) && !line.includes('export enum ' + enumName) && !line.includes(enumName + ' =')) {
            this.usage.enums.add(enumName);
          }
        }
      }
    } catch (error) {
      console.warn(`分析文件使用情况失败 ${filePath}: ${error.message}`);
    }
  }

  /**
   * 查找未使用的项目
   */
  findUnusedItems() {
    const unused = {
      constants: [],
      enums: [],
      dtos: [],
      files: []
    };

    // 查找未使用的常量
    for (const [constantName, occurrences] of this.results.constants) {
      if (!this.usage.constants.has(constantName)) {
        unused.constants.push({
          name: constantName,
          occurrences: occurrences
        });
      }
    }

    // 查找未使用的枚举
    for (const [enumName, occurrences] of this.results.enums) {
      if (!this.usage.enums.has(enumName)) {
        unused.enums.push({
          name: enumName,
          occurrences: occurrences
        });
      }
    }

    // 查找未使用的DTO（简单检测）
    for (const [dtoName, occurrences] of this.results.dtos) {
      let isUsed = false;
      for (const file of this.allFiles) {
        try {
          const content = fs.readFileSync(file, 'utf8');
          if (content.includes(dtoName) && !content.includes('export class ' + dtoName) && !content.includes('export interface ' + dtoName)) {
            isUsed = true;
            break;
          }
        } catch (error) {
          // 忽略读取错误
        }
      }
      
      if (!isUsed) {
        unused.dtos.push({
          name: dtoName,
          occurrences: occurrences
        });
      }
    }

    // 查找未被引用的文件
    unused.files = this.findUnusedFiles();

    return unused;
  }

  /**
   * 查找未被引用的文件
   */
  findUnusedFiles() {
    console.log('🔍 分析文件引用关系...');
    
    const unusedFiles = [];
    const referencedFiles = new Set();
    
    // 收集所有被引用的文件路径
    for (const file of this.allFiles) {
      try {
        const content = fs.readFileSync(file, 'utf8');
        const lines = content.split('\n');
        
        for (const line of lines) {
          // 匹配各种import语句
          const importPatterns = [
            /import\s+.*\s+from\s*['"]([^'"]+)['"]/g,  // import ... from '...'
            /import\s*\(\s*['"]([^'"]+)['"]\s*\)/g,    // import('...')
            /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g,   // require('...')
            /export\s+.*\s+from\s*['"]([^'"]+)['"]/g   // export ... from '...'
          ];
          
          for (const pattern of importPatterns) {
            let match;
            while ((match = pattern.exec(line)) !== null) {
              let importPath = match[1];
              
              // 处理相对路径
              if (importPath.startsWith('./') || importPath.startsWith('../')) {
                // 解析相对路径为绝对路径
                const currentDir = path.dirname(file);
                let resolvedPath = path.resolve(currentDir, importPath);
                
                // 如果没有扩展名，尝试添加.ts扩展名
                if (!path.extname(resolvedPath)) {
                  resolvedPath += '.ts';
                }
                
                // 转换为相对于项目根目录的路径
                const relativePath = path.relative('.', resolvedPath);
                referencedFiles.add(relativePath);
                
                // 也尝试添加index.ts的情况
                if (importPath.endsWith('/')) {
                  const indexPath = path.resolve(currentDir, importPath, 'index.ts');
                  const relativeIndexPath = path.relative('.', indexPath);
                  referencedFiles.add(relativeIndexPath);
                }
              }
            }
          }
        }
      } catch (error) {
        // 忽略读取错误
      }
    }
    
    // 找出未被引用的文件
    for (const file of this.allFiles) {
      const relativePath = path.relative('.', file);
      const normalizedPath = relativePath.replace(/\\/g, '/'); // 统一路径分隔符
      
      let isReferenced = false;
      
      // 检查是否被直接引用
      for (const refPath of referencedFiles) {
        const normalizedRefPath = refPath.replace(/\\/g, '/');
        if (normalizedRefPath === normalizedPath || 
            normalizedRefPath === normalizedPath.replace('.ts', '') ||
            normalizedPath.endsWith(normalizedRefPath)) {
          isReferenced = true;
          break;
        }
      }
      
      // 排除一些特殊文件（入口文件、配置文件等）
      const fileName = path.basename(file);
      const isSpecialFile = [
        'main.ts',           // NestJS入口文件
        'app.module.ts',     // 应用模块
        'index.ts'           // 索引文件
      ].includes(fileName) || 
      file.includes('.spec.') ||    // 测试文件
      file.includes('.test.') ||    // 测试文件
      file.includes('e2e') ||       // E2E测试
      file.includes('setup');       // 设置文件
      
      if (!isReferenced && !isSpecialFile) {
        // 进一步检查文件是否真的没有被使用
        // 检查文件名是否在其他文件中被提及
        let mentionedInOtherFiles = false;
        const baseFileName = path.basename(file, '.ts');
        
        for (const otherFile of this.allFiles) {
          if (otherFile === file) continue;
          
          try {
            const content = fs.readFileSync(otherFile, 'utf8');
            // 简单检查文件名是否被提及（可能是动态导入或字符串引用）
            if (content.includes(baseFileName) || content.includes(fileName)) {
              mentionedInOtherFiles = true;
              break;
            }
          } catch (error) {
            // 忽略读取错误
          }
        }
        
        if (!mentionedInOtherFiles) {
          unusedFiles.push({
            file: relativePath,
            size: this.getFileSize(file),
            lastModified: this.getFileLastModified(file)
          });
        }
      }
    }
    
    return unusedFiles;
  }
  
  /**
   * 获取文件大小
   */
  getFileSize(filePath) {
    try {
      const stats = fs.statSync(filePath);
      return stats.size;
    } catch (error) {
      return 0;
    }
  }
  
  /**
   * 获取文件最后修改时间
   */
  getFileLastModified(filePath) {
    try {
      const stats = fs.statSync(filePath);
      return stats.mtime;
    } catch (error) {
      return new Date();
    }
  }

  /**
   * 查找Type与Enum混用冲突
   */
  findTypeEnumConflicts() {
    const conflicts = [];
    
    // 检查Type定义与Enum值之间的重复
    for (const [typeName, typeOccurrences] of this.results.types) {
      if (this.results.enums.has(typeName)) {
        const enumOccurrences = this.results.enums.get(typeName);
        conflicts.push({
          name: typeName,
          typeOccurrences: typeOccurrences,
          enumOccurrences: enumOccurrences
        });
      }
    }
    
    return conflicts;
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
      dtos: [],
      types: []
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
  generateReport(duplicates, unused) {
    let report = '# 重复标识符分析报告\n\n';
    report += `生成时间: ${new Date().toLocaleString()}\n\n`;

    // 统计信息
    const totalConstants = this.results.constants.size;
    const totalEnums = this.results.enums.size;
    const totalDtos = this.results.dtos.size;
    const totalTypes = this.results.types.size;
    const duplicateConstants = duplicates.constants.length;
    const duplicateEnums = duplicates.enums.length;
    const duplicateDtos = duplicates.dtos.length;
    const duplicateTypes = duplicates.types.length;

    report += '## 📊 统计摘要\n\n';
    report += `- 扫描的常量: ${totalConstants} (重复: ${duplicateConstants})\n`;
    report += `- 扫描的枚举: ${totalEnums} (重复: ${duplicateEnums})\n`;
    report += `- 扫描的DTO: ${totalDtos} (重复: ${duplicateDtos})\n`;
    report += `- 扫描的Type: ${totalTypes} (重复: ${duplicateTypes})\n\n`;

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

    // Type重复
    if (duplicates.types.length > 0) {
      report += '## 🔄 重复的Type\n\n';
      for (const duplicate of duplicates.types) {
        report += `### ${duplicate.name}\n\n`;
        report += `发现 ${duplicate.count} 处重复:\n\n`;
        
        for (const occurrence of duplicate.occurrences) {
          report += `- **文件**: \`${occurrence.file}\`\n`;
          report += `  - **行号**: ${occurrence.line}\n`;
          report += `  - **定义**: \`${occurrence.definition}\`\n\n`;
        }
      }
    }

    // Type与Enum混用检测
    const typeEnumConflicts = this.findTypeEnumConflicts();
    if (typeEnumConflicts.length > 0) {
      report += '## ⚠️ Type与Enum混用检测\n\n';
      report += '发现以下Type定义与Enum值存在混用，建议统一使用方式:\n\n';
      
      for (const conflict of typeEnumConflicts) {
        report += `### ${conflict.name}\n\n`;
        report += `发现在Type和Enum中都有定义:\n\n`;
        
        if (conflict.typeOccurrences.length > 0) {
          report += '**Type定义:**\n\n';
          for (const occurrence of conflict.typeOccurrences) {
            report += `- **文件**: \`${occurrence.file}\`\n`;
            report += `  - **行号**: ${occurrence.line}\n`;
            report += `  - **定义**: \`${occurrence.definition}\`\n\n`;
          }
        }
        
        if (conflict.enumOccurrences.length > 0) {
          report += '**Enum定义:**\n\n';
          for (const occurrence of conflict.enumOccurrences) {
            report += `- **文件**: \`${occurrence.file}\`\n`;
            report += `  - **行号**: ${occurrence.line}\n`;
            report += `  - **值**: \`${occurrence.value}\`\n\n`;
          }
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

    // 未使用的项目
    if (unused && (unused.constants.length > 0 || unused.enums.length > 0 || unused.dtos.length > 0)) {
      report += '## 🗑️ 未使用的项目\n\n';
      report += '以下项目可能未被使用，建议考虑清理:\n\n';

      // 未使用的常量
      if (unused.constants.length > 0) {
        report += '### 未使用的常量\n\n';
        for (const unusedItem of unused.constants) {
          report += `#### ${unusedItem.name}\n\n`;
          for (const occurrence of unusedItem.occurrences) {
            report += `- **文件**: \`${occurrence.file}\`\n`;
            report += `  - **行号**: ${occurrence.line}\n`;
            report += `  - **值**: \`${occurrence.value}\`\n\n`;
          }
        }
      }

      // 未使用的枚举
      if (unused.enums.length > 0) {
        report += '### 未使用的枚举\n\n';
        for (const unusedItem of unused.enums) {
          report += `#### ${unusedItem.name}\n\n`;
          for (const occurrence of unusedItem.occurrences) {
            report += `- **文件**: \`${occurrence.file}\`\n`;
            report += `  - **行号**: ${occurrence.line}\n`;
            report += `  - **值**: \`${occurrence.value}\`\n\n`;
          }
        }
      }

      // 未使用的DTO
      if (unused.dtos.length > 0) {
        report += '### 未使用的DTO\n\n';
        for (const unusedItem of unused.dtos) {
          report += `#### ${unusedItem.name}\n\n`;
          for (const occurrence of unusedItem.occurrences) {
            report += `- **文件**: \`${occurrence.file}\`\n`;
            report += `  - **行号**: ${occurrence.line}\n`;
            report += `  - **类型**: ${occurrence.type}\n\n`;
          }
        }
      }

      // 未使用的文件
      if (unused.files.length > 0) {
        report += '### 未使用的文件\n\n';
        report += '以下文件可能没有被其他文件引用，建议检查是否可以删除:\n\n';
        for (const unusedFile of unused.files) {
          report += `#### ${unusedFile.file}\n\n`;
          report += `- **文件大小**: ${(unusedFile.size / 1024).toFixed(2)} KB\n`;
          report += `- **最后修改**: ${unusedFile.lastModified.toLocaleDateString()}\n\n`;
        }
      }
    }

    if (duplicateConstants === 0 && duplicateEnums === 0 && duplicateDtos === 0 && (!duplicates.patterns || duplicates.patterns.length === 0) && (!unused || (unused.constants.length === 0 && unused.enums.length === 0 && unused.dtos.length === 0))) {
      report += '## ✅ 结果\n\n';
      report += '未发现重复的标识符、相似的命名模式或未使用的项目。\n\n';
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

    // 扫描Type定义
    this.scanTypeDefinitions();

    // 扫描所有TypeScript文件以分析使用情况
    this.scanAllFiles();

    // 查找重复项
    console.log('\n🔍 查找重复项...');
    const duplicates = this.findDuplicates();

    // 查找未使用的项目
    console.log('🔍 查找未使用的项目...');
    const unused = this.findUnusedItems();

    // 生成报告
    console.log('📝 生成报告...');
    const report = this.generateReport(duplicates, unused);

    // 保存报告
    const reportPath = path.join('./docs', 'duplicate-analysis-report.md');
    
    // 确保docs目录存在
    if (!fs.existsSync('./docs')) {
      fs.mkdirSync('./docs', { recursive: true });
    }
    
    fs.writeFileSync(reportPath, report, 'utf8');
    
    console.log(`\n✅ 分析完成！报告已保存到: ${reportPath}`);
    
    // 显示简要结果
    const totalDuplicates = duplicates.constants.length + duplicates.enums.length + duplicates.dtos.length + duplicates.types.length;
    const totalPatterns = duplicates.patterns ? duplicates.patterns.length : 0;
    
    if (totalDuplicates > 0) {
      console.log(`\n⚠️  发现 ${totalDuplicates} 个重复标识符:`);
      console.log(`   - 常量: ${duplicates.constants.length}`);
      console.log(`   - 枚举: ${duplicates.enums.length}`);
      console.log(`   - DTO: ${duplicates.dtos.length}`);
      console.log(`   - Type: ${duplicates.types.length}`);
    } else {
      console.log('\n✅ 未发现完全重复的标识符');
    }

    if (totalPatterns > 0) {
      console.log(`\n🎯 发现 ${totalPatterns} 种相似命名模式:`);
      for (const pattern of duplicates.patterns) {
        console.log(`   - ${pattern.pattern}: ${pattern.count} 个常量`);
      }
    }

    // 显示未使用项目的统计
    if (unused && (unused.constants.length > 0 || unused.enums.length > 0 || unused.dtos.length > 0 || unused.files.length > 0)) {
      const totalUnused = unused.constants.length + unused.enums.length + unused.dtos.length;
      console.log(`\n🗑️  发现 ${totalUnused} 个可能未使用的项目:`);
      console.log(`   - 未使用的常量: ${unused.constants.length}`);
      console.log(`   - 未使用的枚举: ${unused.enums.length}`);
      console.log(`   - 未使用的DTO: ${unused.dtos.length}`);
      
      if (unused.files.length > 0) {
        console.log(`   - 未使用的文件: ${unused.files.length}`);
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