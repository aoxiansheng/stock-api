# 数据源快速接入指南 - CLI工具方式

## 概述

使用CLI工具是接入新数据源的**推荐方式**，可以在5分钟内完成从零到可用的完整数据源接入。CLI工具会自动生成所有必需的代码结构、模板和文档。

## 🚀 5分钟完整接入流程

### 前提条件

```bash
# 确保在正确的目录
cd backend/

# 确保依赖已安装
bun install
```

### 步骤1: 生成数据源结构

```bash
# 基础生成（最简单）
bun run cli provider:generate my-provider

# 完整生成（推荐）
bun run cli provider:generate alpha-vantage \
  --capabilities="get-stock-quote,get-stock-basic-info,get-market-status" \
  --description="Alpha Vantage 股票数据API" \
  --with-tests \
  --with-docs
```

**生成的完整结构**：
```
src/providers/alpha-vantage/
├── index.ts                           # 主Provider类（装饰器版本）
├── module/
│   └── alpha-vantage.module.ts        # NestJS模块
├── capabilities/
│   ├── get-stock-quote.ts             # 股票报价能力（装饰器版本）
│   ├── get-stock-basic-info.ts        # 基本信息能力（装饰器版本）
│   └── get-market-status.ts           # 市场状态能力（装饰器版本）
├── types.ts                           # TypeScript类型定义
├── README.md                          # 自动生成的使用文档
└── tests/                             # 测试文件（可选）
    └── alpha-vantage.provider.spec.ts
```

### 步骤2: 验证生成结果

```bash
# 验证结构和代码
bun run cli provider:validate alpha-vantage

# 如果有问题，自动修复
bun run cli provider:validate alpha-vantage --auto-fix
```

**验证输出示例**：
```
🔍 开始验证提供商: alpha-vantage
📊 验证结果:
   - 发现能力: 3 个
   - 发现问题: 0 个

✅ 能力列表:
   - get-stock-quote
   - get-stock-basic-info  
   - get-market-status

✅ 验证通过，没有发现问题
```

### 步骤3: 注册到主模块

**这是唯一需要手动操作的步骤**，将生成的模块添加到系统中：

```typescript
// src/providers/module/providers.module.ts
import { AlphaVantageModule } from '../alpha-vantage/module/alpha-vantage.module';
import { AlphaVantageProvider } from '../alpha-vantage';

@Module({
  imports: [
    // ... 其他模块
    AlphaVantageModule, // 添加新模块
  ],
  // ...
})
export class ProvidersModule implements OnModuleInit {
  constructor(
    // ... 其他提供商
    private readonly alphaVantageProvider: AlphaVantageProvider, // 注入新提供商
  ) {}

  private async registerProviders(): Promise<void> {
    // ... 注册其他提供商
    this.capabilityRegistry.registerProvider(this.alphaVantageProvider); // 注册新提供商
  }
}
```

### 步骤4: 实现业务逻辑

编辑生成的能力文件，实现具体的API调用逻辑：

```typescript
// src/providers/alpha-vantage/capabilities/get-stock-quote.ts
@Capability({
  name: 'get-stock-quote',
  provider: 'alpha-vantage',
  description: '获取股票实时报价',
  markets: ['US', 'HK'],
  priority: 1
})
export class GetStockQuoteCapability implements ICapability {
  readonly name = 'get-stock-quote';
  readonly supportedMarkets = ['US', 'HK'];
  readonly supportedSymbolFormats = ['SYMBOL.MARKET'];

  async execute(request: DataRequest): Promise<DataResponse> {
    const { symbols } = request;
    
    try {
      // TODO: 替换为实际的Alpha Vantage API调用
      const quotes = await this.fetchFromAlphaVantage(symbols);
      
      return {
        success: true,
        data: this.transformToStandardFormat(quotes),
        timestamp: new Date()
      };
    } catch (error) {
      throw new Error(`Alpha Vantage获取报价失败: ${error.message}`);
    }
  }

  private async fetchFromAlphaVantage(symbols: string[]): Promise<any[]> {
    // 实现Alpha Vantage API调用
    // const apiKey = process.env.ALPHA_VANTAGE_API_KEY;
    // const response = await fetch(`https://www.alphavantage.co/query?...`);
    // return response.json();
    
    throw new Error('请实现Alpha Vantage API调用逻辑');
  }

  private transformToStandardFormat(rawData: any[]): any[] {
    // 转换为系统标准格式
    return rawData.map(item => ({
      // 实现数据格式转换
    }));
  }
}
```

### 步骤5: 测试验证

```bash
# 启动开发服务器
bun run dev

