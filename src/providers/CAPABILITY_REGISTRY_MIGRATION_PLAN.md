# Capability Registry 迁移计划

## 📋 问题概述

当前系统中同时存在两套能力注册表服务：
- `CapabilityRegistryService` (旧版本, 470行)
- `EnhancedCapabilityRegistryService` (新版本, 597行)

通过别名配置保持向后兼容，但导致系统复杂度增加。本计划旨在完全移除旧注册表，统一使用新的增强版本。

## 🎯 迁移目标

1. **完全移除** `CapabilityRegistryService` (旧版本)
2. **统一使用** `EnhancedCapabilityRegistryService` (保持现有名称)
3. **更新所有引用** 直接使用新服务，移除别名配置
4. **清理兼容层代码** 和别名依赖
5. **保持系统功能完整性**

## 📊 影响分析

### 当前依赖关系
```typescript
// 当前的兼容层配置 (providers-sg.module.ts)
{
  provide: CapabilityRegistryService,
  useExisting: EnhancedCapabilityRegistryService,
}
```

### 需要更新的文件类型
- ✅ 模块配置文件
- ✅ 服务依赖注入
- ✅ 类型导入语句
- ✅ 测试文件
- ✅ 文档引用

## 🗺️ 迁移路线图

### 阶段 1: 准备阶段 (Pre-Migration)
**时间估计**: 1-2 小时

#### 1.1 代码审查和依赖映射
```bash
# 搜索所有对旧注册表的引用
grep -r "CapabilityRegistryService" src/ --exclude-dir=node_modules
grep -r "capability-registry.service" src/ --exclude-dir=node_modules
```

#### 1.2 创建迁移检查清单
- [ ] 识别所有直接导入 `CapabilityRegistryService` 的文件
- [ ] 识别所有类型引用
- [ ] 检查测试文件中的使用
- [ ] 验证是否有外部模块依赖

### 阶段 2: 核心迁移 (Core Migration)
**时间估计**: 2-3 小时

#### 2.1 删除旧的注册表服务
```bash
# 备份后删除旧文件
cp src/providers/services/capability-registry.service.ts \
   src/providers/services/capability-registry.service.ts.backup
rm src/providers/services/capability-registry.service.ts
```

#### 2.2 保持新服务不变
```typescript
// 保持 EnhancedCapabilityRegistryService 文件和类名不变
// 文件: src/providers/services/enhanced-capability-registry.service.ts
// 类名: EnhancedCapabilityRegistryService

// 只需要清理内部的兼容层逻辑，不需要重命名
```

#### 2.3 更新模块配置
```typescript
// 文件: src/providers/module/providers-sg.module.ts

// 删除兼容层配置，直接使用 EnhancedCapabilityRegistryService
// FROM:
providers: [
  EnhancedCapabilityRegistryService,
  {
    provide: CapabilityRegistryService,
    useExisting: EnhancedCapabilityRegistryService,
  },
  {
    provide: "ENHANCED_CAPABILITY_REGISTRY",
    useExisting: EnhancedCapabilityRegistryService,
  },
  {
    provide: "ENHANCED_CAPABILITY_REGISTRY_SERVICE",
    useExisting: EnhancedCapabilityRegistryService,
  },
],

// TO:
providers: [
  EnhancedCapabilityRegistryService,
],

// 更新导出
exports: [
  EnhancedCapabilityRegistryService,
],
```

### 阶段 3: 依赖更新 (Dependency Updates)
**时间估计**: 1-2 小时

#### 3.1 更新所有使用旧服务的地方
```typescript
// 在所有使用 CapabilityRegistryService 的地方改为使用 EnhancedCapabilityRegistryService

// FROM (需要查找和替换):
import { CapabilityRegistryService } from '../services/capability-registry.service';

// TO:
import { EnhancedCapabilityRegistryService } from '../services/enhanced-capability-registry.service';
```

#### 3.2 更新构造函数注入
```typescript
// 示例：在使用服务的类中
// FROM:
constructor(
  private readonly capabilityRegistry: CapabilityRegistryService,
) {}

// TO:
constructor(
  private readonly capabilityRegistry: EnhancedCapabilityRegistryService,
) {}
```

### 阶段 4: 清理和优化 (Cleanup & Optimization)
**时间估计**: 1 小时

#### 4.1 清理 EnhancedCapabilityRegistryService 内部的兼容层代码
```typescript
// 在 enhanced-capability-registry.service.ts 中可以选择性保留兼容层方法
// 如 populateLegacyStructures(), createLegacyCapability() 等
// 这些方法可能对外部系统仍有价值，可根据实际需要决定是否移除
```

#### 4.2 移除旧服务的所有痕迹
```bash
# 确保没有遗漏的引用
grep -r "CapabilityRegistryService" src/ --exclude-dir=node_modules
# 应该只显示现在改为使用 EnhancedCapabilityRegistryService 的地方

# 删除备份文件
rm src/providers/services/capability-registry.service.ts.backup
```

## 🔧 具体实施步骤

### Step 1: 备份和准备
```bash
# 1. 创建分支
git checkout -b refactor/remove-duplicate-capability-registry

# 2. 备份关键文件
cp src/providers/services/capability-registry.service.ts \
   src/providers/services/capability-registry.service.ts.old
cp src/providers/services/enhanced-capability-registry.service.ts \
   src/providers/services/enhanced-capability-registry.service.ts.backup
```

