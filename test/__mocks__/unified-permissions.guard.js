/**
 * Mock for UnifiedPermissionsGuard
 */

class MockUnifiedPermissionsGuard {
  constructor() {}
  
  canActivate() {
    return true;
  }
}

module.exports = {
  UnifiedPermissionsGuard: MockUnifiedPermissionsGuard
};