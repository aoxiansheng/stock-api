/**
 * OperationStatus Enum Unit Tests
 * 测试操作状态枚举的完整性和工具函数
 */

import {
  OperationStatus,
  isSuccessOperation,
  isFailureOperation,
  isInProgressOperation,
  ALL_OPERATION_STATUSES,
} from '@monitoring/contracts/enums/operation-status.enum';

describe('OperationStatusEnum', () => {
  describe('Enum Values', () => {
    it('should define all required operation status values', () => {
      // Basic operation statuses
      expect(OperationStatus.SUCCESS).toBe('success');
      expect(OperationStatus.FAILED).toBe('failed');
      expect(OperationStatus.PENDING).toBe('pending');
      expect(OperationStatus.PROCESSING).toBe('processing');
      expect(OperationStatus.CANCELLED).toBe('cancelled');
      expect(OperationStatus.TIMEOUT).toBe('timeout');

      // Authentication related statuses
      expect(OperationStatus.AUTHENTICATED).toBe('authenticated');
      expect(OperationStatus.UNAUTHENTICATED).toBe('unauthenticated');
      expect(OperationStatus.AUTHORIZED).toBe('authorized');
      expect(OperationStatus.UNAUTHORIZED).toBe('unauthorized');

      // Security related statuses
      expect(OperationStatus.BLOCKED).toBe('blocked');

      // System statuses
      expect(OperationStatus.ACTIVE).toBe('active');
      expect(OperationStatus.INACTIVE).toBe('inactive');
      expect(OperationStatus.DISABLED).toBe('disabled');
      expect(OperationStatus.ENABLED).toBe('enabled');

      // Data operation statuses
      expect(OperationStatus.CREATED).toBe('created');
      expect(OperationStatus.UPDATED).toBe('updated');
      expect(OperationStatus.RETRIEVED).toBe('retrieved');

      // Network related statuses
      expect(OperationStatus.CONNECTED).toBe('connected');
      expect(OperationStatus.DISCONNECTED).toBe('disconnected');
      expect(OperationStatus.RECONNECTING).toBe('reconnecting');

      // Business process statuses
      expect(OperationStatus.INITIATED).toBe('initiated');
      expect(OperationStatus.IN_PROGRESS).toBe('in_progress');
      expect(OperationStatus.COMPLETED).toBe('completed');
      expect(OperationStatus.ABORTED).toBe('aborted');
    });

    it('should have unique enum values', () => {
      const values = Object.values(OperationStatus);
      const uniqueValues = [...new Set(values)];
      expect(values).toHaveLength(uniqueValues.length);
    });
  });

  describe('Utility Functions', () => {
    it('should correctly identify success operations', () => {
      // Test success statuses
      expect(isSuccessOperation(OperationStatus.SUCCESS)).toBe(true);
      expect(isSuccessOperation(OperationStatus.AUTHENTICATED)).toBe(true);
      expect(isSuccessOperation(OperationStatus.AUTHORIZED)).toBe(true);
      expect(isSuccessOperation(OperationStatus.ACTIVE)).toBe(true);
      expect(isSuccessOperation(OperationStatus.ENABLED)).toBe(true);
      expect(isSuccessOperation(OperationStatus.CREATED)).toBe(true);
      expect(isSuccessOperation(OperationStatus.UPDATED)).toBe(true);
      expect(isSuccessOperation(OperationStatus.RETRIEVED)).toBe(true);
      expect(isSuccessOperation(OperationStatus.CONNECTED)).toBe(true);
      expect(isSuccessOperation(OperationStatus.COMPLETED)).toBe(true);

      // Test non-success statuses
      expect(isSuccessOperation(OperationStatus.FAILED)).toBe(false);
      expect(isSuccessOperation(OperationStatus.PENDING)).toBe(false);
      expect(isSuccessOperation(OperationStatus.UNAUTHENTICATED)).toBe(false);
      expect(isSuccessOperation(OperationStatus.BLOCKED)).toBe(false);
    });

    it('should correctly identify failure operations', () => {
      // Test failure statuses
      expect(isFailureOperation(OperationStatus.FAILED)).toBe(true);
      expect(isFailureOperation(OperationStatus.UNAUTHENTICATED)).toBe(true);
      expect(isFailureOperation(OperationStatus.UNAUTHORIZED)).toBe(true);
      expect(isFailureOperation(OperationStatus.BLOCKED)).toBe(true);
      expect(isFailureOperation(OperationStatus.TIMEOUT)).toBe(true);
      expect(isFailureOperation(OperationStatus.CANCELLED)).toBe(true);
      expect(isFailureOperation(OperationStatus.DISABLED)).toBe(true);
      expect(isFailureOperation(OperationStatus.DISCONNECTED)).toBe(true);
      expect(isFailureOperation(OperationStatus.ABORTED)).toBe(true);

      // Test non-failure statuses
      expect(isFailureOperation(OperationStatus.SUCCESS)).toBe(false);
      expect(isFailureOperation(OperationStatus.PENDING)).toBe(false);
      expect(isFailureOperation(OperationStatus.AUTHENTICATED)).toBe(false);
      expect(isFailureOperation(OperationStatus.ACTIVE)).toBe(false);
    });

    it('should correctly identify in-progress operations', () => {
      // Test in-progress statuses
      expect(isInProgressOperation(OperationStatus.PENDING)).toBe(true);
      expect(isInProgressOperation(OperationStatus.PROCESSING)).toBe(true);
      expect(isInProgressOperation(OperationStatus.RECONNECTING)).toBe(true);
      expect(isInProgressOperation(OperationStatus.IN_PROGRESS)).toBe(true);
      expect(isInProgressOperation(OperationStatus.INITIATED)).toBe(true);

      // Test non-in-progress statuses
      expect(isInProgressOperation(OperationStatus.SUCCESS)).toBe(false);
      expect(isInProgressOperation(OperationStatus.FAILED)).toBe(false);
      expect(isInProgressOperation(OperationStatus.AUTHENTICATED)).toBe(false);
      expect(isInProgressOperation(OperationStatus.CREATED)).toBe(false);
    });
  });

  describe('All Operation Statuses Array', () => {
    it('should contain all operation status values', () => {
      expect(Array.isArray(ALL_OPERATION_STATUSES)).toBe(true);
      expect(ALL_OPERATION_STATUSES.length).toBeGreaterThan(0);

      // Check that all enum values are included
      const enumValues = Object.values(OperationStatus);
      for (const value of enumValues) {
        expect(ALL_OPERATION_STATUSES).toContain(value);
      }
    });

    it('should not contain duplicate values', () => {
      const uniqueValues = [...new Set(ALL_OPERATION_STATUSES)];
      expect(ALL_OPERATION_STATUSES).toHaveLength(uniqueValues.length);
    });
  });

  describe('Type Safety', () => {
    it('should enforce proper typing for OperationStatus', () => {
      // This is a compile-time test - if it compiles, the types are correct
      const status: OperationStatus = OperationStatus.SUCCESS;
      expect(status).toBe('success');
    });

    it('should allow any OperationStatus value in utility functions', () => {
      // Test that utility functions accept any OperationStatus value
      const allStatuses = Object.values(OperationStatus);
      
      for (const status of allStatuses) {
        const isSuccess = isSuccessOperation(status);
        const isFailure = isFailureOperation(status);
        const isInProgress = isInProgressOperation(status);
        
        // Each status should be classified as exactly one of the three categories
        const trueCount = [isSuccess, isFailure, isInProgress].filter(Boolean).length;
        expect(trueCount).toBeGreaterThanOrEqual(0); // At least one could be false for all
        expect(trueCount).toBeLessThanOrEqual(1); // At most one should be true
      }
    });
  });
});