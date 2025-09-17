/**
 * 装饰器元数据类型定义
 */

// 元数据键值已移至 constants/metadata.constants.ts 统一管理
// 为了兼容性，从常量文件导入
import {
  PROVIDER_METADATA_KEY,
  CAPABILITY_METADATA_KEY,
} from "../../constants/metadata.constants";
import {
  ProviderConfig,
  CapabilityConfig,
  StreamConfig,
} from "../../types/config.types";

export { PROVIDER_METADATA_KEY, CAPABILITY_METADATA_KEY };

export interface CapabilityMetadata {
  /** 能力名称，对应 receiverType */
  name: string;
  /** 支持的市场列表 */
  markets?: string[];
  /** 优先级，数字越小优先级越高 */
  priority?: number;
  /** 能力描述 */
  description?: string;
  /** 所属提供商名称，可自动推断 */
  provider?: string;
  /** 是否启用 */
  enabled?: boolean;
  /** 支持的股票代码格式 */
  symbolFormats?: string[];
  /** 能力类型：REST 或 WebSocket */
  type?: "rest" | "websocket";
  /** 额外配置 */
  config?: CapabilityConfig;
}

export interface ProviderMetadata {
  /** 提供商名称 */
  name: string;
  /** 提供商描述 */
  description?: string;
  /** 是否自动注册 */
  autoRegister?: boolean;
  /** 是否启用健康检查 */
  healthCheck?: boolean;
  /** 初始化优先级 */
  initPriority?: number;
  /** 提供商配置 */
  config?: ProviderConfig;
}

export interface StreamCapabilityMetadata extends CapabilityMetadata {
  type: "websocket";
  /** 流配置 */
  config?: StreamConfig;
}

/**
 * 构造函数类型
 */
export type Constructor<T = object> = new (...args: any[]) => T;

/**
 * 能力收集项
 */
export interface CapabilityCollectionItem {
  metadata: CapabilityMetadata;
  target: Constructor;
  provider?: string;
}

/**
 * 提供商收集项
 */
export interface ProviderCollectionItem {
  metadata: ProviderMetadata;
  target: Constructor;
}

/**
 * 提供商信息
 */
export interface ProviderInfo {
  name: string;
  main?: any;
  capabilities: string[];
  autoDiscovered: boolean;
  metadata?: ProviderMetadata;
}

/**
 * 提供商加载结果
 */
export interface ProviderLoadResult {
  success: boolean;
  error?: Error;
  suggestions?: string[];
  canRetry?: boolean;
  provider?: ProviderInfo;
}

/**
 * 约定违规类型（简化为3种主要类别）
 */
export interface ConventionViolation {
  type:
    | "structural" // 结构问题：missing_file, missing_directory, invalid_structure
    | "naming" // 命名问题：naming_convention
    | "interface"; // 接口问题：missing_export, interface_error, scan_error
  path: string;
  message: string;
  severity?: "low" | "medium" | "high" | "critical";
  autoFixable?: boolean;
  suggestion?: string;
}

/**
 * 扫描统计信息
 */
export interface ScanStats {
  totalDirectories: number;
  validProviders: number;
  invalidProviders: number;
  skippedDirectories: number;
  totalCapabilities?: number;
  processedFiles?: number;
}

/**
 * 扫描结果
 */
export interface ScanResult {
  providers: ProviderInfo[];
  violations: ConventionViolation[];
  stats: ScanStats;
}

/**
 * 扫描选项
 */
export interface ScanOptions {
  /** 是否扫描子目录 */
  recursive?: boolean;
  /** 要排除的目录 */
  excludeDirs?: string[];
  /** 要包含的文件扩展名 */
  includeExtensions?: string[];
  /** 是否验证约定 */
  validateConventions?: boolean;
  /** 是否自动修复结构 */
  autoFix?: boolean;
}
