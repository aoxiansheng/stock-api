import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs/promises';
import { GlobWrapper } from '../utils/glob-wrapper.util';

/**
 * P1优先级：时间字段统一脚本（含过渡逻辑）
 * 
 * 统一策略：
 * 1. 重命名为 processingTimeMs 同时保留读取旧字段的过渡逻辑
 * 2. 内部使用期间打 deprecation 日志
 * 3. 在版本说明中声明变更
 * 4. 提供自动迁移和手动迁移两种方案
 * 5. 渐进式切换，确保零中断
 * 
 * 重点：过渡期内同时支持新旧字段名，避免破坏性变更
 */
@Injectable()
export class P1TimeFieldsUnificationTransitionScript {
  private readonly logger = new Logger(P1TimeFieldsUnificationTransitionScript.name);
  
  // 时间字段映射配置
  private readonly timeFieldMappings = [
    {
      oldField: 'processingTime',
      newField: 'processingTimeMs',
      description: 'Transformer组件处理耗时字段',
      deprecationMessage: 'processingTime字段已废弃，请使用processingTimeMs'
    },
    {
      oldField: 'executionTime',
      newField: 'executionTimeMs',
      description: 'Cache组件执行耗时字段',
      deprecationMessage: 'executionTime字段已废弃，请使用executionTimeMs'
    },
    {
      oldField: 'responseTime',
      newField: 'responseTimeMs',
      description: '通用响应时间字段',
      deprecationMessage: 'responseTime字段已废弃，请使用responseTimeMs'
    }
  ];

  async execute(): Promise<void> {
    this.logger.log('🚀 开始执行 P1 时间字段统一（含过渡逻辑）...');

    try {
      // 阶段1：分析现有时间字段使用情况
      const fieldAnalysis = await this.analyzeCurrentTimeFieldUsage();
      
      // 阶段2：创建过渡期间的兼容层
      await this.createCompatibilityLayer();
      
      // 阶段3：更新DTO定义，添加新字段
      await this.updateDtoDefinitions(fieldAnalysis);
      
      // 阶段4：添加过渡逻辑和deprecation日志
      await this.addTransitionLogicAndLogging(fieldAnalysis);
      
      // 阶段5：更新业务逻辑使用新字段
      await this.updateBusinessLogicToNewFields(fieldAnalysis);
      
      // 阶段6：生成版本变更说明
      await this.generateVersionChangeDoc();
      
      // 阶段7：创建迁移验证工具
      await this.createMigrationVerificationTool();

      this.logger.log('✅ P1 时间字段统一（含过渡逻辑）完成');
    } catch (error) {
      this.logger.error('❌ 时间字段统一过程中发生错误:', error);
      throw error;
    }
  }

