import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";

import { AuthModule } from "../../../../auth/module/auth.module";
import { PaginationModule } from "@common/modules/pagination/modules/pagination.module";
import { DataMapperCacheModule } from "../../../05-caching/module/data-mapper-cache/module/data-mapper-cache.module";
import { DatabaseModule } from "../../../../database/database.module"; // 🆕 统一数据库模块
import { FeatureFlags } from "@config/feature-flags.config";
import { MonitoringModule } from "../../../../monitoring/monitoring.module"; // ✅ 正确导入标准监控模块

// 🚀 重构后的控制器（按职责分离）
import { UserJsonPersistenceController } from "../controller/user-json-persistence.controller";
import { SystemPersistenceController } from "../controller/system-persistence.controller";
import { TemplateAdminController } from "../controller/template-admin.controller";
import { MappingRuleController } from "../controller/mapping-rule.controller";

// 🚀 简化后的核心服务（专注于核心功能）
import { DataSourceAnalyzerService } from "../services/data-source-analyzer.service";
import { DataSourceTemplateService } from "../services/data-source-template.service";
import { FlexibleMappingRuleService } from "../services/flexible-mapping-rule.service";
import { PersistedTemplateService } from "../services/persisted-template.service";
import { RuleAlignmentService } from "../services/rule-alignment.service";

// 🚀 简化后的Schema（只保留必要的数据结构）
import {
  DataSourceTemplate,
  DataSourceTemplateSchema,
} from "../schemas/data-source-template.schema";
import {
  FlexibleMappingRule,
  FlexibleMappingRuleSchema,
} from "../schemas/flexible-mapping-rule.schema";

@Module({
  imports: [
    // 🆕 统一数据库模块 (替代重复的MongooseModule.forFeature)
    DatabaseModule,

    // ✅ 标准监控模块导入 (替代原来的 EventEmitterModule)
    MonitoringModule, // 统一监控模块，提供事件驱动监控功能

    AuthModule,
    PaginationModule,
    DataMapperCacheModule, // 专用DataMapper缓存模块，替换通用CacheModule

    // ✅ 使用统一DatabaseModule (CoreDatabaseModule包含DataSourceTemplate和FlexibleMappingRule schemas)
  ],
  controllers: [
    UserJsonPersistenceController, // 用户JSON持久化控制器
    SystemPersistenceController, // 系统持久化控制器（专注预设模板持久化）
    TemplateAdminController, // 模板管理控制器（完整CRUD功能）
    MappingRuleController, // 映射规则控制器
  ],
  providers: [
    FeatureFlags,
    // 核心服务 - 专注于数据映射的核心功能
    DataSourceAnalyzerService, // 数据源分析服务
    DataSourceTemplateService, // 数据源模板服务
    FlexibleMappingRuleService, // 灵活映射规则服务
    PersistedTemplateService, // 预设模板持久化服务
    RuleAlignmentService, // 规则对齐服务
    // DataMapperCacheStandardizedService 已通过 DataMapperCacheModule 导入，无需重复声明
  ],
  exports: [
    // 导出核心服务供其他模块使用
    DataSourceAnalyzerService, // 导出分析服务，供其他模块使用
    DataSourceTemplateService, // 导出模板服务
    FlexibleMappingRuleService, // 导出灵活映射规则服务
    PersistedTemplateService, // 导出预设模板持久化服务
    RuleAlignmentService, // 导出规则对齐服务
    // DataMapperCacheStandardizedService 已通过 DataMapperCacheModule 导出，无需重复导出
  ],
})
export class DataMapperModule {}