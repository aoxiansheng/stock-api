import { Injectable } from "@nestjs/common";
import { createLogger } from "@common/logging/index";
import {
  ReceiverType,
  QueryTypeFilter,
  FIELD_MAPPING_CONFIG,
} from "../types/field-naming.types";
import { StorageClassification } from "../types/storage-classification.enum";

/**
 * 字段映射转换服务
 * 处理不同组件间字段的转换和映射关系
 */
@Injectable()
export class FieldMappingService {
  // 🔧 Phase 1.4: 统一日志规范，使用 createLogger 与项目规范一致
  private readonly logger = createLogger(FieldMappingService.name);

  constructor() {}

  /**
   * 将 Receiver 的能力类型转换为 Storage 的数据分类
   * @param receiverType - Receiver 组件的能力类型
   * @returns Storage 组件的数据分类
   */
  capabilityToClassification(
    receiverType: ReceiverType,
  ): StorageClassification {
    const classification =
      FIELD_MAPPING_CONFIG.CAPABILITY_TO_CLASSIFICATION[receiverType];

    if (!classification) {
      this.logger.warn(`未知的能力类型: ${receiverType}，使用默认分类 GENERAL`);
      return StorageClassification.GENERAL;
    }

    return classification;
  }

  /**
   * 将 Storage 的数据分类转换为 Receiver 的能力类型
   * @param classification - Storage 组件的数据分类
   * @returns Receiver 组件的能力类型
   */
  classificationToCapability(
    classification: StorageClassification,
  ): ReceiverType | null {
    const capability =
      FIELD_MAPPING_CONFIG.CLASSIFICATION_TO_CAPABILITY[classification];

    if (!capability) {
      this.logger.warn(`未知的数据分类: ${classification}，无法映射到能力类型`);
      return null;
    }

    return capability as ReceiverType;
  }

  /**
   * 将 Query 的数据类型过滤器转换为 Storage 的数据分类
   * @param queryTypeFilter - Query 组件的数据类型过滤器
   * @returns Storage 组件的数据分类，如果无法映射则返回 null
   */
  filterToClassification(
    queryTypeFilter: QueryTypeFilter,
  ): StorageClassification | null {
    // 首先尝试直接匹配数据分类枚举值
    const directMatch = Object.values(StorageClassification).find(
      (classification) => classification === queryTypeFilter,
    );

    if (directMatch) {
      return directMatch;
    }

    // 然后尝试将其视为能力类型进行转换
    if (this.isValidReceiverType(queryTypeFilter)) {
      return this.capabilityToClassification(queryTypeFilter as ReceiverType);
    }

    this.logger.warn(`无法将数据类型过滤器转换为数据分类: ${queryTypeFilter}`);
    return null;
  }

  /**
   * 将 Storage 的数据分类转换为 Query 可用的过滤器格式
   * @param classification - Storage 组件的数据分类
   * @returns Query 组件可用的数据类型过滤器
   */
  classificationToFilter(
    classification: StorageClassification,
  ): QueryTypeFilter {
    return (FIELD_MAPPING_CONFIG.CLASSIFICATION_TO_CAPABILITY[classification] ||
      classification) as QueryTypeFilter;
  }

  /**
   * 检查字符串是否为有效的能力类型
   * @param value - 要检查的字符串
   * @returns 是否为有效的能力类型
   */
  private isValidReceiverType(value: string): boolean {
    const validCapabilities = Object.keys(
      FIELD_MAPPING_CONFIG.CAPABILITY_TO_CLASSIFICATION,
    );
    return validCapabilities.includes(value);
  }

  /**
   * 获取所有支持的能力类型
   * @returns 所有支持的能力类型数组
   */
  getSupportedReceiverTypes(): ReceiverType[] {
    return Object.keys(
      FIELD_MAPPING_CONFIG.CAPABILITY_TO_CLASSIFICATION,
    ) as ReceiverType[];
  }

  /**
   * 获取所有支持的数据分类
   * @returns 所有支持的数据分类数组
   */
  getSupportedStorageClassifications(): StorageClassification[] {
    return Object.values(StorageClassification);
  }

  // Removed unused methods: batchCapabilityToClassification, batchClassificationToCapability, validateMappingConfig

}
