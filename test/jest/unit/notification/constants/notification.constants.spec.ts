import {
  DEFAULT_CHANNEL_CONFIGS,
  DEFAULT_EMAIL_SUBJECT_TEMPLATE,
  DEFAULT_NOTIFICATION_TEMPLATES,
  DEFAULT_TEXT_TEMPLATE,
  NOTIFICATION_VARIABLES,
} from '@notification/constants/notification.constants';

describe('NotificationConstants', () => {
  describe('DEFAULT_CHANNEL_CONFIGS', () => {
    it('should be frozen object', () => {
      expect(Object.isFrozen(DEFAULT_CHANNEL_CONFIGS)).toBe(true);
    });

    it('should contain all supported channel configurations', () => {
      expect(DEFAULT_CHANNEL_CONFIGS).toHaveProperty('EMAIL');
      expect(DEFAULT_CHANNEL_CONFIGS).toHaveProperty('SMS');
      expect(DEFAULT_CHANNEL_CONFIGS).toHaveProperty('WEBHOOK');
      expect(DEFAULT_CHANNEL_CONFIGS).toHaveProperty('SLACK');
      expect(DEFAULT_CHANNEL_CONFIGS).toHaveProperty('DINGTALK');
    });

    it('should have correct EMAIL configuration structure', () => {
      const emailConfig = DEFAULT_CHANNEL_CONFIGS.EMAIL;
      expect(emailConfig).toHaveProperty('smtp');
      expect(emailConfig.smtp).toHaveProperty('host');
      expect(emailConfig.smtp).toHaveProperty('port');
      expect(emailConfig.smtp).toHaveProperty('secure');
      expect(emailConfig.smtp).toHaveProperty('auth');
      expect(emailConfig.smtp.auth).toHaveProperty('user');
      expect(emailConfig.smtp.auth).toHaveProperty('pass');
      expect(emailConfig).toHaveProperty('from');
    });

    it('should have correct SMS configuration structure', () => {
      const smsConfig = DEFAULT_CHANNEL_CONFIGS.SMS;
      expect(smsConfig).toHaveProperty('provider');
      expect(smsConfig).toHaveProperty('accessKeyId');
      expect(smsConfig).toHaveProperty('accessKeySecret');
      expect(smsConfig).toHaveProperty('signName');
      expect(smsConfig).toHaveProperty('templateCode');
      expect(smsConfig.provider).toBe('aliyun');
    });

    it('should have correct WEBHOOK configuration structure', () => {
      const webhookConfig = DEFAULT_CHANNEL_CONFIGS.WEBHOOK;
      expect(webhookConfig).toHaveProperty('url');
      expect(webhookConfig).toHaveProperty('method');
      expect(webhookConfig).toHaveProperty('headers');
      expect(webhookConfig).toHaveProperty('verifySSL');
      expect(webhookConfig.method).toBe('POST');
      expect(webhookConfig.verifySSL).toBe(true);
    });

    it('should have correct SLACK configuration structure', () => {
      const slackConfig = DEFAULT_CHANNEL_CONFIGS.SLACK;
      expect(slackConfig).toHaveProperty('token');
      expect(slackConfig).toHaveProperty('channel');
      expect(slackConfig).toHaveProperty('username');
      expect(slackConfig).toHaveProperty('iconEmoji');
      expect(slackConfig.username).toBe('AlertBot');
      expect(slackConfig.iconEmoji).toBe(':warning:');
    });

    it('should have correct DINGTALK configuration structure', () => {
      const dingtalkConfig = DEFAULT_CHANNEL_CONFIGS.DINGTALK;
      expect(dingtalkConfig).toHaveProperty('webhook');
      expect(dingtalkConfig).toHaveProperty('secret');
    });
  });

  describe('DEFAULT_NOTIFICATION_TEMPLATES', () => {
    it('should be frozen object', () => {
      expect(Object.isFrozen(DEFAULT_NOTIFICATION_TEMPLATES)).toBe(true);
    });

    it('should contain all alert types', () => {
      expect(DEFAULT_NOTIFICATION_TEMPLATES).toHaveProperty('ALERT_FIRED');
      expect(DEFAULT_NOTIFICATION_TEMPLATES).toHaveProperty('ALERT_RESOLVED');
      expect(DEFAULT_NOTIFICATION_TEMPLATES).toHaveProperty('ALERT_ACKNOWLEDGED');
    });

    it('should have correct ALERT_FIRED template structure', () => {
      const template = DEFAULT_NOTIFICATION_TEMPLATES.ALERT_FIRED;
      expect(template).toHaveProperty('EMAIL');
      expect(template).toHaveProperty('SMS');
      expect(template).toHaveProperty('WEBHOOK');

      expect(template.EMAIL).toHaveProperty('TITLE');
      expect(template.EMAIL).toHaveProperty('CONTENT');
      expect(template.SMS).toHaveProperty('CONTENT');
      expect(template.WEBHOOK).toHaveProperty('PAYLOAD');
    });

    it('should have correct ALERT_RESOLVED template structure', () => {
      const template = DEFAULT_NOTIFICATION_TEMPLATES.ALERT_RESOLVED;
      expect(template).toHaveProperty('EMAIL');
      expect(template).toHaveProperty('SMS');

      expect(template.EMAIL).toHaveProperty('TITLE');
      expect(template.EMAIL).toHaveProperty('CONTENT');
      expect(template.SMS).toHaveProperty('CONTENT');
    });

    it('should have correct ALERT_ACKNOWLEDGED template structure', () => {
      const template = DEFAULT_NOTIFICATION_TEMPLATES.ALERT_ACKNOWLEDGED;
      expect(template).toHaveProperty('EMAIL');

      expect(template.EMAIL).toHaveProperty('TITLE');
      expect(template.EMAIL).toHaveProperty('CONTENT');
    });

    it('should contain template variables in ALERT_FIRED templates', () => {
      const emailTitle = DEFAULT_NOTIFICATION_TEMPLATES.ALERT_FIRED.EMAIL.TITLE;
      const emailContent = DEFAULT_NOTIFICATION_TEMPLATES.ALERT_FIRED.EMAIL.CONTENT;
      const smsContent = DEFAULT_NOTIFICATION_TEMPLATES.ALERT_FIRED.SMS.CONTENT;

      expect(emailTitle).toContain('{severity}');
      expect(emailTitle).toContain('{ruleName}');
      expect(emailContent).toContain('{ruleName}');
      expect(emailContent).toContain('{severity}');
      expect(emailContent).toContain('{startTime}');
      expect(emailContent).toContain('{value}');
      expect(emailContent).toContain('{threshold}');
      expect(emailContent).toContain('{metric}');
      expect(emailContent).toContain('{message}');
      expect(smsContent).toContain('{ruleName}');
      expect(smsContent).toContain('{value}');
      expect(smsContent).toContain('{threshold}');
    });
  });

  describe('DEFAULT_EMAIL_SUBJECT_TEMPLATE', () => {
    it('should be defined', () => {
      expect(DEFAULT_EMAIL_SUBJECT_TEMPLATE).toBeDefined();
      expect(typeof DEFAULT_EMAIL_SUBJECT_TEMPLATE).toBe('string');
    });

    it('should contain template variables', () => {
      expect(DEFAULT_EMAIL_SUBJECT_TEMPLATE).toContain('{');
      expect(DEFAULT_EMAIL_SUBJECT_TEMPLATE).toContain('}');
    });
  });

  describe('DEFAULT_TEXT_TEMPLATE', () => {
    it('should be defined', () => {
      expect(DEFAULT_TEXT_TEMPLATE).toBeDefined();
      expect(typeof DEFAULT_TEXT_TEMPLATE).toBe('string');
    });

    it('should contain template variables', () => {
      expect(DEFAULT_TEXT_TEMPLATE).toContain('{');
      expect(DEFAULT_TEXT_TEMPLATE).toContain('}');
    });
  });

  describe('NOTIFICATION_VARIABLES', () => {
    it('should be defined as frozen object', () => {
      expect(NOTIFICATION_VARIABLES).toBeDefined();
      expect(Object.isFrozen(NOTIFICATION_VARIABLES)).toBe(true);
    });

    it('should contain commonly used notification variables', () => {
      expect(typeof NOTIFICATION_VARIABLES).toBe('object');
      expect(NOTIFICATION_VARIABLES).not.toBeNull();
    });
  });

  describe('Configuration Immutability', () => {
    it('should prevent modification of DEFAULT_CHANNEL_CONFIGS', () => {
      expect(() => {
        (DEFAULT_CHANNEL_CONFIGS as any).NEW_CHANNEL = {};
      }).toThrow();
    });

    it('should prevent modification of DEFAULT_NOTIFICATION_TEMPLATES', () => {
      expect(() => {
        (DEFAULT_NOTIFICATION_TEMPLATES as any).NEW_TEMPLATE = {};
      }).toThrow();
    });

    it('should prevent deep modification of nested objects', () => {
      expect(() => {
        (DEFAULT_CHANNEL_CONFIGS.EMAIL as any).newProperty = 'test';
      }).toThrow();
    });
  });

  describe('Template Variable Validation', () => {
    it('should have consistent variable naming convention', () => {
      const templates = DEFAULT_NOTIFICATION_TEMPLATES.ALERT_FIRED;
      const emailTitle = templates.EMAIL.TITLE;
      const emailContent = templates.EMAIL.CONTENT;

      // Check that variables use camelCase naming convention
      const variablePattern = /\{([^}]+)\}/g;
      let match;
      const variables = [];

      while ((match = variablePattern.exec(emailTitle + emailContent)) !== null) {
        variables.push(match[1]);
      }

      variables.forEach(variable => {
        expect(variable).toMatch(/^[a-zA-Z][a-zA-Z0-9]*$/);
      });
    });

    it('should have balanced braces in all templates', () => {
      const allTemplates = Object.values(DEFAULT_NOTIFICATION_TEMPLATES);

      allTemplates.forEach(templateGroup => {
        Object.values(templateGroup).forEach(channelTemplates => {
          Object.values(channelTemplates).forEach(template => {
            if (typeof template === 'string') {
              const openBraces = (template.match(/\{/g) || []).length;
              const closeBraces = (template.match(/\}/g) || []).length;
              expect(openBraces).toBe(closeBraces);
            }
          });
        });
      });
    });
  });
});
