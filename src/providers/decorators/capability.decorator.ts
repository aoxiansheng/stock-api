import 'reflect-metadata';
import { CapabilityMetadata, Constructor } from './metadata.types';
import { CapabilityCollector } from './capability-collector';

/**
 * 能力装饰器 - 自动注册数据源能力
 * 
 * @example
 * ```typescript
 * @Capability({
 *   name: 'get-stock-quote',
 *   markets: ['US', 'HK'],
 *   priority: 1,
 *   description: '获取股票实时报价'
 * })
 * export class GetStockQuoteCapability implements ICapability {
 *   async execute(request: DataRequest): Promise<DataResponse> {
 *     // 实现逻辑
 *   }
 * }
 * ```
 */
export function Capability(metadata: CapabilityMetadata) {
  return function <T extends Constructor>(target: T) {
    // 设置默认值
    const finalMetadata: CapabilityMetadata = {
      priority: 1,
      enabled: true,
      type: 'rest',
      markets: [],
      symbolFormats: [],
      ...metadata
    };

    // 如果没有提供商名称，尝试自动推断
    if (!finalMetadata.provider) {
      finalMetadata.provider = extractProviderFromPath() || extractProviderFromClassName(target.name);
    }

    // 注册到收集器
    CapabilityCollector.registerCapability(finalMetadata, target);

    // 存储元数据到类上，供运行时使用
    Reflect.defineMetadata('capability:metadata', finalMetadata, target);
    Reflect.defineMetadata('capability:registered', true, target);

    return target;
  };
}

/**
 * 获取类上的能力元数据
 */
export function getCapabilityMetadata(target: any): CapabilityMetadata | undefined {
  return Reflect.getMetadata('capability:metadata', target);
}

/**
 * 检查类是否已注册为能力
 */
export function isCapabilityRegistered(target: any): boolean {
  return Reflect.getMetadata('capability:registered', target) === true;
}

/**
 * 从文件路径推断提供商名称
 */
function extractProviderFromPath(): string | undefined {
  try {
    // 获取调用栈中的文件路径
    const stack = (new Error()).stack;
    if (!stack) return undefined;

    const lines = stack.split('\n');
    // 查找第一个包含 providers/ 的文件路径
    for (const line of lines) {
      const match = line.match(/providers\/([^\/]+)\//);
      if (match) {
        return match[1];
      }
    }
  } catch {
    // 静默失败
  }
  return undefined;
}

/**
 * 从类名推断提供商名称
 */
function extractProviderFromClassName(className: string): string | undefined {
  // 移除常见后缀
  const cleanName = className
    .replace(/Capability$/, '')
    .replace(/Provider$/, '')
    .replace(/Service$/, '');

  // 转换为小写并用连字符分隔
  const kebabCase = cleanName
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .toLowerCase();

  // 尝试提取提供商前缀
  const prefixMatch = kebabCase.match(/^([a-z]+)-?/);
  return prefixMatch ? prefixMatch[1] : undefined;
}

/**
 * 工具函数：批量注册能力
 */
export function registerCapabilities(capabilities: Array<{ metadata: CapabilityMetadata; target: Constructor }>) {
  for (const { metadata, target } of capabilities) {
    CapabilityCollector.registerCapability(metadata, target);
  }
}

/**
 * 能力注入装饰器 - 在提供商中注入特定能力
 * 
 * @example
 * ```typescript
 * export class LongportProvider {
 *   @InjectCapability('get-stock-quote')
 *   stockQuote: GetStockQuoteCapability;
 * }
 * ```
 */
export function InjectCapability(capabilityName: string) {
  return function (target: any, propertyKey: string | symbol) {
    // 存储注入信息，在运行时解析
    const existingInjections = Reflect.getMetadata('capability:injections', target.constructor) || [];
    existingInjections.push({
      propertyKey,
      capabilityName
    });
    Reflect.defineMetadata('capability:injections', existingInjections, target.constructor);
  };
}

/**
 * 获取类上的能力注入信息
 */
export function getCapabilityInjections(target: any): Array<{ propertyKey: string | symbol; capabilityName: string }> {
  return Reflect.getMetadata('capability:injections', target) || [];
}