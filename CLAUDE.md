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

## Serena MCP Integration

### Serena MCP Server Status
The project has **Serena MCP server integrated** and running with:
- **Context**: `ide-assistant` (optimized for IDE integration)
- **Language**: TypeScript support with LSP integration
- **Project**: Auto-configured for this NestJS backend
- **Status**: ✅ Active and available via MCP protocol

### Available Serena Tools via MCP

#### 🔍 **Code Analysis & Navigation**
```bash
# Symbol search and analysis
find_symbol <symbol_name>                    # Search for functions, classes, variables
find_referencing_symbols <file> <line> <col> # Find all references to a symbol
find_referencing_code_snippets <file> <line> <col> # Get code snippets using symbol
get_symbols_overview <directory_path>        # Overview of symbols in files/directories
```

#### 📝 **Precise Code Editing**
```bash
# Symbol-based editing (LSP-powered)
replace_symbol_body <file> <line> <col> <new_content>  # Replace entire symbol definitions
insert_before_symbol <file> <line> <col> <content>     # Insert before symbol start
insert_after_symbol <file> <line> <col> <content>      # Insert after symbol end

# Line-based editing
replace_lines <file> <start_line> <end_line> <content> # Replace line ranges
delete_lines <file> <start_line> <end_line>            # Delete line ranges
insert_at_line <file> <line_number> <content>          # Insert at specific line
```

#### 📁 **File & Project Operations**
```bash
# File operations
read_file <file_path>                        # Read project files
create_text_file <file_path> <content>       # Create/overwrite files
list_dir <directory_path> [--recursive]     # Directory listings
search_for_pattern <pattern> [--file-pattern] # Pattern search across codebase

# Project management
onboarding                                   # Analyze project structure and essential tasks
execute_shell_command <command>              # Run shell commands in project context
restart_language_server                     # Restart LSP when needed
```

#### 🧠 **Project Memory & Knowledge**
```bash
# Persistent knowledge storage
write_memory <memory_name> <content>         # Store project insights
read_memory <memory_name>                    # Retrieve stored memories  
list_memories                                # View all stored memories
delete_memory <memory_name>                  # Remove specific memory
```

#### ⚙️ **Configuration & Workflow**
```bash
# Configuration management
get_current_config                           # Show current agent configuration
switch_modes <mode_names>                    # Change operational modes
activate_project <project_name>              # Switch between projects

# Workflow assistance
check_onboarding_performed                   # Check if project was analyzed
prepare_for_new_conversation                 # Context for continuing sessions
summarize_changes                            # Summarize codebase modifications
```

#### 🤔 **AI Thinking Tools**
```bash
# Reflection and planning tools
think_about_collected_information            # Ponder completeness of gathered info
think_about_task_adherence                   # Check if still on track with task
think_about_whether_you_are_done            # Determine if task is complete
```

### Serena MCP Usage Examples

#### **Project Onboarding**
```bash
# Get familiar with the codebase structure
onboarding

# Store key architectural insights
write_memory "architecture_notes" "7-component core: Receiver->StreamReceiver->SymbolMapper->DataMapper->Transformer->Storage->Query with WebSocket streaming support"
```

#### **Code Navigation & Analysis**
```bash
# Find the main data processing service
find_symbol DataMapperService

# Get overview of core components
get_symbols_overview src/core/

# Find all usages of a specific authentication decorator
find_referencing_symbols src/auth/decorators/auth.decorator.ts 15 0
```

#### **Precise Code Editing**
```bash
# Add a new method to a service class
insert_after_symbol src/core/receiver/receiver.service.ts 25 0 "
  async processAdvancedQuery(query: AdvancedQueryDto) {
    // Implementation here
  }
"

# Replace an entire method implementation
replace_symbol_body src/core/transformer/transformer.service.ts 45 2 "
  async transformData(data: any, rules: MappingRule[]): Promise<any> {
    // New optimized implementation
    return this.applyOptimizedRules(data, rules);
  }
"
```

