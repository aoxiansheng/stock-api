/**
 * Auth常量统一导出 - 简单导出，无逻辑抽象
 * 🎯 遵循四项原则：直观优先、业务语义、就近原则、零抽象
 */

// 用户操作相关
export * from "./user-operations.constants";

// API安全相关 - 已迁移到统一配置系统
// export * from './api-security.constants'; // REMOVED - 已完全迁移到 AuthConfigCompatibilityWrapper

// 频率限制相关
export * from "./rate-limiting.constants";

// 权限控制相关
export * from "./permission-control.constants";

// 验证限制相关 - 已迁移到 AuthConfigCompatibilityWrapper.VALIDATION_LIMITS
// export * from './validation-limits.constants'; // REMOVED - Use AuthConfigCompatibilityWrapper.VALIDATION_LIMITS instead
