# 新股票API - 数据规范

**版本：** 2.0
**日期：** 2025-07-28
**状态：** 生产就绪

## 文档概述

本文档定义了新股票API系统的全面数据规范，包括数据模型、模式、转换规则、验证要求和数据流模式。v2.0版本新增了告警、监控、安全、缓存等增强模块的数据结构，构建了完整的企业级数据管理体系。

## 1. 数据架构概述

### 1.1 数据分类系统
```typescript
enum DataClassification {
  // 核心数据类型
  STOCK_QUOTE = "stock-quote",              // 实时价格和交易数据
  STOCK_BASIC_INFO = "stock-basic-info",    // 公司基本信息
  INDEX_QUOTE = "index-quote",              // 指数行情数据 (新增)
  MARKET_STATUS = "market-status",          // 交易时间和市场状态
  HISTORICAL_DATA = "historical-data",      // 历史价格和交易量数据
  
  // 映射配置数据
  SYMBOL_MAPPING = "symbol-mapping",        // 跨提供商符号映射
  FIELD_MAPPING = "field-mapping",          // 数据转换规则
  
  // 增强模块数据 (新增)
  ALERT_DATA = "alert-data",                // 告警规则和历史数据
  METRICS_DATA = "metrics-data",            // 性能监控指标数据
  SECURITY_AUDIT = "security-audit",        // 安全审计日志数据
  CACHE_METADATA = "cache-metadata",        // 缓存元数据和统计
  NOTIFICATION_LOG = "notification-log",    // 通知发送日志
  PERFORMANCE_LOG = "performance-log"       // 性能追踪日志
}
```

### 1.2 数据流架构
```typescript
interface DataFlowArchitecture {
  ingestion: '提供商 API → 原始数据缓冲区';
  transformation: '原始数据 → 符号映射 → 字段映射 → 转换后的数据';
  storage: '转换后的数据 → Redis 缓存 → MongoDB 持久化';
  retrieval: '缓存 → 数据库 → 提供商 (回退链)';
  delivery: '标准化响应格式 → 客户端应用程序';
}
```

### 1.3 数据质量框架
```typescript
interface DataQualityFramework {
  completeness: '所有必需字段存在且非空';
  consistency: '数据格式与跨提供商的规范匹配';
  accuracy: '根据已知数据模式和范围进行验证';
  timeliness: '包含时间戳和新鲜度指标';
  validity: '数据类型和格式符合模式定义';
}
```

## 2. 核心数据模型

### 2.1 指数行情数据模型 (新增)
```typescript
interface IndexQuoteData {
  // 身份字段
  symbol: string;                    // 指数代码 (例如, "HSI", "SPX")
  indexName: string;                 // 指数名称
  market: Market;                    // 市场标识符
  provider: string;                  // 数据源提供商

  // 指数价格字段
  lastValue: number;                 // 最新指数值
  openValue: number;                 // 开盘指数值
  closeValue: number;                // 前一交易日收盘值
  highValue: number;                 // 日内最高值
  lowValue: number;                  // 日内最低值

  // 变化字段
  changeAmount: number;              // 相对于前一收盘的绝对变化
  changePercent: number;             // 相对于前一收盘的百分比变化

  // 成分股统计
  totalStocks: number;               // 成分股总数
  advancingStocks: number;           // 上涨股票数
  decliningStocks: number;           // 下跌股票数
  unchangedStocks: number;           // 不变股票数

  // 交易活动
  totalVolume?: number;              // 成分股总成交量
  totalTurnover?: number;            // 成分股总成交额
  
  // 元数据字段
  timestamp: string;                 // 数据时间戳 (ISO 8601)
  currency: string;                  // 计价货币代码
  tradingStatus: TradingStatus;      // 当前交易状态
  dataQuality: DataQualityScore;     // 质量评估
}
```

### 2.2 股票行情数据模型
```typescript
interface StockQuoteData {
  // 身份字段
  symbol: string;                    // 标准符号格式 (例如, "700.HK")
  market: Market;                    // 市场标识符
  provider: string;                  // 数据源提供商

  // 价格字段
  lastPrice: number;                 // 最新交易价格
  openPrice: number;                 // 交易日开盘价
  closePrice: number;                // 前一交易日收盘价
  highPrice: number;                 // 交易日最高价
  lowPrice: number;                  // 交易日最低价

  // 买/卖字段
  bidPrice: number;                  // 最佳买入价
  askPrice: number;                  // 最佳卖出价
  bidSize: number;                   // 买入数量
  askSize: number;                   // 卖出数量

  // 变化字段
  changeAmount: number;              // 相对于前一收盘价的绝对价格变化
  changePercent: number;             // 相对于前一收盘价的百分比变化

  // 交易量字段
  volume: number;                    // 总交易股数
  turnover: number;                  // 总交易额
  avgVolume: number;                 // 期间平均交易量

  // 交易时段字段
  preMarketPrice?: number;           // 盘前交易价格
  afterMarketPrice?: number;         // 盘后交易价格

  // 市场数据字段
  marketCap?: number;                // 市值
  peRatio?: number;                  // 市盈率
  pbRatio?: number;                  // 市净率
  eps?: number;                      // 每股收益

  // 元数据字段
  timestamp: string;                 // 数据时间戳 (ISO 8601)
  tradingStatus: TradingStatus;      // 当前交易状态
  currency: string;                  // 价格货币代码
  dataQuality: DataQualityScore;     // 质量评估
}

enum TradingStatus {
  NORMAL = "normal",                 // 正常交易
  SUSPENDED = "suspended",           // 交易暂停
  HALTED = "halted",                // 交易停止
  PRE_MARKET = "pre-market",        // 盘前交易时段
  AFTER_HOURS = "after-hours",      // 盘后交易时段
  CLOSED = "closed"                 // 市场关闭
}

interface DataQualityScore {
  score: number;                    // 0-100 质量分数
  completeness: number;             // 字段填充百分比
  freshness: number;                // 自上次更新以来的秒数
  accuracy: number;                 // 验证分数
}
```

### 2.2 股票基本信息数据模型
```typescript
interface StockBasicInfoData {
  // 身份字段
  symbol: string;                   // 标准符号格式
  market: Market;                   // 市场标识符
  provider: string;                 // 数据源提供商

  // 公司信息
  companyName: string;              // 公司全称
  shortName: string;                // 公司简称
  description?: string;             // 公司描述

  // 分类字段
  sector: string;                   // 行业板块
  industry: string;                 // 具体行业
  subIndustry?: string;            // 子行业分类

  // 公司详情
  foundedYear?: number;             // 公司成立年份
  headquarters?: string;            // 总部所在地
  website?: string;                 // 公司网站 URL

  // 交易信息
  listingDate: string;              // 股票上市日期 (ISO 8601)
  tradingCurrency: string;          // 交易货币代码
  lotSize: number;                  // 最小交易单位

  // 财务指标
  totalShares: number;              // 总股本
  floatShares: number;              // 流通股本
  marketCap: number;                // 市值

  // 交易所信息
  exchange: string;                 // 主要交易所
  exchangeCode: string;             // 交易所标识代码
  timezone: string;                 // 交易时区

  // 状态字段
  status: ListingStatus;            // 当前上市状态

  // 元数据字段
  timestamp: string;                // 数据时间戳 (ISO 8601)
  dataQuality: DataQualityScore;    // 质量评估
}

enum ListingStatus {
  ACTIVE = "active",                // 活跃交易
  SUSPENDED = "suspended",          // 交易暂停
  DELISTED = "delisted",           // 从交易所退市
  PENDING = "pending"              // 待上市
}
```

