/**
 * 启动管理模块
 * 🎯 提供应用启动和关闭管理功能
 */

import { Module } from '@nestjs/common';

import { ConfigValidationModule } from '../config/validation/config-validation.module';
import { StartupHealthCheckerService } from './health-checker.service';
import { GracefulShutdownService } from './graceful-shutdown.service';

/**
 * 启动管理模块
 *
 * @remarks
 * 此模块提供完整的应用启动和关闭管理：
 * - StartupHealthCheckerService: 启动前健康检查和验证
 * - GracefulShutdownService: 优雅关闭管理和资源清理
 * 
 * 依赖模块：
 * - ConfigValidationModule: 提供配置验证功能
 * 
 * 使用场景：
 * - 应用启动时执行健康检查
 * - 确保所有必需服务可用后再启动
 * - 接收关闭信号时优雅关闭
 * - 清理资源和关闭连接
 */
@Module({
  imports: [
    ConfigValidationModule,
  ],
  providers: [
    StartupHealthCheckerService,
    GracefulShutdownService,
  ],
  exports: [
    StartupHealthCheckerService,
    GracefulShutdownService,
  ],
})
export class StartupModule {}