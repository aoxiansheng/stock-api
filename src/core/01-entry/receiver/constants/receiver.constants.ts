/**
 * 数据接收服务常量 - 向后兼容性导出层
 * @deprecated 此文件已拆分为按功能组织的模块，建议使用新的模块化导入
 * 
 * 新的模块结构：
 * - messages.constants.ts - 错误、警告、成功消息
 * - validation.constants.ts - 验证规则、性能阈值、市场规则
 * - config.constants.ts - 配置、重试、缓存、健康检查
 * - operations.constants.ts - 能力类型、操作、状态、事件、指标
 * 
 * 请使用: import { ... } from '../constants' 获取所有常量
 */

// 重新导出所有常量以保持向后兼容性
export * from './messages.constants';
export * from './validation.constants';
export * from './config.constants';
export * from './operations.constants';
