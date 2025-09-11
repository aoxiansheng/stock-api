/**
 * 响应性能监控常量 - 直观优先架构
 * 🎯 响应时间、吞吐量、延迟相关的所有监控阈值和配置
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

// ========================= HTTP 响应时间阈值 =========================

/**
 * HTTP API响应时间阈值 (单位: 毫秒)
 * 🚀 基于用户体验的API响应时间分级标准
 */
export const API_RESPONSE_TIME_EXCELLENT_MS = 100;     // 100ms以下 - 优秀响应，用户无感知
export const API_RESPONSE_TIME_GOOD_MS = 300;          // 300ms以下 - 良好响应，用户可接受  
export const API_RESPONSE_TIME_WARNING_MS = 1000;      // 1000ms以下 - 警告响应，用户开始感觉慢
export const API_RESPONSE_TIME_POOR_MS = 3000;         // 3000ms以下 - 较差响应，用户明显感觉慢
export const API_RESPONSE_TIME_CRITICAL_MS = 5000;     // 5000ms以上 - 严重超时，用户体验极差

/**
 * WebSocket响应时间阈值 (单位: 毫秒)
 * ⚡ WebSocket实时通信的响应时间要求更严格
 */
export const WEBSOCKET_RESPONSE_TIME_EXCELLENT_MS = 50;  // 50ms以下 - 优秀实时响应
export const WEBSOCKET_RESPONSE_TIME_GOOD_MS = 100;     // 100ms以下 - 良好实时响应
export const WEBSOCKET_RESPONSE_TIME_WARNING_MS = 200;  // 200ms以下 - 警告响应，影响实时性
export const WEBSOCKET_RESPONSE_TIME_POOR_MS = 500;     // 500ms以下 - 较差响应，实时性下降
export const WEBSOCKET_RESPONSE_TIME_CRITICAL_MS = 1000; // 1000ms以上 - 严重延迟，失去实时性

/**
 * 内部服务调用响应时间阈值 (单位: 毫秒)
 * 🔗 微服务间调用的响应时间标准
 */
export const INTERNAL_SERVICE_RESPONSE_EXCELLENT_MS = 50;  // 50ms以下 - 优秀内部调用
export const INTERNAL_SERVICE_RESPONSE_GOOD_MS = 150;     // 150ms以下 - 良好内部调用
export const INTERNAL_SERVICE_RESPONSE_WARNING_MS = 500;  // 500ms以下 - 警告内部调用
export const INTERNAL_SERVICE_RESPONSE_POOR_MS = 1000;    // 1000ms以下 - 较差内部调用
export const INTERNAL_SERVICE_RESPONSE_CRITICAL_MS = 2000; // 2000ms以上 - 严重内部调用延迟

// ========================= 吞吐量监控阈值 =========================

/**
 * API吞吐量阈值 (单位: 请求数/秒 RPS)
 * 📊 API服务处理能力的量化标准
 */
export const API_THROUGHPUT_EXCELLENT_RPS = 1000;      // 1000 RPS以上 - 优秀吞吐量
export const API_THROUGHPUT_GOOD_RPS = 500;            // 500 RPS以上 - 良好吞吐量
export const API_THROUGHPUT_WARNING_RPS = 100;         // 100 RPS以上 - 可接受吞吐量
export const API_THROUGHPUT_POOR_RPS = 50;             // 50 RPS以上 - 较低吞吐量，需优化
export const API_THROUGHPUT_CRITICAL_RPS = 10;         // 10 RPS以下 - 严重低吞吐量，系统异常

/**
 * WebSocket消息吞吐量阈值 (单位: 消息数/秒 MPS)
 * 📡 WebSocket实时消息处理能力标准
 */
export const WEBSOCKET_THROUGHPUT_EXCELLENT_MPS = 5000; // 5000 MPS以上 - 优秀消息处理能力
export const WEBSOCKET_THROUGHPUT_GOOD_MPS = 2000;     // 2000 MPS以上 - 良好消息处理能力
export const WEBSOCKET_THROUGHPUT_WARNING_MPS = 500;   // 500 MPS以上 - 可接受消息处理能力
export const WEBSOCKET_THROUGHPUT_POOR_MPS = 100;      // 100 MPS以上 - 较低消息处理能力
export const WEBSOCKET_THROUGHPUT_CRITICAL_MPS = 20;   // 20 MPS以下 - 严重消息处理瓶颈

