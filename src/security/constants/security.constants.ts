/**
 * @fileoverview 安全模块相关的常量
 * 包含风险评分权重、标签规则等。
 */

/**
 * 风险评分权重配置
 * 用于 calculateRiskScore 方法，将硬编码的 switch-case 逻辑转换为数据驱动。
 */
export const RISK_SCORE_WEIGHTS = {
  // 基于事件严重程度的基准分
  severity: {
    critical: 40,
    high: 30,
    medium: 20,
    low: 10,
    info: 5,
  },
  // 基于事件类型的附加分
  type: {
    suspicious_activity: 30,
    authentication: 10,
    authorization: 15,
    data_access: 10,
    system: 15,
  },
  // 基于事件结果的附加分
  outcome: {
    failure: 20,
    blocked: 25,
    success: 0,
  },
  // 其他风险因子的附加分
  factors: {
    suspicious_ip: 20,
    high_failure_rate: 15,
  },
};

/**
 * 标签生成规则
 * 用于 generateTags 方法，定义在何种条件下应附加何种标签。
 */
export const TAG_GENERATION_RULES = {
  // 条件 -> 标签
  conditions: {
    isSuspiciousIp: 'suspicious_ip',
    isIncident: 'security_incident',
    isAuthFailure: 'auth_failure',
  },
  // 直接从事件属性映射
  directMap: ['type', 'severity'],
};

/**
 * 安全建议触发阈值
 * 用于 generateSecurityRecommendations 方法
 */
export const RECOMMENDATION_THRESHOLDS = {
  failedAuthentications: 100,
  suspiciousActivities: 10,
  criticalEvents: 0, // 任何严重事件都应触发建议
  uniqueFailureIPs: 20,
};

/**
 * =================================================================
 * Security Scanner Constants
 * =================================================================
 */

/**
 * 安全扫描器使用的扫描规则和阈值
 */
export const SECURITY_SCANNER_RULES = {
  defaultUsernames: ['admin', 'root', 'test', 'demo', 'user', 'guest'],
  apiKeyPermissionThreshold: 5, // 超过此数量的权限被认为过于宽泛
  apiKeyRateLimitThreshold: 10000, // 超过此值的速率限制被认为不足
  jwtSecretMinLength: 32,
};

/**
 * 安全扫描器用于计算总分的权重
 */
export const SECURITY_SCORE_VULNERABILITY_WEIGHTS = {
  critical: 20,
  high: 10,
  medium: 5,
  low: 2,
  info: 1,
}; 