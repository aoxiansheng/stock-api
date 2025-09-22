/**
 * Storage重试装饰器
 * 🎯 为Storage服务关键方法提供重试机制
 * ✅ 基于UniversalRetryHandler实现统一重试策略
 * 🔄 支持数据库操作、文件IO等场景的智能重试
 *
 * @description 简化重试操作装饰器，专门针对Storage组件优化
 * @author Claude Code Assistant
 * @date 2025-09-22
 */

import {
  UniversalRetryHandler,
  RetryConfig
} from "@common/core/exceptions/universal-retry.handler";
import { ComponentIdentifier } from "@common/core/exceptions/business.exception";
import { STORAGE_CONFIG } from "../constants/storage.constants";

/**
 * 重试装饰器选项
 */
export interface RetryableOptions {
  /** 最大重试次数，默认使用STORAGE_CONFIG.DEFAULT_RETRY_ATTEMPTS */
  maxAttempts?: number;
  /** 初始延迟时间（毫秒），默认1000ms */
  baseDelay?: number;
  /** 操作名称，用于日志记录 */
  operationName?: string;
  /** 重试配置类型 */
  configType?: 'quick' | 'standard' | 'persistent' | 'network';
}

/**
 * Storage重试装饰器
 *
 * @example
 * ```typescript
 * class StorageService {
 *   @Retryable({ maxAttempts: 3, operationName: 'storeData' })
 *   async storeData(request: StoreDataDto): Promise<StorageResponseDto> {
 *     // 实现逻辑
 *   }
 *
 *   @Retryable({ configType: 'network', operationName: 'retrieveData' })
 *   async retrieveData(request: RetrieveDataDto): Promise<StorageResponseDto> {
 *     // 实现逻辑
 *   }
 * }
 * ```
 */
export function Retryable(options: RetryableOptions = {}) {
  return function (
    target: any,
    propertyName: string,
    propertyDescriptor: PropertyDescriptor
  ) {
    const method = propertyDescriptor.value;
    const operationName = options.operationName || `${target.constructor.name}.${propertyName}`;

    // 构建重试配置
    const retryConfig: Partial<RetryConfig> = {
      maxAttempts: options.maxAttempts || STORAGE_CONFIG.DEFAULT_RETRY_ATTEMPTS,
      baseDelay: options.baseDelay || 1000,
    };

    propertyDescriptor.value = async function (...args: any[]) {
      // 选择预设配置或使用自定义配置
      if (options.configType) {
        // 使用预设配置
        switch (options.configType) {
          case 'quick':
            return UniversalRetryHandler.quickRetry(
              () => method.apply(this, args),
              operationName,
              ComponentIdentifier.STORAGE
            );
          case 'standard':
            return UniversalRetryHandler.standardRetry(
              () => method.apply(this, args),
              operationName,
              ComponentIdentifier.STORAGE
            );
          case 'persistent':
            return UniversalRetryHandler.persistentRetry(
              () => method.apply(this, args),
              operationName,
              ComponentIdentifier.STORAGE
            );
          case 'network':
            return UniversalRetryHandler.networkRetry(
              () => method.apply(this, args),
              operationName,
              ComponentIdentifier.STORAGE
            );
        }
      }

      // 使用自定义配置
      const result = await UniversalRetryHandler.executeWithRetry(
        () => method.apply(this, args),
        operationName,
        ComponentIdentifier.STORAGE,
        retryConfig
      );

      if (result.success) {
        return result.result;
      }

      throw result.error;
    };

    return propertyDescriptor;
  };
}


/**
 * 标准重试装饰器（适用于一般操作）
 * 默认3次重试，1000ms基础延迟
 */
export function StandardRetry(operationName?: string) {
  return Retryable({
    configType: 'standard',
    operationName
  });
}

/**
 * 持久重试装饰器（适用于关键操作）
 * 默认5次重试，2000ms基础延迟
 */
export function PersistentRetry(operationName?: string) {
  return Retryable({
    configType: 'persistent',
    operationName
  });
}

