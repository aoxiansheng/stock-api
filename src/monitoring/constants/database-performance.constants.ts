/**
 * 数据库性能监控常量 - 直观优先架构
 * 🎯 数据库查询时间、连接池、事务相关的所有监控阈值和配置
 * 
 * ⭐ 架构原则：
 * - 直观优先：数值直接可见，一目了然
 * - 业务语义：常量名直接表达业务含义
 * - 就近原则：相关数值放在一起便于对比修改
 * - 零抽象：文件内部不做抽象层，所有值直接导出
 * 
 * @version 1.0.0
 * @since 2025-09-10
 * @author Claude Code
 */

// ========================= 数据库查询时间阈值 =========================

/**
 * MongoDB查询时间阈值 (单位: 毫秒)
 * 🗄️ MongoDB查询性能监控的核心阈值，直接影响应用响应时间
 */
export const MONGODB_QUERY_TIME_EXCELLENT_MS = 50;            // 50ms以下 - 优秀查询性能
export const MONGODB_QUERY_TIME_GOOD_MS = 200;               // 200ms以下 - 良好查询性能
export const MONGODB_QUERY_TIME_WARNING_MS = 1000;           // 1000ms以下 - 警告查询性能，需关注
export const MONGODB_QUERY_TIME_POOR_MS = 3000;              // 3000ms以下 - 较差查询性能，需优化
export const MONGODB_QUERY_TIME_CRITICAL_MS = 10000;         // 10000ms以上 - 严重慢查询，立即处理

/**
 * Redis查询时间阈值 (单位: 毫秒)
 * ⚡ Redis缓存查询性能监控，应该比MongoDB快得多
 */
export const REDIS_QUERY_TIME_EXCELLENT_MS = 5;              // 5ms以下 - 优秀Redis响应
export const REDIS_QUERY_TIME_GOOD_MS = 20;                  // 20ms以下 - 良好Redis响应
export const REDIS_QUERY_TIME_WARNING_MS = 50;               // 50ms以下 - 警告Redis响应
export const REDIS_QUERY_TIME_POOR_MS = 100;                 // 100ms以下 - 较差Redis响应
export const REDIS_QUERY_TIME_CRITICAL_MS = 500;             // 500ms以上 - 严重Redis延迟

/**
 * 聚合查询时间阈值 (单位: 毫秒)
 * 📊 复杂聚合查询的性能监控，通常比普通查询耗时更长
 */
export const AGGREGATION_QUERY_TIME_EXCELLENT_MS = 200;      // 200ms以下 - 优秀聚合性能
export const AGGREGATION_QUERY_TIME_GOOD_MS = 1000;          // 1000ms以下 - 良好聚合性能
export const AGGREGATION_QUERY_TIME_WARNING_MS = 5000;       // 5000ms以下 - 警告聚合性能
export const AGGREGATION_QUERY_TIME_POOR_MS = 15000;         // 15000ms以下 - 较差聚合性能
export const AGGREGATION_QUERY_TIME_CRITICAL_MS = 30000;     // 30000ms以上 - 严重聚合延迟

// ========================= 数据库连接性能阈值 =========================

/**
 * 数据库连接建立时间阈值 (单位: 毫秒)
 * 🔗 数据库连接建立的性能监控
 */
export const DB_CONNECTION_TIME_EXCELLENT_MS = 100;          // 100ms以下 - 优秀连接建立
export const DB_CONNECTION_TIME_GOOD_MS = 300;               // 300ms以下 - 良好连接建立
export const DB_CONNECTION_TIME_WARNING_MS = 1000;           // 1000ms以下 - 警告连接建立
export const DB_CONNECTION_TIME_POOR_MS = 3000;              // 3000ms以下 - 较差连接建立
export const DB_CONNECTION_TIME_CRITICAL_MS = 10000;         // 10000ms以上 - 严重连接延迟

/**
 * 连接池使用率阈值 (单位: 百分比 0-100)
 * 🏊 连接池资源使用情况监控
 */
