# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

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
```

## Architecture Overview

This is a **NestJS-based intelligent stock data processing system** with a **6-component core architecture**:

### Core Components (Request → Response Flow)
1. **Receiver** (`src/core/receiver/`) - Entry point with intelligent routing
   - Auto-detects markets: HK (.HK), US (alphabet), SZ (00/30 prefix), SH (60/68 prefix)
   - Provider selection based on capability matrix
   - Main endpoint: `POST /api/v1/receiver/data`

2. **Symbol Mapper** (`src/core/symbol-mapper/`) - Stock symbol format conversion
   - Transforms between provider formats (e.g., "700.HK" ↔ "00700")
   - MongoDB-based mapping rules with optimized indexes
   - Bulk transformation support

3. **Data Mapper** (`src/core/data-mapper/`) - Field mapping rules engine
   - 37 preset fields: 22 stock quote + 15 basic info
   - Nested object path transformation (`secu_quote[].last_done` → `lastPrice`)
   - JSON structure analysis and intelligent field suggestions

4. **Transformer** (`src/core/transformer/`) - Real-time data transformation
   - Applies mapping rules to raw provider data
   - Batch processing and preview capabilities
   - Custom transformation functions support

5. **Storage** (`src/core/storage/`) - Dual storage strategy
   - Redis-first caching with MongoDB persistence
   - Automatic compression and performance metrics
   - Intelligent cache invalidation

6. **Query** (`src/core/query/`) - Unified data retrieval
   - Multiple query types: `by_symbols`, `by_market`, `by_provider`
   - Intelligent caching with configurable TTL
   - Bulk operations and metadata inclusion

### Three-Tier Authentication System

**Critical Pattern**: The system uses three distinct authentication layers:

1. **API Key Authentication** (Third-party applications)
   - Headers: `X-App-Key` + `X-Access-Token`
   - Fine-grained permissions: `data:read`, `query:execute`, `providers:read`
   - Redis-based rate limiting with sliding windows
   - Decorator: `@ApiKeyAuth([Permission.DATA_READ])`

2. **JWT Authentication** (Developers/Admins)
   - Header: `Authorization: Bearer <token>`
   - Role-based access: `admin`, `developer`
   - Hierarchical permissions (admin inherits all developer permissions)
   - Decorator: `@Auth([UserRole.ADMIN])`

3. **Public Access**
   - No authentication required
   - Decorator: `@Public()`

### Provider Capability System

**Auto-Discovery Architecture**: Providers register capabilities through file-based discovery:

- **Structure**: `src/providers/{provider}/capabilities/{capability}.ts`
- **Registry**: `CapabilityRegistryService` scans and auto-registers all providers
- **Interface**: Each capability implements standardized interfaces
- **Example**: `get-stock-quote.ts`, `get-stock-basic-info.ts`

**Current Status**:
- **LongPort**: ✅ Production ready (3 capabilities)
- **LongPort SG**: ✅ Production ready (Singapore markets)
- **Others**: 🚧 Stub implementations ready for extension

### Auto-Initialization System

**Configuration-Driven**: System automatically initializes data on startup:

- **Config**: `src/common/config/auto-init.config.ts` with extensive environment variable support
- **Service**: `src/scripts/auto-init-on-startup.service.ts`
- **Features**:
  - Preset field mappings (37 fields)
  - Symbol mapping rules
  - Idempotent operations (skips existing data)
  - Environment variable overrides

## Critical Development Patterns

### Response Format Requirements
**Never manually wrap responses** - Use global `ResponseInterceptor`:

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

### Authentication Decorator Usage

**API Key Endpoints**:
```typescript
@ApiKeyAuth([Permission.DATA_READ])
@ApiStandardResponses()
@ApiKeyAuthResponses()
async getData(@Body() dto: DataRequestDto) {
  return await this.service.getData(dto);
}
```

**JWT Endpoints**:
```typescript
@Auth([UserRole.ADMIN])
@ApiStandardResponses()
@JwtAuthResponses()
async manageUsers(@Body() dto: UserManagementDto) {
  return await this.service.manageUsers(dto);
}
```

### Field Naming Convention Critical Pattern

**IMPORTANT**: The system uses a **four-layer field architecture** to eliminate ambiguous `dataType` fields:

```typescript
// 🎯 Four-Layer Field Architecture (eliminates dataType confusion)
{
  // 1. Receiver Layer - Capability routing
  capabilityType: "get-stock-quote",     // Provider capability routing

  // 2. Data Mapper/Transformer Layer - Mapping rule types  
  dataRuleListType: "quote_fields",     // Field mapping rule classification

  // 3. Storage Layer - Data classification
  dataClassification: "stock_quote",    // Storage categorization

  // 4. Query Layer - Data filtering
  dataTypeFilter: "get-stock-quote",    // Query filtering
}
```

**Naming Format Conventions**:
- **Capability routing** (`capabilityType`): `kebab-case` - "get-stock-quote"
- **Mapping rules** (`dataRuleListType`): `snake_case` - "quote_fields"  
- **Storage classification** (`dataClassification`): `snake_case` - "stock_quote"
- **Query filtering** (`dataTypeFilter`): `kebab-case` - "get-stock-quote"

### Shared Module Usage

**Pure Static Design** - `src/common/` contains zero-dependency utilities:

```typescript
// ✅ Correct common module usage
import { Market, MARKETS } from '@common/constants/market.constants';
import { ApiSuccessResponse } from '@common/decorators/swagger-responses.decorator';
import { createLogger } from '@common/config/logger.config';

