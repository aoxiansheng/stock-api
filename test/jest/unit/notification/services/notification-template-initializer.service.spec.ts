import { Test, TestingModule } from '@nestjs/testing';
import { NotificationTemplateInitializerService } from '@notification/services/notification-template-initializer.service';
import { NotificationTemplateService } from '@notification/services/notification-template.service';

// Mock logger
const mockLogger = {
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
};

jest.mock('@common/logging/index', () => ({
  createLogger: jest.fn(() => mockLogger),
}));

describe('NotificationTemplateInitializerService', () => {
  let service: NotificationTemplateInitializerService;
  let templateService: jest.Mocked<NotificationTemplateService>;

  const mockTemplate = {
    templateId: 'alert.fired.system',
    name: 'Alert Fired Template',
    description: 'System template for fired alerts',
    eventType: 'alert.fired',
    templateType: 'system',
    defaultContent: {
      subject: 'Alert: {{title}}',
      body: 'Alert details: {{message}}',
      format: 'markdown',
    },
    enabled: true,
    templateEngine: 'handlebars',
    variables: ['title', 'message'],
    tags: ['alert', 'system'],
    priority: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationTemplateInitializerService,
        {
          provide: NotificationTemplateService,
          useValue: {
            findTemplateById: jest.fn(),
            createTemplate: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<NotificationTemplateInitializerService>(NotificationTemplateInitializerService);
    templateService = module.get(NotificationTemplateService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('initializeDefaultTemplates', () => {
    it('should initialize all default templates successfully', async () => {
      // Mock all createTemplateIfNotExists calls to succeed
      jest.spyOn(service, 'createTemplateIfNotExists' as any).mockResolvedValue(mockTemplate);

      await service.initializeDefaultTemplates();

      // Should call createTemplateIfNotExists for all template types
      expect(service['createTemplateIfNotExists']).toHaveBeenCalledTimes(5); // 5 alert types
      expect(mockLogger.log).toHaveBeenCalledWith('开始初始化默认通知模板');
      expect(mockLogger.log).toHaveBeenCalledWith('默认通知模板初始化完成');
    });

    it('should handle template creation errors gracefully', async () => {
      // Mock one template creation to fail
      jest.spyOn(service, 'createTemplateIfNotExists' as any)
        .mockResolvedValueOnce(mockTemplate)
        .mockRejectedValueOnce(new Error('Template creation failed'))
        .mockResolvedValue(mockTemplate);

      await service.initializeDefaultTemplates();

      expect(mockLogger.error).toHaveBeenCalledWith(
        '初始化默认模板失败',
        expect.objectContaining({
          error: 'Template creation failed',
        })
      );
    });
  });

  describe('initializeAlertFiredTemplates', () => {
    it('should create alert fired templates for all channels', async () => {
      jest.spyOn(service, 'createTemplateIfNotExists' as any).mockResolvedValue(mockTemplate);

      await service['initializeAlertFiredTemplates']();

      // Should create templates for each channel type (EMAIL, SLACK, WEBHOOK, DINGTALK, LOG)
      expect(service['createTemplateIfNotExists']).toHaveBeenCalledTimes(5);

      // Verify email template creation
      expect(service['createTemplateIfNotExists']).toHaveBeenCalledWith(
        expect.objectContaining({
          templateId: 'alert.fired.email',
          name: '警报触发通知 - 邮件',
          eventType: 'alert.fired',
          templateType: 'system',
        })
      );
    });

    it('should include proper channel-specific templates', async () => {
      jest.spyOn(service, 'createTemplateIfNotExists' as any).mockResolvedValue(mockTemplate);

      await service['initializeAlertFiredTemplates']();

      // Check that Slack template includes proper formatting
      const slackTemplateCall = (service['createTemplateIfNotExists'] as jest.Mock).mock.calls
        .find(call => call[0].templateId === 'alert.fired.slack');

      expect(slackTemplateCall).toBeDefined();
      expect(slackTemplateCall[0].channelTemplates).toHaveProperty('slack');
    });
  });

  describe('initializeAlertResolvedTemplates', () => {
    it('should create alert resolved templates', async () => {
      jest.spyOn(service, 'createTemplateIfNotExists' as any).mockResolvedValue(mockTemplate);

      await service['initializeAlertResolvedTemplates']();

      expect(service['createTemplateIfNotExists']).toHaveBeenCalledWith(
        expect.objectContaining({
          templateId: 'alert.resolved.email',
          name: '警报已解决通知 - 邮件',
          eventType: 'alert.resolved',
        })
      );
    });
  });

  describe('initializeAlertAcknowledgedTemplates', () => {
    it('should create alert acknowledged templates', async () => {
      jest.spyOn(service, 'createTemplateIfNotExists' as any).mockResolvedValue(mockTemplate);

      await service['initializeAlertAcknowledgedTemplates']();

      expect(service['createTemplateIfNotExists']).toHaveBeenCalledWith(
        expect.objectContaining({
          templateId: 'alert.acknowledged.email',
          name: '警报已确认通知 - 邮件',
          eventType: 'alert.acknowledged',
        })
      );
    });
  });

  describe('initializeAlertEscalatedTemplates', () => {
    it('should create alert escalated templates', async () => {
      jest.spyOn(service, 'createTemplateIfNotExists' as any).mockResolvedValue(mockTemplate);

      await service['initializeAlertEscalatedTemplates']();

      expect(service['createTemplateIfNotExists']).toHaveBeenCalledWith(
        expect.objectContaining({
          templateId: 'alert.escalated.email',
          name: '警报已升级通知 - 邮件',
          eventType: 'alert.escalated',
        })
      );
    });
  });

  describe('initializeAlertSuppressedTemplates', () => {
    it('should create alert suppressed templates', async () => {
      jest.spyOn(service, 'createTemplateIfNotExists' as any).mockResolvedValue(mockTemplate);

      await service['initializeAlertSuppressedTemplates']();

      expect(service['createTemplateIfNotExists']).toHaveBeenCalledWith(
        expect.objectContaining({
          templateId: 'alert.suppressed.email',
          name: '警报已抑制通知 - 邮件',
          eventType: 'alert.suppressed',
        })
      );
    });
  });

  describe('createTemplateIfNotExists', () => {
    it('should create template when it does not exist', async () => {
      const templateData = {
        templateId: 'test.template',
        name: 'Test Template',
        description: 'Test description',
        eventType: 'test.event',
        templateType: 'system' as const,
        defaultContent: {
          subject: 'Test Subject',
          body: 'Test Body',
          format: 'text' as const,
        },
        enabled: true,
        templateEngine: 'handlebars' as const,
        variables: [{ name: 'test', type: 'string' as const, description: 'Test variable', required: true }],
        tags: ['test'],
        priority: 1,
      };

      templateService.findTemplateById.mockRejectedValue(new Error('Template not found'));
      templateService.createTemplate.mockResolvedValue(mockTemplate as any);

      const result = await service['createTemplateIfNotExists'](templateData);

      expect(templateService.findTemplateById).toHaveBeenCalledWith('test.template');
      expect(templateService.createTemplate).toHaveBeenCalledWith(templateData);
      expect(result).toEqual(mockTemplate);
      expect(mockLogger.log).toHaveBeenCalledWith(
        '创建系统模板成功',
        expect.objectContaining({
          templateId: 'test.template',
        })
      );
    });

    it('should not create template when it already exists', async () => {
      const templateData = {
        templateId: 'existing.template',
        name: 'Existing Template',
        description: 'Test description',
        eventType: 'test.event',
        templateType: 'system' as const,
        defaultContent: {
          subject: 'Test Subject',
          body: 'Test Body',
          format: 'text' as const,
        },
        enabled: true,
        templateEngine: 'handlebars' as const,
        variables: [{ name: 'test', type: 'string' as const, description: 'Test variable', required: true }],
        tags: ['test'],
        priority: 1,
      };

      templateService.findTemplateById.mockResolvedValue(mockTemplate as any);

      const result = await service['createTemplateIfNotExists'](templateData);

      expect(templateService.findTemplateById).toHaveBeenCalledWith('existing.template');
      expect(templateService.createTemplate).not.toHaveBeenCalled();
      expect(result).toEqual(mockTemplate);
      expect(mockLogger.debug).toHaveBeenCalledWith(
        '模板已存在，跳过创建',
        expect.objectContaining({
          templateId: 'existing.template',
        })
      );
    });

    it('should handle template creation errors', async () => {
      const templateData = {
        templateId: 'error.template',
        name: 'Error Template',
        description: 'Test description',
        eventType: 'test.event',
        templateType: 'system' as const,
        defaultContent: {
          subject: 'Test Subject',
          body: 'Test Body',
          format: 'text' as const,
        },
        enabled: true,
        templateEngine: 'handlebars' as const,
        variables: [{ name: 'test', type: 'string' as const, description: 'Test variable', required: true }],
        tags: ['test'],
        priority: 1,
      };

      templateService.findTemplateById.mockRejectedValue(new Error('Template not found'));
      templateService.createTemplate.mockRejectedValue(new Error('Creation failed'));

      await expect(service['createTemplateIfNotExists'](templateData)).rejects.toThrow('Creation failed');

      expect(mockLogger.error).toHaveBeenCalledWith(
        '创建系统模板失败',
        expect.objectContaining({
          templateId: 'error.template',
          error: 'Creation failed',
        })
      );
    });
  });

  describe('template content validation', () => {
    it('should create templates with proper handlebars variables', async () => {
      jest.spyOn(service, 'createTemplateIfNotExists' as any).mockResolvedValue(mockTemplate);

      await service['initializeAlertFiredTemplates']();

      // Check that templates include expected variables
      const emailTemplateCall = (service['createTemplateIfNotExists'] as jest.Mock).mock.calls
        .find(call => call[0].templateId === 'alert.fired.email');

      expect(emailTemplateCall[0].variables).toContain('alertId');
      expect(emailTemplateCall[0].variables).toContain('title');
      expect(emailTemplateCall[0].variables).toContain('message');
      expect(emailTemplateCall[0].variables).toContain('severity');
      expect(emailTemplateCall[0].variables).toContain('timestamp');
    });

    it('should create templates with proper channel-specific formatting', async () => {
      jest.spyOn(service, 'createTemplateIfNotExists' as any).mockResolvedValue(mockTemplate);

      await service['initializeAlertFiredTemplates']();

      // Check Slack template has markdown formatting
      const slackTemplateCall = (service['createTemplateIfNotExists'] as jest.Mock).mock.calls
        .find(call => call[0].templateId === 'alert.fired.slack');

      expect(slackTemplateCall[0].channelTemplates.slack.template.body).toContain('```');
      expect(slackTemplateCall[0].channelTemplates.slack.template.format).toBe('markdown');
    });
  });
});
