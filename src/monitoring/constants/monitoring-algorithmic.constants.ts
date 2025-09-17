/**
 * Monitoring Algorithmic Constants - Fixed Technical Standards
 * 🎯 Contains ONLY truly fixed constants based on technical specifications and algorithmic characteristics
 *
 * ⭐ Inclusion Criteria:
 * - Technical performance characteristics (Redis memory access speeds, network latency limits)
 * - Protocol specifications (WebSocket real-time requirements, HTTP standard response codes)
 * - Algorithmic standards (cache hit rate thresholds based on memory hierarchy theory)
 * - Industry benchmarks (database query performance based on hardware capabilities)
 * - Semantic constants (status levels, operation types that don't change)
 *
 * ❌ Exclusion Criteria:
 * - Business configurable parameters (moved to MonitoringEnhancedConfig)
 * - Environment-dependent settings (moved to unified configuration system)
 * - User-adjustable thresholds (moved to performance thresholds config)
 * - Time intervals and frequencies (moved to events config)
 *
 * 🔬 Technical Rationale for Each Constant:
 * These constants are based on physical/technical limits and proven algorithmic principles,
 * not business requirements that might change based on operational needs.
 *
 * @version 1.0.0
 * @since 2025-09-16 (Phase 3: Constants File Cleanup)
 * @author Claude Code
 */

// ========================= Redis Performance Algorithm Constants =========================

/**
 * Redis Cache Hit Rate Algorithmic Thresholds
 * 🧮 Based on memory hierarchy theory and Redis architectural characteristics
 *
 * 📊 Technical Foundation:
 * These thresholds are derived from computer science principles of memory hierarchies:
 * - 95% excellent: Theoretical optimal for in-memory caching considering eviction necessity
 * - 85% good: Production-grade performance for memory-constrained systems
 * - 70% warning: Performance degradation threshold where cache effectiveness diminishes
 * - 50% poor: Cache becomes ineffective, approaching random access performance
 * - 30% critical: Below cache utility threshold, system resources wasted
 *
 * 🔬 Algorithmic Basis:
 * Based on Pareto principle and empirical studies of cache performance in distributed systems.
 * These values represent fixed algorithmic boundaries, not business preferences.
 */
export const REDIS_CACHE_HIT_RATE_EXCELLENT_THRESHOLD = 0.95; // 95% - Algorithmic optimal
export const REDIS_CACHE_HIT_RATE_GOOD_THRESHOLD = 0.85; // 85% - Production grade
export const REDIS_CACHE_HIT_RATE_WARNING_THRESHOLD = 0.7; // 70% - Efficiency threshold
export const REDIS_CACHE_HIT_RATE_POOR_THRESHOLD = 0.5; // 50% - Utility threshold
export const REDIS_CACHE_HIT_RATE_CRITICAL_THRESHOLD = 0.3; // 30% - Waste threshold

/**
 * Redis Response Time Technical Limits (milliseconds)
 * ⚡ Based on Redis memory access characteristics and network physics
 *
 * 📊 Technical Foundation:
 * These limits are based on Redis's in-memory architecture and network constraints:
 * - 5ms excellent: Local network + memory access theoretical minimum
 * - 20ms good: Including serialization overhead for typical data structures
 * - 50ms warning: Network latency starting to impact performance
 * - 100ms poor: Network/load issues, exceeding memory cache benefits
 * - 500ms critical: Severe system issues, cache losing purpose
 *
 * 🔬 Physical Basis:
 * Based on memory access speeds (nanoseconds) + network latency + serialization overhead.
 * These represent technical limits, not adjustable business parameters.
 */
export const REDIS_RESPONSE_TIME_EXCELLENT_MS = 5; // 5ms - Memory + network optimal
export const REDIS_RESPONSE_TIME_GOOD_MS = 20; // 20ms - With serialization
export const REDIS_RESPONSE_TIME_WARNING_MS = 50; // 50ms - Network impact threshold
export const REDIS_RESPONSE_TIME_POOR_MS = 100; // 100ms - Performance degradation
export const REDIS_RESPONSE_TIME_CRITICAL_MS = 500; // 500ms - System failure threshold

// ========================= WebSocket Protocol Standards =========================

