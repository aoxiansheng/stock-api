/**
 * 🎯 统一监控模块
 *
 * 整合所有监控相关功能：
 * - Infrastructure: 基础设施层（Prometheus 指标、装饰器、拦截器）
 * - Collector: 数据收集层
 * - Analyzer: 数据分析层
 * - Presenter: 数据展示层
 * - Health: 扩展健康检查层（应用级健康检查）
 *
 * 🆕 集成通用组件库：
 * - RequestTrackingInterceptor: 统一请求ID追踪
 * - ResponseInterceptor: 标准响应格式化
 * - GlobalExceptionFilter: 全局异常处理
 * - CacheModule: 通用缓存服务
 * - PaginationModule: 标准分页功能
 */

import { Module } from "@nestjs/common";
import { APP_INTERCEPTOR, APP_FILTER } from "@nestjs/core";
import { EventEmitterModule } from "@nestjs/event-emitter";
import { ConfigModule } from "@nestjs/config";
import { CacheModule } from "@cache/module/cache.module";
import { PaginationModule } from "@common/modules/pagination/modules/pagination.module";
import { RequestTrackingInterceptor } from "@common/core/interceptors/request-tracking.interceptor";
import { ResponseInterceptor } from "@common/core/interceptors/response.interceptor";
import { GlobalExceptionFilter } from "@common/core/filters/global-exception.filter";
import { InfrastructureModule } from "./infrastructure/infrastructure.module";
import { CollectorModule } from "./collector/collector.module";
import { AnalyzerModule } from "./analyzer/analyzer.module";
import { PresenterModule } from "./presenter/presenter.module";
import { HealthModule } from "./health/health.module";
import { MonitoringUnifiedTtl } from "./config/unified/monitoring-unified-ttl.config";

@Module({
  imports: [
    EventEmitterModule.forRoot(), // Import EventEmitter for ResponseInterceptor
    ConfigModule.forFeature(MonitoringUnifiedTtl), // 统一TTL配置
    CacheModule, // 导入通用缓存模块替代MonitoringCacheModule
    PaginationModule, // 🆕 导入通用分页模块
    InfrastructureModule,
    CollectorModule,
    AnalyzerModule,
    PresenterModule,
    HealthModule, // 扩展健康检查模块
  ],
  providers: [
    // Configure global RequestTrackingInterceptor for monitoring module
    {
      provide: APP_INTERCEPTOR,
      useClass: RequestTrackingInterceptor,
    },
    // Configure global ResponseInterceptor for monitoring module
    {
      provide: APP_INTERCEPTOR,
      useClass: ResponseInterceptor,
    },
    // Configure global GlobalExceptionFilter for monitoring module
    {
      provide: APP_FILTER,
      useClass: GlobalExceptionFilter,
    },
  ],
  exports: [
    CacheModule, // 导出通用缓存模块供外部使用
    PaginationModule, // 🆕 导出通用分页模块
    InfrastructureModule,
    CollectorModule,
    AnalyzerModule,
    PresenterModule,
    HealthModule, // 导出健康检查模块
  ],
})
export class MonitoringModule {}
