/* eslint-disable @typescript-eslint/no-unused-vars */

import { Test, TestingModule } from "@nestjs/testing";
import { DiscoveryService, MetadataScanner, Reflector } from "@nestjs/core";
import { InstanceWrapper } from "@nestjs/core/injector/instance-wrapper";
import {
  PermissionDecoratorValidator,
  PermissionViolation,
} from "../../../../../../../src/common/modules/permission/validators/permission-decorator.validator";
import { REQUIRE_API_KEY } from "../../../../../../../src/auth/decorators/require-apikey.decorator";
import { PERMISSIONS_KEY } from "../../../../../../../src/auth/decorators/permissions.decorator";
import { Permission } from "../../../../../../../src/auth/enums/user-role.enum";

describe("PermissionDecoratorValidator", () => {
  let validator: PermissionDecoratorValidator;
  let discoveryService: DiscoveryService;
  let metadataScanner: MetadataScanner;
  let reflector: Reflector;

  // 模拟依赖服务
  const mockDiscoveryService = {
    getControllers: jest.fn(),
  };
  const mockMetadataScanner = {
    getAllMethodNames: jest.fn(),
  };
  const mockReflector = {
    get: jest.fn(),
  };

  // 在每个测试用例之前，创建一个新的测试模块
  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PermissionDecoratorValidator,
        { provide: DiscoveryService, useValue: mockDiscoveryService },
        { provide: MetadataScanner, useValue: mockMetadataScanner },
        { provide: Reflector, useValue: mockReflector },
      ],
    }).compile();

    validator = module.get<PermissionDecoratorValidator>(
      PermissionDecoratorValidator,
    );

    // 重置 mock 的调用记录
    jest.clearAllMocks();
  });

  // 测试 validateAllControllers 方法
  describe("validateAllControllers", () => {
    it("should return an empty array if no controllers are found", async () => {
      // 模拟没有控制器
      mockDiscoveryService.getControllers.mockReturnValue([]);
      // 调用方法
      const results = await validator.validateAllControllers();
      // 断言返回结果为空数组
      expect(results).toEqual([]);
    });

    it("should validate all controllers and aggregate results", async () => {
      // 模拟控制器
      class TestController1 {}
      class TestController2 {}
      const mockControllers: InstanceWrapper[] = [
        {
          name: "TestController1",
          metatype: TestController1,
        } as InstanceWrapper,
        {
          name: "TestController2",
          metatype: TestController2,
        } as InstanceWrapper,
      ];
      mockDiscoveryService.getControllers.mockReturnValue(mockControllers);

      // 模拟 getRoutes 方法
      jest
        .spyOn(validator as any, "getRoutes")
        .mockReturnValueOnce([
          { path: "/test1", method: "GET", handler: jest.fn() },
        ])
        .mockReturnValueOnce([
          { path: "/test2", method: "POST", handler: jest.fn() },
        ]);

      // 模拟 hasApiKeyAuth 和 hasRequirePermissions 方法
      jest.spyOn(validator as any, "hasApiKeyAuth").mockReturnValue(false);
      jest
        .spyOn(validator as any, "hasRequirePermissions")
        .mockReturnValue(false);
      jest
        .spyOn(validator as any, "getRequiredPermissions")
        .mockReturnValue([]);
      jest
        .spyOn(validator as any, "validatePermissionLevel")
        .mockReturnValue(null);
      jest
        .spyOn(validator as any, "validatePermissionCombination")
        .mockReturnValue(null);

      // 调用方法
      const results = await validator.validateAllControllers();

      // 断言结果是否正确
      expect(results).toHaveLength(2);
      expect(results[0].controller).toBe("TestController1");
      expect(results[1].controller).toBe("TestController2");
      expect(results[0].isValid).toBe(true);
      expect(results[1].isValid).toBe(true);
    });
  });

  // 测试 validateController 方法
  describe("validateController", () => {
    class MockController {
      // 模拟一个带有 @ApiKeyAuth 但没有 @RequirePermissions 的方法
      method1() {}
      // 模拟一个带有 @ApiKeyAuth 和 @RequirePermissions 的方法
      method2() {}
      // 模拟一个带有冲突权限的方法
      method3() {}
    }

    const mockControllerInstance: InstanceWrapper = {
      name: "MockController",
      metatype: MockController,
    } as InstanceWrapper;

    beforeEach(() => {
      // 模拟 getAllMethodNames
      mockMetadataScanner.getAllMethodNames.mockReturnValue([
        "method1",
        "method2",
        "method3",
      ]);

      // 模拟 reflector.get 获取 HTTP 方法元数据
      mockReflector.get.mockImplementation((key, target) => {
        if (key === "get" && target === MockController.prototype.method1)
          return "";
        if (key === "post" && target === MockController.prototype.method2)
          return "";
        if (key === "put" && target === MockController.prototype.method3)
          return "";
        return undefined;
      });
    });

    it("should identify missing @RequirePermissions when @ApiKeyAuth is present", async () => {
      // 模拟 method1 只有 ApiKeyAuth
      mockReflector.get.mockImplementation((key, target) => {
        if (
          key === REQUIRE_API_KEY &&
          target === MockController.prototype.method1
        )
          return true;
        if (
          key === PERMISSIONS_KEY &&
          target === MockController.prototype.method1
        )
          return [];
        if (key === "get" && target === MockController.prototype.method1)
          return "";
        return undefined;
      });

      const result = await (validator as any).validateController(
        mockControllerInstance,
      );
      expect(result.violations).toHaveLength(1);
      expect(result.violations[0].type).toBe("missing_require_permissions");
      expect(result.isValid).toBe(false);
    });

    it("should identify permission level inconsistency", async () => {
      // 模拟 method3 具有冲突权限
      mockReflector.get.mockImplementation((key, target) => {
        if (
          key === REQUIRE_API_KEY &&
          target === MockController.prototype.method3
        )
          return true;
        if (
          key === PERMISSIONS_KEY &&
          target === MockController.prototype.method3
        )
          return [Permission.SYSTEM_ADMIN, Permission.DATA_READ];
        if (key === "put" && target === MockController.prototype.method3)
          return "";
        return undefined;
      });

      const result = await (validator as any).validateController(
        mockControllerInstance,
      );
      expect(result.violations).toHaveLength(1);
      expect(result.violations[0].type).toBe("permission_level_inconsistency");
      expect(result.isValid).toBe(false);
    });

    it("should return valid for correctly decorated methods", async () => {
      // 模拟 method2 具有正确的权限
      mockReflector.get.mockImplementation((key, target) => {
        if (
          key === REQUIRE_API_KEY &&
          target === MockController.prototype.method2
        )
          return true;
        if (
          key === PERMISSIONS_KEY &&
          target === MockController.prototype.method2
        )
          return [Permission.DATA_READ];
        if (key === "post" && target === MockController.prototype.method2)
          return "";
        return undefined;
      });

      const result = await (validator as any).validateController(
        mockControllerInstance,
      );
      expect(result.violations).toHaveLength(0);
      expect(result.isValid).toBe(true);
    });
  });

  // 测试 generateReport 方法
  describe("generateReport", () => {
    it("should generate a report with no violations", () => {
      const results = [
        {
          controller: "TestController",
          violations: [],
          isValid: true,
          totalRoutes: 5,
          validRoutes: 5,
        },
      ];
      const report = validator.generateReport(results);
      expect(report).toContain("✅ 所有控制器的权限装饰器都符合规范！");
      expect(report).toContain("控制器总数: 1");
      expect(report).toContain("路由总数: 5");
      expect(report).toContain("违规总数: 0");
    });

    it("should generate a report with violations", () => {
      const violations: PermissionViolation[] = [
        {
          type: "missing_require_permissions",
          route: "/test",
          method: "GET",
          message: "@ApiKeyAuth装饰器必须配合@RequirePermissions使用",
          severity: "high",
          recommendation: "添加 @RequirePermissions(Permission.XXX) 装饰器",
        },
      ];
      const results = [
        {
          controller: "TestController",
          violations: violations,
          isValid: false,
          totalRoutes: 1,
          validRoutes: 0,
        },
      ];
      const report = validator.generateReport(results);
      expect(report).toContain("违规详情:");
      expect(report).toContain("[HIGH] GET /test");
      expect(report).toContain(
        "问题: @ApiKeyAuth装饰器必须配合@RequirePermissions使用",
      );
      expect(report).toContain(
        "建议: 添加 @RequirePermissions(Permission.XXX) 装饰器",
      );
    });
  });
});