export const CONNECTION_POOL_USAGE_EXCELLENT_THRESHOLD = 30;  // 30%以下 - 连接池使用率优秀
export const CONNECTION_POOL_USAGE_GOOD_THRESHOLD = 50;       // 50%以下 - 连接池使用率良好
export const CONNECTION_POOL_USAGE_WARNING_THRESHOLD = 70;    // 70%以下 - 连接池使用率警告
export const CONNECTION_POOL_USAGE_POOR_THRESHOLD = 85;       // 85%以下 - 连接池使用率较高
export const CONNECTION_POOL_USAGE_CRITICAL_THRESHOLD = 95;   // 95%以上 - 连接池使用率危险

/**
 * 连接等待时间阈值 (单位: 毫秒)
 * ⏳ 等待可用连接的时间监控
 */
export const CONNECTION_WAIT_TIME_EXCELLENT_MS = 10;          // 10ms以下 - 连接等待时间优秀
export const CONNECTION_WAIT_TIME_GOOD_MS = 50;               // 50ms以下 - 连接等待时间良好
export const CONNECTION_WAIT_TIME_WARNING_MS = 200;           // 200ms以下 - 连接等待时间警告
export const CONNECTION_WAIT_TIME_POOR_MS = 1000;             // 1000ms以下 - 连接等待时间较长
export const CONNECTION_WAIT_TIME_CRITICAL_MS = 5000;         // 5000ms以上 - 连接等待时间过长

// ========================= 事务性能阈值 =========================

/**
 * 事务执行时间阈值 (单位: 毫秒)
 * 💳 数据库事务执行性能监控
 */
export const TRANSACTION_TIME_EXCELLENT_MS = 100;            // 100ms以下 - 优秀事务执行
export const TRANSACTION_TIME_GOOD_MS = 500;                 // 500ms以下 - 良好事务执行
export const TRANSACTION_TIME_WARNING_MS = 2000;             // 2000ms以下 - 警告事务执行
export const TRANSACTION_TIME_POOR_MS = 10000;               // 10000ms以下 - 较慢事务执行
export const TRANSACTION_TIME_CRITICAL_MS = 30000;           // 30000ms以上 - 严重事务延迟

/**
 * 锁等待时间阈值 (单位: 毫秒)
 * 🔒 数据库锁竞争监控
 */
export const LOCK_WAIT_TIME_EXCELLENT_MS = 10;               // 10ms以下 - 优秀锁等待
export const LOCK_WAIT_TIME_GOOD_MS = 100;                   // 100ms以下 - 良好锁等待
export const LOCK_WAIT_TIME_WARNING_MS = 1000;               // 1000ms以下 - 警告锁等待
export const LOCK_WAIT_TIME_POOR_MS = 5000;                  // 5000ms以下 - 较长锁等待
export const LOCK_WAIT_TIME_CRITICAL_MS = 30000;             // 30000ms以上 - 严重锁竞争

/**
 * 死锁检测阈值 (单位: 次数/分钟)
 * 💀 死锁发生频率监控
 */
export const DEADLOCK_COUNT_PER_MINUTE_EXCELLENT = 0;        // 0次/分钟 - 无死锁发生
export const DEADLOCK_COUNT_PER_MINUTE_GOOD = 0;             // 0次/分钟 - 无死锁发生
export const DEADLOCK_COUNT_PER_MINUTE_WARNING = 1;          // 1次/分钟 - 偶发死锁
export const DEADLOCK_COUNT_PER_MINUTE_POOR = 3;             // 3次/分钟 - 频繁死锁
export const DEADLOCK_COUNT_PER_MINUTE_CRITICAL = 10;        // 10次/分钟 - 严重死锁问题

// ========================= 数据库I/O性能阈值 =========================

/**
 * 磁盘I/O等待时间阈值 (单位: 毫秒)
 * 💾 数据库磁盘I/O性能监控
 */
export const DB_DISK_IO_WAIT_TIME_EXCELLENT_MS = 10;         // 10ms以下 - 优秀磁盘I/O
export const DB_DISK_IO_WAIT_TIME_GOOD_MS = 50;              // 50ms以下 - 良好磁盘I/O
export const DB_DISK_IO_WAIT_TIME_WARNING_MS = 200;          // 200ms以下 - 警告磁盘I/O
export const DB_DISK_IO_WAIT_TIME_POOR_MS = 1000;            // 1000ms以下 - 较慢磁盘I/O
export const DB_DISK_IO_WAIT_TIME_CRITICAL_MS = 5000;        // 5000ms以上 - 严重磁盘I/O延迟