### 2.3 市场状态数据模型
```typescript
interface MarketStatusData {
  // 市场身份
  market: Market;                   // 市场标识符
  marketName: string;               // 人类可读的市场名称
  timezone: string;                 // 市场时区

  // 交易时间表
  tradingHours: TradingHours;       // 常规交易时间
  extendedHours?: TradingHours;     // 延长交易时间

  // 当前状态
  currentStatus: MarketStatus;      // 当前市场状态
  nextStatusChange: string;         // 下次状态变化时间 (ISO 8601)

  // 交易日信息
  tradingDate: string;              // 当前交易日期 (YYYY-MM-DD)
  isHoliday: boolean;              // 节假日指示器
  holidayName?: string;            // 节假日名称 (如果适用)

  // 市场表现
  totalVolume?: number;            // 总市场交易量
  advancingStocks?: number;        // 上涨股票数量
  decliningStocks?: number;        // 下跌股票数量
  unchangedStocks?: number;        // 不变股票数量

  // 元数据
  timestamp: string;               // 数据时间戳 (ISO 8601)
  provider: string;               // 数据源提供商
}

interface TradingHours {
  open: string;                    // 开盘时间 (HH:MM 格式)
  close: string;                   // 收盘时间 (HH:MM 格式)
  timezone: string;                // 时区标识符
}

enum MarketStatus {
  OPEN = "open",                   // 市场开放交易
  CLOSED = "closed",               // 市场关闭
  PRE_MARKET = "pre-market",       // 盘前交易时段
  AFTER_HOURS = "after-hours",     // 盘后交易时段
  HOLIDAY = "holiday",             // 市场假日
  WEEKEND = "weekend"              // 周末休市
}
```

## 2.4 增强模块数据模型 (新增)

### 2.4.1 告警规则数据模型
```typescript
interface AlertRuleData {
  // 规则标识
  id: string;                        // 唯一告警规则ID
  name: string;                      // 规则名称
  description?: string;              // 规则描述

  // 告警条件
  metric: string;                    // 监控指标名称
  operator: AlertOperator;           // 比较操作符
  threshold: number;                 // 告警阈值
  severity: AlertSeverity;           // 告警严重级别

  // 通知配置
  channels: NotificationChannel[];   // 通知渠道列表
  cooldown: number;                  // 冷却时间 (秒)
  
  // 状态和元数据
  isActive: boolean;                 // 规则激活状态
  createdAt: string;                 // 创建时间 (ISO 8601)
  updatedAt: string;                 // 最后更新时间
  createdBy: string;                 // 创建者ID
  
  // 统计信息
  triggerCount: number;              // 触发次数
  lastTriggered?: string;            // 最后触发时间
}

enum AlertOperator {
  GT = "gt",                         // 大于
  LT = "lt",                         // 小于
  EQ = "eq",                         // 等于
  GTE = "gte",                       // 大于等于
  LTE = "lte",                       // 小于等于
  NEQ = "neq"                        // 不等于
}

enum AlertSeverity {
  LOW = "low",                       // 低级别告警
  MEDIUM = "medium",                 // 中级别告警
  HIGH = "high",                     // 高级别告警
  CRITICAL = "critical"              // 紧急告警
}

enum NotificationChannel {
  EMAIL = "email",                   // 邮件通知
  SMS = "sms",                       // 短信通知
  WEBHOOK = "webhook",               // Webhook 通知
  SLACK = "slack",                   // Slack 通知
  DINGTALK = "dingtalk"              // 钉钉通知
}
```

### 2.4.2 告警历史数据模型
```typescript
interface AlertHistoryData {
  // 告警标识
  id: string;                        // 告警历史记录ID
  ruleId: string;                    // 关联的规则ID
  ruleName: string;                  // 规则名称快照
  
  // 告警详情
  metric: string;                    // 触发的指标名称
  actualValue: number;               // 实际监控值
  threshold: number;                 // 告警阈值
  operator: AlertOperator;           // 比较操作符
  severity: AlertSeverity;           // 告警严重级别
  
  // 时间信息
  triggeredAt: string;               // 告警触发时间 (ISO 8601)
  resolvedAt?: string;               // 告警解决时间
  duration?: number;                 // 告警持续时间 (秒)
  
  // 通知状态
  notificationsSent: NotificationStatus[]; // 各渠道通知状态
  
  // 上下文信息
  context?: Record<string, any>;     // 额外上下文数据
  message: string;                   // 告警消息内容
}

interface NotificationStatus {
  channel: NotificationChannel;      // 通知渠道
  status: "sent" | "failed" | "pending"; // 发送状态
  sentAt?: string;                   // 发送时间
  error?: string;                    // 错误信息 (如果失败)
}
```

### 2.4.3 性能监控数据模型
```typescript
interface PerformanceMetricsData {
  // 指标标识
  id: string;                        // 指标记录ID
  metricName: string;                // 指标名称
  metricType: MetricType;            // 指标类型
  
  // 指标数值
  value: number;                     // 指标值
  unit: string;                      // 单位 (ms, %, count, bytes)
  
  // 维度标签
  labels: Record<string, string>;    // 指标标签 (service, endpoint, method等)
  
  // 时间信息
  timestamp: string;                 // 指标采集时间 (ISO 8601)
  timeWindow: number;                // 时间窗口 (秒)
  
  // 统计信息
  samples: number;                   // 样本数量
  min?: number;                      // 最小值
  max?: number;                      // 最大值
  avg?: number;                      // 平均值
  p50?: number;                      // 50分位数
  p95?: number;                      // 95分位数
  p99?: number;                      // 99分位数
  
  // 健康状态
  healthScore: number;               // 健康评分 (0-100)
  status: HealthStatus;              // 健康状态
}

enum MetricType {
  RESPONSE_TIME = "response_time",   // 响应时间
  THROUGHPUT = "throughput",         // 吞吐量
  ERROR_RATE = "error_rate",         // 错误率
  CPU_USAGE = "cpu_usage",           // CPU使用率
  MEMORY_USAGE = "memory_usage",     // 内存使用率
  DISK_USAGE = "disk_usage",         // 磁盘使用率
  CACHE_HIT_RATE = "cache_hit_rate", // 缓存命中率
  DB_QUERY_TIME = "db_query_time",   // 数据库查询时间
  API_LATENCY = "api_latency"        // API延迟
}

enum HealthStatus {
  HEALTHY = "healthy",               // 健康
  WARNING = "warning",               // 告警
  CRITICAL = "critical",             // 严重
  UNKNOWN = "unknown"                // 未知状态
}
```

### 2.4.4 安全审计数据模型
```typescript
interface SecurityAuditData {
  // 审计标识
  id: string;                        // 审计记录ID
  eventType: SecurityEventType;      // 安全事件类型
  
  // 事件详情
  eventName: string;                 // 事件名称
  description: string;               // 事件描述
  severity: SecuritySeverity;        // 安全级别
  
  // 用户和会话信息
  userId?: string;                   // 用户ID
  username?: string;                 // 用户名
  sessionId?: string;                // 会话ID
  userAgent?: string;                // 用户代理
  
  // 网络信息
  sourceIP: string;                  // 源IP地址
  targetResource: string;            // 目标资源
  httpMethod?: string;               // HTTP方法
  endpoint?: string;                 // API端点
  
  // 结果和状态
  result: AuditResult;               // 审计结果
  statusCode?: number;               // HTTP状态码
  errorMessage?: string;             // 错误消息
  
  // 时间信息
  timestamp: string;                 // 事件发生时间 (ISO 8601)
  duration?: number;                 // 操作持续时间 (毫秒)
  
  // 风险评估
  riskScore: number;                 // 风险评分 (0-100)
  threatLevel: ThreatLevel;          // 威胁级别
  
  // 额外数据
  metadata?: Record<string, any>;    // 额外元数据
  tags: string[];                    // 标签列表
}

enum SecurityEventType {
  AUTHENTICATION = "authentication", // 身份认证事件
  AUTHORIZATION = "authorization",   // 授权访问事件
  DATA_ACCESS = "data_access",       // 数据访问事件
  API_ABUSE = "api_abuse",           // API滥用事件
  VULNERABILITY = "vulnerability",   // 漏洞扫描事件
  INTRUSION = "intrusion",           // 入侵检测事件
  CONFIG_CHANGE = "config_change"    // 配置变更事件
}

enum SecuritySeverity {
  INFO = "info",                     // 信息级别
  LOW = "low",                       // 低风险
  MEDIUM = "medium",                 // 中风险
  HIGH = "high",                     // 高风险
  CRITICAL = "critical"              // 严重风险
}

enum AuditResult {
  SUCCESS = "success",               // 操作成功
  FAILURE = "failure",               // 操作失败
  BLOCKED = "blocked",               // 操作被阻止
  SUSPICIOUS = "suspicious"          // 可疑操作
}

enum ThreatLevel {
  NONE = "none",                     // 无威胁
  LOW = "low",                       // 低威胁
  MEDIUM = "medium",                 // 中威胁
  HIGH = "high",                     // 高威胁
  CRITICAL = "critical"              // 严重威胁
}
```

