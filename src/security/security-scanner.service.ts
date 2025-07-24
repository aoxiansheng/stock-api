import * as crypto from "crypto";

import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Interval } from "@nestjs/schedule";

import { createLogger } from "@common/config/logger.config";

import { ApiKeyRepository } from "../auth/repositories/apikey.repository";
import { UserRepository } from "../auth/repositories/user.repository";
import { securityConfig } from "../common/config/security.config";

import {
  SECURITY_SCANNER_CONFIG,
  SECURITY_SCANNER_MESSAGES,
  SECURITY_SCANNER_OPERATIONS,
  SECURITY_SCANNER_RECOMMENDATIONS,
} from "./constants/security-scanner.constants";
import { SECURITY_SCANNER_RULES } from "./constants/security.constants";
import {
  SecurityConfiguration,
  SecurityScanResult,
  SecurityVulnerability,
} from "./interfaces/security-scanner.interface";
import { SecurityScanResultRepository } from "./repositories/security-scan-result.repository";
import { SecurityScanResultDocument } from "./schemas/security-scan-result.schema";
import { VulnerabilityTemplateUtil } from "./utils/vulnerability-template.util";

const ALL_SECURITY_CHECKS = [
  "default_credentials",
  "expired_api_key",
  "excessive_permissions",
  "insufficient_rate_limiting",
  "weak_password_policy",
  "long_jwt_expiry",
  "http_not_enforced",
  "missing_env_var_jwt_secret",
  "localhost_db_in_production",
  "weak_jwt_secret",
  "weak_password_hashing",
  "potential_data_exposure",
  "nosql_injection_risk",
  "no_mfa",
];

@Injectable()
export class SecurityScannerService {
  private readonly logger = createLogger(SecurityScannerService.name);

  constructor(
    private readonly userRepository: UserRepository,
    private readonly apiKeyRepository: ApiKeyRepository,
    private readonly scanResultRepository: SecurityScanResultRepository,
    private configService: ConfigService,
  ) {}

  @Interval(SECURITY_SCANNER_CONFIG.SCAN_INTERVAL_MS)
  async performSecurityScan(): Promise<SecurityScanResultDocument> {
    const scanId = `${SECURITY_SCANNER_CONFIG.SCAN_ID_PREFIX}${Date.now()}_${crypto.randomBytes(SECURITY_SCANNER_CONFIG.SCAN_ID_RANDOM_BYTES).toString("hex")}`;
    const startTime = Date.now();
    const vulnerabilities: SecurityVulnerability[] = [];
    const operation = SECURITY_SCANNER_OPERATIONS.PERFORM_SCAN;

    this.logger.log(
      { operation, scanId },
      SECURITY_SCANNER_MESSAGES.SCAN_STARTED,
    );

    try {
      const currentConfig = this.getCurrentSecurityConfiguration();
      const checks = [
        this.checkPasswordSecurity(),
        this.checkAPIKeySecurity(),
        this.checkConfigurationSecurity(currentConfig),
        this.checkEncryptionSecurity(currentConfig),
      ];

      const results = await Promise.allSettled(checks);

      results.forEach((result) => {
        if (result.status === "fulfilled" && result.value.length > 0) {
          vulnerabilities.push(...result.value);
        } else if (result.status === "rejected") {
          this.logger.error(
            { operation, error: result.reason },
            SECURITY_SCANNER_MESSAGES.PARTIAL_CHECK_FAILED,
          );
        }
      });

      const duration = Date.now() - startTime;
      const summary = this.calculateSummary(vulnerabilities);
      const securityScore = this.calculateSecurityScore(vulnerabilities);
      const recommendations = this.generateRecommendations(vulnerabilities);

      const scanResultData: SecurityScanResult = {
        scanId,
        timestamp: new Date(),
        duration,
        totalChecks: ALL_SECURITY_CHECKS.length,
        vulnerabilities,
        summary,
        securityScore,
        recommendations,
      };

      const newScan = await this.scanResultRepository.create(scanResultData);

      this.logger.log(
        {
          operation,
          scanId,
          issues: vulnerabilities.length,
          score: securityScore,
          duration,
        },
        SECURITY_SCANNER_MESSAGES.SCAN_COMPLETED,
      );
      return newScan;
    } catch (error) {
      this.logger.error(
        { operation, scanId, error: error.stack },
        SECURITY_SCANNER_MESSAGES.SCAN_FAILED,
      );
      throw error;
    }
  }