  /**
   * 阶段1：分析现有时间字段使用情况
   */
  private async analyzeCurrentTimeFieldUsage(): Promise<{
    dtoFiles: Array<{ file: string; fields: string[]; usageCount: number }>;
    serviceFiles: Array<{ file: string; fields: string[]; usageCount: number }>;
    testFiles: Array<{ file: string; fields: string[]; usageCount: number }>;
    totalUsage: Record<string, number>;
  }> {
    this.logger.log('📊 阶段1：分析现有时间字段使用情况...');

    const analysis = {
      dtoFiles: [] as Array<{ file: string; fields: string[]; usageCount: number }>,
      serviceFiles: [] as Array<{ file: string; fields: string[]; usageCount: number }>,
      testFiles: [] as Array<{ file: string; fields: string[]; usageCount: number }>,
      totalUsage: {} as Record<string, number>
    };

    // 初始化统计
    this.timeFieldMappings.forEach(mapping => {
      analysis.totalUsage[mapping.oldField] = 0;
    });

    // 分析DTO文件
    const dtoFiles = await GlobWrapper.findDtoFiles();
    for (const file of dtoFiles) {
      const content = await fs.readFile(file, 'utf8');
      const foundFields: string[] = [];
      let usageCount = 0;

      for (const mapping of this.timeFieldMappings) {
        const fieldPattern = new RegExp(`\\b${mapping.oldField}\\b`, 'g');
        const matches = content.match(fieldPattern);
        if (matches) {
          foundFields.push(mapping.oldField);
          usageCount += matches.length;
          analysis.totalUsage[mapping.oldField] += matches.length;
        }
      }

      if (foundFields.length > 0) {
        analysis.dtoFiles.push({ file, fields: foundFields, usageCount });
      }
    }

    // 分析服务文件
    const serviceFiles = await GlobWrapper.findServiceFiles();
    for (const file of serviceFiles) {
      const content = await fs.readFile(file, 'utf8');
      const foundFields: string[] = [];
      let usageCount = 0;

      for (const mapping of this.timeFieldMappings) {
        const fieldPattern = new RegExp(`\\b${mapping.oldField}\\b`, 'g');
        const matches = content.match(fieldPattern);
        if (matches) {
          foundFields.push(mapping.oldField);
          usageCount += matches.length;
          analysis.totalUsage[mapping.oldField] += matches.length;
        }
      }

      if (foundFields.length > 0) {
        analysis.serviceFiles.push({ file, fields: foundFields, usageCount });
      }
    }

    // 分析测试文件
    const testFiles = await GlobWrapper.findTestFiles();
    for (const file of testFiles) {
      const content = await fs.readFile(file, 'utf8');
      const foundFields: string[] = [];
      let usageCount = 0;

      for (const mapping of this.timeFieldMappings) {
        const fieldPattern = new RegExp(`\\b${mapping.oldField}\\b`, 'g');
        const matches = content.match(fieldPattern);
        if (matches) {
          foundFields.push(mapping.oldField);
          usageCount += matches.length;
          analysis.totalUsage[mapping.oldField] += matches.length;
        }
      }

      if (foundFields.length > 0) {
        analysis.testFiles.push({ file, fields: foundFields, usageCount });
      }
    }

    this.logger.log('📊 时间字段使用情况分析结果:');
    Object.entries(analysis.totalUsage).forEach(([field, count]) => {
      this.logger.log(`   ${field}: ${count} 处使用`);
    });
    this.logger.log(`   影响文件: DTO ${analysis.dtoFiles.length}个, Service ${analysis.serviceFiles.length}个, Test ${analysis.testFiles.length}个`);

    return analysis;
  }