/**
 * 数据库IOPS阈值 (单位: 操作数/秒)
 * 📈 数据库I/O操作频率监控
 */
export const DB_IOPS_EXCELLENT_THRESHOLD = 1000;             // 1000 IOPS以下 - 优秀I/O负载
export const DB_IOPS_GOOD_THRESHOLD = 3000;                  // 3000 IOPS以下 - 良好I/O负载
export const DB_IOPS_WARNING_THRESHOLD = 5000;               // 5000 IOPS以下 - 警告I/O负载
export const DB_IOPS_POOR_THRESHOLD = 10000;                 // 10000 IOPS以下 - 较高I/O负载
export const DB_IOPS_CRITICAL_THRESHOLD = 20000;             // 20000 IOPS以上 - 严重I/O负载

// ========================= 数据库缓存性能阈值 =========================

/**
 * 数据库缓存命中率阈值 (单位: 小数格式 0.0-1.0)
 * 🎯 数据库内置缓存的命中率监控
 */
export const DB_CACHE_HIT_RATE_EXCELLENT_THRESHOLD = 0.95;   // 95%以上 - 优秀缓存命中率
export const DB_CACHE_HIT_RATE_GOOD_THRESHOLD = 0.85;        // 85%以上 - 良好缓存命中率
export const DB_CACHE_HIT_RATE_WARNING_THRESHOLD = 0.70;     // 70%以上 - 警告缓存命中率
export const DB_CACHE_HIT_RATE_POOR_THRESHOLD = 0.50;        // 50%以上 - 较低缓存命中率
export const DB_CACHE_HIT_RATE_CRITICAL_THRESHOLD = 0.30;    // 30%以下 - 严重缓存问题

/**
 * 缓存淘汰率阈值 (单位: 小数格式 0.0-1.0)  
 * 🗑️ 缓存数据被淘汰的比率监控
 */
export const DB_CACHE_EVICTION_RATE_EXCELLENT_THRESHOLD = 0.01; // 1%以下 - 优秀淘汰率
export const DB_CACHE_EVICTION_RATE_GOOD_THRESHOLD = 0.05;    // 5%以下 - 良好淘汰率
export const DB_CACHE_EVICTION_RATE_WARNING_THRESHOLD = 0.1;  // 10%以下 - 警告淘汰率
export const DB_CACHE_EVICTION_RATE_POOR_THRESHOLD = 0.2;     // 20%以下 - 较高淘汰率
export const DB_CACHE_EVICTION_RATE_CRITICAL_THRESHOLD = 0.5; // 50%以上 - 严重淘汰率

// ========================= 数据库监控配置 =========================

/**
 * 数据库性能监控采集配置 (单位: 毫秒)
 * ⏱️ 数据库性能指标采集的时间间隔
 */
export const DB_PERFORMANCE_COLLECTION_INTERVAL_MS = 30000;     // 30秒 - 标准采集间隔
export const DB_PERFORMANCE_FAST_COLLECTION_INTERVAL_MS = 5000; // 5秒 - 高频采集（告警时）
export const DB_PERFORMANCE_SLOW_COLLECTION_INTERVAL_MS = 120000; // 2分钟 - 低频采集（正常时）

/**
 * 慢查询日志配置
 * 🐌 慢查询记录和分析配置
 */
export const SLOW_QUERY_LOG_THRESHOLD_MS = 1000;             // 1000ms - 慢查询记录阈值
export const SLOW_QUERY_LOG_MAX_ENTRIES = 1000;              // 1000条 - 慢查询日志最大条数
export const SLOW_QUERY_LOG_RETENTION_HOURS = 168;           // 168小时 - 慢查询日志保留时间（7天）

/**
 * 数据库连接监控配置
 * 🔗 连接状态监控的配置参数
 */
export const DB_CONNECTION_CHECK_INTERVAL_SEC = 30;          // 30秒 - 连接状态检查间隔
export const DB_CONNECTION_TIMEOUT_SEC = 10;                 // 10秒 - 连接超时时间
export const DB_CONNECTION_RETRY_COUNT = 3;                  // 3次 - 连接重试次数
export const DB_CONNECTION_RETRY_DELAY_MS = 5000;            // 5秒 - 连接重试延迟

