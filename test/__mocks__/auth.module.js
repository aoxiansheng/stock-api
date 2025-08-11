/**
 * Mock for entire Auth module to prevent dependency resolution issues
 */

class MockPermissionService {
  constructor() {}
  hasPermission() { return true; }
  checkPermissions() { return true; }
  getUserPermissions() { return ['data:read', 'data:write']; }
  validateApiKeyPermissions() { return true; }
  validateUserRolePermissions() { return true; }
}

class MockUnifiedPermissionsGuard {
  constructor() {}
  canActivate() { return true; }
}

class MockAuthModule {
  constructor() {}
}

module.exports = {
  PermissionService: MockPermissionService,
  UnifiedPermissionsGuard: MockUnifiedPermissionsGuard,
  AuthModule: MockAuthModule
};