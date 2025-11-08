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

/**
 * 创建测试应用实例
 */
export async function createTestApp(): Promise<TestAppContext> {
  const moduleRef: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleRef.createNestApplication();

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

  await app.init();

  return {
    app,
    httpServer: app.getHttpServer(),
    moduleRef,
  };
}

/**
 * 清理测试应用
 */
export async function cleanupTestApp(context: TestAppContext | undefined): Promise<void> {
  if (!context?.app) return;

  try {
    // 关闭所有打开的连接
    const app = context.app;

    // 确保所有定时器和异步操作完成
    await new Promise(resolve => setTimeout(resolve, 1000));

    // 关闭应用
    await app.close();

    // 额外等待确保所有资源释放
    await new Promise(resolve => setTimeout(resolve, 500));
  } catch (error) {
    console.warn('Error during test app cleanup:', error);
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
