/**
 * 缓存性能监控常量 - 直观优先架构  
 * 🎯 缓存命中率、响应时间、淘汰率相关的所有监控阈值和配置
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

// ========================= Redis缓存性能阈值 =========================

/**
 * Redis缓存命中率阈值 (单位: 小数格式 0.0-1.0)
 * 🎯 Redis缓存命中率是最重要的缓存性能指标
 * 
 * 📌 固定常量理由：
 * 这些阈值基于Redis内存缓存的行业标准和性能特征，具有固定的算法意义：
 * - 95%优秀：Redis内存访问的理论最优表现，考虑到数据淘汰和过期的必然性
 * - 85%良好：生产环境中可接受的高性能水准，平衡了内存使用和命中率
 * - 70%警告：低于此值表明缓存策略需要调整，是性能问题的明确指标
 * - 50%较差：缓存效果显著下降，需要立即优化的技术边界
 * - 30%严重：缓存基本失效，低于此值失去缓存存在的意义
 * 这些数值来源于Redis官方建议和大量生产实践，不应根据业务需求调整
 */
export const REDIS_CACHE_HIT_RATE_EXCELLENT_THRESHOLD = 0.95;    // 95%以上 - 优秀缓存命中率（固定算法常量）
export const REDIS_CACHE_HIT_RATE_GOOD_THRESHOLD = 0.85;        // 85%以上 - 良好缓存命中率（固定算法常量）
export const REDIS_CACHE_HIT_RATE_WARNING_THRESHOLD = 0.70;     // 70%以上 - 警告缓存命中率，需优化（固定算法常量）
export const REDIS_CACHE_HIT_RATE_POOR_THRESHOLD = 0.50;        // 50%以上 - 较低缓存命中率，急需优化（固定算法常量）
export const REDIS_CACHE_HIT_RATE_CRITICAL_THRESHOLD = 0.30;    // 30%以下 - 严重缓存问题，失去缓存意义（固定算法常量）

/**
 * Redis缓存响应时间阈值 (单位: 毫秒)
 * ⚡ Redis作为内存缓存，响应时间应该非常快
 * 
 * 📌 固定常量理由：
 * 这些阈值基于Redis内存数据库的物理性能特征，具有固定的技术边界：
 * - 5ms优秀：本地网络Redis的理论最优响应时间，接近内存访问速度
 * - 20ms良好：包含序列化/反序列化开销的可接受响应时间
 * - 50ms警告：开始出现网络延迟或Redis负载问题的技术指标
 * - 100ms较差：明显的性能问题，可能涉及网络或Redis实例问题
 * - 500ms严重：严重延迟，Redis几乎失去内存缓存的性能优势
 * 这些数值基于Redis的硬件特性和网络物理限制，不应受业务逻辑影响
 */
export const REDIS_RESPONSE_TIME_EXCELLENT_MS = 5;              // 5ms以下 - 优秀Redis响应（固定算法常量）
export const REDIS_RESPONSE_TIME_GOOD_MS = 20;                  // 20ms以下 - 良好Redis响应（固定算法常量）
export const REDIS_RESPONSE_TIME_WARNING_MS = 50;               // 50ms以下 - 警告Redis响应（固定算法常量）
export const REDIS_RESPONSE_TIME_POOR_MS = 100;                 // 100ms以下 - 较慢Redis响应（固定算法常量）
export const REDIS_RESPONSE_TIME_CRITICAL_MS = 500;             // 500ms以上 - 严重Redis延迟（固定算法常量）

/**
 * Redis连接性能阈值
 * 🔗 Redis连接池和连接建立性能监控
 */
export const REDIS_CONNECTION_TIME_EXCELLENT_MS = 10;           // 10ms以下 - 优秀连接建立
export const REDIS_CONNECTION_TIME_GOOD_MS = 50;                // 50ms以下 - 良好连接建立  
export const REDIS_CONNECTION_TIME_WARNING_MS = 200;            // 200ms以下 - 警告连接建立
export const REDIS_CONNECTION_TIME_POOR_MS = 1000;              // 1000ms以下 - 较慢连接建立
export const REDIS_CONNECTION_TIME_CRITICAL_MS = 5000;          // 5000ms以上 - 严重连接延迟

// ========================= 应用层缓存性能阈值 =========================

