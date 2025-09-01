/* eslint-disable @typescript-eslint/no-unused-vars */
import { Test, TestingModule } from "@nestjs/testing";
import { Reflector } from "@nestjs/core";
import { ExecutionContext, ForbiddenException } from "@nestjs/common";
import { createMock } from "@golevelup/ts-jest";
import { UnifiedPermissionsGuard } from "../../../../../src/auth/guards/unified-permissions.guard";
import { PermissionService } from "../../../../../src/auth/services/permission.service";
import { AuthSubjectFactory } from "../../../../../src/auth/subjects/auth-subject.factory";
import { JwtUserSubject } from "../../../../../src/auth/subjects/jwt-user.subject";
import { ApiKeySubject } from "../../../../../src/auth/subjects/api-key.subject";
import {
  Permission,
  UserRole,
} from "../../../../../src/auth/enums/user-role.enum";
import { PERMISSIONS_KEY } from "../../../../../src/auth/decorators/permissions.decorator";
import { ROLES_KEY } from "../../../../../src/auth/decorators/roles.decorator";
import { AuthSubjectType } from "../../../../../src/auth/interfaces/auth-subject.interface";

// Mock the logger to prevent console output during tests
jest.mock("@app/config/logger.config", () => ({
  createLogger: jest.fn(() => ({
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  })),
}));

// Mock AuthSubjectFactory
jest.mock("../../../../../src/auth/subjects/auth-subject.factory");

