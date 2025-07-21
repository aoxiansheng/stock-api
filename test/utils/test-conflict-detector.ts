import * as fs from 'fs';
import * as path from 'path';
import { glob } from 'glob';

/**
 * 测试冲突检测器
 * 自动检测测试文件中的重复、冲突和不一致
 */
export class TestConflictDetector {
  private testFiles: string[] = [];
  private conflicts: ConflictReport[] = [];

  constructor(private testRootPath: string = 'test') {}

  /**
   * 运行完整的冲突检测
   */
  async detectAllConflicts(): Promise<ConflictDetectionReport> {
    console.log('🔍 开始测试冲突检测...');
    
    await this.loadTestFiles();
    
    const duplicateScenarios = await this.detectDuplicateScenarios();
    const dataConflicts = await this.detectDataConflicts();
    const dependencyConflicts = await this.detectDependencyConflicts();
    const namingViolations = await this.detectNamingViolations();
    const boundaryViolations = await this.detectBoundaryViolations();
    
    return {
      summary: {
        totalFiles: this.testFiles.length,
        totalConflicts: this.conflicts.length,
        duplicateScenarios: duplicateScenarios.length,
        dataConflicts: dataConflicts.length,
        dependencyConflicts: dependencyConflicts.length,
        namingViolations: namingViolations.length,
        boundaryViolations: boundaryViolations.length
      },
      conflicts: {
        duplicateScenarios,
        dataConflicts,
        dependencyConflicts,
        namingViolations,
        boundaryViolations
      },
      recommendations: this.generateRecommendations()
    };
  }

  /**
   * 加载所有测试文件
   */
  private async loadTestFiles(): Promise<void> {
    const patterns = [
      `${this.testRootPath}/**/*.spec.ts`,
      `${this.testRootPath}/**/*.test.ts`,
      `${this.testRootPath}/**/*.e2e.test.ts`,
      `${this.testRootPath}/**/*.integration.test.ts`,
      `${this.testRootPath}/**/*.security.test.ts`,
      `${this.testRootPath}/**/*.perf.test.js`
    ];

    for (const pattern of patterns) {
      const files = await glob(pattern);
      this.testFiles.push(...files);
    }

    console.log(`📂 发现 ${this.testFiles.length} 个测试文件`);
  }

  /**
   * 检测重复测试场景
   */
  private async detectDuplicateScenarios(): Promise<ConflictReport[]> {
    const scenarios = new Map<string, string[]>();
    const duplicates: ConflictReport[] = [];

    for (const file of this.testFiles) {
      const content = fs.readFileSync(file, 'utf8');
      const testCases = this.extractTestCases(content);
      
      for (const testCase of testCases) {
        const normalizedCase = this.normalizeTestCase(testCase);
        
        if (!scenarios.has(normalizedCase)) {
          scenarios.set(normalizedCase, []);
        }
        scenarios.get(normalizedCase)!.push(file);
      }
    }

    // 找出重复的场景
    for (const [scenario, files] of scenarios.entries()) {
      if (files.length > 1) {
        duplicates.push({
          type: 'duplicate_scenario',
          severity: 'medium',
          description: `重复的测试场景: ${scenario}`,
          files: files,
          suggestion: '考虑合并重复的测试场景或明确区分测试目的'
        });
      }
    }

    return duplicates;
  }

  /**
   * 检测测试数据冲突
   */
  private async detectDataConflicts(): Promise<ConflictReport[]> {
    const testData = new Map<string, string[]>();
    const conflicts: ConflictReport[] = [];

    for (const file of this.testFiles) {
      const content = fs.readFileSync(file, 'utf8');
      const dataUsage = this.extractTestData(content);
      
      for (const data of dataUsage) {
        if (!testData.has(data)) {
          testData.set(data, []);
        }
        testData.get(data)!.push(file);
      }
    }

    // 检测可能的数据冲突
    for (const [data, files] of testData.entries()) {
      if (files.length > 3 && this.isConflictingData(data)) {
        conflicts.push({
          type: 'data_conflict',
          severity: 'high',
          description: `可能的测试数据冲突: ${data}`,
          files: files,
          suggestion: '使用独立的测试数据或确保数据隔离'
        });
      }
    }

    return conflicts;
  }

  /**
   * 检测依赖冲突
   */
  private async detectDependencyConflicts(): Promise<ConflictReport[]> {
    const dependencies = new Map<string, string[]>();
    const conflicts: ConflictReport[] = [];

    for (const file of this.testFiles) {
      const content = fs.readFileSync(file, 'utf8');
      const imports = this.extractImports(content);
      
      for (const imp of imports) {
        if (!dependencies.has(imp)) {
          dependencies.set(imp, []);
        }
        dependencies.get(imp)!.push(file);
      }
    }

    // 检测不当的依赖使用
    for (const [dependency, files] of dependencies.entries()) {
      const violation = this.checkDependencyViolation(dependency, files);
      if (violation) {
        conflicts.push(violation);
      }
    }

    return conflicts;
  }

