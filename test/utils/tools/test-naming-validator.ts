#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-unused-vars */

/**
 * 测试文件命名规范验证器
 * 
 * 功能：
 * 1. 理解当前测试目录的分类结构
 * 2. 验证测试文件的命名规范
 * 3. 检查测试目录结构与 src 目录的一致性
 * 4. 提供重命名和移动建议
 */

import * as fs from 'fs';
import * as path from 'path';

interface TestFileInfo {
  fullPath: string;
  relativePath: string;
  fileName: string;
  testType: 'unit' | 'integration' | 'e2e' | 'security' | 'blackbox' | 'performance';
  isValidNaming: boolean;
  suggestedName?: string;
  correspondingSrcFile?: string;
}

interface DirectoryAnalysis {
  testType: string;
  totalFiles: number;
  validNaming: number;
  invalidNaming: number;
  missingCorrespondingSrc: number;
  extraDirectories: string[];
  missingDirectories: string[];
}

interface NamingValidationResult {
  summary: {
    totalTestFiles: number;
    validNaming: number;
    invalidNaming: number;
    complianceRate: number;
  };
  directoryAnalysis: DirectoryAnalysis[];
  invalidFiles: TestFileInfo[];
  suggestions: string[];
}

class NamingValidator {
  private readonly srcDir: string;
  private readonly testDir: string;
  
  // 测试文件命名规则
  private readonly namingRules = {
    unit: {
      pattern: /\.spec\.ts$/,
      description: '单元测试文件应以 .spec.ts 结尾'
    },
    integration: {
      pattern: /\.integration\.test\.ts$/,
      description: '集成测试文件应以 .integration.test.ts 结尾'
    },
    e2e: {
      pattern: /\.e2e\.test\.ts$/,
      description: 'E2E测试文件应以 .e2e.test.ts 结尾'
    },
    security: {
      pattern: /\.security\.test\.ts$/,
      description: '安全测试文件应以 .security.test.ts 结尾'
    },
    blackbox: {
      pattern: /\.e2e\.test\.ts$/,
      description: '黑盒测试文件应以 .e2e.test.ts 结尾'
    },
    performance: {
      pattern: /\.(spec|perf\.test)\.ts$/,
      description: '性能测试文件应以 .spec.ts 或 .perf.test.ts 结尾'
    }
  };

  // 目标测试目录结构
  private readonly targetTestTypes = ['unit', 'integration', 'e2e', 'security'];

  constructor(projectRoot: string = process.cwd()) {
    this.srcDir = path.join(projectRoot, 'src');
    this.testDir = path.join(projectRoot, 'test/jest');
  }

  /**
   * 执行完整的命名验证
   */
  async validateNaming(): Promise<NamingValidationResult> {
    console.log('🔍 开始测试文件命名规范验证...\n');

    const srcStructure = this.scanSrcDirectory();
    const testFiles = this.scanTestFiles();
    const directoryAnalysis = this.analyzeDirectoryStructure(testFiles, srcStructure);

    const invalidFiles = testFiles.filter(file => !file.isValidNaming);
    const validFiles = testFiles.filter(file => file.isValidNaming);

    const result: NamingValidationResult = {
      summary: {
        totalTestFiles: testFiles.length,
        validNaming: validFiles.length,
        invalidNaming: invalidFiles.length,
        complianceRate: testFiles.length > 0 ? (validFiles.length / testFiles.length) * 100 : 0
      },
      directoryAnalysis,
      invalidFiles,
      suggestions: this.generateSuggestions(directoryAnalysis, invalidFiles)
    };

    this.printValidationResult(result);
    return result;
  }

  /**
   * 扫描源代码目录
   */
  private scanSrcDirectory(): Set<string> {
    const srcFiles = new Set<string>();

    const scan = (dirPath: string, relativePath: string = '') => {
      if (!fs.existsSync(dirPath)) return;

      const items = fs.readdirSync(dirPath);

      for (const item of items) {
        const fullPath = path.join(dirPath, item);
        const relativeItemPath = relativePath ? path.join(relativePath, item) : item;

        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
          scan(fullPath, relativeItemPath);
        } else if (stat.isFile() && item.endsWith('.ts')) {
          srcFiles.add(relativeItemPath.replace(/\.ts$/, ''));
        }
      }
    };