### 2.4.5 缓存元数据模型
```typescript
interface CacheMetadataData {
  // 缓存标识
  key: string;                       // 缓存键名
  keyPattern: string;                // 键名模式
  namespace: string;                 // 命名空间
  
  // 缓存内容
  dataClassification: DataClassification;      // 缓存数据类型
  contentSize: number;               // 内容大小 (字节)
  compressionRatio?: number;         // 压缩比例
  
  // 时间信息
  createdAt: string;                 // 创建时间 (ISO 8601)
  lastAccessed: string;              // 最后访问时间
  expiresAt?: string;                // 过期时间
  ttl: number;                       // 生存时间 (秒)
  
  // 访问统计
  hitCount: number;                  // 命中次数
  missCount: number;                 // 未命中次数
  hitRate: number;                   // 命中率 (0-100)
  
  // 性能指标
  avgAccessTime: number;             // 平均访问时间 (毫秒)
  lastAccessTime: number;            // 最后访问时间 (毫秒)
  
  // 缓存策略
  evictionPolicy: EvictionPolicy;    // 淘汰策略
  priority: CachePriority;           // 缓存优先级
  
  // 元数据
  tags: string[];                    // 缓存标签
  metadata?: Record<string, any>;    // 额外元数据
}

enum EvictionPolicy {
  LRU = "lru",                       // 最近最少使用
  LFU = "lfu",                       // 最少使用频率
  TTL = "ttl",                       // 基于时间过期
  FIFO = "fifo"                      // 先进先出
}

enum CachePriority {
  LOW = "low",                       // 低优先级
  NORMAL = "normal",                 // 普通优先级
  HIGH = "high",                     // 高优先级
  CRITICAL = "critical"              // 关键优先级
}
```

### 2.4.6 通知日志数据模型
```typescript
interface NotificationLogData {
  // 通知标识
  id: string;                        // 通知记录ID
  type: NotificationType;            // 通知类型
  
  // 通知内容
  title: string;                     // 通知标题
  message: string;                   // 通知内容
  priority: NotificationPriority;    // 通知优先级
  
  // 发送信息
  channel: NotificationChannel;      // 发送渠道
  recipient: string;                 // 接收者标识
  sender: string;                    // 发送者标识
  
  // 状态跟踪
  status: NotificationStatus2;       // 发送状态
  sentAt?: string;                   // 发送时间 (ISO 8601)
  deliveredAt?: string;              // 送达时间
  readAt?: string;                   // 阅读时间
  
  // 重试机制
  retryCount: number;                // 重试次数
  maxRetries: number;                // 最大重试次数
  nextRetryAt?: string;              // 下次重试时间
  
  // 错误信息
  errorCode?: string;                // 错误代码
  errorMessage?: string;             // 错误详情
  
  // 上下文数据
  source: string;                    // 通知来源
  correlationId?: string;            // 关联ID
  metadata?: Record<string, any>;    // 额外元数据
  
  // 时间戳
  createdAt: string;                 // 创建时间 (ISO 8601)
  updatedAt: string;                 // 更新时间
}

enum NotificationType {
  ALERT = "alert",                   // 告警通知
  SYSTEM = "system",                 // 系统通知
  SECURITY = "security",             // 安全通知
  MAINTENANCE = "maintenance",       // 维护通知
  MARKETING = "marketing"            // 营销通知
}

enum NotificationPriority {
  LOW = "low",                       // 低优先级
  NORMAL = "normal",                 // 普通优先级
  HIGH = "high",                     // 高优先级
  URGENT = "urgent"                  // 紧急优先级
}

enum NotificationStatus2 {
  PENDING = "pending",               // 待发送
  SENDING = "sending",               // 发送中
  SENT = "sent",                     // 已发送
  DELIVERED = "delivered",           // 已送达
  READ = "read",                     // 已阅读
  FAILED = "failed",                 // 发送失败
  CANCELLED = "cancelled"            // 已取消
}
```

### 2.4.7 性能追踪日志数据模型
```typescript
interface PerformanceLogData {
  // 追踪标识
  traceId: string;                   // 链路追踪ID
  spanId: string;                    // 跨度ID
  parentSpanId?: string;             // 父跨度ID
  
  // 操作信息
  operationName: string;             // 操作名称
  serviceName: string;               // 服务名称
  endpoint: string;                  // API端点
  httpMethod: string;                // HTTP方法
  
  // 时间信息
  startTime: string;                 // 开始时间 (ISO 8601)
  endTime: string;                   // 结束时间
  duration: number;                  // 持续时间 (毫秒)
  
  // 请求响应信息
  requestSize: number;               // 请求大小 (字节)
  responseSize: number;              // 响应大小 (字节)
  statusCode: number;                // HTTP状态码
  
  // 性能指标
  cpuTime?: number;                  // CPU时间 (毫秒)
  memoryUsage?: number;              // 内存使用 (字节)
  dbQueryTime?: number;              // 数据库查询时间 (毫秒)
  cacheAccessTime?: number;          // 缓存访问时间 (毫秒)
  
  // 错误信息
  error?: boolean;                   // 是否有错误
  errorType?: string;                // 错误类型
  errorMessage?: string;             // 错误消息
  stackTrace?: string;               // 堆栈跟踪
  
  // 标签和元数据
  tags: Record<string, string>;      // 标签键值对
  annotations: TraceAnnotation[];    // 注释列表
  metadata?: Record<string, any>;    // 额外元数据
}

interface TraceAnnotation {
  timestamp: string;                 // 注释时间戳
  value: string;                     // 注释内容
  endpoint?: string;                 // 相关端点
}
```

## 3. MongoDB 数据库模式

### 3.1 核心数据集合

#### 3.1.1 股票报价集合 (stock_quotes)
```typescript
interface StockQuoteDocument {
  _id: ObjectId;
  symbol: string;                    // 索引字段
  market: string;                    // 索引字段
  provider: string;                  // 索引字段
  
  // 报价数据
  quote: StockQuoteData;             // 嵌入的报价数据
  
  // 索引和查询字段
  createdAt: Date;                   // 创建时间索引
  updatedAt: Date;                   // 更新时间索引
  dataClassification: string;        // 数据分类索引
  
  // TTL 索引
  expiresAt: Date;                   // 数据过期时间
}

// 索引配置
db.stock_quotes.createIndex({ symbol: 1, market: 1 });
db.stock_quotes.createIndex({ provider: 1, createdAt: -1 });
db.stock_quotes.createIndex({ dataClassification: 1 });
db.stock_quotes.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
```

#### 3.1.2 股票基本信息集合 (stock_basic_info)
```typescript
interface StockBasicInfoDocument {
  _id: ObjectId;
  symbol: string;                    // 唯一索引
  market: string;
  provider: string;
  
  // 基本信息数据
  basicInfo: StockBasicInfoData;     // 嵌入的基本信息
  
  // 元数据
  createdAt: Date;
  updatedAt: Date;
  dataClassification: string;
  
  // 搜索字段
  searchKeywords: string[];          // 公司名称搜索关键词
}

// 索引配置
db.stock_basic_info.createIndex({ symbol: 1 }, { unique: true });
db.stock_basic_info.createIndex({ "basicInfo.companyName": "text" });
db.stock_basic_info.createIndex({ "basicInfo.sector": 1, "basicInfo.industry": 1 });
```

