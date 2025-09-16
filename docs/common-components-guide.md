# NestJS 通用组件库使用指南

## 概述

本文档详细介绍了位于 `src/common` 目录下的 NestJS 可复用通用组件。这些组件遵循企业级开发标准，提供完整的功能集合，包括响应拦截器、异常过滤器、验证器、工具类等。

## 目录结构

```
src/common/
├── core/                        # 核心组件
│   ├── filters/                # 异常过滤器
│   ├── interceptors/           # 拦截器
│   └── decorators/             # 装饰器
├── modules/                     # 功能模块
│   ├── pagination/             # 分页模块
│   ├── permission/             # 权限验证模块
│   └── logging/                # 日志模块
├── dto/                        # 数据传输对象
├── validators/                 # 验证器
├── utils/                      # 工具类
├── constants/                  # 常量系统（四层架构）
├── types/                      # 类型定义
└── interfaces/                 # 接口定义
```

---

## 🔧 核心组件 (Core Components)

### 1. 响应拦截器 (ResponseInterceptor)

**位置**: `src/common/core/interceptors/response.interceptor.ts`

**功能**: 统一 API 响应格式，提供标准化的响应结构和性能监控

#### 功能特性
- 🎯 标准化响应格式
- 📊 性能监控和指标收集
- 🔒 敏感URL参数清理
- ⚡ 事件驱动的异步性能收集
- 🛡️ 安全性增强

#### 使用方法

```typescript
// 1. 全局注册（推荐）
import { ResponseInterceptor } from '@common/core/interceptors';

@Module({
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: ResponseInterceptor,
    },
  ],
})
export class AppModule {}

// 2. 控制器级别使用
@UseInterceptors(ResponseInterceptor)
@Controller('users')
export class UsersController {}
```

#### 响应格式

```json
{
  "statusCode": 200,
  "message": "操作成功",
  "data": { /* 实际数据 */ },
  "timestamp": "2025-01-15T10:30:00.000Z"
}
```

#### 性能监控
- 自动收集请求响应时间
- 发送性能指标到事件系统
- 支持错误率统计
- 安全URL清理防止敏感信息泄露

### 2. 请求追踪拦截器 (RequestTrackingInterceptor)

**位置**: `src/common/core/interceptors/request-tracking.interceptor.ts`

**功能**: 为每个请求生成唯一标识符，支持分布式追踪

#### 功能特性
- 🔍 生成唯一请求ID
- 🔗 支持关联ID (Correlation ID)
- 📋 设置追踪响应头
- ⚡ 轻量级实现，最小性能开销

#### 使用方法

```typescript
// 全局注册
import { RequestTrackingInterceptor } from '@common/core/interceptors';

@Module({
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: RequestTrackingInterceptor,
    },
  ],
})
export class AppModule {}

// 在控制器中访问追踪信息
@Controller('api')
export class ApiController {
  @Get('data')
  getData(@Req() request: Request) {
    const requestId = (request as any).requestId;
    const correlationId = (request as any).correlationId;
    // 使用追踪信息...
  }
}
```

#### 生成的响应头
```
x-request-id: req_1705387800000_abc123def
x-correlation-id: req_1705387800000_abc123def
x-request-timestamp: 2025-01-15T10:30:00.000Z
```

### 3. 全局异常过滤器 (GlobalExceptionFilter)

**位置**: `src/common/core/filters/global-exception.filter.ts`

**功能**: 统一处理所有未捕获的异常，提供一致的错误响应格式

#### 功能特性
- 🛡️ 全面的异常处理覆盖
- 🌐 多语言错误消息支持
- 🔒 敏感信息过滤
- 📊 异常监控和指标收集
- 🎯 智能异常类型识别

#### 支持的异常类型
- HTTP 异常 (HttpException)
- 验证错误 (ValidationError)
- MongoDB 异常 (MongoError)
- JWT 认证异常
- 数据库连接错误
- 超时错误
- 自定义业务异常

#### 使用方法

```typescript
import { GlobalExceptionFilter } from '@common/core/filters';

@Module({
  providers: [
    {
      provide: APP_FILTER,
      useClass: GlobalExceptionFilter,
    },
  ],
})
export class AppModule {}
```

#### 错误响应格式

```json
{
  "statusCode": 400,
  "message": "验证失败：用户名不能为空",
  "data": null,
  "timestamp": "2025-01-15T10:30:00.000Z",
  "error": {
    "code": "VALIDATION_ERROR",
    "details": {
      "type": "ValidationError",
      "fields": [
        {
          "field": "username",
          "code": "IS_NOT_EMPTY",
          "message": "不能为空"
        }
      ],
      "path": "/api/users",
      "correlationId": "req_1705387800000_abc123def",
      "requestId": "req_1705387800000_abc123def"
    }
  }
}
```

