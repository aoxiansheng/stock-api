import http from 'k6/http';
import { check, sleep, group, fail } from 'k6';
import { Rate, Counter, Trend } from 'k6/metrics';
import { htmlReport } from 'https://raw.githubusercontent.com/benc-uk/k6-reporter/main/dist/bundle.js';
import { textSummary } from 'https://jslib.k6.io/k6-summary/0.0.1/index.js';

// 自定义指标
const authErrors = new Counter('auth_errors');
const authSuccessRate = new Rate('auth_success_rate');
const jwtValidationTime = new Trend('jwt_validation_time');
const apiKeyValidationTime = new Trend('api_key_validation_time');
const rateLimitHits = new Counter('rate_limit_hits');
const databaseConnectionFailures = new Counter('db_connection_failures');

// 测试配置 - 认证系统压力测试
export const options = {
  stages: [
    { duration: '2m', target: 50 },   // 启动阶段：逐渐增加到50用户
    { duration: '5m', target: 200 },  // 负载增加：增加到200用户
    { duration: '10m', target: 500 }, // 压力阶段：达到500并发用户
    { duration: '5m', target: 800 },  // 极限压力：800并发用户
    { duration: '3m', target: 1000 }, // 峰值压力：1000并发用户
    { duration: '5m', target: 500 },  // 压力回落：回到500用户
    { duration: '2m', target: 0 },    // 降压阶段：逐渐减少到0
  ],
  
  thresholds: {
    // 认证相关阈值
    http_req_duration: ['p(95)<2000', 'p(99)<5000'], // 95%请求2秒内，99%请求5秒内
    http_req_failed: ['rate<0.1'],                   // 失败率小于10%
    auth_success_rate: ['rate>0.85'],               // 认证成功率大于85%
    auth_errors: ['count<500'],                     // 认证错误数小于500
    
    // JWT验证性能
    jwt_validation_time: ['p(95)<500', 'avg<200'],  // JWT验证95%在500ms内
    api_key_validation_time: ['p(95)<300', 'avg<100'], // API Key验证95%在300ms内
    
    // 系统稳定性
    rate_limit_hits: ['count<100'],                 // 触发限流次数小于100
    db_connection_failures: ['count<10'],           // 数据库连接失败小于10次
  },
};

// 测试配置
const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const API_VERSION = '/api/v1';

// 测试用户池
const TEST_USERS = [];
const API_KEYS = [];

// 生成测试用户数据
function generateTestUsers(count) {
  const users = [];
  for (let i = 0; i < count; i++) {
    const randomSuffix = Math.random().toString(36).substr(2, 9);
    users.push({
      username: `stress_user_${i}_${randomSuffix}`,
      email: `stress_${i}_${randomSuffix}@example.com`, // 修复：确保邮箱唯一性
      password: `StressTest123!${i}`,
      role: i % 5 === 0 ? 'admin' : (i % 3 === 0 ? 'developer' : 'user')
    });
  }
  return users;
}

// 生成API Key测试数据
function generateApiKeyData() {
  return {
    name: `Stress Test API Key ${Math.random().toString(36).substr(2, 9)}`,
    description: '压力测试专用API Key',
    permissions: ['data:read', 'query:execute', 'providers:read'],
    rateLimit: {
      requests: 1000,
      window: '1h'
    }
  };
}