describe("UnifiedPermissionsGuard", () => {
  let guard: UnifiedPermissionsGuard;
  let reflector: Reflector;
  let permissionService: PermissionService;

  const mockExecutionContext = createMock<ExecutionContext>();

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UnifiedPermissionsGuard,
        {
          provide: PermissionService,
          useValue: createMock<PermissionService>(),
        },
        {
          provide: Reflector,
          useValue: createMock<Reflector>(),
        },
      ],
    }).compile();

    guard = module.get<UnifiedPermissionsGuard>(UnifiedPermissionsGuard);
    reflector = module.get<Reflector>(Reflector);
    permissionService = module.get<PermissionService>(PermissionService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // Helper function to mock Reflector's return value
  const mockReflector = (
    roles: UserRole[] = [],
    permissions: Permission[] = [],
  ) => {
    jest
      .spyOn((UnifiedPermissionsGuard as any).prototype, "getRequiredRoles")
      .mockReturnValue(roles);
    jest
      .spyOn(
        (UnifiedPermissionsGuard as any).prototype,
        "getRequiredPermissions",
      )
      .mockReturnValue(permissions);
  };

  // Helper function to mock AuthSubjectFactory
  const mockAuthSubject = (subject: any) => {
    (AuthSubjectFactory.createFromRequest as jest.Mock).mockReturnValue(
      subject,
    );
  };

  it("should be defined", () => {
    expect(guard).toBeDefined();
  });

  describe("Scenario 1: No permissions required", () => {
    it("should allow access if no roles or permissions are required", async () => {
      mockReflector([], []);
      const result = await guard.canActivate(mockExecutionContext);
      expect(result).toBe(true);
    });
  });

  describe("Scenario 2: JWT User Authentication", () => {
    const mockJwtUser = new JwtUserSubject({
      id: "user1",
      username: "testuser",
      role: UserRole.DEVELOPER,
      permissions: [Permission.DATA_READ],
    });

    it("should allow access if user has required roles and permissions", async () => {
      mockReflector([UserRole.DEVELOPER], [Permission.DATA_READ]);
      mockAuthSubject(mockJwtUser);
      jest.spyOn(permissionService, "checkPermissions").mockResolvedValue({
        allowed: true,
        duration: 10,
        missingPermissions: [],
        missingRoles: [],
        details: "all good",
      });

      const result = await guard.canActivate(mockExecutionContext);
      expect(result).toBe(true);
    });

    it("should deny access if user is missing required roles", async () => {
      mockReflector([UserRole.ADMIN], []);
      mockAuthSubject(mockJwtUser);
      jest.spyOn(permissionService, "checkPermissions").mockResolvedValue({
        allowed: false,
        missingRoles: [UserRole.ADMIN],
        missingPermissions: [],
        duration: 5,
        details: "missing role",
      });

      await expect(
        Promise.resolve().then(() => guard.canActivate(mockExecutionContext)),
      ).rejects.toThrow(ForbiddenException);
    });

    it("should deny access if user is missing required permissions", async () => {
      mockReflector([], [Permission.USER_MANAGE]);
      mockAuthSubject(mockJwtUser);
      jest.spyOn(permissionService, "checkPermissions").mockResolvedValue({
        allowed: false,
        missingRoles: [],
        missingPermissions: [Permission.USER_MANAGE],
        duration: 6,
        details: "missing permission",
      });

      await expect(
        Promise.resolve().then(() => guard.canActivate(mockExecutionContext)),
      ).rejects.toThrow(ForbiddenException);
      try {
        await guard.canActivate(mockExecutionContext);
      } catch (e) {
        expect(e.getResponse().details.missingPermissions).toEqual([
          Permission.USER_MANAGE,
        ]);
      }
    });
  });

  describe("Scenario 3: API Key Authentication", () => {
    const mockApiKey = new ApiKeySubject({
      id: "key1",
      owner: "test-app",
      permissions: [Permission.DATA_READ],
    });

    it("should allow access if API key has required permissions", async () => {
      mockReflector([], [Permission.DATA_READ]);
      mockAuthSubject(mockApiKey);
      jest.spyOn(permissionService, "checkPermissions").mockResolvedValue({
        allowed: true,
        duration: 8,
        missingPermissions: [],
        missingRoles: [],
        details: "all good",
      });

      const result = await guard.canActivate(mockExecutionContext);
      expect(result).toBe(true);
    });

    it("should deny access if API key is missing required permissions", async () => {
      mockReflector([], [Permission.USER_MANAGE]);
      mockAuthSubject(mockApiKey);
      jest.spyOn(permissionService, "checkPermissions").mockResolvedValue({
        allowed: false,
        missingRoles: [],
        missingPermissions: [Permission.USER_MANAGE],
        duration: 7,
        details: "missing perm",
      });

      await expect(
        Promise.resolve().then(() => guard.canActivate(mockExecutionContext)),
      ).rejects.toThrow(ForbiddenException);
      try {
        await guard.canActivate(mockExecutionContext);
      } catch (e) {
        expect(e.getResponse().details.subjectType).toEqual(
          AuthSubjectType.API_KEY,
        );
        expect(e.getResponse().details.missingPermissions).toEqual([
          Permission.USER_MANAGE,
        ]);
      }
    });

    it("should deny access if roles are required (API keys do not support roles)", async () => {
      mockReflector([UserRole.ADMIN], []);
      mockAuthSubject(mockApiKey);
      jest.spyOn(permissionService, "checkPermissions").mockResolvedValue({
        allowed: false,
        missingRoles: [UserRole.ADMIN],
        missingPermissions: [],
        duration: 4,
        details: "no roles for api key",
      });

      await expect(
        Promise.resolve().then(() => guard.canActivate(mockExecutionContext)),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe("Scenario 4: Exception Handling", () => {
    it("should throw ForbiddenException if permissionService throws an error", async () => {
      const mockJwtUser = new JwtUserSubject({
        id: "user1",
        username: "testuser",
        role: UserRole.DEVELOPER,
        permissions: [],
      });
      mockReflector([UserRole.DEVELOPER], []);
      mockAuthSubject(mockJwtUser);
      jest
        .spyOn(permissionService, "checkPermissions")
        .mockRejectedValue(new Error("Database error"));

      await expect(
        Promise.resolve().then(() => guard.canActivate(mockExecutionContext)),
      ).rejects.toThrow(ForbiddenException);
      await expect(
        Promise.resolve().then(() => guard.canActivate(mockExecutionContext)),
      ).rejects.toThrow("权限验证失败，请稍后重试");
    });

    it("should rethrow ForbiddenException if it is thrown by permissionService", async () => {
      const mockJwtUser = new JwtUserSubject({
        id: "user1",
        username: "testuser",
        role: UserRole.DEVELOPER,
        permissions: [],
      });
      mockReflector([UserRole.DEVELOPER], []);
      mockAuthSubject(mockJwtUser);
      const customException = new ForbiddenException(
        "Custom forbidden message",
      );
      jest
        .spyOn(permissionService, "checkPermissions")
        .mockRejectedValue(customException);

      await expect(
        Promise.resolve().then(() => guard.canActivate(mockExecutionContext)),
      ).rejects.toThrow(customException);
    });
  });
});
