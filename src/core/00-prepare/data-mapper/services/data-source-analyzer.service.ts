import { Injectable } from "@nestjs/common";
import { createLogger } from "@common/logging/index";

import { DataSourceAnalysisResponseDto } from "../dto/data-source-analysis.dto";

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
    apiType: "rest" | "stream",
  ): Promise<DataSourceAnalysisResponseDto> {
    this.logger.log(`开始分析数据源`, { provider, apiType });

    try {
      // 1. 基础字段提取
      const extractedFields = this.extractFieldsFromData(sampleData);

      // 2. 计算分析置信度
      const confidence = this.calculateAnalysisConfidence(extractedFields);

      const analysisResult: DataSourceAnalysisResponseDto = {
        provider,
        apiType,
        sampleData,
        extractedFields,
        totalFields: extractedFields.length,
        analysisTimestamp: new Date(),
        confidence,
      };

      this.logger.log(`数据源分析完成`, {
        provider,
        apiType,
        totalFields: extractedFields.length,
        confidence,
      });

      return analysisResult;
    } catch (error) {
      this.logger.error(`数据源分析失败`, {
        provider,
        apiType,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * 🔍 从数据中提取字段信息
   */
  private extractFieldsFromData(data: any, parentPath: string = ""): any[] {
    // 存储提取出的字段
    const fields: any[] = [];

    // 检查数据是否有效
    if (!data || typeof data !== "object") {
      return fields;
    }

    // 处理对象
    if (!Array.isArray(data)) {
      // 对象的每个属性
      Object.entries(data).forEach(([key, value]) => {
        const fieldPath = parentPath ? `${parentPath}.${key}` : key;
        const fieldType = this.determineFieldType(value);
        
        // 添加当前字段
        fields.push({
          fieldPath,
          fieldName: key,
          fieldType,
          sampleValue: this.getSampleValue(value),
          confidence: 0.9,
          isNested: typeof value === "object" && value !== null,
          nestingLevel: fieldPath.split(".").length - 1,
        });
        
        // 递归处理嵌套对象或数组
        if (typeof value === "object" && value !== null) {
          // 数组或对象
          const nestedFields = this.extractFieldsFromData(value, fieldPath);
          fields.push(...nestedFields);
        }
      });
    } 
    // 处理数组，但仅在有父路径时（即作为对象的属性时）
    else if (parentPath) {
      // 处理数组中的第一个对象元素
      if (data.length > 0 && typeof data[0] === "object" && data[0] !== null) {
        Object.entries(data[0]).forEach(([key, value]) => {
          const itemPath = `${parentPath}[0].${key}`;
          
          fields.push({
            fieldPath: itemPath,
            fieldName: key,
            fieldType: this.determineFieldType(value),
            sampleValue: this.getSampleValue(value),
            confidence: 0.9,
            isNested: typeof value === "object" && value !== null,
            nestingLevel: itemPath.split(".").length - 1,
          });
        });
      }
    }

    return fields;
  }
  
  /**
   * 🎯 确定字段类型
   */
  private determineFieldType(value: any): string {
    if (value === null || value === undefined) {
      return "unknown";
    }

    if (typeof value === "string") {
      // 检查是否为日期格式
      if (/^\d{4}-\d{2}-\d{2}/.test(value)) {
        return "date";
      }
      return "string";
    }

    if (typeof value === "number") {
      return Number.isInteger(value) ? "integer" : "number";
    }

    if (typeof value === "boolean") {
      return "boolean";
    }

    if (Array.isArray(value)) {
      return "array";
    }

    if (typeof value === "object") {
      return "object";
    }

    return "unknown";
  }

  /**
   * 🎯 获取示例值
   */
  private getSampleValue(value: any): any {
    if (typeof value === "object" && value !== null) {
      return Array.isArray(value) ? "[...]" : "{...}";
    }
    return value;
  }

  /**
   * 📊 计算分析置信度
   */
  private calculateAnalysisConfidence(extractedFields: any[]): number {
    if (extractedFields.length === 0) {
      return 0;
    }

    // 基础置信度（降低基础值）
    let confidence = 0.6;

    // 字段数量奖励
    if (extractedFields.length >= 5) {
      confidence += 0.1;
    }

    // 数据完整性检查（增强空值检测）
    const nonEmptyFields = extractedFields.filter(
      (f) => f.sampleValue !== null && 
             f.sampleValue !== undefined && 
             f.sampleValue !== "" &&
             (f.sampleValue !== "{...}" || f.sampleValue !== "[...]")
    );

    const completenessRatio = nonEmptyFields.length / extractedFields.length;
    
    // 调整加分公式，更强调数据完整性
    confidence += completenessRatio * 0.15;
    
    // 对于低完整性数据额外减分
    if (completenessRatio < 0.8) {
      confidence -= (1 - completenessRatio) * 0.15;
    }

    // 确保置信度在0-1之间
    return Math.min(Math.max(confidence, 0), 1);
  }
}
