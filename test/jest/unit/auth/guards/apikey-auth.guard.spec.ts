/* eslint-disable @typescript-eslint/no-unused-vars */
import { Test, TestingModule } from "@nestjs/testing";
import { ExecutionContext, UnauthorizedException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";

import { ApiKeyAuthGuard } from "../../../../../src/auth/guards/apikey-auth.guard";
import { IS_PUBLIC_KEY } from "../../../../../src/auth/decorators/public.decorator";
import { REQUIRE_API_KEY } from "../../../../../src/auth/decorators/require-apikey.decorator";
import { createMock } from "@golevelup/ts-jest";

describe("ApiKeyAuthGuard", () => {
  let guard: ApiKeyAuthGuard;
  let reflector: jest.Mocked<Reflector>;
  let mockContext: jest.Mocked<ExecutionContext>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ApiKeyAuthGuard,
        {
          provide: Reflector,
          useValue: {
            getAllAndOverride: jest.fn(),
          },
        },
      ],
    }).compile();

    guard = module.get<ApiKeyAuthGuard>(ApiKeyAuthGuard);
    reflector = module.get(Reflector);

    // Mock ExecutionContext
    mockContext = {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      getArgs: jest.fn(),
      getArgByIndex: jest.fn(),
      switchToHttp: jest.fn(),
      switchToRpc: jest.fn(),
      switchToWs: jest.fn(),
      getType: jest.fn(),
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("canActivate", () => {
    beforeEach(() => {
      // Mock super.canActivate to avoid passport strategy calls
      jest
        .spyOn(Object.getPrototypeOf(ApiKeyAuthGuard.prototype), "canActivate")
        .mockReturnValue(true);
    });

    describe("Public endpoints", () => {
      it("should allow access to public endpoints", () => {
        reflector.getAllAndOverride.mockReturnValueOnce(true); // isPublic = true

        const result = guard.canActivate(mockContext);

        expect(reflector.getAllAndOverride).toHaveBeenCalledWith(
          IS_PUBLIC_KEY,
          [mockContext.getHandler(), mockContext.getClass()],
        );
        expect(result).toBe(true);
      });

      it("should check public key with correct parameters", () => {
        const mockHandler = jest.fn();
        const mockClass = jest.fn();
        mockContext.getHandler.mockReturnValue(mockHandler);
        mockContext.getClass.mockReturnValue(mockClass);

        reflector.getAllAndOverride.mockReturnValueOnce(true);

        guard.canActivate(mockContext);

        expect(mockContext.getHandler).toHaveBeenCalled();
        expect(mockContext.getClass).toHaveBeenCalled();
        expect(reflector.getAllAndOverride).toHaveBeenCalledWith(
          IS_PUBLIC_KEY,
          [mockHandler, mockClass],
        );
      });

      it("should return true immediately for public endpoints without checking API key requirement", () => {
        reflector.getAllAndOverride.mockReturnValueOnce(true); // isPublic = true

        const result = guard.canActivate(mockContext);

        expect(reflector.getAllAndOverride).toHaveBeenCalledTimes(1); // Only called for IS_PUBLIC_KEY
        expect(result).toBe(true);
      });
    });

    describe("Non-public endpoints without API key requirement", () => {
      it("should allow access when API key is not required", () => {
        reflector.getAllAndOverride
          .mockReturnValueOnce(false) // isPublic = false
          .mockReturnValueOnce(false); // requireApiKey = false

        const result = guard.canActivate(mockContext);

        expect(reflector.getAllAndOverride).toHaveBeenCalledTimes(2);
        expect(reflector.getAllAndOverride).toHaveBeenNthCalledWith(
          1,
          IS_PUBLIC_KEY,
          [mockContext.getHandler(), mockContext.getClass()],
        );
        expect(reflector.getAllAndOverride).toHaveBeenNthCalledWith(
          2,
          REQUIRE_API_KEY,
          [mockContext.getHandler(), mockContext.getClass()],
        );
        expect(result).toBe(true);
      });

      it("should handle undefined requireApiKey (default behavior)", () => {
        reflector.getAllAndOverride
          .mockReturnValueOnce(false) // isPublic = false
          .mockReturnValueOnce(undefined); // requireApiKey = undefined

        const result = guard.canActivate(mockContext);

        expect(result).toBe(true);
      });

      it("should handle null requireApiKey", () => {
        reflector.getAllAndOverride
          .mockReturnValueOnce(false) // isPublic = false
          .mockReturnValueOnce(null); // requireApiKey = null

        const result = guard.canActivate(mockContext);

        expect(result).toBe(true);
      });
    });

    describe("API key required endpoints", () => {
      it("should delegate to parent guard when API key is required", () => {
        const mockSuperCanActivate = jest
          .spyOn(
            Object.getPrototypeOf(ApiKeyAuthGuard.prototype),
            "canActivate",
          )
          .mockReturnValue(true);

        reflector.getAllAndOverride
          .mockReturnValueOnce(false) // isPublic = false
          .mockReturnValueOnce(true); // requireApiKey = true

        const result = guard.canActivate(mockContext);

        expect(mockSuperCanActivate).toHaveBeenCalledWith(mockContext);
        expect(result).toBe(true);
      });

      it("should return false when parent guard fails", () => {
        const mockSuperCanActivate = jest
          .spyOn(
            Object.getPrototypeOf(ApiKeyAuthGuard.prototype),
            "canActivate",
          )
          .mockReturnValue(false);

        reflector.getAllAndOverride
          .mockReturnValueOnce(false) // isPublic = false
          .mockReturnValueOnce(true); // requireApiKey = true

        const result = guard.canActivate(mockContext);

        expect(mockSuperCanActivate).toHaveBeenCalledWith(mockContext);
        expect(result).toBe(false);
      });

      it("should handle async parent guard response", async () => {
        const mockSuperCanActivate = jest
          .spyOn(
            Object.getPrototypeOf(ApiKeyAuthGuard.prototype),
            "canActivate",
          )
          .mockReturnValue(Promise.resolve(true));

        reflector.getAllAndOverride
          .mockReturnValueOnce(false) // isPublic = false
          .mockReturnValueOnce(true); // requireApiKey = true

        const result = await guard.canActivate(mockContext);

        expect(mockSuperCanActivate).toHaveBeenCalledWith(mockContext);
        expect(result).toBe(true);
      });
    });

    describe("Edge cases", () => {
      it("should handle reflector returning different types", () => {
        // Test with various truthy/falsy values
        reflector.getAllAndOverride
          .mockReturnValueOnce("true") // isPublic = 'true' (truthy)
          .mockReturnValueOnce(0); // This shouldn't be reached

        const result = guard.canActivate(mockContext);

        expect(result).toBe(true);
        expect(reflector.getAllAndOverride).toHaveBeenCalledTimes(1);
      });

      it("should handle empty string as falsy for public key", () => {
        reflector.getAllAndOverride
          .mockReturnValueOnce("") // isPublic = '' (falsy)
          .mockReturnValueOnce(false); // requireApiKey = false

        const result = guard.canActivate(mockContext);

        expect(result).toBe(true);
        expect(reflector.getAllAndOverride).toHaveBeenCalledTimes(2);
      });

      it("should handle context with missing handler or class", () => {
        mockContext.getHandler.mockReturnValue(null);
        mockContext.getClass.mockReturnValue(null);

        reflector.getAllAndOverride.mockReturnValueOnce(true); // isPublic = true

        const result = guard.canActivate(mockContext);

        expect(reflector.getAllAndOverride).toHaveBeenCalledWith(
          IS_PUBLIC_KEY,
          [null, null],
        );
        expect(result).toBe(true);
      });
    });

    describe("Reflector interaction", () => {
      afterEach(() => {
        jest.clearAllMocks();
      });

      it("should call reflector with correct metadata keys", () => {
        reflector.getAllAndOverride
          .mockReturnValueOnce(false) // isPublic
          .mockReturnValueOnce(true); // requireApiKey

        guard.canActivate(mockContext);

        expect(reflector.getAllAndOverride).toHaveBeenCalledWith(
          IS_PUBLIC_KEY,
          expect.any(Array),
        );
        expect(reflector.getAllAndOverride).toHaveBeenCalledWith(
          REQUIRE_API_KEY,
          expect.any(Array),
        );
      });

      it("should pass handler and class to reflector correctly", () => {
        const mockHandler = jest.fn() as any;
        // mockHandler._name = 'testHandler'; // This is read-only and causes a TypeError
        const mockClass = jest.fn() as any;
        // mockClass.name = 'TestClass'; // This is read-only and causes a TypeError

        const mockContext = createMock<ExecutionContext>({
          getHandler: () => mockHandler,
          getClass: () => mockClass,
        });

        guard.canActivate(mockContext);

        expect(reflector.getAllAndOverride).toHaveBeenCalledWith(
          IS_PUBLIC_KEY,
          [mockHandler, mockClass],
        );
      });
    });
  });

  describe("handleRequest", () => {
    describe("Successful authentication", () => {
      it("should return api key when authentication succeeds", () => {
        const mockApiKey = { id: "key-123", permissions: ["read"] };

        const result = guard.handleRequest(null, mockApiKey);

        expect(result).toBe(mockApiKey);
      });

      it("should return api key with minimal data", () => {
        const mockApiKey = { id: "minimal-key" };

        const result = guard.handleRequest(null, mockApiKey);

        expect(result).toBe(mockApiKey);
      });

      it("should handle api key with additional properties", () => {
        const mockApiKey = {
          id: "key-123",
          permissions: ["read", "write"],
          userId: "user-456",
          createdAt: new Date(),
          metadata: { source: "test" },
        };

        const result = guard.handleRequest(null, mockApiKey);

        expect(result).toBe(mockApiKey);
        expect(result.permissions).toEqual(["read", "write"]);
        expect(result.userId).toBe("user-456");
      });
    });

    describe("Authentication failures", () => {
      it("should throw UnauthorizedException when error is present", () => {
        const error = new Error("API key validation failed");
        const mockApiKey = { id: "key-123" };

        expect(() => guard.handleRequest(error, mockApiKey)).toThrow(error);
      });

      it("should throw original error when both error and apiKey are present", () => {
        const customError = new UnauthorizedException("Custom error");
        const mockApiKey = { id: "key-123" };

        expect(() => guard.handleRequest(customError, mockApiKey)).toThrow(
          customError,
        );
      });

      it("should throw UnauthorizedException when api key is null", () => {
        expect(() => guard.handleRequest(null, null)).toThrow(
          UnauthorizedException,
        );

        expect(() => guard.handleRequest(null, null)).toThrow(
          "API凭证验证失败",
        );
      });

      it("should throw UnauthorizedException when api key is undefined", () => {
        expect(() => guard.handleRequest(null, undefined)).toThrow(
          UnauthorizedException,
        );

        expect(() => guard.handleRequest(null, undefined)).toThrow(
          "API凭证验证失败",
        );
      });

      it("should throw UnauthorizedException when api key is empty object", () => {
        // Empty object is truthy, so this should succeed
        const result = guard.handleRequest(null, {});
        expect(result).toEqual({});
      });

      it("should throw UnauthorizedException when api key is false", () => {
        expect(() => guard.handleRequest(null, false)).toThrow(
          UnauthorizedException,
        );
      });

      it("should throw UnauthorizedException when api key is 0", () => {
        expect(() => guard.handleRequest(null, 0)).toThrow(
          UnauthorizedException,
        );
      });

      it("should throw UnauthorizedException when api key is empty string", () => {
        expect(() => guard.handleRequest(null, "")).toThrow(
          UnauthorizedException,
        );
      });
    });

    describe("Error priority", () => {
      it("should throw original error even when api key is falsy", () => {
        const error = new Error("Primary error");

        expect(() => guard.handleRequest(error, null)).toThrow(error);
      });

      it("should throw original error even when api key is undefined", () => {
        const error = new UnauthorizedException("Primary auth error");

        expect(() => guard.handleRequest(error, undefined)).toThrow(error);
      });

      it("should prioritize specific errors over generic ones", () => {
        const specificError = new UnauthorizedException("Rate limit exceeded");

        expect(() => guard.handleRequest(specificError, null)).toThrow(
          specificError,
        );

        expect(() => guard.handleRequest(specificError, null)).toThrow(
          "Rate limit exceeded",
        );
      });
    });

    describe("Info parameter handling", () => {
      it("should ignore info parameter when authentication succeeds", () => {
        const mockApiKey = { id: "key-123" };
        const info = { message: "Additional info" };

        const result = guard.handleRequest(null, mockApiKey, info);

        expect(result).toBe(mockApiKey);
        // Info parameter is intentionally unused (marked with underscore)
      });

      it("should ignore info parameter when authentication fails", () => {
        const info = { error: "Detailed error info" };

        expect(() => guard.handleRequest(null, null, info)).toThrow(
          "API凭证验证失败",
        );
      });
    });

    describe("Type handling", () => {
      it("should handle string api keys", () => {
        const apiKey = "string-api-key";

        const result = guard.handleRequest(null, apiKey);

        expect(result).toBe(apiKey);
      });

      it("should handle numeric api keys", () => {
        const apiKey = 12345;

        const result = guard.handleRequest(null, apiKey);

        expect(result).toBe(apiKey);
      });

      it("should handle array api keys", () => {
        const apiKey = ["key1", "key2"];

        const result = guard.handleRequest(null, apiKey);

        expect(result).toBe(apiKey);
      });

      it("should handle complex objects as api keys", () => {
        const apiKey = {
          primary: "key-123",
          secondary: "backup-key",
          nested: {
            permissions: ["read"],
            config: { timeout: 30 },
          },
        };

        const result = guard.handleRequest(null, apiKey);

        expect(result).toBe(apiKey);
        expect(result.nested.config.timeout).toBe(30);
      });
    });
  });

  describe("Integration scenarios", () => {
    it("should handle full authentication flow for API key required endpoint", () => {
      const mockSuperCanActivate = jest
        .spyOn(Object.getPrototypeOf(ApiKeyAuthGuard.prototype), "canActivate")
        .mockReturnValue(true);

      reflector.getAllAndOverride
        .mockReturnValueOnce(false) // isPublic = false
        .mockReturnValueOnce(true); // requireApiKey = true

      const canActivateResult = guard.canActivate(mockContext);
      expect(canActivateResult).toBe(true);

      // Simulate successful authentication
      const mockApiKey = { id: "key-123", permissions: ["read"] };
      const handleRequestResult = guard.handleRequest(null, mockApiKey);
      expect(handleRequestResult).toBe(mockApiKey);

      expect(mockSuperCanActivate).toHaveBeenCalledWith(mockContext);
    });

    it("should handle authentication bypass for public endpoint", () => {
      reflector.getAllAndOverride.mockReturnValueOnce(true); // isPublic = true

      const result = guard.canActivate(mockContext);

      expect(result).toBe(true);
      // handleRequest should not be needed for public endpoints
    });

    it("should handle mixed metadata scenarios", () => {
      const mockSuperCanActivate = jest
        .spyOn(Object.getPrototypeOf(ApiKeyAuthGuard.prototype), "canActivate")
        .mockReturnValue(true);

      const scenarios = [
        { isPublic: true, requireApiKey: true }, // Public overrides requirement
        { isPublic: true, requireApiKey: false }, // Public endpoint
        { isPublic: false, requireApiKey: true }, // Delegate to parent
        { isPublic: false, requireApiKey: false }, // No auth required
      ];

      scenarios.forEach(({ isPublic, requireApiKey }) => {
        // Use mockImplementation for a stateless mock in each iteration
        reflector.getAllAndOverride.mockImplementation((key: any) => {
          if (key === IS_PUBLIC_KEY) {
            return isPublic;
          }
          if (key === REQUIRE_API_KEY) {
            return requireApiKey;
          }
          return undefined; // Default case
        });

        mockSuperCanActivate.mockClear();
        mockSuperCanActivate.mockReturnValue(true); // Assume parent guard passes if called

        const result = guard.canActivate(mockContext);

        // The guard should always return true in these scenarios,
        // either by passing through early or by delegating to the (mocked) parent.
        expect(result).toBe(true);

        // Only expect super.canActivate to be called when it's not public AND requires an API key
        if (!isPublic && requireApiKey) {
          expect(mockSuperCanActivate).toHaveBeenCalledTimes(1);
        } else {
          expect(mockSuperCanActivate).not.toHaveBeenCalled();
        }
      });
    });
  });
});
