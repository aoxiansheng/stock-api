/**
 * 测试覆盖率映射工具
 * 生成测试覆盖率映射关系，整合各种覆盖率工具
 */

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

// 导入覆盖率相关工具
try {
  require('./coverage-analyzer');
  require('./coverage-gate-checker');
  require('./coverage-merger');
  require('./coverage-trend-checker');
} catch (error) {
  console.log('覆盖率工具加载信息:', error.message);
}

interface CoverageMapping {
  sourceFile: string;
  testFiles: string[];
  coveragePercent?: number;
}

interface ModuleCoverage {
  module: string;
  sourceFiles: number;
  testFiles: number;
  coverage: number;
  mappings: CoverageMapping[];
}

/**
 * 获取项目路径
 */
function getProjectPath(): string {
  return path.resolve(__dirname, '..', '..');
}

/**
 * 扫描源代码文件
 */
function scanSourceFiles(modulePath: string): string[] {
  try {
    const result = execSync(`find ${modulePath} -name "*.ts" | grep -v ".spec.ts" | grep -v ".test.ts" | sort`).toString();
    return result.split('\n').filter(Boolean);
  } catch (error) {
    console.error('扫描源文件失败:', error.message);
    return [];
  }
}

/**
 * 扫描测试文件
 */
function scanTestFiles(): string[] {
  try {
    const result = execSync(`find test/jest -name "*.ts" | sort`).toString();
    return result.split('\n').filter(Boolean);
  } catch (error) {
    console.error('扫描测试文件失败:', error.message);
    return [];
  }
}

/**
 * 获取模块列表
 */
function getModuleList(): string[] {
  try {
    const result = execSync('find src -type d -maxdepth 1 | sort').toString();
    return result
      .split('\n')
      .filter(Boolean)
      .filter(dir => dir !== 'src');
  } catch (error) {
    console.error('获取模块列表失败:', error.message);
    return [];
  }
}

/**
 * 为源文件查找可能的测试文件
 */
function findTestFilesForSource(sourceFile: string, allTestFiles: string[]): string[] {
  // 提取基本文件名（不带扩展名和路径）
  const baseName = path.basename(sourceFile, '.ts');
  const modulePathParts = sourceFile.split('/');
  const moduleName = modulePathParts[1]; // src/{module}/...
  
  // 查找匹配的测试文件
  return allTestFiles.filter(testFile => {
    // 1. 检查是否包含源文件名
    const includesBaseName = path.basename(testFile).includes(baseName);
    
    // 2. 检查是否是同一个模块
    const includesModule = testFile.includes(`/${moduleName}/`);
    
    return includesBaseName && includesModule;
  });
}

/**
 * 估算覆盖率（根据测试文件数量）
 */
function estimateCoverage(sourceFile: string, testFiles: string[]): number {
  if (testFiles.length === 0) {
    return 0;
  }
  
  // 基于测试文件数量的简单估算
  return Math.min(100, testFiles.length * 25);
}

/**
 * 生成覆盖率映射
 */
function generateCoverageMapping(): ModuleCoverage[] {
  console.log('📊 开始生成测试覆盖率映射...');
  
  const projectPath = getProjectPath();
  const moduleList = getModuleList();
  const allTestFiles = scanTestFiles();
  
  const moduleCoverages: ModuleCoverage[] = [];
  
  for (const modulePath of moduleList) {
    const moduleName = path.basename(modulePath);
    const sourceFiles = scanSourceFiles(modulePath);
    
    const mappings: CoverageMapping[] = [];
    let totalCoverage = 0;
    
    for (const sourceFile of sourceFiles) {
      const testFiles = findTestFilesForSource(sourceFile, allTestFiles);
      const coveragePercent = estimateCoverage(sourceFile, testFiles);
      
      mappings.push({
        sourceFile,
        testFiles,
        coveragePercent
      });
      
      totalCoverage += coveragePercent;
    }
    
    const avgCoverage = sourceFiles.length > 0 
      ? totalCoverage / sourceFiles.length 
      : 0;
    
    moduleCoverages.push({
      module: moduleName,
      sourceFiles: sourceFiles.length,
      testFiles: mappings.reduce((acc, m) => acc + m.testFiles.length, 0),
      coverage: Math.round(avgCoverage),
      mappings
    });
  }
  
  return moduleCoverages;
}

/**
 * 输出覆盖率映射报告
 */
function outputCoverageMappingReport(coverage: ModuleCoverage[]): void {
  console.log('\n📋 测试覆盖率映射报告');
  console.log('='.repeat(80));
  
  for (const moduleCoverage of coverage) {
    console.log(`\n📁 模块: ${moduleCoverage.module}`);
    console.log(`   源文件数: ${moduleCoverage.sourceFiles}`);
    console.log(`   测试文件数: ${moduleCoverage.testFiles}`);
    console.log(`   估计覆盖率: ${moduleCoverage.coverage}%`);
    
    // 输出未覆盖文件
    const uncoveredFiles = moduleCoverage.mappings
      .filter(m => m.testFiles.length === 0)
      .map(m => m.sourceFile);
    
    if (uncoveredFiles.length > 0) {
      console.log(`\n   ⚠️ 未覆盖文件 (${uncoveredFiles.length}):`);
      uncoveredFiles.forEach((file, i) => {
        if (i < 5) { // 只显示前5个
          console.log(`     - ${file}`);
        }
      });
      
      if (uncoveredFiles.length > 5) {
        console.log(`     ... 还有 ${uncoveredFiles.length - 5} 个文件未显示`);
      }
    }
  }
  
  // 总结报告
  const totalSourceFiles = coverage.reduce((acc, m) => acc + m.sourceFiles, 0);
  const totalTestFiles = coverage.reduce((acc, m) => acc + m.testFiles, 0);
  const weightedAvgCoverage = coverage.reduce((acc, m) => acc + (m.coverage * m.sourceFiles), 0) / totalSourceFiles;
  
  console.log('\n📊 总结');
  console.log('-'.repeat(80));
  console.log(`总源文件数: ${totalSourceFiles}`);
  console.log(`总测试文件数: ${totalTestFiles}`);
  console.log(`测试/源文件比例: ${(totalTestFiles / totalSourceFiles).toFixed(2)}`);
  console.log(`估计总体覆盖率: ${Math.round(weightedAvgCoverage)}%`);
  
  // 保存完整报告到文件
  const reportPath = path.join(getProjectPath(), 'test-results', 'coverage-mapping.json');
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, JSON.stringify(coverage, null, 2));
  console.log(`\n✅ 完整映射报告已保存到: ${reportPath}`);
}

/**
 * 主函数
 */
function main(): void {
  try {
    const coverageMapping = generateCoverageMapping();
    outputCoverageMappingReport(coverageMapping);
    console.log('\n✅ 覆盖率映射生成完成');
  } catch (error) {
    console.error('\n❌ 覆盖率映射生成失败:', error.message);
    process.exit(1);
  }
}

// 运行主函数
main(); 