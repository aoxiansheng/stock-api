/**
 * 安全漏洞接口
 */
export interface SecurityVulnerability {
  id: string;
  type:
    | "authentication"
    | "authorization"
    | "data_exposure"
    | "injection"
    | "configuration"
    | "encryption";
  severity: "critical" | "high" | "medium" | "low" | "info";
  title: string;
  description: string;
  impact: string;
  recommendation: string;
  cve?: string;
  detected: Date;
  status: "detected" | "investigating" | "mitigated" | "false_positive";
}

/**
 * 安全扫描结果接口
 */
export interface SecurityScanResult {
  scanId: string;
  timestamp: Date;
  duration: number;
  totalChecks: number;
  vulnerabilities: SecurityVulnerability[];
  summary: {
    critical: number;
    high: number;
    medium: number;
    low: number;
    info: number;
  };
  securityScore: number; // 0-100
  recommendations: string[];
}

/**
 * 安全配置接口
 */
export interface SecurityConfiguration {
  passwordPolicy: {
    minLength: number;
    requireUppercase: boolean;
    requireLowercase: boolean;
    requireNumbers: boolean;
    requireSpecialChars: boolean;
    maxAge: number; // 天数
  };
  sessionSecurity: {
    jwtExpiry: string;
    refreshTokenExpiry: string;
    maxConcurrentSessions: number;
  };
  apiSecurity: {
    rateLimitEnabled: boolean;
    ipWhitelistEnabled: boolean;
    corsEnabled: boolean;
    httpsOnly: boolean;
  };
  dataSecurity: {
    encryptionEnabled: boolean;
    hashSaltRounds: number;
    sensitiveDataMasking: boolean;
  };
}
