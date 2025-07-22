import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { InternalServerErrorException } from '@nestjs/common';
import { Model } from 'mongoose';

import { SecurityAuditLogRepository } from '../../../../../src/security/repositories/security-audit-log.repository';
import { SecurityAuditLog, SecurityAuditLogDocument } from '../../../../../src/security/schemas/security-audit-log.schema';

// Mock logger
jest.mock('../../../../../src/common/config/logger.config', () => ({
  createLogger: jest.fn(() => ({
    debug: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    log: jest.fn(),
  })),
}));

describe('SecurityAuditLogRepository', () => {
  let repository: SecurityAuditLogRepository;
  let mockModel: any;

  const mockAuditLog = {
    id: 'log-123',
    timestamp: new Date('2024-01-01T00:00:00.000Z'),
    type: 'authentication',
    severity: 'medium',
    clientIP: '192.168.1.1',
    userId: 'user-123',
    outcome: 'success',
    description: 'User login successful',
    additionalData: {},
  };

  beforeEach(async () => {
    // Create comprehensive mock for Mongoose Model
    mockModel = {
      insertMany: jest.fn(),
      find: jest.fn().mockReturnThis(),
      sort: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      lean: jest.fn().mockReturnThis(),
      exec: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SecurityAuditLogRepository,
        {
          provide: getModelToken(SecurityAuditLog.name),
          useValue: mockModel,
        },
      ],
    }).compile();

    repository = module.get<SecurityAuditLogRepository>(SecurityAuditLogRepository);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('insertMany', () => {
    it('should insert multiple audit logs successfully', async () => {
      const logs = [mockAuditLog, { ...mockAuditLog, id: 'log-456' }];
      mockModel.insertMany.mockResolvedValue(logs as any);

      await repository.insertMany(logs);

      expect(mockModel.insertMany).toHaveBeenCalledWith(logs);
    });

    it('should insert single audit log successfully', async () => {
      const logs = [mockAuditLog];
      mockModel.insertMany.mockResolvedValue(logs as any);

      await repository.insertMany(logs);

      expect(mockModel.insertMany).toHaveBeenCalledWith(logs);
    });

    it('should handle empty array', async () => {
      const logs: any[] = [];
      mockModel.insertMany.mockResolvedValue([]);

      await repository.insertMany(logs);

      expect(mockModel.insertMany).toHaveBeenCalledWith([]);
    });

    it('should re-throw database errors', async () => {
      const logs = [mockAuditLog];
      const error = new Error('Database connection failed');
      mockModel.insertMany.mockRejectedValue(error);

      await expect(repository.insertMany(logs)).rejects.toThrow('Database connection failed');
      expect(mockModel.insertMany).toHaveBeenCalledWith(logs);
    });

    it('should handle validation errors', async () => {
      const logs = [{ invalidField: 'invalid' }];
      const validationError = new Error('Validation failed');
      mockModel.insertMany.mockRejectedValue(validationError);

      await expect(repository.insertMany(logs as any)).rejects.toThrow('Validation failed');
    });

    it('should handle duplicate key errors', async () => {
      const logs = [mockAuditLog, mockAuditLog]; // Duplicate
      const duplicateError = new Error('Duplicate key error');
      mockModel.insertMany.mockRejectedValue(duplicateError);

      await expect(repository.insertMany(logs)).rejects.toThrow('Duplicate key error');
    });
  });

  describe('findWithFilters', () => {
    beforeEach(() => {
      mockModel.exec.mockResolvedValue([mockAuditLog]);
    });

    describe('No filters', () => {
      it('should find all logs with default parameters', async () => {
        const result = await repository.findWithFilters();

        expect(mockModel.find).toHaveBeenCalledWith({});
        expect(mockModel.sort).toHaveBeenCalledWith({ timestamp: -1 });
        expect(mockModel.skip).toHaveBeenCalledWith(0);
        expect(mockModel.limit).toHaveBeenCalledWith(100);
        expect(mockModel.lean).toHaveBeenCalled();
        expect(mockModel.exec).toHaveBeenCalled();
        expect(result).toEqual([mockAuditLog]);
      });

      it('should use custom limit and offset', async () => {
        await repository.findWithFilters({}, 50, 10);

        expect(mockModel.limit).toHaveBeenCalledWith(50);
        expect(mockModel.skip).toHaveBeenCalledWith(10);
      });
    });

    describe('Date filters', () => {
      it('should filter by start date only', async () => {
        const startDate = new Date('2024-01-01');
        await repository.findWithFilters({ startDate });

        expect(mockModel.find).toHaveBeenCalledWith({
          timestamp: { $gte: startDate },
        });
      });

      it('should filter by end date only', async () => {
        const endDate = new Date('2024-01-31');
        await repository.findWithFilters({ endDate });

        expect(mockModel.find).toHaveBeenCalledWith({
          timestamp: { $lte: endDate },
        });
      });

      it('should filter by date range', async () => {
        const startDate = new Date('2024-01-01');
        const endDate = new Date('2024-01-31');
        await repository.findWithFilters({ startDate, endDate });

        expect(mockModel.find).toHaveBeenCalledWith({
          timestamp: { $gte: startDate, $lte: endDate },
        });
      });
    });

    describe('Individual filters', () => {
      it('should filter by type', async () => {
        await repository.findWithFilters({ type: 'authentication' });

        expect(mockModel.find).toHaveBeenCalledWith({
          type: 'authentication',
        });
      });

      it('should filter by severity', async () => {
        await repository.findWithFilters({ severity: 'high' });

        expect(mockModel.find).toHaveBeenCalledWith({
          severity: 'high',
        });
      });

      it('should filter by client IP', async () => {
        await repository.findWithFilters({ clientIP: '192.168.1.1' });

        expect(mockModel.find).toHaveBeenCalledWith({
          clientIP: '192.168.1.1',
        });
      });

      it('should filter by user ID', async () => {
        await repository.findWithFilters({ userId: 'user-123' });

        expect(mockModel.find).toHaveBeenCalledWith({
          userId: 'user-123',
        });
      });

      it('should filter by outcome', async () => {
        await repository.findWithFilters({ outcome: 'failure' });

        expect(mockModel.find).toHaveBeenCalledWith({
          outcome: 'failure',
        });
      });
    });

    describe('Combined filters', () => {
      it('should apply multiple filters simultaneously', async () => {
        const filters = {
          startDate: new Date('2024-01-01'),
          endDate: new Date('2024-01-31'),
          type: 'authentication',
          severity: 'high',
          clientIP: '192.168.1.1',
          userId: 'user-123',
          outcome: 'success',
        };

        await repository.findWithFilters(filters);

        expect(mockModel.find).toHaveBeenCalledWith({
          timestamp: { $gte: filters.startDate, $lte: filters.endDate },
          type: 'authentication',
          severity: 'high',
          clientIP: '192.168.1.1',
          userId: 'user-123',
          outcome: 'success',
        });
      });

      it('should ignore undefined filter values', async () => {
        const filters = {
          type: 'authentication',
          severity: undefined,
          clientIP: '',
        };

        await repository.findWithFilters(filters as any);

        // Should only include non-falsy values
        expect(mockModel.find).toHaveBeenCalledWith({
          type: 'authentication',
        });
      });
    });

    describe('Results and pagination', () => {
      it('should return empty array when no logs match', async () => {
        mockModel.exec.mockResolvedValue([]);

        const result = await repository.findWithFilters();

        expect(result).toEqual([]);
      });

      it('should return multiple matching logs', async () => {
        const multipleLogs = [
          mockAuditLog,
          { ...mockAuditLog, id: 'log-456' },
          { ...mockAuditLog, id: 'log-789' },
        ];
        mockModel.exec.mockResolvedValue(multipleLogs);

        const result = await repository.findWithFilters();

        expect(result).toEqual(multipleLogs);
      });

      it('should handle large offset values', async () => {
        await repository.findWithFilters({}, 10, 1000);

        expect(mockModel.skip).toHaveBeenCalledWith(1000);
        expect(mockModel.limit).toHaveBeenCalledWith(10);
      });

      it('should handle zero limit', async () => {
        await repository.findWithFilters({}, 0);

        expect(mockModel.limit).toHaveBeenCalledWith(0);
      });
    });

    describe('Error handling', () => {
      it('should throw InternalServerErrorException on database errors', async () => {
        const dbError = new Error('Database connection failed');
        mockModel.exec.mockRejectedValue(dbError);

        await expect(repository.findWithFilters())
          .rejects.toThrow(InternalServerErrorException);
        
        await expect(repository.findWithFilters())
          .rejects.toThrow('获取审计日志失败');
      });

      it('should handle query timeout errors', async () => {
        const timeoutError = new Error('Query timeout');
        mockModel.exec.mockRejectedValue(timeoutError);

        await expect(repository.findWithFilters())
          .rejects.toThrow(InternalServerErrorException);
      });

      it('should handle invalid query errors', async () => {
        const queryError = new Error('Invalid query syntax');
        mockModel.exec.mockRejectedValue(queryError);

        await expect(repository.findWithFilters())
          .rejects.toThrow(InternalServerErrorException);
      });

      it('should handle memory limit errors', async () => {
        const memoryError = new Error('Out of memory');
        mockModel.exec.mockRejectedValue(memoryError);

        await expect(repository.findWithFilters({}, 10000)) // Large limit
          .rejects.toThrow(InternalServerErrorException);
      });
    });

    describe('Edge cases', () => {
      it('should handle null filter values gracefully', async () => {
        const filters = {
          type: null,
          severity: null,
          clientIP: null,
        };

        await repository.findWithFilters(filters as any);

        expect(mockModel.find).toHaveBeenCalledWith({});
      });

      it('should handle special characters in filter values', async () => {
        const filters = {
          type: 'test-type_with@special!chars',
          clientIP: '::1', // IPv6
        };

        await repository.findWithFilters(filters);

        expect(mockModel.find).toHaveBeenCalledWith({
          type: 'test-type_with@special!chars',
          clientIP: '::1',
        });
      });

      it('should handle very long filter values', async () => {
        const longString = 'a'.repeat(1000);
        const filters = {
          type: longString,
        };

        await repository.findWithFilters(filters);

        expect(mockModel.find).toHaveBeenCalledWith({
          type: longString,
        });
      });

      it('should handle negative offset and limit values', async () => {
        await repository.findWithFilters({}, -10, -5);

        expect(mockModel.limit).toHaveBeenCalledWith(-10);
        expect(mockModel.skip).toHaveBeenCalledWith(-5);
      });
    });

    describe('Performance considerations', () => {
      it('should maintain correct query chain order', async () => {
        await repository.findWithFilters();

        // Verify the chain order: find -> sort -> skip -> limit -> lean -> exec
        expect(mockModel.find).toHaveBeenCalled();
        expect(mockModel.sort).toHaveBeenCalled();
        expect(mockModel.skip).toHaveBeenCalled();
        expect(mockModel.limit).toHaveBeenCalled();
        expect(mockModel.lean).toHaveBeenCalled();
        expect(mockModel.exec).toHaveBeenCalled();
      });

      it('should use lean queries for better performance', async () => {
        await repository.findWithFilters();

        expect(mockModel.lean).toHaveBeenCalled();
      });

      it('should sort by timestamp in descending order', async () => {
        await repository.findWithFilters();

        expect(mockModel.sort).toHaveBeenCalledWith({ timestamp: -1 });
      });
    });
  });

  describe('Integration scenarios', () => {
    it('should handle typical audit log workflow', async () => {
      // First insert some logs
      const logs = [mockAuditLog];
      mockModel.insertMany.mockResolvedValue(logs as any);
      
      await repository.insertMany(logs);

      // Then query them back
      mockModel.exec.mockResolvedValue(logs);
      const result = await repository.findWithFilters({ 
        type: 'authentication',
        outcome: 'success',
      });

      expect(result).toEqual(logs);
      expect(mockModel.insertMany).toHaveBeenCalledWith(logs);
      expect(mockModel.find).toHaveBeenCalledWith({
        type: 'authentication',
        outcome: 'success',
      });
    });

    it('should handle concurrent operations', async () => {
      const logs1 = [{ ...mockAuditLog, id: 'log-1' }];
      const logs2 = [{ ...mockAuditLog, id: 'log-2' }];
      
      mockModel.insertMany.mockResolvedValue([...logs1, ...logs2] as any);

      // Simulate concurrent inserts
      const insert1 = repository.insertMany(logs1);
      const insert2 = repository.insertMany(logs2);

      await Promise.all([insert1, insert2]);

      expect(mockModel.insertMany).toHaveBeenCalledTimes(2);
    });
  });
});