// ========================= 数据库告警配置 =========================

/**
 * 查询性能告警配置
 * 🚨 数据库查询性能异常的告警参数
 */
export const DB_QUERY_ALERT_COOLDOWN_MINUTES = 5;            // 5分钟 - 查询性能告警冷却时间
export const DB_QUERY_ALERT_MAX_PER_HOUR = 12;               // 12次/小时 - 查询告警频率限制
export const DB_QUERY_CONSECUTIVE_THRESHOLD_COUNT = 3;        // 3次连续 - 连续慢查询才告警

/**
 * 连接池告警配置
 * 🏊 连接池异常的告警参数
 */
export const CONNECTION_POOL_ALERT_COOLDOWN_MINUTES = 10;     // 10分钟 - 连接池告警冷却时间
export const CONNECTION_POOL_ALERT_MAX_PER_HOUR = 6;         // 6次/小时 - 连接池告警频率限制
export const CONNECTION_POOL_CONSECUTIVE_THRESHOLD_COUNT = 2; // 2次连续 - 连续超阈值才告警

/**
 * 事务告警配置
 * 💳 事务异常的告警参数
 */
export const TRANSACTION_ALERT_COOLDOWN_MINUTES = 3;         // 3分钟 - 事务告警冷却时间
export const TRANSACTION_ALERT_MAX_PER_HOUR = 20;            // 20次/小时 - 事务告警频率限制
export const TRANSACTION_CONSECUTIVE_THRESHOLD_COUNT = 2;     // 2次连续 - 连续事务问题才告警

// ========================= 数据库容量和限制 =========================

/**
 * 数据库存储容量阈值 (单位: 百分比 0-100)
 * 📦 数据库存储空间使用情况监控
 */
export const DB_STORAGE_USAGE_EXCELLENT_THRESHOLD = 50;      // 50%以下 - 优秀存储使用率
export const DB_STORAGE_USAGE_GOOD_THRESHOLD = 70;           // 70%以下 - 良好存储使用率
export const DB_STORAGE_USAGE_WARNING_THRESHOLD = 80;        // 80%以下 - 警告存储使用率
export const DB_STORAGE_USAGE_POOR_THRESHOLD = 90;           // 90%以下 - 较高存储使用率
export const DB_STORAGE_USAGE_CRITICAL_THRESHOLD = 95;       // 95%以上 - 危险存储使用率

/**
 * 数据库大小限制 (单位: GB)
 * 📏 数据库文件大小的监控阈值
 */
export const DB_SIZE_WARNING_GB = 10;                        // 10GB - 数据库大小警告阈值
export const DB_SIZE_CRITICAL_GB = 50;                       // 50GB - 数据库大小危险阈值
export const DB_COLLECTION_SIZE_WARNING_GB = 1;              // 1GB - 单个集合大小警告阈值
export const DB_COLLECTION_SIZE_CRITICAL_GB = 5;             // 5GB - 单个集合大小危险阈值

/**
 * 数据库索引性能 (单位: 百分比和毫秒)
 * 📇 数据库索引使用和性能监控
 */
export const DB_INDEX_USAGE_WARNING_THRESHOLD = 0.5;         // 50% - 索引使用率警告阈值
export const DB_INDEX_USAGE_CRITICAL_THRESHOLD = 0.3;        // 30% - 索引使用率危险阈值
export const DB_INDEX_SCAN_TIME_WARNING_MS = 100;            // 100ms - 索引扫描时间警告
export const DB_INDEX_SCAN_TIME_CRITICAL_MS = 1000;          // 1000ms - 索引扫描时间危险

// ========================= 数据库备份和恢复监控 =========================

/**
 * 备份性能阈值 (单位: 毫秒)
 * 💾 数据库备份操作性能监控
 */
