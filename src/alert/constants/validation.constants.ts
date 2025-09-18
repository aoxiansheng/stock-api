/**
 * Alert 模块验证常量
 * 🎯 Alert 特定的验证限制常量
 * 
 * @description 从 common/constants/validation.constants.ts 迁移的 Alert 专用常量
 */

/**
 * Alert 模块验证限制常量
 * 包含 Alert 特有的业务规则验证限制
 */
export const ALERT_VALIDATION_LIMITS = Object.freeze({
  // 持续时间和冷却时间限制
  DURATION_MIN: 30, // 30秒 - 最小持续时间
  DURATION_MAX: 600, // 600秒 - 最大持续时间
  COOLDOWN_MIN: 60, // 60秒 - 最小冷却时间
  COOLDOWN_MAX: 3000, // 3000秒 - 最大冷却时间

  // ⚠️ Alert DTO所需的重试和超时验证常量（临时保留）
  // TODO: 后续考虑迁移到配置系统
  RETRIES_MIN: 0, // 0次 - 最小重试次数
  RETRIES_MAX: 10, // 10次 - 最大重试次数
  TIMEOUT_MIN: 1000, // 1000毫秒 - 最小超时时间
  TIMEOUT_MAX: 60000, // 60000毫秒 - 最大超时时间

  // 复用通用字符串长度限制（保持与原有系统一致）
  NAME_MAX_LENGTH: 100, // 名称最大长度
  DESCRIPTION_MAX_LENGTH: 500, // 描述最大长度
});