### 4. Swagger 响应装饰器

**位置**: `src/common/core/decorators/swagger-responses.decorator.ts`

**功能**: 提供标准化的 Swagger API 文档响应格式装饰器

#### 可用装饰器

```typescript
import {
  ApiSuccessResponse,
  ApiCreatedResponse,
  ApiPaginatedResponse,
  ApiStandardResponses,
  JwtAuthResponses,
  ApiKeyAuthResponses,
  PermissionResponses,
  ApiHealthResponse
} from '@common/core/decorators';

// 成功响应
@ApiSuccessResponse({ type: UserDto })
@Get('profile')
getProfile() { /* ... */ }

// 创建响应
@ApiCreatedResponse({ type: UserDto })
@Post('users')
createUser() { /* ... */ }

// 分页响应
@ApiPaginatedResponse(UserDto)
@Get('users')
getUsers() { /* ... */ }

// 标准错误响应组合
@ApiStandardResponses()
@Get('data')
getData() { /* ... */ }

// JWT 认证响应
@JwtAuthResponses()
@Get('protected')
getProtectedData() { /* ... */ }

// API Key 认证响应
@ApiKeyAuthResponses()
@Get('api-data')
getApiData() { /* ... */ }

// 健康检查响应
@ApiHealthResponse()
@Get('health')
healthCheck() { /* ... */ }
```

---

## 📦 功能模块 (Modules)

### 1. 分页模块 (PaginationModule)

**位置**: `src/common/modules/pagination/`

**功能**: 提供统一的分页功能，包括分页计算、验证和响应格式化

#### 核心服务: PaginationService

```typescript
import { PaginationService, PaginationQuery } from '@common/modules/pagination/services';
import { PaginatedDataDto } from '@common/modules/pagination/dto';

@Injectable()
export class UsersService {
  constructor(private readonly paginationService: PaginationService) {}

  async getUsers(query: PaginationQuery) {
    // 标准化分页参数
    const { page, limit } = this.paginationService.normalizePaginationQuery(query);
    
    // 计算跳过的记录数
    const skip = this.paginationService.calculateSkip(page, limit);
    
    // 获取数据和总数
    const [users, total] = await Promise.all([
      this.userRepository.find({ skip, limit }),
      this.userRepository.count()
    ]);
    
    // 创建分页响应
    return this.paginationService.createPaginatedResponse(users, page, limit, total);
  }
}
```

#### 使用模块

```typescript
import { PaginationModule } from '@common/modules/pagination';

@Module({
  imports: [PaginationModule],
  // ...
})
export class UsersModule {}
```

#### 分页响应格式

```json
{
  "items": [...],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 100,
    "totalPages": 10,
    "hasNext": true,
    "hasPrev": false
  }
}
```

### 2. 权限验证模块 (PermissionModule)

**位置**: `src/common/modules/permission/`

**功能**: 提供统一的权限验证框架，支持角色和权限检查

#### 使用方法

```typescript
import { PermissionModule } from '@common/modules/permission';

@Module({
  imports: [PermissionModule],
  // ...
})
export class AppModule {}

// 在控制器中使用
import { RequiresPermissions } from '@common/modules/permission/validators';

@Controller('admin')
export class AdminController {
  @RequiresPermissions(['admin.users.read'])
  @Get('users')
  getUsers() {
    return this.usersService.getUsers();
  }
}
```

### 3. 日志模块 (LoggingModule)

**位置**: `src/common/modules/logging/`

**功能**: 提供分级日志控制系统，支持动态配置和性能优化

#### 功能特性
- 🎯 模块级别日志控制
- ⚡ 高性能缓存机制
- 🔧 动态配置更新
- 📊 详细统计信息
- 🎨 彩色输出支持

#### 使用方法

```typescript
import { createLogger } from '@common/modules/logging';

@Injectable()
export class UserService {
  private readonly logger = createLogger(UserService.name);

  async createUser(userData: CreateUserDto) {
    this.logger.debug('Creating user with data:', userData);
    
    try {
      const user = await this.userRepository.create(userData);
      this.logger.info('User created successfully:', { userId: user.id });
      return user;
    } catch (error) {
      this.logger.error('Failed to create user:', error);
      throw error;
    }
  }
}
```

#### 日志级别配置

```json
{
  "version": "1.0",
  "global": "info",
  "modules": {
    "UserService": "debug",
    "OrderService": "warn",
    "PaymentService": "error"
  },
  "features": {
    "enhancedLoggingEnabled": true,
    "levelCacheEnabled": true,
    "structuredLogging": true
  }
}
```

---

## 🔧 验证器 (Validators)

### 股票代码格式验证器

**位置**: `src/common/validators/symbol-format.validator.ts`

