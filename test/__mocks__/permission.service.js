/**
 * Mock for PermissionService
 */

class MockPermissionService {
  constructor() {
    this.logger = {
      log: jest.fn(),
      debug: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    };
    
    this.checkPermissions = jest.fn().mockImplementation(async (subject, requiredPermissions = [], requiredRoles = []) => ({
      allowed: true,
      missingPermissions: [],
      missingRoles: [],
      duration: 0,
      details: "Mock permission check passed",
    }));
    
    this.combinePermissions = jest.fn().mockImplementation((...permissionLists) => {
      const combined = new Set(permissionLists.flat());
      return Array.from(combined);
    });
    
    this.getEffectivePermissions = jest.fn().mockImplementation((subject) => [...subject.permissions]);
    
    this.createPermissionContext = jest.fn().mockImplementation(async (subject, requiredPermissions = [], requiredRoles = []) => ({
      subject,
      requiredPermissions,
      requiredRoles,
      grantedPermissions: [...subject.permissions],
      hasAccess: true,
      details: {
        missingPermissions: [],
        timestamp: new Date(),
        duration: 0,
      },
    }));
    
    this.invalidateCacheFor = jest.fn().mockResolvedValue(undefined);
  }
}

module.exports = {
  PermissionService: MockPermissionService
};