/**
 * 应用层缓存命中率阈值 (单位: 小数格式 0.0-1.0)
 * 🚀 应用层缓存（如Smart Cache）的命中率监控
 * 
 * 📌 固定常量理由：
 * 这些阈值基于应用层缓存的算法特性，考虑业务逻辑复杂度的固定标准：
 * - 90%优秀：应用层缓存的理想状态，考虑到业务数据的变化性
 * - 75%良好：平衡了缓存效果与业务数据更新频率的实用阈值
 * - 60%警告：应用缓存开始失效的技术边界
 * - 40%较差：缓存策略需要重新设计的明确指标
 * - 20%严重：应用缓存基本无效，低于此值失去缓存意义
 * 这些数值基于应用缓存的通用算法原理，不应根据具体业务调整
 */
export const APP_CACHE_HIT_RATE_EXCELLENT_THRESHOLD = 0.90;     // 90%以上 - 优秀应用缓存命中率（固定算法常量）
export const APP_CACHE_HIT_RATE_GOOD_THRESHOLD = 0.75;         // 75%以上 - 良好应用缓存命中率（固定算法常量）
export const APP_CACHE_HIT_RATE_WARNING_THRESHOLD = 0.60;      // 60%以上 - 警告应用缓存命中率（固定算法常量）
export const APP_CACHE_HIT_RATE_POOR_THRESHOLD = 0.40;         // 40%以上 - 较低应用缓存命中率（固定算法常量）
export const APP_CACHE_HIT_RATE_CRITICAL_THRESHOLD = 0.20;     // 20%以下 - 严重应用缓存问题（固定算法常量）

/**
 * 内存缓存命中率阈值 (单位: 小数格式 0.0-1.0)
 * 🧠 内存中LRU缓存（如Symbol Mapper Cache）的命中率监控
 */
export const MEMORY_CACHE_HIT_RATE_EXCELLENT_THRESHOLD = 0.85;  // 85%以上 - 优秀内存缓存命中率
export const MEMORY_CACHE_HIT_RATE_GOOD_THRESHOLD = 0.70;      // 70%以上 - 良好内存缓存命中率
export const MEMORY_CACHE_HIT_RATE_WARNING_THRESHOLD = 0.50;   // 50%以上 - 警告内存缓存命中率
export const MEMORY_CACHE_HIT_RATE_POOR_THRESHOLD = 0.30;      // 30%以上 - 较低内存缓存命中率
export const MEMORY_CACHE_HIT_RATE_CRITICAL_THRESHOLD = 0.10;  // 10%以下 - 严重内存缓存问题

// ========================= 缓存淘汰和过期监控阈值 =========================

/**
 * 缓存淘汰率阈值 (单位: 小数格式 0.0-1.0)
 * 🗑️ 缓存数据被主动淘汰的比率，淘汰率过高表明缓存容量不足
 */
export const CACHE_EVICTION_RATE_EXCELLENT_THRESHOLD = 0.01;    // 1%以下 - 优秀淘汰率，缓存容量充足
export const CACHE_EVICTION_RATE_GOOD_THRESHOLD = 0.05;        // 5%以下 - 良好淘汰率
export const CACHE_EVICTION_RATE_WARNING_THRESHOLD = 0.1;      // 10%以下 - 警告淘汰率，考虑扩容
export const CACHE_EVICTION_RATE_POOR_THRESHOLD = 0.2;         // 20%以下 - 较高淘汰率，急需扩容
export const CACHE_EVICTION_RATE_CRITICAL_THRESHOLD = 0.5;     // 50%以上 - 严重淘汰率，缓存失效

/**
 * 缓存过期率阈值 (单位: 小数格式 0.0-1.0)
 * ⏰ 缓存数据因TTL过期的比率，过期率过高可能表明TTL设置不合理
 */
export const CACHE_EXPIRATION_RATE_EXCELLENT_THRESHOLD = 0.2;   // 20%以下 - 优秀过期率，TTL设置合理
export const CACHE_EXPIRATION_RATE_GOOD_THRESHOLD = 0.4;       // 40%以下 - 良好过期率
export const CACHE_EXPIRATION_RATE_WARNING_THRESHOLD = 0.6;    // 60%以下 - 警告过期率，检查TTL
export const CACHE_EXPIRATION_RATE_POOR_THRESHOLD = 0.8;       // 80%以下 - 较高过期率，TTL过短
export const CACHE_EXPIRATION_RATE_CRITICAL_THRESHOLD = 0.95;  // 95%以上 - 严重过期率，TTL设置问题

