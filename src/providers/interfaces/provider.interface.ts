import { ICapability } from "./capability.interface";

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
}

/**
 * 数据源提供商配置
 */
export interface IProviderConfig {
  name: string;
  isEnabled: boolean;
  priority: number;
  config: Record<string, any>;
  credentials: Record<string, any>;
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
