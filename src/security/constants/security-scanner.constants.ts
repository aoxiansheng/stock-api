/**
 * 安全扫描服务常量定义
 * 🎯 符合开发规范指南 - 统一常量管理
 */

// 🔧 扫描配置常量
export const SECURITY_SCANNER_CONFIG = Object.freeze({
  SCAN_INTERVAL_MS: 24 * 60 * 60 * 1000, // 每天一次扫描
  SCAN_TIMEOUT_MS: 30 * 60 * 1000, // 30分钟扫描超时
  MAX_CONCURRENT_SCANS: 1, // 最大并发扫描数
  DEFAULT_SCAN_HISTORY_LIMIT: 10, // 默认扫描历史记录数量
  SCAN_ID_PREFIX: 'scan_', // 扫描ID前缀
  SCAN_ID_RANDOM_BYTES: 4, // 扫描ID随机字节数
});

// 📝 操作名称常量
export const SECURITY_SCANNER_OPERATIONS = Object.freeze({
  PERFORM_SCAN: 'performSecurityScan',
  GET_SCAN_HISTORY: 'getScanHistory',
  GET_SECURITY_CONFIG: 'getCurrentSecurityConfiguration',
  CHECK_PASSWORD_SECURITY: 'checkPasswordSecurity',
  CHECK_API_KEY_SECURITY: 'checkAPIKeySecurity',
  CHECK_CONFIGURATION_SECURITY: 'checkConfigurationSecurity',
  CHECK_ENCRYPTION_SECURITY: 'checkEncryptionSecurity',
  CALCULATE_SUMMARY: 'calculateSummary',
  CALCULATE_SECURITY_SCORE: 'calculateSecurityScore',
  GENERATE_RECOMMENDATIONS: 'generateRecommendations',
});

// 📢 消息常量
export const SECURITY_SCANNER_MESSAGES = Object.freeze({
  // 成功消息
  SCAN_STARTED: '开始安全扫描',
  SCAN_COMPLETED: '安全扫描完成',
  SCAN_HISTORY_RETRIEVED: '获取扫描历史成功',
  SECURITY_CONFIG_RETRIEVED: '获取安全配置成功',
  
  // 错误消息
  SCAN_FAILED: '安全扫描失败',
  PARTIAL_CHECK_FAILED: '部分安全检查失败',
  SCAN_HISTORY_FAILED: '获取扫描历史失败',
  SECURITY_CONFIG_FAILED: '获取安全配置失败',
  PASSWORD_CHECK_FAILED: '密码安全检查失败',
  API_KEY_CHECK_FAILED: 'API Key安全检查失败',
  CONFIG_CHECK_FAILED: '配置安全检查失败',
  ENCRYPTION_CHECK_FAILED: '加密安全检查失败',
  
  // 警告消息
  HIGH_VULNERABILITY_COUNT: '发现高危漏洞数量较多',
  LOW_SECURITY_SCORE: '安全评分较低',
  SCAN_TIMEOUT_WARNING: '扫描执行时间较长',
});

