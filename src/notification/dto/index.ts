/**
 * 通知模块DTO导出
 * 🎯 统一导出所有通知相关的DTO类型
 *
 * @description 提供完整的DTO类型导出，支持模块解耦和类型安全
 * @author Claude Code Assistant
 * @date 2025-09-12
 */

// 通知渠道相关DTO
export * from "./notification-channel.dto";

// 通知查询DTO
export * from "./notification-query.dto";

// 通知请求DTO (解耦Alert模块的核心DTO)
export * from "./notification-request.dto";

// 通知历史DTO
export * from "./notification-history.dto";

// 模板查询DTO
export * from "./template-query.dto";

// 各类型通知渠道DTO
export * from "./channels";
