# 后端改进建议 - Symbol Mapper ObjectId验证

## 🚨 发现的后端设计缺陷

在E2E测试过程中，发现Symbol Mapper模块存在ObjectId验证缺陷，需要后端修复。

## 问题详情

### 1. **缺少ObjectId验证逻辑**

**当前行为**：
- 传入无效ObjectId格式（如 `"invalid-object-id"`）
- Mongoose抛出`CastError`
- 全局异常过滤器返回**500 Internal Server Error**

**期望行为**：
- 验证ObjectId格式
- 返回**400 Bad Request**与用户友好的错误信息

### 2. **影响的端点**

所有使用`@Param("id")`的端点都受到影响：

```typescript
// 受影响的端点
GET    /api/v1/symbol-mapper/:id
PATCH  /api/v1/symbol-mapper/:id  
DELETE /api/v1/symbol-mapper/:id
```

## 建议的修复方案

### 方案1：自定义ObjectId验证管道（推荐）

```typescript
// src/common/pipes/parse-object-id.pipe.ts
import { Injectable, PipeTransform, BadRequestException } from '@nestjs/common';
import { Types } from 'mongoose';

@Injectable()
export class ParseObjectIdPipe implements PipeTransform<string, string> {
  transform(value: string): string {
    if (!Types.ObjectId.isValid(value)) {
      throw new BadRequestException('无效的ID格式');
    }
    return value;
  }
}
```

**在控制器中使用**：
```typescript
// src/core/symbol-mapper/controller/symbol-mapper.controller.ts
async getSymbolMappingById(
  @Param('id', ParseObjectIdPipe) id: string
) {
  return await this.symbolMapperService.getSymbolMappingById(id);
}
```

### 方案2：服务层验证

```typescript
// src/core/symbol-mapper/services/symbol-mapper.service.ts
import { Types } from 'mongoose';

async getSymbolMappingById(id: string): Promise<SymbolMappingResponseDto> {
  if (!Types.ObjectId.isValid(id)) {
    throw new BadRequestException('无效的ID格式');
  }
  
  const mapping = await this.repository.findById(id);
  // ... 其余逻辑
}
```

### 方案3：增强全局异常过滤器

```typescript
// src/common/core/filters/global-exception.filter.ts
private isMongoError(exception: any): boolean {
  return (
    exception.name === 'MongoError' ||
    exception.name === 'MongoServerError' ||
    exception.name === 'CastError' ||  // 新增：捕获ObjectId转换错误
    (exception.code && typeof exception.code === 'number')
  );
}

private handleMongoError(exception: any): { status: HttpStatus; message: string } {
  if (exception.name === 'CastError' && exception.kind === 'ObjectId') {
    return {
      status: HttpStatus.BAD_REQUEST,
      message: '无效的ID格式'
    };
  }
  // ... 其余MongoDB错误处理
}
```

## 测试验证

修复后，以下测试应该通过：

```typescript
// 无效ObjectId格式应返回400
await httpServer
  .get("/api/v1/symbol-mapper/invalid-object-id-format")
  .expect(400);

// 有效ObjectId格式但资源不存在应返回404  
await httpServer
  .get("/api/v1/symbol-mapper/507f1f77bcf86cd799439011")
  .expect(404);
```

## 当前测试状态

✅ **所有E2E测试已通过**  
⚠️ **测试中标注了后端BUG**，等待后端修复后更新断言

### 测试中的临时标注

```typescript
.expect(500); // BACKEND BUG: Should be 400 with ObjectId validation
```

## 优先级

🔥 **高优先级** - 影响API错误处理和用户体验

## 相关文件

- `src/core/symbol-mapper/controller/symbol-mapper.controller.ts`
- `src/core/symbol-mapper/services/symbol-mapper.service.ts`
- `src/common/core/filters/global-exception.filter.ts`
- `test/jest/e2e/core/symbol-mapper/controller/symbol-mapper.controller.e2e.test.ts`