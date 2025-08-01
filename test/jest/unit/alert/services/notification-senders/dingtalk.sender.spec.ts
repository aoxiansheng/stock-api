import { Test, TestingModule } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { BadRequestException } from '@nestjs/common';
import { of, throwError } from 'rxjs';
import * as crypto from 'crypto';
import { AxiosRequestHeaders, AxiosHeaders } from 'axios';

import { DingTalkSender } from '../../../../../../src/alert/services/notification-senders/dingtalk.sender';
import { NotificationChannelType, AlertSeverity, AlertStatus } from '../../../../../../src/alert/types/alert.types';
import { URLSecurityValidator } from '../../../../../../src/common/utils/url-security-validator.util';

// Mock URLSecurityValidator
jest.mock('../../../../../../src/common/utils/url-security-validator.util', () => ({
  URLSecurityValidator: {
    validateURL: jest.fn(),
  },
}));

describe('DingTalkSender', () => {
  let sender: DingTalkSender;
  let httpService: HttpService;

  const mockAlert = {
    id: 'alert123',
    ruleId: 'rule123',
    severity: AlertSeverity.CRITICAL,
    metric: 'CPU Usage',
    value: 95,
    threshold: 90,
    status: AlertStatus.FIRING,
    startTime: new Date('2023-01-01T10:00:00Z'),
    endTime: null,
    message: 'CPU usage is too high',
    ruleName: 'Test Rule',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockRule = {
    id: 'rule123',
    name: 'High CPU Alert',
    description: 'Alert when CPU usage exceeds 90%',
    metric: 'cpu_usage',
    operator: 'gt' as const,
    threshold: 90,
    duration: 60,
    severity: AlertSeverity.CRITICAL,
    enabled: true,
    channels: [],
    cooldown: 300,
    tags: {},
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockConfig = {
    id: 'dingtalk-channel-1',
    webhook_url: 'https://oapi.dingtalk.com/robot/send?access_token=testtoken',
    secret: 'testsecret',
    at_mobiles: ['13800000000'],
    isAtAll: false,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DingTalkSender,
        {
          provide: HttpService,
          useValue: {
            post: jest.fn(),
          },
        },
      ],
    }).compile();

    sender = module.get<DingTalkSender>(DingTalkSender);
    httpService = module.get<HttpService>(HttpService);

    // Reset mocks before each test
    (URLSecurityValidator.validateURL as jest.Mock).mockReturnValue({ valid: true });
    jest.spyOn(httpService, 'post').mockClear();
  });

  it('should be defined', () => {
    expect(sender).toBeDefined();
  });

  it('should have the correct type', () => {
    expect(sender.type).toEqual(NotificationChannelType.DINGTALK);
  });

  describe('send', () => {
    it('should send a DingTalk message successfully', async () => {
      jest.spyOn(httpService, 'post').mockReturnValue(of({
        data: { errcode: 0, errmsg: 'ok' },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: { headers: new AxiosHeaders() },
      }));

      const result = await sender.send(mockAlert, mockRule, mockConfig);

      expect(result.success).toBe(true);
      expect(result.channelType).toEqual(NotificationChannelType.DINGTALK);
      expect(result.message).toEqual('钉钉消息发送成功');
      expect(httpService.post).toHaveBeenCalledTimes(1);
      expect(httpService.post).toHaveBeenCalledWith(
        expect.stringContaining(mockConfig.webhook_url.split('?')[0]),
        expect.objectContaining({
          msgtype: 'markdown',
          markdown: {
            title: '[CRITICAL] High CPU Alert',
            text: expect.stringContaining('## High CPU Alert'),
          },
          at: {
            atMobiles: mockConfig.at_mobiles,
            isAtAll: mockConfig.isAtAll,
          },
        }),
      );
      // Verify signature and timestamp are appended
      const calledUrl = (httpService.post as jest.Mock).mock.calls[0][0];
      expect(calledUrl).toContain('timestamp=');
      expect(calledUrl).toContain('sign=');
    });

    it('should send a DingTalk message successfully without at_mobiles and at_all', async () => {
      jest.spyOn(httpService, 'post').mockReturnValue(of({
        data: { errcode: 0, errmsg: 'ok' },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: { headers: new AxiosHeaders() },
      }));

      const configWithoutAt = { ...mockConfig, at_mobiles: undefined, isAtAll: undefined };
      const result = await sender.send(mockAlert, mockRule, configWithoutAt);

      expect(result.success).toBe(true);
      expect(httpService.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          at: {
            atMobiles: [],
            isAtAll: false,
          },
        }),
      );
    });

    it('should return success: false if DingTalk API returns an error code', async () => {
      jest.spyOn(httpService, 'post').mockReturnValue(of({
        data: { errcode: 500, errmsg: 'error' },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: { headers: new AxiosHeaders() },
      }));

      const result = await sender.send(mockAlert, mockRule, mockConfig);

      expect(result.success).toBe(false);
      expect(result.message).toEqual('钉钉API返回错误码: 500');
      expect(result.error).toBeUndefined(); // 与其他Sender保持一致：API错误码时不包含error字段
    });

    it('should handle HTTP errors during sending', async () => {
      jest.spyOn(httpService, 'post').mockReturnValue(throwError(() => new Error('Network Error')));

      const result = await sender.send(mockAlert, mockRule, mockConfig);

      expect(result.success).toBe(false);
      expect(result.error).toEqual('Network Error');
    });

    it('should throw BadRequestException if webhook_url fails security validation', async () => {
      (URLSecurityValidator.validateURL as jest.Mock).mockReturnValue({ valid: false, error: 'Invalid URL' });

      await expect(sender.send(mockAlert, mockRule, mockConfig)).rejects.toThrow(
        new BadRequestException('DingTalk Webhook URL安全检查失败: Invalid URL'),
      );
    });

    it('should not sign URL if secret is not provided', async () => {
      jest.spyOn(httpService, 'post').mockReturnValue(of({
        data: { errcode: 0, errmsg: 'ok' },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: { headers: new AxiosHeaders() },
      }));

      const configWithoutSecret = { ...mockConfig, secret: undefined };
      await sender.send(mockAlert, mockRule, configWithoutSecret);

      const calledUrl = (httpService.post as jest.Mock).mock.calls[0][0];
      expect(calledUrl).not.toContain('timestamp=');
      expect(calledUrl).not.toContain('sign=');
    });
  });

  describe('test', () => {
    it('should return true for a successful test connection', async () => {
      jest.spyOn(httpService, 'post').mockReturnValue(of({
        data: { errcode: 0, errmsg: 'ok' },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: { headers: new AxiosHeaders() },
      }));

      const result = await sender.test(mockConfig);
      expect(result).toBe(true);
      expect(httpService.post).toHaveBeenCalledTimes(1);
      expect(httpService.post).toHaveBeenCalledWith(
        expect.stringContaining(mockConfig.webhook_url.split('?')[0]),
        expect.objectContaining({
          msgtype: 'text',
          text: { content: '测试消息' },
        }),
      );
    });

    it('should return false if DingTalk API returns an error code during test', async () => {
      jest.spyOn(httpService, 'post').mockReturnValue(of({
        data: { errcode: 500, errmsg: 'error' },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: { headers: new AxiosHeaders() },
      }));

      const result = await sender.test(mockConfig);
      expect(result).toBe(false);
    });

    it('should return false for HTTP errors during test connection', async () => {
      jest.spyOn(httpService, 'post').mockReturnValue(throwError(() => new Error('Network Error')));

      const result = await sender.test(mockConfig);
      expect(result).toBe(false);
    });

    it('should throw BadRequestException if webhook_url fails security validation during test', async () => {
      (URLSecurityValidator.validateURL as jest.Mock).mockReturnValue({ valid: false, error: 'Invalid URL' });

      await expect(sender.test(mockConfig)).rejects.toThrow(
        new BadRequestException('DingTalk Webhook URL安全检查失败: Invalid URL'),
      );
    });
  });

  describe('validateConfig', () => {
    it('should return valid: true for a valid configuration', () => {
      const config = {
        webhook_url: 'https://oapi.dingtalk.com/robot/send?access_token=test',
        secret: 'testsecret',
        at_mobiles: ['123'],
        at_all: true,
      };
      const result = sender.validateConfig(config);
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should return valid: false if webhook_url is missing', () => {
      const config = { secret: 'testsecret' };
      const result = sender.validateConfig(config);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Webhook URL is required for DingTalk notification');
    });

    it('should return valid: false if webhook_url is not a string', () => {
      const config = { webhook_url: 123, secret: 'testsecret' };
      const result = sender.validateConfig(config);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Webhook URL must be a string');
    });

    it('should return valid: false if webhook_url is not a valid DingTalk URL', () => {
      const config = { webhook_url: 'https://example.com', secret: 'testsecret' };
      const result = sender.validateConfig(config);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Webhook URL must be a valid DingTalk webhook URL');
    });

    it('should return valid: false if webhook_url fails security validation', () => {
      (URLSecurityValidator.validateURL as jest.Mock).mockReturnValue({ valid: false, error: 'Invalid URL' });
      const config = {
        webhook_url: 'https://oapi.dingtalk.com/robot/send?access_token=test',
        secret: 'testsecret',
      };
      const result = sender.validateConfig(config);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Webhook URL安全检查失败: Invalid URL');
    });

    it('should return valid: false if secret is missing', () => {
      const config = { webhook_url: 'https://oapi.dingtalk.com/robot/send?access_token=test' };
      const result = sender.validateConfig(config);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Secret is required for DingTalk notification');
    });

    it('should return valid: false if secret is not a string', () => {
      const config = { webhook_url: 'https://oapi.dingtalk.com/robot/send?access_token=test', secret: 123 };
      const result = sender.validateConfig(config);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Secret must be a string');
    });

    it('should return valid: false if at_mobiles is not an array', () => {
      const config = {
        webhook_url: 'https://oapi.dingtalk.com/robot/send?access_token=test',
        secret: 'testsecret',
        at_mobiles: 'not an array',
      };
      const result = sender.validateConfig(config);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('at_mobiles must be an array');
    });

    it('should return valid: false if at_all is not a boolean', () => {
      const config = {
        webhook_url: 'https://oapi.dingtalk.com/robot/send?access_token=test',
        secret: 'testsecret',
        at_all: 'not a boolean',
      };
      const result = sender.validateConfig(config);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('at_all must be a boolean');
    });
  });

  describe('private methods', () => {
    describe('getSignedUrl', () => {
      it('should return a signed URL if secret is provided', () => {
        const webhookUrl = 'https://oapi.dingtalk.com/robot/send?access_token=testtoken';
        const secret = 'testsecret';
        const timestamp = Date.now();

        // Mock Date.now() to get a consistent timestamp for testing
        jest.spyOn(Date, 'now').mockReturnValue(timestamp);

        const stringToSign = `${timestamp}\n${secret}`;
        const signature = crypto
          .createHmac('sha256', secret)
          .update(stringToSign)
          .digest('base64');

        const expectedUrl = `${webhookUrl}&timestamp=${timestamp}&sign=${encodeURIComponent(signature)}`;
        const signedUrl = sender['getSignedUrl'](webhookUrl, secret);
        expect(signedUrl).toEqual(expectedUrl);
      });

      it('should return the original URL if secret is not provided', () => {
        const webhookUrl = 'https://oapi.dingtalk.com/robot/send?access_token=testtoken';
        const signedUrl = sender['getSignedUrl'](webhookUrl, undefined);
        expect(signedUrl).toEqual(webhookUrl);
      });
    });

    describe('formatDingTalkMessage', () => {
      it('should format the alert and rule into a markdown message', () => {
        const formattedMessage = sender['formatDingTalkMessage'](mockAlert, mockRule);
        expect(formattedMessage).toContain('## High CPU Alert');
        expect(formattedMessage).toContain('**严重级别**: CRITICAL');
        expect(formattedMessage).toContain('**监控指标**: CPU Usage');
        expect(formattedMessage).toContain('**当前值**: 95');
        expect(formattedMessage).toContain('**阈值**: 90');
        expect(formattedMessage).toContain('**状态**: firing'); // 状态字段使用小写
        expect(formattedMessage).toContain('**时间**:');
      });
    });
  });
});