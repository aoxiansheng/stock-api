/**
 * 增强日志系统 - 统一导出入口
 *
 * 这个文件提供了日志系统的所有核心功能：
 * 1. createLogger - 主要的日志创建函数（替换原兼容层）
 * 2. SafeLogLevelController - 安全的日志级别控制器
 * 3. LogLevelController - 核心日志级别控制器
 * 4. shouldLog - 全局级别检查函数
 * 5. 类型定义和配置
 */

// 核心控制器
export { LogLevelController } from "./log-level-controller";
export {
  SafeLogLevelController,
  createSafeLogLevelController,
} from "./safe-log-level-controller";

// 类型定义
export type {
  LogLevel,
  LogLevelConfig,
  UpdateConfig,
  CacheEntry,
  LoggingStats,
} from "./types";

// 核心常量
export { LOG_LEVEL_VALUES } from "./types";

// 全局便利函数
export {
  shouldLog,
  createLogger,
  sanitizeLogData,
  LoggerConfig,
  getLogLevels,
} from "./utils";
