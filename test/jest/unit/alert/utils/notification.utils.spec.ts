/* eslint-disable @typescript-eslint/no-unused-vars */
import { NotificationTemplateUtil } from '../../../../../src/alert/utils/notification.utils';
import { NOTIFICATION_ERROR_TEMPLATES, NOTIFICATION_RETRY_CONFIG } from '../../../../../src/alert/constants/notification.constants';
import { AlertSeverity } from '../../../../../src/alert/types/alert.types';

// 模拟错误模板常量，用于测试
jest.mock('../../../../../src/alert/constants/notification.constants', () => {
  const original = jest.requireActual('../../../../../src/alert/constants/notification.constants');
  return {
    ...original,
    NOTIFICATION_ERROR_TEMPLATES: {
      ...original.NOTIFICATION_ERROR_TEMPLATES,
      TEMPLATE_NOT_FOUND: 'Template {templateId} not found',
      RATE_LIMIT_EXCEEDED: 'Rate limit exceeded, retry after {retryAfter}s'
    },
    NOTIFICATION_TEMPLATE_PATTERNS: {
      ...original.NOTIFICATION_TEMPLATE_PATTERNS,
      VARIABLE_PATTERN_SOURCE: "\\{(\\w+)\\}",
      VARIABLE_PATTERN_FLAGS: "g",
      IF_BLOCK_PATTERN_SOURCE: "\\{#if (\\w+)\\}([\\s\\S]*?)\\{\\/if\\}",
      IF_BLOCK_PATTERN_FLAGS: "g",
      UNLESS_BLOCK_PATTERN_SOURCE: "\\{#unless (\\w+)\\}([\\s\\S]*?)\\{\\/unless\\}",
      UNLESS_BLOCK_PATTERN_FLAGS: "g",
      COMMENT_PATTERN_SOURCE: "\\/\\*[\\s\\S]*?\\*\\/",
      COMMENT_PATTERN_FLAGS: "g",
    }
  };
});

