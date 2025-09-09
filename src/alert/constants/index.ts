/**
 * Alert模块常量统一导出入口
 * 🎯 主索引文件 - 提供分层架构的统一访问接口
 * 
 * 📁 架构说明:
 * - 核心层 (Core): 基础数值、模式、限制、超时配置
 * - 领域层 (Domain): 业务专用常量 (告警规则、通知、历史、验证)
 * - 应用层 (Composite): 应用级配置 (默认值、操作、模板)
 * 
 * 🎯 使用方式:
 * 1. 按层导入: import { CORE_CONSTANTS } from '@alert/constants'
 * 2. 按功能导入: import { ALERT_DEFAULTS } from '@alert/constants'
 * 3. 按模块导入: import { ALERT_RULE_CONSTANTS } from '@alert/constants/domain'
 */

// ================================
// 核心基础层导出
// ================================
export * from './core';
export { CORE_CONSTANTS, CORE_UTILS } from './core';

// 导入用于对象定义
import { CORE_CONSTANTS, CORE_UTILS } from './core';

// ================================  
// 领域专用层导出
// ================================
export * from './domain';
export {
  DOMAIN_CONSTANTS,
  DOMAIN_OPERATIONS,
  DOMAIN_MESSAGES,
  DOMAIN_METRICS,
  DOMAIN_UTILS,
} from './domain';

// 导入用于对象定义
import {
  DOMAIN_CONSTANTS,
  DOMAIN_OPERATIONS,
  DOMAIN_MESSAGES,
  DOMAIN_METRICS,
  DOMAIN_UTILS,
} from './domain';

// ================================
// 复合应用层导出
// ================================
export * from './composite';
export {
  COMPOSITE_CONSTANTS,
  COMPOSITE_UTILS,
  APPLICATION_CONFIG,
} from './composite';

// 导入用于对象定义
import {
  COMPOSITE_CONSTANTS,
  COMPOSITE_UTILS,
  APPLICATION_CONFIG,
} from './composite';

// ================================
// 向后兼容性导出
// ================================

/**
 * 🔄 向后兼容 - 原有常量文件的主要导出
 * 确保现有代码可以无缝迁移到新架构
 */

// 从 alert.constants.ts 迁移
export { VALID_OPERATORS, OPERATOR_SYMBOLS } from './domain/alert-rules.constants';
export type { OperatorType, Operator } from './domain/alert-rules.constants';

// 从 shared.constants.ts 迁移  
export { 
  CORE_LIMITS as SHARED_BATCH_LIMITS,
  CORE_LIMITS as SHARED_STRING_LIMITS,
} from './core/limits.constants';
export { 
  VALIDATION_LIMITS as SHARED_VALIDATION_RULES,
  ValidationUtil as SharedValidationUtil,
} from './domain/validation.constants';

// 从 defaults.constants.ts 迁移
export { 
  ALERT_DEFAULTS,
  AlertDefaultsUtil,
  type AlertDefaults,
} from './composite/defaults.constants';

// 从 timing.constants.ts 迁移
export {
  ALERT_CORE_TIMEOUTS as TIMING_CONSTANTS,
  TimeConverter as TimingUtil,
  TimeValidator,
  type AlertCoreTimeouts as TimingConstants,
} from './core/timeouts.constants';

// 从 retry.constants.ts 迁移
export {
  NOTIFICATION_CONSTANTS as NOTIFICATION_RETRY_CONFIG,
  ALERT_RULE_CONSTANTS as ALERTING_RETRY_CONFIG,
} from './domain';

// 从 business-rules.constants.ts 迁移
export {
  ALERT_RULE_CONSTANTS as ALERT_BUSINESS_RULES,
  ALERT_RULE_CONSTANTS as BUSINESS_CONSTANTS,
} from './domain/alert-rules.constants';

// 从 validation.constants.ts 迁移
export {
  VALIDATION_LIMITS,
  VALIDATION_MESSAGES,
  ValidationUtil,
  type ValidationLimits,
} from './domain/validation.constants';

// ================================
// 统一架构访问接口
// ================================

/**
 * 🏗️ 新架构统一访问接口
 * 提供清晰的分层访问方式
 */
export const ALERT_CONSTANTS_ARCHITECTURE = {
  /**
   * 核心基础层
   * 包含所有基础数值、模式、限制和超时配置
   */
  CORE: {
    VALUES: CORE_CONSTANTS.VALUES,
    PATTERNS: CORE_CONSTANTS.PATTERNS,
    LIMITS: CORE_CONSTANTS.LIMITS,
    TIMEOUTS: CORE_CONSTANTS.TIMEOUTS,
  },

  /**
   * 领域专用层
   * 包含各业务领域的专用常量
   */
  DOMAIN: {
    ALERT_RULES: DOMAIN_CONSTANTS.ALERT_RULES,
    NOTIFICATIONS: DOMAIN_CONSTANTS.NOTIFICATIONS,
    ALERT_HISTORY: DOMAIN_CONSTANTS.ALERT_HISTORY,
    VALIDATION: DOMAIN_CONSTANTS.VALIDATION,
  },

  /**
   * 复合应用层
   * 包含应用级配置和集成常量
   */
  COMPOSITE: {
    DEFAULTS: COMPOSITE_CONSTANTS.DEFAULTS,
    OPERATIONS: COMPOSITE_CONSTANTS.OPERATIONS,
    MESSAGES: COMPOSITE_CONSTANTS.MESSAGES,
    METRICS: COMPOSITE_CONSTANTS.METRICS,
    TEMPLATES: COMPOSITE_CONSTANTS.TEMPLATES,
  },
} as const;

/**
 * 🛠️ 统一工具类访问接口
 */
export const ALERT_UTILS = {
  CORE: CORE_UTILS,
  DOMAIN: DOMAIN_UTILS,
  COMPOSITE: COMPOSITE_UTILS,
} as const;

/**
 * 📊 常量使用统计信息
 */
export const CONSTANTS_METADATA = {
  VERSION: '2.0.0',
  ARCHITECTURE: 'Layered Architecture',
  LAYERS: ['Core', 'Domain', 'Composite'],
  MIGRATION_GUIDE: {
    FROM: 'Flat structure with duplicated values',
    TO: 'Layered structure with single source of truth',
    BENEFITS: [
      'Eliminated duplicate constants',
      'Clear dependency hierarchy', 
      'Better maintainability',
      'Type safety improvements',
      'Easier testing and validation',
    ],
  },
  USAGE_EXAMPLES: {
    CORE_LAYER: "import { CORE_VALUES } from '@alert/constants'",
    DOMAIN_LAYER: "import { ALERT_RULE_CONSTANTS } from '@alert/constants'", 
    COMPOSITE_LAYER: "import { ALERT_DEFAULTS } from '@alert/constants'",
    BACKWARD_COMPATIBLE: "import { VALID_OPERATORS } from '@alert/constants'",
  },
} as const;

/**
 * 类型定义导出
 */
export type AlertConstantsArchitecture = typeof ALERT_CONSTANTS_ARCHITECTURE;
export type AlertUtils = typeof ALERT_UTILS;
export type ConstantsMetadata = typeof CONSTANTS_METADATA;