// 设置阶段 - 创建测试数据
export function setup() {
  console.log('🚀 开始认证系统压力测试设置...');
  
  const testUsers = generateTestUsers(50); // 创建50个测试用户
  const createdUsers = [];
  const createdApiKeys = [];
  
  // 创建管理员用户用于API Key生成
  const adminUser = {
    username: 'stress_admin',
    email: 'stress_admin@example.com',
    password: 'AdminStress123!',
    role: 'admin'
  };
  
  // 注册管理员
  let adminRegisterResponse = http.post(`${BASE_URL}${API_VERSION}/auth/register`, JSON.stringify(adminUser), {
    headers: { 'Content-Type': 'application/json' },
  });
  
  if (adminRegisterResponse.status !== 201) {
    console.warn('⚠️ 管理员用户创建失败，可能已存在');
  }
  
  // 管理员登录获取JWT
  let adminLoginResponse = http.post(`${BASE_URL}${API_VERSION}/auth/login`, JSON.stringify({
    username: adminUser.username,
    password: adminUser.password
  }), {
    headers: { 'Content-Type': 'application/json' },
  });
  
  if (adminLoginResponse.status !== 200) {
    fail('管理员登录失败，无法继续压力测试');
  }
  
  const adminToken = JSON.parse(adminLoginResponse.body).data.accessToken;
  
  // 批量创建测试用户
  console.log(`📝 创建 ${testUsers.length} 个测试用户...`);
  for (let i = 0; i < Math.min(testUsers.length, 20); i++) { // 限制创建数量避免设置阶段超时
    const user = testUsers[i];
    const registerResponse = http.post(`${BASE_URL}${API_VERSION}/auth/register`, JSON.stringify(user), {
      headers: { 'Content-Type': 'application/json' },
    });
    
    if (registerResponse.status === 201) {
      createdUsers.push(user);
      
      // 为部分用户创建API Key
      if (i % 3 === 0) {
        const apiKeyData = generateApiKeyData();
        const apiKeyResponse = http.post(`${BASE_URL}${API_VERSION}/auth/api-keys`, JSON.stringify(apiKeyData), {
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${adminToken}`
          },
        });
        
        if (apiKeyResponse.status === 201) {
          const apiKeyInfo = JSON.parse(apiKeyResponse.body).data;
          createdApiKeys.push({
            appKey: apiKeyInfo.appKey,
            accessToken: apiKeyInfo.accessToken,
            user: user
          });
        }
      }
    }
    
    // 避免创建用户时触发限流
    sleep(0.1);
  }
  
  console.log(`✅ 成功创建 ${createdUsers.length} 个用户和 ${createdApiKeys.length} 个API Key`);
  
  return {
    adminToken,
    users: createdUsers,
    apiKeys: createdApiKeys
  };
}

// 主测试函数
export default function(data) {
  // 随机选择认证方式
  const authType = Math.random() < 0.6 ? 'jwt' : 'api_key';
  
  if (authType === 'jwt') {
    jwtAuthenticationStress(data);
  } else {
    apiKeyAuthenticationStress(data);
  }
  
  // 模拟用户思考时间
  sleep(Math.random() * 3 + 1); // 1-4秒随机间隔
}

// JWT认证压力测试
function jwtAuthenticationStress(data) {
  group('JWT Authentication Stress', () => {
    if (!data.users || data.users.length === 0) {
      // 如果在setup阶段没有成功创建任何用户，则跳过此迭代
      return;
    }
    const user = data.users[Math.floor(Math.random() * data.users.length)];

    if (!user) {
      // 如果未能成功选取用户，则跳过此迭代以避免错误
      return;
    }
    
    // 登录获取JWT Token
    const loginStart = Date.now();
    const loginResponse = http.post(`${BASE_URL}${API_VERSION}/auth/login`, JSON.stringify({
      username: user.username,
      password: user.password
    }), {
      headers: { 'Content-Type': 'application/json' },
    });
    
    const loginSuccess = check(loginResponse, {
      'login status is 200': (r) => r.status === 200,
      'login response time < 2s': (r) => r.timings.duration < 2000,
      'login returns access token': (r) => r.status === 200 && JSON.parse(r.body).data?.accessToken,
    });
    
    if (!loginSuccess) {
      authErrors.add(1);
      authSuccessRate.add(0);
      return;
    }
    
    authSuccessRate.add(1);
    const token = JSON.parse(loginResponse.body).data.accessToken;
    
    // 使用JWT Token访问受保护的端点
    const endpoints = [
      '/monitoring/health',
      '/monitoring/metrics/performance',
      '/providers/capabilities'
    ];
    
    endpoints.forEach(endpoint => {
      const start = Date.now();
      const response = http.get(`${BASE_URL}${API_VERSION}${endpoint}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      
      const validationTime = Date.now() - start;
      jwtValidationTime.add(validationTime);
      
      const success = check(response, {
        [`${endpoint} status is 200`]: (r) => r.status === 200,
        [`${endpoint} response time < 1s`]: (r) => r.timings.duration < 1000,
        [`${endpoint} has request ID`]: (r) => r.headers['X-Request-Id'] || r.headers['x-request-id'],
      });
      
      if (!success) {
        authErrors.add(1);
      }
      
      // 检查是否触发限流
      if (response.status === 429) {
        rateLimitHits.add(1);
      }
      
      // 检查数据库连接错误
      if (response.status === 503) {
        databaseConnectionFailures.add(1);
      }
    });
  });
}

// API Key认证压力测试
function apiKeyAuthenticationStress(data) {
  group('API Key Authentication Stress', () => {
    if (data.apiKeys.length === 0) {
      // 如果没有API Key，跳过这个测试
      return;
    }
    
    const apiKeyInfo = data.apiKeys[Math.floor(Math.random() * data.apiKeys.length)];
    
    // 使用API Key访问数据端点
    const dataEndpoints = [
      {
        path: '/receiver/data',
        method: 'POST',
        body: {
          symbols: ['AAPL.US', 'GOOGL.US'],
          dataType: 'get-stock-quote'
        }
      },
      {
        path: '/query/execute',
        method: 'POST', 
        body: {
          queryType: 'by_symbols',
          symbols: ['TSLA.US']
        }
      },
      {
        path: '/providers/capabilities',
        method: 'GET'
      }
    ];
    
    dataEndpoints.forEach(endpoint => {
      const start = Date.now();
      let response;
      
      if (endpoint.method === 'POST') {
        response = http.post(`${BASE_URL}${API_VERSION}${endpoint.path}`, JSON.stringify(endpoint.body), {
          headers: {
            'Content-Type': 'application/json',
            'X-App-Key': apiKeyInfo.appKey,
            'X-Access-Token': apiKeyInfo.accessToken,
          },
        });
      } else {
        response = http.get(`${BASE_URL}${API_VERSION}${endpoint.path}`, {
          headers: {
            'X-App-Key': apiKeyInfo.appKey,
            'X-Access-Token': apiKeyInfo.accessToken,
          },
        });
      }
      
      const validationTime = Date.now() - start;
      apiKeyValidationTime.add(validationTime);
      
      const success = check(response, {
        [`${endpoint.path} API key auth success`]: (r) => r.status < 400,
        [`${endpoint.path} response time < 3s`]: (r) => r.timings.duration < 3000,
        [`${endpoint.path} has rate limit headers`]: (r) => 
          r.headers['X-RateLimit-Limit'] || r.headers['x-ratelimit-limit'],
      });
      
      if (success) {
        authSuccessRate.add(1);
      } else {
        authErrors.add(1);
        authSuccessRate.add(0);
      }
      
      // 检查限流
      if (response.status === 429) {
        rateLimitHits.add(1);
      }
      
      // 检查服务错误
      if (response.status >= 500) {
        databaseConnectionFailures.add(1);
      }
    });
  });
}

// 并发用户行为模拟
export function concurrentUserSimulation(data) {
  group('Concurrent User Behavior', () => {
    const user = data.users[Math.floor(Math.random() * data.users.length)];
    
    // 模拟真实用户行为：登录 -> 多次API调用 -> 登出
    const loginResponse = http.post(`${BASE_URL}${API_VERSION}/auth/login`, JSON.stringify({
      username: user.username,
      password: user.password
    }), {
      headers: { 'Content-Type': 'application/json' },
    });
    
    if (loginResponse.status === 200) {
      const token = JSON.parse(loginResponse.body).data.accessToken;
      
      // 模拟用户会话中的多次API调用
      for (let i = 0; i < 5; i++) {
        http.get(`${BASE_URL}${API_VERSION}/monitoring/health`, {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        
        sleep(0.5); // 调用间隔
      }
    }
  });
}

// 清理阶段
export function teardown(data) {
  console.log('🧹 开始清理压力测试数据...');
  
  // 注意：在生产环境中，通常不会在测试后删除用户
  // 这里只是示例，实际情况下可能需要标记测试用户或使用专门的测试数据库
  
  console.log(`📊 压力测试完成:
    - 测试用户数: ${data.users.length}
    - API Key数: ${data.apiKeys.length}
    - 认证错误数: ${authErrors.count}
    - 限流触发数: ${rateLimitHits.count}
    - 数据库连接失败数: ${databaseConnectionFailures.count}`);
}

// 生成测试报告
export function handleSummary(data) {
  return {
    'auth-stress-report.html': htmlReport(data),
    stdout: textSummary(data, { indent: ' ', enableColors: true }),
    'auth-stress-summary.json': JSON.stringify(data),
  };
}