export const DB_BACKUP_TIME_EXCELLENT_MIN = 5;               // 5分钟以下 - 优秀备份时间
export const DB_BACKUP_TIME_GOOD_MIN = 15;                   // 15分钟以下 - 良好备份时间
export const DB_BACKUP_TIME_WARNING_MIN = 60;                // 60分钟以下 - 警告备份时间
export const DB_BACKUP_TIME_POOR_MIN = 180;                  // 180分钟以下 - 较长备份时间
export const DB_BACKUP_TIME_CRITICAL_MIN = 480;              // 480分钟以上 - 严重备份延迟

/**
 * 恢复性能阈值 (单位: 分钟)
 * 🔄 数据库恢复操作性能监控
 */
export const DB_RESTORE_TIME_EXCELLENT_MIN = 10;             // 10分钟以下 - 优秀恢复时间
export const DB_RESTORE_TIME_GOOD_MIN = 30;                  // 30分钟以下 - 良好恢复时间
export const DB_RESTORE_TIME_WARNING_MIN = 120;              // 120分钟以下 - 警告恢复时间
export const DB_RESTORE_TIME_POOR_MIN = 360;                 // 360分钟以下 - 较长恢复时间
export const DB_RESTORE_TIME_CRITICAL_MIN = 720;             // 720分钟以上 - 严重恢复延迟

// ========================= 常量组合和类型定义 =========================

/**
 * MongoDB查询时间阈值组合对象
 * 📦 方便批量使用的MongoDB查询时间阈值集合
 */
export const MONGODB_QUERY_TIME_THRESHOLDS = {
  excellent: MONGODB_QUERY_TIME_EXCELLENT_MS,
  good: MONGODB_QUERY_TIME_GOOD_MS,
  warning: MONGODB_QUERY_TIME_WARNING_MS,
  poor: MONGODB_QUERY_TIME_POOR_MS,
  critical: MONGODB_QUERY_TIME_CRITICAL_MS
} as const;

/**
 * Redis查询时间阈值组合对象
 * 📦 方便批量使用的Redis查询时间阈值集合
 */
export const REDIS_QUERY_TIME_THRESHOLDS = {
  excellent: REDIS_QUERY_TIME_EXCELLENT_MS,
  good: REDIS_QUERY_TIME_GOOD_MS,
  warning: REDIS_QUERY_TIME_WARNING_MS,
  poor: REDIS_QUERY_TIME_POOR_MS,
  critical: REDIS_QUERY_TIME_CRITICAL_MS
} as const;

/**
 * 连接池使用率阈值组合对象
 * 📦 方便批量使用的连接池使用率阈值集合
 */
export const CONNECTION_POOL_USAGE_THRESHOLDS = {
  excellent: CONNECTION_POOL_USAGE_EXCELLENT_THRESHOLD,
  good: CONNECTION_POOL_USAGE_GOOD_THRESHOLD,
  warning: CONNECTION_POOL_USAGE_WARNING_THRESHOLD,
  poor: CONNECTION_POOL_USAGE_POOR_THRESHOLD,
  critical: CONNECTION_POOL_USAGE_CRITICAL_THRESHOLD
} as const;

/**
 * 数据库缓存命中率阈值组合对象
 * 📦 方便批量使用的数据库缓存命中率阈值集合
 */
export const DB_CACHE_HIT_RATE_THRESHOLDS = {
  excellent: DB_CACHE_HIT_RATE_EXCELLENT_THRESHOLD,
  good: DB_CACHE_HIT_RATE_GOOD_THRESHOLD,
  warning: DB_CACHE_HIT_RATE_WARNING_THRESHOLD,
  poor: DB_CACHE_HIT_RATE_POOR_THRESHOLD,
  critical: DB_CACHE_HIT_RATE_CRITICAL_THRESHOLD
} as const;

/**
 * 数据库性能监控相关类型定义
 * 🏷️ TypeScript类型支持
 */
export type DatabasePerformanceThresholds = {
  readonly excellent: number;
  readonly good: number;
  readonly warning: number;
  readonly poor: number;
  readonly critical: number;
};

export type DatabaseType = 'mongodb' | 'redis' | 'mysql' | 'postgresql';
export type QueryType = 'select' | 'insert' | 'update' | 'delete' | 'aggregate' | 'index';
export type DatabaseOperation = 'query' | 'transaction' | 'connection' | 'backup' | 'restore';
export type DatabaseLevel = 'excellent' | 'good' | 'warning' | 'poor' | 'critical';