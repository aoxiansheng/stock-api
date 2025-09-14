import { LogLevelController } from './log-level-controller';
import { LogLevel, LogLevelConfig, LoggingStats } from './types';

/**
 * 安全日志级别控制器
 * 
 * 核心功能：
 * 1. 提供LogLevelController的安全访问封装
 * 2. 实现自动降级机制，确保不影响业务运行
 * 3. 记录错误和警告信息供诊断使用
 * 4. 保证在任何情况下都不会抛出异常
 */
export class SafeLogLevelController {
  private static instance: SafeLogLevelController | null = null;
  private controller: LogLevelController | null = null;
  private isInitialized = false;
  private initializationError: Error | null = null;
  private degradationMode = false;
  private errorCount = 0;
  private lastErrorTime: number | null = null;

  /**
   * 单例模式获取实例
   */
  static getInstance(): SafeLogLevelController {
    if (!SafeLogLevelController.instance) {
      SafeLogLevelController.instance = new SafeLogLevelController();
    }
    return SafeLogLevelController.instance;
  }

  constructor() {
    this.initializeController();
  }

  /**
   * 初始化控制器
   */
  private async initializeController(): Promise<void> {
    try {
      this.controller = LogLevelController.getInstance();
      await this.controller.onModuleInit();
      this.isInitialized = true;
      this.degradationMode = false;
      
      console.log('✅ SafeLogLevelController initialized successfully');
    } catch (error) {
      this.initializationError = error as Error;
      this.degradationMode = true;
      this.isInitialized = false;
      
      console.warn('⚠️ SafeLogLevelController initialization failed, entering degradation mode:', error);
    }
  }

  /**
   * 安全的日志级别检查
   * 
   * @param context 日志上下文
   * @param level 日志级别
   * @returns 是否应该记录日志（降级模式下总是返回true）
   */
  shouldLog(context: string, level: LogLevel): boolean {
    // 降级模式：允许所有日志
    if (this.degradationMode || !this.controller) {
      return true;
    }

    try {
      return this.controller.shouldLog(context, level);
    } catch (error) {
      this.handleError('shouldLog', error as Error);
      return true; // 出错时允许日志输出
    }
  }

  /**
   * 安全获取配置
   */
  getConfiguration(): LogLevelConfig | null {
    if (this.degradationMode || !this.controller) {
      return null;
    }

    try {
      return this.controller.getConfiguration();
    } catch (error) {
      this.handleError('getConfiguration', error as Error);
      return null;
    }
  }

  /**
   * 安全获取统计信息
   */
  getStats(): LoggingStats | null {
    if (this.degradationMode || !this.controller) {
      return null;
    }

    try {
      return this.controller.getStats();
    } catch (error) {
      this.handleError('getStats', error as Error);
      return null;
    }
  }

  /**
   * 获取安全控制器状态
   */
  getStatus(): {
    initialized: boolean;
    degradationMode: boolean;
    errorCount: number;
    lastError: string | null;
    controllerReady: boolean;
  } {
    return {
      initialized: this.isInitialized,
      degradationMode: this.degradationMode,
      errorCount: this.errorCount,
      lastError: this.initializationError?.message || null,
      controllerReady: this.controller !== null && !this.degradationMode,
    };
  }

  /**
   * 尝试重新初始化控制器
   */
  async reinitialize(): Promise<boolean> {
    console.log('🔄 Attempting to reinitialize SafeLogLevelController...');
    
    try {
      await this.initializeController();
      
      if (!this.degradationMode && this.isInitialized) {
        console.log('✅ SafeLogLevelController reinitialization successful');
        this.errorCount = 0;
        this.lastErrorTime = null;
        this.initializationError = null;
        return true;
      }
      
      return false;
    } catch (error) {
      console.warn('❌ SafeLogLevelController reinitialization failed:', error);
      return false;
    }
  }

  /**
   * 处理错误
   */
  private handleError(method: string, error: Error): void {
    this.errorCount++;
    this.lastErrorTime = Date.now();
    
    // 避免错误日志过多，限制频率
    const now = Date.now();
    if (!this.lastErrorTime || now - this.lastErrorTime > 60000) { // 1分钟内只记录一次
      console.warn(`⚠️ SafeLogLevelController.${method} error (count: ${this.errorCount}):`, error.message);
    }

    // 如果错误过多，进入降级模式
    if (this.errorCount > 10 && !this.degradationMode) {
      console.warn('⚠️ Too many errors, entering degradation mode');
      this.degradationMode = true;
    }
  }

  /**
   * 重置错误计数器（用于测试或手动恢复）
   */
  resetErrorCount(): void {
    this.errorCount = 0;
    this.lastErrorTime = null;
    console.log('🔄 SafeLogLevelController error count reset');
  }

  /**
   * 强制退出降级模式（用于测试或手动恢复）
   */
  async forceRecovery(): Promise<boolean> {
    console.log('🔄 Forcing SafeLogLevelController recovery...');
    
    this.degradationMode = false;
    this.errorCount = 0;
    this.lastErrorTime = null;
    this.initializationError = null;
    
    return await this.reinitialize();
  }

  /**
   * 重置控制器（主要用于测试）
   */
  reset(): void {
    this.controller?.reset();
    this.controller = null;
    this.isInitialized = false;
    this.initializationError = null;
    this.degradationMode = false;
    this.errorCount = 0;
    this.lastErrorTime = null;
  }
}

/**
 * 创建安全的日志级别控制器实例
 */
export function createSafeLogLevelController(): SafeLogLevelController {
  return SafeLogLevelController.getInstance();
}

/**
 * 安全的日志级别检查函数（全局使用）
 */
export function safeShoudLog(context: string, level: LogLevel): boolean {
  try {
    const controller = SafeLogLevelController.getInstance();
    return controller.shouldLog(context, level);
  } catch (error) {
    // 最后的安全网：即使SafeLogLevelController也失败时，允许所有日志
    console.warn('⚠️ safeShoudLog failed, allowing all logs:', error);
    return true;
  }
}