#### 使用方法

```typescript
import { IsValidSymbolFormat, IsSymbolCountValid } from '@common/validators';

export class StockQueryDto {
  @IsValidSymbolFormat({ message: '股票代码格式不正确' })
  @IsNotEmpty()
  symbol: string;

  @IsValidSymbolFormat()
  @IsSymbolCountValid(50) // 最多50个股票代码
  @IsOptional()
  symbols?: string[];
}

// 支持的格式示例
// - A股: "000001", "600000"
// - 港股: "700.HK", "00700"
// - 美股: "AAPL", "GOOGL"
```

---

## 🛠️ 工具类 (Utils)

### 1. 数据库验证工具 (DatabaseValidationUtils)

**位置**: `src/common/utils/database.utils.ts`

```typescript
import { DatabaseValidationUtils } from '@common/utils/database.utils';

@Injectable()
export class UserService {
  async getUserById(id: string) {
    // 验证 ObjectId 格式
    DatabaseValidationUtils.validateObjectId(id, '用户ID');
    
    return this.userRepository.findById(id);
  }

  async getUsersByIds(ids: string[]) {
    // 批量验证 ObjectId 格式
    DatabaseValidationUtils.validateObjectIds(ids, '用户ID列表');
    
    const objectIds = DatabaseValidationUtils.validateAndConvertToObjectIds(ids);
    return this.userRepository.find({ _id: { $in: objectIds } });
  }
}
```

### 2. HTTP Headers 工具 (HttpHeadersUtil)

**位置**: `src/common/utils/http-headers.util.ts`

```typescript
import { HttpHeadersUtil } from '@common/utils/http-headers.util';

@Injectable()
export class AuthService {
  validateApiCredentials(@Req() request: Request) {
    // 安全获取 API 凭证
    const { appKey, accessToken } = HttpHeadersUtil.validateApiCredentials(request);
    
    // 获取客户端 IP（支持代理）
    const clientIP = HttpHeadersUtil.getClientIP(request);
    
    // 获取安全的客户端标识符（用于速率限制）
    const clientId = HttpHeadersUtil.getSecureClientIdentifier(request);
    
    return { appKey, accessToken, clientIP, clientId };
  }
}
```

### 3. 符号验证工具 (SymbolValidationUtils)

**位置**: `src/common/utils/symbol-validation.util.ts`

```typescript
import { SymbolValidationUtils } from '@common/utils/symbol-validation.util';

@Injectable()
export class StockService {
  async validateStockSymbols(symbols: string[]) {
    // 检查符号数量是否超限
    if (SymbolValidationUtils.isSymbolCountExceeded(symbols, 100)) {
      throw new BadRequestException('股票代码数量不能超过100个');
    }
    
    // 验证符号格式
    const invalidSymbols = symbols.filter(
      symbol => !SymbolValidationUtils.isValidSymbol(symbol)
    );
    
    if (invalidSymbols.length > 0) {
      throw new BadRequestException(
        `无效的股票代码格式: ${invalidSymbols.join(', ')}`
      );
    }
    
    return symbols;
  }
}
```

---

## 📋 数据传输对象 (DTOs)

### BaseQueryDto

**位置**: `src/common/dto/base-query.dto.ts`

**功能**: 基础查询DTO，包含分页参数

```typescript
import { BaseQueryDto } from '@common/dto/base-query.dto';

export class GetUsersDto extends BaseQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;
}

// 自动包含分页参数
// - page?: number = 1
// - limit?: number = 50
```

---

## 🔢 常量系统 (Constants)

**位置**: `src/common/constants/`

**架构**: 四层架构常量系统

```
Foundation 层 (基础层) - 纯数值定义，零依赖
    ↓
Semantic 层 (语义层) - 业务无关的语义分类
    ↓  
Domain 层 (领域层) - 业务领域专用常量
    ↓
Application 层 (应用层) - 集成和应用级配置
```

### 使用方法

```typescript
import { CONSTANTS } from '@common/constants';

// 访问不同层级的常量
const batchSize = CONSTANTS.SEMANTIC.BATCH_SIZE_SEMANTICS.BASIC.OPTIMAL_SIZE; // 50
const timeout = CONSTANTS.FOUNDATION.CORE_TIMEOUTS.DEFAULT_TIMEOUT; // 5000
const errorMsg = CONSTANTS.SEMANTIC.ERROR_MESSAGES.VALIDATION_FAILED;
const dbConfig = CONSTANTS.DOMAIN.API_OPERATIONS.DEFAULT_BATCH_SIZE; // 100
```

---

## 📚 最佳实践

### 1. 导入规范

