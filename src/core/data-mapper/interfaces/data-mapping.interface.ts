/**
 * 数据映射器接口
 */
export interface IDataMapper {
  mapData(rawData: any, mappingOutRuleId: string): Promise<any>;
  saveMappingRule(rule: IDataMappingRule): Promise<void>;
  getMappingRule(
    provider: string,
    transDataRuleListType: string,
  ): Promise<IDataMappingRule[]>;
}

/**
 * 字段映射接口 - 与Schema一致
 */
export interface IFieldMapping {
  sourceField: string;
  targetField: string;
  transform?: ITransformFunction;
  description?: string;
}

/**
 * 数据映射规则 - 与API响应格式一致
 */
export interface IDataMappingRule {
  id?: string; // 统一使用id字段，与API响应格式一致
  name: string;
  description?: string;
  provider: string;
  transDataRuleListType: string;
  apiType?: string; // rest | stream
  sharedDataFieldMappings: IFieldMapping[];
  isActive: boolean;
  version: string;
  metadata?: Record<string, any>;
  sampleData?: Record<string, any>;
  createdBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 转换函数接口
 */
export interface ITransformFunction {
  type: "multiply" | "divide" | "add" | "subtract" | "format" | "custom";
  value?: number | string;
  customFunction?: string;
}
