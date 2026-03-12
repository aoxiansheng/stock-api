/**
 * 映射规则引擎模块
 *
 * 负责处理映射规则的应用、转换逻辑和数据处理
 * 作为 FlexibleMappingRuleService 的内部模块化组件
 *
 * Phase 2 模块化重构：解决 FlexibleMappingRuleService 职责过重问题
 */

import { Injectable } from '@nestjs/common';
import { createLogger } from '@common/logging/index';
import { ObjectUtils } from '@core/shared/utils/object.util';
import { TRANSFORMATION_TYPES } from '@core/00-prepare/data-mapper/constants/data-mapper.constants';
import { FlexibleMappingRuleDocument } from '@core/00-prepare/data-mapper/schemas/flexible-mapping-rule.schema';

/**
 * 映射规则引擎模块
 *
 * 职责范围：
 * - 映射规则的应用和执行
 * - 数据转换和字段映射
 * - 路径解析和值提取
 * - 转换操作的执行
 * - 映射结果的调试信息
 */
@Injectable()
export class MappingRuleEngineModule {
  private readonly logger = createLogger(MappingRuleEngineModule.name);

  /**
   * 🎯 应用灵活映射规则的核心逻辑
   */
  public async applyFlexibleMappingRule(
    rule: FlexibleMappingRuleDocument,
    sourceData: any,
    includeDebugInfo: boolean = false,
  ): Promise<{
    transformedData: any;
    success: boolean;
    errorMessage?: string;
    mappingStats: {
      totalMappings: number;
      successfulMappings: number;
      failedMappings: number;
      successRate: number;
      optionalSkipped?: number;
    };
    debugInfo?: any[];
  }> {
    const startTime = Date.now();

    // 🐞 调试：应用映射前输出规则概览
    this.logger.verbose("applyFlexibleMappingRule: begin", {
      ruleId: rule._id?.toString(),
      mappingCount: rule.fieldMappings?.length,
      samplePaths: rule.fieldMappings
        ?.slice(0, 5)
        .map((m: any) => m.sourceFieldPath),
    });

    const transformedData = {};
    const debugInfo = [];
    let successfulMappings = 0;
    let failedMappings = 0;
    let requiredMappings = 0;
    let successfulRequiredMappings = 0;
    let optionalSkipped = 0;

    for (const mapping of rule.fieldMappings) {
      // 若未显式设置 isActive，则默认视为启用
      if (mapping.isActive === false) continue;

      try {
        const isRequired = mapping.isRequired === true;
        if (isRequired) {
          requiredMappings++;
        }

        // 1. 尝试主要路径
        let sourceValue = this.getValueFromPath(
          sourceData,
          mapping.sourceFieldPath,
        );
        let fallbackUsed = undefined;

        // 2. 如果主要路径失败，尝试回退路径
        if (sourceValue === undefined && mapping.fallbackPaths?.length > 0) {
          for (const fallbackPath of mapping.fallbackPaths) {
            sourceValue = this.getValueFromPath(sourceData, fallbackPath);
            if (sourceValue !== undefined) {
              fallbackUsed = fallbackPath;
              break;
            }
          }
        }

        const isSessionField = /premarket|postmarket|overnight/i.test(
          mapping.targetField,
        );

        if (sourceValue !== undefined) {
          if (isSessionField) {
            this.logger.debug("Session field mapped", {
              ruleId: rule._id?.toString(),
              targetField: mapping.targetField,
              sourcePath: mapping.sourceFieldPath,
              value: sourceValue,
            });
          }
          // 3. 应用转换（如果有）
          let transformedValue = sourceValue;
          if (mapping.transform) {
            transformedValue = this.applyTransform(
              sourceValue,
              mapping.transform,
            );
          }

          transformedData[mapping.targetField] = transformedValue;
          successfulMappings++;
          if (isRequired) {
            successfulRequiredMappings++;
          }

          if (includeDebugInfo) {
            debugInfo.push({
              sourceFieldPath: mapping.sourceFieldPath,
              targetField: mapping.targetField,
              sourceValue,
              transformedValue,
              success: true,
              fallbackUsed,
            });
          }
        } else {
          if (isSessionField) {
            this.logger.debug("Session field missing", {
              ruleId: rule._id?.toString(),
              targetField: mapping.targetField,
              sourcePath: mapping.sourceFieldPath,
              optional: !isRequired,
              sourceKeys:
                sourceData && typeof sourceData === "object"
                  ? Object.keys(sourceData)
                  : undefined,
              rawValue:
                sourceData && typeof sourceData === "object"
                  ? (sourceData as any)[mapping.sourceFieldPath.split(".")[0]]
                  : undefined,
            });
          }

          if (isRequired) {
            failedMappings++;

            if (includeDebugInfo) {
              debugInfo.push({
                sourceFieldPath: mapping.sourceFieldPath,
                targetField: mapping.targetField,
                sourceValue: undefined,
                transformedValue: undefined,
                success: false,
                error: "源字段值未找到",
              });
            }
          } else {
            optionalSkipped++;

            if (includeDebugInfo) {
              debugInfo.push({
                sourceFieldPath: mapping.sourceFieldPath,
                targetField: mapping.targetField,
                sourceValue: undefined,
                transformedValue: undefined,
                success: false,
                skipped: true,
                error: "可选字段缺失，已跳过",
              });
            }
          }
        }
      } catch (error) {
        failedMappings++;

        if (includeDebugInfo) {
          debugInfo.push({
            sourceFieldPath: mapping.sourceFieldPath,
            targetField: mapping.targetField,
            sourceValue: undefined,
            transformedValue: undefined,
            success: false,
            error: error.message,
          });
        }
      }
    }

    const totalMappings = rule.fieldMappings?.length || 0;
    const successRate =
      requiredMappings > 0
        ? successfulRequiredMappings / requiredMappings
        : 1;

    const result = {
      transformedData,
      success: failedMappings === 0,
      mappingStats: {
        totalMappings,
        successfulMappings,
        failedMappings,
        successRate,
        optionalSkipped: optionalSkipped || undefined,
      },
      debugInfo: includeDebugInfo ? debugInfo : undefined,
    };

    this.logger.verbose("applyFlexibleMappingRule: completed", {
      ruleId: rule._id?.toString(),
      duration: Date.now() - startTime,
      totalMappings,
      successfulMappings,
      failedMappings,
      successRate: Math.round(successRate * 100) / 100,
      success: result.success,
    });

    return result;
  }

