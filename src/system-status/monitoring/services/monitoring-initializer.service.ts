/**
 * 🎯 指标工具初始化服务
 * 
 * 根据 FeatureFlags 配置初始化 Metrics 工具的 legacyMode
 */
import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { MetricsHelper } from '../helper/metrics-helper';

@Injectable()
export class MonitoringInitializerService implements OnModuleInit {
  private readonly logger = new Logger(MonitoringInitializerService.name);

  constructor() {}

  /**
   * 在模块初始化时配置 Metrics 工具的 legacyMode
   */
  onModuleInit(): void {
    // 直接关闭 legacyMode（旧内存统计逻辑已弃用）
    MetricsHelper.setLegacyMode(false);
    this.logger.log('Metrics 工具初始化完成，LegacyMode 已禁用，仅更新 Prometheus 指标');
  }
} 