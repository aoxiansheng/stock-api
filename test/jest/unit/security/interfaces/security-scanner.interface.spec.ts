// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { Test, TestingModule } from "@nestjs/testing";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { ConfigService } from "@nestjs/config";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { SecurityScannerService } from "../../../../../src/security/services/security-scanner.service";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { UserRepository } from "../../../../../src/auth/repositories/user.repository";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { ApiKeyRepository } from "../../../../../src/auth/repositories/apikey.repository";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { SecurityScanResultRepository } from "../../../../../src/security/repositories/security-scan-result.repository";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  SECURITYSCANNERCONFIG,
  SECURITY_SCANNER_OPERATIONS,
  SECURITY_SCANNER_MESSAGES,
  SECURITY_SCANNER_RECOMMENDATIONS,
} from "../../../../../src/security/constants/security-scanner.constants";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { VulnerabilityTemplateUtil } from "../../../../../src/security/utils/vulnerability-template.util";

describe("SecurityScannerService Optimization Features", () => {
  let service: SecurityScannerService;
  let userRepository: jest.Mocked<UserRepository>;
  let apiKeyRepository: jest.Mocked<ApiKeyRepository>;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let scanResultRepository: jest.Mocked<SecurityScanResultRepository>;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let configService: jest.Mocked<ConfigService>;
  let loggerSpy: jest.SpyInstance;

  beforeEach(async () => {
    const mockUserRepository = {
      findByUsernames: jest.fn().mockResolvedValue([]),
    };

    const mockApiKeyRepository = {
      findAllActive: jest.fn().mockResolvedValue([]),
    };

    const mockScanResultRepository = {
      create: jest.fn().mockResolvedValue({ id: "test-scan-id" }),
      findMostRecent: jest.fn().mockResolvedValue([]),
    };

    const mockConfigService = {
      get: jest.fn().mockImplementation((key: string, defaultValue?: any) => {
        const config = {
          JWT_SECRET: "test-secret-key-with-sufficient-length",
          NODE_ENV: "test",
          MONGODB_URI: "mongodb://remote-server:27017/test",
        };
        return config[key] || defaultValue;
      }),
    };
    // eslint-disable-next-line @typescript-eslint/no-unused-vars

    // eslint-disable-next-line @typescript-eslint/no-unused-vars

    // eslint-disable-next-line @typescript-eslint/no-unused-vars

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SecurityScannerService,
        {
          provide: UserRepository,
          useValue: mockUserRepository,
        },
        {
          provide: ApiKeyRepository,
          useValue: mockApiKeyRepository,
        },
        {
          provide: SecurityScanResultRepository,
          useValue: mockScanResultRepository,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<SecurityScannerService>(SecurityScannerService);
    userRepository = module.get(UserRepository);
    apiKeyRepository = module.get(ApiKeyRepository);
    scanResultRepository = module.get(SecurityScanResultRepository);
    configService = module.get(ConfigService);

    // Spy on logger
    loggerSpy = jest.spyOn((service as any).logger, "log").mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("Constants Usage", () => {
    it("should use configuration constants for scan settings", () => {
      expect(SECURITY_SCANNER_CONFIG.SCAN_INTERVALMS).toBe(
        24 * 60 * 60 * 1000,
      );
      expect(SECURITY_SCANNER_CONFIG.DEFAULT_SCANHISTORYLIMIT).toBe(10);
      expect(SECURITY_SCANNER_CONFIG.SCAN_IDPREFIX).toBe("scan_");
    });

    it("should use operation constants for logging", () => {
      expect(SECURITY_SCANNER_OPERATIONS.PERFORM_SCAN).toBe(
        "performSecurityScan",
      );
      expect(SECURITY_SCANNER_OPERATIONS.GET_SCAN_HISTORY).toBe(
        "getScanHistory",
      );
      expect(SECURITY_SCANNER_OPERATIONS.CHECK_PASSWORD_SECURITY).toBe(
        "checkPasswordSecurity",
      );
    });

    it("should use message constants for logging", () => {
      expect(SECURITY_SCANNER_MESSAGES.SCANSTARTED).toBe("开始安全扫描");
      expect(SECURITY_SCANNER_MESSAGES.SCANCOMPLETED).toBe("安全扫描完成");
      expect(SECURITY_SCANNER_MESSAGES.SCANFAILED).toBe("安全扫描失败");
    });
  });

  describe("Vulnerability Template Usage", () => {
    it("should create default credentials vulnerability using template", () => {
      const usernames = ["admin", "root"];
      const vulnerability =
        VulnerabilityTemplateUtil.createDefaultCredentialsVulnerability(
          usernames,
        );

      expect(vulnerability.id).toBe("default_credentials");
      expect(vulnerability.type).toBe("authentication");
      expect(vulnerability.severity).toBe("critical");
      expect(vulnerability.description).toContain("admin, root");
    });

    it("should create expired API key vulnerability using template", () => {
      const vulnerability =
        VulnerabilityTemplateUtil.createExpiredApiKeyVulnerability(
          "123",
          "abcd1234",
        );

      expect(vulnerability.id).toBe("expired_api_key_123");
      expect(vulnerability.type).toBe("authentication");
      expect(vulnerability.severity).toBe("high");
      expect(vulnerability.description).toContain("abcd1234");
    });

    it("should create weak JWT secret vulnerability using template", () => {
      const vulnerability =
        VulnerabilityTemplateUtil.createWeakJwtSecretVulnerability(32);

      expect(vulnerability.id).toBe("weak_jwt_secret");
      expect(vulnerability.type).toBe("configuration");
      expect(vulnerability.severity).toBe("critical");
      expect(vulnerability.description).toContain("32");
    });
  });

  describe("Enhanced Logging", () => {
    it("should log scan history retrieval with proper operation name", async () => {
      await service.getScanHistory(5);

      expect(loggerSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          operation: SECURITY_SCANNER_OPERATIONS.GET_SCANHISTORY,
          limit: 5,
        }),
        SECURITY_SCANNER_MESSAGES.SCAN_HISTORY_RETRIEVED,
      );
    });

    it("should log security configuration retrieval", () => {
      service.getCurrentSecurityConfiguration();

      expect(loggerSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          operation: SECURITY_SCANNER_OPERATIONS.GET_SECURITY_CONFIG,
        }),
        SECURITY_SCANNER_MESSAGES.SECURITY_CONFIG_RETRIEVED,
      );
    });
  });

  describe("Enhanced Recommendations", () => {
    it("should generate context-aware recommendations", () => {
      const vulnerabilities = [
        {
          id: "test-auth",
          type: "authentication",
          severity: "critical",
          title: "Test Auth Vuln",
          description: "Test",
          impact: "Test",
          recommendation: "Fix auth issue",
          detected: new Date(),
          status: "detected",
        },
        {
          id: "test-config",
          type: "configuration",
          severity: "high",
          title: "Test Config Vuln",
          description: "Test",
          impact: "Test",
          recommendation: "Fix config issue",
          detected: new Date(),
          status: "detected",
        },
      ];

      const recommendations = (service as any).generateRecommendations(
        vulnerabilities,
      );

      // Should include specific vulnerability recommendations
      expect(recommendations).toContain("Fix auth issue");
      expect(recommendations).toContain("Fix config issue");

      // Should include general recommendations
      expect(recommendations).toContain(
        SECURITY_SCANNER_RECOMMENDATIONS.GENERALAUDIT,
      );
      expect(recommendations).toContain(
        SECURITY_SCANNER_RECOMMENDATIONS.UPDATEDEPENDENCIES,
      );

      // Should include context-specific recommendations
      expect(recommendations).toContain(
        SECURITY_SCANNER_RECOMMENDATIONS.IMPLEMENT2FA,
      );
      expect(recommendations).toContain(
        SECURITY_SCANNER_RECOMMENDATIONS.SECURITYMONITORING,
      );
    });

    it("should include penetration testing for critical vulnerabilities", () => {
      const vulnerabilities = [
        {
          id: "critical-vuln",
          type: "authentication",
          severity: "critical",
          title: "Critical Vuln",
          description: "Test",
          impact: "Test",
          recommendation: "Fix immediately",
          detected: new Date(),
          status: "detected",
        },
      ];

      const recommendations = (service as any).generateRecommendations(
        vulnerabilities,
      );

      expect(recommendations).toContain(
        SECURITY_SCANNER_RECOMMENDATIONS.PENETRATIONTESTING,
      );
    });
  });

  describe("Error Handling", () => {
    it("should handle password security check errors gracefully", async () => {
      const errorSpy = jest
        .spyOn((service as any).logger, "error")
        .mockImplementation();
      userRepository.findByUsernames.mockRejectedValue(
        new Error("Database error"),
      );

      await expect((service as any).checkPasswordSecurity()).rejects.toThrow(
        "Database error",
      );

      expect(errorSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          operation: SECURITY_SCANNER_OPERATIONS.CHECK_PASSWORDSECURITY,
        }),
        SECURITY_SCANNER_MESSAGES.PASSWORD_CHECK_FAILED,
      );
    });

    it("should handle API key security check errors gracefully", async () => {
      const errorSpy = jest
        .spyOn((service as any).logger, "error")
        .mockImplementation();
      apiKeyRepository.findAllActive.mockRejectedValue(
        new Error("Database error"),
      );

      await expect((service as any).checkAPIKeySecurity()).rejects.toThrow(
        "Database error",
      );

      expect(errorSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          operation: SECURITY_SCANNER_OPERATIONS.CHECK_API_KEY_SECURITY,
        }),
        SECURITY_SCANNER_MESSAGES.API_KEY_CHECK_FAILED,
      );
    });
  });

  describe("Performance Monitoring", () => {
    it("should have performance monitoring constants defined", () => {
      expect(SECURITY_SCANNER_CONFIG.SCAN_TIMEOUT_MS).toBeDefined();
      expect(SECURITY_SCANNER_MESSAGES.SCAN_TIMEOUTWARNING).toBe(
        "扫描执行时间较长",
      );
    });
  });
});
