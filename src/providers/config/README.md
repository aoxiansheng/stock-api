# 提供商扫描统一配置

## 🎯 设计原则

**一地配置，多处使用** - 避免配置分散导致的维护问题

## 📁 文件结构

```
src/providers/config/
├── provider-scan.config.ts    # 统一扫描配置
└── README.md                   # 本文档
```

## 🔧 配置使用

### 统一配置的消费者

1. **CapabilityRegistryService** - 主要能力注册服务
2. **ConventionScanner** - 约定扫描器
3. **EnhancedCapabilityRegistryService** - 增强能力注册服务

### 配置项说明

```typescript
// 排除的系统目录
excludedDirs: [
  'node_modules',  // npm包目录
  'interfaces',    // 接口定义目录
  'services',      // 服务目录
  'controller',    // 控制器目录
  'module',        // 模块目录
  'utils',         // 工具函数目录
  'decorators',    // 装饰器目录
  'cli',           // CLI工具目录
  'config'         // 配置目录
]
```

## 🚀 使用示例

```typescript
import { getProviderScanConfig, shouldExcludeDirectory } from '../config/provider-scan.config';

// 获取配置
const config = getProviderScanConfig();

// 检查是否排除目录
if (shouldExcludeDirectory(dirName)) {
  // 跳过此目录
}
```

## 🌍 环境变量支持

```bash
# 添加额外的排除目录
PROVIDER_SCAN_EXCLUDE_DIRS=temp,backup,deprecated

# 禁用约定验证
PROVIDER_SCAN_DISABLE_CONVENTIONS=true
```

## ⚠️ 重要注意事项

1. **修改配置后需要重启应用** - 配置在应用启动时加载
2. **测试覆盖** - 修改配置后需要运行相关测试
3. **向后兼容** - 新增排除目录不会影响现有提供商

## 🔄 迁移说明

### 从分散配置迁移到统一配置

**之前 (❌ 错误方式)**:
```typescript
// CapabilityRegistryService
const excludedDirs = ['node_modules', 'interfaces', ...];

// ConventionScanner  
const excludeDirs = ['node_modules', 'interfaces', ...];
```

**现在 (✅ 正确方式)**:
```typescript
// 统一配置
import { getProviderScanConfig } from '../config/provider-scan.config';
const config = getProviderScanConfig();
```

## 📊 受益

1. **维护性** - 单一配置点，易于维护
2. **一致性** - 所有扫描器使用相同配置
3. **可测试性** - 配置可以独立测试
4. **灵活性** - 支持环境变量覆盖