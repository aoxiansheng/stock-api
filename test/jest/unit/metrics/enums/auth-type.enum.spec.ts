import { AuthType, AuthStatus, OperationStatus } from '../../../../../src/metrics/enums/auth-type.enum';

describe('Auth Type Enums', () => {
  describe('AuthType', () => {
    it('should be re-exported from common module', () => {
      expect(AuthType).toBeDefined();
      expect(typeof AuthType).toBe('object');
    });
  });

  describe('AuthStatus', () => {
    it('should have SUCCESS and FAILURE values', () => {
      expect(AuthStatus.SUCCESS).toBe('success');
      expect(AuthStatus.FAILURE).toBe('failure');
    });

    it('should only have string values', () => {
      Object.values(AuthStatus).forEach(value => {
        expect(typeof value).toBe('string');
      });
    });

    it('should be a valid enum object', () => {
      expect(Object.keys(AuthStatus)).toContain('SUCCESS');
      expect(Object.keys(AuthStatus)).toContain('FAILURE');
      expect(Object.keys(AuthStatus)).toHaveLength(2);
    });

    it('should have immutable values', () => {
      const originalValue = AuthStatus.SUCCESS;
      try {
        (AuthStatus as any).SUCCESS = 'modified';
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      } catch (_error) {
        // Expected in strict mode
      }
      expect(AuthStatus.SUCCESS).toBe(originalValue);
    });
  });

  describe('OperationStatus', () => {
    it('should have all required operation status values', () => {
      expect(OperationStatus.SUCCESS).toBe('success');
      expect(OperationStatus.ERROR).toBe('error');
      expect(OperationStatus.ALLOWED).toBe('allowed');
      expect(OperationStatus.BLOCKED).toBe('blocked');
      expect(OperationStatus.HIT).toBe('hit');
      expect(OperationStatus.MISS).toBe('miss');
    });

    it('should only have string values', () => {
      Object.values(OperationStatus).forEach(value => {
        expect(typeof value).toBe('string');
      });
    });

    it('should be a valid enum object', () => {
      const expectedKeys = ['SUCCESS', 'ERROR', 'ALLOWED', 'BLOCKED', 'HIT', 'MISS'];
      expect(Object.keys(OperationStatus)).toEqual(expect.arrayContaining(expectedKeys));
      expect(Object.keys(OperationStatus)).toHaveLength(expectedKeys.length);
    });

    it('should have lowercase string values', () => {
      Object.values(OperationStatus).forEach(value => {
        expect(value).toBe(value.toLowerCase());
      });
    });

    it('should support cache-related statuses', () => {
      expect(OperationStatus.HIT).toBeDefined();
      expect(OperationStatus.MISS).toBeDefined();
    });

    it('should support access control statuses', () => {
      expect(OperationStatus.ALLOWED).toBeDefined();
      expect(OperationStatus.BLOCKED).toBeDefined();
    });

    it('should support general operation statuses', () => {
      expect(OperationStatus.SUCCESS).toBeDefined();
      expect(OperationStatus.ERROR).toBeDefined();
    });
  });

  describe('Enum consistency', () => {
    it('should have consistent SUCCESS values across enums', () => {
      expect(AuthStatus.SUCCESS).toBe(OperationStatus.SUCCESS);
    });

    it('should maintain consistent naming conventions', () => {
      // All enum values should be lowercase strings
      [...Object.values(AuthStatus), ...Object.values(OperationStatus)].forEach(value => {
        expect(value).toMatch(/^[a-z]+$/);
      });
    });
  });
});
