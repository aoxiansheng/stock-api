import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

// 导入Core相关Schema
import { 
  SymbolMappingRuleDocument, 
  SymbolMappingRuleDocumentSchema 
} from '../../core/00-prepare/symbol-mapper/schemas/symbol-mapping-rule.schema';
import { 
  FlexibleMappingRule, 
  FlexibleMappingRuleSchema 
} from '../../core/00-prepare/data-mapper/schemas/flexible-mapping-rule.schema';
import { 
  DataSourceTemplate, 
  DataSourceTemplateSchema 
} from '../../core/00-prepare/data-mapper/schemas/data-source-template.schema';
import { 
  StoredData, 
  StoredDataSchema 
} from '../../core/04-storage/storage/schemas/storage.schema';

/**
 * 核心业务域数据库模块
 * 
 * 职责：
 * - 统一注册核心业务相关的Schema
 * - 消除重复Schema注册问题
 * - 提供核心业务数据模型访问能力
 * - 不包含业务逻辑，只负解数据层
 */
@Module({
  imports: [
    MongooseModule.forFeature([
      // Symbol Mapper 相关 (消除重复注册)
      { name: SymbolMappingRuleDocument.name, schema: SymbolMappingRuleDocumentSchema },
      
      // Data Mapper 相关
      { name: FlexibleMappingRule.name, schema: FlexibleMappingRuleSchema },
      { name: DataSourceTemplate.name, schema: DataSourceTemplateSchema },
      
      // Storage 相关
      { name: StoredData.name, schema: StoredDataSchema },
    ]),
  ],
  exports: [MongooseModule],
})
export class CoreDatabaseModule {}