    scan(this.srcDir);
    return srcFiles;
  }

  /**
   * 扫描测试文件
   */
  private scanTestFiles(): TestFileInfo[] {
    const testFiles: TestFileInfo[] = [];

    const scan = (dirPath: string, testType: string) => {
      if (!fs.existsSync(dirPath)) return;

      const items = fs.readdirSync(dirPath);

      for (const item of items) {
        const fullPath = path.join(dirPath, item);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
          scan(fullPath, testType);
        } else if (stat.isFile() && item.endsWith('.ts')) {
          const relativePath = path.relative(path.join(this.testDir, testType), fullPath);
          const correspondingSrcFile = this.findCorrespondingSrcFile(relativePath, testType);
          
          testFiles.push({
            fullPath,
            relativePath,
            fileName: item,
            testType: testType as any,
            isValidNaming: this.isValidNaming(item, testType),
            suggestedName: this.isValidNaming(item, testType) ? undefined : this.suggestCorrectName(item, testType),
            correspondingSrcFile
          });
        }
      }
    };

    // 扫描所有测试类型目录
    const testTypeDirectories = fs.readdirSync(this.testDir)
      .filter(item => {
        const fullPath = path.join(this.testDir, item);
        return fs.statSync(fullPath).isDirectory();
      });

    for (const testType of testTypeDirectories) {
      const testTypePath = path.join(this.testDir, testType);
      scan(testTypePath, testType);
    }

    return testFiles;
  }

  /**
   * 验证文件命名是否正确
   */
  private isValidNaming(fileName: string, testType: string): boolean {
    const rule = this.namingRules[testType as keyof typeof this.namingRules];
    if (!rule) return false;
    return rule.pattern.test(fileName);
  }

  /**
   * 建议正确的文件名
   */
  private suggestCorrectName(fileName: string, testType: string): string {
    const rule = this.namingRules[testType as keyof typeof this.namingRules];
    if (!rule) return fileName;

    // 移除现有的测试后缀
    let baseName = fileName.replace(/\.(spec|test|e2e|integration|security|perf)\.ts$/, '');
    baseName = baseName.replace(/\.ts$/, '');

    // 根据测试类型添加正确的后缀
    switch (testType) {
      case 'unit':
        return `${baseName}.spec.ts`;
      case 'integration':
        return `${baseName}.integration.test.ts`;
      case 'e2e':
      case 'blackbox':
        return `${baseName}.e2e.test.ts`;
      case 'security':
        return `${baseName}.security.test.ts`;
      case 'performance':
        return `${baseName}.perf.test.ts`;
      default:
        return fileName;
    }
  }

  /**
   * 查找对应的源文件
   */
  private findCorrespondingSrcFile(testRelativePath: string, testType: string): string | undefined {
    // 移除测试文件的扩展名和测试后缀
    let srcPath = testRelativePath.replace(/\.(spec|test|e2e|integration|security|perf)\.ts$/, '');
    srcPath = srcPath.replace(/\.ts$/, '');
    
    const fullSrcPath = path.join(this.srcDir, `${srcPath}.ts`);
    
    if (fs.existsSync(fullSrcPath)) {
      return `src/${srcPath}.ts`;
    }

    return undefined;
  }

  /**
   * 分析目录结构
   */
  private analyzeDirectoryStructure(testFiles: TestFileInfo[], srcFiles: Set<string>): DirectoryAnalysis[] {
    const analysis: DirectoryAnalysis[] = [];

    // 按测试类型分组
    const testsByType = testFiles.reduce((acc, file) => {
      if (!acc[file.testType]) {
        acc[file.testType] = [];
      }
      acc[file.testType].push(file);
      return acc;
    }, {} as Record<string, TestFileInfo[]>);

    for (const [testType, files] of Object.entries(testsByType)) {
      const validFiles = files.filter(f => f.isValidNaming);
      const invalidFiles = files.filter(f => !f.isValidNaming);
      const missingCorrespondingSrc = files.filter(f => !f.correspondingSrcFile);

      // 检查目录结构
      const testTypePath = path.join(this.testDir, testType);
      const testDirs = this.getDirectoryStructure(testTypePath);
      const srcDirs = Array.from(srcFiles).map(f => path.dirname(f)).filter((v, i, a) => a.indexOf(v) === i);

      const extraDirectories = testDirs.filter(dir => !srcDirs.includes(dir));
      const missingDirectories = srcDirs.filter(dir => !testDirs.includes(dir));

      analysis.push({
        testType,
        totalFiles: files.length,
        validNaming: validFiles.length,
        invalidNaming: invalidFiles.length,
        missingCorrespondingSrc: missingCorrespondingSrc.length,
        extraDirectories,
        missingDirectories
      });
    }

    return analysis;
  }

  /**
   * 获取目录结构
   */
  private getDirectoryStructure(basePath: string): string[] {
    const dirs: string[] = [];

    const scan = (dirPath: string, relativePath: string = '') => {
      if (!fs.existsSync(dirPath)) return;

      const items = fs.readdirSync(dirPath);

      for (const item of items) {
        const fullPath = path.join(dirPath, item);
        const relativeItemPath = relativePath ? path.join(relativePath, item) : item;

        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
          dirs.push(relativeItemPath);
          scan(fullPath, relativeItemPath);
        }
      }
    };

    scan(basePath);
    return dirs;
  }

  /**
   * 生成改进建议
   */
  private generateSuggestions(directoryAnalysis: DirectoryAnalysis[], invalidFiles: TestFileInfo[]): string[] {
    const suggestions: string[] = [];

    // 整体建议
    suggestions.push('🎯 测试目录结构优化建议:');

    // 命名规范建议
    if (invalidFiles.length > 0) {
      suggestions.push(`\n📝 文件命名规范化 (${invalidFiles.length} 个文件需要重命名):`);
      
      const byType = invalidFiles.reduce((acc, file) => {
        if (!acc[file.testType]) acc[file.testType] = [];
        acc[file.testType].push(file);
        return acc;
      }, {} as Record<string, TestFileInfo[]>);

      for (const [testType, files] of Object.entries(byType)) {
        suggestions.push(`   ${testType}: ${files.length} 个文件`);
        files.slice(0, 3).forEach(file => {
          suggestions.push(`     • ${file.fileName} → ${file.suggestedName}`);
        });
        if (files.length > 3) {
          suggestions.push(`     • ... 还有 ${files.length - 3} 个文件`);
        }
      }
    }

    // 目录结构建议
    directoryAnalysis.forEach(analysis => {
      if (analysis.missingDirectories.length > 0 || analysis.extraDirectories.length > 0) {
        suggestions.push(`\n🏗️  ${analysis.testType} 目录结构调整:`);
        
        if (analysis.missingDirectories.length > 0) {
          suggestions.push(`   缺失目录 (${analysis.missingDirectories.length}): ${analysis.missingDirectories.slice(0, 3).join(', ')}${analysis.missingDirectories.length > 3 ? '...' : ''}`);
        }
        
        if (analysis.extraDirectories.length > 0) {
          suggestions.push(`   多余目录 (${analysis.extraDirectories.length}): ${analysis.extraDirectories.slice(0, 3).join(', ')}${analysis.extraDirectories.length > 3 ? '...' : ''}`);
        }
      }
    });

    // 合规性建议
    const totalFiles = directoryAnalysis.reduce((sum, analysis) => sum + analysis.totalFiles, 0);
    const totalValid = directoryAnalysis.reduce((sum, analysis) => sum + analysis.validNaming, 0);
    const complianceRate = totalFiles > 0 ? (totalValid / totalFiles) * 100 : 0;

    suggestions.push(`\n📊 当前合规率: ${complianceRate.toFixed(1)}%`);
    
    if (complianceRate < 90) {
      suggestions.push('   建议: 优先处理命名不规范的文件，提高测试代码质量');
    } else if (complianceRate < 100) {
      suggestions.push('   建议: 接近完全合规，建议处理剩余的命名问题');
    } else {
      suggestions.push('   状态: 🎉 命名规范完全合规！');
    }

    // 执行建议
    suggestions.push('\n🚀 执行建议:');
    suggestions.push('   1. 运行 test-structure-validator.ts 来生成完整的迁移计划');
    suggestions.push('   2. 使用 --execute 参数执行自动化重命名');
    suggestions.push('   3. 手动检查生成的测试文件模板');
    suggestions.push('   4. 运行测试确保迁移成功');

    return suggestions;
  }

  /**
   * 打印验证结果
   */
  private printValidationResult(result: NamingValidationResult): void {
    console.log('📋 测试文件命名规范验证报告');
    console.log('='.repeat(50));

    // 总体统计
    console.log('\n📊 总体统计:');
    console.log(`   总测试文件数: ${result.summary.totalTestFiles}`);
    console.log(`   命名规范文件: ${result.summary.validNaming}`);
    console.log(`   命名不规范文件: ${result.summary.invalidNaming}`);
    console.log(`   合规率: ${result.summary.complianceRate.toFixed(1)}%`);

    // 按测试类型分析
    console.log('\n📁 按测试类型分析:');
    result.directoryAnalysis.forEach(analysis => {
      const complianceRate = analysis.totalFiles > 0 ? 
        (analysis.validNaming / analysis.totalFiles) * 100 : 0;
      
      console.log(`\n   ${analysis.testType.toUpperCase()}:`);
      console.log(`     文件总数: ${analysis.totalFiles}`);
      console.log(`     命名正确: ${analysis.validNaming}`);
      console.log(`     命名错误: ${analysis.invalidNaming}`);
      console.log(`     合规率: ${complianceRate.toFixed(1)}%`);
      console.log(`     缺失对应源文件: ${analysis.missingCorrespondingSrc}`);
      
      if (analysis.missingDirectories.length > 0) {
        console.log(`     缺失目录: ${analysis.missingDirectories.length} 个`);
      }
      
      if (analysis.extraDirectories.length > 0) {
        console.log(`     多余目录: ${analysis.extraDirectories.length} 个`);
      }
    });

    // 命名不规范的文件
    if (result.invalidFiles.length > 0) {
      console.log('\n❌ 命名不规范的文件:');
      result.invalidFiles.slice(0, 10).forEach(file => {
        console.log(`   ${file.testType}/${file.relativePath}`);
        console.log(`     建议: ${file.suggestedName}`);
      });
      
      if (result.invalidFiles.length > 10) {
        console.log(`   ... 还有 ${result.invalidFiles.length - 10} 个文件`);
      }
    }

    // 改进建议
    if (result.suggestions.length > 0) {
      console.log('\n💡 改进建议:');
      result.suggestions.forEach(suggestion => {
        console.log(`${suggestion}`);
      });
    }
  }

  /**
   * 生成重命名脚本
   */
  async generateRenameScript(result: NamingValidationResult): Promise<string> {
    const scriptLines: string[] = [
      '#!/bin/bash',
      '# 自动生成的测试文件重命名脚本',
      '# 执行前请备份测试文件',
      '',
      'echo "开始批量重命名测试文件..."',
      ''
    ];

    result.invalidFiles.forEach(file => {
      if (file.suggestedName) {
        const oldPath = file.fullPath;
        const newPath = path.join(path.dirname(file.fullPath), file.suggestedName);
        scriptLines.push(`echo "重命名: ${file.fileName} -> ${file.suggestedName}"`);
        scriptLines.push(`mv "${oldPath}" "${newPath}"`);
        scriptLines.push('');
      }
    });

    scriptLines.push('echo "重命名完成!"');

    const script = scriptLines.join('\n');
    const scriptPath = path.join(this.testDir, '../utils/rename-test-files.sh');
    
    fs.writeFileSync(scriptPath, script, { mode: 0o755 });
    console.log(`\n📜 重命名脚本已生成: ${scriptPath}`);
    
    return scriptPath;
  }
}

// CLI 执行
if (require.main === module) {
  const validator = new NamingValidator();
  const shouldGenerateScript = process.argv.includes('--generate-script') || process.argv.includes('-g');

  validator.validateNaming().then(result => {
    if (shouldGenerateScript) {
      return validator.generateRenameScript(result);
    }
  }).catch(error => {
    console.error('❌ 执行失败:', error);
    process.exit(1);
  });
}

export { NamingValidator, NamingValidationResult, TestFileInfo, DirectoryAnalysis };