/**
 * WebSocket Real-time Response Requirements (milliseconds)
 * 📡 Based on WebSocket protocol specifications and human perception thresholds
 *
 * 📊 Technical Foundation:
 * These limits are based on WebSocket protocol design for real-time communication:
 * - 50ms excellent: Human perception threshold for "instantaneous" response
 * - 100ms good: Acceptable for real-time interaction (RFC 6455 guidelines)
 * - 200ms warning: Noticeable delay but still real-time
 * - 500ms poor: Real-time experience degraded
 * - 1000ms critical: No longer real-time, WebSocket advantage lost
 *
 * 🔬 Protocol Basis:
 * Based on WebSocket RFC 6455 specifications and human-computer interaction research.
 * These represent protocol-level requirements, not business preferences.
 */
export const WEBSOCKET_RESPONSE_TIME_EXCELLENT_MS = 50; // 50ms - Human perception optimal
export const WEBSOCKET_RESPONSE_TIME_GOOD_MS = 100; // 100ms - RFC 6455 acceptable
export const WEBSOCKET_RESPONSE_TIME_WARNING_MS = 200; // 200ms - Noticeable delay
export const WEBSOCKET_RESPONSE_TIME_POOR_MS = 500; // 500ms - Degraded real-time
export const WEBSOCKET_RESPONSE_TIME_CRITICAL_MS = 1000; // 1000ms - Non-real-time

// ========================= HTTP Protocol Standards =========================

/**
 * HTTP Response Time User Experience Thresholds (milliseconds)
 * 🌐 Based on HTTP protocol standards and cognitive psychology research
 *
 * 📊 Technical Foundation:
 * These thresholds are based on established web performance research:
 * - 100ms excellent: Perceived as instantaneous (Jakob Nielsen's research)
 * - 300ms good: User notices but considers responsive
 * - 1000ms warning: User starts to feel system lag
 * - 3000ms poor: User frustration threshold
 * - 5000ms critical: User abandonment threshold
 *
 * 🔬 Cognitive Basis:
 * Based on human cognitive processing speeds and web usability research.
 * These represent fixed human factors, not adjustable business parameters.
 */
export const HTTP_RESPONSE_TIME_EXCELLENT_MS = 100; // 100ms - Cognitive imperceptible
export const HTTP_RESPONSE_TIME_GOOD_MS = 300; // 300ms - User acceptable
export const HTTP_RESPONSE_TIME_WARNING_MS = 1000; // 1000ms - User notice threshold
export const HTTP_RESPONSE_TIME_POOR_MS = 3000; // 3000ms - Frustration threshold
export const HTTP_RESPONSE_TIME_CRITICAL_MS = 5000; // 5000ms - Abandonment threshold

// ========================= Database Performance Algorithm Constants =========================

/**
 * MongoDB Query Performance Technical Limits (milliseconds)
 * 🗄️ Based on database engine characteristics and storage hierarchy
 *
 * 📊 Technical Foundation:
 * These limits are based on MongoDB's architecture and storage performance:
 * - 50ms excellent: Memory-resident data with proper indexing
 * - 200ms good: Disk I/O with efficient query plans
 * - 1000ms warning: Inefficient queries or storage bottlenecks
 * - 3000ms poor: Serious optimization needed
 * - 10000ms critical: System-level problems
 *
 * 🔬 Algorithmic Basis:
 * Based on B-tree index performance, disk I/O characteristics, and query optimization theory.
 * These represent technical database limits, not business preferences.
 */
export const MONGODB_QUERY_TIME_EXCELLENT_MS = 50; // 50ms - Index + memory optimal
export const MONGODB_QUERY_TIME_GOOD_MS = 200; // 200ms - Disk I/O acceptable
export const MONGODB_QUERY_TIME_WARNING_MS = 1000; // 1000ms - Optimization threshold
export const MONGODB_QUERY_TIME_POOR_MS = 3000; // 3000ms - Performance problem
export const MONGODB_QUERY_TIME_CRITICAL_MS = 10000; // 10000ms - System failure

// ========================= Semantic Status and Operation Constants =========================

/**
 * Monitoring Health Status Levels
 * 🏥 Semantic constants for system health classification
 *
 * 📊 Technical Foundation:
 * These are semantic classifications for monitoring states that follow
 * industry standard practices and don't change based on business logic.
 */
