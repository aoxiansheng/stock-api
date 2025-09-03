/**
 * 🎯 数据收集模块
 *
 * 负责收集原始监控数据：
 * - HTTP 请求监控
 * - 数据库操作监控
 * - 系统指标收集
 */

import { Module } from "@nestjs/common";
import { InfrastructureModule } from "../infrastructure/infrastructure.module";
import { CollectorService } from "./collector.service";
import { CollectorRepository } from "./collector.repository";
import { CollectorInterceptor } from "./collector.interceptor";
import { MONITORING_COLLECTOR_TOKEN } from "../contracts";

@Module({
  imports: [InfrastructureModule],
  providers: [
    CollectorService,
    CollectorRepository,
    CollectorInterceptor,
    // 提供 MONITORING_COLLECTOR_TOKEN 映射
    {
      provide: MONITORING_COLLECTOR_TOKEN,
      useExisting: CollectorService,
    },
  ],
  exports: [
    CollectorService,
    CollectorRepository,
    CollectorInterceptor,
    MONITORING_COLLECTOR_TOKEN, // 导出 token 供其他模块使用
  ],
})
export class CollectorModule {}
