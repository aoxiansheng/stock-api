/**
 * 股票代码映射器接口
 */
export interface ISymbolMapper {
  mapSymbol(
    originalSymbol: string,
    fromProvider: string,
    toProvider: string,
  ): Promise<string>;
  saveMapping(rule: ISymbolMappingRule): Promise<void>;
  getMappingRules(provider: string): Promise<IMappingRule[]>;
}

/**
 * 单个映射规则
 */
export interface IMappingRule {
  inputSymbol: string;
  outputSymbol: string;
  market?: string;
  symbolType?: string;
  isActive?: boolean;
  description?: string;
}

/**
 * 股票代码映射规则 - 与API响应格式一致
 */
export interface ISymbolMappingRule {
  id?: string; // 统一使用id字段，与API响应格式一致
  dataSourceName: string;
  mappingRules: IMappingRule[];
  description?: string;
  version?: string;
  isActive: boolean;
  createdBy?: string;
  createdAt: Date;
  updatedAt: Date;
}
