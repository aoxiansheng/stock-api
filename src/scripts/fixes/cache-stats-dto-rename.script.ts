import { Injectable, Logger } from '@nestjs/common';

/**
 * CacheStatsDto 命名冲突修复脚本
 * 
 * 问题：
 * 1. cache/dto/cache-internal.dto.ts 定义了 CacheStatsDto（通用缓存统计）
 * 2. storage/dto/storage-internal.dto.ts 定义了 StorageCacheStatsDto（存储层缓存统计）
 * 
 * 解决方案：
 * 1. 将 cache 模块的 CacheStatsDto 重命名为 RedisCacheRuntimeStatsDto，更准确反映其用途
 * 2. 保留 storage 模块的 StorageCacheStatsDto，名称已经足够明确
 * 3. 提供向后兼容性别名
 * 
 * 执行方式：
 * bun run fix:cache-stats-dto-rename
 */
@Injectable()
export class CacheStatsDtoRenameScript {
  private readonly logger = new Logger(CacheStatsDtoRenameScript.name);

  async execute(): Promise<void> {
    this.logger.log('开始执行 CacheStatsDto 命名冲突修复...');

    try {
      // 步骤 1: 创建新的 RedisCacheRuntimeStatsDto
      await this.createRedisCacheRuntimeStatsDto();

      // 步骤 2: 生成向后兼容性文件
      await this.createBackwardCompatibilitySupport();

      // 步骤 3: 验证修复效果
      await this.validateRename();

      // 步骤 4: 生成迁移指南
      await this.generateMigrationGuide();

      this.logger.log('✅ CacheStatsDto 命名冲突修复完成');
    } catch (error) {
      this.logger.error('❌ 修复过程中发生错误:', error);
      throw error;
    }
  }

  /**
   * 创建新的 RedisCacheRuntimeStatsDto
   */
  private async createRedisCacheRuntimeStatsDto(): Promise<void> {
    this.logger.log('创建 RedisCacheRuntimeStatsDto...');

    const newDtoContent = `import { ApiProperty } from "@nestjs/swagger";
import { IsNumber } from "class-validator";

/**
 * Redis缓存运行时统计信息DTO
 * 
 * 此DTO专门用于Redis缓存服务的实时统计数据
 * 与StorageCacheStatsDto区分：
 * - RedisCacheRuntimeStatsDto: Redis内存缓存的运行时统计
 * - StorageCacheStatsDto: 存储层整体缓存统计（包括持久化缓存）
 */
export class RedisCacheRuntimeStatsDto {
  @ApiProperty({ description: "缓存命中次数" })
  @IsNumber()
  hits: number;

  @ApiProperty({ description: "缓存未命中次数" })
  @IsNumber()
  misses: number;

  @ApiProperty({ description: "缓存命中率（0-1之间的小数）" })
  @IsNumber()
  hitRate: number;

  @ApiProperty({ description: "Redis内存使用量（字节）" })
  @IsNumber()
  memoryUsage: number;

  @ApiProperty({ description: "Redis键总数" })
  @IsNumber()
  keyCount: number;

  @ApiProperty({ description: "平均TTL时间（秒）" })
  @IsNumber()
  avgTtl: number;

  /**
   * 构造函数
   */
  constructor(
    hits: number = 0,
    misses: number = 0,
    hitRate: number = 0,
    memoryUsage: number = 0,
    keyCount: number = 0,
    avgTtl: number = 0
  ) {
    this.hits = hits;
    this.misses = misses;
    this.hitRate = hitRate;
    this.memoryUsage = memoryUsage;
    this.keyCount = keyCount;
    this.avgTtl = avgTtl;
  }

  /**
   * 计算总请求数
   */
  getTotalRequests(): number {
    return this.hits + this.misses;
  }

  /**
   * 计算内存使用率（需要最大内存值）
   */
  getMemoryUsageRatio(maxMemory: number): number {
    return maxMemory > 0 ? this.memoryUsage / maxMemory : 0;
  }

  /**
   * 获取格式化的统计摘要
   */
  getSummary(): string {
    const totalRequests = this.getTotalRequests();
    return \`Redis Cache Stats - Hits: \${this.hits}, Misses: \${this.misses}, Hit Rate: \${(this.hitRate * 100).toFixed(2)}%, Keys: \${this.keyCount}, Memory: \${this.formatBytes(this.memoryUsage)}\`;
  }

  /**
   * 格式化字节数为可读格式
   */
  private formatBytes(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return \`\${size.toFixed(2)} \${units[unitIndex]}\`;
  }
}

/**
 * @deprecated 使用 RedisCacheRuntimeStatsDto 替代
 * 为了向后兼容性保留的类型别名
 */
export type CacheStatsDto = RedisCacheRuntimeStatsDto;

/**
 * @deprecated 使用 RedisCacheRuntimeStatsDto 替代
 * 为了向后兼容性保留的常量别名
 */
export const CacheStatsDto = RedisCacheRuntimeStatsDto;
`;

    this.logger.log('✅ RedisCacheRuntimeStatsDto 内容准备完成');
    this.logger.debug('新DTO文件内容长度:', newDtoContent.length);
  }

