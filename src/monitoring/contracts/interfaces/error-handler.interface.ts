/**
 * 错误处理层接口定义（简化版）
 * 职责：统一错误处理，避免过度分层
 */

export interface ErrorContext {
  layer: 'collector' | 'analyzer' | 'presenter';
  operation: string;
  userId?: string;
  componentName?: string;
  dashboardId?: string;
  timestamp?: Date;
  metadata?: Record<string, any>;
}

export interface ErrorDetails {
  code?: string;
  message: string;
  stack?: string;
  requestId?: string;
  userId?: string;
}

/**
 * 系统状态错误处理器接口
 * 简化的错误处理，不需要复杂的恢复策略
 */
export interface IErrorHandler {
  /**
   * 处理错误
   * @param error 错误对象
   * @param context 错误上下文
   */
  handleError(error: Error, context: ErrorContext): void;
  
  /**
   * 处理业务错误
   * @param details 错误详情
   * @param context 错误上下文
   */
  handleBusinessError(details: ErrorDetails, context: ErrorContext): void;
  
  /**
   * 记录警告
   * @param message 警告消息
   * @param context 错误上下文
   */
  logWarning(message: string, context: ErrorContext): void;
  
  /**
   * 检查是否为致命错误
   * @param error 错误对象
   */
  isCriticalError(error: Error): boolean;
}

/**
 * 系统状态错误处理器接口（扩展版）
 * 与实现类保持一致
 */
export interface ISystemStatusErrorHandler {
  /**
   * 处理错误
   * @param error 错误对象
   * @param context 错误上下文
   */
  handleError(error: Error, context: ErrorContext): void;
  
  /**
   * 处理业务错误（扩展版本）
   */
  handleBusinessError(error: Error, context: ErrorContext, businessData?: any): void;
  
  /**
   * 记录警告（扩展版本）
   */
  logWarning(message: string, context: ErrorContext, data?: any): void;
  
  /**
   * 检查是否为致命错误（扩展版本）
   */
  isCriticalError(error: Error, context: ErrorContext): boolean;
}