### Step 2: 执行核心替换
```bash
# 1. 删除旧的注册表服务
rm src/providers/services/capability-registry.service.ts

# 2. 保持 EnhancedCapabilityRegistryService 文件不变
# (不需要重命名，直接使用现有的增强版服务)
```

### Step 3: 更新文件内容
需要编辑的文件清单：

#### 3.1 主服务文件
- ✅ `src/providers/services/enhanced-capability-registry.service.ts`
  - 保持类名不变: `EnhancedCapabilityRegistryService`
  - 可选择性清理内部兼容层逻辑
  - 保持文件名和核心功能不变

#### 3.2 模块配置文件  
- ✅ `src/providers/module/providers-sg.module.ts`
  - 移除兼容层配置
  - 更新导入语句
  - 简化 providers 数组
  - 更新 exports 数组

#### 3.3 其他相关文件
搜索并更新所有对旧服务的引用：
```bash
# 查找需要更新的文件 - 查找所有使用旧服务的地方
find src/ -name "*.ts" -exec grep -l "CapabilityRegistryService" {} \; | grep -v enhanced
# 这些文件需要将 CapabilityRegistryService 替换为 EnhancedCapabilityRegistryService
```

### Step 4: 更新导入和注入
```typescript
// 模板替换模式
// 在所有文件中执行以下替换：

// 1. 导入语句 - 将旧服务导入替换为新服务
- import { CapabilityRegistryService } from '../services/capability-registry.service';
+ import { EnhancedCapabilityRegistryService } from '../services/enhanced-capability-registry.service';

// 2. 类型引用 - 更新依赖注入的类型
- private readonly capabilityRegistry: CapabilityRegistryService,
+ private readonly capabilityRegistry: EnhancedCapabilityRegistryService,

// 3. 变量名可以保持不变，只需要更新类型
// this.capabilityRegistry.method() // 调用方式不变
```

### Step 5: 测试文件更新
```bash
# 查找测试文件中使用旧服务的地方
find test/ -name "*.spec.ts" -exec grep -l "CapabilityRegistryService" {} \; | grep -v enhanced

# 更新测试文件中的导入和模拟，改为使用 EnhancedCapabilityRegistryService
```
### Step 6: 移除备份的文件

## ✅ 验证清单

### 编译验证
- [ ] TypeScript 编译无错误: `npm run build`
- [ ] ESLint 检查通过: `npm run lint`
- [ ] 类型检查通过: `npm run typecheck`

### 功能验证
- [ ] 服务正常启动
- [ ] Provider 注册功能正常
- [ ] 能力发现功能正常
- [ ] 装饰器系统工作正常
- [ ] 缓存功能正常

### 测试验证
```bash
# 运行相关测试
npm run test:unit:providers
npm run test:integration:providers
```

### API验证
- [ ] Provider API 端点正常响应
- [ ] 能力查询接口正常
- [ ] 注册统计信息正确

## 🚨 风险评估与回滚计划

### 潜在风险
1. **编译错误**: TypeScript 类型不匹配
2. **运行时错误**: 服务依赖注入失败  
3. **功能缺失**: 某些旧功能未在新服务中实现
4. **测试失败**: 测试用例依赖旧服务

### 回滚计划
```bash
# 快速回滚脚本
#!/bin/bash
echo "执行快速回滚..."

# 1. 切换回原分支
git checkout main

# 2. 或恢复备份文件
cp src/providers/services/capability-registry.service.ts.old \
   src/providers/services/capability-registry.service.ts
cp src/providers/services/enhanced-capability-registry.service.ts.backup \
   src/providers/services/enhanced-capability-registry.service.ts

# 3. 重启服务验证
npm run build && npm run start:dev

echo "回滚完成"
```

## 📝 迁移后清理

### 删除不需要的文件
```bash
# 删除备份文件
rm -f src/providers/services/*.backup
rm -f src/providers/services/*.old

# 清理临时文件
find src/ -name "*.bak" -delete
```

### 更新文档
- [ ] 更新 API 文档
- [ ] 更新架构图
- [ ] 更新开发者指南
- [ ] 更新 CLAUDE.md 文件

## 📈 预期收益

### 代码简化
- 移除 597 行兼容层代码
- 减少 4 个冗余的 Provider 配置
- 简化依赖注入逻辑

### 维护性提升
- 统一的服务接口
- 更清晰的代码结构
- 减少认知负担

### 性能优化
- 减少内存占用
- 降低初始化开销
- 简化调用链路

## ⏱️ 时间计划

| 阶段 | 任务 | 预计时间 | 责任人 |
|------|------|----------|---------|
| 1 | 代码审查和依赖映射 | 1-2h | 开发者 |
| 2 | 核心文件迁移 | 2-3h | 开发者 |  
| 3 | 依赖关系更新 | 1-2h | 开发者 |
| 4 | 测试和验证 | 1-2h | 开发者 + QA |
| 5 | 文档更新 | 0.5-1h | 开发者 |

**总预计时间**: 5.5-9 小时

## 🔍 注意事项

1. **渐进式迁移**: 可以先在开发环境完成迁移，验证无误后再应用到生产环境
2. **版本控制**: 每个阶段都应该有对应的 commit，便于问题追踪
3. **向后兼容**: 确保外部 API 接口保持不变
4. **监控告警**: 迁移后密切关注系统运行状况

---

**制定时间**: 2025-09-12  
**预计完成**: 迁移启动后 1-2 个工作日  
**风险等级**: 中等  
**回滚时间**: < 30 分钟