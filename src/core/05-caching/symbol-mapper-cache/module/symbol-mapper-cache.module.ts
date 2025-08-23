import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { FeatureFlags } from '@common/config/feature-flags.config';
import { SharedServicesModule } from '../../../shared/module/shared-services.module';

// 导入 symbol-mapper 相关的 Schema 和 Repository
import { SymbolMappingRepository } from '../../../00-prepare/symbol-mapper/repositories/symbol-mapping.repository';
import {
  SymbolMappingRuleDocument,
  SymbolMappingRuleDocumentSchema,
} from '../../../00-prepare/symbol-mapper/schemas/symbol-mapping-rule.schema';

// 导入缓存服务
import { SymbolMapperCacheService } from '../services/symbol-mapper-cache.service';

/**
 * Symbol Mapper Cache 独立模块
 * 
 * 功能:
 * - 提供三层缓存架构 (L1规则缓存 + L2符号映射 + L3批量结果)
 * - MongoDB Change Stream 实时数据变更监听
 * - LRU内存缓存管理
 * - 并发控制和防重复查询
 * - 内存水位监控和自动清理
 * - 详细的缓存统计和性能指标
 */
@Module({
  imports: [
    SharedServicesModule, // 提供 MetricsRegistryService
    MongooseModule.forFeature([
      { name: SymbolMappingRuleDocument.name, schema: SymbolMappingRuleDocumentSchema },
    ]),
  ],
  providers: [
    SymbolMapperCacheService,
    SymbolMappingRepository, // 缓存服务需要访问数据库
    FeatureFlags,           // 缓存配置参数
  ],
  exports: [
    SymbolMapperCacheService, // 导出缓存服务供其他模块使用
  ],
})
export class SymbolMapperCacheModule {}