  /**
   * 检测命名规范违规
   */
  private async detectNamingViolations(): Promise<ConflictReport[]> {
    const violations: ConflictReport[] = [];

    for (const file of this.testFiles) {
      const fileName = path.basename(file);
      const directory = path.dirname(file);
      
      // 检查文件命名是否符合规范
      const namingViolation = this.checkNamingConvention(fileName, directory);
      if (namingViolation) {
        violations.push({
          type: 'naming_violation',
          severity: 'medium',
          description: namingViolation,
          files: [file],
          suggestion: '重命名文件以符合命名规范'
        });
      }
    }

    return violations;
  }

  /**
   * 检测测试边界违规
   */
  private async detectBoundaryViolations(): Promise<ConflictReport[]> {
    const violations: ConflictReport[] = [];

    for (const file of this.testFiles) {
      const content = fs.readFileSync(file, 'utf8');
      const testType = this.determineTestType(file);
      
      const boundaryViolations = this.checkTestBoundaries(content, testType);
      for (const violation of boundaryViolations) {
        violations.push({
          type: 'boundary_violation',
          severity: 'high',
          description: violation,
          files: [file],
          suggestion: '修改测试以符合测试类型的边界限制'
        });
      }
    }

    return violations;
  }

  /**
   * 提取测试用例
   */
  private extractTestCases(content: string): string[] {
    const testCases: string[] = [];
    
    // 匹配 it('...') 和 test('...') 
    const regex = /(?:it|test)\s*\(\s*['"`]([^'"`]+)['"`]/g;
    let match;
    
    while ((match = regex.exec(content)) !== null) {
      testCases.push(match[1]);
    }
    
    return testCases;
  }

  /**
   * 标准化测试用例名称
   */
  private normalizeTestCase(testCase: string): string {
    return testCase
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .replace(/[^\w\s]/g, '')
      .trim();
  }

  /**
   * 提取测试数据
   */
  private extractTestData(content: string): string[] {
    const testData: string[] = [];
    
    // 匹配常见的测试数据模式
    const patterns = [
      /'([A-Z0-9]+\.[A-Z]{2})'/g,  // 股票代码
      /'test-[\w-]+'/g,             // 测试标识符
      /\b\d{6,}\b/g,                // 可能的ID
    ];
    
    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        testData.push(match[1] || match[0]);
      }
    }
    
    return testData;
  }

  /**
   * 提取导入语句
   */
  private extractImports(content: string): string[] {
    const imports: string[] = [];
    
    const regex = /import.*?from\s+['"`]([^'"`]+)['"`]/g;
    let match;
    
    while ((match = regex.exec(content)) !== null) {
      imports.push(match[1]);
    }
    
    return imports;
  }

  /**
   * 检查是否为冲突数据
   */
  private isConflictingData(data: string): boolean {
    // 检查是否为可能导致冲突的数据
    const conflictPatterns = [
      /test-user/i,
      /admin/i,
      /^700\.HK$/,
      /test-api-key/i
    ];
    
    return conflictPatterns.some(pattern => pattern.test(data));
  }

  /**
   * 检查依赖违规
   */
  private checkDependencyViolation(dependency: string, files: string[]): ConflictReport | null {
    // 检查单元测试中不应该有的依赖
    const unitTestFiles = files.filter(f => f.includes('/unit/'));
    const problematicDeps = ['supertest', 'mongoose', 'ioredis'];
    
    if (unitTestFiles.length > 0 && problematicDeps.some(dep => dependency.includes(dep))) {
      return {
        type: 'dependency_violation',
        severity: 'high',
        description: `单元测试中使用了不当的依赖: ${dependency}`,
        files: unitTestFiles,
        suggestion: '在单元测试中应该使用模拟而不是真实的外部依赖'
      };
    }
    
    return null;
  }

  /**
   * 检查命名规范
   */
  private checkNamingConvention(fileName: string, directory: string): string | null {
    if (directory.includes('/unit/') && !fileName.endsWith('.spec.ts')) {
      return `单元测试文件应该以 .spec.ts 结尾: ${fileName}`;
    }
    
    if (directory.includes('/integration/') && !fileName.endsWith('.integration.test.ts')) {
      return `集成测试文件应该以 .integration.test.ts 结尾: ${fileName}`;
    }
    
    if (directory.includes('/e2e/') && !fileName.endsWith('.e2e.test.ts')) {
      return `E2E测试文件应该以 .e2e.test.ts 结尾: ${fileName}`;
    }
    
    if (directory.includes('/security/') && !fileName.endsWith('.security.test.ts')) {
      return `安全测试文件应该以 .security.test.ts 结尾: ${fileName}`;
    }
    
    return null;
  }

  /**
   * 确定测试类型
   */
  private determineTestType(file: string): string {
    if (file.includes('/unit/')) return 'unit';
    if (file.includes('/integration/')) return 'integration';
    if (file.includes('/e2e/')) return 'e2e';
    if (file.includes('/security/')) return 'security';
    if (file.includes('/k6/')) return 'performance';
    return 'unknown';
  }

  /**
   * 检查测试边界
   */
  private checkTestBoundaries(content: string, testType: string): string[] {
    const violations: string[] = [];
    
    if (testType === 'unit') {
      if (content.includes('supertest') || content.includes('request(')) {
        violations.push('单元测试不应该包含HTTP请求');
      }
      if (content.includes('mongoose.connect') || content.includes('createConnection')) {
        violations.push('单元测试不应该连接真实数据库');
      }
    }
    
    if (testType === 'integration') {
      if (content.includes('global.testApp')) {
        violations.push('集成测试不应该使用全局测试应用实例');
      }
    }
    
    return violations;
  }

  /**
   * 生成修复建议
   */
  private generateRecommendations(): string[] {
    const recommendations: string[] = [];
    
    if (this.conflicts.length > 0) {
      recommendations.push('发现测试冲突，建议按以下优先级修复：');
      recommendations.push('1. 高严重性问题：边界违规和依赖冲突');
      recommendations.push('2. 中等严重性问题：重复场景和命名违规');
      recommendations.push('3. 低严重性问题：数据冲突和优化建议');
    }
    
    if (this.conflicts.some(c => c.type === 'duplicate_scenario')) {
      recommendations.push('考虑创建共享的测试工具库以避免重复代码');
    }
    
    if (this.conflicts.some(c => c.type === 'data_conflict')) {
      recommendations.push('实施测试数据隔离策略，使用工厂模式生成测试数据');
    }
    
    return recommendations;
  }
}

/**
 * 类型定义
 */
export interface ConflictReport {
  type: 'duplicate_scenario' | 'data_conflict' | 'dependency_violation' | 'naming_violation' | 'boundary_violation';
  severity: 'low' | 'medium' | 'high';
  description: string;
  files: string[];
  suggestion: string;
}

export interface ConflictDetectionReport {
  summary: {
    totalFiles: number;
    totalConflicts: number;
    duplicateScenarios: number;
    dataConflicts: number;
    dependencyConflicts: number;
    namingViolations: number;
    boundaryViolations: number;
  };
  conflicts: {
    duplicateScenarios: ConflictReport[];
    dataConflicts: ConflictReport[];
    dependencyConflicts: ConflictReport[];
    namingViolations: ConflictReport[];
    boundaryViolations: ConflictReport[];
  };
  recommendations: string[];
}

/**
 * 命令行工具
 */
export async function runConflictDetection(): Promise<void> {
  const detector = new TestConflictDetector();
  const report = await detector.detectAllConflicts();
  
  console.log('\n📊 测试冲突检测报告');
  console.log('='.repeat(50));
  console.log(`总文件数: ${report.summary.totalFiles}`);
  console.log(`总冲突数: ${report.summary.totalConflicts}`);
  console.log(`重复场景: ${report.summary.duplicateScenarios}`);
  console.log(`数据冲突: ${report.summary.dataConflicts}`);
  console.log(`依赖冲突: ${report.summary.dependencyConflicts}`);
  console.log(`命名违规: ${report.summary.namingViolations}`);
  console.log(`边界违规: ${report.summary.boundaryViolations}`);
  
  if (report.summary.totalConflicts > 0) {
    console.log('\n🚨 发现的冲突:');
    
    // 输出所有冲突
    Object.values(report.conflicts).flat().forEach((conflict, index) => {
      console.log(`\n${index + 1}. [${conflict.severity.toUpperCase()}] ${conflict.description}`);
      console.log(`   文件: ${conflict.files.join(', ')}`);
      console.log(`   建议: ${conflict.suggestion}`);
    });
    
    console.log('\n💡 修复建议:');
    report.recommendations.forEach((rec, index) => {
      console.log(`${index + 1}. ${rec}`);
    });
  } else {
    console.log('\n✅ 未发现测试冲突');
  }
  
  // 保存报告到文件
  fs.writeFileSync(
    'test-results/conflict-detection-report.json',
    JSON.stringify(report, null, 2)
  );
  
  console.log('\n📄 详细报告已保存到: test-results/conflict-detection-report.json');
}