// ❌ Never manually wrap responses
return { statusCode: 200, message: '成功', data }; // ResponseInterceptor handles this
```

### Testing Architecture Patterns

**E2E Tests**: Use `app.getHttpServer()` for HTTP server access, not `httpServer`

**Test Configuration**: Different Jest configs for different test types:
- Unit: `test/config/jest.unit.config.js`
- Integration: `test/config/jest.integration.config.js`
- E2E: `test/config/jest.e2e.config.js`
- Security: `test/config/jest.security.config.js`

## Environment Setup

### Prerequisites
- **Bun** >= 1.0 (TypeScript runtime)
- **MongoDB** >= 5.0 on localhost:27017
- **Redis** >= 6.0 on localhost:6379 (required for rate limiting)
- **K6** (performance testing)
- **LongPort API credentials** (production data)

### Environment Variables
```bash
# LongPort API (required for real data)
export LONGPORT_APP_KEY=your_app_key
export LONGPORT_APP_SECRET=your_app_secret
export LONGPORT_ACCESS_TOKEN=your_access_token

# Database connections (optional, defaults work locally)
export MONGODB_URI=mongodb://localhost:27017/smart-stock-data
export REDIS_URL=redis://localhost:6379

# Auto-initialization control
export AUTO_INIT_ENABLED=true
export AUTO_INIT_SYMBOL_MAPPINGS=true
export AUTO_INIT_SKIP_EXISTING=true
```

### Quick Start
```bash
# 1. Install dependencies
bun install

# 2. Ensure services are running
# MongoDB: localhost:27017
# Redis: localhost:6379

# 3. Start development server
bun run dev
```

## API Usage Patterns

### Authentication Flow
```bash
# 1. Register admin user
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "email": "admin@example.com", "password": "password123", "role": "admin"}'

# 2. Login to get JWT token
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "password123"}'

# 3. Create API Key (requires JWT)
curl -X POST http://localhost:3000/api/v1/auth/api-keys \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{"name": "Test App", "permissions": ["data:read", "query:execute"]}'
```

### Data Access (Main Entry Point)
```bash
# Primary endpoint with API Key authentication
curl -X POST http://localhost:3000/api/v1/receiver/data \
  -H "X-App-Key: YOUR_APP_KEY" \
  -H "X-Access-Token: YOUR_ACCESS_TOKEN" \
  -d '{"symbols": ["700.HK", "AAPL.US"], "capabilityType": "get-stock-quote"}'