#### 3.1.3 指数报价集合 (index_quotes)
```typescript
interface IndexQuoteDocument {
  _id: ObjectId;
  symbol: string;                    // 指数代码
  market: string;
  provider: string;
  
  // 指数数据
  quote: IndexQuoteData;             // 嵌入的指数报价数据
  
  // 元数据
  createdAt: Date;
  updatedAt: Date;
  dataClassification: string;
  expiresAt: Date;
}

// 索引配置
db.index_quotes.createIndex({ symbol: 1, market: 1 });
db.index_quotes.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
```

### 3.2 增强模块集合

#### 3.2.1 告警规则集合 (alert_rules)
```typescript
interface AlertRuleDocument {
  _id: ObjectId;
  ruleId: string;                    // 业务ID，唯一索引
  name: string;
  
  // 告警配置
  config: AlertRuleData;             // 嵌入的告警规则数据
  
  // 状态跟踪
  isActive: boolean;                 // 激活状态索引
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;                 // 创建者索引
  
  // 统计字段
  triggerCount: number;              // 触发次数
  lastTriggered?: Date;              // 最后触发时间
}

// 索引配置
db.alert_rules.createIndex({ ruleId: 1 }, { unique: true });
db.alert_rules.createIndex({ isActive: 1, "config.metric": 1 });
db.alert_rules.createIndex({ createdBy: 1, createdAt: -1 });
```

#### 3.2.2 告警历史集合 (alert_history)
```typescript
interface AlertHistoryDocument {
  _id: ObjectId;
  alertId: string;                   // 告警ID
  ruleId: string;                    // 规则ID索引
  
  // 告警数据
  alert: AlertHistoryData;           // 嵌入的告警历史数据
  
  // 时间索引
  triggeredAt: Date;                 // 触发时间索引
  resolvedAt?: Date;                 // 解决时间索引
  
  // 查询字段
  severity: string;                  // 严重级别索引
  status: string;                    // 状态索引 (active, resolved)
}

// 索引配置
db.alert_history.createIndex({ ruleId: 1, triggeredAt: -1 });
db.alert_history.createIndex({ severity: 1, status: 1 });
db.alert_history.createIndex({ triggeredAt: -1 });
```

#### 3.2.3 性能指标集合 (performance_metrics)
```typescript
interface PerformanceMetricsDocument {
  _id: ObjectId;
  metricId: string;
  metricName: string;                // 指标名称索引
  
  // 指标数据
  metrics: PerformanceMetricsData;   // 嵌入的性能指标数据
  
  // 时间序列索引
  timestamp: Date;                   // 时间戳索引
  timeWindow: number;                // 时间窗口
  
  // 标签索引
  labels: Record<string, string>;    // 维度标签
  
  // TTL
  expiresAt: Date;                   // 指标数据过期时间
}

// 索引配置
db.performance_metrics.createIndex({ metricName: 1, timestamp: -1 });
db.performance_metrics.createIndex({ "labels.service": 1, "labels.endpoint": 1 });
db.performance_metrics.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
```

#### 3.2.4 安全审计集合 (security_audit)
```typescript
interface SecurityAuditDocument {
  _id: ObjectId;
  eventId: string;                   // 事件ID
  eventType: string;                 // 事件类型索引
  
  // 审计数据
  audit: SecurityAuditData;          // 嵌入的安全审计数据
  
  // 查询索引
  timestamp: Date;                   // 时间索引
  sourceIP: string;                  // 源IP索引
  userId?: string;                   // 用户ID索引
  severity: string;                  // 严重级别索引
  riskScore: number;                 // 风险评分索引
  
  // TTL
  expiresAt: Date;                   // 审计日志过期时间
}

// 索引配置
db.security_audit.createIndex({ eventType: 1, timestamp: -1 });
db.security_audit.createIndex({ sourceIP: 1, timestamp: -1 });
db.security_audit.createIndex({ userId: 1, timestamp: -1 });
db.security_audit.createIndex({ severity: 1, riskScore: -1 });
db.security_audit.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
```

### 3.3 配置和映射集合

#### 3.3.1 数据映射规则集合 (data_mapping_rules)
```typescript
interface DataMappingRuleDocument {
  _id: ObjectId;
  ruleId: string;                    // 规则ID，唯一索引
  name: string;
  provider: string;                  // 提供商索引
  ruleType: string;                  // 规则类型索引
  
  // 映射配置
  mappings: DataMappingRule[];       // 字段映射规则数组
  
  // 元数据
  version: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

// 索引配置
db.data_mapping_rules.createIndex({ ruleId: 1 }, { unique: true });
db.data_mapping_rules.createIndex({ provider: 1, ruleType: 1 });
db.data_mapping_rules.createIndex({ isActive: 1 });
```

#### 3.3.2 符号映射集合 (symbol_mappings)
```typescript
interface SymbolMappingDocument {
  _id: ObjectId;
  mappingId: string;                 // 映射ID，唯一索引
  
  // 符号映射
  sourceSymbol: string;              // 源符号索引
  targetSymbol: string;              // 目标符号索引
  sourceProvider: string;            // 源提供商
  targetProvider: string;            // 目标提供商
  market: string;                    // 市场索引
  
  // 元数据
  isActive: boolean;
  confidence: number;                // 映射置信度
  createdAt: Date;
  updatedAt: Date;
}

// 索引配置
db.symbol_mappings.createIndex({ mappingId: 1 }, { unique: true });
db.symbol_mappings.createIndex({ sourceSymbol: 1, sourceProvider: 1 });
db.symbol_mappings.createIndex({ targetSymbol: 1, targetProvider: 1 });
db.symbol_mappings.createIndex({ market: 1, isActive: 1 });
```

---

**文档版本**: v2.0  
**最后更新**: 2025-07-28  
**文档状态**: 生产就绪

本文档全面定义了新股票API系统的数据规范，包括核心数据模型、增强模块数据结构、数据库模式设计、缓存架构、数据生命周期管理、安全合规要求和质量监控机制。该规范为系统的数据处理提供了标准化的指导原则，确保数据的一致性、完整性和可靠性。
  GTE = "gte",                       // 大于等于
  LTE = "lte",                       // 小于等于
  NE = "ne"                          // 不等于
}

enum AlertSeverity {
  CRITICAL = "critical",             // 严重
  HIGH = "high",                     // 高
  MEDIUM = "medium",                 // 中
  LOW = "low"                        // 低
}

enum NotificationChannel {
  EMAIL = "email",                   // 邮件通知
  SLACK = "slack",                   // Slack通知
  DINGTALK = "dingtalk",            // 钉钉通知
  WEBHOOK = "webhook",               // Webhook通知
  LOG = "log"                        // 日志记录
}
```

### 2.4.2 告警历史数据模型
```typescript
interface AlertHistoryData {
  // 告警标识
  id: string;                        // 唯一告警历史ID
  ruleId: string;                    // 关联的告警规则ID
  ruleName: string;                  // 告警规则名称

  // 告警详情
  severity: AlertSeverity;           // 告警严重级别
  message: string;                   // 告警消息内容
  triggeredAt: string;               // 触发时间 (ISO 8601)
  
  // 告警数据
  actualValue: number;               // 实际监控值
  threshold: number;                 // 告警阈值
  metric: string;                    // 触发的指标

  // 状态跟踪
  status: AlertStatus;               // 告警状态
  acknowledgedAt?: string;           // 确认时间
  acknowledgedBy?: string;           // 确认者ID
  resolvedAt?: string;               // 解决时间
  
  // 通知记录
  notificationAttempts: number;      // 通知尝试次数
  successfulNotifications: string[]; // 成功的通知渠道
  failedNotifications: string[];     // 失败的通知渠道
}

