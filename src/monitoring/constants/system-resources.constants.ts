/**
 * 系统资源监控常量 - 直观优先架构
 * 🎯 CPU、内存、磁盘相关的所有监控阈值和配置
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

// ========================= CPU 监控阈值 =========================

/**
 * CPU使用率告警阈值 (单位: 百分比 0-100)
 * 🔥 系统CPU使用率监控的核心阈值，用于触发不同级别的告警
 */
export const CPU_USAGE_EXCELLENT_THRESHOLD = 30; // 30%以下 - 优秀状态，系统负载很低
export const CPU_USAGE_GOOD_THRESHOLD = 50; // 50%以下 - 良好状态，系统运行正常
export const CPU_USAGE_WARNING_THRESHOLD = 70; // 70%以下 - 警告状态，需要关注
export const CPU_USAGE_POOR_THRESHOLD = 85; // 85%以下 - 较差状态，需要优化
export const CPU_USAGE_CRITICAL_THRESHOLD = 90; // 90%以上 - 严重状态，立即处理

/**
 * CPU负载告警阈值 (单位: Load Average)
 * 📊 基于系统负载平均值的监控阈值，通常以CPU核心数为基准
 */
export const CPU_LOAD_NORMAL_MULTIPLIER = 0.7; // 0.7倍CPU核心数 - 正常负载
export const CPU_LOAD_WARNING_MULTIPLIER = 1.0; // 1.0倍CPU核心数 - 警告负载
export const CPU_LOAD_CRITICAL_MULTIPLIER = 1.5; // 1.5倍CPU核心数 - 严重负载

/**
 * CPU监控采集间隔 (单位: 毫秒)
 * ⏱️ CPU指标采集的时间间隔配置
 */
export const CPU_METRICS_COLLECTION_INTERVAL = 5000; // 5秒 - 标准采集间隔
export const CPU_METRICS_FAST_COLLECTION_INTERVAL = 1000; // 1秒 - 高频采集间隔（告警时）
export const CPU_METRICS_SLOW_COLLECTION_INTERVAL = 30000; // 30秒 - 低频采集间隔（正常时）

// ========================= 内存监控阈值 =========================

/**
 * 内存使用率告警阈值 (单位: 百分比 0-100)
 * 💾 系统内存使用率监控阈值，比CPU更需要保守策略
 */
export const MEMORY_USAGE_EXCELLENT_THRESHOLD = 40; // 40%以下 - 优秀状态，内存充足
export const MEMORY_USAGE_GOOD_THRESHOLD = 60; // 60%以下 - 良好状态，内存正常
export const MEMORY_USAGE_WARNING_THRESHOLD = 75; // 75%以下 - 警告状态，需要关注
export const MEMORY_USAGE_POOR_THRESHOLD = 85; // 85%以下 - 较差状态，需要释放内存
export const MEMORY_USAGE_CRITICAL_THRESHOLD = 95; // 95%以上 - 严重状态，内存即将耗尽

/**
 * 内存大小阈值 (单位: MB)
 * 📏 基于绝对内存大小的监控阈值
 */
export const MEMORY_LOW_AVAILABLE_MB = 512; // 512MB - 可用内存过低阈值
export const MEMORY_CRITICAL_AVAILABLE_MB = 256; // 256MB - 可用内存危险阈值
export const MEMORY_MINIMUM_FREE_MB = 128; // 128MB - 最小可用内存要求

/**
 * 内存监控采集间隔 (单位: 毫秒)
 * ⏱️ 内存指标采集的时间间隔配置
 */
export const MEMORY_METRICS_COLLECTION_INTERVAL = 10000; // 10秒 - 标准采集间隔
export const MEMORY_METRICS_FAST_COLLECTION_INTERVAL = 2000; // 2秒 - 高频采集间隔（告警时）
export const MEMORY_METRICS_SLOW_COLLECTION_INTERVAL = 60000; // 60秒 - 低频采集间隔（正常时）

/**
 * 垃圾回收监控阈值 (单位: 毫秒)
 * 🗑️ Node.js垃圾回收性能监控
 */
export const GC_DURATION_WARNING_THRESHOLD = 100; // 100ms - GC持续时间警告
export const GC_DURATION_CRITICAL_THRESHOLD = 500; // 500ms - GC持续时间严重
export const GC_FREQUENCY_WARNING_THRESHOLD = 10; // 10次/分钟 - GC频率警告
export const GC_FREQUENCY_CRITICAL_THRESHOLD = 30; // 30次/分钟 - GC频率严重

// ========================= 磁盘监控阈值 =========================

/**
 * 磁盘使用率告警阈值 (单位: 百分比 0-100)
 * 💽 磁盘空间使用率监控阈值，磁盘空间不足会导致系统崩溃
 */