```typescript
// ✅ 推荐：使用路径别名
import { ResponseInterceptor } from '@common/core/interceptors';
import { PaginationService } from '@common/modules/pagination/services';
import { DatabaseValidationUtils } from '@common/utils/database.utils';

// ❌ 避免：相对路径导入
import { ResponseInterceptor } from '../../../common/core/interceptors/response.interceptor';
```

### 2. 模块集成模式

```typescript
// ✅ 推荐：模块级集成
@Module({
  imports: [
    PaginationModule,
    PermissionModule.forRoot(permissionConfig),
  ],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: ResponseInterceptor,
    },
    {
      provide: APP_FILTER,
      useClass: GlobalExceptionFilter,
    },
  ],
})
export class AppModule {}
```

### 3. 错误处理模式

```typescript
// ✅ 推荐：统一错误处理
@Injectable()
export class UserService {
  async createUser(userData: CreateUserDto) {
    try {
      // 验证参数
      DatabaseValidationUtils.validateObjectId(userData.departmentId, '部门ID');
      
      // 业务逻辑
      const user = await this.userRepository.create(userData);
      
      return user;
    } catch (error) {
      // 让 GlobalExceptionFilter 处理
      throw error;
    }
  }
}
```

### 4. 分页查询模式

```typescript
// ✅ 推荐：标准分页模式
@Injectable()
export class UserService {
  constructor(
    private readonly paginationService: PaginationService,
    private readonly userRepository: UserRepository,
  ) {}

  @ApiPaginatedResponse(UserDto)
  async getUsers(query: GetUsersDto): Promise<PaginatedDataDto<User>> {
    const { page, limit } = this.paginationService.normalizePaginationQuery(query);
    
    const [users, total] = await Promise.all([
      this.userRepository.findWithPagination(query, page, limit),
      this.userRepository.countWithFilter(query),
    ]);
    
    return this.paginationService.createPaginatedResponse(users, page, limit, total);
  }
}
```

### 5. 日志记录模式

```typescript
// ✅ 推荐：结构化日志
@Injectable()
export class OrderService {
  private readonly logger = createLogger(OrderService.name);

  async processOrder(orderId: string) {
    const correlationId = `order_${orderId}_${Date.now()}`;
    
    this.logger.info('Processing order', {
      correlationId,
      orderId,
      timestamp: new Date().toISOString(),
    });
    
    try {
      const result = await this.processOrderInternal(orderId);
      
      this.logger.info('Order processed successfully', {
        correlationId,
        orderId,
        result: result.status,
      });
      
      return result;
    } catch (error) {
      this.logger.error('Order processing failed', {
        correlationId,
        orderId,
        error: error.message,
        stack: error.stack,
      });
      
      throw error;
    }
  }
}
```

---

## 🚀 性能优化建议

### 1. 缓存策略
- 分页服务使用内置缓存机制
- 日志模块启用级别检查缓存
- 常量系统采用单例模式

### 2. 异步处理
- 响应拦截器使用 `setImmediate` 异步发送指标
- 异常过滤器异步记录错误日志
- 避免阻塞主要业务流程

### 3. 内存管理
- 工具类使用静态方法减少实例创建
- 常量预编译避免运行时计算
- 合理配置日志缓存大小

---

## 🔍 常见问题解决

### 1. 响应格式不统一
**问题**: 部分端点返回格式不一致
**解决**: 确保 `ResponseInterceptor` 在全局注册，避免手动包装响应

### 2. 分页参数验证失败
**问题**: 分页参数验证错误
**解决**: 继承 `BaseQueryDto` 并使用 `PaginationService` 标准化参数

### 3. 日志级别不生效
**问题**: 模块级别日志配置无效
**解决**: 检查 `log-levels.json` 配置文件，确保模块名称匹配

### 4. 异常信息泄露
**问题**: 生产环境暴露敏感错误信息
**解决**: `GlobalExceptionFilter` 已内置环境检查，生产环境自动过滤

---

## 📖 相关文档

- [NestJS 官方文档](https://docs.nestjs.com/)
- [项目架构说明](/docs/architecture.md)
- [API 文档](/docs/api.md)
- [部署指南](/docs/deployment.md)

---

## 🤝 贡献指南

### 新增组件开发规范

1. **位置选择**: 根据功能归属选择合适目录
2. **命名规范**: 使用清晰的描述性名称
3. **依赖管理**: 最小化外部依赖
4. **测试覆盖**: 确保充分的单元测试
5. **文档更新**: 及时更新本文档

### 代码审查要点

- [ ] 是否遵循单一职责原则
- [ ] 是否有充分的错误处理
- [ ] 是否有性能优化考虑
- [ ] 是否包含充分的注释
- [ ] 是否有相关的单元测试

---

*最后更新时间: 2025年1月15日*
*文档版本: v2.0*
*维护者: 后端开发团队*