enum AlertStatus {
  FIRING = "firing",                 // 正在告警
  ACKNOWLEDGED = "acknowledged",     // 已确认
  RESOLVED = "resolved",             // 已解决
  EXPIRED = "expired"                // 已过期
}
```

### 2.4.3 性能指标数据模型
```typescript
interface PerformanceMetricsData {
  // 时间戳和标识
  timestamp: string;                 // 指标时间戳 (ISO 8601)
  metricType: MetricType;           // 指标类型
  
  // API性能指标
  apiMetrics?: {
    endpoint: string;                // API端点
    method: string;                  // HTTP方法
    responseTime: number;            // 响应时间 (毫秒)
    statusCode: number;              // HTTP状态码
    success: boolean;                // 请求成功标志
    userAgent?: string;              // 用户代理
    clientIP?: string;               // 客户端IP
  };
  
  // 数据库性能指标
  databaseMetrics?: {
    queryType: string;               // 查询类型
    collection: string;              // 集合名称
    duration: number;                // 查询时长 (毫秒)
    success: boolean;                // 查询成功标志
    recordsAffected?: number;        // 影响记录数
  };
  
  // 缓存性能指标
  cacheMetrics?: {
    operation: string;               // 缓存操作类型
    key: string;                     // 缓存键
    hit: boolean;                    // 缓存命中标志
    duration?: number;               // 操作时长 (毫秒)
    dataSize?: number;               // 数据大小 (字节)
  };
  
  // 系统资源指标
  systemMetrics?: {
    cpuUsage: number;                // CPU使用率 (0-1)
    memoryUsage: number;             // 内存使用率 (0-1)
    heapUsed: number;                // 堆内存使用 (字节)
    eventLoopDelay: number;          // 事件循环延迟 (毫秒)
  };
}

enum MetricType {
  API_REQUEST = "api_request",       // API请求指标
  DATABASE_QUERY = "database_query", // 数据库查询指标
  CACHE_OPERATION = "cache_operation", // 缓存操作指标
  SYSTEM_RESOURCE = "system_resource", // 系统资源指标
  PROVIDER_CALL = "provider_call"    // 提供商调用指标
}
```

### 2.4.4 安全审计数据模型
```typescript
interface SecurityAuditData {
  // 事件标识
  eventId: string;                   // 唯一事件ID
  eventType: SecurityEventType;      // 安全事件类型
  severity: SecuritySeverity;        // 事件严重级别
  
  // 时间和位置
  timestamp: string;                 // 事件时间 (ISO 8601)
  clientIP: string;                  // 客户端IP地址
  userAgent?: string;                // 用户代理字符串
  
  // 用户和会话
  userId?: string;                   // 用户ID (如果已认证)
  sessionId?: string;                // 会话ID
  apiKeyId?: string;                 // API密钥ID (如果使用API密钥)
  
  // 请求详情
  endpoint?: string;                 // 访问的API端点
  method?: string;                   // HTTP方法
  requestId?: string;                // 请求追踪ID
  
  // 事件结果
  outcome: SecurityOutcome;          // 事件结果
  riskScore: number;                 // 风险评分 (0-100)
  
  // 事件详情
  details: {
    reason?: string;                 // 事件原因
    action?: string;                 // 执行的操作
    resource?: string;               // 访问的资源
    attemptCount?: number;           // 尝试次数
    additionalInfo?: Record<string, any>; // 额外信息
  };
}

enum SecurityEventType {
  AUTHENTICATION = "authentication", // 认证事件
  AUTHORIZATION = "authorization",   // 授权事件
  DATA_ACCESS = "data_access",       // 数据访问事件
  API_ABUSE = "api_abuse",           // API滥用事件
  SECURITY_SCAN = "security_scan",   // 安全扫描事件
  CONFIGURATION_CHANGE = "configuration_change" // 配置变更事件
}

enum SecuritySeverity {
  CRITICAL = "critical",             // 严重
  HIGH = "high",                     // 高
  MEDIUM = "medium",                 // 中
  LOW = "low",                       // 低
  INFO = "info"                      // 信息
}

enum SecurityOutcome {
  SUCCESS = "success",               // 成功
  FAILURE = "failure",               // 失败
  BLOCKED = "blocked",               // 被阻止
  SUSPICIOUS = "suspicious"          // 可疑
}
```

### 2.4.5 缓存元数据模型
```typescript
interface CacheMetadataData {
  // 缓存键信息
  key: string;                       // 缓存键
  keyPattern: string;                // 键模式 (例如: "stock-quote:*")
  
  // 数据信息
  dataClassification: string;                  // 数据类型
  dataSize: number;                  // 数据大小 (字节)
  compressed: boolean;               // 是否压缩
  compressionRatio?: number;         // 压缩比率
  
  // 生命周期
  createdAt: string;                 // 创建时间 (ISO 8601)
  expiresAt?: string;                // 过期时间 (ISO 8601)
  ttl: number;                       // 生存时间 (秒)
  lastAccessed?: string;             // 最后访问时间
  
  // 访问统计
  hitCount: number;                  // 命中次数
  missCount: number;                 // 未命中次数
  accessCount: number;               // 总访问次数
  
  // 性能指标
  avgAccessTime: number;             // 平均访问时间 (毫秒)
  maxAccessTime: number;             // 最大访问时间 (毫秒)
  
  // 元数据
  tags?: string[];                   // 标签 (用于分类)
  source?: string;                   // 数据来源
  version?: string;                  // 数据版本
}
```

## 3. 符号映射规范

### 3.1 符号映射模式
```typescript
interface SymbolMapping {
  // 映射身份
  mappingId: string;               // 唯一映射标识符

  // 符号信息
  standardSymbol: string;          // 规范符号格式
  providerSymbol: string;          // 提供商特定符号
  provider: string;                // 提供商标识符
  market: Market;                  // 市场分类

  // 映射规则
  transformationType: TransformationType;  // 转换方法
  transformationRule?: string;     // 自定义转换逻辑

  // 验证
  isActive: boolean;               // 映射活动状态
  confidence: number;              // 映射置信度分数 (0-1)

  // 元数据
  createdAt: string;               // 创建时间戳
  updatedAt: string;               // 最后更新时间戳
  verifiedAt?: string;             // 最后验证时间戳
  source: MappingSource;           // 映射创建方式
}

enum TransformationType {
  DIRECT = "direct",               // 一对一映射
  PREFIX_REMOVAL = "prefix-removal", // 移除前缀 (例如, "00700" → "700.HK")
  SUFFIX_ADDITION = "suffix-addition", // 添加后缀 (例如, "AAPL" → "AAPL.US")
  FORMAT_CONVERSION = "format-conversion", // 复杂格式转换
  CUSTOM = "custom"                // 自定义转换函数
}

enum MappingSource {
  MANUAL = "manual",               // 手动创建
  AUTOMATED = "automated",         // 自动生成
  PROVIDER_API = "provider-api",   // 来自提供商元数据
  MARKET_DATA = "market-data",     // 来自市场数据源
  VERIFIED = "verified"            // 人工验证
}
```

### 3.2 市场分类
```typescript
enum Market {
  HK = "HK",                       // 香港证券交易所
  US = "US",                       // 美国市场 (纽约证券交易所, 纳斯达克)
  SZ = "SZ",                       // 深圳证券交易所
  SH = "SH",                       // 上海证券交易所
  UK = "UK",                       // 伦敦证券交易所
  JP = "JP",                       // 东京证券交易所
  SG = "SG"                        // 新加坡交易所
}

interface MarketInfo {
  code: Market;
  name: string;
  timezone: string;
  currency: string;
  tradingHours: TradingHours;
  symbolPattern: RegExp;
  examples: string[];
}