export const DISK_USAGE_EXCELLENT_THRESHOLD = 50; // 50%以下 - 优秀状态，磁盘空间充足
export const DISK_USAGE_GOOD_THRESHOLD = 70; // 70%以下 - 良好状态，磁盘空间正常
export const DISK_USAGE_WARNING_THRESHOLD = 80; // 80%以下 - 警告状态，需要清理
export const DISK_USAGE_POOR_THRESHOLD = 90; // 90%以下 - 较差状态，急需清理
export const DISK_USAGE_CRITICAL_THRESHOLD = 95; // 95%以上 - 严重状态，立即处理

/**
 * 磁盘可用空间阈值 (单位: GB)
 * 📏 基于绝对可用空间大小的监控阈值
 */
export const DISK_FREE_SPACE_WARNING_GB = 5; // 5GB - 可用空间警告阈值
export const DISK_FREE_SPACE_CRITICAL_GB = 1; // 1GB - 可用空间危险阈值
export const DISK_FREE_SPACE_MINIMUM_GB = 0.5; // 0.5GB - 最小可用空间要求

/**
 * 磁盘I/O监控阈值
 * 📈 磁盘读写性能监控
 */
export const DISK_READ_SPEED_WARNING_MBPS = 100; // 100MB/s - 读取速度警告（过高可能异常）
export const DISK_WRITE_SPEED_WARNING_MBPS = 100; // 100MB/s - 写入速度警告（过高可能异常）
export const DISK_IOPS_WARNING_THRESHOLD = 1000; // 1000 IOPS - I/O操作数警告
export const DISK_IOPS_CRITICAL_THRESHOLD = 5000; // 5000 IOPS - I/O操作数严重

/**
 * 磁盘监控采集间隔 (单位: 毫秒)
 * ⏱️ 磁盘指标采集的时间间隔配置
 */
export const DISK_METRICS_COLLECTION_INTERVAL = 30000; // 30秒 - 标准采集间隔（磁盘变化较慢）
export const DISK_METRICS_FAST_COLLECTION_INTERVAL = 5000; // 5秒 - 高频采集间隔（告警时）
export const DISK_METRICS_SLOW_COLLECTION_INTERVAL = 300000; // 5分钟 - 低频采集间隔（正常时）

// ========================= 网络I/O监控阈值 =========================

/**
 * 网络流量监控阈值 (单位: KB/s)
 * 🌐 网络带宽使用监控，用于检测异常流量
 */
export const NETWORK_INBOUND_EXCELLENT_KBPS = 1000; // 1MB/s以下 - 入站流量正常
export const NETWORK_INBOUND_WARNING_KBPS = 10000; // 10MB/s以下 - 入站流量警告
export const NETWORK_INBOUND_CRITICAL_KBPS = 100000; // 100MB/s以上 - 入站流量严重

export const NETWORK_OUTBOUND_EXCELLENT_KBPS = 1000; // 1MB/s以下 - 出站流量正常
export const NETWORK_OUTBOUND_WARNING_KBPS = 10000; // 10MB/s以下 - 出站流量警告
export const NETWORK_OUTBOUND_CRITICAL_KBPS = 100000; // 100MB/s以上 - 出站流量严重

/**
 * 网络连接数监控阈值 (单位: 连接数)
 * 🔗 网络连接数量监控，用于检测连接异常
 */
export const NETWORK_CONNECTIONS_EXCELLENT_COUNT = 100; // 100个以下 - 连接数正常
export const NETWORK_CONNECTIONS_WARNING_COUNT = 1000; // 1000个以下 - 连接数警告
export const NETWORK_CONNECTIONS_CRITICAL_COUNT = 10000; // 10000个以上 - 连接数严重

/**
 * 网络监控采集间隔 (单位: 毫秒)
 * ⏱️ 网络指标采集的时间间隔配置
 */
export const NETWORK_METRICS_COLLECTION_INTERVAL = 5000; // 5秒 - 标准采集间隔
export const NETWORK_METRICS_FAST_COLLECTION_INTERVAL = 1000; // 1秒 - 高频采集间隔
export const NETWORK_METRICS_SLOW_COLLECTION_INTERVAL = 15000; // 15秒 - 低频采集间隔

// ========================= 系统进程监控阈值 =========================

/**
 * 进程监控阈值 (单位: 数量)
 * 🔄 系统进程数量监控，用于检测进程异常
 */
export const PROCESS_COUNT_WARNING_THRESHOLD = 500; // 500个 - 进程数警告阈值
export const PROCESS_COUNT_CRITICAL_THRESHOLD = 1000; // 1000个 - 进程数严重阈值

/**
 * 文件描述符监控阈值 (单位: 数量)
 * 📁 文件描述符使用情况监控
 */
