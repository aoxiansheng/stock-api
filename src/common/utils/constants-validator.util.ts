/**
 * 常量验证工具
 * 🎯 符合开发规范指南 - 自动检测常量重复，确保代码质量
 *
 * 功能：
 * - 检测重复的常量值
 * - 验证常量完整性
 * - 分析常量使用情况
 * - 生成重复检测报告
 */

import { UNIFIED_CONSTANTS } from '../constants/unified/unified-constants-collection';

/**
 * 重复检测结果接口
 */
export interface DuplicateResult {
  /** 重复的值 */
  value: string;
  /** 使用该值的常量键路径 */
  keys: string[];
  /** 重复次数 */
  count: number;
}

/**
 * 常量验证结果接口
 */
export interface ValidationResult {
  /** 验证是否通过 */
  isValid: boolean;
  /** 发现的问题列表 */
  errors: string[];
  /** 警告信息列表 */
  warnings: string[];
  /** 统计信息 */
  statistics: {
    /** 总常量数量 */
    totalConstants: number;
    /** 字符串常量数量 */
    stringConstants: number;
    /** 重复项数量 */
    duplicates: number;
    /** 重复率 */
    duplicationRate: number;
  };
  /** 重复项详情 */
  duplicateDetails: DuplicateResult[];
}

/**
 * 常量验证器工具类
 */
export class ConstantsValidator {
  /**
   * 递归提取对象中的所有字符串值和路径
   * @param obj 要检查的对象
   * @param prefix 路径前缀
   * @returns 值到路径的映射
   */
  private static extractStringValues(
    obj: any,
    prefix = ''
  ): Map<string, string[]> {
    const valueMap = new Map<string, string[]>();

    const traverse = (current: any, currentPrefix: string) => {
      if (current === null || current === undefined) {
        return;
      }

      // 跳过函数和类实例
      if (typeof current === 'function' || current.constructor?.name !== 'Object') {
        return;
      }

      Object.entries(current).forEach(([key, value]) => {
        const fullPath = currentPrefix ? `${currentPrefix}.${key}` : key;

        if (typeof value === 'string') {
          // 字符串值，记录路径
          if (!valueMap.has(value)) {
            valueMap.set(value, []);
          }
          valueMap.get(value)!.push(fullPath);
        } else if (typeof value === 'object' && value !== null) {
          // 递归处理对象
          traverse(value, fullPath);
        }
      });
    };

    traverse(obj, prefix);
    return valueMap;
  }

  /**
   * 查找重复的常量值
   * @param constants 要检查的常量对象
   * @returns 重复项列表
   */
  static findDuplicateValues(constants: any = UNIFIED_CONSTANTS): DuplicateResult[] {
    const valueMap = this.extractStringValues(constants);
    const duplicates: DuplicateResult[] = [];

    valueMap.forEach((paths, value) => {
      if (paths.length > 1) {
        duplicates.push({
          value,
          keys: paths,
          count: paths.length,
        });
      }
    });

    // 按重复次数降序排序
    return duplicates.sort((a, b) => b.count - a.count);
  }

  /**
   * 验证常量完整性
   * @param constants 要验证的常量对象
   * @returns 验证结果
   */
  static validateConstants(constants: any = UNIFIED_CONSTANTS): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // 获取所有字符串值
    const valueMap = this.extractStringValues(constants);
    const allValues = Array.from(valueMap.keys());
    const totalStringConstants = allValues.length;

    // 查找重复项
    const duplicates = this.findDuplicateValues(constants);
    const duplicateCount = duplicates.reduce((sum, dup) => sum + dup.count - 1, 0);

    // 计算重复率
    const duplicationRate = totalStringConstants > 0 
      ? (duplicateCount / totalStringConstants) * 100 
      : 0;

    // 检查严重重复（完全相同的字符串）
    duplicates.forEach(duplicate => {
      if (duplicate.count > 2) {
        errors.push(`严重重复: "${duplicate.value}" 出现 ${duplicate.count} 次 (${duplicate.keys.join(', ')})`);
      } else if (duplicate.count === 2) {
        warnings.push(`重复: "${duplicate.value}" 出现 2 次 (${duplicate.keys.join(', ')})`);
      }
    });

    // 检查重复率
    if (duplicationRate > 10) {
      errors.push(`重复率过高: ${duplicationRate.toFixed(1)}% (目标: <5%)`);
    } else if (duplicationRate > 5) {
      warnings.push(`重复率偏高: ${duplicationRate.toFixed(1)}% (目标: <5%)`);
    }

    // 检查常见问题
    this.checkCommonIssues(allValues, errors, warnings);

    const result: ValidationResult = {
      isValid: errors.length === 0,
      errors,
      warnings,
      statistics: {
        totalConstants: totalStringConstants,
        stringConstants: totalStringConstants,
        duplicates: duplicates.length,
        duplicationRate: Math.round(duplicationRate * 100) / 100,
      },
      duplicateDetails: duplicates,
    };