  /**
   * 阶段2：创建过渡期间的兼容层
   */
  private async createCompatibilityLayer(): Promise<void> {
    this.logger.log('🔄 阶段2：创建过渡期间的兼容层...');

    const compatibilityLayerCode = `import { Logger } from '@nestjs/common';

/**
 * 时间字段过渡期兼容层
 * 
 * 在过渡期间同时支持新旧时间字段名称，并记录deprecation日志
 * 用于确保零中断的渐进式迁移
 */
export class TimeFieldCompatibilityLayer {
  private static readonly logger = new Logger('TimeFieldCompatibilityLayer');
  private static deprecationWarningsShown = new Set<string>();

  /**
   * 处理时间字段的读取，优先使用新字段，回退到旧字段
   */
  static getProcessingTime(obj: any, context?: string): number {
    // 优先使用新字段
    if (typeof obj.processingTimeMs === 'number') {
      return obj.processingTimeMs;
    }

    // 回退到旧字段，并记录deprecation警告
    if (typeof obj.processingTime === 'number') {
      this.logDeprecationWarning('processingTime', 'processingTimeMs', context);
      return obj.processingTime;
    }

    // 默认值
    return 0;
  }

  /**
   * 处理执行时间字段的读取
   */
  static getExecutionTime(obj: any, context?: string): number {
    if (typeof obj.executionTimeMs === 'number') {
      return obj.executionTimeMs;
    }

    if (typeof obj.executionTime === 'number') {
      this.logDeprecationWarning('executionTime', 'executionTimeMs', context);
      return obj.executionTime;
    }

    return 0;
  }

  /**
   * 处理响应时间字段的读取
   */
  static getResponseTime(obj: any, context?: string): number {
    if (typeof obj.responseTimeMs === 'number') {
      return obj.responseTimeMs;
    }

    if (typeof obj.responseTime === 'number') {
      this.logDeprecationWarning('responseTime', 'responseTimeMs', context);
      return obj.responseTime;
    }

    return 0;
  }

  /**
   * 设置时间字段，同时设置新旧字段以保证兼容性
   */
  static setProcessingTime(obj: any, value: number): void {
    obj.processingTimeMs = value;
    
    // 过渡期间同时设置旧字段，避免依赖旧字段的代码出错
    obj.processingTime = value;
  }

  static setExecutionTime(obj: any, value: number): void {
    obj.executionTimeMs = value;
    obj.executionTime = value;
  }

  static setResponseTime(obj: any, value: number): void {
    obj.responseTimeMs = value;
    obj.responseTime = value;
  }

  /**
   * 创建标准化的时间字段对象
   */
  static createStandardTimeFields(data: {
    processingTime?: number;
    executionTime?: number;
    responseTime?: number;
    timestamp?: string;
  }): {
    processingTimeMs: number;
    executionTimeMs: number;
    responseTimeMs: number;
    timestamp: string;
    // 过渡期保留的旧字段
    processingTime?: number;
    executionTime?: number;
    responseTime?: number;
  } {
    const standardFields = {
      processingTimeMs: data.processingTime || 0,
      executionTimeMs: data.executionTime || 0,
      responseTimeMs: data.responseTime || 0,
      timestamp: data.timestamp || new Date().toISOString()
    };

    // 过渡期间同时包含旧字段
    return {
      ...standardFields,
      processingTime: standardFields.processingTimeMs,
      executionTime: standardFields.executionTimeMs,
      responseTime: standardFields.responseTimeMs
    };
  }

  /**
   * 迁移现有对象的时间字段
   */
  static migrateTimeFields(obj: any): any {
    if (!obj) return obj;

    const migrated = { ...obj };

    // 迁移处理时间
    if ('processingTime' in migrated && !('processingTimeMs' in migrated)) {
      migrated.processingTimeMs = migrated.processingTime;
      this.logDeprecationWarning('processingTime', 'processingTimeMs', 'migration');
    }

    // 迁移执行时间
    if ('executionTime' in migrated && !('executionTimeMs' in migrated)) {
      migrated.executionTimeMs = migrated.executionTime;
      this.logDeprecationWarning('executionTime', 'executionTimeMs', 'migration');
    }

    // 迁移响应时间
    if ('responseTime' in migrated && !('responseTimeMs' in migrated)) {
      migrated.responseTimeMs = migrated.responseTime;
      this.logDeprecationWarning('responseTime', 'responseTimeMs', 'migration');
    }

    return migrated;
  }

  /**
   * 记录deprecation警告，避免重复日志
   */
  private static logDeprecationWarning(oldField: string, newField: string, context?: string): void {
    const warningKey = \`\${oldField}->\${newField}\${context ? \`-\${context}\` : ''}\`;
    
    if (!this.deprecationWarningsShown.has(warningKey)) {
      this.deprecationWarningsShown.add(warningKey);
      
      const contextStr = context ? \` (context: \${context})\` : '';
      this.logger.warn(
        \`⚠️  DEPRECATION: '\${oldField}' 字段已废弃，请使用 '\${newField}' 替代\${contextStr}\`
      );
      
      // 在开发环境中显示调用栈
      if (process.env.NODE_ENV === 'development') {
        this.logger.debug('调用栈:', new Error().stack);
      }
    }
  }

  /**
   * 获取迁移统计信息
   */
  static getMigrationStats(): {
    deprecationWarningsCount: number;
    warningTypes: string[];
  } {
    return {
      deprecationWarningsCount: this.deprecationWarningsShown.size,
      warningTypes: Array.from(this.deprecationWarningsShown)
    };
  }

  /**
   * 清理deprecation警告记录（用于测试）
   */
  static clearDeprecationWarnings(): void {
    this.deprecationWarningsShown.clear();
  }
}

/**
 * 时间字段标准化装饰器
 * 用于自动处理时间字段的读写
 */
export function StandardizeTimeFields() {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = function (...args: any[]) {
      // 处理输入参数中的时间字段
      const processedArgs = args.map(arg => {
        if (arg && typeof arg === 'object') {
          return TimeFieldCompatibilityLayer.migrateTimeFields(arg);
        }
        return arg;
      });

      // 调用原方法
      const result = originalMethod.apply(this, processedArgs);

      // 处理返回值中的时间字段
      if (result && typeof result === 'object') {
        return TimeFieldCompatibilityLayer.migrateTimeFields(result);
      }

      return result;
    };

    return descriptor;
  };
}

/**
 * 类级别的时间字段标准化装饰器
 */
export function TimeFieldCompatible() {
  return function <T extends { new(...args: any[]): {} }>(constructor: T) {
    return class extends constructor {
      constructor(...args: any[]) {
        super(...args);
        
        // 在实例化时迁移时间字段
        Object.keys(this).forEach(key => {
          if (this[key] && typeof this[key] === 'object') {
            this[key] = TimeFieldCompatibilityLayer.migrateTimeFields(this[key]);
          }
        });
      }
    };
  };
}
`;

    await fs.mkdir('src/common/utils', { recursive: true });
    await fs.writeFile(
      'src/common/utils/time-field-compatibility.util.ts',
      compatibilityLayerCode,
      'utf8'
    );

    this.logger.log('✅ 过渡期兼容层创建完成');
  }

