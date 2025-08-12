# CLAUDE.md - Backend Development Guide

This file provides comprehensive guidance to Claude Code (claude.ai/code) when working with the New Stock API backend codebase.

## Project Context

This is the **backend directory** of the New Stock API project - a sophisticated NestJS-based intelligent stock data processing system featuring a **7-component core architecture** with real-time WebSocket streaming, three-tier authentication, and comprehensive fault tolerance.

**Key Architecture Principles:**
- **7-component architecture**: Eliminates circular dependencies through Receiver → Stream Receiver → Symbol Mapper → Data Mapper → Transformer → Storage → Query flow
- **Three-tier authentication**: API Key (third-party apps), JWT (developers/admins), Public access
- **Four-layer field semantics**: Eliminates ambiguous `dataType` fields through layer-specific naming
- **Fault-tolerant design**: Non-critical systems gracefully handle failures
- **Response interception**: Never manually wrap responses - use global ResponseInterceptor

## Development Commands

### Essential Commands
```bash
# Development
bun run dev              # Start development server with auto-reload
bun run build           # Compile TypeScript
bun run lint            # ESLint with auto-fix
bun run format          # Format code with Prettier

# Testing
bun run test:unit                # Unit tests
bun run test:unit:watch          # Unit tests in watch mode
bun run test:integration         # Integration tests (requires MongoDB/Redis)
bun run test:e2e                 # E2E tests
bun run test:security           # Security tests
bun run test:all                # All tests

# Individual test execution
npx jest test/jest/unit/auth/auth.service.spec.ts
npx jest test/jest/unit/auth/auth.service.spec.ts -t "should authenticate user"
npx jest --config test/config/jest.integration.config.js test/jest/integration/core/

# Module-specific testing
bun run test:unit:auth          # Auth module tests
bun run test:unit:core          # Core module tests
bun run test:unit:common        # Shared module tests

# Performance testing (requires K6)
bun run test:perf:auth          # Auth performance tests
bun run test:perf:data          # Data processing performance

# Coverage testing
bun run test:coverage:all       # Generate coverage for all test types
bun run test:coverage:unit      # Unit test coverage only
bun run test:coverage:auth      # Auth module coverage
bun run test:coverage:core      # Core modules coverage
bun run coverage:report         # Merge and analyze coverage reports
```

## Critical Development Patterns

### 1. Response Format Requirements
**NEVER manually wrap responses** - Use global `ResponseInterceptor`:

```typescript
// ✅ Correct
async getData(@Body() dto: QueryDto) {
  return await this.service.getData(dto); // Interceptor handles wrapping
}

// ❌ Wrong - Don't manually wrap
async getData(@Body() dto: QueryDto) {
  const data = await this.service.getData(dto);
  return { statusCode: 200, message: '成功', data }; // Don't do this
}
```

**Standard Response Format**:
```typescript
{
  statusCode: number;
  message: string;       // Must be in Chinese
  data: T | null;
  timestamp: string;
  requestId?: string;
}
```

### 2. HTTP Status Code Conventions
**Critical for E2E Tests**: Understand the distinction between operations and resource creation:

```typescript
// ✅ Operations return 200 (with @HttpCode decorator)
@Post('reset-presets')
@HttpCode(HttpStatus.OK)  // Operations like reset, persist, update
async resetPresets() { ... }

// ✅ Resource creation returns 201 (default POST behavior)
@Post('templates')
async createTemplate() { ... }  // Creating new resources
```

**Key Rule**: If the endpoint primarily updates/resets/operates on existing data → use `@HttpCode(HttpStatus.OK)`. If it creates entirely new resources → let it return 201.

### 3. Three-Tier Authentication System

**Critical Pattern**: Different decorators for different access levels:

```typescript
// 1. API Key Authentication (Third-party applications)
@ApiKeyAuth([Permission.DATA_READ])
async getPublicData() { ... }

// 2. JWT Authentication (Developers/Admins)  
@Auth([UserRole.ADMIN])
async adminOperation() { ... }

// 3. Public Access
@Public()
async healthCheck() { ... }
```

**Authentication Flow Understanding**:
- API Key returns **403** (not 401) when authenticated but lacking permissions
- JWT returns **401** when token is missing/invalid
- Admin-only endpoints with API Key access return **403** (permission denied)

### 4. Input Validation Patterns

**Critical for DTO Design**:

```typescript
// ✅ Proper validation
export class BulkOperationDto {
  @IsArray()
  @ArrayNotEmpty()  // Reject empty arrays - batch operations need actual items
  @IsString({ each: true })
  ids: string[];
}

// ✅ ObjectId validation
if (!Types.ObjectId.isValid(id)) {
  throw new BadRequestException(`无效的ID格式: ${id}`);
}
```

