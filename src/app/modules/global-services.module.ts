/**
 * 全局应用服务模块
 * 🎯 管理应用级基础设施服务，提供全局访问
 */

import { Module, Global } from "@nestjs/common";
import { MonitoringModule } from '../../monitoring/monitoring.module';

import { BackgroundTaskService } from '../services/infrastructure/background-task.service';

/**
 * 应用级全局服务模块
 *
 * @remarks
 * 此模块管理应用基础设施服务，这些服务需要全局可用：
 * - BackgroundTaskService: 后台任务处理服务
 * 
 * 使用 @Global() 使得这些基础设施服务在整个应用中可用，
 * 无需在每个使用模块中显式导入
 * 
 * 与 SharedServicesModule 的区别：
 * - GlobalServicesModule: 应用基础设施服务
 * - SharedServicesModule: 核心业务逻辑服务
 */
@Global()
@Module({
  imports: [
    MonitoringModule, // BackgroundTaskService 需要监控服务
  ],
  providers: [
    BackgroundTaskService,
  ],
  exports: [
    BackgroundTaskService,
  ],
})
export class GlobalServicesModule {}