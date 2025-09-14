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

# Provider CLI Tool
bun run cli                      # Provider management CLI tool

# Constants and Code Quality Tools
bun run check-constants          # Detect duplicate constants across codebase
bun run detect-constants-duplicates    # Advanced duplicate constant detection
bun run analyze:constants-usage  # Analyze constant usage patterns
bun run remove:unused-constants  # Remove unused constants automatically

# Testing - Single Test Execution
npx jest path/to/test.spec.ts                           # Run specific test file
npx jest path/to/test.spec.ts -t "test name"           # Run specific test case
DISABLE_AUTO_INIT=true npx jest path/to/test.spec.ts   # Run without auto-initialization
npx jest path/to/test.spec.ts --testTimeout=30000      # Run with extended timeout

# Testing - Module Testing (Comprehensive Coverage)
bun run test:unit:auth           # Auth module unit tests
bun run test:unit:core           # Core modules unit tests
bun run test:unit:cache          # Cache module unit tests
bun run test:unit:alert          # Alert system unit tests
bun run test:unit:metrics        # Metrics monitoring unit tests
bun run test:unit:security       # Security module unit tests
bun run test:unit:monitoring     # System monitoring unit tests
bun run test:unit:providers      # Data providers unit tests

# Testing - Integration & E2E
bun run test:integration         # Integration tests (requires MongoDB/Redis running)
bun run test:integration:all     # All integration tests in parallel
bun run test:e2e                 # E2E tests
bun run test:e2e:all             # All E2E tests in parallel
bun run test:security            # Security vulnerability tests
bun run test:blackbox            # Black box testing
bun run test:all                 # Run all test types

# Testing - Coverage Analysis
bun run test:coverage:all        # Generate comprehensive coverage report
bun run test:coverage:unit       # Unit test coverage only
bun run coverage:merge           # Merge coverage reports from different test types
bun run coverage:analyze         # Analyze coverage trends and quality gates
bun run coverage:gate-check      # Check if coverage meets quality thresholds

# Performance Testing (requires K6)
bun run test:perf:auth           # Auth performance tests
bun run test:perf:data           # Data processing performance
bun run test:perf:api            # API stress testing
bun run test:perf:load           # Load testing
bun run test:perf:spike          # Spike testing

# Code Quality and Analysis Tools
bun run tools:structure-validator         # Validate project structure
bun run tools:find-duplicates            # Find duplicate test files
bun run tools:naming-validator           # Validate naming conventions
bun run tools:analyze-all               # Run all analysis tools
bun run tools:fix-all                   # Auto-fix detected issues
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

### Dual Rate Limiting System

The system implements two independent rate limiting layers:

1. **IP-Level Rate Limiting** (Global Protection)
   - Default: 1000 requests/minute per IP
   - Headers: `X-IP-RateLimit-*`
   - Environment: `IP_RATE_LIMIT_MAX`, `IP_RATE_LIMIT_ENABLED`

2. **API Key-Level Rate Limiting** (Personalized)
   - Configurable per API key (default: 200 requests/minute)
   - Headers: `X-API-RateLimit-*`
   - Strategy: Fixed window or sliding window
   - Environment: `API_RATE_LIMIT_DEFAULT_REQUESTS`

