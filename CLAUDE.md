# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is the backend of the **New Stock API** - a sophisticated NestJS-based intelligent stock data processing system that aggregates and normalizes financial data from multiple providers into a unified API.

**Core Technologies:**
- Runtime: Bun (replaces Node.js for faster TypeScript execution)
- Framework: NestJS with Express
- Database: MongoDB (Mongoose ODM) + Redis (caching)
- Real-time: WebSocket with Socket.IO
- Authentication: Three-tier system (API Key, JWT, Public)

## Essential Commands

```bash
# Development
bun run dev                      # Start with auto-reload
bun run start:debug              # Start with debugging
bun run build                    # Compile TypeScript
bun run lint                     # ESLint with auto-fix
bun run format                   # Prettier formatting

# Testing - Single Test Execution
npx jest path/to/test.spec.ts                           # Run specific test file
npx jest path/to/test.spec.ts -t "test name"           # Run specific test case
DISABLE_AUTO_INIT=true npx jest path/to/test.spec.ts   # Run without auto-initialization

# Testing - Module Testing
bun run test:unit:auth           # Auth module unit tests
bun run test:unit:core           # Core modules unit tests
bun run test:unit:cache          # Cache module unit tests
bun run test:unit:query          # Query component tests
bun run test:unit:receiver       # Receiver component tests

# Testing - Integration & E2E
bun run test:integration         # Integration tests (requires MongoDB/Redis running)
bun run test:e2e                 # E2E tests
bun run test:all                 # Run all test types

# Testing - Coverage
bun run test:coverage:all        # Generate full coverage report
bun run test:coverage:unit       # Unit test coverage only

# Performance Testing (requires K6)
bun run test:perf:auth           # Auth performance tests
bun run test:perf:data           # Data processing performance
```

## High-Level Architecture

### 7-Component Core Data Flow

The system uses a pipeline architecture that eliminates circular dependencies:

```
User Request
    ↓
1. Receiver (Entry point, market detection, provider routing)
    ↓
2. Stream Receiver (WebSocket real-time streaming)
    ↓
3. Symbol Mapper (Format conversion: "700.HK" → "00700")
    ↓
4. Data Mapper (Field mapping rules engine)
    ↓
5. Transformer (Data standardization/normalization)
    ↓
6. Storage (Redis cache + MongoDB persistence)
    ↓
7. Query (Unified data retrieval with intelligent caching)
    ↓
Response to User
```

### Multi-Layer Caching Architecture

The system implements three independent caching layers:

1. **Smart Cache (Redis)** - Complete API responses
   - Receiver: 5-second TTL (strong timeliness)
   - Query: Dynamic TTL based on strategy (weak timeliness, ~300s default)
   - Key format: `receiver:get-stock-quote:700.HK:longport`

2. **Symbol Mapper Cache (Memory LRU)** - Symbol mappings
   - L3: Batch results cache
   - L2: Single symbol cache
   - L1: Provider rules cache

3. **Common Cache (Redis)** - Shared caching service
   - Dynamic TTL calculation based on market status
   - Fault-tolerant methods for non-critical operations

### Three-Tier Authentication System

```typescript
// 1. API Key Auth (Third-party apps)
@ApiKeyAuth([Permission.DATA_READ])

// 2. JWT Auth (Developers/Admins)
@Auth([UserRole.ADMIN])

// 3. Public Access
@Public()
```

### Critical Patterns

#### Response Format (NEVER manually wrap)
```typescript
// ✅ Correct - Let interceptor handle it
return await this.service.getData(dto);

// ❌ Wrong - Don't manually wrap
return { statusCode: 200, message: '成功', data };
```

#### Four-Layer Field Semantics (Avoid ambiguous dataType)
```typescript
{
  receiverType: "get-stock-quote",        // Receiver layer
  transDataRuleListType: "quote_fields",  // Transformer layer
  storageClassification: "stock_quote",   // Storage layer
  queryTypeFilter: "get-stock-quote"      // Query layer
}
```

#### HTTP Status Conventions
- Operations (reset, update): Use `@HttpCode(HttpStatus.OK)` → 200
- Resource creation: Default POST behavior → 201

