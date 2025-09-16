# 架构改进计划：通用组件与监控组件的职责分离

## 问题描述

当前 `src/common` 下的通用组件（ResponseInterceptor、GlobalExceptionFilter）直接包含了监控功能，违反了单一职责原则和依赖倒置原则。

### 存在的问题

1. **职责越界**：通用组件不应该知道监控的存在
2. **依赖倒置**：common 模块依赖了 monitoring 模块的事件定义
3. **复用困难**：在其他项目中使用这些组件时被迫引入监控依赖
4. **测试复杂**：测试通用组件时需要 mock 监控相关的依赖

## 现状分析

### 已有基础设施
- ✅ 存在 `src/common/events/` 目录
- ✅ 已定义 `EventBusMessage` 接口
- ✅ 已定义 `EVENT_TYPES` 常量（ALERT、NOTIFICATION、SYSTEM）

### 未充分利用
- ❌ ResponseInterceptor 直接导入 `SYSTEM_STATUS_EVENTS` from monitoring
- ❌ GlobalExceptionFilter 也直接依赖监控模块事件
- ❌ 通用事件系统未被实际使用

## 解决方案

### 方案一：基于现有事件系统扩展（推荐）✅

利用已有的 `src/common/events/` 基础设施，扩展支持 HTTP 事件，让通用组件发送语义化的业务事件，监控模块订阅并转换这些事件。

#### 1. 创建通用事件定义

```typescript
// src/common/events/common.events.ts
export enum CommonEvents {
  // HTTP 请求相关事件
  HTTP_REQUEST_COMPLETED = 'http.request.completed',
  HTTP_REQUEST_FAILED = 'http.request.failed',
  
  // 异常相关事件
  EXCEPTION_OCCURRED = 'exception.occurred',
  VALIDATION_FAILED = 'validation.failed',
}

export interface HttpRequestCompletedEvent {
  method: string;
  url: string;
  statusCode: number;
  duration: number;
  timestamp: Date;
  requestId?: string;
}

export interface ExceptionOccurredEvent {
  errorType: string;
  statusCode: number;
  message: string;
  method?: string;
  url?: string;
  timestamp: Date;
}
```

#### 2. 修改 ResponseInterceptor

```typescript
// src/common/core/interceptors/response.interceptor.ts
import { CommonEvents, HttpRequestCompletedEvent } from '@common/events/common.events';

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, any> {
  constructor(
    @Optional() private readonly eventBus?: EventEmitter2, // 可选依赖
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const startTime = Date.now();
    
    return next.handle().pipe(
      map((data) => {
        const duration = Date.now() - startTime;
        const response = context.switchToHttp().getResponse<Response>();
        const request = context.switchToHttp().getRequest();
        const statusCode = response.statusCode;

        // 发送通用的请求完成事件（如果事件总线可用）
        if (this.eventBus) {
          setImmediate(() => {
            const event: HttpRequestCompletedEvent = {
              method: request.method,
              url: this.sanitizeUrl(request.url),
              statusCode,
              duration,
              timestamp: new Date(),
              requestId: request.requestId,
            };
            this.eventBus.emit(CommonEvents.HTTP_REQUEST_COMPLETED, event);
          });
        }

        // 返回标准响应格式（核心职责）
        return {
          statusCode,
          message: this.getDefaultMessage(statusCode),
          data: data === undefined ? null : data,
          timestamp: new Date().toISOString(),
        };
      }),
    );
  }
}
```

#### 3. 修改 GlobalExceptionFilter

```typescript
// src/common/core/filters/global-exception.filter.ts
import { CommonEvents, ExceptionOccurredEvent } from '@common/events/common.events';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  constructor(
    @Optional() private readonly eventBus?: EventEmitter2, // 可选依赖
  ) {}

  catch(exception: unknown, host: ArgumentsHost) {
    // ... 异常处理逻辑 ...

    // 发送通用的异常事件（如果事件总线可用）
    if (this.eventBus) {
      setImmediate(() => {
        const event: ExceptionOccurredEvent = {
          errorType,
          statusCode: status,
          message,
          method: request?.method,
          url: request?.url ? this.sanitizePath(request.url) : undefined,
          timestamp: new Date(),
        };
        this.eventBus.emit(CommonEvents.EXCEPTION_OCCURRED, event);
      });
    }

    // 返回错误响应（核心职责）
    response.status(status).json(errorResponse);
  }
}
```

#### 4. 监控模块订阅通用事件

```typescript
// src/monitoring/adapters/common-events.adapter.ts
@Injectable()
export class CommonEventsAdapter {
  constructor(private readonly eventBus: EventEmitter2) {}

  @OnEvent(CommonEvents.HTTP_REQUEST_COMPLETED)
  handleHttpRequestCompleted(event: HttpRequestCompletedEvent) {
    // 转换为监控事件
    this.eventBus.emit(SYSTEM_STATUS_EVENTS.METRIC_COLLECTED, {
      timestamp: event.timestamp,
      source: 'http_request',
      metricType: 'performance',
      metricName: 'http_request_duration',
      metricValue: event.duration,
      tags: {
        method: event.method,
        url: event.url,
        status_code: event.statusCode,
        status: event.statusCode < 400 ? 'success' : 'error',
      },
    });
  }

  @OnEvent(CommonEvents.EXCEPTION_OCCURRED)
  handleExceptionOccurred(event: ExceptionOccurredEvent) {
    // 转换为监控事件
    this.eventBus.emit(SYSTEM_STATUS_EVENTS.METRIC_COLLECTED, {
      timestamp: event.timestamp,
      source: 'exception_handler',
      metricType: 'error',
      metricName: 'http_exception',
      metricValue: 1,
      tags: {
        error_type: event.errorType,
        status_code: event.statusCode,
        method: event.method,
        url: event.url,
      },
    });
  }
}
```

