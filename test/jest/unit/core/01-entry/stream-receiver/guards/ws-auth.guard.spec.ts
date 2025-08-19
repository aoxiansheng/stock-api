/* eslint-disable @typescript-eslint/no-unused-vars */
import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext } from '@nestjs/common';
import { Socket } from 'socket.io';

import { WsAuthGuard } from '../../../../../../../src/core/01-entry/stream-receiver/guards/ws-auth.guard';
import { ApiKeyService } from '../../../../../../../src/auth/services/apikey.service';
import { RateLimitService } from '../../../../../../../src/auth/services/rate-limit.service';
import { Permission } from '../../../../../../../src/auth/enums/user-role.enum';

import { createLogger } from '@common/config/logger.config';

/**
 * WsAuthGuard 单元测试
 * 仅验证 API Key 相关场景
 */

// 模拟 logger
jest.mock('@common/config/logger.config');
const mockLogger = {
  debug: jest.fn(),
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};
(createLogger as jest.Mock).mockReturnValue(mockLogger);

// 创建模拟服务
const mockApiKeyService = {
  validateApiKey: jest.fn(),
};
const mockRateLimitService = {
  checkRateLimit: jest.fn(),
};

// 创建模拟 Socket
const createMockSocket = (auth?: { appKey?: string; accessToken?: string }): Partial<Socket> => {
  const headers: any = {};
  const query: any = {};
  if (auth?.appKey) headers['x-app-key'] = auth.appKey;
  if (auth?.accessToken) headers['x-access-token'] = auth.accessToken;

  return {
    id: 'test-socket-unit',
    data: {},
    handshake: {
      headers,
      query,
      address: '127.0.0.1',
    } as any,
  } as Partial<Socket>;
};

// 创建 ExecutionContext
const createExecutionContext = (socket: Partial<Socket>, data: any = {}) => {
  return {
    switchToWs: () => ({
      getClient: () => socket,
      getData: () => data,
    }),
  } as unknown as ExecutionContext;
};

describe('WsAuthGuard 单元测试', () => {
  let guard: WsAuthGuard;
  const validAppKey = 'unit-valid-key';
  const validAccessToken = 'unit-valid-token';
  const baseApiKeyDoc = {
    id: 'apikey-id',
    name: '单元测试 Key',
    permissions: [Permission.STREAM_READ],
    appKey: validAppKey,
  } as any;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WsAuthGuard,
        { provide: ApiKeyService, useValue: mockApiKeyService },
        { provide: RateLimitService, useValue: mockRateLimitService },
      ],
    }).compile();

    guard = module.get<WsAuthGuard>(WsAuthGuard);
  });

  it('✅ 应通过含有效 API Key 的消息数据认证', async () => {
    mockApiKeyService.validateApiKey.mockResolvedValue(baseApiKeyDoc);
    const socket = createMockSocket();
    const context = createExecutionContext(socket, {
      apiKey: validAppKey,
      accessToken: validAccessToken,
    });

    const result = await guard.canActivate(context);
    expect(result).toBe(true);
    expect(mockApiKeyService.validateApiKey).toHaveBeenCalledWith(validAppKey, validAccessToken);
    expect(socket.data['apiKey']).toMatchObject({ authType: 'apikey' });
  });

  it('❌ 缺失 accessToken 应拒绝连接', async () => {
    const socket = createMockSocket({ appKey: validAppKey });
    const context = createExecutionContext(socket);
    const result = await guard.canActivate(context);

    expect(result).toBe(false);
    expect(mockLogger.warn).toHaveBeenCalledWith('WebSocket 连接缺少API Key认证信息');
  });

  it('❌ 无效 API Key 应拒绝连接', async () => {
    mockApiKeyService.validateApiKey.mockResolvedValue(null);
    const socket = createMockSocket({ appKey: 'bad', accessToken: 'bad' });
    const context = createExecutionContext(socket);

    const result = await guard.canActivate(context);
    expect(result).toBe(false);
    expect(mockLogger.warn).toHaveBeenCalledWith(expect.objectContaining({ message: 'API Key 验证失败' }));
  });

  it('❌ 缺少流权限应拒绝连接', async () => {
    mockApiKeyService.validateApiKey.mockResolvedValue({
      ...baseApiKeyDoc,
      permissions: ['data:read'],
    });
    const socket = createMockSocket({ appKey: validAppKey, accessToken: validAccessToken });
    const context = createExecutionContext(socket);

    const result = await guard.canActivate(context);
    expect(result).toBe(false);
    expect(mockLogger.warn).toHaveBeenCalledWith(expect.objectContaining({ message: 'API Key 缺少 WebSocket 流权限' }));
  });

  it('❌ 频率限制超出应拒绝连接', async () => {
    mockApiKeyService.validateApiKey.mockResolvedValue({
      ...baseApiKeyDoc,
      rateLimit: { window: '1m', requests: 100 },
    });
    mockRateLimitService.checkRateLimit.mockResolvedValue({ allowed: false, limit: 100, current: 200 });

    const socket = createMockSocket({ appKey: validAppKey, accessToken: validAccessToken });
    const context = createExecutionContext(socket);
    const result = await guard.canActivate(context);

    expect(result).toBe(false);
    expect(mockLogger.warn).toHaveBeenCalledWith(expect.objectContaining({ message: 'WebSocket API Key 频率限制超出' }));
  });

  it('✅ 当限速检查通过时应允许连接', async () => {
    mockApiKeyService.validateApiKey.mockResolvedValue({
      ...baseApiKeyDoc,
      rateLimit: { window: '1m', requests: 100 },
    });
    mockRateLimitService.checkRateLimit.mockResolvedValue({ allowed: true, limit: 100, current: 10 });

    const socket = createMockSocket({ appKey: validAppKey, accessToken: validAccessToken });
    const context = createExecutionContext(socket);
    const result = await guard.canActivate(context);

    expect(result).toBe(true);
    expect(mockRateLimitService.checkRateLimit).toHaveBeenCalled();
  });
});