/**
 * 重构后的Alert服务层导出
 * 🎯 新的服务层架构，职责清晰分离
 * 
 * @description 替代原有的服务导出，实现单一职责原则
 * @author Claude Code Assistant
 * @date 2025-09-10
 */

// 核心服务层 - 按职责分离
export * from './alert-rule.service';           // 规则管理
export * from './alert-evaluation.service';     // 规则评估
export * from './alert-lifecycle.service';      // 生命周期管理
export * from './alert-query.service';          // 查询服务
export * from './alert-cache.service';          // 缓存管理
export * from './alert-event-publisher.service'; // 事件发布

// 支持层
export * from '../validators/alert-rule.validator'; // 规则验证
export * from '../evaluators/rule.evaluator';       // 规则评估器

// 向后兼容 - 保留原有服务但标记为已废弃
export * from './alerting.service';             // @deprecated 使用 AlertRuleService 和 AlertEvaluationService 替代
export * from './alert-history.service';        // @deprecated 使用 AlertLifecycleService 和 AlertQueryService 替代  
export * from './rule-engine.service';          // @deprecated 使用 RuleEvaluator 和 AlertRuleValidator 替代
export * from './alert-event-adapter.service';  // @deprecated 使用 AlertEventPublisher 替代

/**
 * 服务层架构说明
 * 
 * ## 新架构优势
 * 1. **单一职责**: 每个服务只负责一个特定领域
 * 2. **清晰边界**: 服务间依赖关系明确，避免循环依赖
 * 3. **易于测试**: 每个服务可以独立测试和模拟
 * 4. **易于维护**: 功能变更只影响相关服务
 * 5. **可扩展性**: 新功能可以作为新服务添加
 * 
 * ## 服务职责分工
 * 
 * ### AlertRuleService - 规则管理
 * - 规则CRUD操作
 * - 规则验证和状态切换
 * - 批量规则操作
 * 
 * ### AlertEvaluationService - 规则评估
 * - 指标数据处理
 * - 规则评估执行
 * - 定时评估任务
 * - 系统事件监听
 * 
 * ### AlertLifecycleService - 生命周期管理
 * - 告警创建和更新
 * - 状态转换管理
 * - 生命周期事件发布
 * 
 * ### AlertQueryService - 查询服务
 * - 告警查询和分页
 * - 统计信息计算
 * - 数据导出功能
 * 
 * ### AlertCacheService - 缓存管理
 * - 活跃告警缓存
 * - 冷却状态管理
 * - 时序数据缓存
 * 
 * ### AlertEventPublisher - 事件发布
 * - 事件适配和发布
 * - 通用事件转换
 * - 向后兼容支持
 * 
 * ## 迁移建议
 * 
 * ### 旧服务 -> 新服务映射
 * 
 * ```typescript
 * // 旧代码
 * constructor(private alertingService: AlertingService) {}
 * 
 * // 新代码
 * constructor(
 *   private alertRuleService: AlertRuleService,
 *   private alertEvaluationService: AlertEvaluationService,
 *   private alertLifecycleService: AlertLifecycleService
 * ) {}
 * ```
 * 
 * ### 功能迁移对照
 * 
 * | 旧功能 | 新服务 | 新方法 |
 * |--------|--------|--------|
 * | alertingService.createRule() | AlertRuleService | createRule() |
 * | alertingService.processMetrics() | AlertEvaluationService | processMetrics() |
 * | alertingService.acknowledgeAlert() | AlertLifecycleService | acknowledgeAlert() |
 * | alertHistoryService.queryAlerts() | AlertQueryService | queryAlerts() |
 * | alertingService.getStats() | AlertQueryService | getAlertStatistics() |
 * 
 * ## 渐进式迁移策略
 * 
 * 1. **阶段1**: 新功能使用新服务架构
 * 2. **阶段2**: 逐步将现有功能迁移到新服务
 * 3. **阶段3**: 移除旧服务的实现，保留接口层
 * 4. **阶段4**: 完全移除旧服务
 */

// 服务统计接口
export interface ServiceLayerStats {
  ruleService: ReturnType<typeof import('./alert-rule.service').AlertRuleService.prototype.getRuleStats>;
  evaluationService: ReturnType<typeof import('./alert-evaluation.service').AlertEvaluationService.prototype.getEvaluationStats>;
  lifecycleService: ReturnType<typeof import('./alert-lifecycle.service').AlertLifecycleService.prototype.getLifecycleStats>;
  queryService: ReturnType<typeof import('./alert-query.service').AlertQueryService.prototype.getQueryStats>;
  cacheService: ReturnType<typeof import('./alert-cache.service').AlertCacheService.prototype.getCacheStats>;
  eventPublisher: ReturnType<typeof import('./alert-event-publisher.service').AlertEventPublisher.prototype.getPublisherStats>;
}

// 服务健康检查接口
export interface ServiceHealthCheck {
  serviceName: string;
  status: 'healthy' | 'unhealthy' | 'degraded';
  dependencies: string[];
  lastCheck: Date;
  details?: any;
}