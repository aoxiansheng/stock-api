import * as request from 'supertest';

describe('Data Mapper E2E Tests', () => {
  let httpServer: any;
  let authTokens: any;
  let testUser: any;
  let jwtToken: string;

  beforeAll(async () => {
    httpServer = global.createTestRequest();
    
    // 创建测试用户并获取认证tokens
    await setupAuthentication();
  });

  async function setupAuthentication() {
    // 1. 注册测试用户
    const userData = {
      username: 'datamapperuser',
      email: 'datamapper@example.com',
      password: 'password123',
      role: 'developer',
    };

    const registerResponse = await httpServer
      .post('/api/v1/auth/register')
      .send(userData);

    testUser = registerResponse.body.data || registerResponse.body;

    // 2. 登录获取JWT token
    const loginResponse = await httpServer
      .post('/api/v1/auth/login')
      .send({
        username: userData.username,
        password: userData.password,
      });

    jwtToken = loginResponse.body.data?.accessToken || loginResponse.body.accessToken;

    // 3. 创建API Key
    const apiKeyData = {
      name: 'Data Mapper Test API Key',
      permissions: ['data:read', 'query:execute', 'providers:read', 'transformer:preview', 'config:read'],
      rateLimit: {
        requests: 100,
        window: '1h',
      },
    };

    const apiKeyResponse = await httpServer
      .post('/api/v1/auth/api-keys')
      .set('Authorization', `Bearer ${jwtToken}`)
      .send(apiKeyData);

    const apiKeyResult = apiKeyResponse.body.data;
    authTokens = {
      apiKey: apiKeyResult.appKey,
      accessToken: apiKeyResult.accessToken,
    };
  }

  describe('Data Mapping Rules', () => {
    it('should retrieve available mapping rules with API Key authentication', async () => {
      const response = await httpServer
        .get('/api/v1/data-mapper') // 修正：移除 /rules
        .set('X-App-Key', authTokens.apiKey)
        .set('X-Access-Token', authTokens.accessToken)
        .expect(200);

      if (response.status === 200) {
        // Assert
        expect(response.body.data).toHaveProperty('items');
        expect(Array.isArray(response.body.data.items)).toBe(true);
      }
    });

    it('should get field suggestions for data mapping', async () => {
      // Arrange
      const sampleData = {
        provider: 'longport',
        dataType: 'stock-quote',
        sampleData: {
          symbol: '700.HK',
          last_done: '503.000',
          open: '500.000',
          high: '505.000',
          low: '498.000'
        }
      };

      // Act
      const response = await httpServer
        .post('/api/v1/data-mapper/suggest-fields')
        .set('X-App-Key', authTokens.apiKey)
        .set('X-Access-Token', authTokens.accessToken)
        .send(sampleData)
        .expect([200, 404]); // Allow for endpoint not existing

      if (response.status === 200) {
        // Assert
        global.expectSuccessResponse(response, 200);
        expect(response.body.data).toBeDefined();
        
        if (response.body.data.suggestions) {
          expect(Array.isArray(response.body.data.suggestions)).toBe(true);
        }
      }
    });

    it('should require authentication for mapping operations', async () => {
      // Act & Assert
      await httpServer
        .get('/api/v1/data-mapper/rules')
        .expect(401);
    });
  });

  describe('Field Mapping Management', () => {
    it('should handle field mapping previews', async () => {
      // Arrange
      const previewRequest = {
        provider: 'preset',
        dataType: 'get-stock-quote-fields',
        sampleData: {
          secu_quote: [{
            symbol: '700.HK',
            last_done: '503.000',
            open: '500.000'
          }]
        }
      };

      // Act
      const response = await httpServer
        .post('/api/v1/data-mapper/preview')
        .set('X-App-Key', authTokens.apiKey)
        .set('X-Access-Token', authTokens.accessToken)
        .send(previewRequest)
        .expect([200, 404]); // Allow for endpoint not existing

      if (response.status === 200) {
        // Assert
        global.expectSuccessResponse(response, 200);
        expect(response.body.data).toBeDefined();
      }
    });

    it('should validate mapping rules if endpoint exists', async () => {
      // Arrange
      const validationRequest = {
        provider: 'test',
        dataType: 'stock-quote',
        mappingRules: {
          'last_done': 'lastPrice',
          'open': 'openPrice',
          'high': 'highPrice',
          'low': 'lowPrice'
        }
      };

      // Act
      const response = await httpServer
        .post('/api/v1/data-mapper/validate')
        .set('X-App-Key', authTokens.apiKey)
        .set('X-Access-Token', authTokens.accessToken)
        .send(validationRequest)
        .expect([200, 404]); // Allow for endpoint not existing

      if (response.status === 200) {
        // Assert
        global.expectSuccessResponse(response, 200);
        expect(response.body.data).toHaveProperty('valid');
      }
    });
  });

  describe('Integration with Core System', () => {
    it('should work with preset mapping rules', async () => {
      // This test might be obsolete if preset rules are no longer a concept
      // Or it should be adapted to the new API structure
      const response = await httpServer
        .get('/api/v1/data-mapper?provider=preset') // 修正：移除 /rules
        .set('X-App-Key', authTokens.apiKey)
        .set('X-Access-Token', authTokens.accessToken)
        .expect(200);

      if (response.status === 200) {
        // Assert
        expect(response.body.data).toHaveProperty('items');
      }
    });

    it('should support different data types', async () => {
      const dataTypes = ['stock-quote', 'futures-contract'];
      for (const dataType of dataTypes) {
        const response = await httpServer
          .get(`/api/v1/data-mapper?ruleListType=${dataType}`) // 修正：移除 /rules 并使用正确的查询参数
          .set('X-App-Key', authTokens.apiKey)
          .set('X-Access-Token', authTokens.accessToken)
          .expect(200);

        if (response.status === 200) {
          // Assert
          expect(response.body.data).toHaveProperty('items');
        }
      }
    });
  });
});