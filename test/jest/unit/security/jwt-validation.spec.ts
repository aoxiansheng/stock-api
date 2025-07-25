import { Test, TestingModule } from "@nestjs/testing";
import { SecurityScannerService } from "../../../../src/security/security-scanner.service";
import { ConfigService } from "@nestjs/config";
import { SecurityAuditLogRepository } from "../../../../src/security/repositories/security-audit-log.repository";
import { SecurityScanResultRepository } from "../../../../src/security/repositories/security-scan-result.repository";
import { UserRepository } from "../../../../src/auth/repositories/user.repository";
import { ApiKeyRepository } from "../../../../src/auth/repositories/apikey.repository";

describe("SecurityScannerService - JWT Validation", () => {
  let service: SecurityScannerService;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let _mockConfigService: any;

  beforeEach(async () => {
    const mockConfig = {
      get: jest.fn(),
    };

    const mockAuditRepo = {
      create: jest.fn(),
      findAll: jest.fn(),
    };

    const mockScanRepo = {
      create: jest.fn(),
      findAll: jest.fn(),
    };

    const mockUserRepo = {
      findByUsernames: jest.fn(),
    };

    const mockApiKeyRepo = {
      findAllActive: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SecurityScannerService,
        {
          provide: ConfigService,
          useValue: mockConfig,
        },
        {
          provide: SecurityAuditLogRepository,
          useValue: mockAuditRepo,
        },
        {
          provide: SecurityScanResultRepository,
          useValue: mockScanRepo,
        },
        {
          provide: UserRepository,
          useValue: mockUserRepo,
        },
        {
          provide: ApiKeyRepository,
          useValue: mockApiKeyRepo,
        },
      ],
    }).compile();

    service = module.get<SecurityScannerService>(SecurityScannerService);
    _mockConfigService = module.get(ConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("isJwtExpiryTooLong method", () => {
    describe("valid expiry formats", () => {
      it("should allow expiry within 48 hours - days format", () => {
        expect(service["isJwtExpiryTooLong"]("1d")).toBe(false);
        expect(service["isJwtExpiryTooLong"]("2d")).toBe(false);
      });

      it("should allow expiry within 48 hours - hours format", () => {
        expect(service["isJwtExpiryTooLong"]("1h")).toBe(false);
        expect(service["isJwtExpiryTooLong"]("24h")).toBe(false);
        expect(service["isJwtExpiryTooLong"]("48h")).toBe(false);
      });

      it("should allow expiry within 48 hours - minutes format", () => {
        expect(service["isJwtExpiryTooLong"]("60m")).toBe(false);
        expect(service["isJwtExpiryTooLong"]("1440m")).toBe(false); // 24 hours
        expect(service["isJwtExpiryTooLong"]("2880m")).toBe(false); // 48 hours
      });

      it("should allow expiry within 48 hours - seconds format", () => {
        expect(service["isJwtExpiryTooLong"]("3600s")).toBe(false); // 1 hour
        expect(service["isJwtExpiryTooLong"]("86400s")).toBe(false); // 24 hours
        expect(service["isJwtExpiryTooLong"]("172800s")).toBe(false); // 48 hours
      });

      it("should detect expiry longer than 48 hours - days format", () => {
        expect(service["isJwtExpiryTooLong"]("3d")).toBe(true);
        expect(service["isJwtExpiryTooLong"]("7d")).toBe(true);
        expect(service["isJwtExpiryTooLong"]("30d")).toBe(true);
      });

      it("should detect expiry longer than 48 hours - hours format", () => {
        expect(service["isJwtExpiryTooLong"]("49h")).toBe(true);
        expect(service["isJwtExpiryTooLong"]("72h")).toBe(true);
        expect(service["isJwtExpiryTooLong"]("168h")).toBe(true); // 7 days
      });

      it("should detect expiry longer than 48 hours - minutes format", () => {
        expect(service["isJwtExpiryTooLong"]("2881m")).toBe(true); // 48 hours + 1 minute
        expect(service["isJwtExpiryTooLong"]("4320m")).toBe(true); // 72 hours
        expect(service["isJwtExpiryTooLong"]("10080m")).toBe(true); // 7 days
      });

      it("should detect expiry longer than 48 hours - seconds format", () => {
        expect(service["isJwtExpiryTooLong"]("172801s")).toBe(true); // 48 hours + 1 second
        expect(service["isJwtExpiryTooLong"]("259200s")).toBe(true); // 72 hours
        expect(service["isJwtExpiryTooLong"]("604800s")).toBe(true); // 7 days
      });
    });

    describe("boundary conditions", () => {
      it("should handle exact 48-hour boundary", () => {
        expect(service["isJwtExpiryTooLong"]("2d")).toBe(false);
        expect(service["isJwtExpiryTooLong"]("48h")).toBe(false);
        expect(service["isJwtExpiryTooLong"]("2880m")).toBe(false);
        expect(service["isJwtExpiryTooLong"]("172800s")).toBe(false);
      });

      it("should handle values just over 48-hour boundary", () => {
        expect(service["isJwtExpiryTooLong"]("49h")).toBe(true);
        expect(service["isJwtExpiryTooLong"]("2881m")).toBe(true);
        expect(service["isJwtExpiryTooLong"]("172801s")).toBe(true);
      });

      it("should handle zero values", () => {
        expect(service["isJwtExpiryTooLong"]("0d")).toBe(false);
        expect(service["isJwtExpiryTooLong"]("0h")).toBe(false);
        expect(service["isJwtExpiryTooLong"]("0m")).toBe(false);
        expect(service["isJwtExpiryTooLong"]("0s")).toBe(false);
      });

      it("should handle single digit values", () => {
        expect(service["isJwtExpiryTooLong"]("1d")).toBe(false);
        expect(service["isJwtExpiryTooLong"]("1h")).toBe(false);
        expect(service["isJwtExpiryTooLong"]("1m")).toBe(false);
        expect(service["isJwtExpiryTooLong"]("1s")).toBe(false);
      });

      it("should handle large numeric values", () => {
        expect(service["isJwtExpiryTooLong"]("999d")).toBe(true);
        expect(service["isJwtExpiryTooLong"]("8760h")).toBe(true); // 1 year
        expect(service["isJwtExpiryTooLong"]("525600m")).toBe(true); // 1 year
        expect(service["isJwtExpiryTooLong"]("31536000s")).toBe(true); // 1 year
      });
    });

    describe("invalid formats", () => {
      it("should reject malformed expiry strings", () => {
        expect(service["isJwtExpiryTooLong"]("1d12h")).toBe(true); // Invalid format
        expect(service["isJwtExpiryTooLong"]("1day")).toBe(true); // Wrong unit
        expect(service["isJwtExpiryTooLong"]("1D")).toBe(true); // Wrong case
        expect(service["isJwtExpiryTooLong"]("1H")).toBe(true); // Wrong case
        expect(service["isJwtExpiryTooLong"]("1M")).toBe(true); // Wrong case
        expect(service["isJwtExpiryTooLong"]("1S")).toBe(true); // Wrong case
      });

      it("should reject non-numeric prefixes", () => {
        expect(service["isJwtExpiryTooLong"]("abc")).toBe(true);
        expect(service["isJwtExpiryTooLong"]("abcd")).toBe(true);
        expect(service["isJwtExpiryTooLong"]("xyzh")).toBe(true);
        expect(service["isJwtExpiryTooLong"]("$%^d")).toBe(true);
      });

      it("should reject missing units", () => {
        expect(service["isJwtExpiryTooLong"]("12")).toBe(true);
        expect(service["isJwtExpiryTooLong"]("0")).toBe(true);
        expect(service["isJwtExpiryTooLong"]("999")).toBe(true);
      });

      it("should reject invalid units", () => {
        expect(service["isJwtExpiryTooLong"]("12x")).toBe(true);
        expect(service["isJwtExpiryTooLong"]("12y")).toBe(true);
        expect(service["isJwtExpiryTooLong"]("12z")).toBe(true);
        expect(service["isJwtExpiryTooLong"]("12w")).toBe(true); // weeks not supported
      });

      it("should reject empty or whitespace strings", () => {
        expect(service["isJwtExpiryTooLong"]("")).toBe(true);
        expect(service["isJwtExpiryTooLong"](" ")).toBe(true);
        expect(service["isJwtExpiryTooLong"]("  ")).toBe(true);
        expect(service["isJwtExpiryTooLong"]("\t")).toBe(true);
        expect(service["isJwtExpiryTooLong"]("\n")).toBe(true);
      });

      it("should reject null and undefined inputs", () => {
        expect(service["isJwtExpiryTooLong"](null as any)).toBe(true);
        expect(service["isJwtExpiryTooLong"](undefined as any)).toBe(true);
      });

      it("should reject numeric inputs (non-string)", () => {
        expect(service["isJwtExpiryTooLong"](12 as any)).toBe(true);
        expect(service["isJwtExpiryTooLong"](0 as any)).toBe(true);
        expect(service["isJwtExpiryTooLong"](48 as any)).toBe(true);
      });

      it("should reject object and array inputs", () => {
        expect(service["isJwtExpiryTooLong"]({} as any)).toBe(true);
        expect(service["isJwtExpiryTooLong"]([] as any)).toBe(true);
        expect(service["isJwtExpiryTooLong"]({ expiry: "1d" } as any)).toBe(
          true,
        );
      });
    });

    describe("regex edge cases", () => {
      it("should handle strings with leading/trailing whitespace", () => {
        expect(service["isJwtExpiryTooLong"](" 1d")).toBe(true);
        expect(service["isJwtExpiryTooLong"]("1d ")).toBe(true);
        expect(service["isJwtExpiryTooLong"](" 1d ")).toBe(true);
      });

      it("should handle decimal numbers in expiry", () => {
        expect(service["isJwtExpiryTooLong"]("1.5d")).toBe(true);
        expect(service["isJwtExpiryTooLong"]("12.5h")).toBe(true);
        expect(service["isJwtExpiryTooLong"]("30.5m")).toBe(true);
      });

      it("should handle negative numbers", () => {
        expect(service["isJwtExpiryTooLong"]("-1d")).toBe(true);
        expect(service["isJwtExpiryTooLong"]("-24h")).toBe(true);
        expect(service["isJwtExpiryTooLong"]("-60m")).toBe(true);
      });

      it("should handle very long numeric strings", () => {
        expect(service["isJwtExpiryTooLong"]("999999999999999999999d")).toBe(
          true,
        );
        expect(service["isJwtExpiryTooLong"]("123456789012345678901h")).toBe(
          true,
        );
      });

      it("should handle mixed case units strictly", () => {
        expect(service["isJwtExpiryTooLong"]("12D")).toBe(true);
        expect(service["isJwtExpiryTooLong"]("12H")).toBe(true);
        expect(service["isJwtExpiryTooLong"]("12M")).toBe(true);
        expect(service["isJwtExpiryTooLong"]("12S")).toBe(true);
      });
    });

    describe("unit conversion accuracy", () => {
      it("should correctly convert days to hours", () => {
        // 2 days = 48 hours (boundary)
        expect(service["isJwtExpiryTooLong"]("2d")).toBe(false);
        // 3 days = 72 hours (over limit)
        expect(service["isJwtExpiryTooLong"]("3d")).toBe(true);
      });

      it("should correctly convert hours to hours", () => {
        expect(service["isJwtExpiryTooLong"]("48h")).toBe(false);
        expect(service["isJwtExpiryTooLong"]("49h")).toBe(true);
      });

      it("should correctly convert minutes to hours", () => {
        // 2880 minutes = 48 hours
        expect(service["isJwtExpiryTooLong"]("2880m")).toBe(false);
        // 2881 minutes = 48 hours and 1 minute
        expect(service["isJwtExpiryTooLong"]("2881m")).toBe(true);
      });

      it("should correctly convert seconds to hours", () => {
        // 172800 seconds = 48 hours
        expect(service["isJwtExpiryTooLong"]("172800s")).toBe(false);
        // 172801 seconds = 48 hours and 1 second
        expect(service["isJwtExpiryTooLong"]("172801s")).toBe(true);
      });
    });

    describe("common JWT library formats", () => {
      it("should handle common short expiry formats", () => {
        expect(service["isJwtExpiryTooLong"]("15m")).toBe(false); // Common for access tokens
        expect(service["isJwtExpiryTooLong"]("30m")).toBe(false);
        expect(service["isJwtExpiryTooLong"]("1h")).toBe(false);
        expect(service["isJwtExpiryTooLong"]("2h")).toBe(false);
        expect(service["isJwtExpiryTooLong"]("4h")).toBe(false);
        expect(service["isJwtExpiryTooLong"]("8h")).toBe(false);
        expect(service["isJwtExpiryTooLong"]("12h")).toBe(false);
        expect(service["isJwtExpiryTooLong"]("24h")).toBe(false);
      });

      it("should detect insecure long expiry formats", () => {
        expect(service["isJwtExpiryTooLong"]("7d")).toBe(true); // Common but too long
        expect(service["isJwtExpiryTooLong"]("30d")).toBe(true); // Very insecure
        expect(service["isJwtExpiryTooLong"]("90d")).toBe(true); // Extremely insecure
        expect(service["isJwtExpiryTooLong"]("365d")).toBe(true); // One year - very bad
      });

      it("should handle refresh token typical formats", () => {
        expect(service["isJwtExpiryTooLong"]("3d")).toBe(true); // Refresh tokens are often longer
        expect(service["isJwtExpiryTooLong"]("7d")).toBe(true);
        expect(service["isJwtExpiryTooLong"]("14d")).toBe(true);
        expect(service["isJwtExpiryTooLong"]("30d")).toBe(true);
      });
    });
  });

  describe("regex pattern robustness", () => {
    it("should handle regex special characters in input", () => {
      expect(service["isJwtExpiryTooLong"](".*d")).toBe(true);
      expect(service["isJwtExpiryTooLong"]("^1d$")).toBe(true);
      expect(service["isJwtExpiryTooLong"]("1[d]")).toBe(true);
      expect(service["isJwtExpiryTooLong"]("1(d)")).toBe(true);
      expect(service["isJwtExpiryTooLong"]("1+d")).toBe(true);
      expect(service["isJwtExpiryTooLong"]("1?d")).toBe(true);
      expect(service["isJwtExpiryTooLong"]("1|d")).toBe(true);
    });

    it("should not be vulnerable to regex injection", () => {
      expect(service["isJwtExpiryTooLong"]("1d|.*")).toBe(true);
      expect(service["isJwtExpiryTooLong"]("1d.*")).toBe(true);
      expect(service["isJwtExpiryTooLong"](".*")).toBe(true);
      expect(service["isJwtExpiryTooLong"]("(.*)")).toBe(true);
    });

    it("should handle Unicode characters", () => {
      expect(service["isJwtExpiryTooLong"]("1😀")).toBe(true);
      expect(service["isJwtExpiryTooLong"]("1中文")).toBe(true);
      expect(service["isJwtExpiryTooLong"]("1Ω")).toBe(true);
    });

    it("should handle various number formats strictly", () => {
      expect(service["isJwtExpiryTooLong"]("01d")).toBe(false); // Leading zero should work
      expect(service["isJwtExpiryTooLong"]("001d")).toBe(false);
      expect(service["isJwtExpiryTooLong"]("1.0d")).toBe(true); // Decimal should fail
      expect(service["isJwtExpiryTooLong"]("1e2d")).toBe(true); // Scientific notation should fail
      expect(service["isJwtExpiryTooLong"]("+1d")).toBe(true); // Plus sign should fail
    });
  });
});
