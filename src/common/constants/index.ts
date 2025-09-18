/**
 * Common Constants 统一导出
 * 🏗️ 四层架构常量系统的最终统一入口
 * 📋 Foundation → Semantic → Domain → Application
 *
 * 🎯 解决问题：
 * ✅ 重复常量定义 - 单一数值源
 * ✅ 混乱的依赖关系 - 严格单向依赖
 * ✅ 语义混淆 - 标准化命名规范
 * ✅ 缺乏层次设计 - 清晰的四层架构
 * ✅ 命名不一致 - 统一命名约定
 */

// =================================
// 🏛️ Foundation 层 (基础层)
// =================================
// 纯数值定义，零依赖，所有重复数值的单一真实来源
export * from "./foundation";

// =================================
// 🎯 Semantic 层 (语义层)
// =================================
// 业务无关的语义分类，基于Foundation层构建
export * from "./semantic";

// =================================
// 🏢 Domain 层 (领域层)
// =================================
// 业务领域专用常量，基于Semantic层构建
export * from "./domain";

// =================================
// 🚀 Application 层 (应用层)
// =================================
// 集成和应用级配置，整合所有层级
export * from "./application";

import { FOUNDATION_CONSTANTS } from "./foundation";
import { SEMANTIC_CONSTANTS } from "./semantic";
import { DOMAIN_CONSTANTS } from "./domain";
import { APPLICATION_CONSTANTS, CONFIG } from "./application";

/**
 * 完整常量系统导出
 * 🎯 四层架构的完整访问接口
 */

/**
 * 便捷访问常量
 * 🎯 开发者最常用的快捷访问方式
 */
export const CONSTANTS = {
  // 🔥 最常用配置 - 99%场景覆盖
  QUICK: CONFIG.QUICK,

  // 🌍 环境配置
  ENV: CONFIG.ENV,

  // 🚀 完整系统
  SYSTEM: CONFIG.SYSTEM,

  // 🏛️ 直接层级访问
  FOUNDATION: FOUNDATION_CONSTANTS,
  SEMANTIC: SEMANTIC_CONSTANTS,
  DOMAIN: DOMAIN_CONSTANTS,
  APPLICATION: APPLICATION_CONSTANTS,
} as const;

/**
 * 默认导出 - 最简单的使用方式
 * 🎯 import CONSTANTS from '@common/constants'
 */
export default CONSTANTS;

/**
 * 通用验证工具导出
 * 🎯 通用验证工具类，供所有模块使用
 * 
 * ✅ 验证常量已拆分到各模块内部：
 * - Alert 验证常量: @alert/constants/validation.constants
 * - Cache 验证常量: @cache/constants/validation.constants
 * - 通用验证工具: @common/utils/validation-limits.util
 */
export { ValidationLimitsUtil } from "../utils/validation-limits.util";

/**
 * 配置系统导出 (推荐使用)
 * 🎯 现代化配置管理替代方案
 * 
 * 使用方式:
 * ```typescript
 * import { ConfigService } from '@nestjs/config';
 * // 或直接导入配置
 * import unifiedTtlConfig from '@appcore/config/unified-ttl.config';
 * import commonConstantsConfig from '@common/config/common-constants.config';
 * import notificationConfig from '@notification/config/notification-unified.config';
 * ```
 */

/**
 * 类型定义导出
 */
export type ConstantsQuickAccess = typeof CONSTANTS.QUICK;
export type ConstantsSystem = typeof CONSTANTS;
