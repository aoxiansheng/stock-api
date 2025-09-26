import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus } from '@nestjs/common';
import { TemplateController } from '@notification/controllers/template.controller';
import { NotificationTemplateService } from '@notification/services/notification-template.service';
import type {
  CreateTemplateDto,
  UpdateTemplateDto,
  TemplateRenderContext,
} from '@notification/services/notification-template.service';
import type { TemplateVariable } from '@notification/schemas/notification-template.schema';
import { TemplateQueryDto } from '@notification/dto/template-query.dto';
import { NOTIFICATION_ERROR_CODES } from '@notification/constants/notification-error-codes.constants';
import { BusinessErrorCode, ComponentIdentifier } from '@common/core/exceptions';

// Local interface definitions (matching template.controller.ts)
interface RenderTemplateDto {
  templateId: string;
  channelType?: string;
  variables: Record<string, any>;
  fallbackToDefault?: boolean;
}

interface BatchRenderDto {
  requests: RenderTemplateDto[];
}

interface DuplicateTemplateDto {
  newTemplateId: string;
  name?: string;
  description?: string;
  enabled?: boolean;
  priority?: number;
  tags?: string[];
  category?: string;
  metadata?: Record<string, any>;
}

// Local constants (matching template.controller.ts)
const VALIDATION_LIMITS = {
  CONTENT_MAX_LENGTH: 10000,
  TITLE_MAX_LENGTH: 500,
} as const;

