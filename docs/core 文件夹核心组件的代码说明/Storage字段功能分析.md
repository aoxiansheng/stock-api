Storage 是6-component架构中的第5个组件，负责双层存储策略：Redis缓存 +
  MongoDB持久化，实现高性能数据存储和智能缓存管理。

  📋 核心业务逻辑

  1. 双层存储架构 (StorageService:56-161)

  // 支持三种存储策略
  enum StorageType {
    CACHE = "cache",        // 仅Redis缓存
    PERSISTENT = "persistent", // 仅MongoDB持久化  
    BOTH = "both"          // 同时存储到缓存和数据库
  }

  2. 智能数据压缩 (StorageService:553-587)

  - 自动压缩阈值: 大于1KB的数据自动启用gzip压缩
  - 压缩效率检查: 压缩后必须节省20%以上空间才使用
  - Base64编码: 压缩数据使用Base64编码存储

  3. 检索优先级策略 (StorageService:164-240)

  - 缓存优先: 优先从Redis检索，命中率高，响应快
  - 自动降级: 缓存未命中时自动从MongoDB检索
  - 缓存回写: 支持将数据库数据回写到缓存提升后续访问性能

  🔍 DTO字段定义和含义

  StoreDataDto (storage-request.dto.ts:40-78)

  key: string                    // 唯一存储键 (支持命名空间如"stock:AAPL:quote")
  data: any                     // 业务数据 (任意JSON格式)
  storageType: StorageType      // 存储类型 (CACHE/PERSISTENT/BOTH)
  dataClassification: DataClassification // 数据分类 (STOCK_QUOTE等9种类型)
  provider: string              // 数据提供商 (longport, itick等)
  market: string               // 市场标识 (HK, US, SH, SZ等)
  options?: {
    cacheTtl?: number          // 缓存TTL秒数 (默认3600秒)
    compress?: boolean         // 是否压缩 (大于1KB自动压缩)
    tags?: Record<string, string> // 自定义标签
    priority?: "high" | "normal" | "low" // 操作优先级
  }

  RetrieveDataDto (storage-request.dto.ts:80-99)

  key: string                  // 检索的存储键
  preferredType?: StorageType  // 首选存储类型 (null时先缓存后数据库)
  updateCache?: boolean        // 从数据库检索时是否回写缓存

  StorageResponseDto (storage-response.dto.ts:10-37)

  data: T                      // 检索到的业务数据
  metadata: StorageMetadataDto // 存储元信息
  cacheInfo?: {               // 缓存命中信息
    hit: boolean              // 是否命中
    source: "cache" | "persistent" | "not_found" // 数据来源
    ttlRemaining?: number     // 剩余TTL秒数
  }

  🗃️ 数据分类系统 (storage-type.enum.ts:15-25)

  支持9种业务数据分类:
  STOCK_QUOTE = "stock_quote"           // 股票报价数据
  STOCK_CANDLE = "stock_candle"         // K线数据
  STOCK_TICK = "stock_tick"             // 逐笔成交数据
  FINANCIAL_STATEMENT = "financial_statement" // 财务报表
  COMPANY_PROFILE = "company_profile"    // 公司概况
  MARKET_NEWS = "market_news"           // 市场新闻
  TRADING_ORDER = "trading_order"       // 交易订单
  USER_PORTFOLIO = "user_portfolio"     // 用户投资组合
  GENERAL = "general"                   // 通用分类

  🎯 MongoDB Schema设计 (storage.schema.ts:8-47)

  key: string          // 唯一键 (有索引)
  data: Mixed          // 业务数据 (支持压缩存储)
  dataClassification: string // 数据分类 (有索引)
  provider: string     // 提供商 (有索引) 
  market: string       // 市场 (有索引)
  dataSize: number     // 数据大小字节
  compressed: boolean  // 是否压缩
  tags?: object        // 自定义标签
  expiresAt?: Date     // 过期时间 (TTL索引)
  storedAt: Date       // 存储时间 (有索引)

  ⚡ 性能优化特性

  1. 复合索引优化

  // 查询性能优化索引
  { dataClassification: 1, provider: 1, market: 1 }  // 业务查询
  { storedAt: -1 }                               // 时间排序
  { expiresAt: 1 }                              // TTL过期
  { key: "text" }                               // 文本搜索

  2. 性能阈值监控 (storage.constants.ts:61-68)

  SLOW_STORAGE_MS: 1000      // 慢存储操作阈值 (1秒)
  SLOW_RETRIEVAL_MS: 500     // 慢检索操作阈值 (500毫秒)
  HIGH_ERROR_RATE: 0.05      // 高错误率阈值 (5%)
  LOW_CACHE_HIT_RATE: 0.7    // 低缓存命中率阈值 (70%)
  LARGE_DATA_SIZE_KB: 100    // 大数据阈值 (100KB)

  3. 内存和容量管理

  MAX_KEY_LENGTH: 250        // 最大键长度
  MAX_DATA_SIZE_MB: 16       // 最大数据大小 (16MB)
  MAX_BATCH_SIZE: 1000       // 最大批量操作
  DEFAULT_COMPRESSION_THRESHOLD: 1024 // 压缩阈值 (1KB)

  🔧 API接口设计

  1. 权限控制

  - SYSTEM_ADMIN: 存储、检索、删除操作
  - SYSTEM_MONITOR: 统计信息查看
  - SYSTEM_HEALTH: 健康检查

  2. RESTful端点

  POST /storage/store          // 存储数据
  POST /storage/retrieve       // 检索数据 (请求体)
  GET /storage/retrieve/:key   // 检索数据 (URL参数)
  DELETE /storage/:key         // 删除数据
  GET /storage/stats          // 统计信息
  POST /storage/health-check  // 健康检查

  📊 统计和监控功能

  StorageStatsDto结构

  cache: {
    totalKeys: number           // 缓存键总数
    totalMemoryUsage: number    // 内存使用量
    hitRate: number            // 命中率
    avgTtl: number             // 平均TTL
  }
  persistent: {
    totalDocuments: number      // 文档总数
    totalSizeBytes: number      // 存储总大小
    categoriesCounts: object    // 分类统计
    providerCounts: object      // 提供商统计
  }
  performance: {
    avgStorageTime: number      // 平均存储时间
    avgRetrievalTime: number    // 平均检索时间  
    operationsPerSecond: number // 每秒操作数
    errorRate: number          // 错误率
  }

  🏥 健康检查机制

  自动测试存储系统健康状态：
  1. Redis缓存测试: 存储→检索→删除完整流程
  2. MongoDB测试: 持久化存储完整流程
  3. 性能指标: 测量延迟和可用性
  4. 自动清理: 测试数据自动清理

  🎯 在6-Component架构中的定位

  Storage作为第5个组件，承接Transform组件的处理结果，为Query组件提供数据检索服务：

  数据流向: Transformer → **Storage** → Query

  - 输入: 来自Transformer的标准化数据
  - 功能: 双层存储、压缩优化、缓存管理
  - 输出: 为Query组件提供高性能数据检索服务

  该组件实现了企业级的数据存储中台，通过Redis+MongoDB的双层架构，在保证数据持久性的同时实
  现了毫秒级的数据访问性能。