#### Database Error Handling
```typescript
// 1. Validate ObjectId format first
if (!Types.ObjectId.isValid(id)) {
  throw new BadRequestException(`无效的ID格式: ${id}`);
}

// 2. Query with try-catch
try {
  document = await this.model.findById(id);
} catch (error) {
  throw new BadRequestException(`无效的ID: ${id}`);
}

// 3. Check existence
if (!document) {
  throw new NotFoundException(`资源未找到: ${id}`);
}
```

## Data Flow Scenarios

### Scenario 1: Cache Hit (Optimal)
```
Request → Smart Cache → ✅ Hit → Return (~10ms)
```

### Scenario 2: Symbol Cache Hit Only
```
Request → Smart Cache ❌ → Symbol Mapper ✅ → Data Fetcher → Transformer → Storage → Response (~100-200ms)
```

### Scenario 3: Complete Miss (Cold Start)
```
Request → Smart Cache ❌ → Symbol Mapper ❌ → MongoDB Rules → Data Fetcher → Provider API → Transformer → Storage → Response (~500-1000ms)
```

## Query vs Receiver Components

| Aspect | Query Component | Receiver Component |
|--------|----------------|-------------------|
| Purpose | Long-term queries, batch processing | Real-time data, immediate freshness |
| Cache Strategy | WEAK_TIMELINESS | STRONG_TIMELINESS |
| Default TTL | ~300 seconds (dynamic) | 5 seconds |
| Batch Support | Three-level parallel processing | Single/small batch |
| Use Case | Reports, analytics | Trading, live prices |

## Provider System

Providers use decorator-based registration:

```typescript
@Provider({
  name: "longport",
  description: "LongPort provider",
  autoRegister: true,
  healthCheck: true,
  initPriority: 1
})
export class LongportProvider implements IDataProvider {
  // Implementation
}
```

## Testing Guidelines

### Test Organization
- Unit tests: `test/jest/unit/`
- Integration tests: `test/jest/integration/`
- E2E tests: `test/jest/e2e/`
- Different Jest configs for each type in `test/config/`

### Common Test Issues
- **409 Conflicts**: Generate unique test data with timestamps
- **Authentication**: API Key insufficient permissions → 403 (not 401)
- **Validation**: Empty arrays should fail with `@ArrayNotEmpty()`
- **E2E Setup**: Use `app.getHttpServer()` not `httpServer` directly

### Running Tests with Environment Control
```bash
# Disable auto-initialization for tests
DISABLE_AUTO_INIT=true npx jest test/path/to/test.spec.ts

# Run specific test timeout
npx jest test/path/to/test.spec.ts --testTimeout=30000
```

## Environment Requirements

### Required Services
- MongoDB >= 5.0 (localhost:27017)
- Redis >= 6.0 (localhost:6379)
- Bun >= 1.0

### Key Environment Variables
```bash
# Provider credentials
LONGPORT_APP_KEY=xxx
LONGPORT_APP_SECRET=xxx
LONGPORT_ACCESS_TOKEN=xxx

# Database
MONGODB_URI=mongodb://localhost:27017/smart-stock-data
REDIS_URL=redis://localhost:6379

# Auto-initialization
AUTO_INIT_ENABLED=true
AUTO_INIT_SYMBOL_MAPPINGS=true
DISABLE_AUTO_INIT=true  # For testing
```

## Key Files for Understanding

- `src/main.ts` - Application bootstrap, interceptors, middleware
- `src/app.module.ts` - Module imports, guard configuration
- `src/core/restapi/receiver/` - Entry point for real-time data
- `src/core/restapi/query/` - Entry point for batch queries
- `src/core/public/smart-cache/` - Intelligent caching orchestrator
- `src/core/public/symbol-mapper/` - Symbol conversion engine
- `src/common/interceptors/response.interceptor.ts` - Response formatting
- `docs/完整的数据流场景实景说明.md` - Detailed data flow documentation

## Performance Optimization

### Caching Strategy
- Smart Cache handles 90%+ requests with ~10ms response
- Symbol Mapper Cache uses three-layer LRU to minimize DB queries
- Query component implements three-level parallel batch processing
- Pending queries mechanism prevents duplicate requests

### TTL Management
- Dynamic TTL based on market status (open/closed)
- Strategy-driven (STRONG_TIMELINESS, WEAK_TIMELINESS, MARKET_AWARE)
- Automatic cache invalidation on data changes

### Monitoring
- Cache hit rate targets: Smart Cache > 90%, Symbol Cache > 70%
- Response time targets: P95 < 200ms, P99 < 500ms
- Error rate threshold: < 0.1%