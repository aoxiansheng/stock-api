# 测试目录结构规范化工具

这个目录包含了用于规范化测试目录结构的工具脚本，帮助确保测试文件与源代码文件的一一对应关系。

## 工具概述

### 1. test-structure-validator.ts
**测试目录结构验证器** - 用于检测和修复测试目录与源码目录的结构差异

### 2. naming-validator.ts  
**测试文件命名规范验证器** - 用于验证测试文件命名是否符合项目规范

## 使用方法

### 快速开始

```bash
# 1. 检测测试目录结构问题
npx ts-node test/utils/test-structure-validator.ts

# 2. 检测测试文件命名问题  
npx ts-node test/utils/naming-validator.ts

# 3. 执行结构修复 (谨慎使用)
npx ts-node test/utils/test-structure-validator.ts --execute

# 4. 生成重命名脚本
npx ts-node test/utils/naming-validator.ts --generate-script
```

### test-structure-validator.ts 详细用法

这个工具会分析以下四个测试目录与 src 目录的结构差异：
- `test/jest/unit/` - 单元测试
- `test/jest/integration/` - 集成测试  
- `test/jest/e2e/` - 端到端测试
- `test/jest/security/` - 安全测试

**功能特性：**
- 🔍 检测缺失的测试目录
- 📝 为缺失的源文件创建空白测试文件模板
- 🔄 检测命名不规范的测试文件并建议重命名
- 📋 生成详细的迁移计划报告

**参数选项：**
```bash
# 仅分析，不执行任何更改（默认）
npx ts-node test/utils/test-structure-validator.ts

# 预览模式（显示将要执行的操作）
npx ts-node test/utils/test-structure-validator.ts --dry-run

# 执行迁移计划（实际创建目录和文件）
npx ts-node test/utils/test-structure-validator.ts --execute
```

**输出示例：**
```
📋 测试目录结构分析报告
==================================================

🏗️  需要创建的目录:
   📁 test/jest/unit/core/stream
   📁 test/jest/e2e/providers/longport-sg

📝 需要创建的测试文件:
   📄 test/jest/unit/core/stream/stream-data-fetcher.service.spec.ts (unit for core/stream/stream-data-fetcher.service.ts)
   📄 test/jest/integration/providers/longport-sg/longport-sg.provider.integration.test.ts

🔄 需要重命名/移动的文件:
   ➡️  test/jest/unit/cache/cache.service.spec.tst → test/jest/unit/cache/cache.service.spec.ts
      原因: 文件名不符合 unit 测试命名规范

📊 统计信息:
   - 需要创建目录: 2
   - 需要创建测试文件: 45
   - 需要重命名文件: 1
   - 结构不匹配项: 0
```

### naming-validator.ts 详细用法

这个工具专门用于验证测试文件的命名规范，确保文件名符合项目约定。

**命名规范：**
- **单元测试**: `*.spec.ts`
- **集成测试**: `*.integration.test.ts`
- **E2E测试**: `*.e2e.test.ts`
- **安全测试**: `*.security.test.ts`
- **性能测试**: `*.perf.test.ts`

**参数选项：**
```bash
# 验证命名规范（默认）
npx ts-node test/utils/naming-validator.ts

# 生成重命名脚本
npx ts-node test/utils/naming-validator.ts --generate-script
```

**输出示例：**
```
📋 测试文件命名规范验证报告
==================================================

📊 总体统计:
   总测试文件数: 156
   命名规范文件: 151
   命名不规范文件: 5
   合规率: 96.8%

📁 按测试类型分析:

   UNIT:
     文件总数: 120
     命名正确: 118
     命名错误: 2
     合规率: 98.3%
     缺失对应源文件: 3

❌ 命名不规范的文件:
   unit/cache/cache.service.spec.tst
     建议: cache.service.spec.ts
   integration/providers/test-provider.test.ts
     建议: test-provider.integration.test.ts

💡 改进建议:
🎯 测试目录结构优化建议:

📝 文件命名规范化 (5 个文件需要重命名):
   unit: 2 个文件
     • cache.service.spec.tst → cache.service.spec.ts
     • auth.unit.test.ts → auth.spec.ts
   integration: 3 个文件
     • provider.test.ts → provider.integration.test.ts

📊 当前合规率: 96.8%
   建议: 接近完全合规，建议处理剩余的命名问题

🚀 执行建议:
   1. 运行 test-structure-validator.ts 来生成完整的迁移计划
   2. 使用 --execute 参数执行自动化重命名
   3. 手动检查生成的测试文件模板
   4. 运行测试确保迁移成功
```