  /**
   * 🔧 从路径获取值的辅助方法（统一路径解析优化）
   * 性能优化：保留直接属性访问，对复杂路径使用统一的ObjectUtils
   */
  private getValueFromPath(obj: any, path: string): any {
    // 快速路径：直接属性访问（无嵌套路径）
    if (path.indexOf(".") === -1 && path.indexOf("[") === -1) {
      return obj?.[path];
    }

    // 复杂路径：使用统一的ObjectUtils处理嵌套路径和数组访问
    return ObjectUtils.getValueFromPath(obj, path);
  }

  /**
   * 🔧 应用转换
   */
  private applyTransform(value: any, transform: any): any {
    const numericValue = Number(value);

    switch (transform.type) {
      case TRANSFORMATION_TYPES.MULTIPLY:
        if (!isNaN(numericValue)) {
          return numericValue * (Number(transform.value) || 1);
        }
        break;
      case TRANSFORMATION_TYPES.DIVIDE:
        if (!isNaN(numericValue) && transform.value !== 0) {
          return numericValue / (Number(transform.value) || 1);
        }
        break;
      case TRANSFORMATION_TYPES.ADD:
        if (!isNaN(numericValue)) {
          return numericValue + (Number(transform.value) || 0);
        }
        break;
      case TRANSFORMATION_TYPES.SUBTRACT:
        if (!isNaN(numericValue)) {
          return numericValue - (Number(transform.value) || 0);
        }
        break;
      case TRANSFORMATION_TYPES.FORMAT:
        const template = String(transform.value || "{value}");
        return template.replace(/\{value\}/g, String(value));
      default:
        return value;
    }

    return value;
  }

  /**
   * 🔍 验证映射规则配置
   */
  public validateRuleConfiguration(rule: FlexibleMappingRuleDocument): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // 验证基本信息
    if (!rule.name || rule.name.trim().length === 0) {
      errors.push("规则名称不能为空");
    }

    if (!rule.provider || rule.provider.trim().length === 0) {
      errors.push("提供商不能为空");
    }

    if (!rule.apiType || !["rest", "stream"].includes(rule.apiType)) {
      errors.push("API类型必须是 rest 或 stream");
    }

    // 验证字段映射
    if (!rule.fieldMappings || rule.fieldMappings.length === 0) {
      errors.push("至少需要一个字段映射");
    } else {
      rule.fieldMappings.forEach((mapping, index) => {
        if (!mapping.sourceFieldPath || mapping.sourceFieldPath.trim().length === 0) {
          errors.push(`字段映射 ${index + 1}: 源字段路径不能为空`);
        }

        if (!mapping.targetField || mapping.targetField.trim().length === 0) {
          errors.push(`字段映射 ${index + 1}: 目标字段不能为空`);
        }

        if (mapping.confidence < 0 || mapping.confidence > 1) {
          warnings.push(`字段映射 ${index + 1}: 置信度应在0-1之间`);
        }

        // 验证转换配置
        if (mapping.transform) {
          if (!Object.values(TRANSFORMATION_TYPES).includes(mapping.transform.type as any)) {
            errors.push(`字段映射 ${index + 1}: 无效的转换类型 ${mapping.transform.type}`);
          }

          if (mapping.transform.type === TRANSFORMATION_TYPES.DIVIDE &&
              Number(mapping.transform.value) === 0) {
            errors.push(`字段映射 ${index + 1}: 除法操作的值不能为0`);
          }
        }
      });
    }

    // 验证整体置信度
    if (rule.overallConfidence < 0 || rule.overallConfidence > 1) {
      warnings.push("整体置信度应在0-1之间");
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * 🔄 预览映射结果（不保存统计数据）
   */
  public async previewMappingResult(
    rule: FlexibleMappingRuleDocument,
    sampleData: any,
  ): Promise<{
    previewResult: any;
    mappingPreview: Array<{
      sourceFieldPath: string;
      targetField: string;
      sourceValue: any;
      transformedValue: any;
      success: boolean;
      error?: string;
    }>;
    overallSuccess: boolean;
  }> {
    this.logger.debug("预览映射结果", {
      ruleId: rule._id?.toString(),
      sampleDataKeys: Object.keys(sampleData || {}),
    });

    const result = await this.applyFlexibleMappingRule(rule, sampleData, true);

    return {
      previewResult: result.transformedData,
      mappingPreview: result.debugInfo || [],
      overallSuccess: result.success,
    };
  }
}