### 方案二：装饰器模式

创建监控装饰器包装通用组件：

```typescript
// src/monitoring/decorators/monitored-interceptor.decorator.ts
export function MonitoredInterceptor(target: Type<NestInterceptor>) {
  @Injectable()
  class MonitoredInterceptorWrapper implements NestInterceptor {
    constructor(
      private readonly originalInterceptor: any,
      private readonly eventBus: EventEmitter2,
    ) {}

    intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
      const startTime = Date.now();
      
      return this.originalInterceptor.intercept(context, next).pipe(
        tap(() => {
          // 添加监控逻辑
          const duration = Date.now() - startTime;
          this.emitMetrics(context, duration);
        }),
      );
    }

    private emitMetrics(context: ExecutionContext, duration: number) {
      // 发送监控事件
    }
  }

  return MonitoredInterceptorWrapper;
}

// 使用
@Module({
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: MonitoredInterceptor(ResponseInterceptor),
    },
  ],
})
export class AppModule {}
```

### 方案三：AOP（面向切面编程）

使用 AOP 在不修改原有代码的情况下添加监控：

```typescript
// src/monitoring/aspects/http-monitoring.aspect.ts
@Injectable()
@Aspect()
export class HttpMonitoringAspect {
  constructor(private readonly eventBus: EventEmitter2) {}

  @After('ResponseInterceptor.intercept')
  afterIntercept(context: ExecutionContext, result: any) {
    // 收集并发送监控数据
  }

  @AfterThrowing('GlobalExceptionFilter.catch')
  afterException(exception: any) {
    // 收集并发送异常监控数据
  }
}
```

## 推荐方案分析

### 为什么推荐方案一？

| 特性 | 方案一（通用事件） | 方案二（装饰器） | 方案三（AOP） |
|------|------------------|----------------|--------------|
| 解耦程度 | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ |
| 实现复杂度 | 低 | 中 | 高 |
| 可测试性 | 优秀 | 良好 | 一般 |
| 性能开销 | 最小 | 小 | 中等 |
| 可维护性 | 优秀 | 良好 | 一般 |
| 灵活性 | 高 | 中 | 高 |
| NestJS 原生支持 | ✅ | ✅ | ❌ |

## 实施步骤

### 第一阶段：创建通用事件层
1. 在 `src/common/events/` 创建通用事件定义
2. 定义事件接口和枚举
3. 创建事件文档

### 第二阶段：重构通用组件
1. 修改 `ResponseInterceptor` 使用通用事件
2. 修改 `GlobalExceptionFilter` 使用通用事件
3. 将 `EventEmitter2` 改为可选依赖
4. 更新单元测试

### 第三阶段：创建监控适配器
1. 在监控模块创建 `CommonEventsAdapter`
2. 监听通用事件并转换为监控事件
3. 保持向后兼容

### 第四阶段：测试和验证
1. 确保监控功能正常工作
2. 验证通用组件可以独立使用
3. 性能测试

## 好处

### 1. 职责清晰
- 通用组件只负责核心功能
- 监控模块负责指标收集
- 事件层作为契约

### 2. 可复用性提升
- 通用组件可以在任何项目中使用
- 不强制依赖监控功能
- 可选的事件发送

### 3. 可测试性改善
- 通用组件测试不需要 mock 监控
- 可以独立测试各个模块
- 更简单的单元测试

### 4. 扩展性增强
- 可以添加更多事件消费者
- 支持多种监控后端
- 灵活的事件处理

## 兼容性考虑

### 向后兼容
- 保持现有 API 不变
- 逐步迁移，不影响现有功能
- 提供迁移指南

### 配置选项
```typescript
// 可以通过配置启用/禁用事件发送
@Module({
  imports: [
    CommonModule.forRoot({
      enableEvents: true, // 默认启用
      eventBus: EventEmitterModule, // 可选
    }),
  ],
})
export class AppModule {}
```

## 性能影响

- **事件发送**：使用 `setImmediate` 异步处理，不阻塞主流程
- **内存使用**：事件对象轻量，快速 GC
- **CPU 开销**：最小，仅在事件发送时
- **网络开销**：无额外网络请求

## 迁移计划

### 时间线
- **第1周**：设计通用事件接口
- **第2周**：重构通用组件
- **第3周**：实现监控适配器
- **第4周**：测试和优化

### 风险评估
- **低风险**：不影响核心业务逻辑
- **中风险**：需要更新监控配置
- **缓解措施**：保持向后兼容，提供回滚方案

## 总结

通过实施通用事件层方案，我们可以：

1. ✅ **解决职责混淆**：各组件专注自己的核心功能
2. ✅ **消除依赖倒置**：common 不再依赖 monitoring
3. ✅ **提升可复用性**：通用组件真正通用
4. ✅ **改善可测试性**：更简单的单元测试
5. ✅ **保持性能**：异步事件处理，无性能损失

这是一个**低风险、高收益**的架构改进，值得实施。

---

*文档版本: v1.0*  
*创建日期: 2025-01-15*  
*作者: 架构团队*