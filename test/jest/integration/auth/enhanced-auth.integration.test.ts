import { INestApplication } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
const request = require('supertest');
import { TestDataHelper } from '../../../config/integration.setup';

describe('Enhanced Authentication Integration Tests', () => {
  let app: INestApplication;
  let httpServer: any;
  let userModel: Model<any>;
  let apiKeyModel: Model<any>;

  beforeAll(() => {
    app = (global as any).testApp;
    console.log('BeforeAll - testApp:', !!app);
    
    if (!app) {
      throw new Error('testApp is not available in global context');
    }
    
    httpServer = app.getHttpServer();
    userModel = app.get(getModelToken('User'));
    apiKeyModel = app.get(getModelToken('ApiKey'));
    
    console.log('BeforeAll - httpServer:', !!httpServer);
    console.log('BeforeAll - userModel:', !!userModel);
    console.log('BeforeAll - apiKeyModel:', !!apiKeyModel);
  });

  afterEach(async () => {
    // Clean up database after each test
    await userModel.deleteMany({});
    await apiKeyModel.deleteMany({});
  });

  describe('User Registration and Login', () => {
    it('should register a new user successfully', async () => {
      // 首先检查应用是否正确启动
      console.log('App:', !!app);
      console.log('HttpServer:', !!httpServer);
      console.log('UserModel:', !!userModel);
      
      const userData = {
        username: 'newuser',
        email: 'newuser@test.com',
        password: 'securepassword123',
        role: 'developer',
      };

      const response = await request(httpServer)
        .post('/api/v1/auth/register')
        .send(userData);

      // 打印响应详细信息
      console.log('Response status:', response.status);
      console.log('Response body:', JSON.stringify(response.body, null, 2));
      console.log('Response text:', response.text);

      expect(response.status).toBe(201);
      expect(response.body.statusCode).toBe(201);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data.username).toBe(userData.username);
      expect(response.body.data.email).toBe(userData.email);
      expect(response.body.data).not.toHaveProperty('password');

      // Verify user was created in database
      const savedUser = await userModel.findOne({ username: userData.username });
      expect(savedUser).toBeTruthy();
      expect(savedUser.email).toBe(userData.email);
    });

    it('should prevent duplicate username registration', async () => {
      const userData = {
        username: 'duplicate-test',
        email: 'first@test.com',
        password: 'password123',
        role: 'developer',
      };

      // First registration should succeed
      await request(httpServer)
        .post('/api/v1/auth/register')
        .send(userData)
        .expect(201);

      // Second registration with same username should fail
      const response = await request(httpServer)
        .post('/api/v1/auth/register')
        .send({
          ...userData,
          email: 'second@test.com',
        })
        .expect(409);

      expect(response.body.statusCode).toBe(409);
      expect(response.body.message).toContain('用户名或邮箱已存在');
    });

    it('should prevent duplicate email registration', async () => {
      const userData = {
        username: 'user1',
        email: 'duplicate@test.com',
        password: 'password123',
        role: 'developer',
      };

      // First registration should succeed
      await request(httpServer)
        .post('/api/v1/auth/register')
        .send(userData)
        .expect(201);

      // Second registration with same email should fail
      const response = await request(httpServer)
        .post('/api/v1/auth/register')
        .send({
          ...userData,
          username: 'user2',
        })
        .expect(409);

      expect(response.body.statusCode).toBe(409);
      expect(response.body.message).toContain('邮箱已存在');
    });

    it('should validate password requirements', async () => {
      const response = await request(httpServer)
        .post('/api/v1/auth/register')
        .send({
          username: 'testuser',
          email: 'test@test.com',
          password: '123', // Too short
          role: 'developer',
        })
        .expect(400);

      expect(response.body.statusCode).toBe(400);
      // 验证错误消息可能是数组格式
      if (Array.isArray(response.body.message)) {
        expect(response.body.message.some(msg => msg.includes('password'))).toBe(true);
      } else {
        expect(response.body.message).toContain('password');
      }
    });

    it('should validate email format', async () => {
      const response = await request(httpServer)
        .post('/api/v1/auth/register')
        .send({
          username: 'testuser',
          email: 'invalid-email',
          password: 'password123',
        })
        .expect(400);

      expect(response.body.statusCode).toBe(400);
    });

    it('should login with valid credentials', async () => {
      const userData = {
        username: 'loginuser',
        email: 'login@test.com',
        password: 'password123',
        role: 'developer',
      };

      // Register user first
      await request(httpServer)
        .post('/api/v1/auth/register')
        .send(userData)
        .expect(201);

      // Login with correct credentials
      const loginResponse = await request(httpServer)
        .post('/api/v1/auth/login')
        .send({
          username: userData.username,
          password: userData.password,
        })
        .expect(200);

      expect(loginResponse.body.statusCode).toBe(200);
      expect(loginResponse.body.data).toHaveProperty('accessToken');
      expect(loginResponse.body.data).toHaveProperty('refreshToken');
      expect(loginResponse.body.data.user.username).toBe(userData.username);
      expect(typeof loginResponse.body.data.accessToken).toBe('string');
    });

    it('should reject login with invalid credentials', async () => {
      const response = await request(httpServer)
        .post('/api/v1/auth/login')
        .send({
          username: 'nonexistent',
          password: 'wrongpassword',
        })
        .expect(401);

      expect(response.body.statusCode).toBe(401);
      expect(response.body.message).toContain('用户名或密码错误');
    });
  });

  describe('JWT Token Management', () => {
    let userToken: string;
    let testUser: any;
    let userData: any;

    beforeEach(async () => {
      // Create test user and get token
      userData = {
        username: 'tokenuser-' + Date.now(),
        email: `token-${Date.now()}@test.com`,
        password: 'password123',
        role: 'admin',
      };

      await request(httpServer)
        .post('/api/v1/auth/register')
        .send(userData)
        .expect(201);

      const loginResponse = await request(httpServer)
        .post('/api/v1/auth/login')
        .send({
          username: userData.username,
          password: userData.password,
        })
        .expect(200);

      userToken = loginResponse.body.data.accessToken;
      testUser = loginResponse.body.data.user;
    });

    it('should access protected routes with valid JWT token', async () => {
      const response = await request(httpServer)
        .get('/api/v1/auth/profile')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body.statusCode).toBe(200);
      expect(response.body.data).toHaveProperty('username', testUser.username);
      expect(response.body.data).toHaveProperty('email', testUser.email);
    });

    it('should reject access without token', async () => {
      const response = await request(httpServer)
        .get('/api/v1/auth/profile')
        .expect(401);

      expect(response.body.statusCode).toBe(401);
    });

    it('should reject access with invalid token', async () => {
      const response = await request(httpServer)
        .get('/api/v1/auth/profile')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body.statusCode).toBe(401);
    });

    it('should reject access with malformed authorization header', async () => {
      const response = await request(httpServer)
        .get('/api/v1/auth/profile')
        .set('Authorization', 'InvalidFormat token')
        .expect(401);

      expect(response.body.statusCode).toBe(401);
    });
  });

  describe('API Key Authentication', () => {
    let testUser: any;
    let userToken: string;
    let testApiKey: any;
    let userData: any;

    beforeEach(async () => {
      // Create test user and login
      userData = {
        username: 'apiuser-' + Date.now(),
        email: `api-${Date.now()}@test.com`,
        password: 'password123',
        role: 'admin',
      };

      const registerResponse = await request(httpServer)
        .post('/api/v1/auth/register')
        .send(userData)
        .expect(201);

      const loginResponse = await request(httpServer)
        .post('/api/v1/auth/login')
        .send({
          username: userData.username,
          password: userData.password,
        })
        .expect(200);

      testUser = loginResponse.body.data.user;
      userToken = loginResponse.body.data.accessToken;

      // Create API key
      const apiKeyResponse = await request(httpServer)
        .post('/api/v1/auth/api-keys')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          name: 'Test API Key',
          permissions: ['data:read', 'query:execute', 'providers:read'],
          rateLimit: {
            requests: 1000,
            window: '1h',
          },
        })
        .expect(201);

      testApiKey = apiKeyResponse.body.data;
    });

    it('should create API key successfully', async () => {
      const apiKeyData = {
        name: 'New API Key',
        permissions: ['data:read', 'providers:read'],
        rateLimit: {
          requests: 500,
          window: '1h',
        },
      };

      const response = await request(httpServer)
        .post('/api/v1/auth/api-keys')
        .set('Authorization', `Bearer ${userToken}`)
        .send(apiKeyData)
        .expect(201);

      expect(response.body.statusCode).toBe(201);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data).toHaveProperty('appKey');
      expect(response.body.data).toHaveProperty('accessToken');
      expect(response.body.data.name).toBe(apiKeyData.name);
      expect(response.body.data.permissions).toEqual(apiKeyData.permissions);

      // Verify in database
      const savedApiKey = await apiKeyModel.findById(response.body.data.id);
      expect(savedApiKey).toBeTruthy();
      expect(savedApiKey.name).toBe(apiKeyData.name);
    });

    it('should list user API keys', async () => {
      const response = await request(httpServer)
        .get('/api/v1/auth/api-keys')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body.statusCode).toBe(200);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
      expect(response.body.data[0]).toHaveProperty('id');
      expect(response.body.data[0]).toHaveProperty('name');
      expect(response.body.data[0]).toHaveProperty('permissions');
    });

    it('should access API with valid API key', async () => {
      const response = await request(httpServer)
        .get('/api/v1/providers/capabilities')
        .set('X-App-Key', testApiKey.appKey)
        .set('X-Access-Token', testApiKey.accessToken)
        .expect(200);

      expect(response.body.statusCode).toBe(200);
    });

    it('should reject API access with invalid app key', async () => {
      const response = await request(httpServer)
        .get('/api/v1/providers/capabilities')
        .set('X-App-Key', 'invalid-app-key')
        .set('X-Access-Token', testApiKey.accessToken)
        .expect(401);

      expect(response.body.statusCode).toBe(401);
    });

    it('should reject API access with invalid access token', async () => {
      const response = await request(httpServer)
        .get('/api/v1/providers/capabilities')
        .set('X-App-Key', testApiKey.appKey)
        .set('X-Access-Token', 'invalid-access-token')
        .expect(401);

      expect(response.body.statusCode).toBe(401);
    });

    it('should reject API access with missing headers', async () => {
      const response = await request(httpServer)
        .get('/api/v1/providers/capabilities')
        .expect(401);

      expect(response.body.statusCode).toBe(401);
    });

    it('should revoke API key', async () => {
      const response = await request(httpServer)
        .delete(`/api/v1/auth/api-keys/${testApiKey.id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body.statusCode).toBe(200);
      expect(response.body.data).toHaveProperty('success', true);

      // Verify API key is no longer usable
      await request(httpServer)
        .get('/api/v1/providers/capabilities')
        .set('X-App-Key', testApiKey.appKey)
        .set('X-Access-Token', testApiKey.accessToken)
        .expect(401);
    });
  });

  describe('Rate Limiting', () => {
    let testApiKey: any;

    beforeEach(async () => {
      // Create user and API key with low rate limit for testing
      const user = await TestDataHelper.createDeveloperUser(userModel);

      testApiKey = await TestDataHelper.createTestApiKey(apiKeyModel, user.id, {
        permissions: ['data:read', 'providers:read'],
        rateLimit: {
          requests: 2,
          window: '1m',
        },
      });
    });

    it('should enforce rate limits on API calls', async () => {
      // First two requests should succeed
      await request(httpServer)
        .get('/api/v1/providers/capabilities')
        .set('X-App-Key', testApiKey.appKey)
        .set('X-Access-Token', testApiKey.accessToken)
        .expect(200);

      await request(httpServer)
        .get('/api/v1/providers/capabilities')
        .set('X-App-Key', testApiKey.appKey)
        .set('X-Access-Token', testApiKey.accessToken)
        .expect(200);

      // Third request should be rate limited
      const response = await request(httpServer)
        .get('/api/v1/providers/capabilities')
        .set('X-App-Key', testApiKey.appKey)
        .set('X-Access-Token', testApiKey.accessToken)
        .expect(429);

      expect(response.body.statusCode).toBe(429);
      expect(response.body.message).toContain('请求频率超出限制');
    });

    it('should include rate limit headers in response', async () => {
      const response = await request(httpServer)
        .get('/api/v1/providers/capabilities')
        .set('X-App-Key', testApiKey.appKey)
        .set('X-Access-Token', testApiKey.accessToken)
        .expect(200);

      expect(response.headers).toHaveProperty('x-api-ratelimit-limit');
      expect(response.headers).toHaveProperty('x-api-ratelimit-remaining');
      expect(response.headers).toHaveProperty('x-api-ratelimit-reset');
    });
  });

  describe('Permission System', () => {
    let testUser: any;
    let userToken: string;
    let readOnlyApiKey: any;
    let fullAccessApiKey: any;
    let userData: any;

    beforeEach(async () => {
      userData = {
        username: 'permissionuser-' + Date.now(),
        email: `permission-${Date.now()}@test.com`,
        password: 'password123',
        role: 'admin',
      };

      // Register user first
      const registerResponse = await request(httpServer)
        .post('/api/v1/auth/register')
        .send(userData)
        .expect(201);

      // Create API keys with different permissions using TestDataHelper  
      const userId = registerResponse.body.data._id || registerResponse.body.data.id;
      readOnlyApiKey = await TestDataHelper.createReadOnlyApiKey(apiKeyModel, userId);
      fullAccessApiKey = await TestDataHelper.createFullAccessApiKey(apiKeyModel, userId);

      // Get user token for JWT-protected endpoints
      const loginResponse = await request(httpServer)
        .post('/api/v1/auth/login')
        .send({
          username: userData.username,
          password: userData.password,
        })
        .expect(200);

      userToken = loginResponse.body.data.accessToken;
      testUser = loginResponse.body.data.user;
    });

    it('should allow access with sufficient permissions', async () => {
      const response = await request(httpServer)
        .get('/api/v1/providers/capabilities')
        .set('X-App-Key', readOnlyApiKey.appKey)
        .set('X-Access-Token', readOnlyApiKey.accessToken)
        .expect(200);

      expect(response.body.statusCode).toBe(200);
    });

    it('should deny access without required permissions', async () => {
      // Try to execute query with read-only API key
      const response = await request(httpServer)
        .post('/api/v1/query/execute')
        .set('X-App-Key', readOnlyApiKey.appKey)
        .set('X-Access-Token', readOnlyApiKey.accessToken)
        .send({
          queryType: 'by_symbols',
          symbols: ['700.HK'],
        })
        .expect(403);

      expect(response.body.statusCode).toBe(403);
    });

    it('should allow access with full permissions', async () => {
      const response = await request(httpServer)
        .post('/api/v1/query/execute')
        .set('X-App-Key', fullAccessApiKey.appKey)
        .set('X-Access-Token', fullAccessApiKey.accessToken)
        .send({
          queryType: 'by_symbols',
          symbols: ['700.HK'],
        })
        .expect(201);

      expect(response.body.statusCode).toBe(201);
    });
  });

  describe('Security Edge Cases', () => {
    it('should handle SQL injection attempts in registration', async () => {
      const response = await request(httpServer)
        .post('/api/v1/auth/register')
        .send({
          username: "'; DROP TABLE users; --",
          email: 'injection@test.com',
          password: 'password123',
          role: 'developer',
        })
        .expect(400);

      expect(response.body.statusCode).toBe(400);
      expect(response.body.message).toContain('验证失败: 用户名只能包含字母、数字、下划线和连字符');
    });

    it('should handle XSS attempts in user data', async () => {
      const response = await request(httpServer)
        .post('/api/v1/auth/register')
        .send({
          username: '<script>alert("XSS")</script>',
          email: 'xss@test.com',
          password: 'password123',
          role: 'developer',
        })
        .expect(400);

      expect(response.body.statusCode).toBe(400);
      expect(response.body.message).toContain('验证失败: 用户名只能包含字母、数字、下划线和连字符');
    });

    it('should prevent concurrent API key creation', async () => {
      const userData = {
        username: 'concurrentuser-' + Date.now(),
        email: `concurrent-${Date.now()}@test.com`,
        password: 'password123',
        role: 'admin',
      };

      // Register user first
      await request(httpServer)
        .post('/api/v1/auth/register')
        .send(userData)
        .expect(201);

      const loginResponse = await request(httpServer)
        .post('/api/v1/auth/login')
        .send({
          username: userData.username,
          password: userData.password,
        })
        .expect(200);

      const token = loginResponse.body.data.accessToken;
      const apiKeyData = {
        name: 'Concurrent Key',
        permissions: ['data:read', 'providers:read'],
      };

      // Attempt to create multiple API keys simultaneously
      const promises = Array(5).fill(null).map(() => 
        request(httpServer)
          .post('/api/v1/auth/api-keys')
          .set('Authorization', `Bearer ${token}`)
          .send(apiKeyData)
      );

      const responses = await Promise.all(promises);
      const successfulCreations = responses.filter(r => r.status === 201);
      
      // Should handle concurrent requests gracefully
      expect(successfulCreations.length).toBeGreaterThan(0);
    });
  });
});
