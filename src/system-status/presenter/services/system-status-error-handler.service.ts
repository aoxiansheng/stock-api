import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ISystemStatusErrorHandler, ErrorContext } from '../../contracts/interfaces/error-handler.interface';
import { SYSTEM_STATUS_EVENTS } from '../../contracts/events/system-status.events';

/**
 * 系统状态统一错误处理器
 * 职责：集中处理系统状态组件的所有错误，提供统一的错误处理和日志记录
 */
@Injectable()
export class SystemStatusErrorHandler implements ISystemStatusErrorHandler {
  private readonly logger = new Logger(SystemStatusErrorHandler.name);

  constructor(
    private readonly eventBus: EventEmitter2,
  ) {
    this.logger.log('SystemStatusErrorHandler initialized - 统一错误处理器已启动');
  }

  /**
   * 处理通用错误
   */
  handleError(error: Error, context: ErrorContext): void {
    try {
      const errorLevel = this.determineErrorLevel(error, context);
      const errorMessage = this.formatErrorMessage(error, context);

      // 根据错误级别选择日志方法
      switch (errorLevel) {
        case 'critical':
          this.logger.error(errorMessage, error.stack);
          break;
        case 'warning':
          this.logger.warn(errorMessage);
          break;
        case 'info':
          this.logger.debug(errorMessage);
          break;
        default:
          this.logger.error(errorMessage, error.stack);
      }

      // 发射错误事件
      this.eventBus.emit(SYSTEM_STATUS_EVENTS.ERROR_OCCURRED, {
        timestamp: new Date(),
        source: 'error-handler',
        metadata: {
          layer: context.layer,
          operation: context.operation,
          errorType: error.constructor.name,
          errorMessage: error.message,
          userId: context.userId,
          level: errorLevel
        }
      });

      // 如果是关键错误，发射特殊事件
      if (this.isCriticalError(error, context)) {
        this.eventBus.emit(SYSTEM_STATUS_EVENTS.CRITICAL_ERROR_DETECTED, {
          timestamp: new Date(),
          source: 'error-handler',
          metadata: {
            layer: context.layer,
            operation: context.operation,
            error: error.message,
            stack: error.stack
          }
        });
      }

    } catch (handlingError) {
      // 错误处理器本身出错时的降级处理
      this.logger.error('错误处理器处理错误时发生异常', {
        originalError: error.message,
        handlingError: handlingError.message
      });
    }
  }

  /**
   * 处理业务错误
   */
  handleBusinessError(error: Error, context: ErrorContext, businessData?: any): void {
    try {
      const errorMessage = this.formatBusinessErrorMessage(error, context, businessData);
      
      this.logger.warn(errorMessage, {
        businessData,
        context
      });

      // 发射业务错误事件
      this.eventBus.emit(SYSTEM_STATUS_EVENTS.BUSINESS_ERROR_OCCURRED, {
        timestamp: new Date(),
        source: 'error-handler',
        metadata: {
          layer: context.layer,
          operation: context.operation,
          errorMessage: error.message,
          businessData,
          userId: context.userId
        }
      });

    } catch (handlingError) {
      this.logger.error('业务错误处理失败', {
        originalError: error.message,
        handlingError: handlingError.message
      });
    }
  }

  /**
   * 记录警告信息
   */
  logWarning(message: string, context: ErrorContext, data?: any): void {
    try {
      const warningMessage = this.formatWarningMessage(message, context, data);
      
      this.logger.warn(warningMessage, { context, data });

      // 发射警告事件
      this.eventBus.emit(SYSTEM_STATUS_EVENTS.WARNING_LOGGED, {
        timestamp: new Date(),
        source: 'error-handler',
        metadata: {
          layer: context.layer,
          operation: context.operation,
          warningMessage: message,
          data,
          userId: context.userId
        }
      });

    } catch (handlingError) {
      this.logger.error('警告日志记录失败', {
        originalMessage: message,
        handlingError: handlingError.message
      });
    }
  }

  /**
   * 判断是否为关键错误
   */
  isCriticalError(error: Error, context: ErrorContext): boolean {
    try {
      // 数据库连接错误
      if (error.message.includes('database') || error.message.includes('MongoDB')) {
        return true;
      }

      // Redis连接错误
      if (error.message.includes('Redis') || error.message.includes('ECONNREFUSED')) {
        return true;
      }

      // 内存相关错误
      if (error.message.includes('OutOfMemory') || error.message.includes('heap out of memory')) {
        return true;
      }

      // 系统级错误
      if (error.name === 'SystemError' || error.name === 'RangeError') {
        return true;
      }

      // Collector层错误通常比较关键
      if (context.layer === 'collector') {
        return true;
      }

      // 特定操作的错误
      const criticalOperations = ['initialization', 'startup', 'shutdown', 'authentication'];
      if (criticalOperations.includes(context.operation)) {
        return true;
      }

      return false;

    } catch (checkError) {
      this.logger.error('关键错误判断失败', checkError.stack);
      return true; // 保守处理，无法判断时认为是关键错误
    }
  }

  /**
   * 确定错误级别
   */
  private determineErrorLevel(error: Error, context: ErrorContext): 'critical' | 'warning' | 'info' {
    if (this.isCriticalError(error, context)) {
      return 'critical';
    }

    // 用户输入错误通常是警告级别
    if (error.name === 'BadRequestException' || error.name === 'ValidationError') {
      return 'warning';
    }

    // 权限错误
    if (error.name === 'UnauthorizedException' || error.name === 'ForbiddenException') {
      return 'warning';
    }

    // 业务逻辑错误
    if (error.name === 'BusinessException' || error.message.includes('业务')) {
      return 'warning';
    }

    // Presenter层错误通常不太严重
    if (context.layer === 'presenter') {
      return 'warning';
    }

    // 默认为警告级别
    return 'warning';
  }

  /**
   * 格式化错误消息
   */
  private formatErrorMessage(error: Error, context: ErrorContext): string {
    return `[${context.layer.toUpperCase()}] ${context.operation} 操作失败: ${error.message}${context.userId ? ` (用户: ${context.userId})` : ''}`;
  }

  /**
   * 格式化业务错误消息
   */
  private formatBusinessErrorMessage(error: Error, context: ErrorContext, businessData?: any): string {
    const dataInfo = businessData ? ` [数据: ${JSON.stringify(businessData).substring(0, 100)}]` : '';
    return `[${context.layer.toUpperCase()}] ${context.operation} 业务错误: ${error.message}${dataInfo}${context.userId ? ` (用户: ${context.userId})` : ''}`;
  }

  /**
   * 格式化警告消息
   */
  private formatWarningMessage(message: string, context: ErrorContext, data?: any): string {
    const dataInfo = data ? ` [数据: ${JSON.stringify(data).substring(0, 100)}]` : '';
    return `[${context.layer.toUpperCase()}] ${context.operation} 警告: ${message}${dataInfo}${context.userId ? ` (用户: ${context.userId})` : ''}`;
  }
}