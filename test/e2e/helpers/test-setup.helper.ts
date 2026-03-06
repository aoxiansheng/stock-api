/**
 * E2E测试环境设置辅助工具
 * 提供测试应用启动、数据库清理、测试用户创建等功能
 */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '@src/app.module';
import { GlobalExceptionFilter } from '@common/core/filters';
import {
  ResponseInterceptor,
  RequestTrackingInterceptor,
} from '@common/core/interceptors';

const DEFAULT_E2E_TEST_TIMEOUT_MS = 120000;
const parsedE2eTimeout = Number.parseInt(process.env.E2E_TEST_TIMEOUT_MS || '', 10);
export const E2E_TEST_TIMEOUT_MS =
  Number.isFinite(parsedE2eTimeout) && parsedE2eTimeout > 0
    ? parsedE2eTimeout
    : DEFAULT_E2E_TEST_TIMEOUT_MS;

const SHOULD_LOG_APP_BOOTSTRAP_TIMING = process.env.E2E_LOG_APP_BOOTSTRAP_TIMING === '1';

function logBootstrapTiming(stage: string, durationMs: number): void {
  if (!SHOULD_LOG_APP_BOOTSTRAP_TIMING) {
    return;
  }
  console.log(`[e2e/bootstrap] ${stage}: ${durationMs}ms`);
}

export interface TestAppContext {
  app: INestApplication;
  httpServer: any;
  moduleRef: TestingModule;
}

