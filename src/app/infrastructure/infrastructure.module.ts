import { Global, Module } from '@nestjs/common';
import { MonitoringModule } from '../../monitoring/monitoring.module';
import { BackgroundTaskService } from './services/background-task.service';
import { HealthCheckService } from './health/health-check.service';
import { ShutdownService } from './services/shutdown.service';

/**
 * InfrastructureModule - 基础设施模块
 * 
 * 职责：
 * - 管理所有基础设施服务
 * - 健康检查服务
 * - 后台任务管理
 * - 优雅关闭服务
 */
@Global()
@Module({
  imports: [
    MonitoringModule, // 监控依赖
  ],
  providers: [
    BackgroundTaskService,
    HealthCheckService,
    ShutdownService,
  ],
  exports: [
    BackgroundTaskService,
    HealthCheckService,
    ShutdownService,
  ],
})
export class InfrastructureModule {}