# 验证注册成功（查看启动日志）
# 应该看到类似信息：
# [EnhancedCapabilityRegistryService] 装饰器数据收集完成 { capabilities: 3, providers: 1 }
# [ProvidersModule] Provider实例注册成功: alpha-vantage
```

### 步骤6: API测试

```bash
# 检查能力是否注册成功
curl http://localhost:3000/api/v1/providers/capabilities | grep alpha-vantage

# 测试数据获取（需要先设置API Key认证）
curl -X POST http://localhost:3000/api/v1/receiver/data \
  -H "X-App-Key: YOUR_APP_KEY" \
  -H "X-Access-Token: YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "symbols": ["AAPL.US"],
    "receiverType": "get-stock-quote"
  }'
```

## 🛠️ CLI命令详解

### 生成命令选项

```bash
bun run cli provider:generate <name> [options]
```

**选项说明**：
- `--capabilities <list>` - 能力列表（逗号分隔），默认：`get-stock-quote`
- `--description <text>` - 提供商描述
- `--with-tests` - 生成测试文件，默认：`false`
- `--with-docs` - 生成文档文件，默认：`true`
- `--auto-fix` - 自动修复问题，默认：`true`

### 扫描命令详解

`providers:scan` 命令提供全局提供商分析功能：

```bash
bun run cli providers:scan [options]
```

**功能特点**：
- **全局扫描**: 自动发现所有providers目录下的提供商
- **约定验证**: 检查文件结构、命名约定、接口实现
- **问题诊断**: 识别缺失文件、错误配置、不规范代码
- **自动修复**: 可选的自动修复功能修复常见问题
- **详细报告**: 提供完整的扫描结果和建议

**选项说明**：
- `--validate` - 执行约定验证，默认：`true`
- `--auto-fix` - 自动修复发现的问题，默认：`false`

**使用场景**：
- 项目维护时检查所有提供商状态
- 新团队成员了解现有提供商结构
- 大规模重构前的健康检查
- CI/CD流程中的质量门禁

**常用组合**：
```bash
# 最简单（仅生成基础结构）
bun run cli provider:generate my-provider

# 标准生成（包含文档）
bun run cli provider:generate my-provider \
  --description="我的数据源"

# 完整生成（包含测试和文档）
bun run cli provider:generate my-provider \
  --capabilities="get-stock-quote,get-stock-basic-info" \
  --description="我的数据源" \
  --with-tests \
  --with-docs

# 期货数据源示例
bun run cli provider:generate futures-data \
  --capabilities="get-futures-quote,get-futures-basic-info" \
  --description="期货数据源"
```

### 验证和修复命令

```bash
# 验证提供商结构
bun run cli provider:validate <name>

# 验证并自动修复
bun run cli provider:validate <name> --auto-fix --verbose

# 修复特定提供商
bun run cli provider:fix <name>
```

### 管理和扫描命令

```bash
# 列出所有已注册的提供商
bun run cli providers:list

# 列出所有提供商的详细信息
bun run cli providers:list --detailed

# 扫描并分析所有提供商
bun run cli providers:scan

# 扫描并自动修复发现的问题
bun run cli providers:scan --auto-fix

# 单独为提供商生成新能力
bun run cli capability:generate <provider> <capability> \
  --description="能力描述" \
  --markets="US,HK" \
  --priority=1
