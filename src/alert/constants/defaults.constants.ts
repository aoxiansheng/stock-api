/**
 * 告警系统默认值常量
 * 🎯 直观的默认配置，业务逻辑一目了然
 * 📊 基于实际使用场景的默认值设计
 * 
 * @author Alert常量重构任务
 * @created 2025-01-10
 * @refactored 2025-01-10
 */

import { AlertSeverity } from './enums';

/**
 * 告警规则默认值
 * 固定业务默认值（不可配置的业务常量）
 */
export const ALERT_DEFAULTS = {
  // ✅ 保留：固定业务默认值
  operator: '>',                      // 默认操作符（业务标准）
  severity: AlertSeverity.MEDIUM,     // 默认严重程度（业务标准）
  enabled: true,                      // 默认启用状态（业务标准）
  
  // ⚠️ 临时保留：向后兼容（TODO: 迁移引用后删除）
  duration: 60,                       // 60秒 - 默认持续时间（临时保留）
  NAME_MAX_LENGTH: 100,               // 100 - 名称最大长度（临时保留）
  
  // ❌ 删除：重复定义（已在其他地方定义）
  // MAX_CONDITIONS: 10,              // 删除 - 已在alert.config.ts
  // MAX_ACTIONS: 5,                  // 删除 - 已在limits.constants.ts
  // DESCRIPTION_MAX_LENGTH: 500,     // 删除 - 已在validation.constants.ts
} as const;

// ❌ 删除整个对象（已迁移到alert-presets.config.ts）
// export const ALERT_CONFIG_PRESETS = { ... };  // 删除整个对象

// ❌ 删除环境配置（已迁移到环境变量）
// export const ALERT_ENV_CONFIG = { ... };  // 删除整个对象

// 类型定义
export type AlertDefaults = typeof ALERT_DEFAULTS;