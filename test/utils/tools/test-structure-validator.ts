#!/usr/bin/env node

/**
 * 测试目录结构验证器
 * 
 * 功能：
 * 1. 检测测试目录与 src 目录的差异
 * 2. 制定一一对照的目录移动计划
 * 3. 为 src 中存在但测试中缺失的文件创建空白测试文件
 * 4. 遵守测试文件命名规则
 */

import * as fs from 'fs';
import * as path from 'path';

interface DirectoryStructure {
  dirs: string[];
  files: string[];
}

interface TestFileMapping {
  srcFile: string;
  testFile: string;
  testType: 'unit' | 'integration' | 'e2e' | 'security';
}

interface MigrationPlan {
  missingDirectories: string[];
  missingTestFiles: TestFileMapping[];
  existingMismatches: string[];
  moveOperations: Array<{
    from: string;
    to: string;
    reason: string;
  }>;
}

class TestStructureValidator {
  private readonly srcDir: string;
  private readonly testDir: string;
  private readonly testTypes = ['unit', 'integration', 'e2e', 'security'];
  
  // 测试文件命名规则
  private readonly testFilePatterns = {
    unit: '.spec.ts',
    integration: '.integration.test.ts',
    e2e: '.e2e.test.ts',
    security: '.security.test.ts'
  };

  // 需要跳过的目录或文件
  private readonly skipPatterns = [
    'node_modules',
    '.git',
    'dist',
    'build',
    'coverage',
    'test/config',
    'test/utils',
    'test/k6',
    'docs',
    '*.md',
    '*.json',
    '*.js',
    '*.lock'
  ];

  constructor(projectRoot: string = process.cwd()) {
    this.srcDir = path.join(projectRoot, 'src');
    this.testDir = path.join(projectRoot, 'test/jest');
  }

  /**
   * 执行完整的结构验证
   */
  async validateStructure(): Promise<MigrationPlan> {
    console.log('🔍 开始测试目录结构验证...\n');

    const srcStructure = this.scanDirectory(this.srcDir);
    const testStructures = this.scanTestDirectories();

    const plan: MigrationPlan = {
      missingDirectories: [],
      missingTestFiles: [],
      existingMismatches: [],
      moveOperations: []
    };

    // 首先分析现有测试文件的移动需求
    for (const testType of this.testTypes) {
      const testTypeStructure = testStructures[testType];
      const relocations = this.analyzeExistingTestFiles(srcStructure, testTypeStructure, testType);
      plan.moveOperations.push(...relocations);
    }

    // 然后分析缺失的文件和目录
    for (const testType of this.testTypes) {
      const testTypeStructure = testStructures[testType];
      const analysis = this.analyzeStructureDifferences(srcStructure, testTypeStructure, testType);
      
      plan.missingDirectories.push(...analysis.missingDirectories);
      plan.missingTestFiles.push(...analysis.missingTestFiles);
      plan.existingMismatches.push(...analysis.existingMismatches);
    }

    this.printMigrationPlan(plan);
    return plan;
  }

  /**
   * 扫描指定目录结构
   */
  private scanDirectory(dirPath: string): DirectoryStructure {
    const result: DirectoryStructure = {
      dirs: [],
      files: []
    };

    if (!fs.existsSync(dirPath)) {
      return result;
    }

    const scan = (currentPath: string, relativePath: string = '') => {
      const items = fs.readdirSync(currentPath);

      for (const item of items) {
        const fullPath = path.join(currentPath, item);
        const relativeItemPath = relativePath ? path.join(relativePath, item) : item;

        if (this.shouldSkip(relativeItemPath)) {
          continue;
        }

        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
          result.dirs.push(relativeItemPath);
          scan(fullPath, relativeItemPath);
        } else if (stat.isFile() && item.endsWith('.ts')) {
          result.files.push(relativeItemPath);
        }
      }
    };

