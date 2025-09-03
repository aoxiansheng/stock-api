import { HttpHeadersUtil } from "../../../../../src/common/utils/http-headers.util";

describe("HttpHeadersUtil", () => {
  describe("getHeader", () => {
    it("应该使用req.get()方法获取header", () => {
      const mockRequest = {
        get: jest.fn().mockReturnValue("header-value"),
        headers: {},
      } as any;

      const result = HttpHeadersUtil.getHeader(mockRequest, "test-header");

      expect(mockRequest.get).toHaveBeenCalledWith("test-header");
      expect(result).toBe("header-value");
    });

    it("应该在req.get()返回空值时返回undefined", () => {
      const mockRequest = {
        get: jest.fn().mockReturnValue(null),
        headers: {},
      } as any;

      const result = HttpHeadersUtil.getHeader(mockRequest, "test-header");

      expect(result).toBeUndefined();
    });

    it("应该在req.get()返回非字符串时返回undefined", () => {
      const mockRequest = {
        get: jest.fn().mockReturnValue(["array-value"]),
        headers: {},
      } as any;

      const result = HttpHeadersUtil.getHeader(mockRequest, "test-header");

      expect(result).toBeUndefined();
    });

    it("应该回退到直接访问headers", () => {
      const mockRequest = {
        headers: {
          "test-header": "header-value",
        },
      } as any;

      const result = HttpHeadersUtil.getHeader(mockRequest, "test-header");

      expect(result).toBe("header-value");
    });

    it("应该处理大小写不敏感的header查找", () => {
      const mockRequest = {
        headers: {
          "Test-Header": "header-value",
        },
      } as any;

      const result = HttpHeadersUtil.getHeader(mockRequest, "test-header");

      expect(result).toBe("header-value");
    });

    it("应该在headers不存在时返回undefined", () => {
      const mockRequest = {} as any;

      const result = HttpHeadersUtil.getHeader(mockRequest, "test-header");

      expect(result).toBeUndefined();
    });

    it("应该处理数组形式的header值", () => {
      const mockRequest = {
        headers: {
          "test-header": ["first-value", "second-value"],
        },
      } as any;

      const result = HttpHeadersUtil.getHeader(mockRequest, "test-header");

      expect(result).toBe("first-value");
    });

    it("应该过滤数组中的空值", () => {
      const mockRequest = {
        headers: {
          "test-header": ["", "valid-value"],
        },
      } as any;

      const result = HttpHeadersUtil.getHeader(mockRequest, "test-header");

      expect(result).toBe("valid-value");
    });

    it("应该在数组中没有有效值时返回undefined", () => {
      const mockRequest = {
        headers: {
          "test-header": ["", ""],
        },
      } as any;

      const result = HttpHeadersUtil.getHeader(mockRequest, "test-header");

      expect(result).toBeUndefined();
    });

    it("应该处理空字符串值", () => {
      const mockRequest = {
        headers: {
          "test-header": "",
        },
      } as any;

      const result = HttpHeadersUtil.getHeader(mockRequest, "test-header");

      expect(result).toBeUndefined();
    });
  });

  describe("getRequiredHeader", () => {
    it("应该返回存在的必需header", () => {
      const mockRequest = {
        get: jest.fn().mockReturnValue("required-value"),
        headers: {},
      } as any;

      const result = HttpHeadersUtil.getRequiredHeader(
        mockRequest,
        "required-header",
      );

      expect(result).toBe("required-value");
    });

    it("应该在header不存在时抛出错误", () => {
      const mockRequest = {
        get: jest.fn().mockReturnValue(undefined),
        headers: {},
      } as any;

      expect(() =>
        HttpHeadersUtil.getRequiredHeader(mockRequest, "missing-header"),
      ).toThrow("Missing required header: missing-header");
    });

    it("应该使用自定义错误消息", () => {
      const mockRequest = {
        get: jest.fn().mockReturnValue(undefined),
        headers: {},
      } as any;

      expect(() =>
        HttpHeadersUtil.getRequiredHeader(
          mockRequest,
          "missing-header",
          "自定义错误",
        ),
      ).toThrow("自定义错误");
    });

    it("应该在header值为空字符串时抛出错误", () => {
      const mockRequest = {
        get: jest.fn().mockReturnValue(""),
        headers: {},
      } as any;

      expect(() =>
        HttpHeadersUtil.getRequiredHeader(mockRequest, "empty-header"),
      ).toThrow("Missing required header: empty-header");
    });
  });

  describe("getMultipleHeaders", () => {
    it("应该返回数组形式的header值", () => {
      const mockRequest = {
        headers: {
          "test-header": ["value1", "value2"],
        },
      } as any;

      const result = HttpHeadersUtil.getMultipleHeaders(
        mockRequest,
        "test-header",
      );

      expect(result).toEqual(["value1", "value2"]);
    });

    it("应该将单个字符串转换为数组", () => {
      const mockRequest = {
        headers: {
          "test-header": "single-value",
        },
      } as any;

      const result = HttpHeadersUtil.getMultipleHeaders(
        mockRequest,
        "test-header",
      );

      expect(result).toEqual(["single-value"]);
    });

    it("应该过滤空值", () => {
      const mockRequest = {
        headers: {
          "test-header": ["value1", "", "value2", "   "],
        },
      } as any;

      const result = HttpHeadersUtil.getMultipleHeaders(
        mockRequest,
        "test-header",
      );

      expect(result).toEqual(["value1", "value2"]);
    });

    it("应该在header不存在时返回空数组", () => {
      const mockRequest = {
        headers: {},
      } as any;

      const result = HttpHeadersUtil.getMultipleHeaders(
        mockRequest,
        "missing-header",
      );

      expect(result).toEqual([]);
    });
  });

  describe("getClientIP", () => {
    it("应该从x-forwarded-for获取IP", () => {
      const mockRequest = {
        get: jest.fn((header) => {
          if (header === "x-forwarded-for") return "192.168.1.1";
          return undefined;
        }),
        headers: {},
      } as any;

      const result = HttpHeadersUtil.getClientIP(mockRequest);

      expect(result).toBe("192.168.1.1");
    });

    it("应该处理包含多个IP的x-forwarded-for", () => {
      const mockRequest = {
        get: jest.fn((header) => {
          if (header === "x-forwarded-for")
            return "192.168.1.1, 10.0.0.1, 172.16.0.1";
          return undefined;
        }),
        headers: {},
      } as any;

      const result = HttpHeadersUtil.getClientIP(mockRequest);

      expect(result).toBe("192.168.1.1");
    });

    it("应该回退到连接信息", () => {
      const mockRequest = {
        get: jest.fn().mockReturnValue(undefined),
        headers: {},
        connection: { remoteAddress: "10.0.0.1" },
      } as any;

      const result = HttpHeadersUtil.getClientIP(mockRequest);

      expect(result).toBe("10.0.0.1");
    });

    it("应该回退到socket信息", () => {
      const mockRequest = {
        get: jest.fn().mockReturnValue(undefined),
        headers: {},
        socket: { remoteAddress: "172.16.0.1" },
      } as any;

      const result = HttpHeadersUtil.getClientIP(mockRequest);

      expect(result).toBe("172.16.0.1");
    });

    it("应该回退到req.ip", () => {
      const mockRequest = {
        get: jest.fn().mockReturnValue(undefined),
        headers: {},
        ip: "127.0.0.1",
      } as any;

      const result = HttpHeadersUtil.getClientIP(mockRequest);

      expect(result).toBe("127.0.0.1");
    });

    it("应该返回unknown作为最后的回退", () => {
      const mockRequest = {
        get: jest.fn().mockReturnValue(undefined),
        headers: {},
      } as any;

      const result = HttpHeadersUtil.getClientIP(mockRequest);

      expect(result).toBe("unknown");
    });

    it("应该验证IP地址格式", () => {
      const mockRequest = {
        get: jest.fn((header) => {
          if (header === "x-forwarded-for") return "invalid-ip";
          if (header === "x-real-ip") return "192.168.1.1";
          return undefined;
        }),
        headers: {},
      } as any;

      const result = HttpHeadersUtil.getClientIP(mockRequest);

      expect(result).toBe("192.168.1.1");
    });
  });

  describe("getSecureClientIdentifier", () => {
    const originalEnv = process.env;

    beforeEach(() => {
      jest.resetModules();
      process.env = { ...originalEnv };
    });

    afterAll(() => {
      process.env = originalEnv;
    });

    it("应该使用真实IP在非可信环境中", () => {
      process.env.NODEENV = "development";
      process.env.TRUSTEDPROXY = "false";

      const mockRequest = {
        get: jest.fn((header) => {
          if (header === "x-forwarded-for") return "192.168.1.1";
          if (header === "user-agent") return "test-agent";
          return undefined;
        }),
        headers: {},
        connection: { remoteAddress: "10.0.0.1" },
      } as any;

      const result = HttpHeadersUtil.getSecureClientIdentifier(mockRequest);

      expect(result).toContain("10.0.0.1");
    });

    it("应该在生产环境且可信代理时使用代理IP", () => {
      process.env.NODE_ENV = "production";
      process.env.TRUSTED_PROXY = "true";
      process.env.TRUSTED_PROXYIPS = "10.0.0";

      const mockRequest = {
        get: jest.fn((header) => {
          if (header === "x-forwarded-for") return "192.168.1.1";
          if (header === "user-agent") return "test-agent";
          return undefined;
        }),
        headers: {},
        connection: { remoteAddress: "10.0.0.1" },
      } as any;

      const result = HttpHeadersUtil.getSecureClientIdentifier(mockRequest);

      expect(result).toContain("192.168.1.1");
    });

    it("应该在测试环境且允许代理时使用代理IP", () => {
      process.env.NODE_ENV = "test-unit";
      process.env.ALLOW_PROXY_HEADERS_INTEST = "true";
      process.env.TRUSTED_PROXY_IPS = "10.0.0";

      const mockRequest = {
        get: jest.fn((header) => {
          if (header === "x-forwarded-for") return "192.168.1.1";
          if (header === "user-agent") return "test-agent";
          return undefined;
        }),
        headers: {},
        connection: { remoteAddress: "10.0.0.1" },
      } as any;

      const result = HttpHeadersUtil.getSecureClientIdentifier(mockRequest);

      expect(result).toContain("192.168.1.1");
    });

    it("应该包含用户代理哈希", () => {
      const mockRequest = {
        get: jest.fn((header) => {
          if (header === "user-agent") return "Mozilla/5.0";
          return undefined;
        }),
        headers: {},
        connection: { remoteAddress: "10.0.0.1" },
      } as any;

      const result = HttpHeadersUtil.getSecureClientIdentifier(mockRequest);

      expect(result).toMatch(/10\.0\.0\.1:[a-z0-9]+/);
    });
  });

  describe("getApiCredentials", () => {
    it("应该返回API凭证", () => {
      const mockRequest = {
        get: jest.fn((header) => {
          if (header === "x-app-key") return "test-app-key";
          if (header === "x-access-token") return "test-token";
          return undefined;
        }),
        headers: {},
      } as any;

      const result = HttpHeadersUtil.getApiCredentials(mockRequest);

      expect(result).toEqual({
        appKey: "test-app-key",
        accessToken: "test-token",
      });
    });

    it("应该处理缺失的凭证", () => {
      const mockRequest = {
        get: jest.fn().mockReturnValue(undefined),
        headers: {},
      } as any;

      const result = HttpHeadersUtil.getApiCredentials(mockRequest);

      expect(result).toEqual({
        appKey: undefined,
        accessToken: undefined,
      });
    });
  });

  describe("validateApiCredentials", () => {
    it("应该成功验证有效的API凭证", () => {
      const mockRequest = {
        get: jest.fn((header) => {
          if (header === "x-app-key") return "valid-app-key";
          if (header === "x-access-token") return "valid-access-token";
          return undefined;
        }),
        headers: {},
      } as any;

      const result = HttpHeadersUtil.validateApiCredentials(mockRequest);

      expect(result).toEqual({
        appKey: "valid-app-key",
        accessToken: "valid-access-token",
      });
    });

    it("应该在缺少API凭证时抛出错误", () => {
      const mockRequest = {
        get: jest.fn((header) => {
          if (header === "x-access-token") return "valid-access-token";
          return undefined;
        }),
        headers: {},
      } as any;

      expect(() => HttpHeadersUtil.validateApiCredentials(mockRequest)).toThrow(
        "缺少API凭证",
      );
    });

    it("应该拒绝包含空格的API凭证", () => {
      const mockRequest = {
        get: jest.fn((header) => {
          if (header === "x-app-key") return "invalid app key";
          if (header === "x-access-token") return "valid-access-token";
          return undefined;
        }),
        headers: {},
      } as any;

      expect(() => HttpHeadersUtil.validateApiCredentials(mockRequest)).toThrow(
        "API凭证格式无效：App Key包含空格或无效字符",
      );
    });

    it("应该拒绝包含制表符的API凭证", () => {
      const mockRequest = {
        get: jest.fn((header) => {
          if (header === "x-app-key") return "valid-app-key";
          if (header === "x-access-token") return "invalid\taccess\ttoken";
          return undefined;
        }),
        headers: {},
      } as any;

      expect(() => HttpHeadersUtil.validateApiCredentials(mockRequest)).toThrow(
        "API凭证格式无效：Access Token包含空格或无效字符",
      );
    });

    it("应该拒绝包含换行符的API凭证", () => {
      const mockRequest = {
        get: jest.fn((header) => {
          if (header === "x-app-key") return "invalid\napp\nkey";
          if (header === "x-access-token") return "valid-access-token";
          return undefined;
        }),
        headers: {},
      } as any;

      expect(() => HttpHeadersUtil.validateApiCredentials(mockRequest)).toThrow(
        "API凭证格式无效：App Key包含空格或无效字符",
      );
    });
  });

  describe("getUserAgent", () => {
    it("应该返回用户代理", () => {
      const mockRequest = {
        get: jest.fn((header) => {
          if (header === "user-agent") return "Mozilla/5.0";
          return undefined;
        }),
        headers: {},
      } as any;

      const result = HttpHeadersUtil.getUserAgent(mockRequest);

      expect(result).toBe("Mozilla/5.0");
    });

    it("应该返回默认值当用户代理缺失时", () => {
      const mockRequest = {
        get: jest.fn().mockReturnValue(undefined),
        headers: {},
      } as any;

      const result = HttpHeadersUtil.getUserAgent(mockRequest);

      expect(result).toBe("Unknown");
    });
  });

  describe("getContentType", () => {
    it("应该返回内容类型", () => {
      const mockRequest = {
        get: jest.fn((header) => {
          if (header === "content-type") return "application/json";
          return undefined;
        }),
        headers: {},
      } as any;

      const result = HttpHeadersUtil.getContentType(mockRequest);

      expect(result).toBe("application/json");
    });
  });

  describe("isJsonContent", () => {
    it("应该识别JSON内容类型", () => {
      const mockRequest = {
        get: jest.fn((header) => {
          if (header === "content-type") return "application/json";
          return undefined;
        }),
        headers: {},
      } as any;

      const result = HttpHeadersUtil.isJsonContent(mockRequest);

      expect(result).toBe(true);
    });

    it("应该识别带字符集的JSON内容类型", () => {
      const mockRequest = {
        get: jest.fn((header) => {
          if (header === "content-type")
            return "application/json; charset=utf-8";
          return undefined;
        }),
        headers: {},
      } as any;

      const result = HttpHeadersUtil.isJsonContent(mockRequest);

      expect(result).toBe(true);
    });

    it("应该拒绝非JSON内容类型", () => {
      const mockRequest = {
        get: jest.fn((header) => {
          if (header === "content-type") return "text/html";
          return undefined;
        }),
        headers: {},
      } as any;

      const result = HttpHeadersUtil.isJsonContent(mockRequest);

      expect(result).toBe(false);
    });
  });

  describe("getAuthorization", () => {
    it("应该返回授权header", () => {
      const mockRequest = {
        get: jest.fn((header) => {
          if (header === "authorization") return "Bearer token123";
          return undefined;
        }),
        headers: {},
      } as any;

      const result = HttpHeadersUtil.getAuthorization(mockRequest);

      expect(result).toBe("Bearer token123");
    });
  });

  describe("getBearerToken", () => {
    it("应该提取Bearer token", () => {
      const mockRequest = {
        get: jest.fn((header) => {
          if (header === "authorization") return "Bearer token123";
          return undefined;
        }),
        headers: {},
      } as any;

      const result = HttpHeadersUtil.getBearerToken(mockRequest);

      expect(result).toBe("token123");
    });

    it("应该处理带空格的Bearer token", () => {
      const mockRequest = {
        get: jest.fn((header) => {
          if (header === "authorization") return "Bearer  token123  ";
          return undefined;
        }),
        headers: {},
      } as any;

      const result = HttpHeadersUtil.getBearerToken(mockRequest);

      expect(result).toBe("token123");
    });

    it("应该在非Bearer授权时返回undefined", () => {
      const mockRequest = {
        get: jest.fn((header) => {
          if (header === "authorization") return "Basic dGVzdA==";
          return undefined;
        }),
        headers: {},
      } as any;

      const result = HttpHeadersUtil.getBearerToken(mockRequest);

      expect(result).toBeUndefined();
    });
  });

  describe("getSafeHeaders", () => {
    it("应该过滤敏感headers", () => {
      const mockRequest = {
        headers: {
          authorization: "Bearer secret",
          "x-access-token": "secret-token",
          "x-api-key": "secret-key",
          cookie: "_session=secret",
          "user-agent": "Mozilla/5.0",
          "content-type": "application/json",
        },
      } as any;

      const result = HttpHeadersUtil.getSafeHeaders(mockRequest);

      expect(result).toEqual({
        authorization: "[FILTERED]",
        "x-access-token": "[FILTERED]",
        "x-api-key": "[FILTERED]",
        cookie: "[FILTERED]",
        "user-agent": "Mozilla/5.0",
        "content-type": "application/json",
      });
    });

    it("应该处理大小写不同的敏感headers", () => {
      const mockRequest = {
        headers: {
          Authorization: "Bearer secret",
          "X-Access-Token": "secret-token",
          "Content-Type": "application/json",
        },
      } as any;

      const result = HttpHeadersUtil.getSafeHeaders(mockRequest);

      expect(result["Authorization"]).toBe("[FILTERED]");
      expect(result["X-Access-Token"]).toBe("[FILTERED]");
      expect(result["Content-Type"]).toBe("application/json");
    });
  });
});
