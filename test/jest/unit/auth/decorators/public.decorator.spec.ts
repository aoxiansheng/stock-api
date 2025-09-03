import { Reflector } from "@nestjs/core";
import { Controller, Get, Post } from "@nestjs/common";
import {
  Public,
  IS_PUBLIC_KEY,
} from "../../../../../src/auth/decorators/public.decorator";

// Test controller for decorator tests
@Controller("test")
class TestController {
  @Public()
  @Get("public-endpoint")
  publicMethod() {
    return "public";
  }

  @Get("private-endpoint")
  privateMethod() {
    return "private";
  }

  @Public()
  @Post("public-post")
  publicPostMethod() {
    return "public post";
  }

  @Public()
  async asyncMethod(): Promise<string> {
    return "async public";
  }

  @Public()
  methodWithParams(param1: string, param2: number): string {
    return `params: ${param1}, ${param2}`;
  }

  @Public()
  methodWithOptionalParams(required: string, optional?: number): string {
    return `required: ${required}, optional: ${optional}`;
  }
}

describe("Public Decorator", () => {
  let reflector: Reflector;
  let testController: TestController;

  beforeEach(() => {
    reflector = new Reflector();
    testController = new TestController();
  });

  describe("Metadata Setting", () => {
    it("should set isPublic metadata to true for decorated methods", () => {
      const isPublic = reflector.get<boolean>(
        IS_PUBLIC_KEY,
        testController.publicMethod,
      );
      expect(isPublic).toBe(true);
    });

    it("should not set metadata for non-decorated methods", () => {
      const isPublic = reflector.get<boolean>(
        IS_PUBLIC_KEY,
        testController.privateMethod,
      );
      expect(isPublic).toBeUndefined();
    });

    it("should set metadata for different HTTP methods", () => {
      const isPublicGet = reflector.get<boolean>(
        IS_PUBLIC_KEY,
        testController.publicMethod,
      );
      const isPublicPost = reflector.get<boolean>(
        IS_PUBLIC_KEY,
        testController.publicPostMethod,
      );
      expect(isPublicGet).toBe(true);
      expect(isPublicPost).toBe(true);
    });
  });

  describe("Public Key Constant", () => {
    it("should export correct public key constant", () => {
      expect(IS_PUBLIC_KEY).toBe("isPublic");
      expect(typeof IS_PUBLIC_KEY).toBe("string");
    });
  });

  describe("Decorator Function Properties", () => {
    it("should return a function when called", () => {
      const decorator = Public();
      expect(typeof decorator).toBe("function");
    });

    it("should be a zero-parameter decorator", () => {
      expect(() => {
        const decorator = Public();
        expect(typeof decorator).toBe("function");
      }).not.toThrow();
    });
  });

  describe("Multiple Method Decoration", () => {
    it("should allow multiple methods to be marked as public", () => {
      class MultiPublicController {
        @Public()
        publicMethod1() {
          return "public1";
        }

        @Public()
        publicMethod2() {
          return "public2";
        }

        privateMethod() {
          return "private";
        }
      }

      const controller = new MultiPublicController();

      const isPublic1 = reflector.get<boolean>(
        IS_PUBLIC_KEY,
        controller.publicMethod1,
      );
      const isPublic2 = reflector.get<boolean>(
        IS_PUBLIC_KEY,
        controller.publicMethod2,
      );
      const isPrivate = reflector.get<boolean>(
        IS_PUBLIC_KEY,
        controller.privateMethod,
      );

      expect(isPublic1).toBe(true);
      expect(isPublic2).toBe(true);
      expect(isPrivate).toBeUndefined();
    });
  });

  describe("Class-level vs Method-level Decoration", () => {
    it("should work at method level", () => {
      class MethodLevelController {
        @Public()
        methodLevelPublic() {
          return "method public";
        }

        normalMethod() {
          return "normal";
        }
      }

      const controller = new MethodLevelController();

      const methodPublic = reflector.get<boolean>(
        IS_PUBLIC_KEY,
        controller.methodLevelPublic,
      );
      const methodNormal = reflector.get<boolean>(
        IS_PUBLIC_KEY,
        controller.normalMethod,
      );

      expect(methodPublic).toBe(true);
      expect(methodNormal).toBeUndefined();
    });
  });

  describe("Integration with NestJS Metadata System", () => {
    it("should work with NestJS Reflector to retrieve metadata", () => {
      class IntegrationTestController {
        @Public()
        publicMethod() {
          return "public";
        }
      }

      const controller = new IntegrationTestController();

      const isPublic = reflector.get<boolean>(
        IS_PUBLIC_KEY,
        controller.publicMethod,
      );

      expect(isPublic).toBe(true);
    });

    it("should be compatible with other NestJS decorators", () => {
      expect(() => {
        class CombinedDecoratorsController {
          @Public()
          @Get("combined")
          combinedMethod() {
            return "combined";
          }
        }

        const controller = new CombinedDecoratorsController();
        const isPublic = reflector.get<boolean>(
          IS_PUBLIC_KEY,
          controller.combinedMethod,
        );

        expect(isPublic).toBe(true);
      }).not.toThrow();
    });
  });

  describe("Metadata Value Consistency", () => {
    it("should always set metadata value to true", () => {
      class ConsistencyTestController {
        @Public()
        method1() {
          return "1";
        }

        @Public()
        method2() {
          return "2";
        }

        @Public()
        method3() {
          return "3";
        }
      }

      const controller = new ConsistencyTestController();

      const values = [
        reflector.get<boolean>(IS_PUBLIC_KEY, controller.method1),
        reflector.get<boolean>(IS_PUBLIC_KEY, controller.method2),
        reflector.get<boolean>(IS_PUBLIC_KEY, controller.method3),
      ];

      values.forEach((value) => {
        expect(value).toBe(true);
        expect(typeof value).toBe("boolean");
      });
    });
  });

  describe("Edge Cases", () => {
    it("should handle methods with complex signatures", () => {
      const asyncPublic = reflector.get<boolean>(
        IS_PUBLIC_KEY,
        testController.asyncMethod,
      );
      const paramsPublic = reflector.get<boolean>(
        IS_PUBLIC_KEY,
        testController.methodWithParams,
      );
      const optionalParamsPublic = reflector.get<boolean>(
        IS_PUBLIC_KEY,
        testController.methodWithOptionalParams,
      );

      expect(asyncPublic).toBe(true);
      expect(paramsPublic).toBe(true);
      expect(optionalParamsPublic).toBe(true);
    });
  });
});
