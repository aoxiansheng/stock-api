import { validate, ValidationError } from "class-validator";
import { plainToClass, Transform } from "class-transformer";
import {
  CreateApiKeyDto,
  UpdateApiKeyDto,
  RateLimitDto,
  ApiKeyResponseDto,
} from "../../../../../src/auth/dto/apikey.dto";
import { Permission } from "../../../../../src/auth/enums/user-role.enum";

describe("API Key DTOs", () => {
  describe("RateLimitDto", () => {
    it("should validate valid rate limit data", async () => {
      const rateLimitData = {
        requests: 1000,
        window: "1h",
      };

      const dto = plainToClass(RateLimitDto, rateLimitData) as RateLimitDto;
      const errors = await validate(dto);

      expect(errors).toHaveLength(0);
      expect(dto.requests).toBe(rateLimitData.requests);
      expect(dto.window).toBe(rateLimitData.window);
    });

    it("should reject zero or negative requests", async () => {
      const rateLimitData = {
        requests: 0,
        window: "1h",
      };

      const dto = plainToClass(RateLimitDto, rateLimitData) as RateLimitDto;
      const errors = await validate(dto);

      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe("requests");
      expect(errors[0].constraints).toHaveProperty("min");
    });

    it("should reject negative requests", async () => {
      const rateLimitData = {
        requests: -5,
        window: "1h",
      };

      const dto = plainToClass(RateLimitDto, rateLimitData) as RateLimitDto;
      const errors = await validate(dto);

      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe("requests");
      expect(errors[0].constraints).toHaveProperty("min");
    });

    it("should reject non-number requests", async () => {
      const rateLimitData = {
        requests: "1000" as any,
        window: "1h",
      };

      const dto = plainToClass(RateLimitDto, rateLimitData) as RateLimitDto;
      const errors = await validate(dto);

      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe("requests");
      expect(errors[0].constraints).toHaveProperty("isNumber");
    });

    it("should reject empty window", async () => {
      const rateLimitData = {
        requests: 1000,
        window: "",
      };

      const dto = plainToClass(RateLimitDto, rateLimitData) as RateLimitDto;
      const errors = await validate(dto);

      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe("window");
      expect(errors[0].constraints).toHaveProperty("isNotEmpty");
    });

    it("should reject non-string window", async () => {
      const rateLimitData = {
        requests: 1000,
        window: 3600 as any,
      };

      const dto = plainToClass(RateLimitDto, rateLimitData) as RateLimitDto;
      const errors = await validate(dto);

      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe("window");
      expect(errors[0].constraints).toHaveProperty("isString");
    });

    it("should accept various time window formats", async () => {
      const validWindows = ["1m", "5m", "1h", "24h", "1d"];

      for (const window of validWindows) {
        const rateLimitData = {
          requests: 100,
          window,
        };

        const dto = plainToClass(RateLimitDto, rateLimitData) as RateLimitDto;
        const errors = await validate(dto);

        expect(errors).toHaveLength(0);
        expect(dto.window).toBe(window);
      }
    });
  });

  describe("CreateApiKeyDto", () => {
    it("should validate valid API key creation data", async () => {
      const apiKeyData = {
        name: "Test Application",
        description: "API key for testing purposes",
        permissions: [Permission.DATA_READ, Permission.QUERY_EXECUTE],
        rateLimit: {
          requests: 1000,
          window: "1h",
        },
        expiresAt: new Date("2024-12-31T23:59:59.999Z"),
      };

      const dto = plainToClass(CreateApiKeyDto, apiKeyData) as CreateApiKeyDto;
      const errors = await validate(dto);

      expect(errors).toHaveLength(0);
      expect(dto.name).toBe(apiKeyData.name);
      expect(dto.description).toBe(apiKeyData.description);
      expect(dto.permissions).toEqual(apiKeyData.permissions);
      expect(dto.rateLimit).toEqual(apiKeyData.rateLimit);
      expect(dto.expiresAt).toEqual(apiKeyData.expiresAt);
    });

    it("should validate minimal API key data (only name required)", async () => {
      const apiKeyData = {
        name: "Minimal API Key",
      };

      const dto = plainToClass(CreateApiKeyDto, apiKeyData) as CreateApiKeyDto;
      const errors = await validate(dto);

      expect(errors).toHaveLength(0);
      expect(dto.name).toBe(apiKeyData.name);
      expect(dto.description).toBeUndefined();
      expect(dto.permissions).toBeUndefined();
      expect(dto.rateLimit).toBeUndefined();
      expect(dto.expiresAt).toBeUndefined();
    });

    it("should reject empty name", async () => {
      const apiKeyData = {
        name: "",
      };

      const dto = plainToClass(CreateApiKeyDto, apiKeyData) as CreateApiKeyDto;
      const errors = await validate(dto);

      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe("name");
      expect(errors[0].constraints).toHaveProperty("isNotEmpty");
    });

    it("should reject name exceeding max length", async () => {
      const apiKeyData = {
        name: "a".repeat(101), // Exceeds 100 character limit
      };

      const dto = plainToClass(CreateApiKeyDto, apiKeyData) as CreateApiKeyDto;
      const errors = await validate(dto);

      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe("name");
      expect(errors[0].constraints).toHaveProperty("maxLength");
    });

    it("should reject description exceeding max length", async () => {
      const apiKeyData = {
        name: "Test API Key",
        description: "a".repeat(501), // Exceeds 500 character limit
      };

      const dto = plainToClass(CreateApiKeyDto, apiKeyData) as CreateApiKeyDto;
      const errors = await validate(dto);

      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe("description");
      expect(errors[0].constraints).toHaveProperty("maxLength");
    });

    it("should reject non-string name", async () => {
      const apiKeyData = {
        name: 123 as any,
      };

      const dto = plainToClass(CreateApiKeyDto, apiKeyData) as CreateApiKeyDto;
      const errors = await validate(dto);

      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe("name");
      expect(errors[0].constraints).toHaveProperty("isString");
    });

    it("should reject invalid permissions", async () => {
      const apiKeyData = {
        name: "Test API Key",
        permissions: ["INVALID_PERMISSION"] as any,
      };

      const dto = plainToClass(CreateApiKeyDto, apiKeyData) as CreateApiKeyDto;
      const errors = await validate(dto);

      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe("permissions");
      expect(errors[0].constraints).toHaveProperty("isEnum");
    });

    it("should reject non-array permissions", async () => {
      const apiKeyData = {
        name: "Test API Key",
        permissions: "not-an-array" as any,
      };

      const dto = plainToClass(CreateApiKeyDto, apiKeyData) as CreateApiKeyDto;
      const errors = await validate(dto);

      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe("permissions");
      expect(errors[0].constraints).toHaveProperty("isArray");
    });

    it("should validate all valid permissions", async () => {
      const apiKeyData = {
        name: "Test API Key",
        permissions: Object.values(Permission),
      };

      const dto = plainToClass(CreateApiKeyDto, apiKeyData) as CreateApiKeyDto;
      const errors = await validate(dto);

      expect(errors).toHaveLength(0);
      expect(dto.permissions).toEqual(Object.values(Permission));
    });

    it("should validate nested rate limit configuration", async () => {
      const apiKeyData = {
        name: "Test API Key",
        rateLimit: {
          requests: 500,
          window: "30m",
        },
      };

      const dto = plainToClass(CreateApiKeyDto, apiKeyData) as CreateApiKeyDto;
      const errors = await validate(dto);

      expect(errors).toHaveLength(0);
      expect(dto.rateLimit?.requests).toBe(500);
      expect(dto.rateLimit?.window).toBe("30m");
    });

    it("should reject invalid nested rate limit configuration", async () => {
      const apiKeyData = {
        name: "Test API Key",
        rateLimit: {
          requests: -1, // Invalid
          window: "", // Invalid
        },
      };

      const dto = plainToClass(CreateApiKeyDto, apiKeyData) as CreateApiKeyDto;
      const errors = await validate(dto);

      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe("rateLimit");
      expect(errors[0].children).toHaveLength(2); // Both requests and window are invalid
    });

    it("should validate date transformation for expiresAt", async () => {
      const expiryDate = "2024-12-31T23:59:59.999Z";
      const apiKeyData = {
        name: "Test API Key",
        expiresAt: expiryDate,
      };

      const dto = plainToClass(CreateApiKeyDto, apiKeyData) as CreateApiKeyDto;
      const errors = await validate(dto);

      expect(errors).toHaveLength(0);
      expect(dto.expiresAt).toBeInstanceOf(Date);
      expect(dto.expiresAt?.toISOString()).toBe(expiryDate);
    });

    it("should reject invalid date format", async () => {
      const apiKeyData = {
        name: "Test API Key",
        expiresAt: "invalid-date" as any,
      };

      const dto = plainToClass(CreateApiKeyDto, apiKeyData) as CreateApiKeyDto;
      const errors = await validate(dto);

      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe("expiresAt");
      expect(errors[0].constraints).toHaveProperty("isDate");
    });
  });

  describe("UpdateApiKeyDto", () => {
    it("should validate valid update data", async () => {
      const updateData = {
        name: "Updated API Key Name",
        description: "Updated description",
        permissions: [Permission.MAPPING_WRITE],
        rateLimit: {
          requests: 2000,
          window: "2h",
        },
        isActive: false,
        expiresAt: new Date("2025-01-01T00:00:00.000Z"),
      };

      const dto = plainToClass(UpdateApiKeyDto, updateData) as UpdateApiKeyDto;
      const errors = await validate(dto);

      expect(errors).toHaveLength(0);
      expect(dto.name).toBe(updateData.name);
      expect(dto.description).toBe(updateData.description);
      expect(dto.permissions).toEqual(updateData.permissions);
      expect(dto.rateLimit).toEqual(updateData.rateLimit);
      expect(dto.isActive).toBe(updateData.isActive);
      expect(dto.expiresAt).toEqual(updateData.expiresAt);
    });

    it("should validate empty update data (all fields optional)", async () => {
      const updateData = {};

      const dto = plainToClass(UpdateApiKeyDto, updateData) as UpdateApiKeyDto;
      const errors = await validate(dto);

      expect(errors).toHaveLength(0);
      expect(dto.name).toBeUndefined();
      expect(dto.description).toBeUndefined();
      expect(dto.permissions).toBeUndefined();
      expect(dto.rateLimit).toBeUndefined();
      expect(dto.isActive).toBeUndefined();
      expect(dto.expiresAt).toBeUndefined();
    });

    it("should reject invalid name length", async () => {
      const updateData = {
        name: "a".repeat(101), // Exceeds max length
      };

      const dto = plainToClass(UpdateApiKeyDto, updateData) as UpdateApiKeyDto;
      const errors = await validate(dto);

      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe("name");
      expect(errors[0].constraints).toHaveProperty("maxLength");
    });

    it("should reject invalid description length", async () => {
      const updateData = {
        description: "a".repeat(501), // Exceeds max length
      };

      const dto = plainToClass(UpdateApiKeyDto, updateData) as UpdateApiKeyDto;
      const errors = await validate(dto);

      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe("description");
      expect(errors[0].constraints).toHaveProperty("maxLength");
    });

    it("should reject invalid permissions in array", async () => {
      const updateData = {
        permissions: [Permission.DATA_READ, "INVALID_PERMISSION"] as any,
      };

      const dto = plainToClass(UpdateApiKeyDto, updateData) as UpdateApiKeyDto;
      const errors = await validate(dto);

      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe("permissions");
      expect(errors[0].constraints).toHaveProperty("isEnum");
    });

    it("should validate partial updates", async () => {
      const partialUpdates = [
        { name: "New Name" },
        { description: "New Description" },
        { permissions: [Permission.DATA_READ] },
        { isActive: true },
        { expiresAt: new Date() },
        { rateLimit: { requests: 100, window: "1m" } },
      ];

      for (const updateData of partialUpdates) {
        const dto = plainToClass(
          UpdateApiKeyDto,
          updateData,
        ) as UpdateApiKeyDto;
        const errors = await validate(dto);

        expect(errors).toHaveLength(0);
      }
    });

    it("should handle boolean isActive values", async () => {
      const validBooleans = [true, false];

      for (const isActive of validBooleans) {
        const updateData = { isActive };
        const dto = plainToClass(
          UpdateApiKeyDto,
          updateData,
        ) as UpdateApiKeyDto;
        const errors = await validate(dto);

        expect(errors).toHaveLength(0);
        expect(dto.isActive).toBe(isActive);
      }
    });
  });

  describe("ApiKeyResponseDto", () => {
    it("should create valid response DTO", () => {
      const responseData = {
        id: "api-key-123",
        appKey: "app-key-456",
        accessToken: "access-token-789",
        name: "Test API Key",
        description: "Test description",
        permissions: [Permission.DATA_READ, Permission.QUERY_EXECUTE],
        rateLimit: {
          requests: 1000,
          window: "1h",
        },
        isActive: true,
        expiresAt: new Date("2024-12-31T23:59:59.999Z"),
        usageCount: 42,
        lastUsedAt: new Date("2023-06-15T10:30:00.000Z"),
        createdAt: new Date("2023-01-01T00:00:00.000Z"),
      };

      const dto = plainToClass(
        ApiKeyResponseDto,
        responseData,
      ) as ApiKeyResponseDto;

      expect(dto.id).toBe(responseData.id);
      expect(dto.appKey).toBe(responseData.appKey);
      expect(dto.accessToken).toBe(responseData.accessToken);
      expect(dto.name).toBe(responseData.name);
      expect(dto.description).toBe(responseData.description);
      expect(dto.permissions).toEqual(responseData.permissions);
      expect(dto.rateLimit).toEqual(responseData.rateLimit);
      expect(dto.isActive).toBe(responseData.isActive);
      expect(dto.expiresAt).toEqual(responseData.expiresAt);
      expect(dto.usageCount).toBe(responseData.usageCount);
      expect(dto.lastUsedAt).toEqual(responseData.lastUsedAt);
      expect(dto.createdAt).toEqual(responseData.createdAt);
    });

    it("should handle optional fields", () => {
      const responseData = {
        id: "api-key-123",
        appKey: "app-key-456",
        accessToken: "access-token-789",
        name: "Test API Key",
        permissions: [Permission.DATA_READ],
        rateLimit: { requests: 1000, window: "1h" },
        isActive: true,
        usageCount: 0,
        createdAt: new Date(),
        // Optional fields not provided
        description: undefined,
        expiresAt: undefined,
        lastUsedAt: undefined,
      };

      const dto = plainToClass(
        ApiKeyResponseDto,
        responseData,
      ) as ApiKeyResponseDto;

      expect(dto.description).toBeUndefined();
      expect(dto.expiresAt).toBeUndefined();
      expect(dto.lastUsedAt).toBeUndefined();
      expect(dto.usageCount).toBe(0);
    });

    it("should preserve all permission types", () => {
      const responseData = {
        id: "api-key-123",
        appKey: "app-key-456",
        accessToken: "access-token-789",
        name: "All Permissions Key",
        permissions: Object.values(Permission),
        rateLimit: { requests: 1000, window: "1h" },
        isActive: true,
        usageCount: 0,
        createdAt: new Date(),
      };

      const dto = plainToClass(
        ApiKeyResponseDto,
        responseData,
      ) as ApiKeyResponseDto;
      expect(dto.permissions).toEqual(Object.values(Permission));
    });
  });
});
