import { ICapability } from "./capability.interface";
import { ProviderConfig, ProviderCredentials } from "../types/config.types";

/**
 * 数据源提供商接口
 */
export interface IDataProvider {
  name: string;
  description: string;
  capabilities: ICapability[];
  initialize(): Promise<void>;
  testConnection(): Promise<boolean>;
  getCapability(name: string): ICapability | null;
  // 为上下文服务访问提供可选支持（流/REST 上下文）
  getContextService?(): any;
  getStreamContextService?(): any;
}

/**
 * 数据源提供商配置
 */
export interface IProviderConfig {
  name: string;
  isEnabled: boolean;
  priority: number;
  config: ProviderConfig;
  credentials: ProviderCredentials;
}

/**
 * 能力注册信息
 */
export interface ICapabilityRegistration {
  providerName: string;
  capability: ICapability;
  priority: number;
  isEnabled: boolean;
}