describe('NotificationTemplateUtil', () => {
  describe('replaceErrorTemplate', () => {
    it('should replace single placeholder in template', () => {
      const template = 'Template {templateId} not found';
      const params = { templateId: 'template-123' };
      const result = NotificationTemplateUtil.replaceErrorTemplate(template, params);
      expect(result).toBe('Template template-123 not found');
    });

    it('should replace multiple placeholders in template', () => {
      const template = 'User {userId} action {action} failed: {error}';
      const params = { userId: 'user-456', action: 'login', error: 'Invalid password' };
      const result = NotificationTemplateUtil.replaceErrorTemplate(template, params);
      expect(result).toBe('User user-456 action login failed: Invalid password');
    });
  });

  describe('generateErrorMessage', () => {
    it('should generate error message from template key', () => {
      const templateKey = 'TEMPLATE_NOT_FOUND';
      const params = { templateId: 'email-template-1' };
      const result = NotificationTemplateUtil.generateErrorMessage(templateKey as any, params);
      expect(result).toBe('Template email-template-1 not found');
    });

    it('should generate error message with multiple parameters', () => {
      const templateKey = 'RATE_LIMIT_EXCEEDED';
      const params = { retryAfter: 300 };
      const result = NotificationTemplateUtil.generateErrorMessage(templateKey as any, params);
      expect(result).toBe('Rate limit exceeded, retry after 300s');
    });
  });

  describe('formatTemplate', () => {
    it('should replace variables in template', () => {
      const template = 'Hello {userName}, your order {orderId} is ready.';
      const variables = { userName: 'John Doe', orderId: 'ORDER-001' };
      const result = NotificationTemplateUtil.formatTemplate(template, var_iables);
      expect(result).toBe('Hello John Doe, your order ORDER-001 is ready.');
    });

    it('should remove comments from template', () => {
      const template = 'Hello {userName},/* this is a comment */ your order is ready.';
      const variables = { userName: 'Jane' };
      const result = NotificationTemplateUtil.formatTemplate(template, var_iables);
      expect(result).toBe('Hello Jane, your order is ready.');
    });

    it('should handle if blocks correctly', () => {
      const template = 'Hello {userName},{#if hasDiscount} you have a discount.{/if}';
      const variables = { userName: 'Mike', hasDiscount: true };
      const result = NotificationTemplateUtil.formatTemplate(template, var_iables);
      expect(result).toBe('Hello Mike, you have a discount.');
    });

    it('should hide if blocks when condition is false', () => {
      const template = 'Hello {userName},{#if hasDiscount} you have a discount.{/if}';
      const variables = { userName: 'Sue', hasDiscount: false };
      const result = NotificationTemplateUtil.formatTemplate(template, var_iables);
      expect(result).toBe('Hello Sue,');
    });

    it('should handle unless blocks correctly', () => {
      const template = 'Hello {userName},{#unless isPaid} please pay your invoice.{/unless}';
      const variables = { userName: 'Tom', isPaid: false };
      const result = NotificationTemplateUtil.formatTemplate(template, var_iables);
      expect(result).toBe('Hello Tom, please pay your invoice.');
    });

    it('should hide unless blocks when condition is true', () => {
      const template = 'Hello {userName},{#unless isPaid} please pay your invoice.{/unless}';
      const variables = { userName: 'Kim', isPaid: true };
      const result = NotificationTemplateUtil.formatTemplate(template, var_iables);
      expect(result).toBe('Hello Kim,');
    });
  });

  describe('isValidVariableName', () => {
    it('should validate correct variable names', () => {
      expect(NotificationTemplateUtil.isValidVariableName('userName')).toBe(true);
      expect(NotificationTemplateUtil.isValidVariableName('userVar123')).toBe(true);
    });

    it('should reject invalid variable names', () => {
      expect(NotificationTemplateUtil.isValidVariableName('123var')).toBe(false);
      expect(NotificationTemplateUtil.isValidVariableName('_private')).toBe(false);
      expect(NotificationTemplateUtil.isValidVariableName('user-name')).toBe(false);
    });
  });

  describe('isValidTemplateLength', () => {
    it('should validate template length within limits', () => {
      const shortTemplate = 'Hello';
      const longTemplate = 'a'.repeat(3000);
      expect(NotificationTemplateUtil.isValidTemplateLength(shortTemplate)).toBe(true);
      expect(NotificationTemplateUtil.isValidTemplateLength(longTemplate)).toBe(true);
    });
  });

  describe('extractVariables', () => {
    it('should extract variables from simple template', () => {
      const template = 'Hello {userName}, your balance is {balance}';
      const variables = NotificationTemplateUtil.extractVariables(template);
      expect(variables).toEqual(['userName', 'balance']);
    });

    it('should return empty array for template without variables', () => {
      const template = 'This is a template without any variables.';
      const variables = NotificationTemplateUtil.extractVariables(template);
      expect(variables).toEqual([]);
    });
  });

  describe('isValidEmail', () => {
    it('should validate correct email addresses', () => {
      expect(NotificationTemplateUtil.isValidEmail('user@example.com')).toBe(true);
    });

    it('should reject invalid email addresses', () => {
      expect(NotificationTemplateUtil.isValidEmail('invalid-email')).toBe(false);
    });
  });

  describe('isValidUrl', () => {
    it('should validate correct URLs', () => {
      expect(NotificationTemplateUtil.isValidUrl('_https://example.com')).toBe(true);
    });

    it('should reject invalid URLs', () => {
      expect(NotificationTemplateUtil.isValidUrl('_ftp://example.com')).toBe(false);
    });
  });

  describe('calculateRetryDelay', () => {
    it('should calculate exponential backoff delay', () => {
      const delay1 = NotificationTemplateUtil.calculateRetryDelay(0);
      expect(delay1).toBeGreaterThanOrEqual(NOTIFICATION_RETRY_CONFIG.INITIAL_DELAYMS * (1 - NOTIFICATION_RETRY_CONFIG.JITTERFACTOR));
    });

    it('should not exceed maximum delay', () => {
      const largeAttemptDelay = NotificationTemplateUtil.calculateRetryDelay(10);
      expect(largeAttemptDelay).toBeLessThanOrEqual(NOTIFICATION_RETRY_CONFIG.MAX_DELAY_MS);
    });
  });

  describe('generateTemplateVariables', () => {
    it('should generate template variables from alert and rule', () => {
      const alert = {
        id: 'alert-123',
        metric: 'cpu_usage',
        value: 85.5,
        threshold: 80,
        severity: AlertSeverity.WARNING,
        status: 'firing',
        message: 'CPU usage is high',
        startTime: new Date('2023-01-01T10:_00:00Z'),
        endTime: new Date('2023-01-01T10:_05:00Z'),
        tags: { host: 'server-1', env: 'production' },
        context: {
          customVar: 'customValue',
          region: 'us-east-1',
        },
      };

      const rule = {
        id: 'rule-456',
        name: 'High CPU Rule',
        description: 'Rule for high CPU usage',
      };

      const variables = NotificationTemplateUtil.generateTemplateVariables(alert as any, rule as any);

      expect(variables._alertId).toBe('alert-123');
      expect(variables._ruleName).toBe('High CPU Rule');
      expect(variables.metric).toBe('cpu_usage');
      expect(variables.value).toBe(85.5);
      expect(variables.threshold).toBe(80);
      expect(variables.severity).toBe('warning');
      expect(variables.status).toBe('firing');
      expect(variables.message).toBe('CPU usage is high');
      expect(variables._duration).toBe(300); // 5 mins = 300s
      expect(variables.tags).toBe(JSON.stringify({ host: 'server-1', env: 'production' }, null, 2));
      expect(variables._ruleId).toBe('rule-456');
      expect(variables._ruleDescription).toBe('Rule for high CPU usage');
      expect(variables.customVar).toBe('customValue');
      expect(variables.region).toBe('us-east-1');
    });
  });
});