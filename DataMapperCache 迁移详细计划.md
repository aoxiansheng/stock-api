# DataMapperCache 迁移详细计划

## 📋 迁移影响评估清单

### 🎯 核心业务组件 (高优先级)

#### 1. **FlexibleMappingRuleService** - 核心业务服务
- **文件**: `src/core/00-prepare/data-mapper/services/flexible-mapping-rule.service.ts`
- **依赖方式**: 构造函数注入 `DataMapperCacheService`
- **使用场景**: 13个方法调用，包括：
  - `cacheRuleById()` - 缓存规则
  - `getCachedRuleById()` - 获取缓存规则
  - `getCachedBestMatchingRule()` - 获取最佳匹配规则
  - `cacheBestMatchingRule()` - 缓存最佳匹配规则
  - `invalidateRuleCache()` - 失效缓存
  - `warmupCache()` - 预热缓存
- **业务影响**: 🟡 **中** - 映射规则的核心缓存功能

#### 2. **DataMapperModule** - 模块注册
- **文件**: `src/core/00-prepare/data-mapper/module/data-mapper.module.ts`
- **依赖方式**: 直接导入和导出 `DataMapperCacheService`
- **业务影响**: 🟡 **中** - 影响整个 data-mapper 模块的依赖注入

### 🧪 测试组件 (中优先级)

#### 3. **单元测试文件**
- `test/jest/unit/core/data-mapper-cache.optimization.spec.ts`
- `test/performance/data-mapper-cache-performance.spec.ts`
- `test/jest/integration/data-mapper-cache-migration.spec.ts`
- **业务影响**: 🟡 **中** - 需要更新测试以验证新服务

### 🏗️ 模块配置 (低优先级)

#### 4. **DataMapperCacheModule** - 缓存模块配置
- **文件**: `src/core/05-caching/module/data-mapper-cache/module/data-mapper-cache.module.ts`
- **当前状态**: 双服务并存
- **业务影响**: 🟢 **低** - 清理后需要更新导出配置

---

## 📅 简化迁移计划

### 🔄 **Phase 1: 直接服务替换** (1周)

#### Day 1-2: 环境准备
- [ ] 创建迁移分支: `feature/data-mapper-cache-migration`
- [ ] 确认开发和测试环境可用

#### Day 3-5: 核心迁移
- [ ] 更新 `FlexibleMappingRuleService` 构造函数依赖注入
- [ ] 更新所有13处方法调用
- [ ] 更新 `DataMapperModule` 配置
- [ ] 运行单元测试验证

#### Day 6-7: 验证和测试
- [ ] 集成测试验证
- [ ] 性能基准测试
- [ ] 功能完整性验证

---

### 🧪 **Phase 2: 优化调整** (1周)

#### Day 1-3: 性能优化
- [ ] 根据使用情况调整缓存TTL配置
- [ ] 优化批量操作性能
- [ ] 完善错误处理机制

#### Day 4-5: 测试和文档
- [ ] 更新测试文件
- [ ] 性能对比分析
- [ ] 更新API文档

#### Day 6-7: 最终验证
- [ ] 完整构建测试
- [ ] 部署验证
- [ ] 监控配置

---

### 🗑️ **Phase 3: 清理工作** (3天)

#### Day 1: 代码清理
- [ ] 移除 `DataMapperCacheService` 文件
- [ ] 清理模块配置
- [ ] 移除不必要的依赖

#### Day 2-3: 最终验证
- [ ] 确认所有测试通过
- [ ] 代码审查
- [ ] 文档更新

---

## 🛡️ 迁移验证策略

### 🔍 **验证检查点**

#### **Phase 1 验证**
- [ ] ✅ 所有缓存操作功能正常
- [ ] ✅ 单元测试 100% 通过
- [ ] ✅ 集成测试无失败
- [ ] ✅ 核心业务功能验证

#### **Phase 2 验证**
- [ ] ✅ 性能指标在合理范围内
- [ ] ✅ 错误处理机制正常
- [ ] ✅ 缓存命中率正常

#### **Phase 3 验证**
- [ ] ✅ 代码编译无错误
- [ ] ✅ 依赖关系正确
- [ ] ✅ 部署环境就绪

### 🔄 **回滚策略**

#### **快速回滚点**
1. **Phase 1 后**: 恢复 `FlexibleMappingRuleService` 构造函数
2. **Phase 2 后**: 恢复模块配置
3. **Phase 3 后**: 恢复完整配置

#### **回滚触发条件**
- 🚨 核心功能异常
- 🚨 测试失败率 > 5%
- 🚨 性能显著下降

#### **回滚脚本**
```bash
# 快速回滚命令
git checkout main
git revert <migration-commit-hash>
npm run test:all
npm run build
```

---

## 📊 **进度跟踪**

### **里程碑检查**
- [ ] **Week 1**: Phase 1 完成，核心迁移完成
- [ ] **Week 2**: Phase 2 完成，优化调整完成
- [ ] **Week 3**: Phase 3 完成，清理工作完成

### **质量把控**
- 每日代码编译验证
- 每日测试通过率检查
- 每阶段性能基准对比

---

## 🎯 **总结和建议**

### **迁移优先级**
1. 🟡 **中优先级**: `FlexibleMappingRuleService` - 核心业务功能
2. 🟡 **中优先级**: `DataMapperModule` 配置更新
3. 🟢 **低优先级**: 测试文件和文档更新

### **关键成功因素**
- ✅ **功能验证**: 确保所有方法正确工作
- ✅ **性能测试**: 验证新服务性能满足要求
- ✅ **完整测试**: 单元测试和集成测试覆盖

### **预计时间线**
- **总计**: 2-3 周
- **关键路径**: 服务替换和功能验证
- **主要工作**: 依赖注入更新和测试验证

### **建议下一步行动**
1. 🟢 **立即开始**: 创建迁移分支
2. 优先完成核心服务替换
3. 重点关注功能验证和性能测试

---

## 📋 **详细任务检查清单**

### **Phase 1 任务清单**
- [ ] 更新 `FlexibleMappingRuleService` 构造函数依赖注入
- [ ] 更新所有13处方法调用
- [ ] 更新导入语句
- [ ] 更新 `DataMapperModule` 提供者配置
- [ ] 运行单元测试验证
- [ ] 验证模块注册正确

### **Phase 2 任务清单**
- [ ] 性能基准测试
- [ ] 缓存TTL优化
- [ ] 错误处理完善
- [ ] 更新测试文件
- [ ] 压力测试验证

### **Phase 3 任务清单**
- [ ] 移除旧服务文件
- [ ] 清理模块配置
- [ ] 更新文档
- [ ] 最终构建测试
- [ ] 部署验证

---

## 🔧 **技术实现细节**

### **依赖注入更新**

```typescript
// 更新前
constructor(private readonly mappingRuleCacheService: DataMapperCacheService)

// 更新后
constructor(private readonly mappingRuleCacheService: DataMapperCacheStandardizedService)
```

### **模块配置更新**

```typescript
// 最终配置
providers: [
  DataMapperCacheStandardizedService,
  {
    provide: 'DataMapperCache',
    useExisting: DataMapperCacheStandardizedService
  }
],
exports: [
  'DataMapperCache'
],
```

### **测试文件更新**

```typescript
// 测试提供者更新
providers: [
  { provide: DataMapperCacheStandardizedService, useValue: mockCacheService }
]
```

## ✅ **迁移可行性**

基于代码分析，DataMapperCacheStandardizedService已经实现了所有必要的接口方法，功能完整，可以直接进行迁移。新服务架构更加标准化，适合长期维护和扩展。