// ========================= 缓存容量和内存使用阈值 =========================

/**
 * Redis内存使用率阈值 (单位: 百分比 0-100)
 * 💾 Redis内存使用情况监控，影响性能和稳定性
 */
export const REDIS_MEMORY_USAGE_EXCELLENT_THRESHOLD = 50;       // 50%以下 - 优秀内存使用率
export const REDIS_MEMORY_USAGE_GOOD_THRESHOLD = 70;           // 70%以下 - 良好内存使用率
export const REDIS_MEMORY_USAGE_WARNING_THRESHOLD = 80;        // 80%以下 - 警告内存使用率
export const REDIS_MEMORY_USAGE_POOR_THRESHOLD = 90;           // 90%以下 - 较高内存使用率
export const REDIS_MEMORY_USAGE_CRITICAL_THRESHOLD = 95;       // 95%以上 - 危险内存使用率

/**
 * 缓存大小限制 (单位: MB)
 * 📏 缓存数据大小的监控阈值
 */
export const CACHE_SIZE_WARNING_MB = 100;                      // 100MB - 缓存大小警告阈值
export const CACHE_SIZE_CRITICAL_MB = 500;                     // 500MB - 缓存大小危险阈值
export const SINGLE_CACHE_ENTRY_WARNING_KB = 100;              // 100KB - 单个缓存条目警告大小
export const SINGLE_CACHE_ENTRY_CRITICAL_KB = 1024;            // 1MB - 单个缓存条目危险大小

// ========================= 缓存操作性能阈值 =========================

/**
 * 缓存写入性能阈值 (单位: 毫秒)
 * ✍️ 缓存数据写入操作的性能监控
 */
export const CACHE_WRITE_TIME_EXCELLENT_MS = 10;               // 10ms以下 - 优秀写入性能
export const CACHE_WRITE_TIME_GOOD_MS = 50;                    // 50ms以下 - 良好写入性能
export const CACHE_WRITE_TIME_WARNING_MS = 200;                // 200ms以下 - 警告写入性能
export const CACHE_WRITE_TIME_POOR_MS = 1000;                  // 1000ms以下 - 较慢写入性能
export const CACHE_WRITE_TIME_CRITICAL_MS = 5000;              // 5000ms以上 - 严重写入延迟

/**
 * 缓存读取性能阈值 (单位: 毫秒)
 * 👁️ 缓存数据读取操作的性能监控
 */
export const CACHE_READ_TIME_EXCELLENT_MS = 5;                 // 5ms以下 - 优秀读取性能  
export const CACHE_READ_TIME_GOOD_MS = 20;                     // 20ms以下 - 良好读取性能
export const CACHE_READ_TIME_WARNING_MS = 100;                 // 100ms以下 - 警告读取性能
export const CACHE_READ_TIME_POOR_MS = 500;                    // 500ms以下 - 较慢读取性能
export const CACHE_READ_TIME_CRITICAL_MS = 2000;               // 2000ms以上 - 严重读取延迟

/**
 * 缓存删除性能阈值 (单位: 毫秒)
 * 🗑️ 缓存数据删除操作的性能监控
 */
export const CACHE_DELETE_TIME_EXCELLENT_MS = 10;              // 10ms以下 - 优秀删除性能
export const CACHE_DELETE_TIME_GOOD_MS = 50;                   // 50ms以下 - 良好删除性能
export const CACHE_DELETE_TIME_WARNING_MS = 200;               // 200ms以下 - 警告删除性能
export const CACHE_DELETE_TIME_POOR_MS = 1000;                 // 1000ms以下 - 较慢删除性能
export const CACHE_DELETE_TIME_CRITICAL_MS = 5000;             // 5000ms以上 - 严重删除延迟

// ========================= 缓存监控配置参数 =========================

/**
 * 缓存性能监控采集配置 (单位: 毫秒)
 * ⏱️ 缓存性能指标采集的时间间隔
 */