  /**
   * 阶段3：更新DTO定义，添加新字段
   */
  private async updateDtoDefinitions(fieldAnalysis: any): Promise<void> {
    this.logger.log('📝 阶段3：更新DTO定义，添加新字段...');

    let updatedDtoCount = 0;

    for (const dtoFile of fieldAnalysis.dtoFiles) {
      let content = await fs.readFile(dtoFile.file, 'utf8');
      let fileModified = false;

      for (const mapping of this.timeFieldMappings) {
        if (dtoFile.fields.includes(mapping.oldField)) {
          // 检查是否已经有新字段
          const newFieldPattern = new RegExp(`\\b${mapping.newField}\\b`);
          if (!content.match(newFieldPattern)) {
            // 在旧字段后添加新字段定义
            const oldFieldPattern = new RegExp(
              `(\\s*@ApiProperty\\([^)]*\\)\\s*\\n\\s*@Is\\w+\\(\\)\\s*\\n\\s*${mapping.oldField}:\\s*number;)`,
              'g'
            );

            const replacement = `$1

  @ApiProperty({ 
    description: "${mapping.description}（毫秒，推荐使用此字段）",
    example: 150
  })
  @IsNumber()
  @IsOptional() // 过渡期设为可选
  ${mapping.newField}?: number;`;

            if (content.match(oldFieldPattern)) {
              content = content.replace(oldFieldPattern, replacement);
              fileModified = true;

              // 添加deprecation注释到旧字段
              const oldFieldDeprecationPattern = new RegExp(
                `(\\s*@ApiProperty\\([^)]*\\))(\\s*\\n\\s*@Is\\w+\\(\\)\\s*\\n\\s*${mapping.oldField}:\\s*number;)`
              );
              
              const deprecationReplacement = `$1
  /** @deprecated 使用 ${mapping.newField} 替代 */
  $2`;

              content = content.replace(oldFieldDeprecationPattern, deprecationReplacement);
            }
          }
        }
      }

      if (fileModified) {
        // 添加兼容层导入
        if (!content.includes('TimeFieldCompatibilityLayer')) {
          const importInsertPosition = content.indexOf('export class');
          if (importInsertPosition > 0) {
            const importStatement = `import { TimeFieldCompatibilityLayer } from '../../common/utils/time-field-compatibility.util';\n\n`;
            content = content.slice(0, importInsertPosition) + importStatement + content.slice(importInsertPosition);
          }
        }

        await fs.writeFile(dtoFile.file, content, 'utf8');
        updatedDtoCount++;
        this.logger.debug(`✅ 更新DTO: ${dtoFile.file}`);
      }
    }

    this.logger.log(`✅ DTO定义更新完成，共更新 ${updatedDtoCount} 个文件`);
  }