**Guard Execution Order** (critical - do not change):
```typescript
1. ThrottlerGuard        // Global rate limiting
2. ApiKeyAuthGuard       // API Key authentication
3. JwtAuthGuard          // JWT authentication
4. RateLimitGuard        // API Key rate limiting
5. UnifiedPermissionsGuard // Permission validation
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

## Module Architecture Overview

The system includes these key modules beyond the 7-component core:

### Operational Modules
- **Alert Module** (`src/alert/`) - System alerting and notification management
- **Metrics Module** (`src/metrics/`) - Performance metrics collection and analysis
- **Monitoring Module** (`src/monitoring/`) - System health monitoring and diagnostics
- **Security Module** (`src/security/`) - Security middleware, validation, and audit
- **Cache Module** (`src/cache/`) - Shared caching utilities and fault-tolerance

### Support Modules
- **Scripts Module** (`src/scripts/`) - Auto-initialization and maintenance scripts
- **Common Module** (`src/common/`) - Shared utilities, decorators, and configurations

## Key Files for Understanding

- `src/main.ts` - Application bootstrap, interceptors, middleware, security setup
- `src/app.module.ts` - Module imports, guard configuration, global settings
- `src/core/01-entry/receiver/` - Entry point for real-time data (strong timeliness)
- `src/core/01-entry/query/` - Entry point for batch queries (weak timeliness)
- `src/core/05-caching/smart-cache/` - Intelligent caching orchestrator with TTL strategies
- `src/core/00-prepare/symbol-mapper/` - Symbol conversion engine with 3-layer LRU cache
- `src/common/core/interceptors/response.interceptor.ts` - Standard response formatting
- `src/auth/` - Three-tier authentication system implementation
- `src/providers/` - Data provider integrations with decorator system
- `src/notification/` - Independent notification system with template engine
- `src/database/database.module.ts` - Unified database module (MongoDB + Redis)
- `scripts/tsc-single-file.js` - Single file TypeScript checking utility
- `test/config/` - Jest configurations for different test types
- `docs/完整的数据流场景实景说明.md` - Detailed data flow documentation

## Path Aliases (tsconfig.json)

The project uses TypeScript path aliases for cleaner imports:

```typescript
import { Logger } from '@appcore/config/logger.config';           // src/appcore/config/
import { ResponseInterceptor } from '@common/core/interceptors';  // src/common/core/
import { SymbolMapperService } from '@core/00-prepare/symbol-mapper/'; // src/core/
import { LongportProvider } from '@providers/longport/';          // src/providers/
import { AuthGuard } from '@auth/guards/';                       // src/auth/
import { AlertService } from '@alert/services/';                 // src/alert/
import { CacheService } from '@cache/services/';                 // src/cache/
import { MonitoringService } from '@monitoring/services/';       // src/monitoring/
```

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

## Test Architecture and Debugging

### Test Configuration Structure
The system uses specialized Jest configurations for different test scenarios:
- `test/config/jest.unit.config.js` - Unit tests with mocked dependencies
- `test/config/jest.integration.config.js` - Integration tests requiring MongoDB/Redis
- `test/config/jest.e2e.config.js` - End-to-end API tests with full app initialization
- `test/config/jest.security.config.js` - Security vulnerability and penetration tests
- `test/config/jest.blackbox.config.js` - Black box testing scenarios

### Debugging Commands
```bash
# Debug specific modules with verbose output
bun run test:debug:auth          # Debug auth module with detailed output
bun run test:debug:alert         # Debug alert system
bun run test:debug:monitoring    # Debug monitoring components

# Run tests with different timeouts for slow operations
npx jest path/to/test.spec.ts --testTimeout=60000

# CI/CD Testing Pipelines
bun run test:ci:quick            # Fast CI pipeline (unit + integration)
bun run test:ci:full             # Complete CI pipeline (all test types)
bun run test:ci:security         # Security-focused CI pipeline
bun run test:ci:performance      # Performance testing pipeline