// 🛡️ 漏洞模板常量
export const SECURITY_VULNERABILITY_TEMPLATES = Object.freeze({
  DEFAULT_CREDENTIALS: {
    id: 'default_credentials',
    type: 'authentication',
    severity: 'critical',
    title: '存在默认凭据账户',
    description: '系统中存在默认账户: {usernames}',
    impact: '攻击者可能尝试使用默认密码登录',
    recommendation: '删除或重命名默认账户，并确保使用强密码',
  },
  
  EXPIRED_API_KEY: {
    id: 'expired_api_key_{id}',
    type: 'authentication',
    severity: 'high',
    title: '过期的API Key仍然活跃',
    description: 'API Key {maskedKey}... 已过期但仍处于活跃状态',
    impact: '过期的API Key可能被恶意使用',
    recommendation: '立即禁用所有过期的API Key',
  },
  
  EXCESSIVE_PERMISSIONS: {
    id: 'excessive_permissions_{id}',
    type: 'authorization',
    severity: 'medium',
    title: 'API Key权限过于宽泛',
    description: 'API Key {maskedKey}... 拥有过多权限',
    impact: '增加权限滥用的风险',
    recommendation: '遵循最小权限原则，只授予必要的权限',
  },
  
  INSUFFICIENT_RATE_LIMITING: {
    id: 'insufficient_rate_limiting',
    type: 'configuration',
    severity: 'medium',
    title: 'API Key频率限制不足',
    description: '发现 {count} 个API Key没有适当的频率限制',
    impact: '可能被用于DoS攻击或资源滥用',
    recommendation: '为所有API Key设置合理的频率限制',
  },
  
  WEAK_JWT_SECRET: {
    id: 'weak_jwt_secret',
    type: 'configuration',
    severity: 'critical',
    title: 'JWT密钥强度不足',
    description: 'JWT签名密钥长度不足{minLength}字符或未设置',
    impact: 'JWT可能被破解，导致身份伪造',
    recommendation: '在.env文件中设置一个至少{minLength}个字符的随机字符串作为JWT_SECRET',
  },
  
  LOCALHOST_DB_IN_PRODUCTION: {
    id: 'localhost_db_in_production',
    type: 'configuration',
    severity: 'high',
    title: '生产环境使用本地数据库',
    description: '生产环境的数据库连接指向本地',
    impact: '可能导致数据丢失或服务不可用，且不具备高可用性',
    recommendation: '为生产环境配置专用的高可用数据库服务地址',
  },
  
  WEAK_PASSWORD_HASHING: {
    id: 'weak_password_hashing',
    type: 'encryption',
    severity: 'high',
    title: '密码哈希强度不足',
    description: 'Bcrypt轮数设置为 {currentRounds}，低于建议的 {recommendedRounds} 轮',
    impact: '密码哈希可能被更快地离线破解',
    recommendation: '将Bcrypt哈希轮数增加到至少 {recommendedRounds} 轮',
  },

  // 🎯 新增的模板
  WEAK_PASSWORD_POLICY: {
    id: 'weak_password_policy',
    type: 'configuration',
    severity: 'high',
    title: '密码策略过于宽松',
    description: '密码策略不符合最小安全要求（如长度、复杂度）',
    impact: '用户账户更容易被暴力破解',
    recommendation: '加强密码策略，要求最小长度、大小写、数字和特殊字符的组合',
  },

  LONG_JWT_EXPIRY: {
    id: 'long_jwt_expiry',
    type: 'authentication',
    severity: 'medium',
    title: 'JWT 过期时间过长',
    description: 'JWT 的过期时间设置为 {expiry}，超过了建议的最大值',
    impact: '增加了会话被劫持后攻击者可利用的时间窗口',
    recommendation: '缩短 JWT 的过期时间，并实施刷新令牌机制',
  },

  HTTP_NOT_ENFORCED: {
    id: 'http_not_enforced',
    type: 'configuration',
    severity: 'critical',
    title: '生产环境未强制使用 HTTPS',
    description: '生产环境中的 API 调用允许通过 HTTP 进行',
    impact: '敏感数据（如凭据、令牌）可能在传输过程中被窃听',
    recommendation: '强制所有 API 调用使用 HTTPS',
  },

  MISSING_ENV_VAR: {
    id: 'missing_env_var_{name}',
    type: 'configuration',
    severity: 'high',
    title: '缺少关键环境变量',
    description: '缺少必要的环境变量 {name}',
    impact: '可能导致服务配置不当或使用不安全的默认值',
    recommendation: '确保所有必要的环境变量都已在部署环境中正确设置',
  },

  NO_MFA: {
    id: 'no_mfa',
    type: 'authentication',
    severity: 'medium',
    title: '未启用多因素认证 (MFA)',
    description: '系统未对用户（尤其是管理员）启用多因素认证',
    impact: '即使用户凭据泄露，MFA 也可以提供额外的安全保护',
    recommendation: '为所有用户，特别是高权限账户，启用多因素认证',
  },

  POTENTIAL_DATA_EXPOSURE: {
    id: 'potential_data_exposure',
    type: 'data_exposure',
    severity: 'low',
    title: '潜在的数据泄露风险',
    description: 'API 响应中可能包含过多的敏感信息',
    impact: '攻击者可能利用暴露的信息进行进一步攻击',
    recommendation: '审查所有 API 响应，确保只返回必要的数据，并对敏感信息进行脱敏处理',
  },
  
  NOSQL_INJECTION_RISK: {
    id: 'nosql_injection_risk',
    type: 'injection',
    severity: 'high',
    title: '潜在的 NoSQL 注入风险',
    description: '部分数据查询入口可能未对用户输入进行充分的清理和验证',
    impact: '攻击者可能构造恶意查询来绕过认证或访问未授权数据',
    recommendation: '对所有用户输入进行严格的验证和清理，使用参数化查询或 ORM/ODM 来防止注入攻击',
  }
});

