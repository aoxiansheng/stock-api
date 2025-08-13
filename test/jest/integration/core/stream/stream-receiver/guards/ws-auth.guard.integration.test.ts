/* eslint-disable @typescript-eslint/no-unused-vars */
import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext } from '@nestjs/common';
import { Socket } from 'socket.io';

import { WsAuthGuard } from '../../../../../../../src/core/stream/stream-receiver/guards/ws-auth.guard';
import { ApiKeyService } from '../../../../../../../src/auth/services/apikey.service';
import { RateLimitService } from '../../../../../../../src/auth/services/rate-limit.service';
import { Permission } from '../../../../../../../src/auth/enums/user-role.enum';

import { createLogger } from '../../../../../../../src/common/config/logger.config';

/**
 * WsAuthGuard 集成测试
 * 仅测试 API Key 认证逻辑（已移除 JWT 相关测试）。
 * 
 * 覆盖场景：
 * 1. 有效的 API Key 认证成功
 * 2. 无效的 API Key 被拒绝
 * 3. 缺失认证信息被拒绝
 * 4. 缺少流权限被拒绝
 * 5. 频率限制超出被拒绝
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

// 创建模拟 Socket
const createMockSocket = (auth?: { appKey?: string; accessToken?: string }): Partial<Socket> => {
  const headers: any = {};
  const query: any = {};

  if (auth?.appKey) headers['x-app-key'] = auth.appKey;
  if (auth?.accessToken) headers['x-access-token'] = auth.accessToken;

  return {
    id: 'test-socket-123',
    handshake: {
      auth: auth || {},
      headers,
      query,
      address: '127.0.0.1',
      url: '/stream',
      xdomain: false,
      secure: false,
      issued: Date.now(),
      time: new Date().toISOString(),
    } as any,
    data: {} as any,
    emit: jest.fn(),
    disconnect: jest.fn(),
  } as Partial<Socket>;
};

// 创建 ExecutionContext
function createExecutionContext(socket: Partial<Socket>): ExecutionContext {
  return {
    switchToWs: () => ({
      getClient: () => socket,
      getData: () => ({}),
      getPattern: () => undefined,
    }),
    getType: () => 'ws' as any,
    getClass: () => ({} as any),
    getHandler: () => ({} as any),
    switchToHttp: () => ({} as any),
    switchToRpc: () => ({} as any),
    getArgs: () => [],
    getArgByIndex: () => ({} as any),
  } as any;
}

describe('WsAuthGuard Integration (API Key)', () => {
  let guard: WsAuthGuard;
  let apiKeyService: ApiKeyService;
  let rateLimitService: RateLimitService;
  let moduleRef: TestingModule;

  const validAppKey = 'valid-app-key';
  const validAccessToken = 'valid-access-token';

  const baseApiKeyDoc = {
    id: 'api-key-id',
    name: '测试 API Key',
    permissions: [Permission.STREAM_READ],
    appKey: validAppKey,
  } as any;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WsAuthGuard,
        {
          provide: ApiKeyService,
          useValue: {
            _validateApiKey: jest.fn(),
          },
        },
        {
          provide: RateLimitService,
          useValue: {
            checkRateLimit: jest.fn(),
          },
        },
      ],
    }).compile();

    moduleRef = module;
    guard = module.get<WsAuthGuard>(WsAuthGuard);
    apiKeyService = module.get<ApiKeyService>(ApiKeyService);
    rateLimitService = module.get<RateLimitService>(RateLimitService);
  });

  afterAll(async () => {
    await moduleRef.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('✅ 有效的 API Key 应通过认证', async () => {
    (apiKeyService.validateApiKey as jest.Mock).mockResolvedValue(baseApiKeyDoc);
    const socket = createMockSocket({ appKey: validAppKey, accessToken: validAccessToken });
    const ctx = createExecutionContext(socket);

    const result = await guard.canActivate(ctx);

    expect(result).toBe(true);
    expect(socket.data.apiKey).toMatchObject({
      id: baseApiKeyDoc._id,
      name: baseApiKeyDoc.name,
      permissions: baseApiKeyDoc.permissions,
      authType: 'apikey',
    });
    expect(apiKeyService.validateApiKey).toHaveBeenCalledWith(validAppKey, validAccessToken);
  });

  it('❌ 无效的 API Key 应被拒绝', async () => {
    (apiKeyService.validateApiKey as jest.Mock).mockResolvedValue(null);
    const socket = createMockSocket({ appKey: 'bad-key', accessToken: 'bad-token' });
    const result = await guard.canActivate(createExecutionContext(socket));

    expect(result).toBe(false);
    expect(mockLogger.warn).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'API Key 验证失败' }),
    );
  });

  it('❌ 缺失 accessToken 应被拒绝', async () => {
    const socket = createMockSocket({ appKey: validAppKey });
    const result = await guard.canActivate(createExecutionContext(socket));

    expect(result).toBe(false);
    expect(mockLogger.warn).toHaveBeenCalledWith('WebSocket 连接缺少API Key认证信息');
  });

  it('❌ 缺少流权限应被拒绝', async () => {
    (apiKeyService.validateApiKey as jest.Mock).mockResolvedValue({
      ...baseApiKeyDoc,
      permissions: ['data:read'],
    });
    const socket = createMockSocket({ appKey: validAppKey, accessToken: validAccessToken });
    const result = await guard.canActivate(createExecutionContext(socket));

    expect(result).toBe(false);
    expect(mockLogger.warn).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'API Key 缺少 WebSocket 流权限' }),
    );
  });

  it('❌ 频率限制超出应被拒绝', async () => {
    (apiKeyService.validateApiKey as jest.Mock).mockResolvedValue({
      ...baseApiKeyDoc,
      rateLimit: { window: '1m', requests: 100 },
    });
    (rateLimitService.checkRateLimit as jest.Mock).mockResolvedValue({
      allowed: false,
      limit: 100,
      current: 120,
      remaining: 0,
      resetTime: Date.now() + 60000,
      retryAfter: 10,
    });

    const socket = createMockSocket({ appKey: validAppKey, accessToken: validAccessToken });
    const result = await guard.canActivate(createExecutionContext(socket));

    expect(result).toBe(false);
    expect(mockLogger.warn).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'WebSocket API Key 频率限制超出' }),
    );
  });
});