export const CACHE_PERFORMANCE_COLLECTION_INTERVAL_MS = 15000;    // 15秒 - 标准采集间隔
export const CACHE_PERFORMANCE_FAST_COLLECTION_INTERVAL_MS = 3000; // 3秒 - 高频采集（告警时）
export const CACHE_PERFORMANCE_SLOW_COLLECTION_INTERVAL_MS = 60000; // 1分钟 - 低频采集（正常时）

/**
 * 缓存统计计算配置 (单位: 秒)
 * 📊 缓存统计指标计算的时间窗口
 */
export const CACHE_STATS_CALCULATION_WINDOW_SEC = 300;          // 300秒 - 5分钟统计窗口
export const CACHE_STATS_SHORT_WINDOW_SEC = 60;                 // 60秒 - 1分钟短期窗口
export const CACHE_STATS_LONG_WINDOW_SEC = 3600;                // 3600秒 - 1小时长期窗口

/**
 * 缓存数据保留配置 (单位: 小时)
 * 💾 缓存监控数据的保留时间
 */
export const CACHE_METRICS_RETENTION_HOURS = 48;                // 48小时 - 详细指标保留（2天）
export const CACHE_STATS_RETENTION_HOURS = 168;                 // 168小时 - 统计数据保留（7天）

// ========================= 缓存告警配置 =========================

/**
 * 缓存命中率告警配置
 * 🚨 缓存命中率异常的告警参数
 */
export const CACHE_HIT_RATE_ALERT_COOLDOWN_MINUTES = 10;        // 10分钟 - 命中率告警冷却时间
export const CACHE_HIT_RATE_ALERT_MAX_PER_HOUR = 6;             // 6次/小时 - 命中率告警频率限制
export const CACHE_HIT_RATE_CONSECUTIVE_THRESHOLD_COUNT = 5;     // 5次连续 - 连续低命中率才告警

/**
 * 缓存性能告警配置
 * ⚡ 缓存响应时间异常的告警参数
 */
export const CACHE_PERFORMANCE_ALERT_COOLDOWN_MINUTES = 5;       // 5分钟 - 性能告警冷却时间
export const CACHE_PERFORMANCE_ALERT_MAX_PER_HOUR = 12;         // 12次/小时 - 性能告警频率限制  
export const CACHE_PERFORMANCE_CONSECUTIVE_THRESHOLD_COUNT = 3;  // 3次连续 - 连续超时才告警

/**
 * 缓存容量告警配置
 * 📦 缓存容量异常的告警参数
 */
export const CACHE_CAPACITY_ALERT_COOLDOWN_MINUTES = 15;        // 15分钟 - 容量告警冷却时间
export const CACHE_CAPACITY_ALERT_MAX_PER_HOUR = 4;             // 4次/小时 - 容量告警频率限制
export const CACHE_CAPACITY_CONSECUTIVE_THRESHOLD_COUNT = 2;     // 2次连续 - 连续超容量才告警

// ========================= 缓存预热和优化配置 =========================

/**
 * 缓存预热配置 (单位: 秒和百分比)
 * 🔥 缓存预热策略的配置参数
 */
export const CACHE_WARMUP_BATCH_SIZE = 100;                     // 100条 - 缓存预热批量大小
export const CACHE_WARMUP_DELAY_MS = 100;                       // 100ms - 缓存预热间隔延迟
export const CACHE_WARMUP_TARGET_HIT_RATE = 0.8;                // 80% - 预热目标命中率
export const CACHE_WARMUP_TIMEOUT_SEC = 300;                    // 300秒 - 预热操作超时时间

/**
 * 缓存优化触发条件 (单位: 百分比和次数)
 * 🔧 自动触发缓存优化的条件阈值
 */
export const CACHE_OPTIMIZATION_HIT_RATE_TRIGGER = 0.6;         // 60% - 命中率低于此值触发优化
export const CACHE_OPTIMIZATION_MEMORY_USAGE_TRIGGER = 0.85;    // 85% - 内存使用率高于此值触发优化
export const CACHE_OPTIMIZATION_CONSECUTIVE_POOR_COUNT = 10;    // 10次连续 - 连续性能差触发优化

// ========================= 缓存策略配置 =========================

/**
 * TTL策略配置 (单位: 秒)
 * ⏰ 不同类型数据的TTL建议值
 */