/**
 * 数据处理吞吐量阈值 (单位: 记录数/秒)
 * 🗄️ 数据处理引擎的性能标准
 */
export const DATA_PROCESSING_EXCELLENT_RECORDS_PER_SEC = 10000; // 10000条/秒 - 优秀数据处理
export const DATA_PROCESSING_GOOD_RECORDS_PER_SEC = 5000;      // 5000条/秒 - 良好数据处理  
export const DATA_PROCESSING_WARNING_RECORDS_PER_SEC = 1000;   // 1000条/秒 - 可接受数据处理
export const DATA_PROCESSING_POOR_RECORDS_PER_SEC = 500;       // 500条/秒 - 较慢数据处理
export const DATA_PROCESSING_CRITICAL_RECORDS_PER_SEC = 100;   // 100条/秒 - 严重数据处理瓶颈

// ========================= 并发性能阈值 =========================

/**
 * 并发请求处理阈值 (单位: 并发数)
 * 👥 系统同时处理请求的能力标准  
 */
export const CONCURRENT_REQUESTS_EXCELLENT_COUNT = 1000;   // 1000个 - 优秀并发处理能力
export const CONCURRENT_REQUESTS_GOOD_COUNT = 500;         // 500个 - 良好并发处理能力
export const CONCURRENT_REQUESTS_WARNING_COUNT = 200;      // 200个 - 可接受并发处理
export const CONCURRENT_REQUESTS_POOR_COUNT = 100;         // 100个 - 较低并发处理能力
export const CONCURRENT_REQUESTS_CRITICAL_COUNT = 50;      // 50个 - 严重并发处理瓶颈

/**
 * WebSocket并发连接阈值 (单位: 连接数)
 * 🔌 WebSocket同时连接数的性能标准
 */
export const WEBSOCKET_CONCURRENT_EXCELLENT_COUNT = 10000;  // 10000个连接 - 优秀连接容量
export const WEBSOCKET_CONCURRENT_GOOD_COUNT = 5000;        // 5000个连接 - 良好连接容量
export const WEBSOCKET_CONCURRENT_WARNING_COUNT = 1000;     // 1000个连接 - 可接受连接容量
export const WEBSOCKET_CONCURRENT_POOR_COUNT = 500;         // 500个连接 - 较低连接容量
export const WEBSOCKET_CONCURRENT_CRITICAL_COUNT = 100;     // 100个连接 - 严重连接瓶颈

// ========================= 队列和延迟监控阈值 =========================

/**
 * 请求队列长度阈值 (单位: 队列中的请求数)
 * 📤 请求队列积压情况的监控标准
 */
export const REQUEST_QUEUE_EXCELLENT_LENGTH = 10;          // 10个以下 - 队列畅通
export const REQUEST_QUEUE_GOOD_LENGTH = 50;               // 50个以下 - 队列正常
export const REQUEST_QUEUE_WARNING_LENGTH = 200;           // 200个以下 - 队列开始拥堵
export const REQUEST_QUEUE_POOR_LENGTH = 1000;             // 1000个以下 - 队列严重拥堵  
export const REQUEST_QUEUE_CRITICAL_LENGTH = 5000;         // 5000个以上 - 队列崩溃边缘

/**
 * 请求等待时间阈值 (单位: 毫秒)
 * ⏳ 请求在队列中等待的时间标准
 */
export const REQUEST_WAIT_TIME_EXCELLENT_MS = 10;          // 10ms以下 - 几乎无等待
export const REQUEST_WAIT_TIME_GOOD_MS = 50;               // 50ms以下 - 等待时间很短
export const REQUEST_WAIT_TIME_WARNING_MS = 200;           // 200ms以下 - 等待时间可接受
export const REQUEST_WAIT_TIME_POOR_MS = 1000;             // 1000ms以下 - 等待时间较长
export const REQUEST_WAIT_TIME_CRITICAL_MS = 5000;         // 5000ms以上 - 等待时间过长

// ========================= 性能监控配置 =========================

/**
 * 响应时间监控采集配置 (单位: 毫秒)
 * ⏱️ 响应时间指标采集的时间间隔
 */
export const RESPONSE_TIME_COLLECTION_INTERVAL_MS = 1000;     // 1秒 - 标准采集间隔
export const RESPONSE_TIME_FAST_COLLECTION_INTERVAL_MS = 500; // 0.5秒 - 高频采集（告警时）
export const RESPONSE_TIME_SLOW_COLLECTION_INTERVAL_MS = 5000; // 5秒 - 低频采集（正常时）

