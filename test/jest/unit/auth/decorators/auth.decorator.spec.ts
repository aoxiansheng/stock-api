/* eslint-disable @typescript-eslint/no-unused-vars */
import { applyDecorators, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiSecurity } from "@nestjs/swagger";
import {
  Auth,
  ApiKeyAuth,
  MixedAuth,
  Public,
} from "../../../../../src/auth/decorators/auth.decorator";
import { JwtAuthGuard } from "../../../../../src/auth/guards/jwt-auth.guard";
import { ApiKeyAuthGuard } from "../../../../../src/auth/guards/apikey-auth.guard";
import { RateLimitGuard } from "../../../../../src/auth/guards/rate-limit.guard";
import {
  UserRole,
  Permission,
} from "../../../../../src/auth/enums/user-role.enum";
import { Roles } from "../../../../../src/auth/decorators/roles.decorator";
import { RequirePermissions } from "../../../../../src/auth/decorators/permissions.decorator";
import { RequireApiKey } from "../../../../../src/auth/decorators/require-apikey.decorator";

// Mock all the imported modules and decorators
jest.mock("@nestjs/common", () => {
  const actual = jest.requireActual("@nestjs/common");
  return {
    ...actual,
    applyDecorators: jest.fn(),
    UseGuards: jest.fn(),
  };
});

jest.mock("@nestjs/swagger", () => {
  return {
    ApiProperty: jest.fn(() => jest.fn()),
    ApiBearerAuth: jest.fn(() => jest.fn()),
    ApiSecurity: jest.fn(() => jest.fn()),
    ApiOperation: jest.fn(() => jest.fn()),
    ApiResponse: jest.fn(() => jest.fn()),
    ApiTags: jest.fn(() => jest.fn()),
    ApiParam: jest.fn(() => jest.fn()),
    ApiQuery: jest.fn(() => jest.fn()),
    ApiBody: jest.fn(() => jest.fn()),
    ApiHeader: jest.fn(() => jest.fn()),
    ApiCookieAuth: jest.fn(() => jest.fn()),
    ApiBasicAuth: jest.fn(() => jest.fn()),
    ApiOAuth2: jest.fn(() => jest.fn()),
    ApiExcludeEndpoint: jest.fn(() => jest.fn()),
    ApiExcludeController: jest.fn(() => jest.fn()),
    ApiHideProperty: jest.fn(() => jest.fn()),
    ApiExtension: jest.fn(() => jest.fn()),
    ApiExtraModels: jest.fn(() => jest.fn()),
    ApiConsumes: jest.fn(() => jest.fn()),
    ApiProduces: jest.fn(() => jest.fn()),
    getSchemaPath: jest.fn(),
    refs: jest.fn(),
  };
});

jest.mock("../../../../../src/auth/guards/jwt-auth.guard", () => ({
  JwtAuthGuard: jest.fn(),
}));

jest.mock("../../../../../src/auth/guards/apikey-auth.guard", () => ({
  ApiKeyAuthGuard: jest.fn(),
}));



jest.mock("../../../../../src/auth/guards/rate-limit.guard", () => ({
  RateLimitGuard: jest.fn(),
}));

jest.mock("../../../../../src/auth/guards/unified-permissions.guard", () => ({
  UnifiedPermissionsGuard: jest.fn(),
}));

jest.mock("../../../../../src/auth/decorators/roles.decorator", () => ({
  Roles: jest.fn(),
}));

jest.mock("../../../../../src/auth/decorators/permissions.decorator", () => ({
  RequirePermissions: jest.fn(),
}));

jest.mock(
  "../../../../../src/auth/decorators/require-apikey.decorator",
  () => ({
    RequireApiKey: jest.fn(),
  }),
);

// Type the mocked functions
const mockApplyDecorators = applyDecorators as jest.MockedFunction<
  typeof applyDecorators
>;
const mockUseGuards = UseGuards as jest.MockedFunction<typeof UseGuards>;
const mockApiBearerAuth = ApiBearerAuth as jest.MockedFunction<
  typeof ApiBearerAuth
>;
const mockApiSecurity = ApiSecurity as jest.MockedFunction<typeof ApiSecurity>;
const mockRoles = Roles as jest.MockedFunction<typeof Roles>;
const mockRequirePermissions = RequirePermissions as jest.MockedFunction<
  typeof RequirePermissions
>;
const mockRequireApiKey = RequireApiKey as jest.MockedFunction<
  typeof RequireApiKey
>;