export const CACHE_TTL_HOT_DATA_SEC = 300;                      // 300秒 - 热点数据TTL（5分钟）
export const CACHE_TTL_WARM_DATA_SEC = 1800;                    // 1800秒 - 温数据TTL（30分钟）
export const CACHE_TTL_COLD_DATA_SEC = 3600;                    // 3600秒 - 冷数据TTL（1小时）
export const CACHE_TTL_STATIC_DATA_SEC = 86400;                 // 86400秒 - 静态数据TTL（24小时）

/**
 * 缓存更新策略配置 (单位: 百分比)
 * 🔄 缓存数据更新策略的触发条件
 */
export const CACHE_REFRESH_HIT_COUNT_THRESHOLD = 10;            // 10次 - 命中次数达到此值考虑刷新
export const CACHE_REFRESH_TTL_REMAINING_PERCENTAGE = 0.1;      // 10% - TTL剩余低于此比例触发刷新
export const CACHE_REFRESH_ACCESS_FREQUENCY_THRESHOLD = 5;      // 5次/分钟 - 访问频率高于此值优先刷新

// ========================= 常量组合和类型定义 =========================

/**
 * Redis缓存命中率阈值组合对象
 * 📦 方便批量使用的Redis缓存命中率阈值集合
 */
export const REDIS_CACHE_HIT_RATE_THRESHOLDS = {
  excellent: REDIS_CACHE_HIT_RATE_EXCELLENT_THRESHOLD,
  good: REDIS_CACHE_HIT_RATE_GOOD_THRESHOLD,
  warning: REDIS_CACHE_HIT_RATE_WARNING_THRESHOLD,
  poor: REDIS_CACHE_HIT_RATE_POOR_THRESHOLD,
  critical: REDIS_CACHE_HIT_RATE_CRITICAL_THRESHOLD
} as const;

/**
 * Redis响应时间阈值组合对象
 * 📦 方便批量使用的Redis响应时间阈值集合
 */
export const REDIS_RESPONSE_TIME_THRESHOLDS = {
  excellent: REDIS_RESPONSE_TIME_EXCELLENT_MS,
  good: REDIS_RESPONSE_TIME_GOOD_MS,
  warning: REDIS_RESPONSE_TIME_WARNING_MS,
  poor: REDIS_RESPONSE_TIME_POOR_MS,
  critical: REDIS_RESPONSE_TIME_CRITICAL_MS
} as const;

/**
 * 应用层缓存命中率阈值组合对象
 * 📦 方便批量使用的应用层缓存命中率阈值集合
 */
export const APP_CACHE_HIT_RATE_THRESHOLDS = {
  excellent: APP_CACHE_HIT_RATE_EXCELLENT_THRESHOLD,
  good: APP_CACHE_HIT_RATE_GOOD_THRESHOLD,
  warning: APP_CACHE_HIT_RATE_WARNING_THRESHOLD,
  poor: APP_CACHE_HIT_RATE_POOR_THRESHOLD,
  critical: APP_CACHE_HIT_RATE_CRITICAL_THRESHOLD
} as const;

/**
 * 缓存淘汰率阈值组合对象
 * 📦 方便批量使用的缓存淘汰率阈值集合
 */
export const CACHE_EVICTION_RATE_THRESHOLDS = {
  excellent: CACHE_EVICTION_RATE_EXCELLENT_THRESHOLD,
  good: CACHE_EVICTION_RATE_GOOD_THRESHOLD,
  warning: CACHE_EVICTION_RATE_WARNING_THRESHOLD,
  poor: CACHE_EVICTION_RATE_POOR_THRESHOLD,
  critical: CACHE_EVICTION_RATE_CRITICAL_THRESHOLD
} as const;

/**
 * 缓存性能监控相关类型定义
 * 🏷️ TypeScript类型支持
 */
export type CachePerformanceThresholds = {
  readonly excellent: number;
  readonly good: number;
  readonly warning: number;
  readonly poor: number;
  readonly critical: number;
};

export type CacheType = 'redis' | 'app_cache' | 'memory_cache' | 'smart_cache';
export type CacheOperation = 'get' | 'set' | 'delete' | 'exists' | 'expire';
export type CacheMetric = 'hit_rate' | 'response_time' | 'memory_usage' | 'eviction_rate';
export type CacheLevel = 'excellent' | 'good' | 'warning' | 'poor' | 'critical';