```

### Key Endpoints
- **Application**: http://localhost:3000
- **API Documentation**: http://localhost:3000/api/docs (Swagger)
- **Health Check**: Auto-initialization status in startup logs

## Common Development Tasks

### Adding a New Provider
1. Create directory: `src/providers/new-provider/`
2. Implement `capabilities/` with standardized interfaces
3. Provider auto-registers via `CapabilityRegistryService`
4. Test with existing endpoints

### Adding New Core Component Endpoint
1. Create DTO in relevant module
2. Add service method with proper error handling
3. Create controller with authentication decorators
4. Add Swagger documentation using common decorators
5. Write comprehensive tests (unit → integration → e2e)

### Database Schema Changes
1. Update schema in `schemas/` directory
2. Update repository methods
3. Update DTOs and interfaces
4. Auto-initialization will handle preset data
5. Update tests accordingly

## Important Notes

### Database Dependencies
- **MongoDB**: Required for persistence and mapping rules
- **Redis**: Required for caching and rate limiting (not optional)
- **Auto-initialization**: Creates preset mappings on startup with intelligent skipping

### System Health
- 🟢 All critical bugs resolved
- 🟢 LongPort SDK production ready
- 🟢 100% TypeScript type safety
- 🟢 Comprehensive test suite (75+ test files)
- 🟢 Auto-initialization system working correctly
- 🟢 Fault-tolerant performance monitoring system implemented
- 🟢 Health monitoring with degradation detection

### Architectural Insights

**Data Flow**: Request → Receiver → Symbol Mapper → Data Mapper → Transformer → Storage → Query

**Provider Integration**: File-based auto-discovery with capability registration

**Permission System**: Fine-grained permissions with role inheritance (admin > developer > user)

**Response Consistency**: Global interceptor ensures all APIs return standardized format

**Configuration Management**: Environment-variable-driven with comprehensive defaults

### Debugging Common Issues

1. **Response Format Issues**: Check `ResponseInterceptor` registration in `main.ts`
2. **Authentication Problems**: Verify decorators and required headers
3. **Database Connection**: Ensure MongoDB/Redis are running on default ports
4. **Provider Integration**: Check capability registration in service logs
5. **Performance Monitoring Issues**: 
   - Check Redis connection status via `/api/v1/monitoring/metrics-health`
   - Performance monitoring gracefully degrades when Redis is unavailable
   - Use fault-tolerant cache methods for non-critical operations
6. **Test Failures**:
   - Unit tests failing: Check for missing service dependencies in test modules
   - Integration tests failing: Verify MongoDB/Redis connections in test environment
   - E2E tests failing: Check authentication tokens and API endpoint availability

### Key Files for Understanding
- `src/main.ts` - Application bootstrap
- `src/app.module.ts` - Module configuration
- `src/common/config/auto-init.config.ts` - Auto-initialization settings
- `src/providers/capability-registry.service.ts` - Provider discovery
- `src/auth/enums/user-role.enum.ts` - Permission system
- `src/common/interceptors/response.interceptor.ts` - Response formatting

## Fault-Tolerance and Performance Monitoring

### Performance Monitoring System

**Critical Design**: Performance monitoring is treated as **non-critical functionality** with fault-tolerant error handling:

#### CacheService Fault Tolerance
Specific cache methods implement fault tolerance for performance monitoring scenarios:

```typescript
// ✅ Fault-tolerant methods (return defaults on Redis failure)
await cacheService.hashGetAll(key);      // Returns {} on failure
await cacheService.listRange(key, 0, -1); // Returns [] on failure  
await cacheService.setIsMember(key, member); // Returns false on failure
await cacheService.setMembers(key);      // Returns [] on failure

// ❌ Standard methods (throw exceptions on failure)
await cacheService.get(key);             // Throws ServiceUnavailableException
await cacheService.set(key, value);      // Throws ServiceUnavailableException
```

#### MetricsHealthService
Monitors the health of the metrics system itself:

```typescript
// Key service endpoints
GET /api/v1/monitoring/metrics-health        // Detailed health report
GET /api/v1/monitoring/metrics-health/check  // Manual health check

// Service features
- Periodic Redis connection monitoring (30s intervals)
- Consecutive failure tracking with thresholds
- Automatic degradation detection
- Health status recommendations
```

#### PerformanceMetricsRepository
Enhanced with Redis connection status checks:

```typescript
// Always checks Redis status before operations
if (this.redis.status !== 'ready') {
  this.logger.warn('Redis连接不可用，跳过性能指标记录');
  return; // Graceful degradation
}
```

### Error Handling Philosophy

**Core Principle**: Critical business operations must be reliable, while performance monitoring should degrade gracefully:

1. **Business Data Operations**: Fail-fast with clear error messages
2. **Performance Monitoring**: Fault-tolerant with default value returns
3. **Health Monitoring**: Continuous monitoring with degradation alerts

### Testing Architecture Updates

Recent additions to the test suite:

#### New Test Files
- `test/jest/unit/metrics/metrics-health.service.spec.ts` - MetricsHealthService unit tests
- `test/jest/integration/cache/cache-fault-tolerance.integration.test.ts` - Cache fault tolerance tests
- `test/jest/e2e/monitoring/metrics-health.e2e.test.ts` - Health check endpoint E2E tests

#### Test Execution Patterns
```bash
# Run specific fault tolerance tests
npx jest test/jest/integration/cache/cache-fault-tolerance.integration.test.ts

# Run metrics health tests
npx jest test/jest/unit/metrics/metrics-health.service.spec.ts

# Run comprehensive monitoring tests
npx jest test/jest/e2e/monitoring/metrics-health.e2e.test.ts
```