Query 是6-component架构中的最后一个组件，作为整个数据处理流程的终点，负责智能数据查询和
  弱时效接口服务，提供统一的数据检索入口。

  数据流向: Storage → **Query** → 用户应用

  📋 核心业务逻辑

  1. 弱时效智能查询引擎 (QueryService:73-130)

  // 专为数据分析和决策支持场景设计
  async executeQuery(request: QueryRequestDto): Promise<QueryResponseDto>

  🧠 智能特性

  - 智能变化检测: 基于关键字段变化检测，避免不必要的数据更新
  - 双存储策略: Redis缓存 + MongoDB持久化，确保数据可靠性
  - 市场感知缓存: 交易时间1分钟缓存，休市时间1小时缓存
  - 版本控制: 数据变化历史追踪，支持回溯分析

  2. 六种查询类型支持 (query-types.dto.ts:1-8)

  enum QueryType {
    BY_SYMBOLS = "by_symbols",      // ✅ 已实现 - 按股票代码查询
    BY_MARKET = "by_market",        // 🚧 框架就绪 - 按市场查询
    BY_PROVIDER = "by_provider",    // 🚧 框架就绪 - 按数据源查询  
    BY_CATEGORY = "by_tag",         // 🚧 框架就绪 - 按分类查询
    BY_TIME_RANGE = "by_time_range", // 🚧 框架就绪 - 历史数据查询
    ADVANCED = "advanced",          // 🚧 框架就绪 - 高级复合查询
  }

  3. 三层数据源架构 (QueryService:276-335)

  // 数据源优先级: 缓存 → 持久化 → 实时
  enum DataSourceType {
    CACHE = "cache",         // Redis缓存 - 最快
    PERSISTENT = "persistent", // MongoDB持久化 - 可靠
    REALTIME = "realtime"    // 实时API - 最新
  }

  🔍 详细字段定义和含义

  QueryRequestDto (query-request.dto.ts:99-214)

  核心查询字段

  queryType: QueryType           // 查询类型 (必填)
  symbols?: string[]             // 股票代码列表 (BY_SYMBOLS查询必填)
  market?: string               // 市场代码 (HK, US, SZ, SH等)
  provider?: string             // 数据提供商 (longport, itick等)
  dataTypeFilter?: string       // 数据类型过滤器 (stock-quote, basic-info等)

  时间范围字段

  startTime?: string            // 开始时间 (ISO格式)
  endTime?: string             // 结束时间 (ISO格式)
  maxAge?: number              // 数据最大年龄秒数 (数据新鲜度控制)
  cacheTTL?: number            // 缓存TTL秒数

  分页控制字段

  limit?: number               // 返回结果数量限制 (1-1000, 默认100)
  offset?: number              // 跳过的结果数量 (默认0)

  高级过滤字段

  queryFilters?: FilterConditionDto[] // 高级过滤条件数组
  querySort?: SortOptionsDto         // 排序选项

  缓存控制字段

  useCache?: boolean           // 是否使用缓存 (默认true)
  options?: {
    useCache?: boolean         // 是否使用缓存
    updateCache?: boolean      // 是否更新缓存 (默认true)
    includeMetadata?: boolean  // 是否包含元数据 (默认false)
    maxCacheAge?: number       // 最大缓存年龄
    queryfields?: string[]          // 包含字段列表
    excludeFields?: string[]   // 排除字段列表
  }

  验证规则

  @ArrayMaxSize(QUERY_PERFORMANCE_CONFIG.MAX_SYMBOLS_PER_QUERY) // 最多100个股票代码
  @NotContains(" ", { each: true }) // 股票代码不能包含空格
  @Min(1) @Max(1000)           // limit范围限制
  @Min(0)                      // offset非负数限制

  QueryResponseDto (query-response.dto.ts:83-112)

  响应数据结构

  data: T[]                    // 查询结果数据数组
  metadata: QueryMetadataDto   // 查询元信息
  pagination?: {               // 分页信息 (可选)
    limit: number             // 当前页大小
    offset: number            // 当前偏移量
    hasMore: boolean          // 是否有更多数据
    nextOffset?: number       // 下一页偏移量
  }

  QueryMetadataDto (query-response.dto.ts:6-76)

  执行统计

  queryType: QueryType         // 执行的查询类型
  totalResults: number         // 找到的总结果数
  returnedResults: number      // 实际返回的结果数
  executionTime: number        // 查询执行时间毫秒数
  cacheUsed: boolean          // 是否使用了缓存
  timestamp: string           // 查询时间戳

  数据源统计

  dataSources: {
    cache: { hits: number; misses: number },    // 缓存命中统计
    realtime: { hits: number; misses: number }  // 实时获取统计
  }

  扩展元数据 (可选)

  queryParams?: {              // 查询参数摘要
    symbols?: string[]         // 查询的股票代码
    market?: string           // 市场
    provider?: string         // 提供商
    dataTypeFilter?: string   // 数据类型
    timeRange?: { start: string; end: string } // 时间范围
    filtersCount?: number     // 过滤器数量
  }

  performance?: {              // 性能分解
    cacheQueryTime: number    // 缓存查询时间
    persistentQueryTime: number // 持久化查询时间
    realtimeQueryTime: number // 实时查询时间
    dataProcessingTime: number // 数据处理时间
  }

  errors?: QueryErrorInfoDto[] // 错误信息列表

  BulkQueryRequestDto (query-request.dto.ts:216-242)

  批量查询控制

  queries: QueryRequestDto[]   // 多个查询请求 (最多100个)
  parallel?: boolean          // 是否并行执行 (默认true)
  continueOnError?: boolean   // 出错时是否继续 (默认true)

  🎯 六种查询类型详细分析

  1. BY_SYMBOLS - 按股票代码查询 ✅ 已实现

  // 用法示例
  {
    "queryType": "by_symbols",
    "symbols": ["AAPL", "MSFT", "700.HK", "000001.SZ"],
    "dataTypeFilter": "stock-quote",
    "options": { "useCache": true }
  }
  适用场景: 投资组合监控、特定股票分析

  2. BY_MARKET - 按市场查询 🚧 框架就绪

  {
    "queryType": "by_market",
    "market": "US",
    "dataTypeFilter": "stock-quote",
    "limit": 50
  }
  适用场景: 市场趋势分析、板块表现对比

  3. BY_PROVIDER - 按数据源查询 🚧 框架就绪

  {
    "queryType": "by_provider",
    "provider": "longport",
    "market": "HK"
  }
  适用场景: 数据源质量对比、数据验证

  4. BY_CATEGORY - 按分类查询 🚧 框架就绪

  {
    "queryType": "by_tag",
    "filters": [
      { "field": "industry", "operator": "eq", "value": "Technology" }
    ]
  }
  适用场景: 行业分析、主题投资

  5. BY_TIME_RANGE - 历史数据查询 🚧 框架就绪

  {
    "queryType": "by_time_range",
    "symbols": ["AAPL"],
    "startTime": "2024-01-01T00:00:00Z",
    "endTime": "2024-01-31T23:59:59Z"
  }
  适用场景: 技术分析、回测验证

  6. ADVANCED - 高级复合查询 🚧 框架就绪

  {
    "queryType": "advanced",
    "filters": [
      { "field": "market", "operator": "in", "value": ["US", "HK"] },
      { "field": "volume", "operator": "gt", "value": 1000000 }
    ],
    "sort": { "field": "changePercent", "direction": "desc" }
  }
  适用场景: 量化选股、复杂筛选

  ⚡ 性能配置和限制

  查询限制 (query.constants.ts:70-81)

  SLOW_QUERY_THRESHOLD_MS: 1000      // 慢查询阈值 (1秒)
  MAX_SYMBOLS_PER_QUERY: 100         // 单次查询最大股票数量
  MAX_BULK_QUERIES: 100              // 最大批量查询数量
  QUERY_TIMEOUT_MS: 30000            // 查询超时时间 (30秒)
  DEFAULT_QUERY_LIMIT: 100           // 默认查询限制
  MAX_QUERY_LIMIT: 1000              // 最大查询限制

  缓存配置 (query.constants.ts:233-240)

  DEFAULT_TTL_SECONDS: 3600          // 默认缓存TTL (1小时)
  MAX_CACHE_AGE_SECONDS: 300         // 最大缓存年龄 (5分钟)
  CACHE_KEY_PREFIX: "query:"         // 缓存键前缀
  MAX_CACHE_KEY_LENGTH: 250          // 最大缓存键长度

  🔧 API接口设计

  权限控制

  @RequirePermissions(Permission.QUERY_EXECUTE)    // 查询执行权限
  @RequirePermissions(Permission.SYSTEM_MONITOR)   // 系统监控权限
  @RequirePermissions(Permission.SYSTEM_HEALTH)    // 系统健康权限

  RESTful端点

  POST /query/execute          // 主要查询接口
  POST /query/bulk            // 批量查询接口
  GET  /query/symbols         // 按代码快速查询 (GET方式)
  GET  /query/market          // 按市场查询
  GET  /query/provider        // 按提供商查询
  GET  /query/stats           // 查询统计信息
  GET  /query/health          // 健康检查

  📊 智能缓存策略

  三层缓存架构

  1. 内存缓存: 应用内存，毫秒级响应
  2. Redis缓存: 分布式缓存，秒级响应
  3. MongoDB持久化: 长期存储，可靠性保证

  市场感知缓存

  // 交易时间: 1分钟缓存TTL
  // 休市时间: 1小时缓存TTL
  // 智能变化检测: 只有关键字段变化时才更新

  缓存键生成策略 (query.service.ts:281-286)

  buildStorageKey(symbol, provider, dataTypeFilter, market)
  // 示例: "AAPL:longport:stock-quote:US"

  🎛️ 与其他组件的集成

  数据流集成模式

  // 1. 缓存优先查询
  if (request.useCache) {
    cachedResult = await tryGetFromCache()
    if (cachedResult) return cachedResult
  }

  // 2. 实时数据获取 (通过DataFetchingService)
  realtimeResult = await fetchFromRealtime()

  // 3. 异步后台更新 (智能变化检测)
  backgroundTaskService.run(() => updateDataInBackground())

  与Storage组件的协作

  // 使用Storage服务进行双存储
  await storageService.storeData({
    key: storageKey,
    data: data,
    storageType: StorageType.BOTH,  // 同时存储到Redis和MongoDB
    dataClassification: dataTypeFilter as DataClassification
  })

  🎯 在6-Component架构中的定位

  Query作为最终组件，是整个数据处理流程的出口：

  完整数据流: Receiver → Symbol-Mapper → Data-Mapper → Transformer → Storage → **Query**

  - 输入: 从Storage组件读取已处理的标准化数据
  - 功能: 智能查询、缓存优化、变化检测、统计分析
  - 输出: 为用户应用提供弱时效的智能数据检索服务

  该组件实现了企业级的智能查询中台，通过变化检测、市场感知缓存和三层存储架构，在保证数据
  准确性的同时提供了高性能的分析级数据服务，是连接底层数据处理和上层业务应用的关键桥梁。

  📈 适用场景总结

  - 投资组合分析与监控: 弱时效但智能的数据获取
  - 市场研究与趋势分析: 支持复杂查询和历史数据
  - 量化策略回测验证: 时间范围查询和高级过滤
  - 风险管理数据支持: 可靠的双存储和变化检测
  - 基本面数据分析: 多维度查询和统计功能

  与Receiver组件的强时效接口形成互补，Query组件专注于分析决策场景，提供更智能、更可靠的数
  据查询服务。