#### **Debugging & Analysis**
```bash
# Search for potential performance issues
search_for_pattern "await.*await" --file-pattern "*.ts"

# Find all error handling patterns
search_for_pattern "catch|throw|Error"

# Get overview of test files
get_symbols_overview test/jest/unit/
```

### Integration with Development Workflow

The Serena MCP integration enhances the existing development commands:

1. **Before Development**: Use `onboarding` to understand project context
2. **During Development**: Use symbol navigation and precise editing tools
3. **Code Review**: Use pattern search and reference finding
4. **Knowledge Building**: Store insights with `write_memory`
5. **Debugging**: Use comprehensive search and analysis tools

### Best Practices

1. **Start with Onboarding**: Always run `onboarding` for new areas of the codebase
2. **Use Memory System**: Store important architectural decisions and patterns
3. **Leverage LSP Integration**: Prefer symbol-based editing over line-based when possible
4. **Combine with Testing**: Use Serena tools alongside the existing test commands
5. **Project Context**: All Serena tools are project-aware and respect `.gitignore`

## Architecture Overview

This is a **NestJS-based intelligent stock data processing system** with a **7-component core architecture**:

### Core Components (Request → Response Flow)
1. **Receiver** (`src/core/receiver/`) - Entry point with intelligent routing
   - Auto-detects markets: HK (.HK), US (alphabet), SZ (00/30 prefix), SH (60/68 prefix)
   - Provider selection based on capability matrix
   - Main endpoint: `POST /api/v1/receiver/data`

2. **Stream Receiver** (`src/core/stream-receiver/`) - **NEW**: Real-time WebSocket streaming
   - WebSocket connection management and real-time data streaming
   - Stream capability discovery and intelligent routing
   - Automatic reconnection and connection health monitoring
   - Main endpoint: `WebSocket /api/v1/stream-receiver/connect`

3. **Symbol Mapper** (`src/core/symbol-mapper/`) - Stock symbol format conversion
   - Transforms between provider formats (e.g., "700.HK" ↔ "00700")
   - MongoDB-based mapping rules with optimized indexes
   - Bulk transformation support

4. **Data Mapper** (`src/core/data-mapper/`) - Field mapping rules engine
   - 37 preset fields: 22 stock quote + 15 basic info
   - Nested object path transformation (`secu_quote[].last_done` → `lastPrice`)
   - JSON structure analysis and intelligent field suggestions

5. **Transformer** (`src/core/transformer/`) - Real-time data transformation
   - Applies mapping rules to raw provider data
   - Batch processing and preview capabilities
   - Custom transformation functions support

6. **Storage** (`src/core/storage/`) - Dual storage strategy
   - Redis-first caching with MongoDB persistence
   - Automatic compression and performance metrics
   - Intelligent cache invalidation

7. **Query** (`src/core/query/`) - Unified data retrieval
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
- **LongPort**: ✅ Production ready (3 REST capabilities + 1 WebSocket stream capability)
- **LongPort SG**: ✅ Production ready (Singapore markets)
- **Others**: 🚧 Stub implementations ready for extension

### WebSocket Stream Capabilities

**NEW**: The system now supports real-time WebSocket streaming capabilities alongside traditional REST endpoints:

#### Stream Capability Structure
- **Location**: `src/providers/{provider}/capabilities/stream-*.ts`
- **Registry**: Auto-discovered by `CapabilityRegistryService` during module initialization
- **Interface**: All stream capabilities implement `IStreamCapability` interface

#### Key Stream Methods
```typescript
interface IStreamCapability {
  initialize(context: any): Promise<void>;    // Initialize WebSocket connection
  subscribe(symbols: string[], context: any): Promise<void>;  // Subscribe to symbols
  unsubscribe(symbols: string[], context: any): Promise<void>; // Unsubscribe from symbols
  onMessage(callback: (data: StreamDataCallbackParams) => void): void; // Set message callback
  cleanup(): Promise<void>;                   // Clean up resources
  isConnected(): boolean;                     // Check connection status
}
```