export const FILE_DESCRIPTOR_WARNING_PERCENTAGE = 80; // 80% - 文件描述符使用率警告
export const FILE_DESCRIPTOR_CRITICAL_PERCENTAGE = 95; // 95% - 文件描述符使用率严重

/**
 * 系统负载监控阈值 (单位: Load Average)
 * ⚖️ 系统整体负载监控
 */
export const SYSTEM_LOAD_1MIN_WARNING = 2.0; // 2.0 - 1分钟负载警告
export const SYSTEM_LOAD_1MIN_CRITICAL = 5.0; // 5.0 - 1分钟负载严重
export const SYSTEM_LOAD_5MIN_WARNING = 1.5; // 1.5 - 5分钟负载警告
export const SYSTEM_LOAD_5MIN_CRITICAL = 3.0; // 3.0 - 5分钟负载严重
export const SYSTEM_LOAD_15MIN_WARNING = 1.0; // 1.0 - 15分钟负载警告
export const SYSTEM_LOAD_15MIN_CRITICAL = 2.0; // 2.0 - 15分钟负载严重

// ========================= 系统资源监控通用配置 =========================

/**
 * 系统资源监控通用设置
 * ⚙️ 适用于所有系统资源监控的通用参数
 */
export const SYSTEM_METRICS_RETENTION_HOURS = 24; // 24小时 - 系统指标数据保留时间
export const SYSTEM_METRICS_AGGREGATION_MINUTES = 5; // 5分钟 - 系统指标聚合间隔
export const SYSTEM_METRICS_ALERT_COOLDOWN_MINUTES = 10; // 10分钟 - 系统资源告警冷却时间

/**
 * 系统资源告警配置
 * 🚨 系统资源相关告警的配置参数
 */
export const SYSTEM_RESOURCE_ALERT_MAX_PER_HOUR = 6; // 6次/小时 - 系统资源告警频率限制
export const SYSTEM_RESOURCE_ALERT_BATCH_SIZE = 10; // 10条 - 系统资源告警批量大小
export const SYSTEM_RESOURCE_ALERT_DELAY_SECONDS = 30; // 30秒 - 系统资源告警延迟发送

/**
 * 系统健康检查配置
 * 💗 系统健康状态检查的配置参数
 */
export const SYSTEM_HEALTH_CHECK_INTERVAL_SECONDS = 30; // 30秒 - 健康检查间隔
export const SYSTEM_HEALTH_CHECK_TIMEOUT_SECONDS = 5; // 5秒 - 健康检查超时
export const SYSTEM_HEALTH_CHECK_RETRY_COUNT = 3; // 3次 - 健康检查重试次数
export const SYSTEM_HEALTH_CHECK_FAILURE_THRESHOLD = 3; // 3次 - 健康检查失败阈值（连续失败）

// ========================= 常量组合和类型定义 =========================

/**
 * CPU阈值组合对象
 * 📦 方便批量使用的CPU相关阈值集合
 */
export const CPU_THRESHOLDS = {
  excellent: CPU_USAGE_EXCELLENT_THRESHOLD,
  good: CPU_USAGE_GOOD_THRESHOLD,
  warning: CPU_USAGE_WARNING_THRESHOLD,
  poor: CPU_USAGE_POOR_THRESHOLD,
  critical: CPU_USAGE_CRITICAL_THRESHOLD,
} as const;

/**
 * 内存阈值组合对象
 * 📦 方便批量使用的内存相关阈值集合
 */
export const MEMORY_THRESHOLDS = {
  excellent: MEMORY_USAGE_EXCELLENT_THRESHOLD,
  good: MEMORY_USAGE_GOOD_THRESHOLD,
  warning: MEMORY_USAGE_WARNING_THRESHOLD,
  poor: MEMORY_USAGE_POOR_THRESHOLD,
  critical: MEMORY_USAGE_CRITICAL_THRESHOLD,
} as const;

/**
 * 磁盘阈值组合对象
 * 📦 方便批量使用的磁盘相关阈值集合
 */
export const DISK_THRESHOLDS = {
  excellent: DISK_USAGE_EXCELLENT_THRESHOLD,
  good: DISK_USAGE_GOOD_THRESHOLD,
  warning: DISK_USAGE_WARNING_THRESHOLD,
  poor: DISK_USAGE_POOR_THRESHOLD,
  critical: DISK_USAGE_CRITICAL_THRESHOLD,
} as const;

/**
 * 系统资源阈值类型定义
 * 🏷️ TypeScript类型支持
 */
export type SystemResourceThresholds = {
  readonly excellent: number;
  readonly good: number;
  readonly warning: number;
  readonly poor: number;
  readonly critical: number;
};

export type SystemResourceType =
  | "cpu"
  | "memory"
  | "disk"
  | "network"
  | "process";
export type SystemResourceLevel =
  | "excellent"
  | "good"
  | "warning"
  | "poor"
  | "critical";