```

## 🎯 生成的代码特点

### 1. 使用现代装饰器API

生成的代码使用装饰器而不是传统的文件导出方式：

```typescript
// ✅ 生成的现代化代码
@Provider({
  name: 'alpha-vantage',
  description: 'Alpha Vantage 股票数据API',
  autoRegister: true
})
@Injectable()
export class AlphaVantageProvider implements IDataProvider {
  // ...
}

@Capability({
  name: 'get-stock-quote',
  provider: 'alpha-vantage',
  markets: ['US', 'HK']
})
export class GetStockQuoteCapability implements ICapability {
  // ...
}
```

### 2. 完整的TypeScript类型支持

```typescript
// types.ts - 自动生成的类型定义
export interface AlphaVantageConfig {
  apiKey?: string;
  apiSecret?: string;
  baseUrl?: string;
  timeout?: number;
}

export interface AlphaVantageResponse {
  success: boolean;
  data?: any;
  error?: string;
}
```

### 3. 标准化的错误处理

```typescript
// 生成的代码包含标准错误处理模式
async execute(request: DataRequest): Promise<DataResponse> {
  try {
    // 输入验证
    this.validateRequest(request);
    
    // API调用
    const rawData = await this.callExternalAPI(request.symbols);
    
    // 数据转换
    const standardData = this.transformToStandardFormat(rawData);
    
    return {
      success: true,
      data: standardData,
      timestamp: new Date()
    };
  } catch (error) {
    throw new Error(`${this.name} 执行失败: ${error.message}`);
  }
}
```

## 🚨 常见问题解决

### 1. CLI命令不存在

```bash
# 错误信息
command not found: bun run cli

# 解决方案
# 确保在backend目录下
cd backend/
# 或者直接执行
node src/providers/cli/index.js provider:generate my-provider
```

### 2. 生成后验证失败

```bash
# 运行自动修复
bun run cli provider:validate my-provider --auto-fix

# 如果仍有问题，查看具体错误信息
bun run cli provider:validate my-provider --verbose
```

### 3. 提供商名称格式错误

```bash
# ❌ 错误格式
bun run cli provider:generate MyProvider        # PascalCase
bun run cli provider:generate my_provider       # snake_case

# ✅ 正确格式  
bun run cli provider:generate my-provider       # kebab-case
bun run cli provider:generate alpha-vantage     # kebab-case
```

### 4. 模块注册后无法找到Provider实例

确保在`ProvidersModule`中正确注入和注册：

```typescript
// 必须同时完成：导入模块 + 注入实例 + 注册实例
@Module({
  imports: [MyProviderModule],  // 1. 导入模块
})
export class ProvidersModule {
  constructor(
    private readonly myProvider: MyProviderProvider,  // 2. 注入实例
  ) {}

  private async registerProviders(): Promise<void> {
    this.capabilityRegistry.registerProvider(this.myProvider);  // 3. 注册实例
  }
}
```

## 🎉 接入完成检查清单

完成CLI工具接入后，请检查以下项目：

- [ ] **文件结构完整**: 所有必需文件都已生成
- [ ] **验证通过**: `bun run cli provider:validate <name>` 无错误
- [ ] **模块已注册**: 添加到`ProvidersModule`的imports和constructor中
- [ ] **Provider实例已注册**: 在`registerProviders()`方法中调用
- [ ] **业务逻辑已实现**: 替换TODO注释为实际的API调用代码
- [ ] **测试通过**: 启动服务器后能在日志中看到注册成功信息
- [ ] **API可用**: 能通过Receiver接口调用新的数据源能力

## 📚 下一步

1. **配置API凭证**: 设置环境变量或配置文件
2. **实现业务逻辑**: 根据具体的数据源API实现获取逻辑
3. **编写测试**: 为能力实现编写单元测试和集成测试
4. **性能优化**: 根据需要添加缓存、重试等机制
5. **生产部署**: 配置生产环境的API凭证和监控

---

*CLI工具方式是推荐的接入方法，可以确保代码结构标准化，减少手动配置错误，提高开发效率。*