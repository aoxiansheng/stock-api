import { PERMISSION_CONFIG } from '@auth/constants/permission-control.constants';

describe('Permission Control Constants', () => {
  describe('PERMISSION_CONFIG', () => {
    it('应该正确定义权限配置常量', () => {
      // Assert
      expect(PERMISSION_CONFIG).toBeDefined();
      expect(PERMISSION_CONFIG.CACHE_KEY_SEPARATOR).toBe(':');
      expect(PERMISSION_CONFIG.PERMISSION_LIST_SEPARATOR).toBe(',');
      expect(PERMISSION_CONFIG.ROLE_LIST_SEPARATOR).toBe(',');
    });
  });
});