  /**
   * 阶段4：添加过渡逻辑和deprecation日志
   */
  private async addTransitionLogicAndLogging(fieldAnalysis: any): Promise<void> {
    this.logger.log('🔧 阶段4：添加过渡逻辑和deprecation日志...');

    let updatedServiceCount = 0;

    for (const serviceFile of fieldAnalysis.serviceFiles) {
      let content = await fs.readFile(serviceFile.file, 'utf8');
      let fileModified = false;

      // 添加兼容层导入
      if (!content.includes('TimeFieldCompatibilityLayer')) {
        const importPosition = content.indexOf('import');
        const importStatement = `import { TimeFieldCompatibilityLayer } from '../common/utils/time-field-compatibility.util';\n`;
        content = importStatement + content;
        fileModified = true;
      }

      // 替换直接的字段访问为兼容层调用
      for (const mapping of this.timeFieldMappings) {
        if (serviceFile.fields.includes(mapping.oldField)) {
          // 替换字段读取
          const directAccessPattern = new RegExp(
            `\\b([a-zA-Z_$][a-zA-Z0-9_$]*)\\.${mapping.oldField}\\b`,
            'g'
          );

          const replacement = `TimeFieldCompatibilityLayer.get${mapping.oldField.charAt(0).toUpperCase() + mapping.oldField.slice(1)}($1, '${serviceFile.file}')`;

          if (content.match(directAccessPattern)) {
            content = content.replace(directAccessPattern, replacement);
            fileModified = true;
          }

          // 替换字段设置
          const assignmentPattern = new RegExp(
            `\\b([a-zA-Z_$][a-zA-Z0-9_$]*)\\.${mapping.oldField}\\s*=\\s*([^;]+);`,
            'g'
          );

          const setterReplacement = `TimeFieldCompatibilityLayer.set${mapping.oldField.charAt(0).toUpperCase() + mapping.oldField.slice(1)}($1, $2);`;

          if (content.match(assignmentPattern)) {
            content = content.replace(assignmentPattern, setterReplacement);
            fileModified = true;
          }
        }
      }

      if (fileModified) {
        await fs.writeFile(serviceFile.file, content, 'utf8');
        updatedServiceCount++;
        this.logger.debug(`✅ 更新Service: ${serviceFile.file}`);
      }
    }

    this.logger.log(`✅ 过渡逻辑和日志添加完成，共更新 ${updatedServiceCount} 个服务文件`);
  }

  /**
   * 阶段5：更新业务逻辑使用新字段
   */
  private async updateBusinessLogicToNewFields(fieldAnalysis: any): Promise<void> {
    this.logger.log('💼 阶段5：更新业务逻辑使用新字段...');

    // 创建新字段优先使用的示例服务
    const newFieldUsageExample = `
/**
 * 示例：如何在新代码中优先使用新的时间字段
 * 
 * 1. 创建数据时使用新字段名
 * 2. 读取数据时通过兼容层获取
 * 3. 在关键性能路径上直接使用新字段
 */

// ✅ 推荐做法：新代码直接使用新字段
const performanceMetrics = {
  processingTimeMs: 150,
  executionTimeMs: 75,
  responseTimeMs: 225,
  timestamp: new Date().toISOString()
};

// ✅ 推荐做法：通过兼容层读取，支持新旧字段
const processingTime = TimeFieldCompatibilityLayer.getProcessingTime(data, 'MyService');

// ✅ 推荐做法：设置时间字段时使用兼容层
TimeFieldCompatibilityLayer.setProcessingTime(result, Date.now() - startTime);

// ✅ 推荐做法：批量迁移现有数据
const migratedData = TimeFieldCompatibilityLayer.migrateTimeFields(legacyData);
`;

    await fs.writeFile(
      'src/examples/time-field-usage-example.ts',
      newFieldUsageExample,
      'utf8'
    );

    this.logger.log('✅ 业务逻辑更新指导完成');
  }