    scan(dirPath);
    return result;
  }

  /**
   * 扫描所有测试目录
   */
  private scanTestDirectories(): Record<string, DirectoryStructure> {
    const structures: Record<string, DirectoryStructure> = {};

    for (const testType of this.testTypes) {
      const testTypePath = path.join(this.testDir, testType);
      structures[testType] = this.scanDirectory(testTypePath);
    }

    return structures;
  }

  /**
   * 分析现有测试文件，找出需要重新定位的文件和目录
   */
  private analyzeExistingTestFiles(
    srcStructure: DirectoryStructure,
    testStructure: DirectoryStructure,
    testType: string
  ): Array<{ from: string; to: string; reason: string }> {
    const relocations: Array<{ from: string; to: string; reason: string }> = [];

    // 首先识别目录级别的移动需求
    const directoryMigrations = this.identifyDirectoryMigrations(testType);
    
    for (const migration of directoryMigrations) {
      relocations.push({
        from: migration.from,
        to: migration.to,
        reason: `目录结构不匹配源代码组织结构`
      });
    }

    // 然后处理单个文件的重定位
    for (const testFile of testStructure.files) {
      const currentTestPath = `test/jest/${testType}/${testFile}`;
      
      // 从测试文件路径推断对应的源文件路径
      const correspondingSrcFile = this.findCorrespondingSrcFile(testFile, testType);
      
      if (correspondingSrcFile) {
        // 检查当前测试文件位置是否正确
        const expectedTestFile = this.generateTestFileName(correspondingSrcFile, testType);
        
        if (currentTestPath !== expectedTestFile) {
          // 检查是否已经被目录级别的移动涵盖
          const isCoveredByDirectoryMigration = directoryMigrations.some(dm => 
            currentTestPath.startsWith(dm.from)
          );
          
          if (!isCoveredByDirectoryMigration) {
            relocations.push({
              from: currentTestPath,
              to: expectedTestFile,
              reason: `测试文件位置不匹配源文件结构`
            });
          }
        }
      }

      // 检查命名规范
      if (!this.isValidTestFileName(path.basename(testFile), testType)) {
        const correctName = this.suggestCorrectTestFileName(path.basename(testFile), testType);
        const correctPath = path.join(path.dirname(currentTestPath), correctName);
        
        // 检查是否已经被目录级别的移动涵盖
        const isCoveredByDirectoryMigration = directoryMigrations.some(dm => 
          currentTestPath.startsWith(dm.from)
        );
        
        if (!isCoveredByDirectoryMigration) {
          relocations.push({
            from: currentTestPath,
            to: correctPath,
            reason: `文件名不符合 ${testType} 测试命名规范`
          });
        }
      }
    }

    return relocations;
  }

  /**
   * 识别需要进行目录级别移动的情况
   */
  private identifyDirectoryMigrations(testType: string): Array<{ from: string; to: string }> {
    const migrations: Array<{ from: string; to: string }> = [];
    
    // 定义核心模块的重新组织规则
    const coreReorganization = [
      // data-mapper, storage, symbol-mapper, transformer 应该在 core/public/ 下
      { pattern: 'core/data-mapper', targetLocation: 'core/public/data-mapper' },
      { pattern: 'core/storage', targetLocation: 'core/public/storage' },
      { pattern: 'core/symbol-mapper', targetLocation: 'core/public/symbol-mapper' },
      { pattern: 'core/transformer', targetLocation: 'core/public/transformer' },
      
      // data-fetcher, query, receiver 应该在 core/restapi/ 下
      { pattern: 'core/data-fetcher', targetLocation: 'core/restapi/data-fetcher' },
      { pattern: 'core/query', targetLocation: 'core/restapi/query' },
      { pattern: 'core/receiver', targetLocation: 'core/restapi/receiver' },
      
      // stream-data-fetcher, stream-receiver 应该在 core/stream/ 下
      { pattern: 'core/stream-data-fetcher', targetLocation: 'core/stream/stream-data-fetcher' },
      { pattern: 'core/stream-receiver', targetLocation: 'core/stream/stream-receiver' },
    ];

    for (const rule of coreReorganization) {
      const fromPath = `test/jest/${testType}/${rule.pattern}`;
      const toPath = `test/jest/${testType}/${rule.targetLocation}`;
      
      // 检查源目录是否存在
      if (fs.existsSync(fromPath)) {
        migrations.push({
          from: fromPath,
          to: toPath
        });
      }
    }

    return migrations;
  }

  /**
   * 根据测试文件名查找对应的源文件
   */
  private findCorrespondingSrcFile(testFile: string, testType: string): string | null {
    // 移除测试文件扩展名
    let baseName = testFile.replace(/\.(spec|test|integration|e2e|security)\.ts$/, '');
    baseName = baseName.replace(/\.ts$/, '');

    // 尝试在源文件中找到匹配的文件
    const possibleSrcFile = `${baseName}.ts`;
    const fullSrcPath = path.join(this.srcDir, possibleSrcFile);

    if (fs.existsSync(fullSrcPath)) {
      return possibleSrcFile;
    }

    return null;
  }

  /**
   * 根据源文件结构推断测试文件的正确位置
   */
  private inferCorrectTestPath(testFile: string, testType: string, srcStructure: DirectoryStructure): string | null {
    // 从测试文件名提取基础名称
    let baseName = testFile.replace(/\.(spec|test|integration|e2e|security)\.ts$/, '');
    baseName = baseName.replace(/\.ts$/, '');

    // 在源文件结构中寻找最佳匹配
    const fileName = path.basename(baseName);
    
    for (const srcFile of srcStructure.files) {
      const srcBaseName = srcFile.replace(/\.ts$/, '');
      const srcFileName = path.basename(srcBaseName);
      
      if (srcFileName === fileName) {
        return this.generateTestFileName(srcFile, testType);
      }
    }

    return null;
  }

  /**
   * 分析结构差异
   */
  private analyzeStructureDifferences(
    srcStructure: DirectoryStructure,
    testStructure: DirectoryStructure,
    testType: string
  ): MigrationPlan {
    const plan: MigrationPlan = {
      missingDirectories: [],
      missingTestFiles: [],
      existingMismatches: [],
      moveOperations: []
    };

    // 检查缺失的目录
    for (const srcDir of srcStructure.dirs) {
      if (!testStructure.dirs.includes(srcDir)) {
        plan.missingDirectories.push(`test/jest/${testType}/${srcDir}`);
      }
    }

    // 检查缺失的测试文件
    for (const srcFile of srcStructure.files) {
      const expectedTestFile = this.generateTestFileName(srcFile, testType);
      const testFileRelativePath = expectedTestFile.replace(`test/jest/${testType}/`, '');
      
      if (!testStructure.files.includes(testFileRelativePath)) {
        plan.missingTestFiles.push({
          srcFile,
          testFile: expectedTestFile,
          testType: testType as any
        });
      }
    }

    return plan;
  }

  /**
   * 生成测试文件名
   */
  private generateTestFileName(srcFile: string, testType: string): string {
    const baseName = srcFile.replace(/\.ts$/, '');
    const pattern = this.testFilePatterns[testType as keyof typeof this.testFilePatterns];
    return `test/jest/${testType}/${baseName}${pattern}`;
  }

  /**
   * 验证测试文件名是否正确
   */
  private isValidTestFileName(fileName: string, testType: string): boolean {
    const pattern = this.testFilePatterns[testType as keyof typeof this.testFilePatterns];
    return fileName.endsWith(pattern);
  }

  /**
   * 建议正确的测试文件名
   */
  private suggestCorrectTestFileName(fileName: string, testType: string): string {
    const pattern = this.testFilePatterns[testType as keyof typeof this.testFilePatterns];
    const baseName = fileName.replace(/\.(spec|test|e2e|integration|security)\.ts$/, '');
    return `test/jest/${testType}/${baseName}${pattern}`;
  }

  /**
   * 检查是否应该跳过此文件/目录
   */
  private shouldSkip(path: string): boolean {
    return this.skipPatterns.some(pattern => {
      if (pattern.includes('*')) {
        const regex = new RegExp(pattern.replace(/\*/g, '.*'));
        return regex.test(path);
      }
      return path.includes(pattern);
    });
  }

  /**
   * 打印迁移计划
   */
  private printMigrationPlan(plan: MigrationPlan): void {
    console.log('📋 测试目录结构分析报告');
    console.log('='.repeat(50));

    // 按操作类型分组显示移动操作
    const moveOperations = this.groupMoveOperations(plan.moveOperations);

    if (moveOperations.relocations.length > 0) {
      console.log('\n🚚 需要重新定位的测试文件:');
      moveOperations.relocations.slice(0, 10).forEach(({ from, to, reason }) => {
        console.log(`   📦 ${path.basename(from)}`);
        console.log(`      从: ${from}`);
        console.log(`      到: ${to}`);
        console.log(`      原因: ${reason}`);
        console.log('');
      });
      if (moveOperations.relocations.length > 10) {
        console.log(`   ... 还有 ${moveOperations.relocations.length - 10} 个文件需要移动`);
      }
    }

    if (moveOperations.renames.length > 0) {
      console.log('\n🔄 需要重命名的文件:');
      moveOperations.renames.forEach(({ from, to, reason }) => {
        console.log(`   📝 ${path.basename(from)} → ${path.basename(to)}`);
        console.log(`      原因: ${reason}`);
      });
    }

    if (plan.missingDirectories.length > 0) {
      console.log('\n🏗️  需要创建的目录:');
      plan.missingDirectories.slice(0, 15).forEach(dir => {
        console.log(`   📁 ${dir}`);
      });
      if (plan.missingDirectories.length > 15) {
        console.log(`   ... 还有 ${plan.missingDirectories.length - 15} 个目录`);
      }
    }

    if (plan.missingTestFiles.length > 0) {
      console.log('\n📝 需要创建的测试文件:');
      
      // 按测试类型分组显示
      const filesByType = plan.missingTestFiles.reduce((acc, file) => {
        if (!acc[file.testType]) acc[file.testType] = [];
        acc[file.testType].push(file);
        return acc;
      }, {} as Record<string, TestFileMapping[]>);

      for (const [testType, files] of Object.entries(filesByType)) {
        console.log(`\n   ${testType.toUpperCase()} (${files.length} 个文件):`);
        files.slice(0, 5).forEach(({ srcFile, testFile }) => {
          console.log(`     📄 ${path.basename(testFile)} (for ${srcFile})`);
        });
        if (files.length > 5) {
          console.log(`     ... 还有 ${files.length - 5} 个文件`);
        }
      }
    }

    if (plan.existingMismatches.length > 0) {
      console.log('\n⚠️  结构不匹配的项目:');
      plan.existingMismatches.forEach(mismatch => {
        console.log(`   ⚠️  ${mismatch}`);
      });
    }

    console.log('\n📊 统计信息:');
    console.log(`   - 需要移动/重命名文件: ${plan.moveOperations.length}`);
    console.log(`     · 重新定位: ${moveOperations.relocations.length}`);
    console.log(`     · 重命名: ${moveOperations.renames.length}`);
    console.log(`   - 需要创建目录: ${plan.missingDirectories.length}`);
    console.log(`   - 需要创建测试文件: ${plan.missingTestFiles.length}`);
    console.log(`   - 结构不匹配项: ${plan.existingMismatches.length}`);

    // 给出执行建议
    console.log('\n💡 执行建议:');
    if (plan.moveOperations.length > 0) {
      console.log('   1. 首先备份测试文件：cp -r test/ test-backup/');
      console.log('   2. 执行文件移动操作：--execute');
      console.log('   3. 验证移动后的文件结构');
    }
    if (plan.missingTestFiles.length > 0) {
      console.log('   4. 创建缺失的测试文件和目录');
      console.log('   5. 完善生成的测试文件模板');
    }
  }

  /**
   * 将移动操作按类型分组
   */
  private groupMoveOperations(operations: Array<{ from: string; to: string; reason: string }>) {
    const relocations: Array<{ from: string; to: string; reason: string }> = [];
    const renames: Array<{ from: string; to: string; reason: string }> = [];

    for (const op of operations) {
      const fromDir = path.dirname(op.from);
      const toDir = path.dirname(op.to);
      
      if (fromDir !== toDir) {
        relocations.push(op);
      } else {
        renames.push(op);
      }
    }

    return { relocations, renames };
  }

  /**
   * 区分目录移动和文件移动操作
   */
  private categorizeOperations(operations: Array<{ from: string; to: string; reason: string }>) {
    const directoryMoves: Array<{ from: string; to: string; reason: string }> = [];
    const fileMoves: Array<{ from: string; to: string; reason: string }> = [];

    for (const op of operations) {
      // 检查是否是目录移动（通过检查源路径是否为目录）
      if (fs.existsSync(op.from) && fs.statSync(op.from).isDirectory()) {
        directoryMoves.push(op);
      } else {
        fileMoves.push(op);
      }
    }

    return { directoryMoves, fileMoves };
  }

  /**
   * 执行迁移计划
   */
  async executeMigrationPlan(plan: MigrationPlan, dryRun: boolean = true): Promise<void> {
    console.log(`\n🚀 ${dryRun ? '预览' : '执行'}迁移计划...\n`);

    // 1. 首先执行目录级别的移动操作
    console.log('📦 第一步：执行目录级别的移动...');
    const { directoryMoves, fileMoves } = this.categorizeOperations(plan.moveOperations);
    
    for (const { from, to, reason } of directoryMoves) {
      if (!dryRun) {
        // 检查源目录是否存在
        if (!fs.existsSync(from)) {
          console.log(`⚠️  跳过（源目录不存在）: ${from}`);
          continue;
        }

        // 检查目标目录是否已存在
        if (fs.existsSync(to)) {
          console.log(`⚠️  跳过（目标目录已存在）: ${to}`);
          continue;
        }

        // 确保目标父目录存在
        const parentDir = path.dirname(to);
        fs.mkdirSync(parentDir, { recursive: true });
        
        // 移动整个目录
        fs.renameSync(from, to);
        console.log(`✅ 目录移动完成: ${path.basename(from)} → ${to}`);
        console.log(`    原因: ${reason}`);
      } else {
        console.log(`✅ [预览]移动目录: ${from} → ${to}`);
        console.log(`    原因: ${reason}`);
      }
    }

    // 2. 然后执行单个文件的移动操作
    console.log('\n📄 第二步：移动单个测试文件...');
    for (const { from, to, reason } of fileMoves) {
      if (!dryRun) {
        // 检查源文件是否存在
        if (!fs.existsSync(from)) {
          console.log(`⚠️  跳过（源文件不存在）: ${from}`);
          continue;
        }

        // 检查目标文件是否已存在
        if (fs.existsSync(to)) {
          console.log(`⚠️  跳过（目标文件已存在）: ${to}`);
          continue;
        }

        // 确保目标目录存在
        const dir = path.dirname(to);
        fs.mkdirSync(dir, { recursive: true });
        
        // 移动文件
        fs.renameSync(from, to);
        console.log(`✅ 文件移动完成: ${path.basename(from)} → ${to}`);
        console.log(`    原因: ${reason}`);
      } else {
        console.log(`✅ [预览]移动文件: ${from} → ${to}`);
        console.log(`    原因: ${reason}`);
      }
    }

    // 3. 创建缺失的目录
    console.log('\n🏗️ 第三步：创建缺失的目录...');
    for (const dir of plan.missingDirectories) {
      if (!dryRun) {
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
          console.log(`✅ 创建目录: ${dir}`);
        } else {
          console.log(`⚠️  目录已存在: ${dir}`);
        }
      } else {
        console.log(`✅ [预览]创建目录: ${dir}`);
      }
    }

    // 4. 创建缺失的测试文件（排除已移动的文件）
    console.log('\n📝 第四步：创建缺失的测试文件...');
    const movedTargets = new Set(plan.moveOperations.map(op => op.to));
    
    for (const { testFile, srcFile, testType } of plan.missingTestFiles) {
      if (movedTargets.has(testFile)) {
        console.log(`⚠️  跳过（文件已通过移动操作创建）: ${testFile}`);
        continue;
      }

      if (!dryRun) {
        if (fs.existsSync(testFile)) {
          console.log(`⚠️  跳过（文件已存在）: ${testFile}`);
          continue;
        }

        const content = this.generateTestFileContent(srcFile, testType);
        const dir = path.dirname(testFile);
        fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(testFile, content);
        console.log(`✅ 创建测试文件: ${testFile}`);
      } else {
        console.log(`✅ [预览]创建测试文件: ${testFile} (for ${srcFile})`);
      }
    }

    console.log(`\n🎉 迁移计划${dryRun ? '预览' : '执行'}完成!`);
    
    if (!dryRun) {
      console.log('\n🔍 建议执行以下操作验证结果:');
      console.log('   1. 再次运行验证: npx ts-node test/utils/test-structure-validator.ts');
      console.log('   2. 检查是否有重复文件: npx ts-node test/utils/find-duplicates.ts');
      console.log('   3. 运行测试确保没有破坏: bun run test:unit');
    }
  }

  /**
   * 生成测试文件内容
   */
  private generateTestFileContent(srcFile: string, testType: string): string {
    const className = this.extractClassName(srcFile);
    const importPath = this.generateImportPath(srcFile);

    const templates = {
      unit: `import { Test, TestingModule } from '@nestjs/testing';
import { ${className} } from '${importPath}';

describe('${className}', () => {
  let ${this.toCamelCase(className)}: ${className};

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [${className}],
    }).compile();

    ${this.toCamelCase(className)} = module.get<${className}>(${className});
  });

  it('should be defined', () => {
    expect(${this.toCamelCase(className)}).toBeDefined();
  });
});
`,
      integration: `import { Test, TestingModule } from '@nestjs/testing';
import { ${className} } from '${importPath}';

describe('${className} Integration', () => {
  let ${this.toCamelCase(className)}: ${className};

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [${className}],
    }).compile();

    ${this.toCamelCase(className)} = module.get<${className}>(${className});
  });

  it('should be defined', () => {
    expect(${this.toCamelCase(className)}).toBeDefined();
  });
});
`,
      e2e: `import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../../src/app.module';

describe('${className} E2E', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('should be defined', () => {
    expect(app).toBeDefined();
  });
});
`,
      security: `import { Test, TestingModule } from '@nestjs/testing';
import { ${className} } from '${importPath}';

describe('${className} Security', () => {
  let ${this.toCamelCase(className)}: ${className};

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [${className}],
    }).compile();

    ${this.toCamelCase(className)} = module.get<${className}>(${className});
  });

  it('should be defined', () => {
    expect(${this.toCamelCase(className)}).toBeDefined();
  });
});
`
    };

    return templates[testType as keyof typeof templates] || templates.unit;
  }

  /**
   * 提取类名
   */
  private extractClassName(filePath: string): string {
    const fileName = path.basename(filePath, '.ts');
    return fileName
      .split(/[-._]/)
      .map(part => part.charAt(0).toUpperCase() + part.slice(1))
      .join('');
  }

  /**
   * 生成导入路径
   */
  private generateImportPath(srcFile: string): string {
    const relativePath = srcFile.replace(/\.ts$/, '');
    return `../../../src/${relativePath}`;
  }

  /**
   * 转换为驼峰命名
   */
  private toCamelCase(str: string): string {
    return str.charAt(0).toLowerCase() + str.slice(1);
  }
}

// CLI 执行
if (require.main === module) {
  const validator = new TestStructureValidator();
  const isExecute = process.argv.includes('--execute') || process.argv.includes('-e');

  validator.validateStructure().then(plan => {
    if (isExecute) {
      return validator.executeMigrationPlan(plan, false);
    } else {
      console.log('\n💡 提示: 使用 --execute 参数来执行迁移计划');
      console.log('       使用 --dry-run 参数来预览迁移计划');
    }
  }).catch(error => {
    console.error('❌ 执行失败:', error);
    process.exit(1);
  });
}

export { TestStructureValidator, MigrationPlan, TestFileMapping };