export interface TestUser {
  username: string;
  password: string;
  email: string;
  role: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface ApiKeyPair {
  appKey: string;
  accessToken: string;
}

async function forceCloseMongooseConnections(): Promise<void> {
  try {
    const mongoose = await import('mongoose');
    const closeJobs = mongoose.connections
      .filter(conn => conn.readyState !== 0)
      .map(conn => conn.close(true).catch(() => undefined));
    await Promise.all(closeJobs);
    await mongoose.disconnect().catch(() => undefined);
  } catch {
    // ignore cleanup errors in test teardown path
  }
}

/**
 * 创建测试应用实例
 */
export async function createTestApp(): Promise<TestAppContext> {
  const bootstrapStartAt = Date.now();
  let moduleRef: TestingModule | undefined;
  let app: INestApplication | undefined;

  try {
    const compileStartAt = Date.now();
    moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    logBootstrapTiming('compile', Date.now() - compileStartAt);

    app = moduleRef.createNestApplication();

    // 配置全局管道、过滤器、拦截器（与main.ts保持一致）
    app.useGlobalPipes(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    );

    app.useGlobalFilters(new GlobalExceptionFilter());
    app.useGlobalInterceptors(new RequestTrackingInterceptor());
    app.useGlobalInterceptors(new ResponseInterceptor());
    app.setGlobalPrefix('api/v1');

    const initStartAt = Date.now();
    await app.init();
    logBootstrapTiming('app.init', Date.now() - initStartAt);
    logBootstrapTiming('total', Date.now() - bootstrapStartAt);

    return {
      app,
      httpServer: app.getHttpServer(),
      moduleRef,
    };
  } catch (error) {
    try {
      if (app) {
        await app.close();
      }
    } catch {
      // ignore cleanup errors in startup failure path
    }
    try {
      if (moduleRef) {
        await moduleRef.close();
      }
    } catch {
      // ignore cleanup errors in startup failure path
    }
    await forceCloseMongooseConnections();
    throw error;
  }
}

/**
 * 清理测试应用
 */
export async function cleanupTestApp(context: TestAppContext | undefined): Promise<void> {
  if (!context?.app) return;

  const app = context.app;
  const moduleRef = context.moduleRef;
  const cleanupErrors: string[] = [];

  const isIgnorableMissingProviderError = (error: unknown): boolean => {
    const message = error instanceof Error ? error.message : String(error);
    return message.includes('Nest could not find given element');
  };

  // 确保定时器/异步操作有机会进入可清理状态
  await new Promise(resolve => setTimeout(resolve, 1000));

  // 显式关闭 Mongoose 连接，避免测试结束后连接句柄残留
  try {
    const { Connection } = await import('mongoose');
    const connection = moduleRef.get(Connection, { strict: false });
    if (connection && typeof connection.close === 'function') {
      await connection.close(true);
    }
  } catch (error: any) {
    if (isIgnorableMissingProviderError(error)) {
      console.warn('⚠️ mongoose provider not found in current test context, skip close');
    } else {
      cleanupErrors.push(`mongoose.close: ${error?.message || String(error)}`);
    }
  } finally {
    await forceCloseMongooseConnections();
  }

  // 关闭应用本身
  try {
    await app.close();
  } catch (error: any) {
    cleanupErrors.push(`app.close: ${error?.message || String(error)}`);
  }

  // 额外等待确保资源释放
  await new Promise(resolve => setTimeout(resolve, 500));

  if (cleanupErrors.length > 0) {
    const summary = cleanupErrors.join(' | ');
    console.error('❌ Test app cleanup failed:', summary);
    throw new Error(`Test app cleanup failed: ${summary}`);
  }
}

/**
 * 测试用户数据
 */
export const TEST_USERS = {
  ADMIN: {
    username: 'e2e_admin',
    password: 'Admin@123456',
    email: 'admin@e2e-test.com',
    role: 'ADMIN',
  } as TestUser,
  DEVELOPER: {
    username: 'e2e_developer',
    password: 'Dev@123456',
    email: 'dev@e2e-test.com',
    role: 'DEVELOPER',
  } as TestUser,
  USER: {
    username: 'e2e_user',
    password: 'User@123456',
    email: 'user@e2e-test.com',
    role: 'DEVELOPER', // 使用 DEVELOPER 角色，因为系统只支持 ADMIN 和 DEVELOPER
  } as TestUser,
};

/**
 * 测试股票代码
 */
export const TEST_SYMBOLS = {
  US: ['AAPL.US', 'TSLA.US', 'GOOGL.US', 'MSFT.US', 'AMZN.US'],
  HK: ['00700.HK', '09988.HK', '01810.HK', '02318.HK'],
  CN: ['600519.SH', '000001.SZ', '600036.SH'],
  INVALID: ['INVALID.XX', 'NOTFOUND.US', '99999.HK'],
};

/**
 * 测试市场
 */
export const TEST_MARKETS = {
  US: 'US',
  HK: 'HK',
  CN: 'CN',
  SG: 'SG',
};

/**
 * 用户注册辅助函数
 */
export async function registerUser(
  httpServer: any,
  user: TestUser,
): Promise<void> {
  await request(httpServer)
    .post('/api/v1/auth/register')
    .send({
      username: user.username,
      password: user.password,
      email: user.email,
      role: user.role,
    })
    .expect((res) => {
      // 如果用户已存在，不报错
      if (res.status !== 201 && res.status !== 409) {
        throw new Error(`Registration failed: ${res.body.message}`);
      }
    });
}

/**
 * 用户登录辅助函数
 */
export async function loginUser(
  httpServer: any,
  username: string,
  password: string,
): Promise<AuthTokens> {
  const response = await request(httpServer)
    .post('/api/v1/auth/login')
    .send({ username, password })
    .expect(200);

  return {
    accessToken: response.body.data.accessToken,
    refreshToken: response.body.data.refreshToken,
  };
}

/**
 * 创建API Key辅助函数
 */
export async function createApiKey(
  httpServer: any,
  jwtToken: string,
  name: string = 'E2E Test API Key',
  permissions: string[] = ['data:read', 'query:execute'],
): Promise<ApiKeyPair> {
  const response = await request(httpServer)
    .post('/api/v1/auth/api-keys')
    .set('Authorization', `Bearer ${jwtToken}`)
    .send({
      name,
      permissions,
      expiresIn: '30d',
    })
    .expect(201);

  return {
    appKey: response.body.data.appKey,
    accessToken: response.body.data.accessToken,
  };
}

/**
 * 等待函数（用于异步操作）
 */
export function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * 生成随机字符串
 */
export function randomString(length: number = 8): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * 检查响应格式是否符合标准
 */
export function assertStandardResponse(response: any): void {
  expect(response.body).toHaveProperty('success');
  expect(response.body).toHaveProperty('data');
  expect(response.body).toHaveProperty('message');
  expect(response.body).toHaveProperty('timestamp');
}

/**
 * 检查错误响应格式
 */
export function assertErrorResponse(response: any): void {
  expect(response.body).toHaveProperty('success', false);
  expect(response.body).toHaveProperty('error');
  expect(response.body.error).toHaveProperty('code');
  expect(response.body.error).toHaveProperty('details');
  // message 信息在顶层或 details 中,不在 error 对象直接层级
  expect(response.body).toHaveProperty('message');
}

/**
 * 清理测试数据
 */
export async function cleanupTestData(context: TestAppContext): Promise<void> {
  try {
    // 获取MongoDB连接
    const { Connection } = await import('mongoose');
    const connection = context.moduleRef.get(Connection);

    // 清理测试用户数据
    if (connection) {
      await connection.collection('users').deleteMany({
        $or: [
          { username: /^e2e_/ },
          { username: /^test_user_/ },
          { username: /^duplicate_/ },
          { email: /@e2e-test\.com$/ },
          { email: /@test\.com$/ },
          { email: /^ratelimit_test_/ }
        ]
      });

      // 清理测试API Keys
      await connection.collection('apikeys').deleteMany({
        name: /E2E Test/
      });

      console.log('✅ Test data cleanup completed');
    }
  } catch (error) {
    console.warn('⚠️  Test data cleanup failed:', error.message);
  }
}