describe('TemplateController', () => {
  let controller: TemplateController;
  let templateService: jest.Mocked<NotificationTemplateService>;

  const mockTemplate = {
    _id: 'template-object-id',
    templateId: 'test-template',
    name: 'Test Template',
    description: 'A test notification template',
    eventType: 'alert.triggered',
    templateType: 'user_defined',
    defaultContent: {
      subject: 'Test Alert: {{title}}',
      body: 'Alert: {{message}} at {{timestamp}}',
      format: 'markdown',
    },
    channelTemplates: {
      email: {
        template: {
          subject: 'Email Alert: {{title}}',
          body: 'Email body: {{message}}',
          format: 'html',
        },
      },
    },
    variables: [
      { name: 'title', type: 'string', description: 'Alert title', required: true },
      { name: 'message', type: 'string', description: 'Alert message', required: true },
      { name: 'timestamp', type: 'date', description: 'Alert timestamp', required: false },
    ] as TemplateVariable[],
    enabled: true,
    priority: 1,
    templateEngine: 'handlebars',
    tags: ['alert', 'notification'],
    category: 'system',
    usageCount: 5,
    lastUsedAt: new Date('2023-01-15T10:00:00Z'),
    createdAt: new Date('2023-01-01T00:00:00Z'),
    updatedAt: new Date('2023-01-10T00:00:00Z'),
    version: '1.0.0',
    metadata: { author: 'system' },
  };

  const mockPaginatedTemplates = {
    items: [mockTemplate],
    pagination: {
      page: 1,
      limit: 10,
      total: 1,
      totalPages: 1,
      hasNext: false,
      hasPrev: false,
    },
  };

  const mockRenderedTemplate = {
    subject: 'Test Alert: Critical Issue',
    body: 'Alert: System down at 2023-01-15T10:00:00Z',
    format: 'markdown',
    variables: {
      title: 'Critical Issue',
      message: 'System down',
      timestamp: '2023-01-15T10:00:00Z',
    },
    templateId: 'test-template',
    channelType: 'email',
  };

  const mockTemplateStats = {
    total: 25,
    byEventType: {
      'alert.triggered': 10,
      'alert.resolved': 8,
      'system.maintenance': 7,
    },
    byTemplateType: {
      user_defined: 20,
      system: 5,
    },
    byStatus: {
      enabled: 20,
      disabled: 5,
    },
    topUsed: [
      {
        templateId: 'popular-template',
        name: 'Popular Template',
        usageCount: 100,
      },
    ],
  };

  beforeEach(async () => {
    const mockTemplateService = {
      createTemplate: jest.fn(),
      queryTemplates: jest.fn(),
      findTemplateById: jest.fn(),
      updateTemplate: jest.fn(),
      deleteTemplate: jest.fn(),
      getTemplatesByEventType: jest.fn(),
      renderTemplate: jest.fn(),
      renderTemplatesBatch: jest.fn(),
      duplicateTemplate: jest.fn(),
      getTemplateStats: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [TemplateController],
      providers: [
        {
          provide: NotificationTemplateService,
          useValue: mockTemplateService,
        },
      ],
    }).compile();

    controller = module.get<TemplateController>(TemplateController);
    templateService = module.get(NotificationTemplateService);

    // Reset all mocks
    jest.clearAllMocks();
  });

  describe('createTemplate', () => {
    const createDto: CreateTemplateDto = {
      templateId: 'new-template',
      name: 'New Template',
      description: 'A new test template',
      eventType: 'alert.triggered',
      defaultContent: {
        subject: 'New Alert: {{title}}',
        body: 'New alert body: {{message}}',
        format: 'markdown',
      },
      variables: [
        { name: 'title', type: 'string', description: 'Alert title', required: true },
        { name: 'message', type: 'string', description: 'Alert message', required: true },
      ] as TemplateVariable[],
      enabled: true,
      templateEngine: 'handlebars',
      createdBy: 'test-user',
    };

    it('should create template successfully', async () => {
      const expectedTemplate = { ...mockTemplate, ...createDto };
      templateService.createTemplate.mockResolvedValue(expectedTemplate as any);

      const result = await controller.createTemplate(createDto);

      expect(templateService.createTemplate).toHaveBeenCalledWith(createDto);
      expect(result).toEqual(expectedTemplate);
    });

    it('should handle service errors during creation', async () => {
      templateService.createTemplate.mockRejectedValue(
        new Error('Template ID already exists'),
      );

      await expect(controller.createTemplate(createDto)).rejects.toThrow(
        'Template ID already exists',
      );
    });
  });

  describe('getTemplates', () => {
    it('should get templates with default query', async () => {
      const query: TemplateQueryDto = {};

      templateService.queryTemplates.mockResolvedValue(mockPaginatedTemplates as any);

      const result = await controller.getTemplates(query);

      expect(templateService.queryTemplates).toHaveBeenCalledWith(query);
      expect(result).toEqual(mockPaginatedTemplates);
    });

    it('should get templates with filters', async () => {
      const query: TemplateQueryDto = {
        page: 1,
        limit: 20,
        eventType: 'alert.triggered',
        templateType: 'user_defined',
        enabled: true,
        search: 'alert',
        tags: ['notification'],
      };

      templateService.queryTemplates.mockResolvedValue(mockPaginatedTemplates as any);

      const result = await controller.getTemplates(query);

      expect(templateService.queryTemplates).toHaveBeenCalledWith(query);
      expect(result).toEqual(mockPaginatedTemplates);
    });

    it('should handle empty results', async () => {
      const query: TemplateQueryDto = { search: 'nonexistent' };
      const emptyResult = {
        items: [],
        pagination: { page: 1, limit: 10, total: 0, totalPages: 0, hasNext: false, hasPrev: false },
      };

      templateService.queryTemplates.mockResolvedValue(emptyResult as any);

      const result = await controller.getTemplates(query);

      expect(result).toEqual(emptyResult);
    });
  });

  describe('getTemplate', () => {
    it('should get template by ID successfully', async () => {
      const templateId = 'test-template';

      templateService.findTemplateById.mockResolvedValue(mockTemplate as any);

      const result = await controller.getTemplate(templateId);

      expect(templateService.findTemplateById).toHaveBeenCalledWith(templateId);
      expect(result).toEqual(mockTemplate);
    });

    it('should handle template not found', async () => {
      const templateId = 'nonexistent-template';

      templateService.findTemplateById.mockRejectedValue(new Error('Template not found'));

      await expect(controller.getTemplate(templateId)).rejects.toThrow('Template not found');
    });
  });

  describe('updateTemplate', () => {
    const updateDto: UpdateTemplateDto = {
      name: 'Updated Template',
      description: 'Updated description',
      enabled: false,
    };

    it('should update template successfully', async () => {
      const templateId = 'test-template';
      const updatedTemplate = { ...mockTemplate, ...updateDto };

      templateService.updateTemplate.mockResolvedValue(updatedTemplate as any);

      const result = await controller.updateTemplate(templateId, updateDto);

      expect(templateService.updateTemplate).toHaveBeenCalledWith(templateId, updateDto);
      expect(result).toEqual(updatedTemplate);
    });

    it('should handle update errors', async () => {
      const templateId = 'nonexistent-template';

      templateService.updateTemplate.mockRejectedValue(new Error('Template not found'));

      await expect(controller.updateTemplate(templateId, updateDto)).rejects.toThrow(
        'Template not found',
      );
    });
  });

  describe('deleteTemplate', () => {
    it('should delete template successfully', async () => {
      const templateId = 'test-template';

      templateService.deleteTemplate.mockResolvedValue(undefined);

      const result = await controller.deleteTemplate(templateId);

      expect(templateService.deleteTemplate).toHaveBeenCalledWith(templateId);
      expect(result).toEqual({ message: '模板删除成功' });
    });

    it('should handle delete errors', async () => {
      const templateId = 'system-template';

      templateService.deleteTemplate.mockRejectedValue(
        new Error('Cannot delete system template'),
      );

      await expect(controller.deleteTemplate(templateId)).rejects.toThrow(
        'Cannot delete system template',
      );
    });
  });

  describe('getTemplatesByEventType', () => {
    it('should get templates by event type', async () => {
      const eventType = 'alert.triggered';
      const expectedTemplates = [mockTemplate];

      templateService.getTemplatesByEventType.mockResolvedValue(expectedTemplates as any);

      const result = await controller.getTemplatesByEventType(eventType);

      expect(templateService.getTemplatesByEventType).toHaveBeenCalledWith(eventType);
      expect(result).toEqual(expectedTemplates);
    });

    it('should handle empty results for event type', async () => {
      const eventType = 'nonexistent.event';

      templateService.getTemplatesByEventType.mockResolvedValue([]);

      const result = await controller.getTemplatesByEventType(eventType);

      expect(result).toEqual([]);
    });
  });

  describe('renderTemplate', () => {
    const renderDto: RenderTemplateDto = {
      templateId: 'test-template',
      channelType: 'email',
      variables: {
        title: 'Critical Issue',
        message: 'System down',
        timestamp: '2023-01-15T10:00:00Z',
      },
      fallbackToDefault: true,
    };

    it('should render template successfully', async () => {
      templateService.renderTemplate.mockResolvedValue(mockRenderedTemplate as any);

      const result = await controller.renderTemplate(renderDto);

      expect(templateService.renderTemplate).toHaveBeenCalledWith({
        templateId: renderDto.templateId,
        channelType: renderDto.channelType,
        variables: renderDto.variables,
        fallbackToDefault: renderDto.fallbackToDefault,
      });
      expect(result).toEqual(mockRenderedTemplate);
    });

    it('should throw error if templateId is missing', async () => {
      const invalidDto = {
        ...renderDto,
        templateId: '',
      };

      await expect(controller.renderTemplate(invalidDto)).rejects.toThrow();
    });

    it('should throw error if variables are missing', async () => {
      const invalidDto = {
        ...renderDto,
        variables: null as any,
      };

      await expect(controller.renderTemplate(invalidDto)).rejects.toThrow();
    });

    it('should handle template not found during rendering', async () => {
      templateService.renderTemplate.mockRejectedValue(new Error('Template not found'));

      await expect(controller.renderTemplate(renderDto)).rejects.toThrow('Template not found');
    });

    it('should handle variable validation errors', async () => {
      templateService.renderTemplate.mockRejectedValue(
        new Error('Variable validation failed: Missing required variable: title'),
      );

      await expect(controller.renderTemplate(renderDto)).rejects.toThrow('Variable validation failed');
    });
  });

  describe('renderTemplatesBatch', () => {
    const batchRenderDto: BatchRenderDto = {
      requests: [
        {
          templateId: 'template-1',
          variables: { title: 'Alert 1' },
        },
        {
          templateId: 'template-2',
          channelType: 'slack',
          variables: { title: 'Alert 2' },
        },
      ],
    };

    it('should render templates batch successfully', async () => {
      const expectedResults = [
        {
          ...mockRenderedTemplate,
          templateId: 'template-1',
          variables: { title: 'Alert 1' },
        },
        {
          ...mockRenderedTemplate,
          templateId: 'template-2',
          channelType: 'slack',
          variables: { title: 'Alert 2' },
        },
      ];

      templateService.renderTemplatesBatch.mockResolvedValue(expectedResults as any);

      const result = await controller.renderTemplatesBatch(batchRenderDto);

      expect(templateService.renderTemplatesBatch).toHaveBeenCalledWith([
        {
          templateId: 'template-1',
          channelType: undefined,
          variables: { title: 'Alert 1' },
          fallbackToDefault: undefined,
        },
        {
          templateId: 'template-2',
          channelType: 'slack',
          variables: { title: 'Alert 2' },
          fallbackToDefault: undefined,
        },
      ]);
      expect(result).toEqual(expectedResults);
    });

    it('should throw error if requests array is empty', async () => {
      const invalidDto = { requests: [] };

      await expect(controller.renderTemplatesBatch(invalidDto)).rejects.toThrow();
    });

    it('should throw error if requests array is missing', async () => {
      const invalidDto = { requests: null as any };

      await expect(controller.renderTemplatesBatch(invalidDto)).rejects.toThrow();
    });

    it('should throw error if too many requests', async () => {
      const tooManyRequests = Array.from({ length: 51 }, (_, i) => ({
        templateId: `template-${i}`,
        variables: { index: i },
      }));

      const invalidDto = { requests: tooManyRequests };

      await expect(controller.renderTemplatesBatch(invalidDto)).rejects.toThrow();
    });

    it('should handle partial batch failures', async () => {
      const partialResults = [mockRenderedTemplate];

      templateService.renderTemplatesBatch.mockResolvedValue(partialResults as any);

      const result = await controller.renderTemplatesBatch(batchRenderDto);

      expect(result).toEqual(partialResults);
    });
  });

  describe('duplicateTemplate', () => {
    const duplicateDto: DuplicateTemplateDto = {
      newTemplateId: 'duplicated-template',
      name: 'Duplicated Template',
      description: 'A duplicated template',
    };

    it('should duplicate template successfully', async () => {
      const sourceTemplateId = 'test-template';
      const expectedDuplicate = {
        ...mockTemplate,
        templateId: duplicateDto.newTemplateId,
        name: duplicateDto.name,
      };

      templateService.duplicateTemplate.mockResolvedValue(expectedDuplicate as any);

      const result = await controller.duplicateTemplate(sourceTemplateId, duplicateDto);

      expect(templateService.duplicateTemplate).toHaveBeenCalledWith(
        sourceTemplateId,
        duplicateDto.newTemplateId,
        {
          name: duplicateDto.name,
          description: duplicateDto.description,
          enabled: undefined,
          priority: undefined,
          tags: undefined,
          category: undefined,
          metadata: undefined,
        },
      );
      expect(result).toEqual(expectedDuplicate);
    });

    it('should throw error if newTemplateId is missing', async () => {
      const invalidDto = { ...duplicateDto, newTemplateId: '' };

      await expect(controller.duplicateTemplate('test-template', invalidDto)).rejects.toThrow();
    });

    it('should handle duplicate with minimal data', async () => {
      const minimalDto = { newTemplateId: 'minimal-duplicate' };
      const expectedDuplicate = { ...mockTemplate, templateId: 'minimal-duplicate' };

      templateService.duplicateTemplate.mockResolvedValue(expectedDuplicate as any);

      const result = await controller.duplicateTemplate('test-template', minimalDto);

      expect(templateService.duplicateTemplate).toHaveBeenCalledWith(
        'test-template',
        'minimal-duplicate',
        {
          name: undefined,
          description: undefined,
          enabled: undefined,
          priority: undefined,
          tags: undefined,
          category: undefined,
          metadata: undefined,
        },
      );
    });
  });

  describe('getTemplateStats', () => {
    it('should get template statistics', async () => {
      templateService.getTemplateStats.mockResolvedValue(mockTemplateStats);

      const result = await controller.getTemplateStats();

      expect(templateService.getTemplateStats).toHaveBeenCalled();
      expect(result).toEqual(mockTemplateStats);
    });

    it('should handle empty statistics', async () => {
      const emptyStats = {
        total: 0,
        byEventType: {},
        byTemplateType: {},
        byStatus: {},
        topUsed: [],
      };

      templateService.getTemplateStats.mockResolvedValue(emptyStats);

      const result = await controller.getTemplateStats();

      expect(result).toEqual(emptyStats);
    });
  });

  describe('validateTemplate', () => {
    it('should validate template successfully', async () => {
      const validateDto = {
        templateContent: 'Alert: {{message}} at {{timestamp}}',
        templateEngine: 'handlebars',
        variables: { message: 'test', timestamp: 'now' },
      };

      const result = await controller.validateTemplate(validateDto);

      expect(result).toEqual({
        valid: true,
        errors: [],
      });
    });

    it('should reject empty template content', async () => {
      const validateDto = {
        templateContent: '',
        templateEngine: 'handlebars',
      };

      const result = await controller.validateTemplate(validateDto);

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
    });

    it('should reject content that is too long', async () => {
      const longContent = 'x'.repeat(VALIDATION_LIMITS.CONTENT_MAX_LENGTH + 1);
      const validateDto = {
        templateContent: longContent,
        templateEngine: 'handlebars',
      };

      const result = await controller.validateTemplate(validateDto);

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('too long');
    });

    it('should handle validation with variables', async () => {
      const validateDto = {
        templateContent: 'Hello {{name}}',
        variables: { name: 'World' },
      };

      const result = await controller.validateTemplate(validateDto);

      expect(result.valid).toBe(true);
    });
  });

  describe('batchToggleTemplates', () => {
    it('should toggle templates successfully', async () => {
      const batchToggleDto = {
        templateIds: ['template-1', 'template-2'],
        enabled: false,
      };

      const updatedTemplate1 = { ...mockTemplate, templateId: 'template-1', enabled: false };
      const updatedTemplate2 = { ...mockTemplate, templateId: 'template-2', enabled: false };

      templateService.updateTemplate
        .mockResolvedValueOnce(updatedTemplate1 as any)
        .mockResolvedValueOnce(updatedTemplate2 as any);

      const result = await controller.batchToggleTemplates(batchToggleDto);

      expect(templateService.updateTemplate).toHaveBeenCalledWith('template-1', { enabled: false });
      expect(templateService.updateTemplate).toHaveBeenCalledWith('template-2', { enabled: false });
      expect(result).toEqual({
        successful: ['template-1', 'template-2'],
        failed: [],
        successCount: 2,
        failedCount: 0,
      });
    });

    it('should handle partial failures in batch toggle', async () => {
      const batchToggleDto = {
        templateIds: ['template-1', 'template-2'],
        enabled: true,
      };

      const updatedTemplate = { ...mockTemplate, templateId: 'template-1', enabled: true };

      templateService.updateTemplate
        .mockResolvedValueOnce(updatedTemplate as any)
        .mockRejectedValueOnce(new Error('Template not found'));

      const result = await controller.batchToggleTemplates(batchToggleDto);

      expect(result).toEqual({
        successful: ['template-1'],
        failed: [
          {
            templateId: 'template-2',
            error: 'Template not found',
          },
        ],
        successCount: 1,
        failedCount: 1,
      });
    });

    it('should throw error if templateIds array is empty', async () => {
      const invalidDto = { templateIds: [], enabled: true };

      await expect(controller.batchToggleTemplates(invalidDto)).rejects.toThrow();
    });

    it('should throw error if too many template IDs', async () => {
      const tooManyIds = Array.from({ length: 101 }, (_, i) => `template-${i}`);
      const invalidDto = { templateIds: tooManyIds, enabled: true };

      await expect(controller.batchToggleTemplates(invalidDto)).rejects.toThrow();
    });
  });

  describe('searchTemplatesByTags', () => {
    it('should search templates by single tag', async () => {
      const tags = 'alert';
      const expectedResult = {
        items: [mockTemplate],
        pagination: { page: 1, limit: 10, total: 1, totalPages: 1, hasNext: false, hasPrev: false },
      };

      templateService.queryTemplates.mockResolvedValue(expectedResult as any);

      const result = await controller.searchTemplatesByTags(tags);

      expect(templateService.queryTemplates).toHaveBeenCalledWith({
        tags: ['alert'],
        enabled: true,
      });
      expect(result).toEqual({
        items: expectedResult.items,
        total: expectedResult.pagination.total,
      });
    });

    it('should search templates by multiple tags', async () => {
      const tags = 'alert,notification,system';
      const expectedResult = {
        items: [mockTemplate],
        pagination: { page: 1, limit: 10, total: 1, totalPages: 1, hasNext: false, hasPrev: false },
      };

      templateService.queryTemplates.mockResolvedValue(expectedResult as any);

      const result = await controller.searchTemplatesByTags(tags);

      expect(templateService.queryTemplates).toHaveBeenCalledWith({
        tags: ['alert', 'notification', 'system'],
        enabled: true,
      });
    });

    it('should throw error if tags parameter is missing', async () => {
      await expect(controller.searchTemplatesByTags('')).rejects.toThrow();
    });

    it('should throw error if no valid tags after parsing', async () => {
      const invalidTags = ', , ,';

      await expect(controller.searchTemplatesByTags(invalidTags)).rejects.toThrow();
    });
  });

  describe('getTemplateUsage', () => {
    it('should get template usage information', async () => {
      const templateId = 'test-template';

      templateService.findTemplateById.mockResolvedValue(mockTemplate as any);

      const result = await controller.getTemplateUsage(templateId);

      expect(templateService.findTemplateById).toHaveBeenCalledWith(templateId);
      expect(result).toEqual({
        templateId: mockTemplate.templateId,
        name: mockTemplate.name,
        usageCount: mockTemplate.usageCount,
        lastUsedAt: mockTemplate.lastUsedAt,
        createdAt: mockTemplate.createdAt,
        updatedAt: mockTemplate.updatedAt,
      });
    });
  });

  describe('exportTemplate', () => {
    it('should export template configuration', async () => {
      const templateId = 'test-template';

      templateService.findTemplateById.mockResolvedValue(mockTemplate as any);

      const result = await controller.exportTemplate(templateId);

      expect(templateService.findTemplateById).toHaveBeenCalledWith(templateId);
      expect(result).toEqual({
        templateId: mockTemplate.templateId,
        name: mockTemplate.name,
        description: mockTemplate.description,
        eventType: mockTemplate.eventType,
        defaultContent: mockTemplate.defaultContent,
        channelTemplates: mockTemplate.channelTemplates,
        variables: mockTemplate.variables,
        priority: mockTemplate.priority,
        templateEngine: mockTemplate.templateEngine,
        tags: mockTemplate.tags,
        category: mockTemplate.category,
        metadata: mockTemplate.metadata,
        version: mockTemplate.version,
      });

      // Should not include internal fields like _id, usageCount, etc.
      expect(result).not.toHaveProperty('_id');
      expect(result).not.toHaveProperty('usageCount');
      expect(result).not.toHaveProperty('lastUsedAt');
    });
  });

  describe('importTemplate', () => {
    it('should import template configuration', async () => {
      const importData: CreateTemplateDto = {
        templateId: 'imported-template',
        name: 'Imported Template',
        eventType: 'alert.triggered',
        defaultContent: {
          subject: 'Imported: {{title}}',
          body: 'Imported template body',
          format: 'text',
        },
        variables: [
          { name: 'title', type: 'string', description: 'Alert title', required: true },
        ] as TemplateVariable[],
        createdBy: 'importer',
      };

      const expectedTemplate = {
        ...mockTemplate,
        ...importData,
        templateType: 'user_defined',
        enabled: true,
      };

      templateService.createTemplate.mockResolvedValue(expectedTemplate as any);

      const result = await controller.importTemplate(importData);

      expect(templateService.createTemplate).toHaveBeenCalledWith({
        ...importData,
        templateType: 'user_defined',
        enabled: true,
      });
      expect(result).toEqual(expectedTemplate);
    });
  });

  describe('error handling', () => {
    it('should handle service errors gracefully', async () => {
      templateService.findTemplateById.mockRejectedValue(new Error('Database connection failed'));

      await expect(controller.getTemplate('test-template')).rejects.toThrow(
        'Database connection failed',
      );
    });

    it('should handle validation errors in create', async () => {
      const invalidDto = {
        templateId: '',
        name: '',
        eventType: '',
      } as CreateTemplateDto;

      templateService.createTemplate.mockRejectedValue(new Error('Validation failed'));

      await expect(controller.createTemplate(invalidDto)).rejects.toThrow('Validation failed');
    });

    it('should handle network timeouts', async () => {
      templateService.queryTemplates.mockRejectedValue(new Error('Request timeout'));

      await expect(controller.getTemplates({})).rejects.toThrow('Request timeout');
    });
  });

  describe('input sanitization', () => {
    it('should handle special characters in template ID', async () => {
      const templateId = 'template-with-special-chars!@#$';

      templateService.findTemplateById.mockResolvedValue(mockTemplate as any);

      const result = await controller.getTemplate(templateId);

      expect(templateService.findTemplateById).toHaveBeenCalledWith(templateId);
    });

    it('should handle very long template IDs', async () => {
      const longTemplateId = 'x'.repeat(1000);

      templateService.findTemplateById.mockRejectedValue(new Error('Invalid template ID'));

      await expect(controller.getTemplate(longTemplateId)).rejects.toThrow('Invalid template ID');
    });

    it('should handle malformed query parameters', async () => {
      const malformedQuery = {
        page: 'invalid' as any,
        limit: -1 as any,
        enabled: 'not-boolean' as any,
      };

      templateService.queryTemplates.mockResolvedValue(mockPaginatedTemplates as any);

      // Controller should pass parameters as-is to service, service should handle validation
      await controller.getTemplates(malformedQuery);

      expect(templateService.queryTemplates).toHaveBeenCalledWith(malformedQuery);
    });
  });
});