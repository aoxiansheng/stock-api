import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs/promises';
import * as path from 'path';
import { GlobWrapper } from '../utils/glob-wrapper.util';

/**
 * P0优先级：StorageClassification 全仓替换脚本
 * 
 * 执行策略：
 * 1. 全仓扫描所有导入 StorageClassification 的文件
 * 2. 批量替换导入路径为统一路径
 * 3. 更新 Swagger 示例和文档引用
 * 4. 更新测试文件中的导入
 * 5. 声明对外接口兼容策略
 * 
 * 风险控制：
 * - 保留原文件作为兼容性导出
 * - 分阶段执行，每阶段可回滚
 * - 自动生成兼容性验证报告
 */
@Injectable()
export class P0StorageClassificationFullReplacementScript {
  private readonly logger = new Logger(P0StorageClassificationFullReplacementScript.name);
  private readonly backupDir = './backup-before-replacement';
  private readonly unifiedImportPath = '../../core/shared/types/storage-classification.enum';

  async execute(): Promise<void> {
    this.logger.log('🚀 开始执行 P0 StorageClassification 全仓替换...');

    try {
      // 第一阶段：扫描和备份
      await this.scanAndBackupFiles();
      
      // 第二阶段：替换核心引用
      await this.replaceCoreImports();
      
      // 第三阶段：更新Swagger文档
      await this.updateSwaggerDocumentation();
      
      // 第四阶段：更新测试文件
      await this.updateTestFiles();
      
      // 第五阶段：声明API兼容策略
      await this.declareApiCompatibilityStrategy();
      
      // 第六阶段：验证替换结果
      await this.verifyReplacementResults();

      this.logger.log('✅ P0 StorageClassification 全仓替换完成');
    } catch (error) {
      this.logger.error('❌ 替换过程中发生错误:', error);
      await this.rollbackChanges();
      throw error;
    }
  }

  /**
   * 第一阶段：扫描和备份相关文件
   */
  private async scanAndBackupFiles(): Promise<void> {
    this.logger.log('📂 第一阶段：扫描和备份文件...');

    // 扫描所有包含 StorageClassification 的文件
    const searchPatterns = [
      'src/**/*.ts',
      'test/**/*.ts',
      'docs/**/*.md',
      '**/*.json' // package.json, tsconfig.json等
    ];

    const filesToReplace = new Set<string>();

    for (const pattern of searchPatterns) {
      const files = await this.globPromise(pattern);
      for (const file of files) {
        const content = await fs.readFile(file, 'utf8');
        if (content.includes('StorageClassification')) {
          filesToReplace.add(file);
        }
      }
    }

    this.logger.log(`找到 ${filesToReplace.size} 个包含 StorageClassification 的文件`);

    // 创建备份
    await fs.mkdir(this.backupDir, { recursive: true });
    const filesToReplaceArray = Array.from(filesToReplace);
    for (const file of filesToReplaceArray) {
      const backupPath = path.join(this.backupDir, file);
      await fs.mkdir(path.dirname(backupPath), { recursive: true });
      await fs.copyFile(file, backupPath);
    }

    this.logger.log(`✅ 已备份 ${filesToReplace.size} 个文件到 ${this.backupDir}`);
  }

