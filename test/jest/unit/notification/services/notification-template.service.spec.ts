import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { NotificationTemplateService } from '@notification/services/notification-template.service';
import { PaginationService } from '@common/modules/pagination/services/pagination.service';
import {
  NotificationTemplate,
  NotificationTemplateDocument,
  TemplateContent,
  TemplateEngine,
  TemplateVariable,
} from '@notification/schemas/notification-template.schema';
import type {
  CreateTemplateDto,
  UpdateTemplateDto,
  TemplateRenderContext,
  RenderedTemplate,
} from '@notification/services/notification-template.service';
import { TemplateQueryDto } from '@notification/dto/template-query.dto';

// Local constants (matching template.controller.ts)
const VALIDATION_LIMITS = {
  CONTENT_MAX_LENGTH: 10000,
  TITLE_MAX_LENGTH: 500,
} as const;
import { BusinessErrorCode, ComponentIdentifier } from '@common/core/exceptions';

describe('NotificationTemplateService', () => {
  let service: NotificationTemplateService;
  let templateModel: any;
  let paginationService: jest.Mocked<PaginationService>;

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
      format: 'markdown' as const,
    },
    channelTemplates: {
      email: {
        template: {
          subject: 'Email Alert: {{title}}',
          body: 'Email body: {{message}}',
          format: 'html' as const,
        },
      },
    },
    variables: ['title', 'message', 'timestamp'],
    enabled: true,
    priority: 1,
    templateEngine: 'handlebars' as TemplateEngine,
    tags: ['alert', 'notification'],
    category: 'system',
    usageCount: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    save: jest.fn(),
    incrementUsage: jest.fn(),
    validateVariables: jest.fn(),
    getChannelTemplate: jest.fn(),
  };

  const mockCreateTemplateDto: CreateTemplateDto = {
    templateId: 'new-template',
    name: 'New Template',
    description: 'A new test template',
    eventType: 'alert.triggered',
    defaultContent: {
      subject: 'New Alert: {{title}}',
      body: 'New alert body: {{message}}',
      format: 'markdown' as const,
    },
    variables: [
      { name: 'title', type: 'string', description: 'Alert title', required: true },
      { name: 'message', type: 'string', description: 'Alert message', required: true },
    ] as TemplateVariable[],
    enabled: true,
    templateEngine: 'handlebars',
    createdBy: 'test-user',
  };

  beforeEach(async () => {
    const mockModelMethods = {
      findOne: jest.fn(),
      find: jest.fn(),
      countDocuments: jest.fn(),
      deleteOne: jest.fn(),
      aggregate: jest.fn(),
      save: jest.fn(),
      sort: jest.fn(),
      skip: jest.fn(),
      limit: jest.fn(),
      select: jest.fn(),
      exec: jest.fn(),
    };

    // Mock methods return chainable objects
    Object.keys(mockModelMethods).forEach((method) => {
      if (['sort', 'skip', 'limit', 'select'].includes(method)) {
        mockModelMethods[method].mockReturnThis();
      }
    });

    templateModel = {
      ...mockModelMethods,
      constructor: jest.fn().mockImplementation((dto) => ({
        ...dto,
        save: jest.fn().mockResolvedValue({ ...mockTemplate, ...dto }),
      })),
    } as any;

    paginationService = {
      normalizePaginationQuery: jest.fn(),
      calculateSkip: jest.fn(),
      createPaginatedResponse: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationTemplateService,
        {
          provide: getModelToken(NotificationTemplate.name),
          useValue: templateModel,
        },
        {
          provide: PaginationService,
          useValue: paginationService,
        },
      ],
    }).compile();

    service = module.get<NotificationTemplateService>(NotificationTemplateService);

    // Reset mocks
    jest.clearAllMocks();
  });

  describe('createTemplate', () => {
    it('should create a new template successfully', async () => {
      templateModel.findOne.mockResolvedValue(null);
      const savedTemplate = { ...mockTemplate, ...mockCreateTemplateDto };

      // Mock the constructor to return an object with save method
      const mockInstance = {
        ...mockCreateTemplateDto,
        save: jest.fn().mockResolvedValue(savedTemplate),
      };
      (templateModel.constructor as jest.Mock).mockReturnValue(mockInstance);

      const result = await service.createTemplate(mockCreateTemplateDto);

      expect(templateModel.findOne).toHaveBeenCalledWith({
        templateId: mockCreateTemplateDto.templateId,
      });
      expect(mockInstance.save).toHaveBeenCalled();
      expect(result).toEqual(savedTemplate);
    });

    it('should throw error if template ID already exists', async () => {
      templateModel.findOne.mockResolvedValue(mockTemplate);

      await expect(service.createTemplate(mockCreateTemplateDto)).rejects.toThrow();

      expect(templateModel.findOne).toHaveBeenCalledWith({
        templateId: mockCreateTemplateDto.templateId,
      });
    });

    it('should validate template content', async () => {
      const invalidDto = {
        ...mockCreateTemplateDto,
        defaultContent: {
          subject: 'Valid subject',
          body: '', // Empty body
          format: 'markdown' as const,
        },
      };

      templateModel.findOne.mockResolvedValue(null);

      await expect(service.createTemplate(invalidDto)).rejects.toThrow();
    });

    it('should validate template content length limits', async () => {
      const longContent = 'x'.repeat(VALIDATION_LIMITS.CONTENT_MAX_LENGTH + 1);
      const invalidDto = {
        ...mockCreateTemplateDto,
        defaultContent: {
          subject: 'Valid subject',
          body: longContent,
          format: 'markdown' as const,
        },
      };

      templateModel.findOne.mockResolvedValue(null);

      await expect(service.createTemplate(invalidDto)).rejects.toThrow();
    });

    it('should validate channel template content', async () => {
      const dtoWithInvalidChannelTemplate = {
        ...mockCreateTemplateDto,
        channelTemplates: [
          {
            channelType: 'email',
            template: {
              subject: 'Valid',
              body: '', // Invalid empty body
              format: 'html' as const,
            },
          },
        ],
      };

      templateModel.findOne.mockResolvedValue(null);

      await expect(service.createTemplate(dtoWithInvalidChannelTemplate)).rejects.toThrow();
    });
  });

  describe('updateTemplate', () => {
    const updateDto: UpdateTemplateDto = {
      name: 'Updated Template Name',
      description: 'Updated description',
      enabled: false,
    };

    it('should update template successfully', async () => {
      const existingTemplate = {
        ...mockTemplate,
        save: jest.fn().mockResolvedValue({ ...mockTemplate, ...updateDto }),
      };
      templateModel.findOne.mockResolvedValue(existingTemplate);

      const result = await service.updateTemplate('test-template', updateDto);

      expect(templateModel.findOne).toHaveBeenCalledWith({ templateId: 'test-template' });
      expect(existingTemplate.save).toHaveBeenCalled();
      expect(result.name).toBe(updateDto.name);
      expect(result.description).toBe(updateDto.description);
      expect(result.enabled).toBe(updateDto.enabled);
    });

    it('should validate updated template content', async () => {
      const invalidUpdate = {
        defaultContent: {
          subject: 'Valid',
          body: '', // Invalid empty body
          format: 'markdown' as const,
        },
      };

      const existingTemplate = { ...mockTemplate };
      templateModel.findOne.mockResolvedValue(existingTemplate);

      await expect(service.updateTemplate('test-template', invalidUpdate)).rejects.toThrow();
    });

    it('should throw error if template not found', async () => {
      templateModel.findOne.mockResolvedValue(null);

      await expect(service.updateTemplate('nonexistent', updateDto)).rejects.toThrow();
    });
  });

  describe('deleteTemplate', () => {
    it('should delete user-defined template successfully', async () => {
      const userTemplate = { ...mockTemplate, templateType: 'user_defined' };
      templateModel.findOne.mockResolvedValue(userTemplate);
      templateModel.deleteOne.mockResolvedValue({ deletedCount: 1 } as any);

      await service.deleteTemplate('test-template');

      expect(templateModel.findOne).toHaveBeenCalledWith({ templateId: 'test-template' });
      expect(templateModel.deleteOne).toHaveBeenCalledWith({ templateId: 'test-template' });
    });

    it('should not allow deletion of system templates', async () => {
      const systemTemplate = { ...mockTemplate, templateType: 'system' };
      templateModel.findOne.mockResolvedValue(systemTemplate);

      await expect(service.deleteTemplate('test-template')).rejects.toThrow();

      expect(templateModel.deleteOne).not.toHaveBeenCalled();
    });

    it('should throw error if template not found', async () => {
      templateModel.findOne.mockResolvedValue(null);

      await expect(service.deleteTemplate('nonexistent')).rejects.toThrow();
    });
  });

  describe('findTemplateById', () => {
    it('should find template by ID successfully', async () => {
      templateModel.findOne.mockResolvedValue(mockTemplate);

      const result = await service.findTemplateById('test-template');

      expect(templateModel.findOne).toHaveBeenCalledWith({ templateId: 'test-template' });
      expect(result).toEqual(mockTemplate);
    });

    it('should throw error if template not found', async () => {
      templateModel.findOne.mockResolvedValue(null);

      await expect(service.findTemplateById('nonexistent')).rejects.toThrow();
    });
  });

  describe('queryTemplates', () => {
    const mockTemplates = [mockTemplate];
    const mockTotal = 1;

    beforeEach(() => {
      paginationService.normalizePaginationQuery.mockReturnValue({ page: 1, limit: 10 });
      paginationService.calculateSkip.mockReturnValue(0);
      paginationService.createPaginatedResponse.mockReturnValue({
        items: mockTemplates,
        pagination: {
          page: 1,
          limit: 10,
          total: mockTotal,
          totalPages: 1,
          hasNext: false,
          hasPrev: false,
        },
      });
    });

    it('should query templates with default parameters', async () => {
      const queryDto: TemplateQueryDto = {};

      templateModel.find.mockReturnThis();
      templateModel.sort.mockReturnThis();
      templateModel.skip.mockReturnThis();
      templateModel.limit.mockReturnThis();
      templateModel.exec.mockResolvedValue(mockTemplates);
      templateModel.countDocuments.mockResolvedValue(mockTotal);

      const result = await service.queryTemplates(queryDto);

      expect(templateModel.find).toHaveBeenCalledWith({});
      expect(templateModel.sort).toHaveBeenCalledWith({ createdAt: -1 });
      expect(paginationService.createPaginatedResponse).toHaveBeenCalledWith(
        mockTemplates,
        1,
        10,
        mockTotal,
      );
    });

    it('should apply search filters', async () => {
      const queryDto: TemplateQueryDto = {
        eventType: 'alert.triggered',
        templateType: 'user_defined',
        enabled: true,
        search: 'test',
        tags: ['alert'],
      };

      templateModel.find.mockReturnThis();
      templateModel.sort.mockReturnThis();
      templateModel.skip.mockReturnThis();
      templateModel.limit.mockReturnThis();
      templateModel.exec.mockResolvedValue(mockTemplates);
      templateModel.countDocuments.mockResolvedValue(mockTotal);

      await service.queryTemplates(queryDto);

      expect(templateModel.find).toHaveBeenCalledWith({
        eventType: 'alert.triggered',
        templateType: 'user_defined',
        enabled: true,
        tags: { $in: ['alert'] },
        $or: [
          { name: { $regex: 'test', $options: 'i' } },
          { description: { $regex: 'test', $options: 'i' } },
          { tags: { $in: [new RegExp('test', 'i')] } },
        ],
      });
    });
  });

  describe('getTemplatesByEventType', () => {
    it('should get templates by event type', async () => {
      const mockTemplates = [mockTemplate];
      templateModel.find.mockReturnThis();
      templateModel.sort.mockReturnThis();
      templateModel.exec.mockResolvedValue(mockTemplates);

      const result = await service.getTemplatesByEventType('alert.triggered');

      expect(templateModel.find).toHaveBeenCalledWith({
        eventType: 'alert.triggered',
        enabled: true,
      });
      expect(templateModel.sort).toHaveBeenCalledWith({ priority: -1, createdAt: -1 });
      expect(result).toEqual(mockTemplates);
    });
  });

  describe('renderTemplate', () => {
    const mockRenderContext: TemplateRenderContext = {
      templateId: 'test-template',
      channelType: 'email',
      variables: {
        title: 'Test Alert',
        message: 'This is a test message',
        timestamp: '2023-01-01T00:00:00Z',
      },
      fallbackToDefault: true,
    };

    it('should render template successfully', async () => {
      const templateWithMethods = {
        ...mockTemplate,
        validateVariables: jest.fn().mockReturnValue({ valid: true, errors: [] }),
        getChannelTemplate: jest.fn().mockReturnValue({
          subject: 'Email Alert: {{title}}',
          body: 'Email body: {{message}}',
          format: 'html' as const,
        }),
        incrementUsage: jest.fn().mockResolvedValue(undefined),
      };

      templateModel.findOne.mockResolvedValue(templateWithMethods);

      const result = await service.renderTemplate(mockRenderContext);

      expect(templateWithMethods.validateVariables).toHaveBeenCalledWith(mockRenderContext.variables);
      expect(templateWithMethods.getChannelTemplate).toHaveBeenCalledWith('email');
      expect(templateWithMethods.incrementUsage).toHaveBeenCalled();
      expect(result).toEqual({
        subject: expect.stringContaining('Test Alert'),
        body: expect.stringContaining('This is a test message'),
        format: 'html' as const,
        variables: mockRenderContext.variables,
        templateId: mockRenderContext.templateId,
        channelType: mockRenderContext.channelType,
      });
    });

    it('should handle variable validation errors', async () => {
      const templateWithMethods = {
        ...mockTemplate,
        validateVariables: jest.fn().mockReturnValue({
          valid: false,
          errors: ['Missing required variable: title'],
        }),
      };

      templateModel.findOne.mockResolvedValue(templateWithMethods);

      await expect(service.renderTemplate(mockRenderContext)).rejects.toThrow();
    });

    it('should fallback to default content when channel template not found', async () => {
      const templateWithMethods = {
        ...mockTemplate,
        validateVariables: jest.fn().mockReturnValue({ valid: true, errors: [] }),
        getChannelTemplate: jest.fn().mockReturnValue(null),
        incrementUsage: jest.fn().mockResolvedValue(undefined),
      };

      templateModel.findOne.mockResolvedValue(templateWithMethods);

      const result = await service.renderTemplate({
        ...mockRenderContext,
        fallbackToDefault: true,
      });

      expect(result.subject).toContain('Test Alert');
      expect(result.format).toBe('markdown');
    });

    it('should throw error when channel template not found and fallback disabled', async () => {
      const templateWithMethods = {
        ...mockTemplate,
        validateVariables: jest.fn().mockReturnValue({ valid: true, errors: [] }),
        getChannelTemplate: jest.fn().mockReturnValue(null),
      };

      templateModel.findOne.mockResolvedValue(templateWithMethods);

      await expect(
        service.renderTemplate({
          ...mockRenderContext,
          fallbackToDefault: false,
        })
      ).rejects.toThrow();
    });
  });

  describe('renderTemplatesBatch', () => {
    it('should render multiple templates successfully', async () => {
      const contexts = [
        {
          templateId: 'template1',
          variables: { title: 'Alert 1' },
        },
        {
          templateId: 'template2',
          variables: { title: 'Alert 2' },
        },
      ] as TemplateRenderContext[];

      const mockRenderTemplate = jest.spyOn(service, 'renderTemplate');
      mockRenderTemplate.mockResolvedValueOnce({
        subject: 'Alert 1',
        body: 'Body 1',
        format: 'text' as const,
        variables: { title: 'Alert 1' },
        templateId: 'template1',
      });
      mockRenderTemplate.mockResolvedValueOnce({
        subject: 'Alert 2',
        body: 'Body 2',
        format: 'text' as const,
        variables: { title: 'Alert 2' },
        templateId: 'template2',
      });

      const results = await service.renderTemplatesBatch(contexts);

      expect(results).toHaveLength(2);
      expect(results[0].subject).toBe('Alert 1');
      expect(results[1].subject).toBe('Alert 2');
      expect(mockRenderTemplate).toHaveBeenCalledTimes(2);
    });

    it('should handle partial failures in batch rendering', async () => {
      const contexts = [
        {
          templateId: 'template1',
          variables: { title: 'Alert 1' },
        },
        {
          templateId: 'template2',
          variables: { title: 'Alert 2' },
        },
      ] as TemplateRenderContext[];

      const mockRenderTemplate = jest.spyOn(service, 'renderTemplate');
      mockRenderTemplate.mockResolvedValueOnce({
        subject: 'Alert 1',
        body: 'Body 1',
        format: 'text' as const,
        variables: { title: 'Alert 1' },
        templateId: 'template1',
      });
      mockRenderTemplate.mockRejectedValueOnce(new Error('Template not found'));

      const results = await service.renderTemplatesBatch(contexts);

      expect(results).toHaveLength(1);
      expect(results[0].subject).toBe('Alert 1');
    });
  });

  describe('duplicateTemplate', () => {
    it('should duplicate template successfully', async () => {
      const sourceTemplate = { ...mockTemplate };
      templateModel.findOne.mockResolvedValueOnce(sourceTemplate).mockResolvedValueOnce(null);

      const duplicatedTemplate = {
        ...sourceTemplate,
        templateId: 'duplicated-template',
        name: 'Test Template (副本)',
      };

      const mockInstance = {
        ...duplicatedTemplate,
        save: jest.fn().mockResolvedValue(duplicatedTemplate),
      };
      (templateModel.constructor as jest.Mock).mockReturnValue(mockInstance);

      const result = await service.duplicateTemplate(
        'test-template',
        'duplicated-template',
        { name: 'Custom Duplicate Name' }
      );

      expect(result.templateId).toBe('duplicated-template');
      expect(result.name).toBe('Custom Duplicate Name');
    });
  });

  describe('getTemplateStats', () => {
    it('should return template statistics', async () => {
      const mockStats = {
        total: 10,
        byEventType: [{ _id: 'alert.triggered', count: 5 }],
        byTemplateType: [{ _id: 'user_defined', count: 8 }],
        byStatus: [{ _id: true, count: 7 }],
        topUsed: [
          {
            templateId: 'popular-template',
            name: 'Popular Template',
            usageCount: 100,
          },
        ],
      };

      templateModel.countDocuments.mockResolvedValue(mockStats.total);
      templateModel.aggregate
        .mockResolvedValueOnce(mockStats.byEventType)
        .mockResolvedValueOnce(mockStats.byTemplateType)
        .mockResolvedValueOnce(mockStats.byStatus);

      templateModel.find.mockReturnThis();
      templateModel.sort.mockReturnThis();
      templateModel.limit.mockReturnThis();
      templateModel.select.mockReturnThis();
      templateModel.exec.mockResolvedValue(mockStats.topUsed);

      const result = await service.getTemplateStats();

      expect(result.total).toBe(10);
      expect(result.byEventType).toEqual({ 'alert.triggered': 5 });
      expect(result.byTemplateType).toEqual({ user_defined: 8 });
      expect(result.byStatus).toEqual({ enabled: 7 });
      expect(result.topUsed).toEqual(mockStats.topUsed);
    });
  });

  describe('private methods', () => {
    describe('validateTemplateContent', () => {
      it('should pass validation for valid content', async () => {
        const validContent: TemplateContent = {
          subject: 'Valid Subject',
          body: 'Valid body content',
          format: 'markdown' as const,
        };

        // This should not throw
        const result = await service.createTemplate({
          ...mockCreateTemplateDto,
          defaultContent: validContent,
        });

        expect(result).toBeDefined();
      });
    });

    describe('handlebars rendering', () => {
      it('should sanitize variables to prevent XSS', async () => {
        const templateWithMethods = {
          ...mockTemplate,
          validateVariables: jest.fn().mockReturnValue({ valid: true, errors: [] }),
          getChannelTemplate: jest.fn().mockReturnValue(null),
          incrementUsage: jest.fn().mockResolvedValue(undefined),
          defaultContent: {
            subject: 'Test: {{title}}',
            body: 'Message: {{message}}',
            format: 'html' as const,
          },
        };

        templateModel.findOne.mockResolvedValue(templateWithMethods);

        const result = await service.renderTemplate({
          templateId: 'test-template',
          variables: {
            title: '<script>alert("xss")</script>',
            message: 'Safe content',
          },
        });

        expect(result.subject).not.toContain('<script>');
        expect(result.subject).toContain('&lt;script&gt;');
        expect(result.body).toContain('Safe content');
      });

      it('should handle handlebars helpers correctly', async () => {
        const templateWithMethods = {
          ...mockTemplate,
          validateVariables: jest.fn().mockReturnValue({ valid: true, errors: [] }),
          getChannelTemplate: jest.fn().mockReturnValue(null),
          incrementUsage: jest.fn().mockResolvedValue(undefined),
          defaultContent: {
            subject: 'Alert at {{formatDate timestamp "datetime"}}',
            body: 'Value: {{formatNumber value 2}}',
            format: 'text' as const,
          },
        };

        templateModel.findOne.mockResolvedValue(templateWithMethods);

        const result = await service.renderTemplate({
          templateId: 'test-template',
          variables: {
            timestamp: new Date('2023-01-01T12:00:00Z'),
            value: 123.456,
          },
        });

        expect(result.subject).toContain('2023');
        expect(result.body).toContain('123.46');
      });
    });
  });

  describe('error handling', () => {
    it('should handle database errors gracefully', async () => {
      templateModel.findOne.mockRejectedValue(new Error('Database connection error'));

      await expect(service.findTemplateById('test-template')).rejects.toThrow('Database connection error');
    });

    it('should handle unsupported template engine', async () => {
      const templateWithUnsupportedEngine = {
        ...mockTemplate,
        templateEngine: 'unsupported' as TemplateEngine,
        validateVariables: jest.fn().mockReturnValue({ valid: true, errors: [] }),
        getChannelTemplate: jest.fn().mockReturnValue(null),
        incrementUsage: jest.fn().mockResolvedValue(undefined),
      };

      templateModel.findOne.mockResolvedValue(templateWithUnsupportedEngine);

      await expect(
        service.renderTemplate({
          templateId: 'test-template',
          variables: {},
        })
      ).rejects.toThrow();
    });

    it('should handle malformed handlebars templates', async () => {
      const templateWithMalformedHandlebars = {
        ...mockTemplate,
        validateVariables: jest.fn().mockReturnValue({ valid: true, errors: [] }),
        getChannelTemplate: jest.fn().mockReturnValue(null),
        incrementUsage: jest.fn().mockResolvedValue(undefined),
        defaultContent: {
          subject: 'Valid subject',
          body: 'Invalid handlebars {{#if unclosed',
          format: 'text' as const,
        },
      };

      templateModel.findOne.mockResolvedValue(templateWithMalformedHandlebars);

      await expect(
        service.renderTemplate({
          templateId: 'test-template',
          variables: {},
        })
      ).rejects.toThrow();
    });
  });
});