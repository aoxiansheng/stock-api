/**
 * 股票代码映射规则管理器接口
 *
 * 职责范围：股票代码映射规则的存储、检索和管理
 * - 映射规则的CRUD操作
 * - 数据源映射配置管理
 * - 与SymbolTransformerService职责分工：
 *   - ISymbolMapper: 规则管理层，负责规则存储和配置
 *   - SymbolTransformerService: 执行层，负责具体的符号转换逻辑
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
