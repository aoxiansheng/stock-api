import { Injectable, Inject } from '@nestjs/common';
import { createLogger } from '@appcore/config/logger.config';

/**
 * FeatureFlagsService - 功能开关服务
 * 
 * 职责：
 * - 管理功能开关状态
 * - 动态切换功能
 * - 提供功能开关查询接口
 */
@Injectable()
export class FeatureFlagsService {
  private readonly logger = createLogger(FeatureFlagsService.name);

  constructor(
    @Inject('FEATURE_FLAGS') private readonly featureFlags: Record<string, boolean>,
  ) {}

  /**
   * 检查功能是否启用
   */
  isEnabled(feature: string): boolean {
    return this.featureFlags[feature] || false;
  }

  /**
   * 获取所有功能开关状态
   */
  getAllFlags(): Record<string, boolean> {
    return { ...this.featureFlags };
  }

  /**
   * 记录功能开关访问
   */
  checkFeature(feature: string): boolean {
    const isEnabled = this.isEnabled(feature);
    this.logger.debug(`功能开关检查 - ${feature}: ${isEnabled ? '启用' : '禁用'}`);
    return isEnabled;
  }
}