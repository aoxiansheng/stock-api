/**
 * 数据源能力接口
 */
export interface ICapability {
  name: string; 
  description: string;
  supportedMarkets: string[];
  supportedSymbolFormats: string[];
  rateLimit?: {
    requestsPerSecond: number;
    requestsPerDay: number;
  };
  execute(params: any): Promise<any>;
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