# Smoke and Regression Testing
bun run test:smoke               # Quick smoke tests for critical paths
bun run test:regression          # Full regression test suite
```

### Common Debugging Scenarios
- **Memory Issues**: Use `bun run test:perf:load` to identify memory leaks
- **Cache Problems**: Run `bun run test:integration:cache` for cache-related issues
- **Database Connections**: Use `bun run test:database` for DB connectivity issues
- **API Performance**: Use `bun run test:api` for endpoint performance analysis

## Critical Startup Issues to Monitor

### Singleton Pattern Violations
The system enforces singleton patterns for critical services. Watch for these warnings:
```
WARN: 检测到非单例StreamContextService实例，替换为单例实例
```
- **Location**: `src/core/03-fetching/stream-data-fetcher/services/`
- **Impact**: Resource waste, state inconsistency, memory leaks
- **Fix**: Review dependency injection configuration

### WebSocket Server Conflicts
```
WARN: WebSocket服务器已经初始化，覆盖现有实例
```
- **Location**: `src/core/stream-receiver/gateway/`
- **Impact**: Connection loss, duplicate server instances
- **Fix**: Check initialization order and server lifecycle

### Provider Registration Redundancy
- Multiple provider registration events indicate potential architectural redundancy
- **Locations**: `EnhancedCapabilityRegistryService` and `CapabilityRegistryService`
- **Recommendation**: Consolidate provider registration logic

## Core Component File Paths

### 7-Component Architecture Implementation
```
src/core/
├── 00-prepare/           # Symbol/Data Mapper preparation layer
│   ├── symbol-mapper/    # Symbol format conversion ("700.HK" → "00700")  
│   └── data-mapper/      # Field mapping rules engine (37 preset fields)
├── 01-entry/            # Receiver layer (entry points)
│   ├── receiver/        # REST API entry (strong timeliness, 5s TTL)
│   ├── query/           # Batch query entry (weak timeliness, 300s TTL)
│   └── stream-receiver/ # WebSocket entry (real-time streaming)
├── 02-processing/       # Transformer layer  
│   └── transformer/     # Data standardization/normalization
├── 03-fetching/         # Data fetcher layer
│   ├── data-fetcher/    # REST API data fetching
│   └── stream-data-fetcher/ # WebSocket data fetching + singleton issues
├── 04-storage/          # Storage layer (dual strategy)
│   └── storage/         # Redis cache + MongoDB persistence
├── 05-caching/          # Caching layer (3 independent layers)
│   ├── smart-cache/     # Complete API response cache
│   ├── common-cache/    # Shared caching service
│   ├── symbol-mapper-cache/ # 3-layer LRU memory cache
│   ├── data-mapper-cache/   # Data mapping cache
│   └── stream-cache/    # WebSocket stream caching
└── shared/              # Cross-component utilities
```

### Module Integration Points
```
src/
├── alert/              # System alerting (recently cleaned up)
├── notification/       # Independent notification system (5 channels: Email, Slack, Webhook, DingTalk, Log)
├── auth/              # 3-tier authentication (API Key, JWT, Public) 
├── monitoring/        # Health checks, performance metrics
├── providers/         # Data provider integrations (@Provider decorator)
├── security/          # Security middleware, audit logging  
├── metrics/           # Prometheus metrics (89 total metrics)
├── cache/             # Fault-tolerant caching utilities
├── scripts/           # Auto-initialization scripts
├── database/          # Unified database module (MongoDB + Redis)
├── appcore/           # Application lifecycle and configuration
└── common/            # Zero-dependency utilities
```

**Recent Architecture Changes:**
- **Notification Module**: Recently decoupled from Alert module, now completely independent
  - Features: Dynamic template system with Handlebars engine
  - Templates: MongoDB-persisted, supports versioning and caching
  - 15 REST API endpoints for template management
  - 5 notification channels: Email, Slack, Webhook, DingTalk, Log
- **Database Module**: Unified module for MongoDB and Redis connections
- **AppCore Module**: Added for application lifecycle management  
- **Alert Module**: Cleaned up of legacy compatibility layers (~2,132 lines removed)

## Notification Template System

### Template Management
```bash
# Template endpoints (require developer/admin auth)
POST   /api/v1/templates                 # Create template
GET    /api/v1/templates                 # List templates
GET    /api/v1/templates/:id             # Get template
PUT    /api/v1/templates/:id             # Update template
DELETE /api/v1/templates/:id             # Delete template
POST   /api/v1/templates/render          # Render template with data
POST   /api/v1/templates/validate        # Validate template syntax
```

### Template Engine Features
- **Handlebars Engine**: Conditional rendering, loops, helpers
- **Custom Helpers**: Date formatting, number formatting, string processing
- **XSS Protection**: Automatic input sanitization
- **Caching**: Compiled template caching for performance
- **Versioning**: Template version control and usage statistics

## Provider Decorator System

### Enhanced Provider Registration
```typescript
// New pattern - use @Provider decorator
@Provider({
  name: "provider-name",
  description: "Provider description", 
  autoRegister: true,
  healthCheck: true,
  initPriority: 1
})
export class CustomProvider implements IDataProvider {
  // Capability methods automatically discovered from:
  // src/providers/{provider}/capabilities/{capability}.ts
}
```

### Capability File Structure
```
src/providers/
├── longport/
│   ├── capabilities/
│   │   ├── get-stock-quote.ts      # REST API capability
│   │   ├── get-stock-info.ts       # Basic info capability
│   │   ├── stream-stock-quote.ts   # WebSocket capability  
│   │   └── get-us-stock-quote.ts   # Market-specific capability
│   ├── longport.provider.ts        # Main provider class
│   └── longport.module.ts          # NestJS module
└── longport-sg/                    # Singapore market provider
    └── capabilities/
        ├── get-sg-stock-quote.ts
        ├── get-sg-stock-info.ts  
        └── stream-sg-stock-quote.ts
