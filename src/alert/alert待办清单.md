# Alert模块待办清单

## 📋 模块状态概览

### 当前架构
- **模块版本**: v2.0 - 专业化服务架构
- **使用模块**: `AlertEnhancedModule`
- **已删除**: `AlertCleanModule`（重复代码）
- **服务数量**: 7个专业化服务 + 2个支持组件 + 2个数据仓储

### 代码质量
- ✅ 无兼容层
- ✅ 无循环依赖
- ✅ 类型检查通过
- ⚠️ 19个TODO待实现

---

## 🎯 TODO功能实现清单

### 1. 📊 统计追踪功能（6处）
**目标**: 建立完整的告警系统性能监控和分析体系

| 位置 | 功能描述 | 实现方案 | 优先级 |
|-----|---------|---------|--------|
| `alert-evaluation.service.ts:363` | 评估统计追踪 | 记录规则评估执行次数、成功率、失败原因 | 中 |
| `alert-event-publisher.service.ts:484` | 事件发布统计 | 记录事件发布数量、类型、目标、延迟 | 中 |
| `alert-query.service.ts:587` | 查询统计追踪 | 监控查询性能、频率、热点数据 | 中 |
| `alert-cache.service.ts:640` | 缓存统计追踪 | 追踪缓存命中率、淘汰策略效果 | 中 |
| `alert-lifecycle.service.ts:565` | 生命周期统计 | 记录告警从创建到解决的完整时间线 | 中 |
| `rule.evaluator.ts:370-371` | 评估器统计 | 记录总评估次数和成功评估次数 | 中 |

**实现建议**:
```typescript
// 创建统一的统计服务
class AlertMetricsService {
  private metrics = {
    evaluations: { total: 0, success: 0, failed: 0 },
    events: { published: 0, failed: 0 },
    queries: { total: 0, avgTime: 0 },
    cache: { hits: 0, misses: 0 },
    lifecycle: { created: 0, resolved: 0, avgTime: 0 }
  };
}
```

---

### 2. 🗄️ 数据库方法实现（3处）
**目标**: 完善数据持久化层的高级查询功能

| 位置 | 功能描述 | 实现方案 | 优先级 |
|-----|---------|---------|--------|
| `alert-query.service.ts:413` | 按严重程度统计 | MongoDB聚合查询，按critical/warning/info分组 | 高 |
| `alert-query.service.ts:454` | 趋势分析查询 | 时间序列数据聚合，支持按小时/天/周分组 | 高 |
| `alert-query.service.ts:495` | 关键词搜索 | 实现全文搜索索引，支持message/description搜索 | 高 |

**实现示例**:
```typescript
// 按严重程度统计
async getAlertsBySeverity(startDate: Date, endDate: Date) {
  return await this.alertModel.aggregate([
    { $match: { createdAt: { $gte: startDate, $lte: endDate } } },
    { $group: { _id: "$severity", count: { $sum: 1 } } }
  ]);
}

// 趋势分析
async getAlertTrend(startDate: Date, endDate: Date, interval: string) {
  const dateFormat = interval === 'hour' ? '%Y-%m-%d %H:00' : '%Y-%m-%d';
  return await this.alertModel.aggregate([
    { $match: { createdAt: { $gte: startDate, $lte: endDate } } },
    { $group: {
        _id: { $dateToString: { format: dateFormat, date: "$createdAt" } },
        count: { $sum: 1 },
        resolved: { $sum: { $cond: ["$resolved", 1, 0] } }
    }},
    { $sort: { _id: 1 } }
  ]);
}

// 全文搜索
// 需要先创建索引: db.alerts.createIndex({ message: "text", description: "text" })
async searchAlerts(keyword: string) {
  return await this.alertModel.find({ $text: { $search: keyword } });
}
```

---

### 3. 🎯 评估准确率计算（1处）
**目标**: 建立告警质量评估体系