// 💡 推荐消息常量
export const SECURITY_SCANNER_RECOMMENDATIONS = Object.freeze({
  GENERAL_AUDIT: '定期进行安全审计和漏洞评估',
  UPDATE_DEPENDENCIES: '保持所有依赖包为最新版本以修复已知漏洞',
  IMPLEMENT_2FA: '为管理员账户启用双因素认证',
  REGULAR_PASSWORD_ROTATION: '定期更换密码和API密钥',
  SECURITY_MONITORING: '实施实时安全监控和告警',
  ACCESS_LOG_REVIEW: '定期审查访问日志和异常活动',
  BACKUP_STRATEGY: '建立完善的数据备份和恢复策略',
  SECURITY_TRAINING: '为开发团队提供安全编码培训',
  PENETRATION_TESTING: '定期进行渗透测试',
  COMPLIANCE_CHECK: '确保符合相关安全合规要求',
});

// 📊 安全评分配置
export const SECURITY_SCANNER_SCORING = Object.freeze({
  INITIAL_SCORE: 100, // 初始安全评分
  SCORE_THRESHOLDS: {
    EXCELLENT: 90, // 优秀
    GOOD: 75, // 良好
    FAIR: 60, // 一般
    POOR: 40, // 较差
    CRITICAL: 20, // 危险
  },
  WARNING_THRESHOLDS: {
    HIGH_VULNERABILITY_COUNT: 5, // 高危漏洞数量警告阈值
    LOW_SECURITY_SCORE: 60, // 低安全评分警告阈值
    SCAN_DURATION_WARNING_MS: 5 * 60 * 1000, // 扫描时长警告阈值（5分钟）
  },
});

// 🔍 扫描检查类型
export const SECURITY_SCANNER_CHECK_TYPES = Object.freeze({
  PASSWORD_SECURITY: 'password_security',
  API_KEY_SECURITY: 'api_key_security',
  CONFIGURATION_SECURITY: 'configuration_security',
  ENCRYPTION_SECURITY: 'encryption_security',
});

// 📈 扫描状态常量
export const SECURITY_SCANNER_STATUS = Object.freeze({
  PENDING: 'pending',
  RUNNING: 'running',
  COMPLETED: 'completed',
  FAILED: 'failed',
  TIMEOUT: 'timeout',
});

// 🎯 漏洞状态常量
export const SECURITY_VULNERABILITY_STATUS = Object.freeze({
  DETECTED: 'detected',
  ACKNOWLEDGED: 'acknowledged',
  IN_PROGRESS: 'in_progress',
  RESOLVED: 'resolved',
  FALSE_POSITIVE: 'false_positive',
});

// 🔒 漏洞严重程度常量
export const SECURITY_VULNERABILITY_SEVERITY = Object.freeze({
  CRITICAL: 'critical',
  HIGH: 'high',
  MEDIUM: 'medium',
  LOW: 'low',
  INFO: 'info',
});

// 📋 漏洞类型常量
export const SECURITY_VULNERABILITY_TYPES = Object.freeze({
  AUTHENTICATION: 'authentication',
  AUTHORIZATION: 'authorization',
  CONFIGURATION: 'configuration',
  ENCRYPTION: 'encryption',
  INPUT_VALIDATION: 'input_validation',
  SESSION_MANAGEMENT: 'session_management',
  ERROR_HANDLING: 'error_handling',
  LOGGING: 'logging',
});