#### Stream Capability Implementation Example
```typescript
// src/providers/longport/capabilities/stream-stock-quote.ts
export default {
  name: 'stream-stock-quote',
  description: 'LongPort实时股票报价流',
  supportedMarkets: ['HK', 'US', 'SZ', 'SH'],
  supportedSymbolFormats: ['{symbol}.{market}', '{symbol}'],
  
  async initialize(context: LongportStreamContextService): Promise<void> {
    await context.initializeWebSocket();
  },
  
  async subscribe(symbols: string[], context: LongportStreamContextService): Promise<void> {
    await context.subscribe(symbols, 'quote');
  },
  
  async unsubscribe(symbols: string[], context: LongportStreamContextService): Promise<void> {
    await context.unsubscribe(symbols);
  },
  
  onMessage(callback: (data: StreamDataCallbackParams) => void): void {
    this._messageCallback = callback;
  },
  
  async cleanup(): Promise<void> {
    this._messageCallback = null;
  },
  
  isConnected(): boolean {
    return this._context?.isConnected() || false;
  }
};
```

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
  receiverType: "get-stock-quote",     // Provider capability routing

  // 2. Data Mapper/Transformer Layer - Mapping rule types  
  transDataRuleListType: "quote_fields",     // Field mapping rule classification

  // 3. Storage Layer - Data classification
  storageClassification: "stock_quote",    // Storage categorization

  // 4. Query Layer - Data filtering
  queryTypeFilter: "get-stock-quote",    // Query filtering
}
```

**Naming Format Conventions**:
- **Capability routing** (`receiverType`): `kebab-case` - "get-stock-quote"
- **Mapping rules** (`transDataRuleListType`): `snake_case` - "quote_fields"  
- **Storage classification** (`storageClassification`): `snake_case` - "stock_quote"
- **Query filtering** (`queryTypeFilter`): `kebab-case` - "get-stock-quote"

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
  -d '{"symbols": ["700.HK", "AAPL.US"], "receiverType": "get-stock-quote"}'
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
- 🟢 LongPort SDK production ready with WebSocket streaming support
- 🟢 100% TypeScript type safety
- 🟢 Comprehensive test suite (75+ test files)
- 🟢 Auto-initialization system working correctly
- 🟢 Fault-tolerant performance monitoring system implemented
- 🟢 Health monitoring with degradation detection
- 🟢 WebSocket stream capabilities fully integrated and tested

### Architectural Insights

**Data Flow**: 
- **REST**: Request → Receiver → Symbol Mapper → Data Mapper → Transformer → Storage → Query
- **WebSocket**: Stream Receiver → Symbol Mapper → Data Mapper → Transformer → Storage → Real-time Push

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

# Run WebSocket stream capability tests
npx jest test/jest/integration/providers/capabilities/stream-stock-quote.integration.test.ts
```

## WebSocket Stream Integration Testing

### Critical Testing Pattern for Stream Capabilities

When testing WebSocket stream capabilities, **proper module initialization timing** is essential:

#### Essential Stream Test Setup
```typescript
describe('StreamStockQuote Capability Integration', () => {
  let module: TestingModule;
  let capabilityRegistryService: CapabilityRegistryService;
  let streamCapability: IStreamCapability;
  
  beforeAll(async () => {
    // Create test module
    module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    
    // CRITICAL: Ensure complete module initialization
    await module.init();
    
    // Get services
    capabilityRegistryService = module.get<CapabilityRegistryService>(CapabilityRegistryService);
    
    // CRITICAL: Wait for stream capability registration to complete
    let retryCount = 0;
    const maxRetries = 10;
    
    while (retryCount < maxRetries) {
      const allStreamCaps = capabilityRegistryService.getAllStreamCapabilities();
      const longportCaps = allStreamCaps.get('longport');
      const streamQuoteCap = longportCaps?.get('stream-stock-quote');
      
      if (streamQuoteCap) {
        break;
      }
      
      await new Promise(resolve => setTimeout(resolve, 100));
      retryCount++;
    }
    
    // Get stream capability
    const provider = capabilityRegistryService.getBestStreamProvider('stream-stock-quote');
    streamCapability = capabilityRegistryService.getStreamCapability(provider, 'stream-stock-quote');
    
  }, 30000); // Extended timeout for initialization
  
  afterAll(async () => {
    await module.close();
  });
});
```