| 位置 | 功能描述 | 实现方案 | 优先级 |
|-----|---------|---------|--------|
| `rule.evaluator.ts:292` | 准确率和误报率计算 | 基于用户反馈计算，需要反馈机制 | 低 |

**实现方案**:
1. 添加用户反馈字段到AlertHistory schema
2. 实现反馈API端点
3. 计算公式：
   - 准确率 = (确认准确的告警数 / 总反馈数) × 100
   - 误报率 = (确认误报的告警数 / 总反馈数) × 100

```typescript
interface AlertFeedback {
  alertId: string;
  isAccurate: boolean;
  feedbackBy: string;
  feedbackAt: Date;
  comment?: string;
}

async calculateAccuracy(ruleId: string): Promise<{ accuracy: number; falsePositiveRate: number }> {
  const feedbacks = await this.feedbackModel.find({ ruleId });
  const accurate = feedbacks.filter(f => f.isAccurate).length;
  const total = feedbacks.length;
  
  return {
    accuracy: total > 0 ? (accurate / total) * 100 : 0,
    falsePositiveRate: total > 0 ? ((total - accurate) / total) * 100 : 0
  };
}
```

---

### 4. 🔧 其他功能完善（9处）

| 功能 | 位置 | 描述 | 优先级 |
|-----|------|------|--------|
| 告警确认机制 | `alert-orchestrator.service.ts:438` | 用户确认收到并处理告警 | 中 |
| 响应时间统计 | `alert-orchestrator.service.ts:446` | 从触发到响应的平均时间 | 中 |
| 事件到指标转换 | `alert-evaluation.service.ts:340` | 将系统事件转换为可评估指标 | 低 |
| 监控数据源集成 | `alert-evaluation.service.ts:349` | 从Prometheus等获取实时指标 | 低 |
| 活跃告警持久化 | `alert-cache.service.ts:594` | 启动时恢复未解决的告警 | 高 |

**告警确认机制实现**:
```typescript
interface AlertAcknowledgment {
  alertId: string;
  acknowledgedBy: string;
  acknowledgedAt: Date;
  note?: string;
}

async acknowledgeAlert(alertId: string, userId: string): Promise<void> {
  await this.alertModel.updateOne(
    { _id: alertId },
    { 
      $set: { 
        acknowledged: true,
        acknowledgedBy: userId,
        acknowledgedAt: new Date()
      }
    }
  );
}
```

---

## 📈 实施计划

### 第一阶段（1-2周）- 基础功能
- [ ] 实现数据库聚合查询方法
- [ ] 实现全文搜索功能
- [ ] 修复活跃告警持久化

### 第二阶段（2-3周）- 监控体系
- [ ] 建立统一的统计服务
- [ ] 实现各服务的统计追踪
- [ ] 添加Metrics导出接口

### 第三阶段（3-4周）- 用户体验
- [ ] 实现告警确认机制
- [ ] 添加用户反馈功能
- [ ] 计算准确率指标

### 第四阶段（可选）- 高级功能
- [ ] 集成外部监控数据源
- [ ] 实现机器学习优化
- [ ] 添加告警预测功能

---

## 🔍 注意事项

1. **NOTE注释保留**: 4处NOTE注释记录了功能迁移历史，应保留
2. **性能考虑**: 统计功能不应影响主流程性能
3. **向后兼容**: 新功能实现时保持API兼容性
4. **测试覆盖**: 每个TODO实现后需要添加对应的单元测试

---

## 📊 进度追踪

| 类别 | 总数 | 已完成 | 进度 |
|-----|------|--------|------|
| 统计追踪 | 6 | 0 | 0% |
| 数据库方法 | 3 | 0 | 0% |
| 准确率计算 | 1 | 0 | 0% |
| 其他功能 | 9 | 0 | 0% |
| **总计** | **19** | **0** | **0%** |

---

*最后更新时间: 2025-09-11*
*维护者: Alert模块团队*