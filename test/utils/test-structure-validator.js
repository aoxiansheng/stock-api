/**
 * 自动化测试结构验证器
 * Automated Test Structure Validator
 * 
 * 用于验证测试文件结构、覆盖率和质量的自动化工具
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

export class TestStructureValidator {
  
  constructor(options = {}) {
    this.rootPath = options.rootPath || path.join(process.cwd(), 'test');
    this.requirements = options.requirements || this.getDefaultRequirements();
    this.results = {
      structure: {},
      coverage: {},
      quality: {},
      compliance: {},
      summary: {}
    };
  }

  /**
   * 获取默认测试要求
   */
  getDefaultRequirements() {
    return {
      structure: {
        requiredDirectories: [
          'jest/unit',
          'jest/integration', 
          'jest/e2e',
          'k6/stress',
          'fixtures',
          'utils'
        ],
        requiredFiles: [
          'jest.config.js',
          'fixtures/test-data-factory.js',
          'fixtures/performance-baselines.json',
          'utils/test-structure-validator.js'
        ]
      },
      coverage: {
        minIntegrationTests: 5,
        minE2eTests: 4,
        minPerformanceTests: 3,
        requiredTestPatterns: [
          'auth',
          'monitoring', 
          'common',
          'data-processing'
        ]
      },
      quality: {
        minDescribeBlocks: 3,
        minTestCases: 5,
        requiredTestTypes: [
          'success scenarios',
          'error handling',
          'validation',
          'performance'
        ],
        maxFileSize: 50000, // 50KB
        minDocumentationRatio: 0.1 // 10% comments
      },
      compliance: {
        namingConventions: {
          testFiles: /\.(test|spec)\.(js|ts)$/,
          perfFiles: /\.perf\.test\.js$/,
          suiteNames: /^[A-Z][a-zA-Z0-9\s]+Tests?$/
        },
        requiredMetadata: [
          'describe blocks',
          'it blocks', 
          'assertions',
          'setup/teardown'
        ]
      }
    };
  }

  /**
   * 执行完整的测试结构验证
   */
  async validate() {
    console.log('🔍 开始测试结构验证...');
    
    try {
      this.validateDirectoryStructure();
      this.validateTestCoverage();
      this.validateTestQuality();
      this.validateCompliance();
      this.generateSummary();
      
      console.log('✅ 测试结构验证完成');
      return this.results;
    } catch (error) {
      console.error('❌ 测试结构验证失败:', error.message);
      throw error;
    }
  }

  /**
   * 验证目录结构
   */
  validateDirectoryStructure() {
    console.log('📁 验证目录结构...');
    
    const structure = {
      existing: [],
      missing: [],
      extra: [],
      files: {
        existing: [],
        missing: []
      }
    };

    // 检查必需目录
    this.requirements.structure.requiredDirectories.forEach(dir => {
      const fullPath = path.join(this.rootPath, dir);
      if (fs.existsSync(fullPath)) {
        structure.existing.push(dir);
      } else {
        structure.missing.push(dir);
      }
    });

    // 检查必需文件
    this.requirements.structure.requiredFiles.forEach(file => {
      const fullPath = path.join(this.rootPath, file);
      if (fs.existsSync(fullPath)) {
        structure.files.existing.push(file);
      } else {
        structure.files.missing.push(file);
      }
    });

    // 扫描额外目录
    const allDirs = this.scanDirectories(this.rootPath);
    structure.extra = allDirs.filter(dir => 
      !this.requirements.structure.requiredDirectories.includes(dir) &&
      !dir.includes('node_modules') &&
      !dir.includes('.git')
    );

    this.results.structure = structure;
    
    console.log(`  ✓ 找到目录: ${structure.existing.length}/${this.requirements.structure.requiredDirectories.length}`);
    console.log(`  ✓ 找到文件: ${structure.files.existing.length}/${this.requirements.structure.requiredFiles.length}`);
    
    if (structure.missing.length > 0) {
      console.log(`  ⚠️ 缺失目录: ${structure.missing.join(', ')}`);
    }
    if (structure.files.missing.length > 0) {
      console.log(`  ⚠️ 缺失文件: ${structure.files.missing.join(', ')}`);
    }
  }

  /**
   * 验证测试覆盖率
   */
  validateTestCoverage() {
    console.log('📊 验证测试覆盖率...');
    
    const coverage = {
      integration: this.scanTestFiles('jest/integration'),
      e2e: this.scanTestFiles('jest/e2e'),
      performance: this.scanTestFiles('k6'),
      patterns: {},
      summary: {}
    };

    // 检查测试模式覆盖
    this.requirements.coverage.requiredTestPatterns.forEach(pattern => {
      coverage.patterns[pattern] = {
        integration: coverage.integration.filter(f => f.includes(pattern)).length,
        e2e: coverage.e2e.filter(f => f.includes(pattern)).length,
        performance: coverage.performance.filter(f => f.includes(pattern)).length
      };
    });

    // 生成覆盖率摘要
    coverage.summary = {
      totalIntegration: coverage.integration.length,
      totalE2e: coverage.e2e.length,
      totalPerformance: coverage.performance.length,
      integrationMet: coverage.integration.length >= this.requirements.coverage.minIntegrationTests,
      e2eMet: coverage.e2e.length >= this.requirements.coverage.minE2eTests,
      performanceMet: coverage.performance.length >= this.requirements.coverage.minPerformanceTests,
      patternsCovered: Object.keys(coverage.patterns).length
    };

    this.results.coverage = coverage;
    
    console.log(`  ✓ 集成测试: ${coverage.summary.totalIntegration} (要求: ${this.requirements.coverage.minIntegrationTests})`);
    console.log(`  ✓ E2E测试: ${coverage.summary.totalE2e} (要求: ${this.requirements.coverage.minE2eTests})`);
    console.log(`  ✓ 性能测试: ${coverage.summary.totalPerformance} (要求: ${this.requirements.coverage.minPerformanceTests})`);
    console.log(`  ✓ 覆盖模式: ${coverage.summary.patternsCovered}/${this.requirements.coverage.requiredTestPatterns.length}`);
  }

  /**
   * 验证测试质量
   */
  validateTestQuality() {
    console.log('⚡ 验证测试质量...');
    
    const quality = {
      files: [],
      metrics: {
        totalFiles: 0,
        averageSize: 0,
        averageDescribeBlocks: 0,
        averageTestCases: 0,
        averageDocumentationRatio: 0
      },
      issues: [],
      recommendations: []
    };

    const allTestFiles = [
      ...this.scanTestFiles('jest', true),
      ...this.scanTestFiles('k6', true)
    ];

    allTestFiles.forEach(filePath => {
      const fileAnalysis = this.analyzeTestFile(filePath);
      quality.files.push(fileAnalysis);

      // 检查质量问题
      if (fileAnalysis.size > this.requirements.quality.maxFileSize) {
        quality.issues.push(`文件过大: ${filePath} (${fileAnalysis.size} bytes)`);
      }
      
      if (fileAnalysis.describeBlocks < this.requirements.quality.minDescribeBlocks) {
        quality.issues.push(`describe块不足: ${filePath} (${fileAnalysis.describeBlocks})`);
      }
      
      if (fileAnalysis.testCases < this.requirements.quality.minTestCases) {
        quality.issues.push(`测试用例不足: ${filePath} (${fileAnalysis.testCases})`);
      }
      
      if (fileAnalysis.documentationRatio < this.requirements.quality.minDocumentationRatio) {
        quality.recommendations.push(`建议增加注释: ${filePath} (${(fileAnalysis.documentationRatio * 100).toFixed(1)}%)`);
      }
    });

    // 计算平均指标
    if (quality.files.length > 0) {
      quality.metrics.totalFiles = quality.files.length;
      quality.metrics.averageSize = Math.round(
        quality.files.reduce((sum, f) => sum + f.size, 0) / quality.files.length
      );
      quality.metrics.averageDescribeBlocks = Math.round(
        quality.files.reduce((sum, f) => sum + f.describeBlocks, 0) / quality.files.length * 10
      ) / 10;
      quality.metrics.averageTestCases = Math.round(
        quality.files.reduce((sum, f) => sum + f.testCases, 0) / quality.files.length * 10
      ) / 10;
      quality.metrics.averageDocumentationRatio = Math.round(
        quality.files.reduce((sum, f) => sum + f.documentationRatio, 0) / quality.files.length * 1000
      ) / 10;
    }

    this.results.quality = quality;
    
    console.log(`  ✓ 分析文件: ${quality.metrics.totalFiles}`);
    console.log(`  ✓ 平均大小: ${quality.metrics.averageSize} bytes`);
    console.log(`  ✓ 平均describe块: ${quality.metrics.averageDescribeBlocks}`);
    console.log(`  ✓ 平均测试用例: ${quality.metrics.averageTestCases}`);
    console.log(`  ✓ 平均注释率: ${quality.metrics.averageDocumentationRatio}%`);
    
    if (quality.issues.length > 0) {
      console.log(`  ⚠️ 发现问题: ${quality.issues.length}`);
    }
  }

  /**
   * 验证合规性
   */
  validateCompliance() {
    console.log('📋 验证合规性...');
    
    const compliance = {
      naming: {
        valid: [],
        invalid: []
      },
      structure: {
        valid: [],
        invalid: []
      },
      metadata: {},
      score: 0
    };

    // 检查命名约定
    const allFiles = this.getAllTestFiles();
    allFiles.forEach(file => {
      const fileName = path.basename(file);
      const isValid = this.requirements.compliance.namingConventions.testFiles.test(fileName) ||
                     this.requirements.compliance.namingConventions.perfFiles.test(fileName);
      
      if (isValid) {
        compliance.naming.valid.push(file);
      } else {
        compliance.naming.invalid.push(file);
      }
    });

    // 检查测试套件命名
    allFiles.forEach(file => {
      const content = fs.readFileSync(file, 'utf8');
      const describeMatches = content.match(/describe\(['"`]([^'"`]+)['"`]/g) || [];
      
      describeMatches.forEach(match => {
        const suiteName = match.match(/['"`]([^'"`]+)['"`]/)[1];
        const isValid = this.requirements.compliance.namingConventions.suiteNames.test(suiteName);
        
        if (isValid) {
          compliance.structure.valid.push(`${file}: ${suiteName}`);
        } else {
          compliance.structure.invalid.push(`${file}: ${suiteName}`);
        }
      });
    });

    // 计算合规分数
    const totalNaming = compliance.naming.valid.length + compliance.naming.invalid.length;
    const totalStructure = compliance.structure.valid.length + compliance.structure.invalid.length;
    
    const namingScore = totalNaming > 0 ? (compliance.naming.valid.length / totalNaming) : 1;
    const structureScore = totalStructure > 0 ? (compliance.structure.valid.length / totalStructure) : 1;
    
    compliance.score = Math.round((namingScore + structureScore) / 2 * 100);

    this.results.compliance = compliance;
    
    console.log(`  ✓ 文件命名合规: ${compliance.naming.valid.length}/${totalNaming}`);
    console.log(`  ✓ 结构命名合规: ${compliance.structure.valid.length}/${totalStructure}`);
    console.log(`  ✓ 合规分数: ${compliance.score}%`);
  }

  /**
   * 生成验证摘要
   */
  generateSummary() {
    console.log('📋 生成验证摘要...');
    
    const summary = {
      overall: 'unknown',
      scores: {},
      recommendations: [],
      criticalIssues: [],
      timestamp: new Date().toISOString()
    };

    // 计算各项分数
    summary.scores.structure = this.calculateStructureScore();
    summary.scores.coverage = this.calculateCoverageScore();
    summary.scores.quality = this.calculateQualityScore();
    summary.scores.compliance = this.results.compliance.score;
    
    // 计算总体分数
    const totalScore = Object.values(summary.scores).reduce((sum, score) => sum + score, 0) / 4;
    summary.scores.overall = Math.round(totalScore);

    // 确定总体评级
    if (totalScore >= 90) {
      summary.overall = 'excellent';
    } else if (totalScore >= 80) {
      summary.overall = 'good';
    } else if (totalScore >= 70) {
      summary.overall = 'acceptable';
    } else {
      summary.overall = 'needs_improvement';
    }

    // 生成建议
    summary.recommendations = this.generateRecommendations();
    summary.criticalIssues = this.identifyCriticalIssues();

    this.results.summary = summary;
    
    console.log(`  ✓ 总体评级: ${summary.overall.toUpperCase()}`);
    console.log(`  ✓ 总体分数: ${summary.scores.overall}%`);
    console.log(`  ✓ 结构分数: ${summary.scores.structure}%`);
    console.log(`  ✓ 覆盖分数: ${summary.scores.coverage}%`);
    console.log(`  ✓ 质量分数: ${summary.scores.quality}%`);
    console.log(`  ✓ 合规分数: ${summary.scores.compliance}%`);
    
    if (summary.criticalIssues.length > 0) {
      console.log(`  ⚠️ 关键问题: ${summary.criticalIssues.length}`);
    }
  }

  /**
   * 扫描目录
   */
  scanDirectories(rootPath, relativePath = '') {
    const directories = [];
    const currentPath = path.join(rootPath, relativePath);
    
    if (!fs.existsSync(currentPath)) {
      return directories;
    }
    
    const items = fs.readdirSync(currentPath, { withFileTypes: true });
    
    for (const item of items) {
      if (item.isDirectory() && !item.name.startsWith('.')) {
        const dirPath = path.join(relativePath, item.name);
        directories.push(dirPath);
        directories.push(...this.scanDirectories(rootPath, dirPath));
      }
    }
    
    return directories;
  }

  /**
   * 扫描测试文件
   */
  scanTestFiles(subDir, fullPath = false) {
    const testFiles = [];
    const scanPath = path.join(this.rootPath, subDir);
    
    if (!fs.existsSync(scanPath)) {
      return testFiles;
    }
    
    const scan = (dir) => {
      const items = fs.readdirSync(dir, { withFileTypes: true });
      
      for (const item of items) {
        const itemPath = path.join(dir, item.name);
        
        if (item.isDirectory()) {
          scan(itemPath);
        } else if (item.isFile() && this.isTestFile(item.name)) {
          testFiles.push(fullPath ? itemPath : path.relative(this.rootPath, itemPath));
        }
      }
    };
    
    scan(scanPath);
    return testFiles;
  }

  /**
   * 检查是否为测试文件
   */
  isTestFile(fileName) {
    return /\.(test|spec)\.(js|ts)$/.test(fileName) || /\.perf\.test\.js$/.test(fileName);
  }

  /**
   * 分析测试文件
   */
  analyzeTestFile(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    const stats = fs.statSync(filePath);
    
    const analysis = {
      path: filePath,
      size: stats.size,
      lines: content.split('\n').length,
      describeBlocks: (content.match(/describe\(/g) || []).length,
      testCases: (content.match(/it\(|test\(/g) || []).length,
      assertions: (content.match(/expect\(|assert\.|check\(/g) || []).length,
      comments: (content.match(/\/\/|\/\*|\*/g) || []).length,
      documentationRatio: 0
    };
    
    // 计算注释比例
    const totalCharacters = content.length;
    const commentCharacters = analysis.comments * 20; // 估算每个注释20字符
    analysis.documentationRatio = totalCharacters > 0 ? commentCharacters / totalCharacters : 0;
    
    return analysis;
  }

  /**
   * 获取所有测试文件
   */
  getAllTestFiles() {
    return [
      ...this.scanTestFiles('jest', true),
      ...this.scanTestFiles('k6', true)
    ];
  }

  /**
   * 计算结构分数
   */
  calculateStructureScore() {
    const structure = this.results.structure;
    const requiredDirs = this.requirements.structure.requiredDirectories.length;
    const requiredFiles = this.requirements.structure.requiredFiles.length;
    
    const dirScore = (structure.existing.length / requiredDirs) * 50;
    const fileScore = (structure.files.existing.length / requiredFiles) * 50;
    
    return Math.round(dirScore + fileScore);
  }

  /**
   * 计算覆盖分数
   */
  calculateCoverageScore() {
    const coverage = this.results.coverage.summary;
    
    const integrationScore = coverage.integrationMet ? 30 : (coverage.totalIntegration / this.requirements.coverage.minIntegrationTests * 30);
    const e2eScore = coverage.e2eMet ? 30 : (coverage.totalE2e / this.requirements.coverage.minE2eTests * 30);
    const perfScore = coverage.performanceMet ? 25 : (coverage.totalPerformance / this.requirements.coverage.minPerformanceTests * 25);
    const patternScore = (coverage.patternsCovered / this.requirements.coverage.requiredTestPatterns.length) * 15;
    
    return Math.round(integrationScore + e2eScore + perfScore + patternScore);
  }

  /**
   * 计算质量分数
   */
  calculateQualityScore() {
    const quality = this.results.quality;
    
    if (quality.files.length === 0) {
      return 0;
    }
    
    const sizeScore = quality.issues.filter(i => i.includes('文件过大')).length === 0 ? 25 : 15;
    const describeScore = quality.metrics.averageDescribeBlocks >= this.requirements.quality.minDescribeBlocks ? 25 : 15;
    const testScore = quality.metrics.averageTestCases >= this.requirements.quality.minTestCases ? 25 : 15;
    const docScore = quality.metrics.averageDocumentationRatio >= (this.requirements.quality.minDocumentationRatio * 100) ? 25 : 15;
    
    return Math.round(sizeScore + describeScore + testScore + docScore);
  }

  /**
   * 生成改进建议
   */
  generateRecommendations() {
    const recommendations = [];
    
    // 结构建议
    if (this.results.structure.missing.length > 0) {
      recommendations.push(`创建缺失目录: ${this.results.structure.missing.join(', ')}`);
    }
    
    // 覆盖率建议
    const coverage = this.results.coverage.summary;
    if (!coverage.integrationMet) {
      recommendations.push(`增加集成测试，当前: ${coverage.totalIntegration}，目标: ${this.requirements.coverage.minIntegrationTests}`);
    }
    if (!coverage.e2eMet) {
      recommendations.push(`增加E2E测试，当前: ${coverage.totalE2e}，目标: ${this.requirements.coverage.minE2eTests}`);
    }
    if (!coverage.performanceMet) {
      recommendations.push(`增加性能测试，当前: ${coverage.totalPerformance}，目标: ${this.requirements.coverage.minPerformanceTests}`);
    }
    
    // 质量建议
    if (this.results.quality.issues.length > 0) {
      recommendations.push(`解决质量问题: ${this.results.quality.issues.length}个问题待修复`);
    }
    
    return recommendations;
  }

  /**
   * 识别关键问题
   */
  identifyCriticalIssues() {
    const issues = [];
    
    // 结构关键问题
    if (this.results.structure.missing.length > 2) {
      issues.push('缺失多个核心测试目录');
    }
    
    // 覆盖率关键问题
    const coverage = this.results.coverage.summary;
    if (coverage.totalIntegration < 3) {
      issues.push('集成测试覆盖严重不足');
    }
    if (coverage.totalE2e < 2) {
      issues.push('E2E测试覆盖严重不足');
    }
    
    // 合规性关键问题
    if (this.results.compliance.score < 70) {
      issues.push('测试命名和结构合规性不达标');
    }
    
    return issues;
  }

  /**
   * 输出详细报告
   */
  generateDetailedReport() {
    const report = {
      metadata: {
        validator_version: '1.0.0',
        validation_date: new Date().toISOString(),
        project_path: this.rootPath
      },
      summary: this.results.summary,
      details: {
        structure: this.results.structure,
        coverage: this.results.coverage,
        quality: this.results.quality,
        compliance: this.results.compliance
      }
    };
    
    return JSON.stringify(report, null, 2);
  }

  /**
   * 保存验证报告
   */
  async saveReport(outputPath = null) {
    const reportPath = outputPath || path.join(this.rootPath, 'validation-report.json');
    const report = this.generateDetailedReport();
    
    fs.writeFileSync(reportPath, report, 'utf8');
    console.log(`📄 验证报告已保存: ${reportPath}`);
    
    return reportPath;
  }
}

// 导出供外部使用
export default TestStructureValidator;

// CLI入口点
if (import.meta.url === `file://${process.argv[1]}`) {
  const validator = new TestStructureValidator();
  
  validator.validate()
    .then(async (results) => {
      console.log('\n📊 验证结果摘要:');
      console.log(`总体评级: ${results.summary.overall.toUpperCase()}`);
      console.log(`总体分数: ${results.summary.scores.overall}%`);
      
      if (results.summary.criticalIssues.length > 0) {
        console.log('\n⚠️ 关键问题:');
        results.summary.criticalIssues.forEach(issue => {
          console.log(`  • ${issue}`);
        });
      }
      
      if (results.summary.recommendations.length > 0) {
        console.log('\n💡 改进建议:');
        results.summary.recommendations.forEach(rec => {
          console.log(`  • ${rec}`);
        });
      }
      
      await validator.saveReport();
      console.log('\n✅ 测试结构验证完成');
    })
    .catch(error => {
      console.error('\n❌ 验证失败:', error);
      process.exit(1);
    });
}