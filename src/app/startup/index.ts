/**
 * 应用启动管理入口
 * 提供启动和关闭管理服务的统一导出
 */

// 启动健康检查
export * from "./health-checker.service";

// 优雅关闭管理
export * from "./graceful-shutdown.service";

// 启动管理模块
export * from "./startup.module";