const MARKET_DEFINITIONS: Record<Market, MarketInfo> = {
  [Market.HK]: {
    code: Market.HK,
    name: "香港证券交易所",
    timezone: "Asia/Hong_Kong",
    currency: "HKD",
    tradingHours: { open: "09:30", close: "16:00", timezone: "Asia/Hong_Kong" },
    symbolPattern: /^\d{4,5}\.HK$/,
    examples: ["0700.HK", "00001.HK", "09988.HK"]
  },
  [Market.US]: {
    code: Market.US,
    name: "美国市场",
    timezone: "America/New_York",
    currency: "USD",
    tradingHours: { open: "09:30", close: "16:00", timezone: "America/New_York" },
    symbolPattern: /^[A-Z]{1,5}(\.US)?$/,
    examples: ["AAPL.US", "GOOGL.US", "TSLA"]
  }
  // ... 其他市场
};
```

## 4. 字段映射规范

### 4.1 字段映射模式
```typescript
interface DataFieldMapping {
  // 映射身份
  mappingId: string;               // 唯一映射标识符
  provider: string;                // 提供商标识符
  dataClassification: DataClassification;    // 正在映射的数据类型

  // 字段转换
  sourceField: string;             // 源字段路径 (例如, "data.securities[0].last_price")
  targetField: string;             // 目标字段名称 (例如, "lastPrice")

  // 转换规则
  transformation: FieldTransformation; // 转换方法

  // 验证规则
  validation?: FieldValidation;    // 验证标准
  required: boolean;               // 字段要求状态
  defaultValue?: any;              // 如果源缺失的默认值

  // 元数据
  description: string;             // 字段描述
  createdAt: string;               // 创建时间戳
  updatedAt: string;               // 最后更新时间戳
  isActive: boolean;               // 映射活动状态
}

interface FieldTransformation {
  type: TransformationType;
  parameters?: TransformationParameters;
}

enum TransformationType {
  DIRECT = "direct",               // 直接值复制
  MULTIPLY = "multiply",           // 乘以因子
  DIVIDE = "divide",               // 除以因子
  ADD = "add",                     // 添加常量
  SUBTRACT = "subtract",           // 减去常量
  ROUND = "round",                 // 四舍五入到小数位
  FORMAT_DATE = "format-date",     // 日期格式转换
  LOOKUP = "lookup",               // 值查找表
  CUSTOM = "custom"                // 自定义 JavaScript 函数
}

interface TransformationParameters {
  factor?: number;                 // 乘/除因子
  constant?: number;               // 加/减常量
  precision?: number;              // 四舍五入的小数位数
  dateFormat?: string;             // 目标日期格式
  lookupTable?: Record<string, any>; // 值映射表
  customFunction?: string;         // JavaScript 函数字符串
}

enum FieldDataType {
  STRING = "string",
  NUMBER = "number",
  BOOLEAN = "boolean",
  DATE = "date",
  ARRAY = "array",
  OBJECT = "object"
}

interface FieldValidation {
  min?: number;                    // 最小值 (针对数字)
  max?: number;                    // 最大值 (针对数字)
  minLength?: number;              // 最小字符串长度
  maxLength?: number;              // 最大字符串长度
  pattern?: string;                // 正则表达式模式
  enum?: string[];                 // 允许的值
  customValidator?: string;        // 自定义验证函数
}
```

### 4.2 预设字段映射

#### 4.2.1 股票行情预设字段 (22 个字段)
```typescript
interface StockQuotePresetFields {
  // 价格字段
  lastPrice: {
    description: "最新成交价";
    required: true;
    validation: { min: 0 };
  };
  openPrice: {
    description: "开盘价";
    required: true;
    validation: { min: 0 };
  };
  closePrice: {
    description: "收盘价";
    required: true;
    validation: { min: 0 };
  };
  highPrice: {
    description: "最高价";
    required: true;
    validation: { min: 0 };
  };
  lowPrice: {
    description: "最低价";
    required: true;
    validation: { min: 0 };
  };

  // 买/卖字段
  bidPrice: {
    description: "买一价";
    required: false;
    validation: { min: 0 };
  };
  askPrice: {
    description: "卖一价";
    required: false;
    validation: { min: 0 };
  };
  bidSize: {
    description: "买一量";
    required: false;
    validation: { min: 0 };
  };
  askSize: {
    description: "卖一量";
    required: false;
    validation: { min: 0 };
  };

  // 变化字段
  changeAmount: {
    description: "涨跌额";
    required: true;
  };
  changePercent: {
    description: "涨跌幅";
    required: true;
    validation: { min: -1, max: 1 };
  };

  // 交易量字段
  volume: {
    description: "成交量";
    required: true;
    validation: { min: 0 };
  };
  turnover: {
    description: "成交额";
    required: true;
    validation: { min: 0 };
  };
  avgVolume: {
    description: "平均成交量";
    required: false;
    validation: { min: 0 };
  };

  // 会话字段
  preMarketPrice: {
    description: "盘前价格";
    required: false;
    validation: { min: 0 };
  };
  afterMarketPrice: {
    description: "盘后价格";
    required: false;
    validation: { min: 0 };
  };

  // 市场数据字段
  marketCap: {
    description: "市值";
    required: false;
    validation: { min: 0 };
  };
  peRatio: {
    description: "市盈率";
    required: false;
    validation: { min: 0 };
  };
  pbRatio: {
    description: "市净率";
    required: false;
    validation: { min: 0 };
  };
  eps: {
    description: "每股收益";
    required: false;
  };

  // 元数据字段
  timestamp: {
    description: "数据时间戳";
    required: true;
  };
  currency: {
    description: "货币代码";
    required: true;
    validation: { pattern: "^[A-Z]{3}$" };
  };
}
```

#### 4.2.2 股票基本信息预设字段 (15 个字段)
```typescript
interface StockBasicInfoPresetFields {
  // 公司信息
  companyName: {
    description: "公司名称";
    required: true;
    validation: { maxLength: 200 };
  };
  shortName: {
    description: "简称";
    required: true;
    validation: { maxLength: 50 };
  };
  description: {
    description: "公司描述";
    required: false;
    validation: { maxLength: 2000 };
  };

  // 分类
  sector: {
    description: "行业板块";
    required: true;
    validation: { maxLength: 100 };
  };
  industry: {
    description: "具体行业";
    required: true;
    validation: { maxLength: 100 };
  };

  // 公司详情
  foundedYear: {
    description: "成立年份";
    required: false;
    validation: { min: 1800, max: new Date().getFullYear() };
  };
  headquarters: {
    description: "总部地址";
    required: false;
    validation: { maxLength: 200 };
  };
  website: {
    description: "公司网站";
    required: false;
    validation: { pattern: "^https?://.+" };
  };

  // 交易信息
  listingDate: {
    description: "上市日期";
    required: true;
  };
  tradingCurrency: {
    description: "交易货币";
    required: true;
    validation: { pattern: "^[A-Z]{3}$" };
  };
  lotSize: {
    description: "每手股数";
    required: true;
    validation: { min: 1 };
  };

  // 财务指标
  totalShares: {
    description: "总股本";
    required: true;
    validation: { min: 1 };
  };
  floatShares: {
    description: "流通股本";
    required: false;
    validation: { min: 0 };
  };

  // 交易所信息
  exchange: {
    description: "交易所";
    required: true;
    validation: { maxLength: 100 };
  };
  exchangeCode: {
    description: "交易所代码";
    required: true;
    validation: { maxLength: 10 };
  };
}
```

## 5. 数据验证规范

### 5.1 输入验证规则
```typescript
interface InputValidationRules {
  symbols: {
    maxCount: 100;                  // 每个请求的最大符号数
    format: '市场特定模式';
    validation: '每个市场的正则表达式模式匹配';
    sanitization: '大写，去除空白字符';
  };

  dataClassifications: {
    allowedValues: Object.values(DataClassification);
    validation: '枚举值检查';
    caseSensitive: true;
  };

  dateRanges: {
    format: 'ISO 8601';
    maxPastRange: '10 年';
    maxFutureRange: '1 年';
    timezone: '首选 UTC';
  };

  numericFields: {
    priceFields: { min: 0, max: 1000000, precision: 4 };
    percentageFields: { min: -1, max: 1, precision: 6 };
    volumeFields: { min: 0, max: 999999999999, precision: 0 };
  };

