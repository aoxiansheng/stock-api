/* eslint-disable @typescript-eslint/no-unused-vars */

import { Reflector } from "@nestjs/core";
import { Controller, Get, Post } from "@nestjs/common";
import {
  RequireApiKey,
  REQUIRE_API_KEY,
} from "../../../../../src/auth/decorators/require-apikey.decorator";

// 创建测试控制器用于装饰器测试
@Controller("test")
class TestController {
  @RequireApiKey()
  @Post("data")
  dataEndpoint() {
    return "requires api key";
  }

  @Get("public")
  publicEndpoint() {
    return "no api key required";
  }

  @RequireApiKey()
  @Get("protected")
  protectedEndpoint() {
    return "protected with api key";
  }

  @RequireApiKey()
  async asyncMethod(): Promise<string> {
    return "async protected";
  }

  @RequireApiKey()
  methodWithParams(param1: string, param2: number): string {
    return `params: ${param1}, ${param2}`;
  }

  @RequireApiKey()
  methodWithOptionalParams(required: string, optional?: number): string {
    return `required: ${required}, optional: ${optional}`;
  }
}

describe("RequireApiKey Decorator", () => {
  let reflector: Reflector;
  let testController: TestController;

  beforeEach(() => {
    reflector = new Reflector();
    testController = new TestController();
  });

  describe("Metadata Setting", () => {
    it("should set requireApiKey metadata to true for decorated methods", () => {
      const requiresApiKey = reflector.get<boolean>(
        REQUIRE_API_KEY,
        testController.dataEndpoint,
      );
      expect(requiresApiKey).toBe(true);
    });

    it("should not set metadata for non-decorated methods", () => {
      const requiresApiKey = reflector.get<boolean>(
        REQUIRE_API_KEY,
        testController.publicEndpoint,
      );
      expect(requiresApiKey).toBeUndefined();
    });

    it("should set metadata for different HTTP methods", () => {
      const requiresApiKeyPost = reflector.get<boolean>(
        REQUIRE_API_KEY,
        testController.dataEndpoint,
      );
      const requiresApiKeyGet = reflector.get<boolean>(
        REQUIRE_API_KEY,
        testController.protectedEndpoint,
      );
      expect(requiresApiKeyPost).toBe(true);
      expect(requiresApiKeyGet).toBe(true);
    });
  });

  describe("API Key Constant", () => {
    it("should export correct API key constant", () => {
      expect(REQUIRE_API_KEY).toBe("requireApiKey");
      expect(typeof REQUIRE_API_KEY).toBe("string");
    });
  });

  describe("Decorator Function Properties", () => {
    it("should return a function when called", () => {
      const decorator = RequireApiKey();
      expect(typeof decorator).toBe("function");
    });

    it("should be a zero-parameter decorator", () => {
      expect(() => {
        const decorator = RequireApiKey();
        expect(typeof decorator).toBe("function");
      }).not.toThrow();
    });
  });

  describe("Multiple Method Decoration", () => {
    it("should allow multiple methods to require API keys", () => {
      class MultiApiKeyController {
        @RequireApiKey()
        _protectedMethod1() {
          return "protected1";
        }

        @RequireApiKey()
        protectedMethod2() {
          return "protected2";
        }

        publicMethod() {
          return "public";
        }
      }

      const controller = new MultiApiKeyController();

      const requiresApiKey1 = reflector.get<boolean>(
        REQUIRE_API_KEY,
        controller._protectedMethod1,
      );
      const requiresApiKey2 = reflector.get<boolean>(
        REQUIRE_API_KEY,
        controller.protectedMethod2,
      );
      const publicMethod = reflector.get<boolean>(
        REQUIRE_API_KEY,
        controller.publicMethod,
      );

      expect(requiresApiKey1).toBe(true);
      expect(requiresApiKey2).toBe(true);
      expect(publicMethod).toBeUndefined();
    });
  });

  describe("Real-world Usage Patterns", () => {
    it("should work with data processing endpoints", () => {
      class DataProcessingController {
        @RequireApiKey()
        @Post("receiver/data")
        handleDataRequest() {
          return "data processed";
        }

        @RequireApiKey()
        @Post("query/execute")
        executeQuery() {
          return "query executed";
        }

        @Get("health")
        healthCheck() {
          return "healthy";
        }
      }

      const controller = new DataProcessingController();

      const dataEndpointProtected = reflector.get<boolean>(
        REQUIRE_API_KEY,
        controller.handleDataRequest,
      );
      const queryEndpointProtected = reflector.get<boolean>(
        REQUIRE_API_KEY,
        controller.executeQuery,
      );
      const healthEndpointPublic = reflector.get<boolean>(
        REQUIRE_API_KEY,
        controller.healthCheck,
      );

      expect(dataEndpointProtected).toBe(true);
      expect(queryEndpointProtected).toBe(true);
      expect(healthEndpointPublic).toBeUndefined();
    });
  });

  describe("Integration with NestJS Metadata System", () => {
    it("should work with NestJS Reflector to retrieve metadata", () => {
      class IntegrationTestController {
        @RequireApiKey()
        protectedMethod() {
          return "protected";
        }
      }

      const controller = new IntegrationTestController();

      const requiresApiKey = reflector.get<boolean>(
        REQUIRE_API_KEY,
        controller.protectedMethod,
      );

      expect(requiresApiKey).toBe(true);
    });

    it("should be compatible with other NestJS decorators", () => {
      expect(() => {
        class CombinedDecoratorsController {
          @RequireApiKey()
          @Post("combined")
          combinedMethod() {
            return "combined";
          }
        }

        const controller = new CombinedDecoratorsController();
        const requiresApiKey = reflector.get<boolean>(
          REQUIRE_API_KEY,
          controller.combinedMethod,
        );

        expect(requiresApiKey).toBe(true);
      }).not.toThrow();
    });
  });

  describe("Metadata Value Consistency", () => {
    it("should always set metadata value to true", () => {
      class ConsistencyTestController {
        @RequireApiKey()
        method1() {
          return "1";
        }

        @RequireApiKey()
        method2() {
          return "2";
        }

        @RequireApiKey()
        method3() {
          return "3";
        }
      }

      const controller = new ConsistencyTestController();

      const values = [
        reflector.get<boolean>(REQUIRE_API_KEY, controller.method1),
        reflector.get<boolean>(REQUIRE_API_KEY, controller.method2),
        reflector.get<boolean>(REQUIRE_API_KEY, controller.method3),
      ];

      values.forEach((value) => {
        expect(value).toBe(true);
        expect(typeof value).toBe("boolean");
      });
    });
  });

  describe("Edge Cases", () => {
    it("should handle methods with complex signatures", () => {
      const asyncProtected = reflector.get<boolean>(
        REQUIRE_API_KEY,
        testController.asyncMethod,
      );
      const paramsProtected = reflector.get<boolean>(
        REQUIRE_API_KEY,
        testController.methodWithParams,
      );
      const optionalParamsProtected = reflector.get<boolean>(
        REQUIRE_API_KEY,
        testController.methodWithOptionalParams,
      );

      expect(asyncProtected).toBe(true);
      expect(paramsProtected).toBe(true);
      expect(optionalParamsProtected).toBe(true);
    });
  });
});
