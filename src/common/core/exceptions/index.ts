/**
 * @common/core/exceptions 模块导出
 *
 * 统一异常处理基础设施，提供：
 * - BusinessException: 通用业务异常基类
 * - UniversalExceptionFactory: 智能异常工厂
 * - UniversalRetryHandler: 通用重试机制
 */

// 业务异常基类
export {
  BusinessException,
  BusinessErrorCode,
  ComponentIdentifier,
} from './business.exception';

// 异常工厂
export {
  UniversalExceptionFactory,
} from './universal-exception.factory';

// 重试处理器
export {
  UniversalRetryHandler,
  type RetryConfig,
  type RetryResult,
} from './universal-retry.handler';

// 注意：以下工具函数和配置需要在导入类后使用
// 不能在模块顶层直接引用，因为可能会导致循环依赖问题