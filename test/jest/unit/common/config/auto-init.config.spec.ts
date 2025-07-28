import {
  getAutoInitConfig,
  PRESET_FIELD_DEFINITIONS,
} from "../../../../../src/common/config/auto-init.config";

describe("AutoInitConfig", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe("getAutoInitConfig", () => {
    describe("main enabled switch", () => {
      it("should be enabled by default", () => {
        delete process.env.AUTO_INIT_ENABLED;
        const config = getAutoInitConfig();
        expect(config.enabled).toBe(true);
      });

      it('should be disabled when explicitly set to "false"', () => {
        process.env.AUTO_INIT_ENABLED = "false";
        const config = getAutoInitConfig();
        expect(config.enabled).toBe(false);
      });

      it('should be enabled for any non-"false" value', () => {
        const testValues = ["true", "TRUE", "1", "yes", "enabled", ""];

        testValues.forEach((value) => {
          process.env.AUTO_INIT_ENABLED = value;
          const config = getAutoInitConfig();
          expect(config.enabled).toBe(true);
        });
      });
    });

    describe("preset fields configuration", () => {
      it("should enable stockQuote by default", () => {
        delete process.env.AUTO_INIT_STOCK_QUOTE;
        const config = getAutoInitConfig();
        expect(config.presetFields.stockQuote).toBe(true);
      });

      it('should disable stockQuote when set to "false"', () => {
        process.env.AUTO_INIT_STOCK_QUOTE = "false";
        const config = getAutoInitConfig();
        expect(config.presetFields.stockQuote).toBe(false);
      });

      it("should enable stockBasicInfo by default", () => {
        delete process.env.AUTO_INIT_STOCK_BASIC_INFO;
        const config = getAutoInitConfig();
        expect(config.presetFields.stockBasicInfo).toBe(true);
      });

      it('should disable stockBasicInfo when set to "false"', () => {
        process.env.AUTO_INIT_STOCK_BASIC_INFO = "false";
        const config = getAutoInitConfig();
        expect(config.presetFields.stockBasicInfo).toBe(false);
      });
    });

    describe("sample data configuration", () => {
      it("should enable symbolMappings by default", () => {
        delete process.env.AUTO_INIT_SYMBOL_MAPPINGS;
        const config = getAutoInitConfig();
        expect(config.sampleData.symbolMappings).toBe(true);
      });

      it('should disable symbolMappings when set to "false"', () => {
        process.env.AUTO_INIT_SYMBOL_MAPPINGS = "false";
        const config = getAutoInitConfig();
        expect(config.sampleData.symbolMappings).toBe(false);
      });

      it("should disable testData by default (security)", () => {
        delete process.env.AUTO_INIT_TEST_DATA;
        const config = getAutoInitConfig();
        expect(config.sampleData.testData).toBe(false);
      });

      it('should enable testData only when explicitly set to "true"', () => {
        process.env.AUTO_INIT_TEST_DATA = "true";
        const config = getAutoInitConfig();
        expect(config.sampleData.testData).toBe(true);
      });

      it('should keep testData disabled for non-"true" values', () => {
        const testValues = ["false", "TRUE", "1", "yes", "enabled", ""];

        testValues.forEach((value) => {
          process.env.AUTO_INIT_TEST_DATA = value;
          const config = getAutoInitConfig();
          expect(config.sampleData.testData).toBe(false);
        });
      });
    });

    describe("initialization options", () => {
      it("should enable skipExisting by default", () => {
        delete process.env.AUTO_INIT_SKIP_EXISTING;
        const config = getAutoInitConfig();
        expect(config.options.skipExisting).toBe(true);
      });

      it('should disable skipExisting when set to "false"', () => {
        process.env.AUTO_INIT_SKIP_EXISTING = "false";
        const config = getAutoInitConfig();
        expect(config.options.skipExisting).toBe(false);
      });

      it('should use "info" as default log level', () => {
        delete process.env.AUTO_INIT_LOG_LEVEL;
        const config = getAutoInitConfig();
        expect(config.options.logLevel).toBe("info");
      });

      it("should respect custom log levels", () => {
        const logLevels = ["debug", "warn", "error"];

        logLevels.forEach((level) => {
          process.env.AUTO_INIT_LOG_LEVEL = level;
          const config = getAutoInitConfig();
          expect(config.options.logLevel).toBe(level);
        });
      });

      it("should use 3 as default retry attempts", () => {
        delete process.env.AUTO_INIT_RETRY_ATTEMPTS;
        const config = getAutoInitConfig();
        expect(config.options.retryAttempts).toBe(3);
      });

      it("should parse custom retry attempts from env", () => {
        process.env.AUTO_INIT_RETRY_ATTEMPTS = "5";
        const config = getAutoInitConfig();
        expect(config.options.retryAttempts).toBe(5);
      });

      it("should handle invalid retry attempts gracefully", () => {
        process.env.AUTO_INIT_RETRY_ATTEMPTS = "invalid";
        const config = getAutoInitConfig();
        expect(config.options.retryAttempts).toBeNaN();
      });

      it("should use 1000ms as default retry delay", () => {
        delete process.env.AUTO_INIT_RETRY_DELAY;
        const config = getAutoInitConfig();
        expect(config.options.retryDelay).toBe(1000);
      });

      it("should parse custom retry delay from env", () => {
        process.env.AUTO_INIT_RETRY_DELAY = "2000";
        const config = getAutoInitConfig();
        expect(config.options.retryDelay).toBe(2000);
      });

      it("should handle invalid retry delay gracefully", () => {
        process.env.AUTO_INIT_RETRY_DELAY = "invalid";
        const config = getAutoInitConfig();
        expect(config.options.retryDelay).toBeNaN();
      });
    });

    describe("complex configuration scenarios", () => {
      it("should handle all environment variables set", () => {
        process.env.AUTO_INIT_ENABLED = "true";
        process.env.AUTO_INIT_STOCK_QUOTE = "false";
        process.env.AUTO_INIT_STOCK_BASIC_INFO = "true";
        process.env.AUTO_INIT_SYMBOL_MAPPINGS = "false";
        process.env.AUTO_INIT_TEST_DATA = "true";
        process.env.AUTO_INIT_SKIP_EXISTING = "false";
        process.env.AUTO_INIT_LOG_LEVEL = "debug";
        process.env.AUTO_INIT_RETRY_ATTEMPTS = "7";
        process.env.AUTO_INIT_RETRY_DELAY = "500";

        const config = getAutoInitConfig();

        expect(config).toEqual({
          enabled: true,
          presetFields: {
            stockQuote: false,
            stockBasicInfo: true,
          },
          sampleData: {
            symbolMappings: false,
            testData: true,
          },
          options: {
            skipExisting: false,
            logLevel: "debug",
            retryAttempts: 7,
            retryDelay: 500,
          },
        });
      });

      it("should handle empty environment gracefully", () => {
        // Clear all related environment variables
        delete process.env.AUTO_INIT_ENABLED;
        delete process.env.AUTO_INIT_STOCK_QUOTE;
        delete process.env.AUTO_INIT_STOCK_BASIC_INFO;
        delete process.env.AUTO_INIT_SYMBOL_MAPPINGS;
        delete process.env.AUTO_INIT_TEST_DATA;
        delete process.env.AUTO_INIT_SKIP_EXISTING;
        delete process.env.AUTO_INIT_LOG_LEVEL;
        delete process.env.AUTO_INIT_RETRY_ATTEMPTS;
        delete process.env.AUTO_INIT_RETRY_DELAY;

        const config = getAutoInitConfig();

        expect(config).toEqual({
          enabled: true,
          presetFields: {
            stockQuote: true,
            stockBasicInfo: true,
          },
          sampleData: {
            symbolMappings: true,
            testData: false,
          },
          options: {
            skipExisting: true,
            logLevel: "info",
            retryAttempts: 3,
            retryDelay: 1000,
          },
        });
      });
    });
  });

  describe("PRESET_FIELD_DEFINITIONS", () => {
    it("should contain stockQuote definition", () => {
      expect(PRESET_FIELD_DEFINITIONS.stockQuote).toBeDefined();
      expect(PRESET_FIELD_DEFINITIONS.stockQuote.provider).toBe("preset");
      expect(PRESET_FIELD_DEFINITIONS.stockQuote.dataRuleListType).toBe(
        "quote_fields",
      );
      expect(Array.isArray(PRESET_FIELD_DEFINITIONS.stockQuote.fields)).toBe(
        true,
      );
    });

    it("should contain stockBasicInfo definition", () => {
      expect(PRESET_FIELD_DEFINITIONS.stockBasicInfo).toBeDefined();
      expect(PRESET_FIELD_DEFINITIONS.stockBasicInfo.provider).toBe("preset");
      expect(PRESET_FIELD_DEFINITIONS.stockBasicInfo.dataRuleListType).toBe(
        "basic_info_fields",
      );
      expect(
        Array.isArray(PRESET_FIELD_DEFINITIONS.stockBasicInfo.fields),
      ).toBe(true);
    });

    it("should have field structures with required properties", () => {
      const stockQuoteFields = PRESET_FIELD_DEFINITIONS.stockQuote.fields;
      expect(stockQuoteFields.length).toBeGreaterThan(0);

      stockQuoteFields.forEach((field) => {
        expect(field).toHaveProperty("source");
        expect(field).toHaveProperty("target");
        expect(field).toHaveProperty("desc");
        expect(typeof field.source).toBe("string");
        expect(typeof field.target).toBe("string");
        expect(typeof field.desc).toBe("string");
      });
    });

    it("should have consistent field mapping structure", () => {
      const definitions = [
        PRESET_FIELD_DEFINITIONS.stockQuote,
        PRESET_FIELD_DEFINITIONS.stockBasicInfo,
      ];

      definitions.forEach((definition) => {
        expect(definition).toHaveProperty("name");
        expect(definition).toHaveProperty("description");
        expect(definition).toHaveProperty("provider");
        expect(definition).toHaveProperty("dataRuleListType");
        expect(definition).toHaveProperty("fields");
        expect(typeof definition.name).toBe("string");
        expect(typeof definition.description).toBe("string");
        expect(definition.provider).toBe("preset");
      });
    });
  });

  describe("environment variable edge cases", () => {
    it("should handle undefined vs empty string differently for testData", () => {
      process.env.AUTO_INIT_TEST_DATA = "";
      let config = getAutoInitConfig();
      expect(config.sampleData.testData).toBe(false);

      delete process.env.AUTO_INIT_TEST_DATA;
      config = getAutoInitConfig();
      expect(config.sampleData.testData).toBe(false);
    });

    it("should handle zero values in numeric fields", () => {
      process.env.AUTO_INIT_RETRY_ATTEMPTS = "0";
      process.env.AUTO_INIT_RETRY_DELAY = "0";

      const config = getAutoInitConfig();
      expect(config.options.retryAttempts).toBe(0);
      expect(config.options.retryDelay).toBe(0);
    });

    it("should handle negative values in numeric fields", () => {
      process.env.AUTO_INIT_RETRY_ATTEMPTS = "-1";
      process.env.AUTO_INIT_RETRY_DELAY = "-500";

      const config = getAutoInitConfig();
      expect(config.options.retryAttempts).toBe(-1);
      expect(config.options.retryDelay).toBe(-500);
    });
  });
});