  async getScanHistory(
    limit: number = SECURITY_SCANNER_CONFIG.DEFAULT_SCAN_HISTORY_LIMIT,
  ): Promise<SecurityScanResultDocument[]> {
    const operation = SECURITY_SCANNER_OPERATIONS.GET_SCAN_HISTORY;
    try {
      const results = await this.scanResultRepository.findMostRecent(limit);
      this.logger.log(
        { operation, limit, count: results.length },
        SECURITY_SCANNER_MESSAGES.SCAN_HISTORY_RETRIEVED,
      );
      return results;
    } catch (error) {
      this.logger.error(
        { operation, limit, error: error.message },
        SECURITY_SCANNER_MESSAGES.SCAN_HISTORY_FAILED,
      );
      throw error;
    }
  }

  getCurrentSecurityConfiguration(): SecurityConfiguration {
    const operation = SECURITY_SCANNER_OPERATIONS.GET_SECURITY_CONFIG;
    try {
      const config = {
        passwordPolicy: {
          minLength: securityConfig.passwordPolicy.minLength,
          requireUppercase: securityConfig.passwordPolicy.requireUppercase,
          requireLowercase: securityConfig.passwordPolicy.requireLowercase,
          requireNumbers: securityConfig.passwordPolicy.requireNumbers,
          requireSpecialChars:
            securityConfig.passwordPolicy.requireSpecialChars,
          maxAge: securityConfig.passwordPolicy.maxAgeDays,
        },
        sessionSecurity: {
          jwtExpiry: this.configService.get<string>(
            "JWT_EXPIRES_IN",
            securityConfig.session.jwtDefaultExpiry,
          ),
          refreshTokenExpiry: securityConfig.session.refreshTokenDefaultExpiry,
          maxConcurrentSessions: securityConfig.session.maxConcurrent,
        },
        apiSecurity: {
          rateLimitEnabled: securityConfig.rateLimit.enabled,
          ipWhitelistEnabled: securityConfig.api.ipWhitelist,
          corsEnabled: securityConfig.api.cors,
          httpsOnly:
            this.configService.get<string>("NODE_ENV") === "production",
        },
        dataSecurity: {
          encryptionEnabled: true,
          hashSaltRounds: securityConfig.data.bcryptSaltRounds,
          sensitiveDataMasking: securityConfig.data.masking,
        },
      };
      this.logger.log(
        { operation },
        SECURITY_SCANNER_MESSAGES.SECURITY_CONFIG_RETRIEVED,
      );
      return config;
    } catch (error) {
      this.logger.error(
        { operation, error: error.message },
        SECURITY_SCANNER_MESSAGES.SECURITY_CONFIG_FAILED,
      );
      throw error;
    }
  }

  private async checkPasswordSecurity(): Promise<SecurityVulnerability[]> {
    const operation = SECURITY_SCANNER_OPERATIONS.CHECK_PASSWORD_SECURITY;
    const vulnerabilities: SecurityVulnerability[] = [];
    try {
      const defaultPasswordUsers = await this.userRepository.findByUsernames(
        SECURITY_SCANNER_RULES.defaultUsernames,
      );
      if (defaultPasswordUsers.length > 0) {
        vulnerabilities.push(
          VulnerabilityTemplateUtil.createDefaultCredentialsVulnerability(
            defaultPasswordUsers.map((u) => u.username),
          ),
        );
      }
      return vulnerabilities;
    } catch (error) {
      this.logger.error(
        { operation, error: error.message },
        SECURITY_SCANNER_MESSAGES.PASSWORD_CHECK_FAILED,
      );
      throw error;
    }
  }