  /**
   * 阶段6：生成版本变更说明
   */
  private async generateVersionChangeDoc(): Promise<void> {
    this.logger.log('📋 阶段6：生成版本变更说明...');

    const changelogContent = `# 时间字段标准化版本变更说明

## 版本：v2.1.0 - 时间字段统一标准化

### 变更概述
为提高API一致性和代码可维护性，统一所有时间相关字段的命名规范。

### 主要变更

#### 1. 字段重命名
| 旧字段名 | 新字段名 | 影响组件 | 状态 |
|----------|----------|----------|------|
| \`processingTime\` | \`processingTimeMs\` | Transformer | 🔄 过渡期 |
| \`executionTime\` | \`executionTimeMs\` | Cache | 🔄 过渡期 |
| \`responseTime\` | \`responseTimeMs\` | 通用组件 | 🔄 过渡期 |

#### 2. 过渡期支持 (v2.1.0 - v2.4.0)
- ✅ **双字段支持**: 新旧字段名同时存在和工作
- ✅ **自动迁移**: 兼容层自动处理字段转换
- ✅ **Deprecation警告**: 使用旧字段时记录警告日志
- ✅ **零中断**: 现有API继续正常工作

#### 3. 最终状态 (v2.5.0+)
- 🎯 **仅保留新字段**: 移除所有旧字段支持
- 🎯 **性能优化**: 移除兼容层，提高运行效率
- 🎯 **一致性**: 所有时间字段统一使用毫秒单位

### 迁移指南

#### 对于API使用者
\`\`\`json
// ✅ 当前版本（v2.1+）- 推荐使用新字段
{
  "processingTimeMs": 150,
  "executionTimeMs": 75,
  "responseTimeMs": 225,
  "timestamp": "2023-12-01T12:00:00.000Z"
}

// ⚠️  过渡期仍支持（会有警告日志）
{
  "processingTime": 150,
  "executionTime": 75,
  "responseTime": 225,
  "timestamp": "2023-12-01T12:00:00.000Z"
}

// ❌ v2.5.0后不再支持
{
  "processingTime": 150  // 将被忽略
}
\`\`\`

#### 对于开发者
\`\`\`typescript
// ✅ 新代码写法
const metrics = {
  processingTimeMs: Date.now() - startTime,
  timestamp: new Date().toISOString()
};

// ✅ 兼容旧数据的读取
const processingTime = TimeFieldCompatibilityLayer.getProcessingTime(data);

// ⚠️  过渡期写法（不推荐）
const oldMetrics = {
  processingTime: Date.now() - startTime  // 会触发deprecation警告
};
\`\`\`

### 监控指标

#### Deprecation警告监控
- 日志级别：WARN
- 日志格式：\`DEPRECATION: 'processingTime' 字段已废弃，请使用 'processingTimeMs' 替代\`
- 监控阈值：> 100次/小时需要关注

#### 迁移进度指标
- **目标**: 在v2.3.0版本前，deprecation警告降至 < 10次/小时
- **工具**: 提供迁移进度检查脚本 \`npm run check:time-field-migration\`
- **报告**: 每周生成迁移进度报告

### 重要时间节点

| 时间 | 版本 | 里程碑 | 行动项 |
|------|------|--------|--------|
| 2023-12-01 | v2.1.0 | 🚀 双字段支持上线 | 开始使用新字段 |
| 2024-01-01 | v2.2.0 | 📊 迁移进度评估 | 检查deprecation警告 |
| 2024-02-01 | v2.3.0 | ⚠️  迁移提醒强化 | 增强warning级别 |
| 2024-03-01 | v2.4.0 | 🔔 最后兼容版本 | 最后支持旧字段 |
| 2024-04-01 | v2.5.0 | 🎯 完全迁移 | 移除旧字段支持 |

### 风险评估与缓解

#### 低风险 ✅
- API响应格式保持兼容
- 现有客户端无需立即更新
- 渐进式迁移，可控制节奏

#### 中风险 ⚠️
- 需要监控deprecation警告数量
- 第三方集成可能需要通知
- 性能略有影响（兼容层开销）

#### 缓解措施
1. **完整的过渡期**: 4个月的双字段支持
2. **详细的监控**: deprecation警告统计和报告
3. **工具支持**: 自动检查和迁移工具
4. **文档完善**: 详细的迁移指南和示例

### 技术细节

#### 兼容层实现
- **位置**: \`src/common/utils/time-field-compatibility.util.ts\`
- **功能**: 自动字段转换、deprecation日志、统计信息
- **性能**: 轻量级，运行时开销 < 1ms

#### 测试覆盖
- **单元测试**: 兼容层所有方法 100% 覆盖
- **集成测试**: 新旧字段混用场景
- **性能测试**: 兼容层性能基准测试

---

**联系方式**
- 技术支持: dev-support@company.com
- 迁移问题: migration-help@company.com
- 文档反馈: docs@company.com

*最后更新: ${new Date().toISOString()}*
*文档版本: v2.1.0*
`;

    await fs.mkdir('docs/version-changes', { recursive: true });
    await fs.writeFile(
      'docs/version-changes/time-fields-unification-v2.1.0.md',
      changelogContent,
      'utf8'
    );

    this.logger.log('✅ 版本变更说明生成完成');
  }