**Validation Rules**:
- Empty arrays in batch operations should be **rejected** (use `@ArrayNotEmpty()`)
- Always validate ObjectId format before database queries
- Use proper error types: `BadRequestException` for format errors, `NotFoundException` for missing resources

### 5. Database Error Handling Patterns

**MongoDB ObjectId Error Handling**:

```typescript
// ✅ Proper error handling sequence
async getById(id: string) {
  // 1. Format validation first
  if (!Types.ObjectId.isValid(id)) {
    throw new BadRequestException(`无效的ID格式: ${id}`);
  }

  // 2. Database query with try-catch
  let document;
  try {
    document = await this.model.findById(id);
  } catch (error) {
    throw new BadRequestException(`无效的ID: ${id}`);
  }

  // 3. Existence check
  if (!document) {
    throw new NotFoundException(`资源未找到: ${id}`);
  }

  return document;
}
```

### 6. Test Data Management

**E2E Test Patterns**:

```typescript
// ✅ Unique test data generation
const timestamp = Date.now();
const random = Math.random().toString(36).substring(7);
const uniqueSuffix = `${timestamp}_${random}`;

const testUser = {
  username: `e2euser_${uniqueSuffix}`,
  email: `e2e_${uniqueSuffix}@example.com`,
  // ... other fields
};
```

**Avoid 409 Conflicts**: Always generate unique identifiers for test data to prevent registration conflicts.

## Architecture Components

### 7-Component Core Flow

```
Request → Receiver → Stream Receiver → Symbol Mapper → Data Mapper → Transformer → Storage → Query → Response
```

Each component has specific responsibilities:
- **Receiver** (`src/core/receiver/`): Entry point, market detection, provider routing
- **Stream Receiver** (`src/core/stream-receiver/`): WebSocket streaming, real-time data
- **Symbol Mapper** (`src/core/symbol-mapper/`): Format conversion between providers  
- **Data Mapper** (`src/core/data-mapper/`): Field mapping rules engine
- **Transformer** (`src/core/transformer/`): Data transformation application
- **Storage** (`src/core/storage/`): Redis + MongoDB dual storage
- **Query** (`src/core/query/`): Unified data retrieval

### Four-Layer Field Semantics

**CRITICAL**: Never use ambiguous `dataType` fields. Use layer-specific semantic names:

```typescript
// ✅ Correct semantic naming
{
  receiverType: "get-stock-quote",           // Receiver layer (kebab-case)
  transDataRuleListType: "quote_fields",    // Transformer layer (snake_case)
  storageClassification: "stock_quote",     // Storage layer (snake_case)
  queryTypeFilter: "get-stock-quote"        // Query layer (kebab-case)
}

// ❌ Wrong - ambiguous field
{
  dataType: "quote"  // Which layer? What context? Avoid this!
}
```

### Provider System

**Auto-Discovery Pattern**:

```typescript
// ✅ Use @Provider decorator
@Provider({
  name: "longport",
  description: "LongPort 长桥证券数据提供商",
  autoRegister: true,
  healthCheck: true,
  initPriority: 1
})
export class LongportProvider implements IDataProvider {
  // Implementation
}
```

## Testing Best Practices

### Development Workflow Rules

**CRITICAL**: Follow these debugging principles:

1. **No Speculative Fixes**: Never modify assertions to make tests pass. Always examine backend code to understand correct behavior.

2. **Batch Testing**: When writing multiple test files, complete ALL editing before running tests. Don't run tests after each file.

3. **Code-Based Analysis**: Determine expected behavior by examining actual implementation, not by guessing.

### E2E Test Configuration

**Test Setup Patterns**:

```typescript
// ✅ Use app.getHttpServer() for HTTP access
const server = app.getHttpServer();
await request(server).get('/api/v1/endpoint');

// ❌ Don't use httpServer directly
await request(httpServer).get('/api/v1/endpoint');
```

**Test Configuration Files**:
- Unit: `test/config/jest.unit.config.js`
- Integration: `test/config/jest.integration.config.js` 
- E2E: `test/config/jest.e2e.config.js`
- Security: `test/config/jest.security.config.js`
- Blackbox: `test/config/jest.blackbox.config.js`

### Common Test Failures and Fixes

**User Registration Conflicts (409)**:
- Always use unique usernames in test setup
- Generate timestamps and random suffixes for uniqueness

