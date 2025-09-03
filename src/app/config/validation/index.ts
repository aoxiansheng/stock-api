/**
 * 配置验证模块入口
 * 提供统一的配置验证服务
 */

// 接口和类型定义
export * from "./validation.interfaces";

// 验证服务
export * from "./config-validator.service";
export * from "./environment-validator.service";
export * from "./dependencies-validator.service";

// 验证模块
export * from "./config-validation.module";