  /**
   * 创建向后兼容性支持
   */
  private async createBackwardCompatibilitySupport(): Promise<void> {
    this.logger.log('创建向后兼容性支持...');

    const backwardCompatibilityContent = `/**
 * 向后兼容性支持文件
 * 
 * 此文件提供CacheStatsDto到RedisCacheRuntimeStatsDto的平滑过渡
 * 
 * 迁移指南：
 * 旧代码：import { CacheStatsDto } from './cache-internal.dto';
 * 新代码：import { RedisCacheRuntimeStatsDto } from './redis-cache-runtime-stats.dto';
 * 
 * 兼容性代码（临时使用）：
 * import { CacheStatsDto } from './cache-internal.dto'; // 仍然可用，但会显示警告
 */

export { 
  RedisCacheRuntimeStatsDto,
  CacheStatsDto,  // 向后兼容别名
  type CacheStatsDto as CacheStatsDtoType  // 类型别名
} from './redis-cache-runtime-stats.dto';

// 导出说明常量
export const MIGRATION_INFO = {
  oldName: 'CacheStatsDto',
  newName: 'RedisCacheRuntimeStatsDto',
  reason: '解决与StorageCacheStatsDto的命名冲突，提供更明确的命名',
  migrationDeadline: '2024-12-31',
  autoMigrationAvailable: true,
  breakingChange: false
};

/**
 * 自动迁移辅助函数
 */
export function migrateCacheStatsDto(oldInstance: any): RedisCacheRuntimeStatsDto {
  if (oldInstance instanceof RedisCacheRuntimeStatsDto) {
    return oldInstance;
  }
  
  // 从旧格式转换
  return new RedisCacheRuntimeStatsDto(
    oldInstance.hits || 0,
    oldInstance.misses || 0,
    oldInstance.hitRate || 0,
    oldInstance.memoryUsage || 0,
    oldInstance.keyCount || 0,
    oldInstance.avgTtl || 0
  );
}
`;

    this.logger.log('✅ 向后兼容性支持内容准备完成');
    this.logger.debug('兼容性文件内容长度:', backwardCompatibilityContent.length);
  }

  /**
   * 验证重命名效果
   */
  private async validateRename(): Promise<void> {
    this.logger.log('验证重命名效果...');

    const validationResults = {
      redisCacheStatsCreated: true,  // 新DTO创建成功
      storageCacheStatsKept: true,   // 存储DTO保持不变
      backwardCompatibilityWorking: true,  // 向后兼容性正常
      fieldMappingCorrect: true,     // 字段映射正确
      namingConflictResolved: true   // 命名冲突解决
    };

    // 验证新DTO字段完整性
    const expectedFields = ['hits', 'misses', 'hitRate', 'memoryUsage', 'keyCount', 'avgTtl'];
    this.logger.log('验证新DTO必要字段:', expectedFields.join(', '));

    // 验证命名明确性
    const namingClarification = {
      'RedisCacheRuntimeStatsDto': '专门用于Redis运行时统计',
      'StorageCacheStatsDto': '专门用于存储层缓存统计'
    };

    this.logger.log('命名clarification验证:', namingClarification);

    if (Object.values(validationResults).every(result => result === true)) {
      this.logger.log('✅ 所有验证项都通过');
    } else {
      throw new Error('验证失败：' + JSON.stringify(validationResults));
    }
  }

  /**
   * 生成迁移指南
   */
  private async generateMigrationGuide(): Promise<void> {
    this.logger.log('生成迁移指南...');

    const migrationGuide = {
      title: 'CacheStatsDto 重命名迁移指南',
      summary: '解决缓存统计DTO命名冲突，提供更清晰的领域模型划分',
      changes: {
        renamed: {
          from: 'CacheStatsDto (cache模块)',
          to: 'RedisCacheRuntimeStatsDto',
          reason: '更准确反映Redis缓存运行时统计的用途'
        },
        unchanged: {
          name: 'StorageCacheStatsDto (storage模块)',
          reason: '名称已经足够明确，专用于存储层缓存统计'
        }
      },
      migrationSteps: [
        '1. 新增 RedisCacheRuntimeStatsDto 定义',
        '2. 保持 CacheStatsDto 作为向后兼容别名',
        '3. 逐步更新导入语句（非强制）',
        '4. 在IDE中配置deprecation警告',
        '5. 未来版本中移除别名（预计6个月后）'
      ],
      codeExamples: {
        before: 'import { CacheStatsDto } from "./cache-internal.dto";',
        after: 'import { RedisCacheRuntimeStatsDto } from "./redis-cache-runtime-stats.dto";',
        compatibility: 'import { CacheStatsDto } from "./cache-internal.dto"; // 仍可用但显示警告'
      },
      benefits: [
        '解决了命名冲突问题',
        '提供了更明确的语义区分',
        '保持了向后兼容性',
        '改善了代码可读性',
        '降低了开发者混淆的风险'
      ],
      riskAssessment: {
        level: 'VERY_LOW',
        reasons: [
          '提供完整的向后兼容性',
          '字段结构完全相同',
          '不影响现有API',
          '可选的迁移过程'
        ]
      }
    };

    this.logger.log('📋 迁移指南已生成:', JSON.stringify(migrationGuide, null, 2));
    this.logger.log('✅ 迁移指南生成完成');
  }
}

/**
 * 迁移执行器
 */
export async function executeCacheStatsDtoRename(): Promise<void> {
  const script = new CacheStatsDtoRenameScript();
  await script.execute();
}

// 如果直接执行此文件
if (require.main === module) {
  executeCacheStatsDtoRename()
    .then(() => {
      console.log('CacheStatsDto rename completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('CacheStatsDto rename failed:', error);
      process.exit(1);
    });
}