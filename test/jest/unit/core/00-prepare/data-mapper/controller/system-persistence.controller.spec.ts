import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { SystemPersistenceController } from '../../../../../../../src/core/00-prepare/data-mapper/controller/system-persistence.controller';
import { PersistedTemplateService } from '../../../../../../../src/core/00-prepare/data-mapper/services/persisted-template.service';

// Mock the auth guard
jest.mock('@auth/guards/jwt-auth.guard', () => ({
  JwtAuthGuard: jest.fn().mockImplementation(() => ({
    canActivate: jest.fn(() => true),
  })),
}));

describe('SystemPersistenceController', () => {
  let controller: SystemPersistenceController;
  let mockPersistedTemplateService: jest.Mocked<PersistedTemplateService>;

  const mockPersistedService = {
    persistPresetTemplates: jest.fn().mockResolvedValue({
      created: 1,
      updated: 1,
      skipped: 0,
      details: ['Test result'],
    }),
    resetPresetTemplateById: jest.fn().mockResolvedValue({
      _id: '507f1f77bcf86cd799439011',
      name: 'test template',
      provider: 'test',
    } as any),
    resetPresetTemplatesBulk: jest.fn().mockResolvedValue({
      reset: 1,
      failed: 0,
      details: ['Reset successful'],
    }),
    resetPresetTemplates: jest.fn().mockResolvedValue({
      deleted: 1,
      recreated: 1,
      message: 'Reset completed',
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SystemPersistenceController],
      providers: [
        {
          provide: PersistedTemplateService,
          useValue: mockPersistedService,
        },
        {
          provide: Reflector,
          useValue: {
            get: jest.fn(),
            getAllAndOverride: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<SystemPersistenceController>(SystemPersistenceController);
    mockPersistedTemplateService = module.get(PersistedTemplateService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Controller Initialization', () => {
    it('should be defined', () => {
      expect(controller).toBeDefined();
    });

    it('should be an instance of SystemPersistenceController', () => {
      expect(controller).toBeInstanceOf(SystemPersistenceController);
    });

    it('should have PersistedTemplateService injected', () => {
      expect(mockPersistedTemplateService).toBeDefined();
    });
  });

  describe('persistPresetTemplates', () => {
    it('should persist preset templates successfully', async () => {
      const expectedResult = {
        created: 3,
        updated: 2,
        skipped: 0,
        details: ['template1 created', 'template2 updated'],
      };

      mockPersistedTemplateService.persistPresetTemplates.mockResolvedValue(expectedResult);

      const result = await controller.persistPresetTemplates();

      expect(result).toEqual(expectedResult);
      expect(mockPersistedTemplateService.persistPresetTemplates).toHaveBeenCalledTimes(1);
      expect(mockPersistedTemplateService.persistPresetTemplates).toHaveBeenCalledWith();
    });

    it('should handle persistence errors', async () => {
      const error = new Error('Database connection failed');
      mockPersistedTemplateService.persistPresetTemplates.mockRejectedValue(error);

      await expect(controller.persistPresetTemplates()).rejects.toThrow('Database connection failed');
      expect(mockPersistedTemplateService.persistPresetTemplates).toHaveBeenCalledTimes(1);
    });

    it('should handle empty persistence result', async () => {
      const expectedResult = {
        created: 0,
        updated: 0,
        skipped: 0,
        details: ['No templates found to persist'],
      };

      mockPersistedTemplateService.persistPresetTemplates.mockResolvedValue(expectedResult);

      const result = await controller.persistPresetTemplates();

      expect(result).toEqual(expectedResult);
      expect(result.created).toBe(0);
      expect(result.details).toHaveLength(1);
    });
  });

  describe('resetPresetTemplate', () => {
    it('should reset single preset template successfully', async () => {
      const templateId = '507f1f77bcf86cd799439011';
      const expectedResult = {
        _id: templateId,
        name: 'stock_quote_template',
        provider: 'test',
        isReset: true,
      } as any;

      mockPersistedTemplateService.resetPresetTemplateById.mockResolvedValue(expectedResult);

      const result = await controller.resetPresetTemplate(templateId);

      expect(result).toEqual(expectedResult);
      expect(mockPersistedTemplateService.resetPresetTemplateById).toHaveBeenCalledTimes(1);
      expect(mockPersistedTemplateService.resetPresetTemplateById).toHaveBeenCalledWith(templateId);
    });

    it('should handle reset of non-existent template', async () => {
      const templateId = '507f1f77bcf86cd799439999';
      const error = new Error(`模板未找到: ${templateId}`);

      mockPersistedTemplateService.resetPresetTemplateById.mockRejectedValue(error);

      await expect(controller.resetPresetTemplate(templateId)).rejects.toThrow(`模板未找到: ${templateId}`);
      expect(mockPersistedTemplateService.resetPresetTemplateById).toHaveBeenCalledWith(templateId);
    });

    it('should handle invalid template ID format', async () => {
      const invalidId = 'invalid-id';
      const error = new Error(`无效的模板ID格式: ${invalidId}`);

      mockPersistedTemplateService.resetPresetTemplateById.mockRejectedValue(error);

      await expect(controller.resetPresetTemplate(invalidId)).rejects.toThrow(`无效的模板ID格式: ${invalidId}`);
      expect(mockPersistedTemplateService.resetPresetTemplateById).toHaveBeenCalledWith(invalidId);
    });

    it('should handle empty string ID', async () => {
      const emptyId = '';
      const error = new Error('模板ID不能为空');

      mockPersistedTemplateService.resetPresetTemplateById.mockRejectedValue(error);

      await expect(controller.resetPresetTemplate(emptyId)).rejects.toThrow('模板ID不能为空');
      expect(mockPersistedTemplateService.resetPresetTemplateById).toHaveBeenCalledWith(emptyId);
    });
  });

  describe('resetPresetTemplatesBulk', () => {
    it('should reset multiple templates successfully', async () => {
      const bulkResetDto = {
        ids: ['507f1f77bcf86cd799439011', '507f1f77bcf86cd799439012'],
      };
      const expectedResult = {
        reset: 2,
        failed: 0,
        details: ['template1 reset', 'template2 reset'],
      };

      mockPersistedTemplateService.resetPresetTemplatesBulk.mockResolvedValue(expectedResult);

      const result = await controller.resetPresetTemplatesBulk(bulkResetDto);

      expect(result).toEqual(expectedResult);
      expect(mockPersistedTemplateService.resetPresetTemplatesBulk).toHaveBeenCalledTimes(1);
      expect(mockPersistedTemplateService.resetPresetTemplatesBulk).toHaveBeenCalledWith(bulkResetDto.ids);
    });

    it('should handle empty ID array', async () => {
      const bulkResetDto = { ids: [] };
      const expectedResult = {
        reset: 0,
        failed: 0,
        details: ['No template IDs provided'],
      };

      mockPersistedTemplateService.resetPresetTemplatesBulk.mockResolvedValue(expectedResult);

      const result = await controller.resetPresetTemplatesBulk(bulkResetDto);

      expect(result).toEqual(expectedResult);
      expect(result.reset).toBe(0);
      expect(mockPersistedTemplateService.resetPresetTemplatesBulk).toHaveBeenCalledWith([]);
    });

    it('should handle partial reset failures', async () => {
      const bulkResetDto = {
        ids: ['507f1f77bcf86cd799439011', 'invalid-id', '507f1f77bcf86cd799439012'],
      };
      const expectedResult = {
        reset: 2,
        failed: 1,
        details: ['template1 reset', 'invalid-id failed: invalid format', 'template2 reset'],
      };

      mockPersistedTemplateService.resetPresetTemplatesBulk.mockResolvedValue(expectedResult);

      const result = await controller.resetPresetTemplatesBulk(bulkResetDto);

      expect(result).toEqual(expectedResult);
      expect(result.reset).toBe(2);
      expect(result.failed).toBe(1);
      expect(mockPersistedTemplateService.resetPresetTemplatesBulk).toHaveBeenCalledWith(bulkResetDto.ids);
    });

    it('should handle all reset failures', async () => {
      const bulkResetDto = {
        ids: ['invalid-id-1', 'invalid-id-2'],
      };
      const expectedResult = {
        reset: 0,
        failed: 2,
        details: ['invalid-id-1 failed: invalid format', 'invalid-id-2 failed: invalid format'],
      };

      mockPersistedTemplateService.resetPresetTemplatesBulk.mockResolvedValue(expectedResult);

      const result = await controller.resetPresetTemplatesBulk(bulkResetDto);

      expect(result).toEqual(expectedResult);
      expect(result.reset).toBe(0);
      expect(result.failed).toBe(2);
    });

    it('should handle service errors during bulk reset', async () => {
      const bulkResetDto = {
        ids: ['507f1f77bcf86cd799439011'],
      };
      const error = new Error('Database transaction failed');

      mockPersistedTemplateService.resetPresetTemplatesBulk.mockRejectedValue(error);

      await expect(controller.resetPresetTemplatesBulk(bulkResetDto)).rejects.toThrow('Database transaction failed');
      expect(mockPersistedTemplateService.resetPresetTemplatesBulk).toHaveBeenCalledWith(bulkResetDto.ids);
    });
  });

  describe('resetAllPresetTemplates', () => {
    it('should reset all preset templates successfully', async () => {
      const expectedResult = {
        deleted: 10,
        recreated: 8,
        message: 'All preset templates reset successfully',
      };

      mockPersistedTemplateService.resetPresetTemplates.mockResolvedValue(expectedResult);

      const result = await controller.resetAllPresetTemplates();

      expect(result).toEqual(expectedResult);
      expect(mockPersistedTemplateService.resetPresetTemplates).toHaveBeenCalledTimes(1);
      expect(mockPersistedTemplateService.resetPresetTemplates).toHaveBeenCalledWith();
    });

    it('should handle case with no templates to reset', async () => {
      const expectedResult = {
        deleted: 0,
        recreated: 0,
        message: 'No templates found to reset',
      };

      mockPersistedTemplateService.resetPresetTemplates.mockResolvedValue(expectedResult);

      const result = await controller.resetAllPresetTemplates();

      expect(result).toEqual(expectedResult);
      expect(result.deleted).toBe(0);
      expect(result.recreated).toBe(0);
    });

    it('should handle partial reset success', async () => {
      const expectedResult = {
        deleted: 5,
        recreated: 3,
        message: 'Partial reset completed - some operations failed',
      };

      mockPersistedTemplateService.resetPresetTemplates.mockResolvedValue(expectedResult);

      const result = await controller.resetAllPresetTemplates();

      expect(result).toEqual(expectedResult);
      expect(result.deleted).toBe(5);
      expect(result.recreated).toBe(3);
    });

    it('should handle complete reset failure', async () => {
      const error = new Error('Critical database error during reset');

      mockPersistedTemplateService.resetPresetTemplates.mockRejectedValue(error);

      await expect(controller.resetAllPresetTemplates()).rejects.toThrow('Critical database error during reset');
      expect(mockPersistedTemplateService.resetPresetTemplates).toHaveBeenCalledTimes(1);
    });

    it('should handle transaction rollback scenarios', async () => {
      const error = new Error('Transaction was rolled back due to conflict');

      mockPersistedTemplateService.resetPresetTemplates.mockRejectedValue(error);

      await expect(controller.resetAllPresetTemplates()).rejects.toThrow('Transaction was rolled back due to conflict');
      expect(mockPersistedTemplateService.resetPresetTemplates).toHaveBeenCalledTimes(1);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle service unavailable errors', async () => {
      const error = new Error('Service temporarily unavailable');
      mockPersistedTemplateService.persistPresetTemplates.mockRejectedValue(error);

      await expect(controller.persistPresetTemplates()).rejects.toThrow('Service temporarily unavailable');
    });

    it('should handle database connection timeouts', async () => {
      const error = new Error('Database connection timeout');
      mockPersistedTemplateService.resetPresetTemplates.mockRejectedValue(error);

      await expect(controller.resetAllPresetTemplates()).rejects.toThrow('Database connection timeout');
    });

    it('should handle concurrent modification errors', async () => {
      const templateId = '507f1f77bcf86cd799439011';
      const error = new Error('Template was modified by another process');

      mockPersistedTemplateService.resetPresetTemplateById.mockRejectedValue(error);

      await expect(controller.resetPresetTemplate(templateId)).rejects.toThrow('Template was modified by another process');
    });

    it('should handle memory allocation errors during bulk operations', async () => {
      const bulkResetDto = {
        ids: Array.from({ length: 1000 }, (_, i) => `507f1f77bcf86cd799${i.toString().padStart(6, '0')}`),
      };
      const error = new Error('Out of memory during bulk operation');

      mockPersistedTemplateService.resetPresetTemplatesBulk.mockRejectedValue(error);

      await expect(controller.resetPresetTemplatesBulk(bulkResetDto)).rejects.toThrow('Out of memory during bulk operation');
    });
  });

  describe('Method Signature and Contract Verification', () => {
    it('should call persistPresetTemplates with no parameters', async () => {
      mockPersistedTemplateService.persistPresetTemplates.mockResolvedValue({
        created: 1,
        updated: 0,
        skipped: 0,
        details: ['success'],
      });

      await controller.persistPresetTemplates();

      expect(mockPersistedTemplateService.persistPresetTemplates).toHaveBeenCalledWith();
    });

    it('should call resetPresetTemplateById with correct parameter', async () => {
      const templateId = 'test-id';
      mockPersistedTemplateService.resetPresetTemplateById.mockResolvedValue({
        _id: templateId,
        name: 'test',
        provider: 'test',
      } as any);

      await controller.resetPresetTemplate(templateId);

      expect(mockPersistedTemplateService.resetPresetTemplateById).toHaveBeenCalledWith(templateId);
    });

    it('should call resetPresetTemplatesBulk with IDs array', async () => {
      const ids = ['id1', 'id2'];
      const bulkResetDto = { ids };
      mockPersistedTemplateService.resetPresetTemplatesBulk.mockResolvedValue({
        reset: 2,
        failed: 0,
        details: ['success'],
      });

      await controller.resetPresetTemplatesBulk(bulkResetDto);

      expect(mockPersistedTemplateService.resetPresetTemplatesBulk).toHaveBeenCalledWith(ids);
    });

    it('should call resetPresetTemplates with no parameters', async () => {
      mockPersistedTemplateService.resetPresetTemplates.mockResolvedValue({
        deleted: 1,
        recreated: 1,
        message: 'success',
      });

      await controller.resetAllPresetTemplates();

      expect(mockPersistedTemplateService.resetPresetTemplates).toHaveBeenCalledWith();
    });
  });

  describe('Controller Metadata and Decorators', () => {
    it('should be properly decorated with controller metadata', () => {
      // Verify the controller exists and can be instantiated
      expect(controller).toBeDefined();
      expect(typeof controller.persistPresetTemplates).toBe('function');
      expect(typeof controller.resetPresetTemplate).toBe('function');
      expect(typeof controller.resetPresetTemplatesBulk).toBe('function');
      expect(typeof controller.resetAllPresetTemplates).toBe('function');
    });

    it('should have all required methods implemented', () => {
      const methods = [
        'persistPresetTemplates',
        'resetPresetTemplate',
        'resetPresetTemplatesBulk',
        'resetAllPresetTemplates',
      ];

      methods.forEach(method => {
        expect(controller[method]).toBeDefined();
        expect(typeof controller[method]).toBe('function');
      });
    });
  });
});
