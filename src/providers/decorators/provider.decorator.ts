import "reflect-metadata";
import { Injectable } from "@nestjs/common";
import { ProviderMetadata, Constructor } from "./types/metadata.types";
import { CapabilityCollector } from "./capability-collector";
import { METADATA_KEYS } from "../constants/metadata.constants";
import { OPERATION_LIMITS } from "@common/constants/domain";
import { REFERENCE_DATA } from "@common/constants/domain";

/**
 * 提供商装饰器 - 自动注册数据源提供商
 *
 * @example
 * ```typescript
 * @Provider({
 *   name: REFERENCE_DATA.PROVIDER_IDS.LONGPORT,
 *   description: 'LongPort数据源',
 *   autoRegister: true,
 *   healthCheck: true
 * })
 * @Injectable()
 * export class LongportProvider implements IDataProvider {
 *   async initialize() {
 *     // 初始化逻辑
 *   }
 * }
 * ```
 */
export function Provider(metadata: ProviderMetadata) {
  return function <T extends Constructor>(target: T) {
    // 设置默认值
    const finalMetadata: ProviderMetadata = {
      autoRegister: true,
      healthCheck: true,
      initPriority: 1,
      ...metadata,
    };

    // 验证必填字段
    if (!finalMetadata.name) {
      throw new Error(`提供商 ${target.name} 必须指定 name 属性`);
    }

    // 注册到收集器
    CapabilityCollector.registerProvider(finalMetadata, target);

    // 存储元数据到类上
    Reflect.defineMetadata(
      METADATA_KEYS.PROVIDER_METADATA,
      finalMetadata,
      target,
    );
    Reflect.defineMetadata("provider:registered", true, target);

    // 自动应用 @Injectable 装饰器，确保可以被依赖注入
    return Injectable()(target);
  };
}

/**
 * 获取类上的提供商元数据
 */
export function getProviderMetadata(target: any): ProviderMetadata | undefined {
  return Reflect.getMetadata(METADATA_KEYS.PROVIDER_METADATA, target);
}

/**
 * 检查类是否已注册为提供商
 */
export function isProviderRegistered(target: any): boolean {
  return Reflect.getMetadata("provider:registered", target) === true;
}

/**
 * 提供商配置装饰器 - 为提供商添加配置选项
 *
 * @example
 * ```typescript
 * @ProviderConfig({
 *   apiUrl: 'https://api.longport.com',
 *   timeout: OPERATION_LIMITS.TIMEOUTS_MS.MONITORING_REQUEST,
 *   retries: 3
 * })
 * export class LongportProvider {
 *   // 配置会自动注入到 this.config
 * }
 * ```
 */
export function ProviderConfig(config: Record<string, any>) {
  return function <T extends Constructor>(target: T) {
    const existingConfig = Reflect.getMetadata("provider:config", target) || {};
    const finalConfig = { ...existingConfig, ...config };

    Reflect.defineMetadata("provider:config", finalConfig, target);

    return target;
  };
}

/**
 * 获取提供商配置
 */
export function getProviderConfig(target: any): Record<string, any> {
  return Reflect.getMetadata("provider:config", target) || {};
}

/**
 * 提供商健康检查装饰器
 *
 * @example
 * ```typescript
 * export class LongportProvider {
 *   @HealthCheck({ interval: 30000, timeout: OPERATION_LIMITS.TIMEOUTS_MS.MONITORING_REQUEST })
 *   async checkHealth(): Promise<boolean> {
 *     // 健康检查逻辑
 *     return true;
 *   }
 * }
 * ```
 */
export function HealthCheck(
  options: { interval?: number; timeout?: number } = {},
) {
  return function (
    target: any,
    propertyName: string,
    descriptor: PropertyDescriptor,
  ) {
    const defaultOptions = {
      interval: 60000, // 1分钟
      timeout: OPERATION_LIMITS.TIMEOUTS_MS.DATABASE_OPERATION, // 10秒
      ...options,
    };

    // 存储健康检查方法信息
    const existingChecks =
      Reflect.getMetadata(
        METADATA_KEYS.HEALTH_CHECK_METADATA,
        target.constructor,
      ) || [];
    existingChecks.push({
      methodName: propertyName,
      options: defaultOptions,
    });
    Reflect.defineMetadata(
      METADATA_KEYS.HEALTH_CHECK_METADATA,
      existingChecks,
      target.constructor,
    );

    return descriptor;
  };
}

/**
 * 获取提供商健康检查方法
 */
export function getProviderHealthChecks(
  target: any,
): Array<{ methodName: string; options: any }> {
  return Reflect.getMetadata(METADATA_KEYS.HEALTH_CHECK_METADATA, target) || [];
}

/**
 * 提供商初始化装饰器 - 标记初始化方法
 *
 * @example
 * ```typescript
 * export class LongportProvider {
 *   @Initialize({ priority: 1, timeout: OPERATION_LIMITS.TIMEOUTS_MS.DATABASE_OPERATION })
 *   async setup() {
 *     // 初始化逻辑
 *   }
 * }
 * ```
 */
export function Initialize(
  options: { priority?: number; timeout?: number } = {},
) {
  return function (
    target: any,
    propertyName: string,
    descriptor: PropertyDescriptor,
  ) {
    const defaultOptions = {
      priority: 1,
      timeout: OPERATION_LIMITS.TIMEOUTS_MS.API_REQUEST, // 30秒
      ...options,
    };

    Reflect.defineMetadata(
      "provider:initMethod",
      {
        methodName: propertyName,
        options: defaultOptions,
      },
      target.constructor,
    );

    return descriptor;
  };
}

/**
 * 获取提供商初始化方法信息
 */
export function getProviderInitMethod(
  target: any,
): { methodName: string; options: any } | undefined {
  return Reflect.getMetadata("provider:initMethod", target);
}

/**
 * 工具函数：批量注册提供商
 */
export function registerProviders(
  providers: Array<{ metadata: ProviderMetadata; target: Constructor }>,
) {
  for (const { metadata, target } of providers) {
    CapabilityCollector.registerProvider(metadata, target);
  }
}
