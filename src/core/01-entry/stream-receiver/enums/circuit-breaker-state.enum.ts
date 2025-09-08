/**
 * 熔断器状态和配置（已迁移到Domain层）
 * 
 * @deprecated 此文件已迁移，建议统一使用Domain层实现
 * @description
 * - 为了向后兼容，重新导出Domain层的实现
 * - 请更新导入到 `@common/constants/domain/circuit-breaker-domain.constants`
 * - 根据代码审查建议，删除本地重复定义
 */

// 重新导出Domain层的实现，确保向后兼容性
export {
  CircuitState as CircuitBreakerState,
  type CircuitBreakerConfig,
  CIRCUIT_BREAKER_BUSINESS_SCENARIOS,
  CIRCUIT_BREAKER_CONSTANTS
} from '@common/constants/domain/circuit-breaker-domain.constants';

// 为了完全向后兼容，提供原始API的映射
import { 
  CIRCUIT_BREAKER_BUSINESS_SCENARIOS 
} from '@common/constants/domain/circuit-breaker-domain.constants';

/**
 * @deprecated 使用CIRCUIT_BREAKER_BUSINESS_SCENARIOS.STREAM_RECEIVER替代
 */
export const CIRCUIT_BREAKER_CONFIG = {
  FAILURE_THRESHOLD: CIRCUIT_BREAKER_BUSINESS_SCENARIOS.WEBSOCKET.failureThreshold,
  SUCCESS_THRESHOLD: CIRCUIT_BREAKER_BUSINESS_SCENARIOS.WEBSOCKET.successThreshold,
  TIMEOUT_MS: CIRCUIT_BREAKER_BUSINESS_SCENARIOS.WEBSOCKET.timeout,
  RETRY_ATTEMPTS: 3, // 保持原有配置 - 使用基础数值
} as const;