  private async checkAPIKeySecurity(): Promise<SecurityVulnerability[]> {
    const operation = SECURITY_SCANNER_OPERATIONS.CHECK_API_KEY_SECURITY;
    const vulnerabilities: SecurityVulnerability[] = [];
    try {
      const apiKeys = await this.apiKeyRepository.findAllActive();
      const keysWithoutRateLimit = [];

      for (const apiKey of apiKeys) {
        if (apiKey.expiresAt && apiKey.expiresAt.getTime() < Date.now()) {
          vulnerabilities.push(
            VulnerabilityTemplateUtil.createExpiredApiKeyVulnerability(
              apiKey._id.toString(),
              apiKey.appKey.slice(0, 4),
            ),
          );
        }
        if (
          apiKey.permissions.length >
          SECURITY_SCANNER_RULES.apiKeyPermissionThreshold
        ) {
          vulnerabilities.push(
            VulnerabilityTemplateUtil.createExcessivePermissionsVulnerability(
              apiKey._id.toString(),
              apiKey.appKey.slice(0, 4),
            ),
          );
        }
        if (
          !apiKey.rateLimit ||
          apiKey.rateLimit.requests >
            SECURITY_SCANNER_RULES.apiKeyRateLimitThreshold
        ) {
          keysWithoutRateLimit.push(apiKey);
        }
      }

      if (keysWithoutRateLimit.length > 0) {
        vulnerabilities.push(
          VulnerabilityTemplateUtil.createInsufficientRateLimitingVulnerability(
            keysWithoutRateLimit.length,
          ),
        );
      }
      return vulnerabilities;
    } catch (error) {
      this.logger.error(
        { operation, error: error.message },
        SECURITY_SCANNER_MESSAGES.API_KEY_CHECK_FAILED,
      );
      throw error;
    }
  }

  private async checkConfigurationSecurity(
    config: SecurityConfiguration,
  ): Promise<SecurityVulnerability[]> {
    const operation = SECURITY_SCANNER_OPERATIONS.CHECK_CONFIGURATION_SECURITY;
    const vulnerabilities: SecurityVulnerability[] = [];
    try {
      if (
        config.passwordPolicy.minLength < 8 ||
        !config.passwordPolicy.requireUppercase ||
        !config.passwordPolicy.requireLowercase ||
        !config.passwordPolicy.requireNumbers ||
        !config.passwordPolicy.requireSpecialChars
      ) {
        vulnerabilities.push(
          VulnerabilityTemplateUtil.createVulnerability("WEAK_PASSWORD_POLICY"),
        );
      }
      if (
        config.apiSecurity.httpsOnly &&
        this.isJwtExpiryTooLong(config.sessionSecurity.jwtExpiry)
      ) {
        vulnerabilities.push(
          VulnerabilityTemplateUtil.createVulnerability("LONG_JWT_EXPIRY", {
            expiry: config.sessionSecurity.jwtExpiry,
          }),
        );
      }
      if (
        config.apiSecurity.httpsOnly === false &&
        this.configService.get("NODE_ENV") === "production"
      ) {
        vulnerabilities.push(
          VulnerabilityTemplateUtil.createVulnerability("HTTP_NOT_ENFORCED"),
        );
      }
      const jwtSecret = this.configService.get<string>("JWT_SECRET");
      if (!jwtSecret) {
        vulnerabilities.push(
          VulnerabilityTemplateUtil.createVulnerability("MISSING_ENV_VAR", {
            name: "JWT_SECRET",
          }),
        );
      }
      const dbUri = this.configService.get<string>("MONGODB_URI", "");
      if (
        config.apiSecurity.httpsOnly &&
        (dbUri.includes("localhost") || dbUri.includes("127.0.0.1"))
      ) {
        vulnerabilities.push(
          VulnerabilityTemplateUtil.createVulnerability(
            "LOCALHOST_DB_IN_PRODUCTION",
          ),
        );
      }
      vulnerabilities.push(
        VulnerabilityTemplateUtil.createVulnerability("NO_MFA"),
      );
      return vulnerabilities;
    } catch (error) {
      this.logger.error(
        { operation, error: error.message },
        SECURITY_SCANNER_MESSAGES.CONFIG_CHECK_FAILED,
      );
      throw error;
    }
  }

  private async checkEncryptionSecurity(
    config: SecurityConfiguration,
  ): Promise<SecurityVulnerability[]> {
    const operation = SECURITY_SCANNER_OPERATIONS.CHECK_ENCRYPTION_SECURITY;
    const vulnerabilities: SecurityVulnerability[] = [];
    try {
      const jwtSecret = this.configService.get<string>("JWT_SECRET");
      if (
        !jwtSecret ||
        jwtSecret.length < SECURITY_SCANNER_RULES.jwtSecretMinLength
      ) {
        vulnerabilities.push(
          VulnerabilityTemplateUtil.createWeakJwtSecretVulnerability(
            SECURITY_SCANNER_RULES.jwtSecretMinLength,
          ),
        );
      }
      if (config.dataSecurity.hashSaltRounds < 12) {
        vulnerabilities.push(
          VulnerabilityTemplateUtil.createWeakPasswordHashingVulnerability(
            config.dataSecurity.hashSaltRounds,
            12,
          ),
        );
      }
      vulnerabilities.push(
        VulnerabilityTemplateUtil.createVulnerability(
          "POTENTIAL_DATA_EXPOSURE",
        ),
      );
      vulnerabilities.push(
        VulnerabilityTemplateUtil.createVulnerability("NOSQL_INJECTION_RISK"),
      );
      return vulnerabilities;
    } catch (error) {
      this.logger.error(
        { operation, error: error.message },
        SECURITY_SCANNER_MESSAGES.ENCRYPTION_CHECK_FAILED,
      );
      throw error;
    }
  }