/**
 * 吞吐量监控采集配置 (单位: 毫秒)
 * 📊 吞吐量指标采集的时间间隔
 */
export const THROUGHPUT_COLLECTION_INTERVAL_MS = 5000;        // 5秒 - 标准采集间隔
export const THROUGHPUT_FAST_COLLECTION_INTERVAL_MS = 1000;   // 1秒 - 高频采集（告警时）
export const THROUGHPUT_SLOW_COLLECTION_INTERVAL_MS = 15000;  // 15秒 - 低频采集（正常时）

/**
 * 性能数据聚合配置 (单位: 秒)
 * 📈 性能指标数据聚合的时间窗口
 */
export const PERFORMANCE_METRICS_AGGREGATION_WINDOW_SEC = 60;    // 60秒 - 1分钟聚合窗口
export const PERFORMANCE_METRICS_SHORT_WINDOW_SEC = 15;          // 15秒 - 短期聚合窗口
export const PERFORMANCE_METRICS_LONG_WINDOW_SEC = 300;          // 300秒 - 长期聚合窗口（5分钟）

/**
 * 性能数据保留配置 (单位: 小时)
 * 💾 性能指标数据的保留时间
 */
export const PERFORMANCE_METRICS_RETENTION_HOURS = 72;          // 72小时 - 详细数据保留（3天）
export const PERFORMANCE_METRICS_AGGREGATED_RETENTION_HOURS = 720; // 720小时 - 聚合数据保留（30天）

// ========================= 性能告警配置 =========================

/**
 * 响应时间告警配置
 * 🚨 响应时间异常的告警参数
 */
export const RESPONSE_TIME_ALERT_COOLDOWN_MINUTES = 5;         // 5分钟 - 响应时间告警冷却时间
export const RESPONSE_TIME_ALERT_MAX_PER_HOUR = 12;            // 12次/小时 - 响应时间告警频率限制
export const RESPONSE_TIME_CONSECUTIVE_THRESHOLD_COUNT = 3;     // 3次连续 - 连续超阈值才告警

/**
 * 吞吐量告警配置
 * 📊 吞吐量异常的告警参数
 */
export const THROUGHPUT_ALERT_COOLDOWN_MINUTES = 10;           // 10分钟 - 吞吐量告警冷却时间
export const THROUGHPUT_ALERT_MAX_PER_HOUR = 6;                // 6次/小时 - 吞吐量告警频率限制
export const THROUGHPUT_CONSECUTIVE_THRESHOLD_COUNT = 5;        // 5次连续 - 连续低于阈值才告警

/**
 * 队列长度告警配置
 * 📤 队列积压的告警参数
 */
export const QUEUE_LENGTH_ALERT_COOLDOWN_MINUTES = 3;          // 3分钟 - 队列告警冷却时间
export const QUEUE_LENGTH_ALERT_MAX_PER_HOUR = 20;             // 20次/小时 - 队列告警频率限制
export const QUEUE_LENGTH_CONSECUTIVE_THRESHOLD_COUNT = 2;      // 2次连续 - 连续超阈值才告警

// ========================= 性能基准和目标 =========================

/**
 * SLA服务等级协议目标 (单位: 百分比，小数格式 0.0-1.0)
 * 🎯 系统性能的服务等级目标
 */
export const SLA_RESPONSE_TIME_P95_TARGET_MS = 500;            // P95响应时间目标: 500ms
export const SLA_RESPONSE_TIME_P99_TARGET_MS = 1000;           // P99响应时间目标: 1000ms
export const SLA_AVAILABILITY_TARGET = 0.999;                  // 99.9% - 可用性目标
export const SLA_ERROR_RATE_TARGET = 0.001;                    // 0.1% - 错误率目标

/**
 * 性能基准值 (单位: 毫秒)
 * 📏 系统性能的基准参考值
 */
export const PERFORMANCE_BASELINE_RESPONSE_TIME_MS = 200;      // 200ms - 响应时间基准
export const PERFORMANCE_BASELINE_THROUGHPUT_RPS = 300;        // 300 RPS - 吞吐量基准
export const PERFORMANCE_BASELINE_CONCURRENT_USERS = 200;      // 200并发 - 并发用户基准

/**
 * 性能优化触发阈值
 * 🔧 触发性能优化的条件阈值
 */