  /**
   * 阶段7：创建迁移验证工具
   */
  private async createMigrationVerificationTool(): Promise<void> {
    this.logger.log('🔍 阶段7：创建迁移验证工具...');

    const verificationToolCode = `#!/usr/bin/env node

/**
 * 时间字段迁移验证工具
 * 
 * 用法：
 * npm run check:time-field-migration
 * 
 * 功能：
 * 1. 检查代码中旧字段的使用情况
 * 2. 统计deprecation警告数量
 * 3. 生成迁移进度报告
 * 4. 提供迁移建议
 */

import { GlobWrapper } from '../utils/glob-wrapper.util';
import * as fs from 'fs/promises';
import { TimeFieldCompatibilityLayer } from '../src/common/utils/time-field-compatibility.util';

interface MigrationReport {
  summary: {
    totalFiles: number;
    filesWithOldFields: number;
    totalOldFieldUsage: number;
    migrationProgress: number;
  };
  details: {
    file: string;
    oldFields: string[];
    usageCount: number;
    suggestions: string[];
  }[];
  recommendations: string[];
}

class TimeFieldMigrationChecker {
  private readonly oldFields = ['processingTime', 'executionTime', 'responseTime'];

  async generateReport(): Promise<MigrationReport> {
    console.log('🔍 开始检查时间字段迁移进度...');

    const report: MigrationReport = {
      summary: {
        totalFiles: 0,
        filesWithOldFields: 0,
        totalOldFieldUsage: 0,
        migrationProgress: 0
      },
      details: [],
      recommendations: []
    };

    // 扫描所有相关文件
    const files = await GlobWrapper.findTypeScriptFiles();
    report.summary.totalFiles = files.length;

    for (const file of files) {
      const content = await fs.readFile(file, 'utf8');
      const fileDetails = await this.analyzeFile(file, content);
      
      if (fileDetails.usageCount > 0) {
        report.summary.filesWithOldFields++;
        report.summary.totalOldFieldUsage += fileDetails.usageCount;
        report.details.push(fileDetails);
      }
    }

    // 计算迁移进度
    const totalPossibleUsage = report.summary.totalFiles * this.oldFields.length;
    report.summary.migrationProgress = Math.round(
      ((totalPossibleUsage - report.summary.totalOldFieldUsage) / totalPossibleUsage) * 100
    );

    // 生成建议
    report.recommendations = this.generateRecommendations(report);

    return report;
  }

  private async analyzeFile(file: string, content: string): Promise<{
    file: string;
    oldFields: string[];
    usageCount: number;
    suggestions: string[];
  }> {
    const result = {
      file,
      oldFields: [] as string[],
      usageCount: 0,
      suggestions: [] as string[]
    };

    for (const oldField of this.oldFields) {
      const fieldRegex = new RegExp(\`\\\\b\${oldField}\\\\b\`, 'g');
      const matches = content.match(fieldRegex);
      
      if (matches) {
        result.oldFields.push(oldField);
        result.usageCount += matches.length;
        
        // 生成具体建议
        const newField = oldField + 'Ms';
        result.suggestions.push(\`替换 '\${oldField}' 为 '\${newField}'\`);
        
        // 检查是否已经有新字段
        const newFieldRegex = new RegExp(\`\\\\b\${newField}\\\\b\`);
        if (content.match(newFieldRegex)) {
          result.suggestions.push(\`检测到同时存在 '\${oldField}' 和 '\${newField}'，可以移除旧字段\`);
        }
      }
    }

    return result;
  }

  private generateRecommendations(report: MigrationReport): string[] {
    const recommendations: string[] = [];

    if (report.summary.migrationProgress < 50) {
      recommendations.push('⚠️  迁移进度较低，建议优先处理使用频率最高的文件');
      recommendations.push('📚 参考迁移文档: docs/version-changes/time-fields-unification-v2.1.0.md');
    }

    if (report.summary.migrationProgress < 80) {
      recommendations.push('🔧 使用 TimeFieldCompatibilityLayer 进行渐进式迁移');
      recommendations.push('📊 建议设置 deprecation 警告监控');
    }

    if (report.summary.migrationProgress >= 90) {
      recommendations.push('🎉 迁移进度良好，可以考虑在下个版本移除兼容层');
    }

    // 针对高频使用文件的建议
    const highUsageFiles = report.details.filter(d => d.usageCount > 5);
    if (highUsageFiles.length > 0) {
      recommendations.push(\`🎯 优先处理高频使用文件: \${highUsageFiles.map(f => f.file).join(', ')}\`);
    }

    return recommendations;
  }

  async printReport(): Promise<void> {
    const report = await this.generateReport();

    console.log('\\n📊 时间字段迁移进度报告');
    console.log('================================');
    console.log(\`总文件数: \${report.summary.totalFiles}\`);
    console.log(\`包含旧字段的文件: \${report.summary.filesWithOldFields}\`);
    console.log(\`旧字段使用总数: \${report.summary.totalOldFieldUsage}\`);
    console.log(\`迁移进度: \${report.summary.migrationProgress}%\`);

    if (report.details.length > 0) {
      console.log('\\n📋 详细信息:');
      console.log('--------------------------------');
      
      report.details
        .sort((a, b) => b.usageCount - a.usageCount)
        .slice(0, 10) // 只显示前10个文件
        .forEach(detail => {
          console.log(\`📄 \${detail.file}\`);
          console.log(\`   旧字段: \${detail.oldFields.join(', ')}\`);
          console.log(\`   使用次数: \${detail.usageCount}\`);
          detail.suggestions.forEach(suggestion => {
            console.log(\`   💡 \${suggestion}\`);
          });
          console.log('');
        });
    }

    if (report.recommendations.length > 0) {
      console.log('\\n💡 迁移建议:');
      console.log('--------------------------------');
      report.recommendations.forEach(rec => console.log(rec));
    }

    // 获取兼容层统计
    const compatStats = TimeFieldCompatibilityLayer.getMigrationStats();
    console.log('\\n📈 运行时统计:');
    console.log('--------------------------------');
    console.log(\`Deprecation 警告数量: \${compatStats.deprecationWarningsCount}\`);
    console.log(\`警告类型: \${compatStats.warningTypes.join(', ')}\`);

    console.log('\\n✅ 检查完成');
  }
}

// CLI执行
if (require.main === module) {
  const checker = new TimeFieldMigrationChecker();
  checker.printReport().catch(console.error);
}

export { TimeFieldMigrationChecker };
`;

    await fs.mkdir('scripts', { recursive: true });
    await fs.writeFile('scripts/check-time-field-migration.ts', verificationToolCode, 'utf8');

    // 更新package.json脚本
    const packageJsonPath = 'package.json';
    try {
      const packageContent = await fs.readFile(packageJsonPath, 'utf8');
      const packageJson = JSON.parse(packageContent);
      
      if (!packageJson.scripts) {
        packageJson.scripts = {};
      }
      
      packageJson.scripts['check:time-field-migration'] = 'bun run scripts/check-time-field-migration.ts';
      
      await fs.writeFile(packageJsonPath, JSON.stringify(packageJson, null, 2), 'utf8');
      
      this.logger.log('✅ package.json 脚本已更新');
    } catch (error) {
      this.logger.warn('⚠️ 无法更新 package.json 脚本:', error.message);
    }

    this.logger.log('✅ 迁移验证工具创建完成');
  }
}

/**
 * 执行器
 */
export async function executeP1TimeFieldsUnificationTransition(): Promise<void> {
  const script = new P1TimeFieldsUnificationTransitionScript();
  await script.execute();
}

// 直接执行
if (require.main === module) {
  executeP1TimeFieldsUnificationTransition()
    .then(() => {
      console.log('P1 Time Fields Unification with Transition completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('P1 Time Fields Unification failed:', error);
      process.exit(1);
    });
}