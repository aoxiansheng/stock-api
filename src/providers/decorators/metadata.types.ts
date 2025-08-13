/**
 * 提供商元数据接口
 */
export interface ProviderMetadata {
  /**
   * 提供商名称（必填）
   */
  name: string;
  
  /**
   * 提供商描述
   */
  description?: string;
  
  /**
   * 是否自动注册，默认为true
   */
  autoRegister?: boolean;
  
  /**
   * 是否启用健康检查，默认为true
   */
  healthCheck?: boolean;
  
  /**
   * 初始化优先级，数值越小越先初始化，默认为1
   */
  initPriority?: number;
}

/**
 * 构造函数类型
 */
export type Constructor<T = any> = new (...args: any[]) => T; 