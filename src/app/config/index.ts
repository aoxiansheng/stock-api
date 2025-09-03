/**
 * 应用级配置入口
 * 提供统一的配置访问接口
 */

// 应用级配置
export * from "./app.config";

// 启动配置
export * from "./startup.config";

// 功能开关配置
export * from "./feature-flags.config";

// 自动初始化配置
export * from "./auto-init.config";

// 告警配置
export * from "../../alert/config/alert.config";

// 安全配置
export * from "../../auth/config/security.config";

// 通知配置
export * from "./notification.config";

// 统一配置模块
export * from "./config.module";

// 配置验证相关导出
export * from "./validation";
