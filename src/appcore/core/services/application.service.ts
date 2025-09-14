import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createLogger } from "@common/logging/index";
import { LifecycleService } from './lifecycle.service';
// import { StartupOrchestratorService } from '../../bootstrap/startup-orchestrator.service';

/**
 * ApplicationService - 应用主服务
 * 
 * 职责：
 * - 应用初始化
 * - 生命周期管理
 * - 应用状态管理
 */
@Injectable()
export class ApplicationService {
  private readonly logger = createLogger(ApplicationService.name);
  
  constructor(
    private readonly lifecycle: LifecycleService,
    // private readonly startup: StartupOrchestratorService,
    private readonly config: ConfigService,
  ) {}

  /**
   * 应用启动入口
   */
  async initialize(): Promise<void> {
    this.logger.log('应用初始化开始...');
    
    // await this.startup.executeStartupPhases();
    await this.lifecycle.registerShutdownHooks();
    
    this.logger.log('应用初始化完成');
  }

  /**
   * 应用启动完成回调
   */
  async onApplicationBootstrap(): Promise<void> {
    this.logger.log('应用启动完成，开始后续初始化...');
    
    // 执行应用启动完成后的任务
    // 例如：启动后台任务、注册健康检查等
    
    this.logger.log('应用完全启动完成');
  }

  /**
   * 获取应用状态
   */
  getApplicationInfo() {
    return {
      name: this.config.get('APP_NAME', 'smart-stock-data'),
      version: this.config.get('APP_VERSION', '1.0.0'),
      environment: this.config.get('NODE_ENV', 'development'),
      uptime: process.uptime(),
    };
  }
}