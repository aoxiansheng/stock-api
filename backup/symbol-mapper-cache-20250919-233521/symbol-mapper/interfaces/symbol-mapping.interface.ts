/**
 * 股票代码映射规则管理器接口
 * 注意：执行逻辑已迁移到 SymbolTransformerService
 */
export interface ISymbolMapper {
  saveMapping(rule: ISymbolMappingRuleList): Promise<void>;
  getSymbolMappingRule(provider: string): Promise<ISymbolMappingRule[]>;
}

/**
 * 单个映射规则
 */
export interface ISymbolMappingRule {
  standardSymbol: string;
  sdkSymbol: string;
  market?: string;
  symbolType?: string;
  isActive?: boolean;
  description?: string;
}

/**
 * 股票代码映射规则集合 - 与API响应格式一致
 */
export interface ISymbolMappingRuleList {
  id?: string; // 统一使用id字段，与API响应格式一致
  dataSourceName: string;
  SymbolMappingRule: ISymbolMappingRule[];
  description?: string;
  version?: string;
  isActive: boolean;
  createdBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

// 缓存相关接口: symbol-mapper-cache/interfaces/cache-stats.interface.ts
