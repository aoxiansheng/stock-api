/* eslint-disable @typescript-eslint/no-unused-vars */
import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { of, throwError } from 'rxjs';
import { AxiosHeaders } from 'axios';

import { WebhookSender } from '../../../../../../src/alert/services/notification-senders/webhook.sender';
import { NotificationChannelType, AlertSeverity, AlertStatus } from '../../../../../../src/alert/types/alert.types';
import { URLSecurityValidator } from '../../../../../../src/common/utils/url-security-validator.util';

// Mock URLSecurityValidator
jest.mock('../../../../../../src/common/utils/url-security-validator.util', () => ({
  URLSecurityValidator: {
    validateURL: jest.fn(),
  },
}));

describe('WebhookSender', () => {
  let sender: WebhookSender;
  let httpService: HttpService;

  const mockAlert = {
    id: 'alert123',
    ruleId: 'rule123',
    severity: AlertSeverity.CRITICAL,
    metric: 'CPU Usage',
    value: 95,
    threshold: 90,
    status: AlertStatus.FIRING,
    startTime: new Date('2023-01-_01T10:_00:00Z'),
    endTime: new Date(),
    message: 'CPU usage is too high',
    ruleName: 'Test Rule',
    createdAt: new Date(),
    updatedAt: new Date(),
    acknowledgedBy: 'user',
    acknowledgedAt: new Date(),
    resolvedBy: 'user',
    resolvedAt: new Date(),
    tags: {},
    context: {},
  };

  const mockRule = {
    id: 'rule123',
    name: 'High CPU Alert',
    description: 'Alert when CPU usage exceeds 90%',
    metric: 'cpu_usage',
    operator: 'gt' as "gt" | "lt" | "eq" | "gte" | "lte" | "ne",
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
    id: 'webhook-channel-1',
    url: 'http://example.com/webhook',
    headers: { 'X-Custom-Header': 'value' },
    timeout: 5000,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WebhookSender,
        {
          provide: HttpService,
          useValue: {
            post: jest.fn(),
            get: jest.fn(),
          },
        },
      ],
    }).compile();

    sender = module.get<WebhookSender>(WebhookSender);
    httpService = module.get<HttpService>(HttpService);

    // Reset mocks before each test
    (URLSecurityValidator.validateURL as jest.Mock).mockReturnValue({ valid: true });
    jest.spyOn(httpService, 'post').mockClear();
    jest.spyOn(httpService, 'get').mockClear();
  });

  it('should be defined', () => {
    expect(sender).toBeDefined();
  });

  it('should have the correct type', () => {
    expect(sender.type).toEqual(NotificationChannelType.WEBHOOK);
  });

  describe('send', () => {
    it('should send a webhook request successfully', async () => {
      jest.spyOn(httpService, 'post').mockReturnValue(of({
        data: { status: 'success' },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: { headers: new AxiosHeaders() },
      }));

      const result = await sender.send(mockAlert, mockRule, mockConfig);

      expect(result.success).toBe(true);
      expect(result.channelType).toEqual(NotificationChannelType.WEBHOOK);
      expect(result.message).toEqual('Webhook 调用成功: 200');
      expect(httpService.post).toHaveBeenCalledTimes(1);
      expect(httpService.post).toHaveBeenCalledWith(
        mockConfig.url,
        expect.objectContaining({
          alert: mockAlert,
          rule: expect.objectContaining({
            id: mockRule.id,
            name: mockRule.name,
          }),
          timestamp: expect.any(String),
        }),
        expect.objectContaining({
          headers: mockConfig.headers,
          timeout: mockConfig.timeout,
        }),
      );
    });

    it('should use default headers and timeout if not provided', async () => {
      jest.spyOn(httpService, 'post').mockReturnValue(of({
        data: { status: 'success' },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: { headers: new AxiosHeaders() },
      }));

      const configWithoutOptional = { id: 'webhook-channel-2', url: 'http://example.com/simple' };
      await sender.send(mockAlert, mockRule, configWithoutOptional);

      expect(httpService.post).toHaveBeenCalledWith(
        configWithoutOptional.url,
        expect.any(Object),
        expect.objectContaining({
          headers: {},
          timeout: 30000,
        }),
      );
    });

    it('should return success: false if webhook returns non-2xx status', async () => {
      jest.spyOn(httpService, 'post').mockReturnValue(of({
        data: 'error',
        status: 400,
        statusText: 'Bad Request',
        headers: {},
        config: { headers: new AxiosHeaders() },
      }));

      const result = await sender.send(mockAlert, mockRule, mockConfig);

      expect(result.success).toBe(false);
      expect(result.message).toEqual('Webhook 返回状态码: 400');
      expect(result.error).toBeUndefined(); // 与其他Sender保持一致：非2xx状态时不包含error字段
    });

    it('should handle HTTP errors during sending', async () => {
      jest.spyOn(httpService, 'post').mockReturnValue(throwError(() => new Error('Network Error')));

      const result = await sender.send(mockAlert, mockRule, mockConfig);

      expect(result.success).toBe(false);
      expect(result.error).toEqual('Network Error');
    });

    it('should throw BadRequestException if URL fails security validation', async () => {
      (URLSecurityValidator.validateURL as jest.Mock).mockReturnValue({ valid: false, error: 'Invalid URL' });

      await expect(sender.send(mockAlert, mockRule, mockConfig)).rejects.toThrow(
        new BadRequestException('URL安全检查失败: Invalid URL'),
      );
    });
  });

  describe('test', () => {
    it('should return true for a successful test connection', async () => {
      jest.spyOn(httpService, 'get').mockReturnValue(of({
        data: 'ok',
        status: 200,
        statusText: 'OK',
        headers: {},
        config: { headers: new AxiosHeaders() },
      }));

      const result = await sender.test(mockConfig);
      expect(result).toBe(true);
      expect(httpService.get).toHaveBeenCalledTimes(1);
      expect(httpService.get).toHaveBeenCalledWith(
        mockConfig.url,
        expect.objectContaining({
          timeout: 5000,
        }),
      );
    });

    it('should return false if webhook returns non-2xx or 3xx status during test', async () => {
      jest.spyOn(httpService, 'get').mockReturnValue(of({
        data: 'error',
        status: 404,
        statusText: 'Not Found',
        headers: {},
        config: { headers: new AxiosHeaders() },
      }));

      const result = await sender.test(mockConfig);
      expect(result).toBe(false);
    });

    it('should return false for HTTP errors during test connection', async () => {
      jest.spyOn(httpService, 'get').mockReturnValue(throwError(() => new Error('Network Error')));

      const result = await sender.test(mockConfig);
      expect(result).toBe(false);
    });

    it('should throw BadRequestException if URL fails security validation during test', async () => {
      (URLSecurityValidator.validateURL as jest.Mock).mockReturnValue({ valid: false, error: 'Invalid URL' });

      await expect(sender.test(mockConfig)).rejects.toThrow(
        new BadRequestException('URL安全检查失败: Invalid URL'),
      );
    });

    it('should throw BadRequestException if Authorization header is present in test config', async () => {
      const configWithAuth = {
        ...mockConfig,
        headers: { Authorization: 'Bearer token' },
      };

      await expect(sender.test(configWithAuth)).rejects.toThrow(
        new BadRequestException('出于安全原因，测试配置中不允许包含 Authorization 头部'),
      );
    });
  });

  describe('validateConfig', () => {
    it('should return valid: true for a valid configuration', () => {
      const config = {
        url: 'http://valid.com/webhook',
        timeout: 10000,
        headers: { 'Content-Type': 'application/json' },
      };
      const result = sender.validateConfig(config);
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should return valid: false if url is missing', () => {
      const config = {};
      const result = sender.validateConfig(config);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('URL is required for webhook notification');
    });

    it('should return valid: false if url is not a string', () => {
      const config = { url: 123 };
      const result = sender.validateConfig(config);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('URL must be a string');
    });

    it('should return valid: false if url is not a valid URL', () => {
      const config = { url: 'invalid-url' };
      const result = sender.validateConfig(config);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('URL must be a valid URL');
    });

    it('should return valid: false if url fails security validation', () => {
      (URLSecurityValidator.validateURL as jest.Mock).mockReturnValue({ valid: false, error: 'Invalid URL' });
      const config = { url: 'http://valid.com/webhook' };
      const result = sender.validateConfig(config);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('URL安全检查失败: Invalid URL');
    });

    it('should return valid: false if timeout is not a positive number', () => {
      const config = { url: 'http://valid.com', timeout: -100 };
      let result = sender.validateConfig(config);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Timeout must be a positive number');

      result = sender.validateConfig({ url: 'http://valid.com', timeout: 'abc' });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Timeout must be a positive number');
    });

    it('should return valid: false if headers is not an object', () => {
      const config = { url: 'http://valid.com', headers: 'not-an-object' };
      const result = sender.validateConfig(config);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Headers must be an object');
    });

    it('should return valid: false if Authorization header is present in config', () => {
      const config = {
        url: 'http://valid.com',
        headers: { Authorization: 'Bearer token' },
      };
      const result = sender.validateConfig(config);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('出于安全原因，配置中不允许包含 Authorization 头部');
    });
  });
});