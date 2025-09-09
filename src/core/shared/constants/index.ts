/**
 * Core 共享常量统一导出入口
 * 🎯 主索引文件 - 提供 Core 模块共享常量的统一访问接口
 * 
 * 📁 架构说明:
 * - 从 common 常量剥离的 CORE_LIMITS 常量
 * - 专用于 Core 模块的系统边界值和限制定义
 * 
 * 🎯 使用方式:
 * 1. 限制常量: import { CORE_LIMITS, CoreLimitsUtil } from '@/core/shared/constants'
 * 2. 批量限制: import { CORE_LIMITS.BATCH_LIMITS } from '@/core/shared/constants'
 * 3. 分页限制: import { CORE_LIMITS.PAGINATION } from '@/core/shared/constants'
 */

// ================================
// 从 common 常量剥离的专属导出
// ================================
export * from './limits';
export { 
  CORE_LIMITS,
  CoreLimitsUtil,
  type CoreLimits 
} from './limits';