  stringFields: {
    maxLength: 1000;
    encoding: 'UTF-8';
    sanitization: 'HTML 转义，SQL 注入防御';
  };
}
```

### 5.2 数据质量验证
```typescript
interface DataQualityValidation {
  completeness: {
    requiredFields: '必须存在且非空';
    optionalFields: '如果存在则验证';
    thresholds: {
      critical: 100;              // 关键字段必须 100% 完整
      important: 90;              // 重要字段应 90%+ 完整
      optional: 50;               // 可选字段预期 50%+ 完整
    };
    monitoring: '低于可接受水平时实时告警';
  };

  accuracy: {
    priceConsistency: '最后价格在买卖价差内';
    changeCalculation: '变化量与百分比计算的数学一致性';
    temporalConsistency: '时间戳按逻辑顺序排列';
    rangeValidation: '值在预期市场范围内';
  };

  timeliness: {
    maxAge: {
      realtime: '60 秒';     // 实时数据最大时效
      delayed: '15 分钟';      // 延迟数据最大时效
      snapshot: '24 小时';       // 快照数据最大时效
    };
    timestampValidation: '时间戳在合理范围内';
  };

  consistency: {
    crossProvider: '跨多个提供商的数据一致性';
    crossMarket: '货币转换和市场关系';
    historicalConsistency: '新数据与历史模式一致';
  };
}
```

### 5.3 数据转换验证
```typescript
interface TransformationValidation {
  preTransformation: {
    sourceDataValidation: '验证原始提供商数据';
    schemaCompliance: '确保数据符合预期的提供商模式';
    missingFieldHandling: '应用默认值或跳过转换';
  };

  duringTransformation: {
    typeConversion: '验证数据类型转换';
    rangeChecking: '确保转换后的值在有效范围内';
    formatValidation: '验证输出格式合规性';
  };

  postTransformation: {
    outputValidation: '根据目标模式验证';
    completenessCheck: '确保所有必需字段已填充';
    qualityScoring: '计算数据质量指标';
  };

  errorHandling: {
    validationFailures: '记录错误，应用回退值';
    partialData: '优雅地处理不完整的转换';
    providerErrors: '回退到替代提供商';
  };
}
```

## 6. 存储规范

### 6.1 MongoDB 模式定义

#### 6.1.1 股票数据集合
```typescript
interface StockDataDocument {
  _id: ObjectId;                   // MongoDB 文档 ID
  symbol: string;                  // 标准符号 (已索引)
  market: Market;                  // 市场分类 (已索引)
  dataClassification: DataClassification; // 数据类型 (已索引)

  // 复合索引字段
  symbolMarket: string;            // "symbol:market" 复合 (已索引)
  marketDate: string;              // "market:YYYY-MM-DD" 复合 (已索引)

  // 数据负载
  data: StockQuoteData | StockBasicInfoData; // 实际数据

  // 元数据
  provider: string;                // 数据源提供商 (已索引)
  timestamp: Date;                 // 数据时间戳 (已索引)
  createdAt: Date;                 // 文档创建时间
  updatedAt: Date;                 // 最后更新时间

  // 质量和状态
  dataQuality: DataQualityScore;   // 质量指标
  isActive: boolean;               // 活动数据标志 (已索引)
  version: number;                 // 乐观锁定的数据版本
}

// MongoDB 索引
interface MongoDBIndexes {
  primary: { _id: 1 };
  symbolMarket: { symbolMarket: 1, timestamp: -1 };
  marketDate: { marketDate: 1, timestamp: -1 };
  provider: { provider: 1, timestamp: -1 };
  dataClassification: { dataClassification: 1, timestamp: -1 };
  activeData: { isActive: 1, timestamp: -1 };
  compound: { symbol: 1, market: 1, dataClassification: 1, timestamp: -1 };
}
```

#### 6.1.2 符号映射集合
```typescript
interface SymbolMappingDocument {
  _id: ObjectId;

  // 映射信息
  standardSymbol: string;          // 规范符号 (已索引)
  providerSymbol: string;          // 提供商特定符号 (已索引)
  provider: string;                // 提供商标识符 (已索引)
  market: Market;                  // 市场分类 (已索引)

  // 转换详情
  transformationType: TransformationType;
  transformationRule?: string;

  // 验证和质量
  isActive: boolean;               // 活动映射标志 (已索引)
  confidence: number;              // 映射置信度分数
  verificationCount: number;       // 验证次数

  // 元数据
  source: MappingSource;           // 创建来源
  createdAt: Date;
  updatedAt: Date;
  verifiedAt?: Date;

  // 使用统计
  usageCount: number;              // 使用次数
  lastUsed?: Date;                 // 最后使用时间戳
}
```

#### 6.1.3 字段映射集合
```typescript
interface FieldMappingDocument {
  _id: ObjectId;

  // 映射身份
  provider: string;                // 提供商标识符 (已索引)
  dataClassification: DataClassification;    // 数据类型 (已索引)

  // 字段信息
  sourceField: string;             // 源字段路径
  targetField: string;             // 目标字段名称 (已索引)

  // 转换规则
  transformation: FieldTransformation;
  validation?: FieldValidation;

  // 配置
  required: boolean;
  defaultValue?: any;
  isActive: boolean;               // 活动映射标志 (已索引)

  // 元数据
  description: string;
  createdAt: Date;
  updatedAt: Date;

  // 使用和性能
  usageCount: number;
  successRate: number;             // 转换成功率
  avgProcessingTime: number;       // 平均处理时间 (毫秒)
}
```

### 6.2 Redis 数据结构

#### 6.2.1 缓存键模式
```typescript
interface RedisCachePatterns {
  stockQuote: 'stock-quote:{symbol}:{market}';
  stockBasicInfo: 'stock-basic-info:{symbol}:{market}';
  marketStatus: 'market-status:{market}';
  symbolMapping: 'symbol-mapping:{provider}:{providerSymbol}';

  // 批量操作
  batchQuote: 'batch-quote:{requestHash}';
  marketSnapshot: 'market-snapshot:{market}:{date}';

  // 速率限制
  rateLimit: 'rate-limit:{apiKey}:{window}';
  rateLimitBurst: 'rate-limit-burst:{apiKey}';

  // 健康和状态
  providerHealth: 'provider-health:{provider}';
  systemHealth: 'system-health';
}
```

#### 6.2.2 缓存数据结构
```typescript
interface RedisCacheStructures {
  // 字符串值 (最常见)
  simpleValue: {
    key: string;
    value: string;                 // JSON 序列化数据
    ttl: number;                   // 生存时间 (秒)
  };

  // 哈希映射 (用于复杂对象)
  hashValue: {
    key: string;
    fields: Record<string, string>; // 字段-值对
    ttl: number;
  };

  // 集合 (用于集合)
  setValue: {
    key: string;
    members: string[];             // 集合成员
    ttl: number;
  };

  // 有序集合 (用于排名数据)
  sortedSetValue: {
    key: string;
    members: Array<{ value: string; score: number }>;
    ttl: number;
  };

  // 列表 (用于队列和日志)
  listValue: {
    key: string;
    elements: string[];            // 有序元素
    maxLength?: number;            // 最大列表长度
  };
}
```

### 6.3 数据压缩规范
```typescript
interface CompressionSpecifications {
  criteria: {
    threshold: 1024;               // 压缩大于 1KB 的数据
    algorithm: 'gzip';             // 压缩算法
    level: 6;                      // 压缩级别 (1-9)
  };

  applicability: {
    stockQuote: '如果批量 > 10 个符号则压缩';
    stockBasicInfo: '始终压缩 (通常 > 1KB)';
    historicalData: '始终压缩 (大型数据集)';
    symbolMapping: '如果批量 > 50 个映射则压缩';
  };

  performance: {
    compressionRatio: 0.3;         // 预期大小减少 70%
    compressionTime: '<50ms';      // 最大压缩时间
    decompressionTime: '<10ms';    // 最大解压缩时间
  };

