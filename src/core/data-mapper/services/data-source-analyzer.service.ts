import { Injectable } from '@nestjs/common';
import { createLogger } from '@common/config/logger.config';

import { 
  AnalyzeDataSourceDto,
  DataSourceAnalysisResponseDto,
} from '../dto/data-source-analysis.dto';

/**
 * 🔍 简化的数据源分析器服务
 * 专注于JSON数据结构分析和字段提取的核心功能
 * 支持处理不同提供商（LongPort、iTick等）的数据格式
 */
@Injectable()
export class DataSourceAnalyzerService {
  private readonly logger = createLogger(DataSourceAnalyzerService.name);

  /**
   * 🎯 分析数据源结构 (核心功能)
   */
  async analyzeDataSource(
    sampleData: any,
    provider: string,
    apiType: 'rest' | 'stream'
  ): Promise<DataSourceAnalysisResponseDto> {
    this.logger.log(`开始分析数据源`, { provider, apiType });

    try {
      // 1. 基础字段提取
      const extractedFields = this.extractFieldsFromData(sampleData);
      
      // 2. 确定数据结构类型
      const dataStructureType = this.determineDataStructureType(sampleData);
      
      // 3. 计算分析置信度
      const confidence = this.calculateAnalysisConfidence(extractedFields, sampleData);
      
      const analysisResult: DataSourceAnalysisResponseDto = {
        provider,
        apiType,
        sampleData,
        extractedFields,
        dataStructureType,
        totalFields: extractedFields.length,
        analysisTimestamp: new Date(),
        confidence,
      };

      this.logger.log(`数据源分析完成`, {
        provider,
        apiType,
        totalFields: extractedFields.length,
        confidence
      });

      return analysisResult;
    } catch (error) {
      this.logger.error(`数据源分析失败`, {
        provider,
        apiType,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * 🔍 从数据中提取字段信息
   */
  private extractFieldsFromData(data: any, parentPath: string = ''): any[] {
    const fields: any[] = [];

    if (!data || typeof data !== 'object') {
      return fields;
    }

    if (Array.isArray(data)) {
      // 处理数组：分析第一个元素的结构
      if (data.length > 0) {
        const arrayElementFields = this.extractFieldsFromData(data[0], `${parentPath}[0]`);
        fields.push(...arrayElementFields);
      }
      return fields;
    }

    // 处理对象
    for (const [key, value] of Object.entries(data)) {
      const fieldPath = parentPath ? `${parentPath}.${key}` : key;
      const fieldType = this.determineFieldType(value);

      fields.push({
        fieldPath,
        fieldName: key,
        fieldType,
        sampleValue: this.getSampleValue(value),
        confidence: 0.9,
        isNested: typeof value === 'object' && value !== null,
        nestingLevel: fieldPath.split('.').length - 1,
      });

      // 递归处理嵌套对象
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        const nestedFields = this.extractFieldsFromData(value, fieldPath);
        fields.push(...nestedFields);
      }
    }

    return fields;
  }

  /**
   * 🎯 确定字段类型
   */
  private determineFieldType(value: any): string {
    if (value === null || value === undefined) {
      return 'unknown';
    }

    if (typeof value === 'string') {
      // 检查是否为日期格式
      if (/^\d{4}-\d{2}-\d{2}/.test(value)) {
        return 'date';
      }
      return 'string';
    }

    if (typeof value === 'number') {
      return Number.isInteger(value) ? 'integer' : 'number';
    }

    if (typeof value === 'boolean') {
      return 'boolean';
    }

    if (Array.isArray(value)) {
      return 'array';
    }

    if (typeof value === 'object') {
      return 'object';
    }

    return 'unknown';
  }

  /**
   * 🎯 获取示例值
   */
  private getSampleValue(value: any): any {
    if (typeof value === 'object' && value !== null) {
      return Array.isArray(value) ? '[...]' : '{...}';
    }
    return value;
  }

  /**
   * 🎯 确定数据结构类型
   */
  private determineDataStructureType(data: any): 'flat' | 'nested' | 'mixed' {
    if (!data || typeof data !== 'object') {
      return 'flat';
    }

    const hasNestedObjects = this.hasNestedObjects(data);
    const hasArrays = this.hasArrays(data);

    if (hasNestedObjects || hasArrays) {
      return hasNestedObjects && hasArrays ? 'mixed' : 'nested';
    }

    return 'flat';
  }

  /**
   * 🔍 检查是否有嵌套对象
   */
  private hasNestedObjects(obj: any): boolean {
    if (!obj || typeof obj !== 'object') {
      return false;
    }

    for (const value of Object.values(obj)) {
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        return true;
      }
      if (Array.isArray(value)) {
        for (const item of value) {
          if (typeof item === 'object' && item !== null) {
            return true;
          }
        }
      }
    }

    return false;
  }

  /**
   * 🔍 检查是否有数组
   */
  private hasArrays(obj: any): boolean {
    if (!obj || typeof obj !== 'object') {
      return false;
    }

    for (const value of Object.values(obj)) {
      if (Array.isArray(value)) {
        return true;
      }
    }

    return false;
  }

  /**
   * 📊 计算分析置信度
   */
  private calculateAnalysisConfidence(extractedFields: any[], sampleData: any): number {
    if (extractedFields.length === 0) {
      return 0;
    }

    // 基础置信度
    let confidence = 0.7;

    // 字段数量奖励
    if (extractedFields.length >= 5) {
      confidence += 0.1;
    }

    // 数据完整性检查
    const nonNullFields = extractedFields.filter(f => 
      f.sampleValue !== null && f.sampleValue !== undefined
    );
    
    const completenessRatio = nonNullFields.length / extractedFields.length;
    confidence += completenessRatio * 0.2;

    // 确保置信度在0-1之间
    return Math.min(Math.max(confidence, 0), 1);
  }

}