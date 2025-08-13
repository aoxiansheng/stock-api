/**
 * 🎯 指标工具初始化服务
 * 
 * 根据 FeatureFlags 配置初始化 Metrics 工具的 legacyMode
 */
import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { Metrics } from '../metrics-helper';

@Injectable()
export class MetricsInitializerService implements OnModuleInit {
  private readonly logger = new Logger(MetricsInitializerService.name);

  constructor() {}

  /**
   * 在模块初始化时配置 Metrics 工具的 legacyMode
   */
  onModuleInit(): void {
    // 直接关闭 legacyMode（旧内存统计逻辑已弃用）
    Metrics.setLegacyMode(false);
    this.logger.log('Metrics 工具初始化完成，LegacyMode 已禁用，仅更新 Prometheus 指标');
  }
} 