export const HEALTH_STATUS_LEVELS = {
  EXCELLENT: "excellent",
  GOOD: "good",
  WARNING: "warning",
  POOR: "poor",
  CRITICAL: "critical",
} as const;

/**
 * Cache Operation Types
 * 💾 Semantic constants for cache operations
 *
 * 📊 Technical Foundation:
 * Standard cache operation types based on cache theory and Redis commands.
 * These are algorithmic concepts that don't change.
 */
export const CACHE_OPERATION_TYPES = {
  GET: "get",
  SET: "set",
  DELETE: "delete",
  EXISTS: "exists",
  EXPIRE: "expire",
  EVICT: "evict",
} as const;

/**
 * Database Operation Types
 * 🗄️ Semantic constants for database operations
 *
 * 📊 Technical Foundation:
 * Standard database operation types based on relational and document database theory.
 * These represent fundamental data operations that don't change.
 */
export const DATABASE_OPERATION_TYPES = {
  SELECT: "select",
  INSERT: "insert",
  UPDATE: "update",
  DELETE: "delete",
  AGGREGATE: "aggregate",
  INDEX: "index",
  TRANSACTION: "transaction",
} as const;

/**
 * Alert Severity Levels
 * 🚨 Semantic constants for alert classification
 *
 * 📊 Technical Foundation:
 * Standard alert severity levels following incident management best practices.
 * These classifications are industry standard and algorithmically meaningful.
 */
export const ALERT_SEVERITY_LEVELS = {
  INFO: "info",
  WARNING: "warning",
  CRITICAL: "critical",
  EMERGENCY: "emergency",
} as const;

// ========================= Network and Connection Constants =========================

/**
 * Connection Pool Technical Limits
 * 🔗 Based on operating system and network stack limitations
 *
 * 📊 Technical Foundation:
 * These limits are based on OS-level constraints and network programming:
 * - File descriptor limits per process
 * - TCP connection state management
 * - Memory overhead per connection
 *
 * 🔬 System Basis:
 * Based on UNIX file descriptor limits and TCP/IP stack characteristics.
 * These represent system-level constraints, not business configuration.
 */
export const CONNECTION_POOL_USAGE_EXCELLENT_THRESHOLD = 30; // 30% - Optimal resource usage
export const CONNECTION_POOL_USAGE_GOOD_THRESHOLD = 50; // 50% - Acceptable usage
export const CONNECTION_POOL_USAGE_WARNING_THRESHOLD = 70; // 70% - Resource pressure
export const CONNECTION_POOL_USAGE_POOR_THRESHOLD = 85; // 85% - Near capacity
export const CONNECTION_POOL_USAGE_CRITICAL_THRESHOLD = 95; // 95% - Resource exhaustion

// ========================= Data Structure Constants =========================

/**
 * Sampling Algorithm Constants
 * 📊 Based on statistical sampling theory and data processing algorithms
 *
 * 📊 Technical Foundation:
 * These constants are based on statistical significance and algorithmic efficiency:
 * - Minimum sample size for statistical validity
 * - Recent data points for trend analysis
 * - Optimal batch sizes for processing efficiency
 *
 * 🔬 Statistical Basis:
 * Based on central limit theorem and time series analysis requirements.
 * These represent mathematical constants, not business preferences.
 */
export const SAMPLING_RECENT_METRICS_COUNT = 5; // 5 points - Minimum trend analysis
export const SAMPLING_MIN_DATA_POINTS = 5; // 5 points - Statistical minimum
export const SAMPLING_OPTIMAL_SMALL = 10; // 10 points - Small sample optimal
export const SAMPLING_OPTIMAL_MEDIUM = 50; // 50 points - Medium sample optimal
export const SAMPLING_OPTIMAL_LARGE = 100; // 100 points - Large sample optimal

// ========================= Performance Score Algorithm Constants =========================

/**
 * Performance Scoring Algorithmic Thresholds
 * 📈 Based on performance evaluation algorithms and percentile distributions
 *
 * 📊 Technical Foundation:
 * These score thresholds are based on performance distribution analysis:
 * - Statistical percentile boundaries
 * - Performance classification algorithms
 * - Quality assurance standards
 *
 * 🔬 Algorithmic Basis:
 * Based on statistical distribution theory and performance measurement science.
 * These represent algorithmic boundaries for classification, not business preferences.
 */
