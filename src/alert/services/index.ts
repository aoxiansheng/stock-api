// ========== 🆕 新服务架构导出 ==========
// 核心服务
export * from './alert-rule.service';
export * from './alert-evaluation.service';
export * from './alert-lifecycle.service';
export * from './alert-query.service';
export * from './alert-cache.service';
export * from './alert-event-publisher.service';
export * from './alert-orchestrator.service';

// ========== ⚠️ 旧服务导出（向后兼容） ==========
export * from "./alerting.service";
export * from "./alert-history.service";
export * from "./rule-engine.service";
// export * from "./alert-event-adapter.service"; // 单独导入

// NOTE: notification.service 已迁移到 notification module