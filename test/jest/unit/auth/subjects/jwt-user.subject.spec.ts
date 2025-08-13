/* eslint-disable @typescript-eslint/no-unused-vars */
import {
  Permission,
  UserRole,
  RolePermissions,
} from "../../../../../src/auth/enums/user-role.enum";
import { AuthSubjectType } from "../../../../../src/auth/interfaces/auth-subject.interface";
import { JwtUserSubject } from "../../../../../src/auth/subjects/jwt-user.subject";

describe("JwtUserSubject", () => {
  const mockUserData = {
    id: "test-user-id",
    username: "testuser",
    email: "test@example.com",
    role: UserRole.DEVELOPER,
    isActive: true,
    lastLoginAt: new Date(),
  };

  describe("Constructor", () => {
    it("should create JwtUserSubject with valid user data", () => {
      const subject = new JwtUserSubject(mockUserData);

      expect(subject.id).toBe(mockUserData.id);
      expect(subject.type).toBe(AuthSubjectType.JWT_USER);
      expect(subject.role).toBe(mockUserData.role);
      expect(subject.permissions).toEqual(RolePermissions[UserRole.DEVELOPER]);
      expect(subject.metadata.username).toBe(mockUserData.username);
      expect(subject.metadata.email).toBe(mockUserData.email);
      expect(subject.metadata.isActive).toBe(mockUserData.isActive);
      expect(subject.metadata.lastLoginAt).toBe(mockUserData.lastLoginAt);
    });

    it("should handle user data with MongoDB ObjectId format", () => {
      const mongoUser = {
        id: { toString: () => "mongo-object-id" },
        username: "mongouser",
        role: UserRole.ADMIN,
        isActive: true,
      };

      const subject = new JwtUserSubject(mongoUser);

      expect(subject.id).toBe("mongo-object-id");
      expect(subject.role).toBe(UserRole.ADMIN);
      expect(subject.permissions).toEqual(RolePermissions[UserRole.ADMIN]);
    });

    it("should handle missing optional fields", () => {
      const minimalUser = {
        id: "minimal-user",
        username: "minimal",
        role: UserRole.DEVELOPER,
      };

      const subject = new JwtUserSubject(minimalUser);

      expect(subject.id).toBe("minimal-user");
      expect(subject.role).toBe(UserRole.DEVELOPER);
      expect(subject.permissions).toEqual(RolePermissions[UserRole.DEVELOPER]);
      expect(subject.metadata.username).toBe("minimal");
      expect(subject.metadata.email).toBeUndefined();
    });

    it("should throw error when ID is missing", () => {
      const userWithoutId = {
        username: "user-without-id",
        role: UserRole.DEVELOPER,
      };

      expect(() => new JwtUserSubject(userWithoutId)).toThrow(
        "JWT用户主体缺少必要的ID字段",
      );
    });

    it("should throw error when role is missing", () => {
      const userWithoutRole = {
        id: "test-id",
        username: "user-without-role",
      };

      expect(() => new JwtUserSubject(userWithoutRole)).toThrow(
        "JWT用户主体缺少必要的角色字段",
      );
    });

    it("should handle unknown/invalid role by setting empty permissions", () => {
      const userWithInvalidRole = {
        id: "test-id",
        role: "invalid-role" as UserRole,
      };

      const subject = new JwtUserSubject(userWithInvalidRole);

      expect(subject.role).toBe("invalid-role");
      expect(subject.permissions).toEqual([]);
    });

    it("should handle all valid user roles", () => {
      const roles = [UserRole.ADMIN, UserRole.DEVELOPER];

      roles.forEach((role) => {
        const user = {
          id: `user-${role}`,
          username: `user_${role}`,
          role,
        };

        const subject = new JwtUserSubject(user);

        expect(subject.role).toBe(role);
        expect(subject.permissions).toEqual(RolePermissions[role] || []);
      });
    });
  });

  describe("hasPermission()", () => {
    let adminSubject: JwtUserSubject;
    let developerSubject: JwtUserSubject;
    let userSubject: JwtUserSubject;

    beforeEach(() => {
      adminSubject = new JwtUserSubject({
        id: "admin",
        username: "admin",
        role: UserRole.ADMIN,
      });
      developerSubject = new JwtUserSubject({
        id: "developer",
        username: "developer",
        role: UserRole.DEVELOPER,
      });
      userSubject = new JwtUserSubject({
        id: "user",
        username: "user",
        role: UserRole.DEVELOPER,
      });
    });

    it("should return true for permissions the user role has", () => {
      // Admin should have all permissions
      expect(adminSubject.hasPermission(Permission.DATA_READ)).toBe(true);
      expect(adminSubject.hasPermission(Permission.USER_MANAGE)).toBe(true);
      expect(adminSubject.hasPermission(Permission.SYSTEM_ADMIN)).toBe(true);

      // Developer should have development permissions
      expect(developerSubject.hasPermission(Permission.DATA_READ)).toBe(true);
      expect(developerSubject.hasPermission(Permission.QUERY_EXECUTE)).toBe(
        true,
      );

      // User should have basic permissions
      expect(userSubject.hasPermission(Permission.DATA_READ)).toBe(true);
    });

    it("should return false for permissions the user role does not have", () => {
      // Developer should not have admin permissions
      expect(developerSubject.hasPermission(Permission.USER_MANAGE)).toBe(
        false,
      );
    });

    it("should handle non-existent permissions gracefully", () => {
      const invalidPermission = "INVALID_PERMISSION" as Permission;

      expect(adminSubject.hasPermission(invalidPermission)).toBe(false);
      expect(developerSubject.hasPermission(invalidPermission)).toBe(false);
      expect(userSubject.hasPermission(invalidPermission)).toBe(false);
    });
  });

  describe("hasAllPermissions()", () => {
    let adminSubject: JwtUserSubject;
    let developerSubject: JwtUserSubject;

    beforeEach(() => {
      adminSubject = new JwtUserSubject({
        id: "admin",
        username: "admin",
        role: UserRole.ADMIN,
      });
      developerSubject = new JwtUserSubject({
        id: "developer",
        username: "developer",
        role: UserRole.DEVELOPER,
      });
    });

    it("should return true when user has all specified permissions", () => {
      const adminPermissions = [Permission.DATA_READ, Permission.USER_MANAGE];
      const devPermissions = [Permission.DATA_READ, Permission.QUERY_EXECUTE];

      expect(adminSubject.hasAllPermissions(adminPermissions)).toBe(true);
      expect(developerSubject.hasAllPermissions(devPermissions)).toBe(true);
    });

    it("should return false when user is missing any permission", () => {
      const mixedPermissions = [Permission.DATA_READ, Permission.USER_MANAGE];

      expect(developerSubject.hasAllPermissions(mixedPermissions)).toBe(false);
    });

    it("should return true for empty permissions array", () => {
      expect(adminSubject.hasAllPermissions([])).toBe(true);
      expect(developerSubject.hasAllPermissions([])).toBe(true);
    });
  });

  describe("hasAnyPermission()", () => {
    let adminSubject: JwtUserSubject;
    let developerSubject: JwtUserSubject;
    let userSubject: JwtUserSubject;

    beforeEach(() => {
      adminSubject = new JwtUserSubject({
        id: "admin",
        username: "admin",
        role: UserRole.ADMIN,
      });
      developerSubject = new JwtUserSubject({
        id: "developer",
        username: "developer",
        role: UserRole.DEVELOPER,
      });
      userSubject = new JwtUserSubject({
        id: "user",
        username: "user",
        role: UserRole.DEVELOPER,
      });
    });

    it("should return true when user has at least one specified permission", () => {
      const mixedPermissions = [Permission.DATA_READ, Permission.SYSTEM_ADMIN];

      expect(adminSubject.hasAnyPermission(mixedPermissions)).toBe(true);
      expect(developerSubject.hasAnyPermission(mixedPermissions)).toBe(true);
      expect(userSubject.hasAnyPermission(mixedPermissions)).toBe(true);
    });

    it("should return false when user has none of the specified permissions", () => {
      const adminOnlyPermissions = [Permission.USER_MANAGE];

      expect(developerSubject.hasAnyPermission(adminOnlyPermissions)).toBe(
        false,
      );
    });

    it("should return false for empty permissions array", () => {
      expect(adminSubject.hasAnyPermission([])).toBe(false);
      expect(developerSubject.hasAnyPermission([])).toBe(false);
    });
  });

  describe("getDisplayName()", () => {
    it("should return formatted display name with username and role", () => {
      const subject = new JwtUserSubject(mockUserData);

      expect(subject.getDisplayName()).toBe("JWT用户: testuser (developer)");
    });

    it("should handle missing username", () => {
      const userWithoutUsername = {
        id: "test-id",
        username: undefined,
        role: UserRole.DEVELOPER,
      };
      const subject = new JwtUserSubject(userWithoutUsername);

      expect(subject.getDisplayName()).toBe("JWT用户: unknown (developer)");
    });

    it("should handle empty string username", () => {
      const userWithEmptyUsername = {
        id: "test-id",
        username: "",
        role: UserRole.ADMIN,
      };
      const subject = new JwtUserSubject(userWithEmptyUsername);

      expect(subject.getDisplayName()).toBe("JWT用户: unknown (admin)");
    });

    it("should display different roles correctly", () => {
      const roles = [UserRole.ADMIN, UserRole.DEVELOPER];

      roles.forEach((role) => {
        const user = {
          id: `user-${role}`,
          username: `user_${role}`,
          role,
        };
        const subject = new JwtUserSubject(user);

        expect(subject.getDisplayName()).toBe(
          `JWT用户: user_${role} (${role})`,
        );
      });
    });
  });

  describe("hasRole()", () => {
    let subject: JwtUserSubject;

    beforeEach(() => {
      subject = new JwtUserSubject(mockUserData);
    });

    it("should return true for matching role", () => {
      expect(subject.hasRole(UserRole.DEVELOPER)).toBe(true);
    });

    it("should return false for non-matching role", () => {
      expect(subject.hasRole(UserRole.ADMIN)).toBe(false);
    });

    it("should handle all valid roles", () => {
      const roles = [UserRole.ADMIN, UserRole.DEVELOPER];

      roles.forEach((role) => {
        const user = {
          id: `user-${role}`,
          role,
        };
        const testSubject = new JwtUserSubject(user);

        expect(testSubject.hasRole(role)).toBe(true);
        // Should not have other roles
        const otherRoles = roles.filter((r) => r !== role);
        otherRoles.forEach((otherRole) => {
          expect(testSubject.hasRole(otherRole)).toBe(false);
        });
      });
    });
  });

  describe("hasAnyRole()", () => {
    let adminSubject: JwtUserSubject;
    let developerSubject: JwtUserSubject;
    let userSubject: JwtUserSubject;

    beforeEach(() => {
      adminSubject = new JwtUserSubject({
        id: "admin",
        role: UserRole.ADMIN,
      });
      developerSubject = new JwtUserSubject({
        id: "developer",
        role: UserRole.DEVELOPER,
      });
      userSubject = new JwtUserSubject({
        id: "user",
        role: UserRole.DEVELOPER,
      });
    });

    it("should return true when user has any of the specified roles", () => {
      const privilegedRoles = [UserRole.ADMIN, UserRole.DEVELOPER];

      expect(adminSubject.hasAnyRole(privilegedRoles)).toBe(true);
      expect(developerSubject.hasAnyRole(privilegedRoles)).toBe(true);
    });

    it("should return false when user has none of the specified roles", () => {
      const adminOnlyRoles = [UserRole.ADMIN];

      expect(developerSubject.hasAnyRole(adminOnlyRoles)).toBe(false);
      expect(userSubject.hasAnyRole(adminOnlyRoles)).toBe(false);
    });

    it("should return false for empty roles array", () => {
      expect(adminSubject.hasAnyRole([])).toBe(false);
      expect(developerSubject.hasAnyRole([])).toBe(false);
    });

    it("should handle single role in array", () => {
      expect(adminSubject.hasAnyRole([UserRole.ADMIN])).toBe(true);
      expect(adminSubject.hasAnyRole([UserRole.DEVELOPER])).toBe(false);
    });
  });

  describe("getEffectivePermissions()", () => {
    it("should return copy of all permissions for the user role", () => {
      const subject = new JwtUserSubject(mockUserData);

      const effectivePermissions = subject.getEffectivePermissions();

      expect(effectivePermissions).toEqual(RolePermissions[UserRole.DEVELOPER]);
      // Should be a copy, not the same reference
      expect(effectivePermissions).not.toBe(subject.permissions);
    });

    it("should return empty array for unknown role", () => {
      const userWithUnknownRole = {
        id: "test-id",
        role: "unknown-role" as UserRole,
      };
      const subject = new JwtUserSubject(userWithUnknownRole);

      const effectivePermissions = subject.getEffectivePermissions();

      expect(effectivePermissions).toEqual([]);
    });

    it("should maintain immutability of original permissions", () => {
      const subject = new JwtUserSubject(mockUserData);
      const originalPermissions = [...subject.permissions];

      const effectivePermissions = subject.getEffectivePermissions();
      effectivePermissions.push(Permission.SYSTEM_ADMIN as any);

      expect(subject.permissions).toEqual(originalPermissions);
    });
  });

  describe("toJSON()", () => {
    it("should return JSON representation with all required fields", () => {
      const subject = new JwtUserSubject(mockUserData);

      const json = subject.toJSON();

      expect(json).toEqual({
        type: AuthSubjectType.JWT_USER,
        id: mockUserData.id,
        role: mockUserData.role,
        permissions: RolePermissions[UserRole.DEVELOPER],
        metadata: {
          username: mockUserData.username,
          isActive: mockUserData.isActive,
        },
      });
    });

    it("should exclude sensitive fields from JSON", () => {
      const subject = new JwtUserSubject(mockUserData);

      const json = subject.toJSON();

      expect(json.metadata).not.toHaveProperty("email");
      expect(json.metadata).not.toHaveProperty("lastLoginAt");
    });

    it("should handle missing optional metadata fields", () => {
      const minimalUser = {
        id: "minimal-user",
        role: UserRole.DEVELOPER,
      };
      const subject = new JwtUserSubject(minimalUser);

      const json = subject.toJSON();

      expect(json.metadata.username).toBeUndefined();
      expect(json.metadata.isActive).toBeUndefined();
    });

    it("should serialize correctly for all user roles", () => {
      const roles = [UserRole.ADMIN, UserRole.DEVELOPER];

      roles.forEach((role) => {
        const user = {
          id: `user-${role}`,
          username: `user_${role}`,
          role,
          isActive: true,
        };
        const subject = new JwtUserSubject(user);

        const json = subject.toJSON();

        expect(json.type).toBe(AuthSubjectType.JWT_USER);
        expect(json.role).toBe(role);
        expect(json.permissions).toEqual(RolePermissions[role] || []);
      });
    });
  });

  describe("Edge Cases and Error Handling", () => {
    it("should handle malformed user data gracefully", () => {
      const malformedUser = {
        id: "test-id",
        role: UserRole.DEVELOPER,
        lastLoginAt: "invalid-date",
        isActive: "not-a-boolean",
      };

      expect(() => new JwtUserSubject(malformedUser)).not.toThrow();

      const subject = new JwtUserSubject(malformedUser);
      expect(subject.id).toBe("test-id");
      expect(subject.role).toBe(UserRole.DEVELOPER);
    });

    it("should handle null and undefined values in metadata", () => {
      const userWithNulls = {
        id: "test-id",
        role: UserRole.DEVELOPER,
        username: null,
        email: undefined,
        isActive: null,
      };

      const subject = new JwtUserSubject(userWithNulls);

      expect(subject.metadata.username).toBeNull();
      expect(subject.metadata.email).toBeUndefined();
      expect(subject.metadata.isActive).toBeNull();
    });

    it("should work with frozen or sealed objects", () => {
      const frozenUser = Object.freeze({
        id: "frozen-user",
        role: UserRole.DEVELOPER,
        username: "frozen",
      });

      expect(() => new JwtUserSubject(frozenUser)).not.toThrow();

      const subject = new JwtUserSubject(frozenUser);
      expect(subject.id).toBe("frozen-user");
      expect(subject.role).toBe(UserRole.DEVELOPER);
    });
  });

  describe("Performance Considerations", () => {
    it("should efficiently handle permission lookups", () => {
      const start = performance.now();
      const subject = new JwtUserSubject(mockUserData);

      // Perform multiple permission checks
      for (let i = 0; i < 1000; i++) {
        subject.hasPermission(Permission.DATA_READ);
      }

      const end = performance.now();
      const duration = end - start;

      // Should complete within reasonable time
      expect(duration).toBeLessThan(100); // 100ms for 1000 operations
    });

    it("should not modify original user data", () => {
      const originalData = { ...mockUserData };
      const subject = new JwtUserSubject(mockUserData);

      // Attempt to modify subject
      subject.permissions.push(Permission.SYSTEM_ADMIN as any);

      // Original data should remain unchanged
      expect(mockUserData).toEqual(originalData);
    });

    it("should handle concurrent access patterns", () => {
      const subject = new JwtUserSubject(mockUserData);

      // Simulate concurrent permission checks
      const promises = Array.from({ length: 100 }, () =>
        Promise.resolve(subject.hasPermission(Permission.DATA_READ)),
      );

      return Promise.all(promises).then((results) => {
        expect(results.every((result) => result === true)).toBe(true);
      });
    });
  });

  describe("Integration with Role System", () => {
    it("should correctly map all defined roles to their permissions", () => {
      const allRoles = Object.values(UserRole);

      allRoles.forEach((role) => {
        const user = {
          id: `user-${role}`,
          role,
        };
        const subject = new JwtUserSubject(user);

        const expectedPermissions = RolePermissions[role] || [];
        expect(subject.permissions).toEqual(expectedPermissions);

        // Verify all permissions are accessible
        expectedPermissions.forEach((permission) => {
          expect(subject.hasPermission(permission)).toBe(true);
        });
      });
    });

    it("should maintain role hierarchy consistency", () => {
      const adminSubject = new JwtUserSubject({
        id: "admin",
        role: UserRole.ADMIN,
      });

      const developerSubject = new JwtUserSubject({
        id: "developer",
        role: UserRole.DEVELOPER,
      });

      const userSubject = new JwtUserSubject({
        id: "user",
        role: UserRole.DEVELOPER,
      });

      // Admin should have the most permissions
      expect(adminSubject.permissions.length).toBeGreaterThanOrEqual(
        developerSubject.permissions.length,
      );
      expect(developerSubject.permissions.length).toBeGreaterThanOrEqual(
        userSubject.permissions.length,
      );
    });
  });
});
