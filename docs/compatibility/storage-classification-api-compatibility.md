# StorageClassification API 兼容策略

## 版本兼容性声明

### 当前版本 (v2.x)
- **统一路径**: `/src/core/shared/types/storage-classification.enum.ts`
- **范围**: Core组件内部共享，19个标准值
- **封装性**: 仅供Core内部7个组件使用，外部模块不可见
- **向后兼容**: 保持所有现有API响应格式不变

### 兼容性保证

#### 1. API响应格式
```json
{
  "storageClassification": "stock_quote",  // 保持原有字段名和值
  "metadata": {
    "classification": "stock_quote"        // 新增元数据字段
  }
}
```

#### 2. 枚举值映射
所有原有的11个枚举值继续支持：
- `stock_quote` ✅ 
- `stock_candle` ✅
- `stock_tick` ✅
- `financial_statement` ✅
- `stock_basic_info` ✅
- `market_news` ✅
- `trading_order` ✅
- `user_portfolio` ✅
- `general` ✅
- `index_quote` ✅
- `market_status` ✅

#### 3. 新增枚举值
新增8个枚举值，渐进式引入：
- `trading_days`
- `global_state`
- `crypto_quote`
- `crypto_basic_info`
- `stock_logo`
- `crypto_logo`
- `stock_news`
- `crypto_news`

#### 4. 废弃通知
以下不存在的枚举值已从文档中移除：
- ❌ `SYMBOL_MAPPING` (从未存在)
- ❌ `DATA_MAPPING` (从未存在)

### 迁移时间表

| 阶段 | 时间 | 操作 | 影响 |
|------|------|------|------|
| Phase 1 | 立即 | 统一导入路径 | 内部开发 |
| Phase 2 | 1个月内 | 更新客户端SDK | 外部集成 |
| Phase 3 | 3个月内 | 废弃旧路径 | 开发者警告 |
| Phase 4 | 6个月内 | 移除兼容别名 | 完全迁移 |

### 风险缓解

1. **零停机迁移**: 所有API保持正常服务
2. **渐进式切换**: 新功能优先使用新枚举，旧功能保持不变
3. **监控告警**: 监控旧路径的使用情况
4. **回滚机制**: 如有问题可快速回滚到备份版本

### 验证清单

- [ ] API响应格式保持一致
- [ ] Swagger文档更新完成
- [ ] 测试用例全部通过
- [ ] 性能基准测试通过
- [ ] 客户端兼容性验证
- [ ] 监控指标正常

---
*最后更新: 2025-09-01T15:27:36.362Z*
*负责人: 系统架构团队*
