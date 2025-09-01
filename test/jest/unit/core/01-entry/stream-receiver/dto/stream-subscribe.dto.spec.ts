import { validate } from "class-validator";
import { StreamSubscribeDto } from "../../../../../../../src/core/01-entry/stream-receiver/dto/stream-subscribe.dto";

describe("StreamSubscribeDto", () => {
  let dto: StreamSubscribeDto;

  beforeEach(() => {
    dto = new StreamSubscribeDto();
  });

  describe("Basic instantiation", () => {
    it("should be instantiable", () => {
      expect(dto).toBeInstanceOf(StreamSubscribeDto);
    });

    it("should have default wsCapabilityType", () => {
      expect(dto.wsCapabilityType).toBe("stream-stock-quote");
    });
  });

  describe("symbols validation", () => {
    it("should validate with valid symbols array", async () => {
      dto.symbols = ["700.HK", "AAPL.US"];
      dto.wsCapabilityType = "stream-stock-quote";

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it("should require symbols array", async () => {
      dto.wsCapabilityType = "stream-stock-quote";
      // symbols not set

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe("symbols");
    });

    it("should require at least one symbol", async () => {
      dto.symbols = [];
      dto.wsCapabilityType = "stream-stock-quote";

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      const symbolError = errors.find((error) => error.property === "symbols");
      expect(symbolError).toBeDefined();
      expect(symbolError?.constraints?.arrayMinSize).toContain(
        "至少需要订阅一个符号",
      );
    });

    it("should limit maximum symbols to 50", async () => {
      dto.symbols = new Array(51).fill("TEST.US");
      dto.wsCapabilityType = "stream-stock-quote";

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      const symbolError = errors.find((error) => error.property === "symbols");
      expect(symbolError).toBeDefined();
      expect(symbolError?.constraints?.arrayMaxSize).toContain(
        "单次最多订阅50个符号",
      );
    });

    it("should validate that all symbols are strings", async () => {
      dto.symbols = ["700.HK", 123 as any, "AAPL.US"];
      dto.wsCapabilityType = "stream-stock-quote";

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      const symbolError = errors.find((error) => error.property === "symbols");
      expect(symbolError).toBeDefined();
    });

    it("should accept valid symbol formats", async () => {
      const validSymbols = [
        "700.HK",
        "AAPL.US",
        "000001.SZ",
        "600000.SH",
        "BTC-USD",
        "^GSPC",
      ];

      dto.symbols = validSymbols;
      dto.wsCapabilityType = "stream-stock-quote";

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });
  });

  describe("wsCapabilityType validation", () => {
    it("should validate string wsCapabilityType", async () => {
      dto.symbols = ["700.HK"];
      dto.wsCapabilityType = "stream-stock-quote";

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it("should accept custom capability types", async () => {
      dto.symbols = ["700.HK"];
      dto.wsCapabilityType = "stream-custom-data";

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it("should reject non-string capability type", async () => {
      dto.symbols = ["700.HK"];
      dto.wsCapabilityType = 123 as any;

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      const typeError = errors.find(
        (error) => error.property === "wsCapabilityType",
      );
      expect(typeError).toBeDefined();
    });
  });

  describe("Optional authentication fields", () => {
    it("should accept JWT token", async () => {
      dto.symbols = ["700.HK"];
      dto.token =
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c";

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it("should accept API key authentication", async () => {
      dto.symbols = ["700.HK"];
      dto.apiKey = "app_key_12345";
      dto.accessToken = "access_token_67890";

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it("should validate string types for auth fields", async () => {
      dto.symbols = ["700.HK"];
      dto.apiKey = 123 as any;

      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      const apiKeyError = errors.find((error) => error.property === "apiKey");
      expect(apiKeyError).toBeDefined();
    });

    it("should work without auth fields (optional)", async () => {
      dto.symbols = ["700.HK"];
      // No auth fields set

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });
  });

  describe("Optional fields", () => {
    it("should accept preferredProvider", async () => {
      dto.symbols = ["700.HK"];
      dto.preferredProvider = "longport";

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it("should accept options object", async () => {
      dto.symbols = ["700.HK"];
      dto.options = {
        includeAfterHours: true,
        updateFrequency: 1000,
        fields: ["lastPrice", "volume"],
      };

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it("should work without optional fields", async () => {
      dto.symbols = ["700.HK"];

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });
  });

  describe("Complete DTO validation", () => {
    it("should validate complete DTO with all fields", async () => {
      dto.symbols = ["700.HK", "AAPL.US"];
      dto.wsCapabilityType = "stream-stock-quote";
      dto.token = "jwt_token_example";
      dto.apiKey = "api_key_example";
      dto.accessToken = "access_token_example";
      dto.preferredProvider = "longport";
      dto.options = { includeAfterHours: true };

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it("should validate minimal DTO", async () => {
      dto.symbols = ["700.HK"];

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });
  });

  describe("Property assignments", () => {
    it("should allow property assignment", () => {
      dto.symbols = ["TEST.US"];
      dto.wsCapabilityType = "custom-stream";
      dto.preferredProvider = "custom-provider";

      expect(dto.symbols).toEqual(["TEST.US"]);
      expect(dto.wsCapabilityType).toBe("custom-stream");
      expect(dto.preferredProvider).toBe("custom-provider");
    });

    it("should support object spread", () => {
      const data = {
        symbols: ["700.HK"],
        wsCapabilityType: "stream-stock-quote",
        preferredProvider: "longport",
      };

      Object.assign(dto, data);

      expect(dto.symbols).toEqual(data.symbols);
      expect(dto.wsCapabilityType).toBe(data.wsCapabilityType);
      expect(dto.preferredProvider).toBe(data.preferredProvider);
    });
  });
});