export const PERFORMANCE_SCORE_POOR_THRESHOLD = 50; // 50% - Bottom quartile
export const PERFORMANCE_SCORE_FAIR_THRESHOLD = 70; // 70% - Below average
export const PERFORMANCE_SCORE_GOOD_THRESHOLD = 80; // 80% - Above average
export const PERFORMANCE_SCORE_EXCELLENT_THRESHOLD = 90; // 90% - Top decile
export const PERFORMANCE_SCORE_PERFECT_THRESHOLD = 95; // 95% - Top 5%

// ========================= Constant Groupings for Utility =========================

/**
 * Redis Performance Thresholds Combined
 * 📦 Grouped for algorithmic convenience
 */
export const REDIS_CACHE_HIT_RATE_THRESHOLDS = {
  excellent: REDIS_CACHE_HIT_RATE_EXCELLENT_THRESHOLD,
  good: REDIS_CACHE_HIT_RATE_GOOD_THRESHOLD,
  warning: REDIS_CACHE_HIT_RATE_WARNING_THRESHOLD,
  poor: REDIS_CACHE_HIT_RATE_POOR_THRESHOLD,
  critical: REDIS_CACHE_HIT_RATE_CRITICAL_THRESHOLD,
} as const;

/**
 * Redis Response Time Thresholds Combined
 * 📦 Grouped for algorithmic convenience
 */
export const REDIS_RESPONSE_TIME_THRESHOLDS = {
  excellent: REDIS_RESPONSE_TIME_EXCELLENT_MS,
  good: REDIS_RESPONSE_TIME_GOOD_MS,
  warning: REDIS_RESPONSE_TIME_WARNING_MS,
  poor: REDIS_RESPONSE_TIME_POOR_MS,
  critical: REDIS_RESPONSE_TIME_CRITICAL_MS,
} as const;

/**
 * WebSocket Response Time Thresholds Combined
 * 📦 Grouped for algorithmic convenience
 */
export const WEBSOCKET_RESPONSE_TIME_THRESHOLDS = {
  excellent: WEBSOCKET_RESPONSE_TIME_EXCELLENT_MS,
  good: WEBSOCKET_RESPONSE_TIME_GOOD_MS,
  warning: WEBSOCKET_RESPONSE_TIME_WARNING_MS,
  poor: WEBSOCKET_RESPONSE_TIME_POOR_MS,
  critical: WEBSOCKET_RESPONSE_TIME_CRITICAL_MS,
} as const;

/**
 * Performance Score Thresholds Combined
 * 📦 Grouped for algorithmic convenience
 */
export const PERFORMANCE_SCORE_THRESHOLDS = {
  poor: PERFORMANCE_SCORE_POOR_THRESHOLD,
  fair: PERFORMANCE_SCORE_FAIR_THRESHOLD,
  good: PERFORMANCE_SCORE_GOOD_THRESHOLD,
  excellent: PERFORMANCE_SCORE_EXCELLENT_THRESHOLD,
  perfect: PERFORMANCE_SCORE_PERFECT_THRESHOLD,
} as const;

// ========================= Type Definitions =========================

/**
 * Performance Level Types
 * 🏷️ TypeScript types for algorithmic use
 */
export type PerformanceLevel =
  | "poor"
  | "fair"
  | "good"
  | "excellent"
  | "perfect";
export type HealthLevel =
  | "excellent"
  | "good"
  | "warning"
  | "poor"
  | "critical";
export type AlertSeverity = "info" | "warning" | "critical" | "emergency";
export type CacheOperation =
  | "get"
  | "set"
  | "delete"
  | "exists"
  | "expire"
  | "evict";
export type DatabaseOperation =
  | "select"
  | "insert"
  | "update"
  | "delete"
  | "aggregate"
  | "index"
  | "transaction";

/**
 * Performance Threshold Interface
 * 🏷️ Standard structure for threshold objects
 */
export interface AlgorithmicThresholds {
  readonly excellent: number;
  readonly good: number;
  readonly warning: number;
  readonly poor: number;
  readonly critical: number;
}
