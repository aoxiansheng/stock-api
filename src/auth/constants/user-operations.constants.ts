/**
 * 用户操作固定标准常量 - 业务规则和验证模式标准
 * 🎯 重构说明：保留固定标准，数值配置已迁移到统一配置系统
 * 🔧 Phase 2.4: 采用通用验证常量，保持业务规则完整性
 *
 * ✅ 保留内容：验证正则、保留用户名、默认角色/状态等固定标准
 * 🔧 已迁移内容：数值限制、时长配置、会话参数等可配置参数
 * 🔄 新增内容：引用通用常量，保持一致性
 *
 * @see AuthConfigCompatibilityWrapper - 访问迁移后的配置参数
 * @see .env.auth.example - 环境变量配置说明
 * @see VALIDATION_LIMITS - 通用验证限制常量
 */

import { VALIDATION_LIMITS } from "@common/constants/validation.constants";
import { deepFreeze } from "../../common/utils/object-immutability.util";

// 🔄 重新导出统一常量，保持向后兼容性
export { USER_REGISTRATION, ACCOUNT_DEFAULTS } from "./auth-semantic.constants";