  private calculateSummary(vulnerabilities: SecurityVulnerability[]) {
    const summary = { critical: 0, high: 0, medium: 0, low: 0, info: 0 };
    vulnerabilities.forEach((v) => {
      if (summary[v.severity] !== undefined) {
        summary[v.severity]++;
      }
    });
    return summary;
  }

  private calculateSecurityScore(
    vulnerabilities: SecurityVulnerability[],
  ): number {
    let score = 100;
    const weights = { critical: 20, high: 10, medium: 5, low: 2, info: 1 };
    vulnerabilities.forEach((v) => {
      score -= weights[v.severity] || 0;
    });
    return Math.max(0, score);
  }

  private generateRecommendations(
    vulnerabilities: SecurityVulnerability[],
  ): string[] {
    const operation = SECURITY_SCANNER_OPERATIONS.GENERATE_RECOMMENDATIONS;
    try {
      const recommendations = new Set<string>();
      vulnerabilities.forEach((vuln) => {
        if (vuln.severity === "critical" || vuln.severity === "high") {
          recommendations.add(vuln.recommendation);
        }
      });

      recommendations.add(SECURITY_SCANNER_RECOMMENDATIONS.GENERAL_AUDIT);
      recommendations.add(SECURITY_SCANNER_RECOMMENDATIONS.UPDATE_DEPENDENCIES);
      recommendations.add(SECURITY_SCANNER_RECOMMENDATIONS.SECURITY_TRAINING);

      const hasAuthVulns = vulnerabilities.some(
        (v) => v.type === "authentication",
      );
      if (hasAuthVulns) {
        recommendations.add(SECURITY_SCANNER_RECOMMENDATIONS.IMPLEMENT_2FA);
        recommendations.add(
          SECURITY_SCANNER_RECOMMENDATIONS.REGULAR_PASSWORD_ROTATION,
        );
      }

      const hasConfigVulns = vulnerabilities.some(
        (v) => v.type === "configuration",
      );
      if (hasConfigVulns) {
        recommendations.add(
          SECURITY_SCANNER_RECOMMENDATIONS.SECURITY_MONITORING,
        );
        recommendations.add(SECURITY_SCANNER_RECOMMENDATIONS.COMPLIANCE_CHECK);
      }

      const hasCriticalVulns = vulnerabilities.some(
        (v) => v.severity === "critical",
      );
      if (hasCriticalVulns) {
        recommendations.add(
          SECURITY_SCANNER_RECOMMENDATIONS.PENETRATION_TESTING,
        );
      }

      const result = Array.from(recommendations);
      this.logger.debug({
        operation,
        vulnerabilityCount: vulnerabilities.length,
        recommendationCount: result.length,
      });
      return result;
    } catch (error) {
      this.logger.error(
        { operation, error: error.message },
        "安全建议生成失败",
      );
      throw error;
    }
  }

  private isJwtExpiryTooLong(expiry: string): boolean {
    // 安全检查：如果不是字符串或为空，视为不安全返回true
    if (typeof expiry !== "string" || !expiry) {
      return true;
    }

    // 只接受严格的格式：数字+单位（d/h/m/s）
    const match = expiry.match(/^(\d+)([dhms])$/);

    // 如果格式无效，视为潜在安全风险，返回true
    if (!match) {
      return true;
    }

    const value = parseInt(match[1], 10);
    const unit = match[2];
    const expiryInHours = {
      d: value * 24,
      h: value,
      m: value / 60,
      s: value / 3600,
    }[unit];
    const MAX_EXPIRY_HOURS = 48;
    return expiryInHours > MAX_EXPIRY_HOURS;
  }
}
