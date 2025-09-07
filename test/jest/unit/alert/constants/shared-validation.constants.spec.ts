import { SHARED_VALIDATION_RULES } from "../../../../../src/alert/constants/shared.constants";

describe("SHARED_VALIDATION_RULES", () => {
  describe("MESSAGE_LENGTH", () => {
    it("应定义消息长度限制", () => {
      expect(SHARED_VALIDATION_RULES.MESSAGE_LENGTH.MIN).toBe(1);
      expect(SHARED_VALIDATION_RULES.MESSAGE_LENGTH.MAX).toBe(1000);
    });
  });

  describe("ID_LENGTH", () => {
    it("应定义ID长度限制", () => {
      expect(SHARED_VALIDATION_RULES.ID_LENGTH.MIN).toBe(1);
      expect(SHARED_VALIDATION_RULES.ID_LENGTH.MAX).toBe(100);
      expect(SHARED_VALIDATION_RULES.ID_LENGTH.TYPICAL_MIN).toBe(15);
      expect(SHARED_VALIDATION_RULES.ID_LENGTH.TYPICAL_MAX).toBe(50);
    });
  });

  describe("NUMERIC_RANGE", () => {
    it("应定义数值范围", () => {
      expect(SHARED_VALIDATION_RULES.NUMERIC_RANGE.THRESHOLD_MIN).toBe(0);
      expect(SHARED_VALIDATION_RULES.NUMERIC_RANGE.THRESHOLD_MAX).toBe(Number.MAX_SAFE_INTEGER);
      expect(SHARED_VALIDATION_RULES.NUMERIC_RANGE.PERCENTAGE_MIN).toBe(0);
      expect(SHARED_VALIDATION_RULES.NUMERIC_RANGE.PERCENTAGE_MAX).toBe(100);
      expect(SHARED_VALIDATION_RULES.NUMERIC_RANGE.COUNT_MIN).toBe(0);
    });
  });

  describe("TEXT_PATTERNS", () => {
    it("应定义文本模式", () => {
      expect(SHARED_VALIDATION_RULES.TEXT_PATTERNS.GENERAL_NAME).toBeInstanceOf(RegExp);
      expect(SHARED_VALIDATION_RULES.TEXT_PATTERNS.IDENTIFIER).toBeInstanceOf(RegExp);
      expect(SHARED_VALIDATION_RULES.TEXT_PATTERNS.TAG).toBeInstanceOf(RegExp);
      expect(SHARED_VALIDATION_RULES.TEXT_PATTERNS.BASIC_ID).toBeInstanceOf(RegExp);
    });

    describe("GENERAL_NAME 模式", () => {
      it("应接受有效的通用名称", () => {
        const pattern = SHARED_VALIDATION_RULES.TEXT_PATTERNS.GENERAL_NAME;
        
        expect(pattern.test("CPU使用率告警")).toBe(true);
        expect(pattern.test("Memory Alert 001")).toBe(true);
        expect(pattern.test("API_response_time")).toBe(true);
        expect(pattern.test("用户服务-健康检查")).toBe(true);
        expect(pattern.test("数据库连接数.监控")).toBe(true);
      });

      it("应拒绝无效的通用名称", () => {
        const pattern = SHARED_VALIDATION_RULES.TEXT_PATTERNS.GENERAL_NAME;
        
        expect(pattern.test("")).toBe(false);
        expect(pattern.test("invalid@name")).toBe(false);
        expect(pattern.test("name#with#hash")).toBe(false);
        expect(pattern.test("name&with&ampersand")).toBe(false);
      });
    });

    describe("IDENTIFIER 模式", () => {
      it("应接受有效的标识符", () => {
        const pattern = SHARED_VALIDATION_RULES.TEXT_PATTERNS.IDENTIFIER;
        
        expect(pattern.test("cpu_usage")).toBe(true);
        expect(pattern.test("memory.used")).toBe(true);
        expect(pattern.test("api_response_time")).toBe(true);
        expect(pattern.test("DB_CONNECTION_COUNT")).toBe(true);
      });

      it("应拒绝无效的标识符", () => {
        const pattern = SHARED_VALIDATION_RULES.TEXT_PATTERNS.IDENTIFIER;
        
        expect(pattern.test("")).toBe(false);
        expect(pattern.test("cpu-usage")).toBe(false);
        expect(pattern.test("metric with spaces")).toBe(false);
        expect(pattern.test("metric@invalid")).toBe(false);
        expect(pattern.test("中文标识符")).toBe(false);
      });
    });

    describe("TAG 模式", () => {
      it("应接受有效的标签", () => {
        const pattern = SHARED_VALIDATION_RULES.TEXT_PATTERNS.TAG;
        
        expect(pattern.test("production")).toBe(true);
        expect(pattern.test("app-server")).toBe(true);
        expect(pattern.test("db_primary")).toBe(true);
        expect(pattern.test("ENV_PROD")).toBe(true);
      });

      it("应拒绝无效的标签", () => {
        const pattern = SHARED_VALIDATION_RULES.TEXT_PATTERNS.TAG;
        
        expect(pattern.test("")).toBe(false);
        expect(pattern.test("tag with spaces")).toBe(false);
        expect(pattern.test("tag.with.dots")).toBe(false);
        expect(pattern.test("tag@invalid")).toBe(false);
      });
    });
  });

  describe("VALIDATORS", () => {
    describe("isValidStringLength", () => {
      it("应正确验证字符串长度", () => {
        const validator = SHARED_VALIDATION_RULES.VALIDATORS.isValidStringLength;
        
        expect(validator("hello", 3, 10)).toBe(true);
        expect(validator("hi", 3, 10)).toBe(false);
        expect(validator("this is too long", 3, 10)).toBe(false);
        expect(validator("perfect", 3, 10)).toBe(true);
      });

      it("应处理边界情况", () => {
        const validator = SHARED_VALIDATION_RULES.VALIDATORS.isValidStringLength;
        
        expect(validator("", 0, 5)).toBe(true);
        expect(validator("a", 1, 1)).toBe(true);
        expect(validator("ab", 1, 1)).toBe(false);
      });

      it("应拒绝非字符串输入", () => {
        const validator = SHARED_VALIDATION_RULES.VALIDATORS.isValidStringLength;
        
        expect(validator(null as any, 1, 10)).toBe(false);
        expect(validator(undefined as any, 1, 10)).toBe(false);
        expect(validator(123 as any, 1, 10)).toBe(false);
        expect(validator([] as any, 1, 10)).toBe(false);
      });
    });

    describe("isValidNumberRange", () => {
      it("应正确验证数值范围", () => {
        const validator = SHARED_VALIDATION_RULES.VALIDATORS.isValidNumberRange;
        
        expect(validator(5, 0, 10)).toBe(true);
        expect(validator(0, 0, 10)).toBe(true);
        expect(validator(10, 0, 10)).toBe(true);
        expect(validator(-1, 0, 10)).toBe(false);
        expect(validator(11, 0, 10)).toBe(false);
      });

      it("应处理浮点数", () => {
        const validator = SHARED_VALIDATION_RULES.VALIDATORS.isValidNumberRange;
        
        expect(validator(5.5, 0, 10)).toBe(true);
        expect(validator(0.1, 0, 10)).toBe(true);
        expect(validator(9.99, 0, 10)).toBe(true);
      });

      it("应拒绝非数值和特殊数值", () => {
        const validator = SHARED_VALIDATION_RULES.VALIDATORS.isValidNumberRange;
        
        expect(validator(NaN, 0, 10)).toBe(false);
        expect(validator(Infinity, 0, 10)).toBe(false);
        expect(validator(-Infinity, 0, 10)).toBe(false);
        expect(validator(null as any, 0, 10)).toBe(false);
        expect(validator(undefined as any, 0, 10)).toBe(false);
        expect(validator("5" as any, 0, 10)).toBe(false);
      });
    });

    describe("isValidTextPattern", () => {
      it("应正确验证文本模式", () => {
        const validator = SHARED_VALIDATION_RULES.VALIDATORS.isValidTextPattern;
        const pattern = /^[a-zA-Z0-9_]+$/;
        
        expect(validator("valid_text", pattern)).toBe(true);
        expect(validator("Valid123", pattern)).toBe(true);
        expect(validator("invalid-text", pattern)).toBe(false);
        expect(validator("invalid text", pattern)).toBe(false);
      });

      it("应拒绝空字符串和空白字符串", () => {
        const validator = SHARED_VALIDATION_RULES.VALIDATORS.isValidTextPattern;
        const pattern = /^[a-zA-Z0-9_]+$/;
        
        expect(validator("", pattern)).toBe(false);
        expect(validator("   ", pattern)).toBe(false);
        expect(validator("\n\t", pattern)).toBe(false);
      });

      it("应拒绝非字符串输入", () => {
        const validator = SHARED_VALIDATION_RULES.VALIDATORS.isValidTextPattern;
        const pattern = /^[a-zA-Z0-9_]+$/;
        
        expect(validator(null as any, pattern)).toBe(false);
        expect(validator(undefined as any, pattern)).toBe(false);
        expect(validator(123 as any, pattern)).toBe(false);
      });
    });

    describe("isValidMessage", () => {
      it("应正确验证消息格式", () => {
        const validator = SHARED_VALIDATION_RULES.VALIDATORS.isValidMessage;
        
        expect(validator("有效的消息内容")).toBe(true);
        expect(validator("Valid message content")).toBe(true);
        expect(validator("Message with numbers 123")).toBe(true);
      });

      it("应拒绝无效的消息", () => {
        const validator = SHARED_VALIDATION_RULES.VALIDATORS.isValidMessage;
        
        expect(validator("")).toBe(false); // 太短
        
        // 生成超过1000字符的消息
        const longMessage = "a".repeat(1001);
        expect(validator(longMessage)).toBe(false); // 太长
      });
    });
  });
});