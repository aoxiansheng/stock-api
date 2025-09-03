import { Injectable } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { createLogger } from "@app/config/logger.config";
import { SYSTEM_STATUS_EVENTS } from "../../../monitoring/contracts/events/system-status.events";
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

  constructor(
    private readonly eventBus: EventEmitter2, // ✅ 事件驱动监控
  ) {}

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
    return (
      FIELD_MAPPING_CONFIG.CLASSIFICATION_TO_CAPABILITY[classification] ||
      classification.toString()
    );
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

  /**
   * 批量转换能力类型到数据分类
   * @param receiverTypes - 能力类型数组
   * @returns 数据分类数组
   */
  batchCapabilityToClassification(
    receiverTypes: ReceiverType[],
  ): StorageClassification[] {
    return receiverTypes.map((type) => this.capabilityToClassification(type));
  }

  /**
   * 批量转换数据分类到能力类型
   * @param classifications - 数据分类数组
   * @returns 能力类型数组（过滤掉无法映射的）
   */
  batchClassificationToCapability(
    classifications: StorageClassification[],
  ): ReceiverType[] {
    return classifications
      .map((classification) => this.classificationToCapability(classification))
      .filter((capability): capability is ReceiverType => capability !== null);
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
    const capabilities = this.getSupportedReceiverTypes();
    const classifications = this.getSupportedStorageClassifications();

    const capabilityToClassKeys = Object.keys(
      FIELD_MAPPING_CONFIG.CAPABILITY_TO_CLASSIFICATION,
    );
    const classToCapabilityKeys = Object.keys(
      FIELD_MAPPING_CONFIG.CLASSIFICATION_TO_CAPABILITY,
    );

    const missingMappings: string[] = [];
    const redundantMappings: string[] = [];

    // 检查能力类型到分类的映射
    capabilities.forEach((capability) => {
      if (!capabilityToClassKeys.includes(capability)) {
        missingMappings.push(`能力类型 ${capability} 缺少到数据分类的映射`);
      }
    });

    // 检查分类到能力类型的映射
    classifications.forEach((classification) => {
      if (!classToCapabilityKeys.includes(classification)) {
        missingMappings.push(`数据分类 ${classification} 缺少到能力类型的映射`);
      }
    });

    const isValid =
      missingMappings.length === 0 && redundantMappings.length === 0;

    return {
      isValid,
      missingMappings,
      redundantMappings,
    };
  }

  // ✅ 事件驱动监控方法（为保持架构一致性而添加，虽然此服务监控需求较低）
  private emitMappingEvent(
    operation: string,
    statusCode: number,
    duration: number,
    metadata: any,
  ) {
    setImmediate(() => {
      try {
        this.eventBus.emit(SYSTEM_STATUS_EVENTS.METRIC_COLLECTED, {
          timestamp: new Date(),
          source: "field_mapping_service",
          metricType: "business",
          metricName: operation,
          metricValue: duration,
          tags: {
            status_code: statusCode,
            status: statusCode < 400 ? "success" : "error",
            ...metadata,
          },
        });
      } catch (error) {
        this.logger.warn("字段映射事件发送失败", {
          error: error.message,
          operation,
        });
      }
    });
  }
}