  /**
   * 第二阶段：替换核心导入路径
   */
  private async replaceCoreImports(): Promise<void> {
    this.logger.log('🔄 第二阶段：替换核心导入路径...');

    const coreImportPatterns = [
      // 旧的导入路径模式
      {
        pattern: /from\s+['"](.*\/field-naming\.types)['"]/g,
        replacement: `from '../shared/types/storage-classification.enum'`,
        description: '替换 field-naming.types 导入'
      },
      {
        pattern: /from\s+['"](.*\/storage-type\.enum)['"]/g,
        replacement: `from '../../shared/types/storage-classification.enum'`,
        description: '替换 storage-type.enum 导入'
      },
      // 相对路径的导入
      {
        pattern: /from\s+['"]\.\.?\/.*field-naming\.types['"]/g,
        replacement: `from '../shared/types/storage-classification.enum'`,
        description: '替换相对路径的 field-naming.types 导入'
      },
      {
        pattern: /from\s+['"]\.\.?\/.*storage-type\.enum['"]/g,
        replacement: `from '../../shared/types/storage-classification.enum'`,
        description: '替换相对路径的 storage-type.enum 导入'
      }
    ];

    const coreFiles = await this.globPromise('src/**/*.ts');
    let totalReplacements = 0;

    for (const file of coreFiles) {
      let content = await fs.readFile(file, 'utf8');
      let fileModified = false;
      let fileReplacements = 0;

      for (const importPattern of coreImportPatterns) {
        const matches = content.match(importPattern.pattern);
        if (matches) {
          content = content.replace(importPattern.pattern, importPattern.replacement);
          fileReplacements += matches.length;
          fileModified = true;
          this.logger.debug(`${file}: ${importPattern.description} - ${matches.length} 处替换`);
        }
      }

      if (fileModified) {
        await fs.writeFile(file, content, 'utf8');
        totalReplacements += fileReplacements;
        this.logger.debug(`✅ 更新文件: ${file} (${fileReplacements} 处替换)`);
      }
    }

    this.logger.log(`✅ 核心导入替换完成，共 ${totalReplacements} 处替换`);
  }

  /**
   * 第三阶段：更新Swagger文档
   */
  private async updateSwaggerDocumentation(): Promise<void> {
    this.logger.log('📚 第三阶段：更新Swagger文档...');

    // 更新Swagger示例中的枚举值引用
    const swaggerUpdates = [
      {
        pattern: /@ApiProperty\(\s*\{\s*enum:\s*StorageClassification/g,
        replacement: '@ApiProperty({ enum: StorageClassification',
        description: '标准化 Swagger enum 属性格式'
      },
      {
        pattern: /example:\s*["']SYMBOL_MAPPING["']/g,
        replacement: 'example: "stock_quote"',
        description: '替换不存在的枚举值示例'
      },
      {
        pattern: /example:\s*["']DATA_MAPPING["']/g,
        replacement: 'example: "stock_candle"',
        description: '替换不存在的枚举值示例'
      }
    ];

    const swaggerFiles = await this.globPromise('src/**/*.dto.ts');
    let swaggerReplacements = 0;

    for (const file of swaggerFiles) {
      let content = await fs.readFile(file, 'utf8');
      let fileModified = false;

      for (const update of swaggerUpdates) {
        const matches = content.match(update.pattern);
        if (matches) {
          content = content.replace(update.pattern, update.replacement);
          swaggerReplacements += matches.length;
          fileModified = true;
          this.logger.debug(`${file}: ${update.description} - ${matches.length} 处更新`);
        }
      }

      if (fileModified) {
        await fs.writeFile(file, content, 'utf8');
      }
    }

    // 创建Swagger兼容性文档
    await this.createSwaggerCompatibilityDoc();

    this.logger.log(`✅ Swagger文档更新完成，共 ${swaggerReplacements} 处更新`);
  }

  /**
   * 第四阶段：更新测试文件
   */
  private async updateTestFiles(): Promise<void> {
    this.logger.log('🧪 第四阶段：更新测试文件...');

    const testFiles = await this.globPromise('test/**/*.spec.ts');
    let testReplacements = 0;

    const testImportPattern = /from\s+['"](.*(?:field-naming\.types|storage-type\.enum))['"]/g;

    for (const file of testFiles) {
      let content = await fs.readFile(file, 'utf8');
      const matches = content.match(testImportPattern);
      
      if (matches) {
        // 根据测试文件位置使用相对路径
        const relativePath = file.includes('core/shared/') ? 
          '../types/storage-classification.enum' : 
          '../../../core/shared/types/storage-classification.enum';
        content = content.replace(testImportPattern, `from '${relativePath}'`);
        await fs.writeFile(file, content, 'utf8');
        testReplacements += matches.length;
        this.logger.debug(`✅ 更新测试文件: ${file} (${matches.length} 处替换)`);
      }
    }

    // 更新测试快照中的枚举值引用（如果存在）
    await this.updateTestSnapshots();

    this.logger.log(`✅ 测试文件更新完成，共 ${testReplacements} 处替换`);
  }

  /**
   * 第五阶段：声明API兼容策略
   */
  private async declareApiCompatibilityStrategy(): Promise<void> {
    this.logger.log('📋 第五阶段：声明API兼容策略...');

    const compatibilityStrategy = `# StorageClassification API 兼容策略

## 版本兼容性声明

### 当前版本 (v2.x)
- **统一路径**: \`/src/core/shared/types/storage-classification.enum.ts\`
- **范围**: Core组件内部共享，19个标准值
- **封装性**: 仅供Core内部7个组件使用，外部模块不可见
- **向后兼容**: 保持所有现有API响应格式不变

### 兼容性保证

#### 1. API响应格式
\`\`\`json
{
  "storageClassification": "stock_quote",  // 保持原有字段名和值
  "metadata": {
    "classification": "stock_quote"        // 新增元数据字段
  }
}
\`\`\`

#### 2. 枚举值映射
所有原有的11个枚举值继续支持：
- \`stock_quote\` ✅ 
- \`stock_candle\` ✅
- \`stock_tick\` ✅
- \`financial_statement\` ✅
- \`stock_basic_info\` ✅
- \`market_news\` ✅
- \`trading_order\` ✅
- \`user_portfolio\` ✅
- \`general\` ✅
- \`index_quote\` ✅
- \`market_status\` ✅

#### 3. 新增枚举值
新增8个枚举值，渐进式引入：
- \`trading_days\`
- \`global_state\`
- \`crypto_quote\`
- \`crypto_basic_info\`
- \`stock_logo\`
- \`crypto_logo\`
- \`stock_news\`
- \`crypto_news\`

#### 4. 废弃通知
以下不存在的枚举值已从文档中移除：
- ❌ \`SYMBOL_MAPPING\` (从未存在)
- ❌ \`DATA_MAPPING\` (从未存在)

### 迁移时间表

| 阶段 | 时间 | 操作 | 影响 |
|------|------|------|------|
| Phase 1 | 立即 | 统一导入路径 | 内部开发 |
| Phase 2 | 1个月内 | 更新客户端SDK | 外部集成 |
| Phase 3 | 3个月内 | 废弃旧路径 | 开发者警告 |
| Phase 4 | 6个月内 | 移除兼容别名 | 完全迁移 |

### 风险缓解

1. **零停机迁移**: 所有API保持正常服务
2. **渐进式切换**: 新功能优先使用新枚举，旧功能保持不变
3. **监控告警**: 监控旧路径的使用情况
4. **回滚机制**: 如有问题可快速回滚到备份版本

### 验证清单

- [ ] API响应格式保持一致
- [ ] Swagger文档更新完成
- [ ] 测试用例全部通过
- [ ] 性能基准测试通过
- [ ] 客户端兼容性验证
- [ ] 监控指标正常

---
*最后更新: ${new Date().toISOString()}*
*负责人: 系统架构团队*
`;

    await fs.writeFile(
      'docs/compatibility/storage-classification-api-compatibility.md',
      compatibilityStrategy,
      'utf8'
    );

    this.logger.log('✅ API兼容策略文档已生成');
  }

  /**
   * 第六阶段：验证替换结果
   */
  private async verifyReplacementResults(): Promise<void> {
    this.logger.log('🔍 第六阶段：验证替换结果...');

    const verificationResults = {
      coreImportsUpdated: 0,
      testFilesUpdated: 0,
      swaggerDocsUpdated: 0,
      compatibilityDeclared: false,
      oldImportsRemaining: 0,
      errors: [] as string[]
    };

    try {
      // 检查是否还有旧的导入
      const allFiles = await this.globPromise('src/**/*.ts');
      const oldImportPattern = /from\s+['"](.*(?:field-naming\.types|storage-type\.enum))['"]/g;

      for (const file of allFiles) {
        const content = await fs.readFile(file, 'utf8');
        const matches = content.match(oldImportPattern);
        if (matches) {
          verificationResults.oldImportsRemaining += matches.length;
          verificationResults.errors.push(`${file}: 仍包含旧导入 ${matches.length} 处`);
        }
      }

      // 验证新导入是否工作
      const newImportPattern = new RegExp(this.unifiedImportPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
      for (const file of allFiles) {
        const content = await fs.readFile(file, 'utf8');
        const matches = content.match(newImportPattern);
        if (matches) {
          verificationResults.coreImportsUpdated += matches.length;
        }
      }

      // 检查兼容性文档
      const compatibilityDocExists = await fs.access('docs/compatibility/storage-classification-api-compatibility.md')
        .then(() => true)
        .catch(() => false);
      verificationResults.compatibilityDeclared = compatibilityDocExists;

      this.logger.log('📊 替换验证结果:');
      this.logger.log(`   新导入: ${verificationResults.coreImportsUpdated} 处`);
      this.logger.log(`   旧导入残留: ${verificationResults.oldImportsRemaining} 处`);
      this.logger.log(`   兼容性文档: ${verificationResults.compatibilityDeclared ? '✅' : '❌'}`);

      if (verificationResults.oldImportsRemaining > 0) {
        this.logger.warn('⚠️  发现未完成的导入替换:');
        verificationResults.errors.forEach(error => this.logger.warn(`   ${error}`));
      }

      if (verificationResults.errors.length === 0 && verificationResults.coreImportsUpdated > 0) {
        this.logger.log('✅ 全仓替换验证通过');
      } else {
        throw new Error('替换验证失败，请检查上述错误');
      }

    } catch (error) {
      verificationResults.errors.push(`验证过程出错: ${error.message}`);
      throw error;
    }
  }

  /**
   * 辅助方法：使用包装器搜索文件
   */
  private async globPromise(pattern: string): Promise<string[]> {
    try {
      return await GlobWrapper.searchFiles(pattern, { 
        ignore: ['node_modules', 'dist', '.git'] 
      });
    } catch (error) {
      this.logger.error(`File search failed: ${pattern}`, error);
      return [];
    }
  }

  /**
   * 创建Swagger兼容性文档
   */
  private async createSwaggerCompatibilityDoc(): Promise<void> {
    const swaggerDoc = `# Swagger StorageClassification 兼容性更新

## 更新内容

### 1. 枚举值示例修正
- 移除不存在的示例值: \`SYMBOL_MAPPING\`, \`DATA_MAPPING\`
- 使用实际存在的值: \`stock_quote\`, \`stock_candle\` 等

### 2. API文档一致性
- 所有 \`@ApiProperty\` 使用统一的枚举引用
- Swagger UI 显示正确的19个枚举值

### 3. OpenAPI 规范
所有API响应中的 \`storageClassification\` 字段都符合新的枚举定义。
`;

    await fs.mkdir('docs/swagger-compatibility', { recursive: true });
    await fs.writeFile('docs/swagger-compatibility/storage-classification-update.md', swaggerDoc, 'utf8');
  }

  /**
   * 更新测试快照
   */
  private async updateTestSnapshots(): Promise<void> {
    const snapshotFiles = await this.globPromise('**/__snapshots__/*.snap');
    
    for (const file of snapshotFiles) {
      let content = await fs.readFile(file, 'utf8');
      let modified = false;

      // 替换快照中可能存在的错误枚举值
      const snapshotReplacements = [
        { from: '"SYMBOL_MAPPING"', to: '"stock_quote"' },
        { from: '"DATA_MAPPING"', to: '"stock_candle"' }
      ];

      for (const replacement of snapshotReplacements) {
        if (content.includes(replacement.from)) {
          content = content.replace(new RegExp(replacement.from, 'g'), replacement.to);
          modified = true;
        }
      }

      if (modified) {
        await fs.writeFile(file, content, 'utf8');
        this.logger.debug(`更新快照文件: ${file}`);
      }
    }
  }

  /**
   * 回滚更改
   */
  private async rollbackChanges(): Promise<void> {
    this.logger.warn('🔄 正在回滚更改...');
    
    try {
      const backupFiles = await this.globPromise(`${this.backupDir}/**/*`);
      
      for (const backupFile of backupFiles) {
        const originalFile = backupFile.replace(this.backupDir + '/', '');
        await fs.copyFile(backupFile, originalFile);
      }

      this.logger.log('✅ 回滚完成');
    } catch (rollbackError) {
      this.logger.error('❌ 回滚失败:', rollbackError);
    }
  }
}

/**
 * 执行器
 */
export async function executeP0FullReplacement(): Promise<void> {
  const script = new P0StorageClassificationFullReplacementScript();
  await script.execute();
}

// 直接执行
if (require.main === module) {
  executeP0FullReplacement()
    .then(() => {
      console.log('P0 StorageClassification full replacement completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('P0 replacement failed:', error);
      process.exit(1);
    });
}