export const PERFORMANCE_OPTIMIZATION_TRIGGER_DEGRADATION = 0.2; // 20% - 性能下降触发优化
export const PERFORMANCE_OPTIMIZATION_TRIGGER_DURATION_MIN = 10;  // 10分钟 - 持续时间触发优化

// ========================= 负载测试相关配置 =========================

/**
 * 负载测试阶梯配置 (单位: RPS和并发数)
 * 🧪 负载测试的压力阶梯设定
 */
export const LOAD_TEST_STAGE_1_RPS = 100;                      // 100 RPS - 第一阶段负载
export const LOAD_TEST_STAGE_2_RPS = 300;                      // 300 RPS - 第二阶段负载
export const LOAD_TEST_STAGE_3_RPS = 500;                      // 500 RPS - 第三阶段负载
export const LOAD_TEST_STAGE_4_RPS = 1000;                     // 1000 RPS - 第四阶段负载（压力测试）
export const LOAD_TEST_STAGE_5_RPS = 2000;                     // 2000 RPS - 第五阶段负载（尖峰测试）

export const LOAD_TEST_STAGE_1_CONCURRENT = 50;                // 50并发 - 第一阶段并发
export const LOAD_TEST_STAGE_2_CONCURRENT = 150;               // 150并发 - 第二阶段并发
export const LOAD_TEST_STAGE_3_CONCURRENT = 250;               // 250并发 - 第三阶段并发
export const LOAD_TEST_STAGE_4_CONCURRENT = 500;               // 500并发 - 第四阶段并发
export const LOAD_TEST_STAGE_5_CONCURRENT = 1000;              // 1000并发 - 第五阶段并发

/**
 * 负载测试持续时间 (单位: 秒)
 * ⏱️ 各阶段负载测试的持续时间
 */
export const LOAD_TEST_STAGE_DURATION_SEC = 60;                // 60秒 - 每阶段持续时间
export const LOAD_TEST_RAMP_UP_DURATION_SEC = 30;              // 30秒 - 压力上升时间
export const LOAD_TEST_RAMP_DOWN_DURATION_SEC = 30;            // 30秒 - 压力下降时间

// ========================= 常量组合和类型定义 =========================

/**
 * API响应时间阈值组合对象
 * 📦 方便批量使用的API响应时间阈值集合
 */
export const API_RESPONSE_TIME_THRESHOLDS = {
  excellent: API_RESPONSE_TIME_EXCELLENT_MS,
  good: API_RESPONSE_TIME_GOOD_MS,
  warning: API_RESPONSE_TIME_WARNING_MS,
  poor: API_RESPONSE_TIME_POOR_MS,
  critical: API_RESPONSE_TIME_CRITICAL_MS
} as const;

/**
 * API吞吐量阈值组合对象  
 * 📦 方便批量使用的API吞吐量阈值集合
 */
export const API_THROUGHPUT_THRESHOLDS = {
  excellent: API_THROUGHPUT_EXCELLENT_RPS,
  good: API_THROUGHPUT_GOOD_RPS,
  warning: API_THROUGHPUT_WARNING_RPS,
  poor: API_THROUGHPUT_POOR_RPS,
  critical: API_THROUGHPUT_CRITICAL_RPS
} as const;

/**
 * 并发请求阈值组合对象
 * 📦 方便批量使用的并发请求阈值集合
 */
export const CONCURRENT_REQUESTS_THRESHOLDS = {
  excellent: CONCURRENT_REQUESTS_EXCELLENT_COUNT,
  good: CONCURRENT_REQUESTS_GOOD_COUNT,
  warning: CONCURRENT_REQUESTS_WARNING_COUNT,
  poor: CONCURRENT_REQUESTS_POOR_COUNT,
  critical: CONCURRENT_REQUESTS_CRITICAL_COUNT
} as const;

/**
 * 性能监控相关类型定义
 * 🏷️ TypeScript类型支持
 */
export type ResponsePerformanceThresholds = {
  readonly excellent: number;
  readonly good: number;
  readonly warning: number;
  readonly poor: number;
  readonly critical: number;
};

export type PerformanceMetricType = 'response_time' | 'throughput' | 'concurrent_requests' | 'queue_length' | 'wait_time';
export type PerformanceLevel = 'excellent' | 'good' | 'warning' | 'poor' | 'critical';
export type LoadTestStage = 'stage_1' | 'stage_2' | 'stage_3' | 'stage_4' | 'stage_5';