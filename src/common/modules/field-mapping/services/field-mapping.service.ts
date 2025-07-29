import { Injectable, Logger } from '@nestjs/common';
import {
  CapabilityType,
  DataClassification,
  DataTypeFilter,
  FIELD_MAPPING_CONFIG,
} from '../types/field-naming.types';

/**
 * 字段映射转换服务
 * 处理不同组件间字段的转换和映射关系
 */
@Injectable()
export class FieldMappingService {
  private readonly logger = new Logger(FieldMappingService.name);

  /**
   * 将 Receiver 的能力类型转换为 Storage 的数据分类
   * @param capabilityType - Receiver 组件的能力类型
   * @returns Storage 组件的数据分类
   */
  capabilityToClassification(capabilityType: CapabilityType): DataClassification {
    const classification = FIELD_MAPPING_CONFIG.CAPABILITY_TO_CLASSIFICATION[capabilityType];
    
    if (!classification) {
      this.logger.warn(`未知的能力类型: ${capabilityType}，使用默认分类 GENERAL`);
      return DataClassification.GENERAL;
    }

    return classification;
  }

  /**
   * 将 Storage 的数据分类转换为 Receiver 的能力类型
   * @param classification - Storage 组件的数据分类
   * @returns Receiver 组件的能力类型
   */
  classificationToCapability(classification: DataClassification): CapabilityType | null {
    const capability = FIELD_MAPPING_CONFIG.CLASSIFICATION_TO_CAPABILITY[classification];
    
    if (!capability) {
      this.logger.warn(`未知的数据分类: ${classification}，无法映射到能力类型`);
      return null;
    }

    return capability as CapabilityType;
  }

  /**
   * 将 Query 的数据类型过滤器转换为 Storage 的数据分类
   * @param dataTypeFilter - Query 组件的数据类型过滤器
   * @returns Storage 组件的数据分类，如果无法映射则返回 null
   */
  filterToClassification(dataTypeFilter: DataTypeFilter): DataClassification | null {
    // 首先尝试直接匹配数据分类枚举值
    const directMatch = Object.values(DataClassification).find(
      classification => classification === dataTypeFilter
    );
    
    if (directMatch) {
      return directMatch;
    }

    // 然后尝试将其视为能力类型进行转换
    if (this.isValidCapabilityType(dataTypeFilter)) {
      return this.capabilityToClassification(dataTypeFilter as CapabilityType);
    }

    this.logger.warn(`无法将数据类型过滤器转换为数据分类: ${dataTypeFilter}`);
    return null;
  }

  /**
   * 将 Storage 的数据分类转换为 Query 可用的过滤器格式
   * @param classification - Storage 组件的数据分类
   * @returns Query 组件可用的数据类型过滤器
   */
  classificationToFilter(classification: DataClassification): DataTypeFilter {
    return classification.toString();
  }

  /**
   * 检查字符串是否为有效的能力类型
   * @param value - 要检查的字符串
   * @returns 是否为有效的能力类型
   */
  private isValidCapabilityType(value: string): boolean {
    const validCapabilities = Object.keys(FIELD_MAPPING_CONFIG.CAPABILITY_TO_CLASSIFICATION);
    return validCapabilities.includes(value);
  }

  /**
   * 获取所有支持的能力类型
   * @returns 所有支持的能力类型数组
   */
  getSupportedCapabilityTypes(): CapabilityType[] {
    return Object.keys(FIELD_MAPPING_CONFIG.CAPABILITY_TO_CLASSIFICATION) as CapabilityType[];
  }

  /**
   * 获取所有支持的数据分类
   * @returns 所有支持的数据分类数组
   */
  getSupportedDataClassifications(): DataClassification[] {
    return Object.values(DataClassification);
  }

  /**
   * 批量转换能力类型到数据分类
   * @param capabilityTypes - 能力类型数组
   * @returns 数据分类数组
   */
  batchCapabilityToClassification(capabilityTypes: CapabilityType[]): DataClassification[] {
    return capabilityTypes.map(type => this.capabilityToClassification(type));
  }

  /**
   * 批量转换数据分类到能力类型
   * @param classifications - 数据分类数组
   * @returns 能力类型数组（过滤掉无法映射的）
   */
  batchClassificationToCapability(classifications: DataClassification[]): CapabilityType[] {
    return classifications
      .map(classification => this.classificationToCapability(classification))
      .filter((capability): capability is CapabilityType => capability !== null);
  }

  /**
   * 验证字段映射配置的完整性
   * @returns 验证结果
   */
  validateMappingConfig(): {
    isValid: boolean;
    missingMappings: string[];
    redundantMappings: string[];
  } {
    const capabilities = this.getSupportedCapabilityTypes();
    const classifications = this.getSupportedDataClassifications();
    
    const capabilityToClassKeys = Object.keys(FIELD_MAPPING_CONFIG.CAPABILITY_TO_CLASSIFICATION);
    const classToCapabilityKeys = Object.keys(FIELD_MAPPING_CONFIG.CLASSIFICATION_TO_CAPABILITY);

    const missingMappings: string[] = [];
    const redundantMappings: string[] = [];

    // 检查能力类型到分类的映射
    capabilities.forEach(capability => {
      if (!capabilityToClassKeys.includes(capability)) {
        missingMappings.push(`能力类型 ${capability} 缺少到数据分类的映射`);
      }
    });

    // 检查分类到能力类型的映射
    classifications.forEach(classification => {
      if (!classToCapabilityKeys.includes(classification)) {
        missingMappings.push(`数据分类 ${classification} 缺少到能力类型的映射`);
      }
    });

    const isValid = missingMappings.length === 0 && redundantMappings.length === 0;

    return {
      isValid,
      missingMappings,
      redundantMappings,
    };
  }
}