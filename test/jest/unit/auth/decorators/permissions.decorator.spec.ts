import { Reflector } from "@nestjs/core";
import { Controller, Post } from "@nestjs/common";
import {
  RequirePermissions,
  PERMISSIONS_KEY,
} from "../../../../../src/auth/decorators/permissions.decorator";
import { Permission } from "../../../../../src/auth/enums/user-role.enum";

// Test controller for the decorator
@Controller("test")
class TestController {
  @RequirePermissions(Permission.DATA_READ)
  @Post("single-permission")
  singlePermissionMethod() {
    return "test";
  }

  @RequirePermissions(Permission.DATA_READ, Permission.QUERY_EXECUTE)
  @Post("multiple-permissions")
  multiplePermissionsMethod() {
    return "test";
  }

  @RequirePermissions(
    Permission.CONFIG_WRITE,
    Permission.PROVIDERS_READ,
    Permission.SYSTEM_MONITOR,
  )
  @Post("many-permissions")
  manyPermissionsMethod() {
    return "test";
  }

  @Post("no-permissions")
  noPermissionsMethod() {
    return "test";
  }
}

describe("RequirePermissions Decorator", () => {
  let reflector: Reflector;
  let testController: TestController;

  beforeEach(() => {
    reflector = new Reflector();
    testController = new TestController();
  });

  describe("Metadata Setting", () => {
    it("should set metadata for single permission", () => {
      // Act - get permission metadata
      const permissions = reflector.get<Permission[]>(
        PERMISSIONS_KEY,
        testController.singlePermissionMethod,
      );

      // Assert - check if metadata is correct
      expect(permissions).toBeDefined();
      expect(Array.isArray(permissions)).toBe(true);
      expect(permissions).toHaveLength(1);
      expect(permissions).toContain(Permission.DATA_READ);
    });

    it("should set metadata for multiple permissions", () => {
      // Act - get multiple permission metadata
      const permissions = reflector.get<Permission[]>(
        PERMISSIONS_KEY,
        testController.multiplePermissionsMethod,
      );

      // Assert - check multiple permission metadata
      expect(permissions).toBeDefined();
      expect(Array.isArray(permissions)).toBe(true);
      expect(permissions).toHaveLength(2);
      expect(permissions).toContain(Permission.DATA_READ);
      expect(permissions).toContain(Permission.QUERY_EXECUTE);
    });

    it("should set metadata for many permissions", () => {
      // Act - get many permission metadata
      const permissions = reflector.get<Permission[]>(
        PERMISSIONS_KEY,
        testController.manyPermissionsMethod,
      );

      // Assert - check many permission metadata
      expect(permissions).toBeDefined();
      expect(Array.isArray(permissions)).toBe(true);
      expect(permissions).toHaveLength(3);
      expect(permissions).toContain(Permission.CONFIG_WRITE);
      expect(permissions).toContain(Permission.PROVIDERS_READ);
      expect(permissions).toContain(Permission.SYSTEM_MONITOR);
    });

    it("should not set metadata when decorator is not used", () => {
      // Act - get metadata from method without decorator
      const permissions = reflector.get<Permission[]>(
        PERMISSIONS_KEY,
        testController.noPermissionsMethod,
      );

      // Assert - metadata should be undefined
      expect(permissions).toBeUndefined();
    });
  });

  describe("Permissions Key Constant", () => {
    it("should export correct permissions key constant", () => {
      // Assert - check the key constant
      expect(PERMISSIONS_KEY).toBe("permissions");
      expect(typeof PERMISSIONS_KEY).toBe("string");
    });
  });

  describe("Permission Enum Values", () => {
    it("should work with all defined permission values", () => {
      // Arrange - create a decorator with all permissions
      const allPermissions = [
        Permission.DATA_READ,
        Permission.QUERY_EXECUTE,
        Permission.PROVIDERS_READ,
        Permission.TRANSFORMER_PREVIEW,
        Permission.SYSTEM_MONITOR,
        Permission.SYSTEM_METRICS,
        Permission.SYSTEM_HEALTH,
        Permission.DEBUG_ACCESS,
        Permission.CONFIG_READ,
        Permission.USER_MANAGE,
        Permission.APIKEY_MANAGE,
        Permission.CONFIG_WRITE,
        Permission.MAPPING_WRITE,
        Permission.SYSTEM_ADMIN,
        Permission.DATA_WRITE,
        Permission.QUERY_STATS,
        Permission.QUERY_HEALTH,
        Permission.PROVIDERS_MANAGE,
      ];

      // Create a controller with all permissions
      class AllPermissionsController {
        @RequirePermissions(...allPermissions)
        allPermissionsMethod() {
          return "test";
        }
      }

      const controller = new AllPermissionsController();

      // Act - get all permission metadata
      const permissions = reflector.get<Permission[]>(
        PERMISSIONS_KEY,
        controller.allPermissionsMethod,
      );

      // Assert - check all permission metadata
      expect(permissions).toBeDefined();
      expect(permissions).toHaveLength(allPermissions.length);
      allPermissions.forEach((permission) => {
        expect(permissions).toContain(permission);
      });
    });
  });

  describe("Decorator Function Properties", () => {
    it("should return a function when called", () => {
      // Act - call the decorator
      const decorator = RequirePermissions(Permission.DATA_READ);

      // Assert - it should return a function
      expect(typeof decorator).toBe("function");
    });

    it("should be callable with no parameters", () => {
      // Act & Assert - call without parameters
      expect(() => {
        const decorator = RequirePermissions();
        expect(typeof decorator).toBe("function");
      }).not.toThrow();
    });

    it("should handle empty permissions array", () => {
      // Arrange
      class EmptyPermissionsController {
        @RequirePermissions()
        emptyPermissionsMethod() {
          return "test";
        }
      }

      const controller = new EmptyPermissionsController();

      // Act - get metadata from empty permissions
      const permissions = reflector.get<Permission[]>(
        PERMISSIONS_KEY,
        controller.emptyPermissionsMethod,
      );

      // Assert - check metadata for empty permissions
      expect(permissions).toBeDefined();
      expect(Array.isArray(permissions)).toBe(true);
      expect(permissions).toHaveLength(0);
    });
  });

  describe("Metadata Inheritance and Overriding", () => {
    it("should allow method-level permissions to be set independently", () => {
      // Arrange
      class MultiMethodController {
        @RequirePermissions(Permission.DATA_READ)
        methodOne() {
          return "method1";
        }

        @RequirePermissions(Permission.CONFIG_WRITE)
        methodTwo() {
          return "method2";
        }
      }

      const controller = new MultiMethodController();

      // Act - get metadata from different methods
      const permissions1 = reflector.get<Permission[]>(
        PERMISSIONS_KEY,
        controller.methodOne,
      );
      const permissions2 = reflector.get<Permission[]>(
        PERMISSIONS_KEY,
        controller.methodTwo,
      );

      // Assert - permissions should be independent
      expect(permissions1).toEqual([Permission.DATA_READ]);
      expect(permissions2).toEqual([Permission.CONFIG_WRITE]);
      expect(permissions1).not.toEqual(permissions2);
    });
  });

  describe("Type Safety", () => {
    it("should only accept Permission enum values", () => {
      // This is checked by TypeScript at compile time
      // This test ensures it doesn't throw at runtime

      // Act & Assert - should not throw
      expect(() => {
        // This should be valid in TypeScript
        RequirePermissions(Permission.DATA_READ);
        RequirePermissions(Permission.DATA_READ, Permission.CONFIG_WRITE);
        RequirePermissions(
          Permission.SYSTEM_ADMIN,
          Permission.SYSTEM_MONITOR,
          Permission.PROVIDERS_MANAGE,
        );
      }).not.toThrow();
    });

    it("should maintain permission enum string values", () => {
      // Arrange & Act
      const testPermissions = [
        Permission.DATA_READ,
        Permission.QUERY_EXECUTE,
        Permission.PROVIDERS_READ,
        Permission.TRANSFORMER_PREVIEW,
        Permission.SYSTEM_MONITOR,
        Permission.SYSTEM_METRICS,
        Permission.SYSTEM_HEALTH,
        Permission.DEBUG_ACCESS,
        Permission.CONFIG_READ,
        Permission.USER_MANAGE,
        Permission.APIKEY_MANAGE,
        Permission.CONFIG_WRITE,
        Permission.MAPPING_WRITE,
        Permission.SYSTEM_ADMIN,
        Permission.DATA_WRITE,
        Permission.QUERY_STATS,
        Permission.QUERY_HEALTH,
        Permission.PROVIDERS_MANAGE,
      ];

      // Assert - check permission string format
      testPermissions.forEach((permission) => {
        expect(typeof permission).toBe("string");
        expect(permission.length).toBeGreaterThan(0);
        expect(permission).toMatch(/^[a-z]+:[a-z]+$/); // e.g., "data:read"
      });
    });
  });

  describe("Integration with NestJS Metadata System", () => {
    it("should work with NestJS Reflector to retrieve metadata", () => {
      // Arrange
      class IntegrationTestController {
        @RequirePermissions(Permission.SYSTEM_ADMIN)
        adminMethod() {
          return "admin";
        }
      }

      const controller = new IntegrationTestController();

      // Act - use NestJS Reflector to get metadata
      const permissions = reflector.get<Permission[]>(
        PERMISSIONS_KEY,
        controller.adminMethod,
      );

      // Assert - check NestJS metadata retrieval
      expect(permissions).toBeDefined();
    });

    it("should be compatible with other NestJS decorators", () => {
      // Arrange & Act - check compatibility with other decorators
      expect(() => {
        class CombinedDecoratorsController {
          @RequirePermissions(Permission.DATA_READ)
          @Post("combined")
          combinedMethod() {
            return "combined";
          }
        }

        const controller = new CombinedDecoratorsController();
        const permissions = reflector.get<Permission[]>(
          PERMISSIONS_KEY,
          controller.combinedMethod,
        );

        // Assert
        expect(permissions).toContain(Permission.DATA_READ);
      }).not.toThrow();
    });
  });

  describe("Performance and Memory", () => {
    it("should not create excessive metadata overhead", () => {
      // Arrange
      const methodCount = 100;

      class PerformanceTestTarget {}
      const targetPrototype = PerformanceTestTarget.prototype;

      // Act: Dynamically create methods and apply the decorator
      for (let i = 0; i < methodCount; i++) {
        const methodName = `method${i}`;
        const methodImpl = () => methodName;
        const descriptor = {
          value: methodImpl,
          writable: true,
          enumerable: true,
          configurable: true,
        };
        Object.defineProperty(targetPrototype, methodName, descriptor);
        RequirePermissions(Permission.DATA_READ)(
          targetPrototype,
          methodName,
          descriptor,
        );
      }

      // Assert: Check metadata for all dynamically created methods
      for (let i = 0; i < methodCount; i++) {
        const methodName = `method${i}`;
        const methodOnPrototype = (targetPrototype as any)[methodName];
        const permissions = reflector.get<Permission[]>(
          PERMISSIONS_KEY,
          methodOnPrototype,
        );
        expect(permissions).toEqual([Permission.DATA_READ]);
      }
    });
  });
});