    return result;
  }

  /**
   * 检查常见的常量问题
   * @param values 所有常量值
   * @param errors 错误列表
   * @param warnings 警告列表
   */
  private static checkCommonIssues(
    values: string[],
    errors: string[],
    warnings: string[]
  ): void {
    // 检查空字符串
    const emptyStrings = values.filter(v => v === '');
    if (emptyStrings.length > 0) {
      warnings.push(`发现 ${emptyStrings.length} 个空字符串常量`);
    }

    // 检查相似的错误消息
    const errorMessages = values.filter(v => 
      v.includes('错误') || v.includes('失败') || v.includes('异常')
    );
    const uniqueErrorMessages = new Set(errorMessages);
    if (errorMessages.length !== uniqueErrorMessages.size) {
      warnings.push('检测到相似的错误消息，建议使用模板统一格式');
    }

    // 检查长度过长的消息
    const longMessages = values.filter(v => v.length > 100);
    if (longMessages.length > 0) {
      warnings.push(`发现 ${longMessages.length} 个过长的消息（>100字符）`);
    }

    // 检查包含硬编码数字的消息
    const numberedMessages = values.filter(v => /\d+/.test(v));
    if (numberedMessages.length > 5) {
      warnings.push(`发现 ${numberedMessages.length} 个包含数字的消息，考虑使用参数化模板`);
    }
  }

  /**
   * 生成详细的验证报告
   * @param constants 要检查的常量对象
   * @returns 格式化的报告字符串
   */
  static generateReport(constants: any = UNIFIED_CONSTANTS): string {
    const result = this.validateConstants(constants);
    const lines: string[] = [];

    lines.push('='.repeat(60));
    lines.push('📊 常量验证报告');
    lines.push('='.repeat(60));
    lines.push('');

    // 总体状态
    lines.push(`🎯 验证状态: ${result.isValid ? '✅ 通过' : '❌ 失败'}`);
    lines.push('');

    // 统计信息
    lines.push('📈 统计信息:');
    lines.push(`  字符串常量总数: ${result.statistics.stringConstants}`);
    lines.push(`  重复项数量: ${result.statistics.duplicates}`);
    lines.push(`  重复率: ${result.statistics.duplicationRate}%`);
    lines.push('');

    // 错误信息
    if (result.errors.length > 0) {
      lines.push('🔴 错误 (必须修复):');
      result.errors.forEach((error, index) => {
        lines.push(`  ${index + 1}. ${error}`);
      });
      lines.push('');
    }

    // 警告信息
    if (result.warnings.length > 0) {
      lines.push('🟡 警告 (建议修复):');
      result.warnings.forEach((warning, index) => {
        lines.push(`  ${index + 1}. ${warning}`);
      });
      lines.push('');
    }

    // 重复项详情
    if (result.duplicateDetails.length > 0) {
      lines.push('🔍 重复项详情:');
      result.duplicateDetails.forEach((duplicate, index) => {
        lines.push(`  ${index + 1}. "${duplicate.value}"`);
        lines.push(`     重复次数: ${duplicate.count}`);
        lines.push(`     位置: ${duplicate.keys.join(', ')}`);
        lines.push('');
      });
    }

    // 建议
    lines.push('💡 改进建议:');
    if (result.statistics.duplicationRate > 5) {
      lines.push('  - 使用消息模板减少重复定义');
      lines.push('  - 建立统一的常量引用体系');
    }
    if (result.duplicateDetails.length > 0) {
      lines.push('  - 优先修复重复次数最多的项目');
      lines.push('  - 考虑使用枚举或常量组合');
    }
    lines.push('  - 定期运行验证确保代码质量');

    lines.push('');
    lines.push('='.repeat(60));
    lines.push(`报告生成时间: ${new Date().toLocaleString()}`);
    lines.push('='.repeat(60));

    return lines.join('\n');
  }

  /**
   * 检查特定类型的重复
   * @param constants 常量对象
   * @param pattern 匹配模式
   * @returns 匹配的重复项
   */
  static findPatternDuplicates(
    constants: any = UNIFIED_CONSTANTS,
    pattern: RegExp
  ): DuplicateResult[] {
    const duplicates = this.findDuplicateValues(constants);
    return duplicates.filter(dup => pattern.test(dup.value));
  }

  /**
   * 获取常量统计信息
   * @param constants 常量对象
   * @returns 统计信息
   */
  static getStatistics(constants: any = UNIFIED_CONSTANTS): ValidationResult['statistics'] {
    const result = this.validateConstants(constants);
    return result.statistics;
  }

  /**
   * 快速检查是否存在重复
   * @param constants 常量对象
   * @returns 是否存在重复
   */
  static hasDuplicates(constants: any = UNIFIED_CONSTANTS): boolean {
    const duplicates = this.findDuplicateValues(constants);
    return duplicates.length > 0;
  }
}

/**
 * 便捷的全局验证函数
 */
export const validateConstants = () => ConstantsValidator.validateConstants();
export const findDuplicates = () => ConstantsValidator.findDuplicateValues();
export const generateReport = () => ConstantsValidator.generateReport();