#### Key Testing Issues and Solutions

**1. Module Initialization Timing Issue**
- **Problem**: Tests try to access stream capabilities before they're registered
- **Solution**: Use `await module.init()` + retry mechanism with timeout

**2. LongPort SDK API Limitations**
- **Problem**: SDK doesn't provide connection state listeners (`setOnConnected`, `setOnDisconnected`)
- **Solution**: Mock SDK properly and handle connection state without callbacks

**3. Stream Capability Registration Timing**
- **Problem**: `getBestStreamProvider()` returns null due to capability not yet registered
- **Solution**: Implement retry loop waiting for capability registration completion

#### Stream Capability Test Examples
```typescript
describe('Stream Capability Integration', () => {
  it('should initialize WebSocket connection', async () => {
    await streamCapability.initialize(longportStreamService);
    
    expect(mockLogger.log).toHaveBeenCalledWith(
      expect.stringContaining('LongPort WebSocket 流连接初始化成功')
    );
  });
  
  it('should subscribe to symbols', async () => {
    const symbols = ['700.HK', 'AAPL.US'];
    await streamCapability.subscribe(symbols, longportStreamService);
    
    expect(mockLogger.log).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'LongPort WebSocket 股票报价流订阅成功',
        symbols,
        count: 2,
      })
    );
  });
  
  it('should handle symbol validation', async () => {
    const symbols = ['700.HK', 'INVALID_FORMAT', '09988.HK'];
    
    await streamCapability.subscribe(symbols, longportStreamService);
    
    expect(mockLogger.warn).toHaveBeenCalledWith(
      '发现无效符号格式',
      expect.objectContaining({
        invalidSymbols: ['INVALID_FORMAT'],
      })
    );
  });
});
```

#### Mock LongPort SDK for Testing
```typescript
// Proper LongPort SDK mocking
jest.mock('longport', () => {
  const createMockQuoteContext = () => ({
    subscribe: jest.fn().mockImplementation(() => Promise.resolve()),
    unsubscribe: jest.fn().mockImplementation(() => Promise.resolve()),
    setOnQuote: jest.fn(),
    setOnDepth: jest.fn(),
    // Note: setOnConnected and setOnDisconnected are NOT available in real SDK
  });

  return {
    Config: class MockConfig {
      static fromEnv() { return new MockConfig(); }
    },
    QuoteContext: {
      new: jest.fn().mockImplementation(() => Promise.resolve(createMockQuoteContext()))
    },
    SubType: {
      Quote: 'quote',
      Depth: 'depth',
      Trade: 'trade'
    }
  };
});
```

### Stream Capability Debugging

#### Common Issues and Solutions

**1. `getBestStreamProvider` returns null**
- **Cause**: Stream capabilities not yet registered when test runs
- **Fix**: Add retry mechanism waiting for capability registration

**2. Stream capability not found**
- **Cause**: File naming doesn't match pattern `stream-*.ts`
- **Fix**: Ensure stream capability files start with `stream-` prefix

**3. SDK method not found errors**
- **Cause**: Calling non-existent SDK methods like `setOnConnected`
- **Fix**: Only use methods actually provided by LongPort SDK

**4. Connection state management**
- **Cause**: SDK doesn't provide connection callbacks
- **Fix**: Implement connection state management without SDK callbacks

### Performance Considerations

#### Stream Capability Optimization
- **Symbol Limits**: LongPort has 500 symbol subscription limit
- **Connection Pooling**: Reuse WebSocket connections when possible
- **Error Recovery**: Implement automatic reconnection with exponential backoff
- **Memory Management**: Clean up callbacks and subscriptions properly