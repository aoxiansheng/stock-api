/**
 * 股票代码映射器接口
 */
export interface ISymbolMapper {
  mapSymbol(
    originalSymbol: string,
    fromProvider: string,
    toProvider: string,
  ): Promise<string>;
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
