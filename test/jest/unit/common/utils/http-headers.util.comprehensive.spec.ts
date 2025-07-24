import { Request } from "express";
import { HttpHeadersUtil } from "../../../../../src/common/utils/http-headers.util";

describe("HttpHeadersUtil - Comprehensive Coverage", () => {
  let mockRequest: Partial<Request>;

  beforeEach(() => {
    mockRequest = {
      headers: {},
      get: jest.fn(),
      connection: undefined,
      socket: undefined,
    };
  });

  describe("getHeader", () => {
    it("should use req.get() when available", () => {
      const mockGet = jest.fn().mockReturnValue("test-value");
      mockRequest.get = mockGet;

      const result = HttpHeadersUtil.getHeader(
        mockRequest as Request,
        "Content-Type",
      );

      expect(mockGet).toHaveBeenCalledWith("Content-Type");
      expect(result).toBe("test-value");
    });

    it("should return undefined when req.get() returns empty string", () => {
      mockRequest.get = jest.fn().mockReturnValue("");

      const result = HttpHeadersUtil.getHeader(
        mockRequest as Request,
        "Content-Type",
      );

      expect(result).toBeUndefined();
    });

    it("should return undefined when req.get() returns non-string", () => {
      mockRequest.get = jest.fn().mockReturnValue(["array-value"]);

      const result = HttpHeadersUtil.getHeader(
        mockRequest as Request,
        "Content-Type",
      );

      expect(result).toBeUndefined();
    });

    it("should fallback to direct header access when req.get() is not available", () => {
      mockRequest.get = undefined;
      mockRequest.headers = {
        "content-type": "application/json",
        "x-custom-header": "custom-value",
      };

      const result = HttpHeadersUtil.getHeader(
        mockRequest as Request,
        "content-type",
      );

      expect(result).toBe("application/json");
    });

    it("should handle case-insensitive header lookup", () => {
      mockRequest.get = undefined;
      mockRequest.headers = {
        "Content-Type": "application/json",
        "X-Custom-Header": "custom-value",
      };

      const result1 = HttpHeadersUtil.getHeader(
        mockRequest as Request,
        "content-type",
      );
      const result2 = HttpHeadersUtil.getHeader(
        mockRequest as Request,
        "x-custom-header",
      );

      expect(result1).toBe("application/json");
      expect(result2).toBe("custom-value");
    });

    it("should return undefined when headers object is missing", () => {
      mockRequest.get = undefined;
      mockRequest.headers = undefined;

      const result = HttpHeadersUtil.getHeader(
        mockRequest as Request,
        "content-type",
      );

      expect(result).toBeUndefined();
    });

    it("should handle array header values by returning first non-empty value", () => {
      mockRequest.get = undefined;
      mockRequest.headers = {
        accept: ["", "application/json", "text/html"],
      } as any;

      const result = HttpHeadersUtil.getHeader(
        mockRequest as Request,
        "accept",
      );

      expect(result).toBe("application/json");
    });

    it("should return undefined for empty array header values", () => {
      mockRequest.get = undefined;
      mockRequest.headers = {
        accept: ["", "", ""],
      } as any;

      const result = HttpHeadersUtil.getHeader(
        mockRequest as Request,
        "accept",
      );

      expect(result).toBeUndefined();
    });

    it("should return undefined for empty string header values", () => {
      mockRequest.get = undefined;
      mockRequest.headers = {
        "content-type": "",
      };

      const result = HttpHeadersUtil.getHeader(
        mockRequest as Request,
        "content-type",
      );

      expect(result).toBeUndefined();
    });

    it("should preserve whitespace in header values", () => {
      mockRequest.get = undefined;
      mockRequest.headers = {
        authorization: "  Bearer token123  ",
      };

      const result = HttpHeadersUtil.getHeader(
        mockRequest as Request,
        "authorization",
      );

      expect(result).toBe("  Bearer token123  ");
    });
  });

  describe("getRequiredHeader", () => {
    it("should return header value when present", () => {
      mockRequest.get = jest.fn().mockReturnValue("required-value");

      const result = HttpHeadersUtil.getRequiredHeader(
        mockRequest as Request,
        "X-Required",
      );

      expect(result).toBe("required-value");
    });

    it("should throw default error when header is missing", () => {
      mockRequest.get = jest.fn().mockReturnValue(undefined);

      expect(() => {
        HttpHeadersUtil.getRequiredHeader(mockRequest as Request, "X-Required");
      }).toThrow("Missing required header: X-Required");
    });

    it("should throw custom error when header is missing", () => {
      mockRequest.get = jest.fn().mockReturnValue(undefined);

      expect(() => {
        HttpHeadersUtil.getRequiredHeader(
          mockRequest as Request,
          "X-Required",
          "Custom error message",
        );
      }).toThrow("Custom error message");
    });

    it("should throw error when header value is empty string", () => {
      mockRequest.get = jest.fn().mockReturnValue("");

      expect(() => {
        HttpHeadersUtil.getRequiredHeader(mockRequest as Request, "X-Required");
      }).toThrow("Missing required header: X-Required");
    });
  });

  describe("getMultipleHeaders", () => {
    it("should return array for array header values", () => {
      mockRequest.headers = {
        accept: ["application/json", "text/html", "  text/plain  "],
      } as any;

      const result = HttpHeadersUtil.getMultipleHeaders(
        mockRequest as Request,
        "Accept",
      );

      expect(result).toEqual([
        "application/json",
        "text/html",
        "  text/plain  ",
      ]);
    });

    it("should return single item array for string header values", () => {
      mockRequest.headers = {
        accept: "  application/json  ",
      };

      const result = HttpHeadersUtil.getMultipleHeaders(
        mockRequest as Request,
        "Accept",
      );

      expect(result).toEqual(["application/json"]);
    });

    it("should return empty array when header is missing", () => {
      mockRequest.headers = {};

      const result = HttpHeadersUtil.getMultipleHeaders(
        mockRequest as Request,
        "Accept",
      );

      expect(result).toEqual([]);
    });

    it("should filter out empty values from array", () => {
      mockRequest.headers = {
        accept: ["application/json", "", "  ", "text/html"],
      } as any;

      const result = HttpHeadersUtil.getMultipleHeaders(
        mockRequest as Request,
        "Accept",
      );

      expect(result).toEqual(["application/json", "text/html"]);
    });

    it("should return empty array for empty string header", () => {
      mockRequest.headers = {
        accept: "",
      };

      const result = HttpHeadersUtil.getMultipleHeaders(
        mockRequest as Request,
        "Accept",
      );

      expect(result).toEqual([]);
    });

    it("should return empty array for whitespace-only string header", () => {
      mockRequest.headers = {
        accept: "   ",
      };

      const result = HttpHeadersUtil.getMultipleHeaders(
        mockRequest as Request,
        "Accept",
      );

      expect(result).toEqual([]);
    });
  });

  describe("getClientIP", () => {
    it("should return IP from x-forwarded-for header", () => {
      mockRequest.get = jest.fn().mockImplementation((header) => {
        if (header === "x-forwarded-for") return "192.168.1.100, 10.0.0.1";
        return undefined;
      });

      const result = HttpHeadersUtil.getClientIP(mockRequest as Request);

      expect(result).toBe("192.168.1.100");
    });

    it("should return IP from x-real-ip header when x-forwarded-for is not available", () => {
      mockRequest.get = jest.fn().mockImplementation((header) => {
        if (header === "x-real-ip") return "192.168.1.200";
        return undefined;
      });

      const result = HttpHeadersUtil.getClientIP(mockRequest as Request);

      expect(result).toBe("192.168.1.200");
    });

    it("should return connection remoteAddress when no proxy headers", () => {
      mockRequest.get = jest.fn().mockReturnValue(undefined);
      mockRequest.connection = { remoteAddress: "127.0.0.1" } as any;

      const result = HttpHeadersUtil.getClientIP(mockRequest as Request);

      expect(result).toBe("127.0.0.1");
    });

    it("should return socket remoteAddress when connection is not available", () => {
      mockRequest.get = jest.fn().mockReturnValue(undefined);
      mockRequest.connection = undefined;
      mockRequest.socket = { remoteAddress: "127.0.0.2" } as any;

      const result = HttpHeadersUtil.getClientIP(mockRequest as Request);

      expect(result).toBe("127.0.0.2");
    });

    it("should return req.ip when other sources are not available", () => {
      mockRequest.get = jest.fn().mockReturnValue(undefined);
      mockRequest.connection = undefined;
      mockRequest.socket = undefined;
      (mockRequest as any).ip = "127.0.0.3";

      const result = HttpHeadersUtil.getClientIP(mockRequest as Request);

      expect(result).toBe("127.0.0.3");
    });

    it('should return "unknown" when no IP source is available', () => {
      mockRequest.get = jest.fn().mockReturnValue(undefined);
      mockRequest.connection = undefined;
      mockRequest.socket = undefined;

      const result = HttpHeadersUtil.getClientIP(mockRequest as Request);

      expect(result).toBe("unknown");
    });

    it("should validate IP addresses and skip invalid ones", () => {
      mockRequest.get = jest.fn().mockImplementation((header) => {
        if (header === "x-forwarded-for") return "invalid-ip";
        if (header === "x-real-ip") return "192.168.1.100";
        return undefined;
      });

      const result = HttpHeadersUtil.getClientIP(mockRequest as Request);

      expect(result).toBe("192.168.1.100");
    });

    it("should handle IPv6 addresses", () => {
      mockRequest.get = jest.fn().mockImplementation((header) => {
        if (header === "x-forwarded-for")
          return "2001:0db8:85a3:0000:0000:8a2e:0370:7334";
        return undefined;
      });

      const result = HttpHeadersUtil.getClientIP(mockRequest as Request);

      expect(result).toBe("2001:0db8:85a3:0000:0000:8a2e:0370:7334");
    });

    it("should handle localhost addresses", () => {
      mockRequest.get = jest.fn().mockImplementation((header) => {
        if (header === "x-forwarded-for") return "localhost";
        return undefined;
      });

      const result = HttpHeadersUtil.getClientIP(mockRequest as Request);

      expect(result).toBe("localhost");
    });
  });

  describe("getSecureClientIdentifier", () => {
    let originalEnv: any;

    beforeEach(() => {
      originalEnv = { ...process.env };
    });

    afterEach(() => {
      process.env = originalEnv;
    });

    it("should use real IP in non-trusted environment", () => {
      process.env.NODE_ENV = "development";
      process.env.TRUSTED_PROXY = "false";

      mockRequest.connection = { remoteAddress: "192.168.1.100" } as any;
      mockRequest.get = jest.fn().mockImplementation((header) => {
        if (header === "user-agent") return "Mozilla/5.0";
        if (header === "x-forwarded-for") return "10.0.0.1";
        return undefined;
      });

      const result = HttpHeadersUtil.getSecureClientIdentifier(
        mockRequest as Request,
      );

      expect(result).toContain("192.168.1.100");
      expect(result).not.toContain("10.0.0.1");
    });

    it("should use forwarded IP in production trusted environment", () => {
      process.env.NODE_ENV = "production";
      process.env.TRUSTED_PROXY = "true";
      process.env.TRUSTED_PROXY_IPS = "192.168.1";

      mockRequest.connection = { remoteAddress: "192.168.1.10" } as any;
      mockRequest.get = jest.fn().mockImplementation((header) => {
        if (header === "user-agent") return "Mozilla/5.0";
        if (header === "x-forwarded-for") return "10.0.0.1";
        return undefined;
      });

      const result = HttpHeadersUtil.getSecureClientIdentifier(
        mockRequest as Request,
      );

      expect(result).toContain("10.0.0.1");
    });

    it("should use forwarded IP in test environment with explicit allowance", () => {
      process.env.NODE_ENV = "test-integration";
      process.env.ALLOW_PROXY_HEADERS_IN_TEST = "true";
      process.env.TRUSTED_PROXY_IPS = "127.0.0";

      mockRequest.connection = { remoteAddress: "127.0.0.1" } as any;
      mockRequest.get = jest.fn().mockImplementation((header) => {
        if (header === "user-agent") return "Mozilla/5.0";
        if (header === "x-forwarded-for") return "203.0.113.1";
        return undefined;
      });

      const result = HttpHeadersUtil.getSecureClientIdentifier(
        mockRequest as Request,
      );

      expect(result).toContain("203.0.113.1");
    });

    it("should not use forwarded IP from untrusted proxy", () => {
      process.env.NODE_ENV = "production";
      process.env.TRUSTED_PROXY = "true";
      process.env.TRUSTED_PROXY_IPS = "192.168.1";

      mockRequest.connection = { remoteAddress: "10.0.0.1" } as any; // Not in trusted range
      mockRequest.get = jest.fn().mockImplementation((header) => {
        if (header === "user-agent") return "Mozilla/5.0";
        if (header === "x-forwarded-for") return "203.0.113.1";
        return undefined;
      });

      const result = HttpHeadersUtil.getSecureClientIdentifier(
        mockRequest as Request,
      );

      expect(result).toContain("10.0.0.1");
      expect(result).not.toContain("203.0.113.1");
    });

    it("should not use invalid forwarded IP", () => {
      process.env.NODE_ENV = "production";
      process.env.TRUSTED_PROXY = "true";
      process.env.TRUSTED_PROXY_IPS = "192.168.1";

      mockRequest.connection = { remoteAddress: "192.168.1.10" } as any;
      mockRequest.get = jest.fn().mockImplementation((header) => {
        if (header === "user-agent") return "Mozilla/5.0";
        if (header === "x-forwarded-for") return "invalid-ip";
        return undefined;
      });

      const result = HttpHeadersUtil.getSecureClientIdentifier(
        mockRequest as Request,
      );

      expect(result).toContain("192.168.1.10");
    });

    it("should handle missing user agent", () => {
      mockRequest.connection = { remoteAddress: "127.0.0.1" } as any;
      mockRequest.get = jest.fn().mockReturnValue(undefined);

      const result = HttpHeadersUtil.getSecureClientIdentifier(
        mockRequest as Request,
      );

      expect(result).toContain("127.0.0.1");
      expect(result).toContain(":"); // Should contain separator
    });

    it("should hash user agent consistently", () => {
      mockRequest.connection = { remoteAddress: "127.0.0.1" } as any;
      mockRequest.get = jest.fn().mockImplementation((header) => {
        if (header === "user-agent") return "Test User Agent";
        return undefined;
      });

      const result1 = HttpHeadersUtil.getSecureClientIdentifier(
        mockRequest as Request,
      );
      const result2 = HttpHeadersUtil.getSecureClientIdentifier(
        mockRequest as Request,
      );

      expect(result1).toBe(result2);
    });

    it("should handle empty trusted proxy IPs", () => {
      process.env.NODE_ENV = "production";
      process.env.TRUSTED_PROXY = "true";
      process.env.TRUSTED_PROXY_IPS = "";

      mockRequest.connection = { remoteAddress: "192.168.1.10" } as any;
      mockRequest.get = jest.fn().mockImplementation((header) => {
        if (header === "user-agent") return "Mozilla/5.0";
        if (header === "x-forwarded-for") return "10.0.0.1";
        return undefined;
      });

      const result = HttpHeadersUtil.getSecureClientIdentifier(
        mockRequest as Request,
      );

      expect(result).toContain("192.168.1.10"); // Should use real IP
    });
  });

  describe("getApiCredentials", () => {
    it("should return API credentials when present", () => {
      mockRequest.get = jest.fn().mockImplementation((header) => {
        if (header === "x-app-key") return "sk-test123";
        if (header === "x-access-token") return "token456";
        return undefined;
      });

      const result = HttpHeadersUtil.getApiCredentials(mockRequest as Request);

      expect(result).toEqual({
        appKey: "sk-test123",
        accessToken: "token456",
      });
    });

    it("should return undefined values when headers are missing", () => {
      mockRequest.get = jest.fn().mockReturnValue(undefined);

      const result = HttpHeadersUtil.getApiCredentials(mockRequest as Request);

      expect(result).toEqual({
        appKey: undefined,
        accessToken: undefined,
      });
    });
  });

  describe("validateApiCredentials", () => {
    it("should return credentials when valid", () => {
      mockRequest.get = jest.fn().mockImplementation((header) => {
        if (header === "x-app-key") return "sk-test123";
        if (header === "x-access-token") return "token456";
        return undefined;
      });

      const result = HttpHeadersUtil.validateApiCredentials(
        mockRequest as Request,
      );

      expect(result).toEqual({
        appKey: "sk-test123",
        accessToken: "token456",
      });
    });

    it("should throw error when app key is missing", () => {
      mockRequest.get = jest.fn().mockImplementation((header) => {
        if (header === "x-access-token") return "token456";
        return undefined;
      });

      expect(() => {
        HttpHeadersUtil.validateApiCredentials(mockRequest as Request);
      }).toThrow("缺少API凭证");
    });

    it("should throw error when access token is missing", () => {
      mockRequest.get = jest.fn().mockImplementation((header) => {
        if (header === "x-app-key") return "sk-test123";
        return undefined;
      });

      expect(() => {
        HttpHeadersUtil.validateApiCredentials(mockRequest as Request);
      }).toThrow("缺少API凭证");
    });

    it("should throw error when app key contains spaces", () => {
      mockRequest.get = jest.fn().mockImplementation((header) => {
        if (header === "x-app-key") return "sk-test 123";
        if (header === "x-access-token") return "token456";
        return undefined;
      });

      expect(() => {
        HttpHeadersUtil.validateApiCredentials(mockRequest as Request);
      }).toThrow("API凭证格式无效：App Key包含空格或无效字符");
    });

    it("should throw error when access token contains tabs", () => {
      mockRequest.get = jest.fn().mockImplementation((header) => {
        if (header === "x-app-key") return "sk-test123";
        if (header === "x-access-token") return "token\t456";
        return undefined;
      });

      expect(() => {
        HttpHeadersUtil.validateApiCredentials(mockRequest as Request);
      }).toThrow("API凭证格式无效：Access Token包含空格或无效字符");
    });

    it("should throw error when credentials contain newlines", () => {
      mockRequest.get = jest.fn().mockImplementation((header) => {
        if (header === "x-app-key") return "sk-test\n123";
        if (header === "x-access-token") return "token456";
        return undefined;
      });

      expect(() => {
        HttpHeadersUtil.validateApiCredentials(mockRequest as Request);
      }).toThrow("API凭证格式无效：App Key包含空格或无效字符");
    });
  });

  describe("getUserAgent", () => {
    it("should return user agent when present", () => {
      mockRequest.get = jest.fn().mockImplementation((header) => {
        if (header === "user-agent")
          return "Mozilla/5.0 (Windows NT 10.0; Win64; x64)";
        return undefined;
      });

      const result = HttpHeadersUtil.getUserAgent(mockRequest as Request);

      expect(result).toBe("Mozilla/5.0 (Windows NT 10.0; Win64; x64)");
    });

    it('should return "Unknown" when user agent is missing', () => {
      mockRequest.get = jest.fn().mockReturnValue(undefined);

      const result = HttpHeadersUtil.getUserAgent(mockRequest as Request);

      expect(result).toBe("Unknown");
    });
  });

  describe("getContentType", () => {
    it("should return content type when present", () => {
      mockRequest.get = jest.fn().mockImplementation((header) => {
        if (header === "content-type") return "application/json; charset=utf-8";
        return undefined;
      });

      const result = HttpHeadersUtil.getContentType(mockRequest as Request);

      expect(result).toBe("application/json; charset=utf-8");
    });

    it("should return undefined when content type is missing", () => {
      mockRequest.get = jest.fn().mockReturnValue(undefined);

      const result = HttpHeadersUtil.getContentType(mockRequest as Request);

      expect(result).toBeUndefined();
    });
  });

  describe("isJsonContent", () => {
    it("should return true for JSON content type", () => {
      mockRequest.get = jest.fn().mockImplementation((header) => {
        if (header === "content-type") return "application/json";
        return undefined;
      });

      const result = HttpHeadersUtil.isJsonContent(mockRequest as Request);

      expect(result).toBe(true);
    });

    it("should return true for JSON content type with charset", () => {
      mockRequest.get = jest.fn().mockImplementation((header) => {
        if (header === "content-type") return "application/json; charset=utf-8";
        return undefined;
      });

      const result = HttpHeadersUtil.isJsonContent(mockRequest as Request);

      expect(result).toBe(true);
    });

    it("should return false for non-JSON content type", () => {
      mockRequest.get = jest.fn().mockImplementation((header) => {
        if (header === "content-type") return "text/html";
        return undefined;
      });

      const result = HttpHeadersUtil.isJsonContent(mockRequest as Request);

      expect(result).toBe(false);
    });

    it("should return false when content type is missing", () => {
      mockRequest.get = jest.fn().mockReturnValue(undefined);

      const result = HttpHeadersUtil.isJsonContent(mockRequest as Request);

      expect(result).toBe(false);
    });
  });

  describe("getAuthorization", () => {
    it("should return authorization header when present", () => {
      mockRequest.get = jest.fn().mockImplementation((header) => {
        if (header === "authorization") return "Bearer token123";
        return undefined;
      });

      const result = HttpHeadersUtil.getAuthorization(mockRequest as Request);

      expect(result).toBe("Bearer token123");
    });

    it("should return undefined when authorization header is missing", () => {
      mockRequest.get = jest.fn().mockReturnValue(undefined);

      const result = HttpHeadersUtil.getAuthorization(mockRequest as Request);

      expect(result).toBeUndefined();
    });
  });

  describe("getBearerToken", () => {
    it("should extract token from Bearer authorization", () => {
      mockRequest.get = jest.fn().mockImplementation((header) => {
        if (header === "authorization") return "Bearer token123";
        return undefined;
      });

      const result = HttpHeadersUtil.getBearerToken(mockRequest as Request);

      expect(result).toBe("token123");
    });

    it("should handle Bearer token with extra spaces", () => {
      mockRequest.get = jest.fn().mockImplementation((header) => {
        if (header === "authorization") return "Bearer   token123   ";
        return undefined;
      });

      const result = HttpHeadersUtil.getBearerToken(mockRequest as Request);

      expect(result).toBe("token123");
    });

    it("should return undefined for non-Bearer authorization", () => {
      mockRequest.get = jest.fn().mockImplementation((header) => {
        if (header === "authorization") return "Basic dXNlcjpwYXNz";
        return undefined;
      });

      const result = HttpHeadersUtil.getBearerToken(mockRequest as Request);

      expect(result).toBeUndefined();
    });

    it("should return undefined when authorization header is missing", () => {
      mockRequest.get = jest.fn().mockReturnValue(undefined);

      const result = HttpHeadersUtil.getBearerToken(mockRequest as Request);

      expect(result).toBeUndefined();
    });
  });

  describe("getSafeHeaders", () => {
    it("should filter sensitive headers", () => {
      mockRequest.headers = {
        "content-type": "application/json",
        authorization: "Bearer secret-token",
        "x-access-token": "secret-access-token",
        "x-api-key": "secret-api-key",
        cookie: "session=secret-session",
        "set-cookie": ["auth=secret-auth"],
        "user-agent": "Mozilla/5.0",
        "x-custom-header": "custom-value",
      };

      const result = HttpHeadersUtil.getSafeHeaders(mockRequest as Request);

      expect(result).toEqual({
        "content-type": "application/json",
        authorization: "[FILTERED]",
        "x-access-token": "[FILTERED]",
        "x-api-key": "[FILTERED]",
        cookie: "[FILTERED]",
        "set-cookie": "[FILTERED]",
        "user-agent": "Mozilla/5.0",
        "x-custom-header": "custom-value",
      });
    });

    it("should handle case-insensitive sensitive headers", () => {
      mockRequest.headers = {
        Authorization: "Bearer secret-token",
        "X-Access-Token": "secret-access-token",
        Cookie: "session=secret-session",
      };

      const result = HttpHeadersUtil.getSafeHeaders(mockRequest as Request);

      expect(result).toEqual({
        Authorization: "[FILTERED]",
        "X-Access-Token": "[FILTERED]",
        Cookie: "[FILTERED]",
      });
    });

    it("should handle empty headers object", () => {
      mockRequest.headers = {};

      const result = HttpHeadersUtil.getSafeHeaders(mockRequest as Request);

      expect(result).toEqual({});
    });
  });

  describe("Private method behavior through public interface", () => {
    it("should handle valid IPv4 addresses in getClientIP", () => {
      mockRequest.get = jest.fn().mockImplementation((header) => {
        if (header === "x-forwarded-for") return "192.168.1.1";
        return undefined;
      });

      const result = HttpHeadersUtil.getClientIP(mockRequest as Request);

      expect(result).toBe("192.168.1.1");
    });

    it("should handle IPv6 loopback address", () => {
      mockRequest.get = jest.fn().mockImplementation((header) => {
        if (header === "x-forwarded-for") return "::1";
        return undefined;
      });

      const result = HttpHeadersUtil.getClientIP(mockRequest as Request);

      expect(result).toBe("::1");
    });

    it("should handle user agent hashing consistency", () => {
      const testUserAgent = "Test User Agent String";
      mockRequest.connection = { remoteAddress: "127.0.0.1" } as any;
      mockRequest.get = jest.fn().mockImplementation((header) => {
        if (header === "user-agent") return testUserAgent;
        return undefined;
      });

      const result1 = HttpHeadersUtil.getSecureClientIdentifier(
        mockRequest as Request,
      );
      const result2 = HttpHeadersUtil.getSecureClientIdentifier(
        mockRequest as Request,
      );

      expect(result1).toBe(result2);
      expect(result1).toContain("127.0.0.1");
    });

    it("should handle different user agents producing different hashes", () => {
      mockRequest.connection = { remoteAddress: "127.0.0.1" } as any;

      mockRequest.get = jest.fn().mockReturnValue("User Agent 1");
      const result1 = HttpHeadersUtil.getSecureClientIdentifier(
        mockRequest as Request,
      );

      mockRequest.get = jest.fn().mockReturnValue("User Agent 2");
      const result2 = HttpHeadersUtil.getSecureClientIdentifier(
        mockRequest as Request,
      );

      expect(result1).not.toBe(result2);
    });
  });
});