  metadata: {
    compressionFlag: '文档中的压缩字段';
    originalSize: '跟踪未压缩大小';
    compressionTime: '跟踪压缩性能';
  };
}
```

## 7. 数据流规范

### 7.1 数据摄取流
```typescript
interface DataIngestionFlow {
  steps: [
    {
      name: '提供商 API 调用';
      description: '从提供商 API 获取原始数据';
      timeout: '5 秒';
      retries: 3;
      fallback: '尝试替代提供商';
    },
    {
      name: '原始数据验证';
      description: '验证提供商响应结构';
      validation: '模式合规性，必需字段';
      errorHandling: '记录错误，拒绝无效数据';
    },
    {
      name: '符号映射';
      description: '将提供商符号转换为标准格式';
      caching: '缓存映射 24 小时';
      fallback: '如果映射失败则使用原始符号';
    },
    {
      name: '字段映射';
      description: '将提供商字段转换为标准字段';
      validation: '数据类型转换，范围检查';
      errorHandling: '对失败的转换应用默认值';
    },
    {
      name: '数据质量评估';
      description: '计算质量指标';
      metrics: '完整性，准确性，及时性';
      threshold: '要求最低 70% 的质量分数';
    },
    {
      name: '存储';
      description: '存储到 Redis 和 MongoDB';
      strategy: '以 Redis 为主体的双写';
      consistency: '最终一致性可接受';
    }
  ];

  errorHandling: {
    providerTimeout: '尝试优先级列表中的下一个提供商';
    validationFailure: '记录错误，如果可用则使用缓存数据';
    storageFailure: '带退避重试，告警监控';
  };

  performance: {
    totalLatency: '<500ms 单个符号';
    batchLatency: '<2000ms 100 个符号';
    throughput: '持续每秒 1000 个符号';
  };
}
```

### 7.2 数据检索流
```typescript
interface DataRetrievalFlow {
  strong_realtime: [
    {
      step: 'Redis 缓存检查';
      ttl: '1 秒';
      hitRate: '>95%';
      latency: '<1ms';
    },
    {
      step: 'MongoDB 回退';
      condition: '缓存未命中或过期';
      latency: '<50ms';
      freshnessCheck: '数据 < 60 秒旧';
    },
    {
      step: '提供商 API 回退';
      condition: '存储中没有新鲜数据';
      latency: '<500ms';
      caching: '立即缓存新数据';
    }
  ];

  weak_realtime: [
    {
      step: 'Redis 缓存检查';
      ttl: '30-3600 秒 (市场感知)';
      hitRate: '>85%';
      latency: '<1ms';
    },
    {
      step: '变化检测';
      description: '检查缓存数据是否有显著变化';
      fields: '37 个带优先级的受监控字段';
      threshold: '每个字段类型可配置';
    },
    {
      step: 'MongoDB 查询';
      condition: '缓存未命中或检测到显著变化';
      latency: '<100ms';
      indexUsage: '优化复合索引';
    },
    {
      step: '数据增强';
      description: '添加元数据，计算派生字段';
      latency: '<50ms';
      caching: '缓存增强结果';
    }
  ];
}
```

### 7.3 数据同步流
```typescript
interface DataSynchronizationFlow {
  realTimeSync: {
    frequency: '根据市场状态每 1-30 秒';
    triggers: ['市场开盘', '交易时间', '显著价格变化'];
    batchSize: '每批 100 个符号';
    parallelization: '最多 10 个并发提供商请求';
  };

  batchSync: {
    frequency: '每 15 分钟';
    purpose: '全市场数据刷新';
    coverage: '所有市场中的所有活跃符号';
    priority: '高交易量，高价值股票优先';
  };

  reconciliation: {
    frequency: '每天市场收盘时';
    purpose: '数据一致性验证';
    checks: ['提供商数据比较', '历史数据完整性'];
    corrections: '自动纠正微小差异';
  };

  archival: {
    frequency: '每天';
    purpose: '将旧数据移动到长期存储';
    retention: {
      realtime: 'Redis 中 7 天';
      daily: 'MongoDB 中 2 年';
      historical: '永久存档存储';
    };
  };
}
```

## 8. 数据质量和监控

### 8.1 数据质量指标
```typescript
interface DataQualityMetrics {
  completeness: {
    calculation: '已填充字段 / 总必需字段';
    thresholds: {
      excellent: '>95%';
      good: '85-95%';
      acceptable: '70-85%';
      poor: '<70%';
    };
    monitoring: '低于可接受水平时实时告警';
  };

  accuracy: {
    priceConsistency: '买入价 <= 最后价格 <= 卖出价 验证';
    changeCalculation: '数学一致性检查';
    rangeValidation: '值在预期市场范围内';
    crossProviderValidation: '比较跨提供商的数据';
  };

  timeliness: {
    dataAge: '自提供商时间戳以来的时间';
    ingestionLatency: '从提供商到存储的时间';
    alertThresholds: {
      warning: '交易时间 >30 秒';
      critical: '交易时间 >60 秒';
    };
  };

  consistency: {
    formatCompliance: '符合标准格式';
    referentialIntegrity: '符号和市场关系';
    temporalConsistency: '逻辑时间戳序列';
  };
}
```

### 8.2 数据监控仪表板
```typescript
interface DataMonitoringDashboard {
  realTimeMetrics: {
    dataIngestionRate: '每秒符号数';
    cacheHitRate: '按数据类型百分比';
    providerResponseTime: '按提供商的 P50, P95, P99';
    errorRate: '按错误类型百分比';
  };

  qualityMetrics: {
    overallQualityScore: '0-100 聚合分数';
    completenessRate: '按数据类型百分比';
    accuracyScore: '验证成功率';
    timelinesScore: '新鲜度指标';
  };

  businessMetrics: {
    symbolsCovered: '总活跃符号数';
    marketsCovered: '活跃市场数';
    dataVolume: '处理的总数据点数';
    clientSatisfaction: '响应时间 SLA 合规性';
  };

  alerts: {
    dataQualityDegradation: '质量分数下降 > 10 点';
    providerFailure: '提供商错误率 > 20%';
    storageIssues: '存储延迟 > 阈值';
    inconsistentData: '跨提供商数据差异';
  };
}
```

## 9. 备份和恢复规范

### 9.1 备份策略
```typescript
interface BackupStrategy {
  mongodb: {
    frequency: '每 4 小时';
    method: '带自动快照的副本集';
    retention: {
      hourly: '7 天';
      daily: '30 天';
      weekly: '1 年';
      monthly: '7 年';
    };
    compression: '用于存储效率的 gzip 压缩';
  };

  redis: {
    frequency: '每小时';
    method: 'RDB 快照 + AOF 日志';
    retention: 'RDB 7 天，AOF 24 小时';
    replication: '用于冗余的主从复制';
  };

  configurationData: {
    frequency: '每次更改时';
    method: 'git 版本控制';
    storage: '多个地理位置';
    verification: '自动完整性检查';
  };
}
```

### 9.2 灾难恢复
```typescript
interface DisasterRecoveryPlan {
  rto: '< 1 小时';                 // 恢复时间目标
  rpo: '< 15 分钟';             // 恢复点目标

  scenarios: {
    databaseFailure: {
      detection: '自动健康检查';
      response: '故障转移到副本集';
      recovery: '从最新备份恢复';
      timeline: '< 30 分钟';
    };

    cacheFailure: {
      detection: '连接监控';
      response: '回退到数据库';
      recovery: '从数据库重建缓存';
      timeline: '< 15 分钟';
    };

    providerFailure: {
      detection: 'API 响应监控';
      response: '切换到备份提供商';
      recovery: '提供商恢复时自动恢复';
      timeline: '< 5 分钟';
    };

    datacenterFailure: {
      detection: '地理冗余监控';
      response: '故障转移到辅助数据中心';
      recovery: '完整系统恢复';
      timeline: '< 4 小时';
    };
  };
}
```

---

**文档控制：**
- **数据架构师**：高级数据架构团队
- **审阅者**：开发团队，数据库团队
- **批准者**：首席技术官
- **实施状态**：生产就绪
- **下次审阅**：2025-10-27