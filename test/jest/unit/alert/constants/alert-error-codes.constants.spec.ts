import { ALERT_ERROR_CODES, AlertErrorCategories } from "../../../../../src/alert/constants/alert-error-codes.constants";

describe("AlertErrorCodes", () => {
  describe("ALERT_ERROR_CODES", () => {
    it("should have all required error code categories", () => {
      // 验证类错误
      expect(ALERT_ERROR_CODES.RULE_VALIDATION_FAILED).toBe("ALERT_VALIDATION_001");
      expect(ALERT_ERROR_CODES.INVALID_RULE_FORMAT).toBe("ALERT_VALIDATION_002");
      expect(ALERT_ERROR_CODES.MISSING_REQUIRED_FIELDS).toBe("ALERT_VALIDATION_003");
      expect(ALERT_ERROR_CODES.INVALID_CONDITION_SYNTAX).toBe("ALERT_VALIDATION_004");
      expect(ALERT_ERROR_CODES.INVALID_THRESHOLD_VALUE).toBe("ALERT_VALIDATION_005");
      
      // 业务逻辑错误
      expect(ALERT_ERROR_CODES.RULE_NOT_FOUND).toBe("ALERT_BUSINESS_300");
      expect(ALERT_ERROR_CODES.RULE_ALREADY_EXISTS).toBe("ALERT_BUSINESS_301");
      expect(ALERT_ERROR_CODES.ALERT_NOT_FOUND).toBe("ALERT_BUSINESS_400");
      
      // 系统资源错误
      expect(ALERT_ERROR_CODES.MEMORY_PRESSURE_DETECTED).toBe("ALERT_SYSTEM_600");
      expect(ALERT_ERROR_CODES.CPU_OVERLOAD).toBe("ALERT_SYSTEM_601");
      
      // 外部依赖错误
      expect(ALERT_ERROR_CODES.DATABASE_CONNECTION_FAILED).toBe("ALERT_EXTERNAL_900");
      expect(ALERT_ERROR_CODES.CACHE_SERVICE_UNAVAILABLE).toBe("ALERT_EXTERNAL_930");
      expect(ALERT_ERROR_CODES.NOTIFICATION_SERVICE_UNAVAILABLE).toBe("ALERT_EXTERNAL_950");
    });

    it("should have unique error codes", () => {
      const errorCodes = Object.values(ALERT_ERROR_CODES);
      const uniqueErrorCodes = [...new Set(errorCodes)];
      expect(errorCodes).toHaveLength(uniqueErrorCodes.length);
    });
  });

  describe("AlertErrorCategories", () => {
    describe("isValidationError", () => {
      it("should correctly identify validation errors", () => {
        expect(AlertErrorCategories.isValidationError("ALERT_VALIDATION_001")).toBe(true);
        expect(AlertErrorCategories.isValidationError("ALERT_VALIDATION_200")).toBe(true);
        expect(AlertErrorCategories.isValidationError("ALERT_BUSINESS_300")).toBe(false);
      });
    });

    describe("isBusinessError", () => {
      it("should correctly identify business errors", () => {
        expect(AlertErrorCategories.isBusinessError("ALERT_BUSINESS_300")).toBe(true);
        expect(AlertErrorCategories.isBusinessError("ALERT_BUSINESS_500")).toBe(true);
        expect(AlertErrorCategories.isBusinessError("ALERT_VALIDATION_001")).toBe(false);
      });
    });

    describe("isSystemError", () => {
      it("should correctly identify system errors", () => {
        expect(AlertErrorCategories.isSystemError("ALERT_SYSTEM_600")).toBe(true);
        expect(AlertErrorCategories.isSystemError("ALERT_SYSTEM_800")).toBe(true);
        expect(AlertErrorCategories.isSystemError("ALERT_BUSINESS_300")).toBe(false);
      });
    });

    describe("isExternalError", () => {
      it("should correctly identify external errors", () => {
        expect(AlertErrorCategories.isExternalError("ALERT_EXTERNAL_900")).toBe(true);
        expect(AlertErrorCategories.isExternalError("ALERT_EXTERNAL_950")).toBe(true);
        expect(AlertErrorCategories.isExternalError("ALERT_SYSTEM_600")).toBe(false);
      });
    });

    describe("isRetryable", () => {
      it("should correctly identify retryable errors", () => {
        // 外部依赖错误通常可重试
        expect(AlertErrorCategories.isRetryable("ALERT_EXTERNAL_900")).toBe(true);
        expect(AlertErrorCategories.isRetryable("ALERT_EXTERNAL_950")).toBe(true);
        
        // 系统超时错误可重试
        expect(AlertErrorCategories.isRetryable("ALERT_SYSTEM_700")).toBe(true);
        expect(AlertErrorCategories.isRetryable("ALERT_SYSTEM_701")).toBe(true);
        
        // 某些业务错误可重试
        expect(AlertErrorCategories.isRetryable("ALERT_BUSINESS_303")).toBe(true);
        expect(AlertErrorCategories.isRetryable("ALERT_BUSINESS_500")).toBe(true);
        
        // 约束违反不可重试
        expect(AlertErrorCategories.isRetryable("ALERT_EXTERNAL_903")).toBe(false);
      });
    });

    describe("getRecoveryAction", () => {
      it("should return correct recovery action", () => {
        // 可重试错误
        expect(AlertErrorCategories.getRecoveryAction("ALERT_EXTERNAL_900")).toBe("retry");
        expect(AlertErrorCategories.getRecoveryAction("ALERT_SYSTEM_700")).toBe("retry");
        
        // 外部依赖和系统错误应降级
        expect(AlertErrorCategories.getRecoveryAction("ALERT_EXTERNAL_903")).toBe("fallback");
        expect(AlertErrorCategories.getRecoveryAction("ALERT_SYSTEM_800")).toBe("fallback");
        
        // 其他错误应中止
        expect(AlertErrorCategories.getRecoveryAction("ALERT_VALIDATION_001")).toBe("abort");
      });
    });

    describe("getSeverityLevel", () => {
      it("should return correct severity level", () => {
        // 验证错误通常是低级别
        expect(AlertErrorCategories.getSeverityLevel("ALERT_VALIDATION_001")).toBe("low");
        
        // 业务逻辑错误根据类型判断
        expect(AlertErrorCategories.getSeverityLevel("ALERT_BUSINESS_404")).toBe("high");
        expect(AlertErrorCategories.getSeverityLevel("ALERT_BUSINESS_300")).toBe("medium");
        
        // 系统资源错误
        expect(AlertErrorCategories.getSeverityLevel("ALERT_SYSTEM_600")).toBe("critical");
        expect(AlertErrorCategories.getSeverityLevel("ALERT_SYSTEM_700")).toBe("high");
        
        // 外部依赖错误
        expect(AlertErrorCategories.getSeverityLevel("ALERT_EXTERNAL_900")).toBe("critical");
        expect(AlertErrorCategories.getSeverityLevel("ALERT_EXTERNAL_950")).toBe("high");
      });
    });

    describe("requiresImmediateAlert", () => {
      it("should correctly identify errors requiring immediate alert", () => {
        expect(AlertErrorCategories.requiresImmediateAlert("ALERT_SYSTEM_600")).toBe(true);
        expect(AlertErrorCategories.requiresImmediateAlert("ALERT_SYSTEM_601")).toBe(true);
        expect(AlertErrorCategories.requiresImmediateAlert("ALERT_SYSTEM_800")).toBe(true);
        expect(AlertErrorCategories.requiresImmediateAlert("ALERT_EXTERNAL_900")).toBe(true);
        expect(AlertErrorCategories.requiresImmediateAlert("ALERT_VALIDATION_001")).toBe(false);
      });
    });

    describe("requiresServiceDegradation", () => {
      it("should correctly identify errors requiring service degradation", () => {
        expect(AlertErrorCategories.requiresServiceDegradation("ALERT_EXTERNAL_900")).toBe(true);
        expect(AlertErrorCategories.requiresServiceDegradation("ALERT_EXTERNAL_930")).toBe(true);
        expect(AlertErrorCategories.requiresServiceDegradation("ALERT_SYSTEM_600")).toBe(true);
        expect(AlertErrorCategories.requiresServiceDegradation("ALERT_VALIDATION_001")).toBe(false);
      });
    });

    describe("requiresResourceCleanup", () => {
      it("should correctly identify errors requiring resource cleanup", () => {
        expect(AlertErrorCategories.requiresResourceCleanup("ALERT_SYSTEM_600")).toBe(true);
        expect(AlertErrorCategories.requiresResourceCleanup("ALERT_SYSTEM_602")).toBe(true);
        expect(AlertErrorCategories.requiresResourceCleanup("ALERT_SYSTEM_605")).toBe(true);
        expect(AlertErrorCategories.requiresResourceCleanup("ALERT_VALIDATION_001")).toBe(false);
      });
    });
  });
});