**Authentication Expectation Mismatches**:
- API Key with insufficient permissions returns **403** (not 401)
- Missing/invalid JWT tokens return **401**
- Admin endpoints accessed with API Key return **403**

**Validation Errors**:
- Empty arrays in batch operations should fail validation
- Invalid ObjectId format should return **400**
- Non-existent resources should return **404**

## Module-Specific Guidance

### Data Mapper Module

**System Persistence Controller**:
- All operations (persist, reset, bulk operations) return **200** with `@HttpCode(HttpStatus.OK)`
- Requires **Admin** role authentication (`@Auth([UserRole.ADMIN])`)
- Batch operations validate non-empty arrays with `@ArrayNotEmpty()`

**Persisted Template Service**:
- Reset operations count both `created` and `updated` as `recreated`
- Bulk operations track `failed` items (not `skipped`)
- ObjectId validation before all database operations

### Authentication Module

**Guard Order** (from `app.module.ts`):
1. `ThrottlerGuard` (rate limiting)
2. `ApiKeyAuthGuard` (API key validation)  
3. `JwtAuthGuard` (JWT token validation)
4. `RateLimitGuard` (API key rate limiting)
5. `UnifiedPermissionsGuard` (permission checking)

**Permission System**:
- API Keys: `data:read`, `query:execute`, `providers:read`
- JWT Roles: `admin`, `developer`
- Public endpoints: No authentication required

## Technology Stack

- **Runtime**: Bun (high-performance TypeScript execution)
- **Framework**: NestJS with Express
- **Database**: MongoDB with Mongoose ODM
- **Cache**: Redis with optimization layers
- **Authentication**: JWT + Passport + API Key system  
- **Testing**: Jest + K6 performance testing + E2E testing
- **Documentation**: Swagger/OpenAPI with interactive docs
- **Real-time**: WebSocket with Socket.IO

## Environment Setup

### Required Services
- **MongoDB** >= 5.0 on localhost:27017 (required)
- **Redis** >= 6.0 on localhost:6379 (required)
- **Bun** >= 1.0 (preferred over Node.js)

### Environment Variables
```bash
# LongPort API (for production data)
LONGPORT_APP_KEY=your_app_key
LONGPORT_APP_SECRET=your_app_secret
LONGPORT_ACCESS_TOKEN=your_access_token

# Database connections
MONGODB_URI=mongodb://localhost:27017/smart-stock-data
REDIS_URL=redis://localhost:6379

# Auto-initialization
AUTO_INIT_ENABLED=true
AUTO_INIT_SYMBOL_MAPPINGS=true
AUTO_INIT_SKIP_EXISTING=true
```

## Debugging Checklist

When encountering issues, check these common patterns:

### Response Format Issues
- ✅ Controllers return raw data (not manually wrapped)
- ✅ `ResponseInterceptor` is registered in `main.ts`
- ✅ Success messages are in Chinese

### Authentication Issues
- ✅ Correct decorators: `@ApiKeyAuth()`, `@Auth()`, `@Public()`
- ✅ Required headers present: `X-App-Key`, `X-Access-Token`, `Authorization`
- ✅ Understanding 401 vs 403 expectations

### Database Issues
- ✅ MongoDB and Redis services running
- ✅ ObjectId format validation before queries
- ✅ Proper error types: `BadRequestException` vs `NotFoundException`

### Test Issues
- ✅ Unique test data generation
- ✅ Correct HTTP status expectations (200 vs 201)
- ✅ Proper validation expectations (empty arrays should fail)

## Key Files Reference

- `src/main.ts` - Application bootstrap, interceptors, global setup
- `src/app.module.ts` - Module imports, guard configuration
- `src/core/` - 7-component architecture implementation
- `src/auth/` - Three-tier authentication system
- `src/providers/` - Data provider integration with @Provider decorator
- `src/common/interceptors/response.interceptor.ts` - Response formatting
- `test/config/` - Jest configuration for different test types
- `test/config/e2e.setup.ts` - E2E test setup with unique user generation

## Important Reminders

- **Never manually wrap responses** - Use global ResponseInterceptor
- **Always analyze backend code** - No speculative test fixes
- **Follow HTTP conventions** - Operations return 200, creation returns 201
- **Use proper authentication decorators** - Match access requirements
- **Validate inputs properly** - ObjectId format, non-empty arrays
- **Generate unique test data** - Avoid registration conflicts
- **Understand error expectations** - 401 vs 403, 400 vs 404
- **Follow 7-component architecture** - No circular dependencies
- **Use semantic field names** - Four-layer field architecture eliminates ambiguity