## 测试文件模板

工具会根据测试类型自动生成相应的测试文件模板：

### 单元测试模板 (.spec.ts)
```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { ServiceName } from '../../../src/path/to/service';

describe('ServiceName', () => {
  let serviceName: ServiceName;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ServiceName],
    }).compile();

    serviceName = module.get<ServiceName>(ServiceName);
  });

  it('should be defined', () => {
    expect(serviceName).toBeDefined();
  });
});
```

### 集成测试模板 (.integration.test.ts)
```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { ServiceName } from '../../../src/path/to/service';

describe('ServiceName Integration', () => {
  let serviceName: ServiceName;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ServiceName],
    }).compile();

    serviceName = module.get<ServiceName>(ServiceName);
  });

  it('should be defined', () => {
    expect(serviceName).toBeDefined();
  });
});
```

### E2E测试模板 (.e2e.test.ts)
```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../../src/app.module';

describe('ServiceName E2E', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('should be defined', () => {
    expect(app).toBeDefined();
  });
});
```

## 最佳实践

### 使用流程建议

1. **分析阶段**
   ```bash
   # 先了解当前状况
   npx ts-node test/utils/naming-validator.ts
   npx ts-node test/utils/test-structure-validator.ts
   ```

2. **规划阶段**
   ```bash
   # 生成重命名脚本（可选）
   npx ts-node test/utils/naming-validator.ts --generate-script
   ```

3. **执行阶段**
   ```bash
   # 备份测试文件
   cp -r test/ test-backup/
   
   # 执行结构修复
   npx ts-node test/utils/test-structure-validator.ts --execute
   
   # 检查重命名脚本并执行
   chmod +x test/utils/rename-test-files.sh
   ./test/utils/rename-test-files.sh
   ```

4. **验证阶段**
   ```bash
   # 运行测试确保没有破坏
   bun run test:unit
   bun run test:integration
   
   # 再次检查规范性
   npx ts-node test/utils/naming-validator.ts
   ```

### 注意事项

⚠️ **重要提醒：**
- 执行任何修改操作前，请备份测试文件
- 生成的测试文件模板需要手动完善具体的测试逻辑
- 重命名操作可能影响现有的测试配置，请检查Jest配置文件
- 建议在非生产分支上进行测试结构调整

🎯 **项目特定规则：**
- 本项目使用7组件核心架构，测试结构应该与之对应
- 遵循项目的命名约定：kebab-case用于文件名
- 确保每个核心组件都有对应的单元测试和集成测试
- WebSocket和流数据相关的功能需要特殊的E2E测试

## 故障排除

### 常见问题

**问题1: 脚本运行权限不足**
```bash
chmod +x test/utils/test-structure-validator.ts
chmod +x test/utils/naming-validator.ts
```

**问题2: TypeScript编译错误**
```bash
# 确保已安装依赖
bun install
# 或使用npx运行
npx ts-node test/utils/test-structure-validator.ts
```

**问题3: 生成的测试文件导入路径错误**
- 手动检查并修正生成测试文件中的导入路径
- 确保相对路径正确指向源文件

**问题4: 目录结构复杂时工具运行缓慢**
- 使用`--dry-run`先预览结果
- 考虑分批处理大型项目

## 相关文档

- [项目测试策略](../README.md)
- [Jest配置说明](../config/README.md)
- [NestJS测试最佳实践](../../docs/testing-guide.md)

## 贡献指南

如果发现工具bug或有改进建议：
1. 检查现有的issue
2. 提交详细的bug报告或功能请求
3. 欢迎提交PR改进工具功能