describe("Auth Decorators", () => {
  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();
    jest.resetAllMocks();

    // Set up default mock returns
    mockApplyDecorators.mockReturnValue(jest.fn() as any);
    mockUseGuards.mockReturnValue(jest.fn() as any);
    mockApiBearerAuth.mockReturnValue(jest.fn() as any);
    mockApiSecurity.mockReturnValue(jest.fn() as any);
    mockRoles.mockReturnValue(jest.fn() as any);
    mockRequirePermissions.mockReturnValue(jest.fn() as any);
    mockRequireApiKey.mockReturnValue(jest.fn() as any);
  });

  describe("Auth decorator", () => {
    it("should apply basic JWT authentication without roles or permissions", () => {
      Auth();

      expect(mockUseGuards).toHaveBeenCalledWith(
        JwtAuthGuard,
        expect.any(Function),
      );
      expect(mockApiBearerAuth).toHaveBeenCalled();
      expect(mockApplyDecorators).toHaveBeenCalledWith(
        expect.anything(), // UseGuards result
        expect.anything(), // ApiBearerAuth result
      );
      expect(mockRoles).not.toHaveBeenCalled();
      expect(mockRequirePermissions).not.toHaveBeenCalled();
    });

    it("should apply JWT authentication with roles", () => {
      const roles = [UserRole.ADMIN, UserRole.DEVELOPER];

      Auth(roles);

      expect(mockUseGuards).toHaveBeenCalledWith(
        JwtAuthGuard,
        expect.any(Function),
      );
      expect(mockApiBearerAuth).toHaveBeenCalled();
      expect(mockRoles).toHaveBeenCalledWith(
        UserRole.ADMIN,
        UserRole.DEVELOPER,
      );
      expect(mockRequirePermissions).not.toHaveBeenCalled();
    });

    it("should apply JWT authentication with permissions", () => {
      const permissions = [Permission.DATAREAD, Permission.QUERY_EXECUTE];

      Auth(undefined, permissions);

      expect(mockUseGuards).toHaveBeenCalledWith(
        JwtAuthGuard,
        expect.any(Function),
      );
      expect(mockApiBearerAuth).toHaveBeenCalled();
      expect(mockRequirePermissions).toHaveBeenCalledWith(
        Permission.DATA_READ,
        Permission.QUERYEXECUTE,
      );
      expect(mockRoles).not.toHaveBeenCalled();
    });

    it("should apply JWT authentication with both roles and permissions", () => {
      const roles = [UserRole.ADMIN];
      const permissions = [Permission.USERMANAGE, Permission.APIKEY_MANAGE];

      Auth(roles, permissions);

      expect(mockUseGuards).toHaveBeenCalledWith(
        JwtAuthGuard,
        expect.any(Function),
      );
      expect(mockApiBearerAuth).toHaveBeenCalled();
      expect(mockRoles).toHaveBeenCalledWith(UserRole.ADMIN);
      expect(mockRequirePermissions).toHaveBeenCalledWith(
        Permission.USER_MANAGE,
        Permission.APIKEY_MANAGE,
      );
    });

    it("should handle empty roles array", () => {
      Auth([]);

      expect(mockUseGuards).toHaveBeenCalledWith(
        JwtAuthGuard,
        expect.any(Function),
      );
      expect(mockApiBearerAuth).toHaveBeenCalled();
      expect(mockRoles).not.toHaveBeenCalled();
      expect(mockRequirePermissions).not.toHaveBeenCalled();
    });

    it("should handle empty permissions array", () => {
      Auth(undefined, []);

      expect(mockUseGuards).toHaveBeenCalledWith(
        JwtAuthGuard,
        expect.any(Function),
      );
      expect(mockApiBearerAuth).toHaveBeenCalled();
      expect(mockRoles).not.toHaveBeenCalled();
      expect(mockRequirePermissions).not.toHaveBeenCalled();
    });

    it("should handle null/undefined values gracefully", () => {
      Auth(null, null);

      expect(mockUseGuards).toHaveBeenCalledWith(
        JwtAuthGuard,
        expect.any(Function),
      );
      expect(mockApiBearerAuth).toHaveBeenCalled();
      expect(mockRoles).not.toHaveBeenCalled();
      expect(mockRequirePermissions).not.toHaveBeenCalled();
    });

    it("should pass correct decorators to applyDecorators", () => {
      const roles = [UserRole.DEVELOPER];
      const permissions = [Permission.DATA_READ];

      Auth(roles, permissions);

      // Should call applyDecorators with 4 decorators: UseGuards, ApiBearerAuth, Roles, RequirePermissions
      expect(mockApplyDecorators).toHaveBeenCalledWith(
        expect.anything(), // UseGuards
        expect.anything(), // ApiBearerAuth
        expect.anything(), // Roles
        expect.anything(), // RequirePermissions
      );
    });
  });

  describe("ApiKeyAuth decorator", () => {
    it("should apply API key authentication", () => {
      ApiKeyAuth();

      expect(mockUseGuards).toHaveBeenCalledWith(
        ApiKeyAuthGuard,
        expect.any(Function),
      );
      expect(mockRequireApiKey).toHaveBeenCalled();
      expect(mockApiSecurity).toHaveBeenCalledWith("ApiKey");
      expect(mockApiSecurity).toHaveBeenCalledWith("AccessToken");
      expect(mockApiSecurity).toHaveBeenCalledTimes(2);
    });

    it("should call applyDecorators with correct parameters", () => {
      ApiKeyAuth();

      expect(mockApplyDecorators).toHaveBeenCalledWith(
        expect.anything(), // UseGuards
        expect.anything(), // RequireApiKey
        expect.anything(), // ApiSecurity("ApiKey")
        expect.anything(), // ApiSecurity("AccessToken")
      );
    });

    it("should not apply bearer auth for API key authentication", () => {
      ApiKeyAuth();

      expect(mockApiBearerAuth).not.toHaveBeenCalled();
    });

    it("should not apply roles or permissions for API key authentication", () => {
      ApiKeyAuth();

      expect(mockRoles).not.toHaveBeenCalled();
      expect(mockRequirePermissions).not.toHaveBeenCalled();
    });
  });

  describe("MixedAuth decorator", () => {
    it("should apply mixed authentication without roles or permissions", () => {
      MixedAuth();

      expect(mockUseGuards).toHaveBeenCalledWith(
        JwtAuthGuard,
        ApiKeyAuthGuard,
        expect.any(Function),
      );
      expect(mockApiBearerAuth).toHaveBeenCalled();
      expect(mockApiSecurity).toHaveBeenCalledWith("ApiKey");
      expect(mockApiSecurity).toHaveBeenCalledWith("AccessToken");
      expect(mockApiSecurity).toHaveBeenCalledTimes(2);
      expect(mockRoles).not.toHaveBeenCalled();
      expect(mockRequirePermissions).not.toHaveBeenCalled();
    });

    it("should apply mixed authentication with roles", () => {
      const roles = [UserRole.ADMIN, UserRole.DEVELOPER];

      MixedAuth(roles);

      expect(mockUseGuards).toHaveBeenCalledWith(
        JwtAuthGuard,
        ApiKeyAuthGuard,
        expect.any(Function),
      );
      expect(mockApiBearerAuth).toHaveBeenCalled();
      expect(mockApiSecurity).toHaveBeenCalledWith("ApiKey");
      expect(mockApiSecurity).toHaveBeenCalledWith("AccessToken");
      expect(mockRoles).toHaveBeenCalledWith(
        UserRole.ADMIN,
        UserRole.DEVELOPER,
      );
      expect(mockRequirePermissions).not.toHaveBeenCalled();
    });

    it("should apply mixed authentication with permissions", () => {
      const permissions = [Permission.QUERY_EXECUTE, Permission.PROVIDERS_READ];

      MixedAuth(undefined, permissions);

      expect(mockUseGuards).toHaveBeenCalledWith(
        JwtAuthGuard,
        ApiKeyAuthGuard,
        expect.any(Function),
      );
      expect(mockApiBearerAuth).toHaveBeenCalled();
      expect(mockApiSecurity).toHaveBeenCalledWith("ApiKey");
      expect(mockApiSecurity).toHaveBeenCalledWith("AccessToken");
      expect(mockRequirePermissions).toHaveBeenCalledWith(
        Permission.QUERY_EXECUTE,
        Permission.PROVIDERS_READ,
      );
      expect(mockRoles).not.toHaveBeenCalled();
    });

    it("should apply mixed authentication with both roles and permissions", () => {
      const roles = [UserRole.DEVELOPER];
      const permissions = [Permission.DATA_READ, Permission.QUERY_EXECUTE];

      MixedAuth(roles, permissions);

      expect(mockUseGuards).toHaveBeenCalledWith(
        JwtAuthGuard,
        ApiKeyAuthGuard,
        expect.any(Function),
      );
      expect(mockApiBearerAuth).toHaveBeenCalled();
      expect(mockApiSecurity).toHaveBeenCalledWith("ApiKey");
      expect(mockApiSecurity).toHaveBeenCalledWith("AccessToken");
      expect(mockRoles).toHaveBeenCalledWith(UserRole.DEVELOPER);
      expect(mockRequirePermissions).toHaveBeenCalledWith(
        Permission.DATA_READ,
        Permission.QUERY_EXECUTE,
      );
    });

    it("should handle empty arrays for mixed authentication", () => {
      MixedAuth([], []);

      expect(mockUseGuards).toHaveBeenCalledWith(
        JwtAuthGuard,
        ApiKeyAuthGuard,
        expect.any(Function),
      );
      expect(mockApiBearerAuth).toHaveBeenCalled();
      expect(mockApiSecurity).toHaveBeenCalledTimes(2);
      expect(mockRoles).not.toHaveBeenCalled();
      expect(mockRequirePermissions).not.toHaveBeenCalled();
    });

    it("should apply all required guards for mixed authentication", () => {
      MixedAuth();

      // Should include both JWT and API Key guards plus UnifiedPermissionsGuard (RateLimitGuard is global)
      expect(mockUseGuards).toHaveBeenCalledWith(
        JwtAuthGuard,
        ApiKeyAuthGuard,
        expect.any(Function),
      );
    });

    it("should apply both bearer and API security for mixed authentication", () => {
      MixedAuth();

      expect(mockApiBearerAuth).toHaveBeenCalled();
      expect(mockApiSecurity).toHaveBeenCalledWith("ApiKey");
      expect(mockApiSecurity).toHaveBeenCalledWith("AccessToken");
    });

    it("should pass correct decorators to applyDecorators for mixed auth", () => {
      const roles = [UserRole.ADMIN];
      const permissions = [Permission.USER_MANAGE];

      MixedAuth(roles, permissions);

      // Should call applyDecorators with 6 decorators
      expect(mockApplyDecorators).toHaveBeenCalledWith(
        expect.anything(), // UseGuards
        expect.anything(), // ApiBearerAuth
        expect.anything(), // ApiSecurity("ApiKey")
        expect.anything(), // ApiSecurity("AccessToken")
        expect.anything(), // Roles
        expect.anything(), // RequirePermissions
      );
    });
  });

  describe("Public decorator export", () => {
    it("should export Public decorator", () => {
      expect(Public).toBeDefined();
    });
  });

  describe("Edge cases and error handling", () => {
    it("should handle single role in Auth decorator", () => {
      Auth([UserRole.ADMIN]);

      expect(mockRoles).toHaveBeenCalledWith(UserRole.ADMIN);
    });

    it("should handle single permission in Auth decorator", () => {
      Auth(undefined, [Permission.DATA_READ]);

      expect(mockRequirePermissions).toHaveBeenCalledWith(Permission.DATA_READ);
    });

    it("should handle multiple calls to decorators", () => {
      Auth([UserRole.ADMIN]);
      Auth([UserRole.DEVELOPER]);

      expect(mockUseGuards).toHaveBeenCalledTimes(2);
      expect(mockApiBearerAuth).toHaveBeenCalledTimes(2);
      expect(mockRoles).toHaveBeenCalledTimes(2);
    });

    it("should handle applyDecorators being called with empty array", () => {
      // Test when no roles or permissions are provided
      Auth();

      expect(mockApplyDecorators).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
      );
      // Should be called with exactly 2 decorators (UseGuards and ApiBearerAuth)
      const callArgs = mockApplyDecorators.mock.calls[0];
      expect(callArgs).toHaveLength(2);
    });

    it("should maintain decorator order consistency", () => {
      const roles = [UserRole.ADMIN];
      const permissions = [Permission.DATA_READ];

      Auth(roles, permissions);

      // Verify the order of decorator application
      const callArgs = mockApplyDecorators.mock.calls[0];
      expect(callArgs).toHaveLength(4); // UseGuards, ApiBearerAuth, Roles, RequirePermissions
    });

    it("should handle all UserRole enum values", () => {
      const allRoles = Object.values(UserRole);

      Auth(allRoles);

      expect(mockRoles).toHaveBeenCalledWith(...allRoles);
    });

    it("should handle all Permission enum values", () => {
      const allPermissions = Object.values(Permission);

      Auth(undefined, allPermissions);

      expect(mockRequirePermissions).toHaveBeenCalledWith(...allPermissions);
    });

    it("should handle decorator chaining in MixedAuth", () => {
      MixedAuth([UserRole.ADMIN], [Permission.DATA_READ]);

      // Verify all decorators are applied
      expect(mockUseGuards).toHaveBeenCalled();
      expect(mockApiBearerAuth).toHaveBeenCalled();
      expect(mockApiSecurity).toHaveBeenCalledTimes(2);
      expect(mockRoles).toHaveBeenCalled();
      expect(mockRequirePermissions).toHaveBeenCalled();
    });
  });

  describe("Return value handling", () => {
    it("should return the result of applyDecorators for Auth", () => {
      const mockResult = jest.fn();
      mockApplyDecorators.mockReturnValue(mockResult);

      const result = Auth();

      expect(result).toBe(mockResult);
    });

    it("should return the result of applyDecorators for ApiKeyAuth", () => {
      const mockResult = jest.fn();
      mockApplyDecorators.mockReturnValue(mockResult);

      const result = ApiKeyAuth();

      expect(result).toBe(mockResult);
    });

    it("should return the result of applyDecorators for MixedAuth", () => {
      const mockResult = jest.fn();
      mockApplyDecorators.mockReturnValue(mockResult);

      const result = MixedAuth();

      expect(result).toBe(mockResult);
    });
  });
});