```

## Fault-Tolerance Patterns

### Cache Service Fault Tolerance
The system uses fault-tolerant methods for non-critical operations:

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

**Implementation Location**: `src/cache/services/cache.service.ts`

### Performance Monitoring Fault Tolerance
Performance monitoring is treated as **non-critical functionality**:
- Redis failures in metrics collection don't crash the application
- Monitoring services gracefully degrade when dependencies are unavailable
- **Location**: `src/monitoring/` and `src/metrics/`

## Smart Cache Orchestrator

### Advanced Caching Strategies
```typescript
// TTL Strategies
enum CacheStrategy {
  STRONG_TIMELINESS = 5,     // Receiver component (real-time)
  WEAK_TIMELINESS = 300,     // Query component (batch)  
  MARKET_AWARE = 'dynamic'   // Based on market open/close
}
```

### Cache Key Patterns
```
// Smart Cache Keys
receiver:get-stock-quote:700.HK:longport
query:by-symbols:AAPL,GOOGL:weak-timeliness

// Symbol Mapper Cache (3-layer LRU)
L1: provider-rules:{provider}
L2: symbol:{standardSymbol} 
L3: batch:{symbols-hash}
```

**Implementation**: `src/core/05-caching/smart-cache/services/smart-cache-orchestrator.service.ts`

### Startup Performance Diagnostics

#### Normal Startup Timing
- **Total startup**: ~3 seconds ✅
- **MongoDB connection**: 120ms ✅  
- **Redis connections**: <50ms ✅
- **Module initialization**: Parallel loading ✅

#### Performance Red Flags
- Singleton violations (immediate fix required)
- WebSocket server overrides (check initialization order)  
- Provider registration loops (consolidation needed)
- Auto-init 409 conflicts (normal, but monitor frequency)
## TypeScript File Checking

To check a single TypeScript file for compilation errors (critical for development workflow):

```bash
# Standard single file type checking
DISABLE_AUTO_INIT=true npm run typecheck:file -- src/path/to/file.ts

# With trace resolution (for debugging import issues)  
DISABLE_AUTO_INIT=true npm run typecheck:file -- src/path/to/file.ts --traceResolution

# Examples
DISABLE_AUTO_INIT=true npm run typecheck:file -- src/app.module.ts
DISABLE_AUTO_INIT=true npm run typecheck:file -- src/alert/module/alert-enhanced.module.ts
DISABLE_AUTO_INIT=true npm run typecheck:file -- src/notification/services/notification.service.ts
```

**Important Notes:**
- Always use `DISABLE_AUTO_INIT=true` prefix to prevent initialization during type checking
- Uses custom script `scripts/tsc-single-file.js` for optimized single-file checking
- Much faster than running full `npx tsc --noEmit` on entire project