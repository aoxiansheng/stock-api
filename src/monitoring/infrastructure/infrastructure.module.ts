/**
 * 🎯 基础设施模块
 *
 * 提供监控基础能力：
 * - Prometheus 指标注册表
 * - 性能监控装饰器
 * - 监控拦截器
 * - 事件驱动指标桥接
 */

import { Module, forwardRef } from "@nestjs/common";
import { ModuleRef } from "@nestjs/core";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { RedisModule } from "@nestjs-modules/ioredis";
import { MetricsModule } from "./metrics/metrics.module";
import { MonitoringEventBridgeService } from "./bridge/monitoring-event-bridge.service";
import { ApiMonitoringInterceptor } from "./interceptors/api-monitoring.interceptor";
// import { MetricsRegistryService } from './metrics/metrics-registry.service'; // 🔧 Phase 1: 移除未使用的 import
import { FeatureFlags } from "@appcore/config/feature-flags.config";

@Module({
  imports: [RedisModule, MetricsModule],
  providers: [
    FeatureFlags, // 🔧 Phase 2.4: 集中提供 FeatureFlags（满足 MetricsRegistryService 依赖）
    MonitoringEventBridgeService, // 🎯 新增：事件桥接服务
    ApiMonitoringInterceptor, // 添加 ApiMonitoringInterceptor 作为 provider
    // 提供EventEmitter2的工厂，从全局获取实例
    {
      provide: EventEmitter2,
      useFactory: (moduleRef: ModuleRef) => {
        // 从全局上下文获取EventEmitter2，避免循环依赖
        try {
          return moduleRef.get(EventEmitter2, { strict: false });
        } catch (error) {
          // 如果获取失败，创建本地实例（降级方案）
          console.warn("无法获取全局EventEmitter2，创建本地实例");
          return new EventEmitter2();
        }
      },
      inject: [ModuleRef],
    },
  ],
  exports: [
    RedisModule,
    MetricsModule, // 🔧 导出 MetricsModule
    FeatureFlags, // 🔧 Phase 2.4: 导出 FeatureFlags 供其他模块使用
    MonitoringEventBridgeService, // 🎯 导出事件桥接服务供其他模块使用
    ApiMonitoringInterceptor, // 导出 ApiMonitoringInterceptor 供 main.ts 使用
  ],
})
export class InfrastructureModule {}
