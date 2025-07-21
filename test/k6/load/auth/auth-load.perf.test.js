import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Counter } from 'k6/metrics';

// 自定义指标
const errorRate = new Rate('errors');
const authSuccessRate = new Rate('auth_success');
const rateLimitHits = new Counter('rate_limit_hits');
const jwtValidationFailures = new Counter('jwt_validation_failures');

// 测试配置 - 认证系统负载测试
export const options = {
  stages: [
    { duration: '1m', target: 10 },  // 启动阶段
    { duration: '3m', target: 50 },  // 正常负载
    { duration: '2m', target: 100 }, // 高负载
    { duration: '1m', target: 0 },   // 降压阶段
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95%的认证请求响应时间小于500ms
    http_req_failed: ['rate<0.05'],   // 错误率小于5%
    auth_success: ['rate>0.95'],      // 认证成功率大于95%
    errors: ['rate<0.05'],
  },
};

// 测试数据
const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const TEST_USERS = [
  { username: 'testuser1', email: 'test1@example.com', password: 'password123' },
  { username: 'testuser2', email: 'test2@example.com', password: 'password123' },
  { username: 'testuser3', email: 'test3@example.com', password: 'password123' },
  { username: 'testuser4', email: 'test4@example.com', password: 'password123' },
  { username: 'testuser5', email: 'test5@example.com', password: 'password123' },
];

// 共享状态
let userTokens = [];
let apiKeys = [];

export function setup() {
  // 创建测试用户
  for (const userData of TEST_USERS) {
    const registerResponse = http.post(
      `${BASE_URL}/api/v1/auth/register`,
      JSON.stringify(userData),
      { headers: { 'Content-Type': 'application/json' } }
    );
    
    if (registerResponse.status === 201) {
      console.log(`用户 ${userData.username} 注册成功`);
    }
  }
  
  // 登录并获取令牌
  for (const userData of TEST_USERS) {
    const loginResponse = http.post(
      `${BASE_URL}/api/v1/auth/login`,
      JSON.stringify({
        username: userData.username,
        password: userData.password,
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );
    
    if (loginResponse.status === 200) {
      const loginData = JSON.parse(loginResponse.body);
      userTokens.push(loginData.data.accessToken);
      
      // 为每个用户创建API密钥
      const apiKeyResponse = http.post(
        `${BASE_URL}/api/v1/auth/api-keys`,
        JSON.stringify({
          name: `Performance Test Key - ${userData.username}`,
          permissions: ['data:read', 'query:execute'],
          rateLimit: {
            requests: 100,
            window: '1m',
          },
        }),
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${loginData.data.accessToken}`,
          },
        }
      );
      
      if (apiKeyResponse.status === 201) {
        const apiKeyData = JSON.parse(apiKeyResponse.body);
        apiKeys.push({
          appKey: apiKeyData.data.appKey,
          accessToken: apiKeyData.data.accessToken,
        });
      }
    }
  }
  
  return { userTokens, apiKeys };
}

export default function (data) {
  const scenario = Math.random();
  
  if (scenario < 0.3) {
    testJWTAuthentication(data.userTokens);
  } else if (scenario < 0.6) {
    testAPIKeyAuthentication(data.apiKeys);
  } else if (scenario < 0.8) {
    testRateLimiting(data.apiKeys);
  } else {
    testAuthenticationFlows();
  }
  
  sleep(0.5);
}

// JWT认证性能测试
function testJWTAuthentication(tokens) {
  if (!tokens || tokens.length === 0) return;
  
  const token = tokens[Math.floor(Math.random() * tokens.length)];
  
  const response = http.get(
    `${BASE_URL}/api/v1/auth/profile`,
    {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    }
  );
  
  const success = check(response, {
    'JWT认证状态码为200': (r) => r.status === 200,
    'JWT认证响应时间<100ms': (r) => r.timings.duration < 100,
    'JWT认证返回用户信息': (r) => {
      try {
        const data = JSON.parse(r.body);
        return data.statusCode === 200 && data.data && data.data.username;
      } catch (e) {
        return false;
      }
    },
  });
  
  authSuccessRate.add(success);
  errorRate.add(!success);
  
  if (!success && response.status === 401) {
    jwtValidationFailures.add(1);
  }
}

// API Key认证性能测试
function testAPIKeyAuthentication(apiKeys) {
  if (!apiKeys || apiKeys.length === 0) return;
  
  const apiKey = apiKeys[Math.floor(Math.random() * apiKeys.length)];
  
  const response = http.get(
    `${BASE_URL}/api/v1/providers/capabilities`,
    {
      headers: {
        'X-App-Key': apiKey.appKey,
        'X-Access-Token': apiKey.accessToken,
      },
    }
  );
  
  const success = check(response, {
    'API Key认证状态码为200': (r) => r.status === 200,
    'API Key认证响应时间<50ms': (r) => r.timings.duration < 50,
    'API Key认证返回能力列表': (r) => {
      try {
        const data = JSON.parse(r.body);
        return data.statusCode === 200 && data.data && data.data.providers;
      } catch (e) {
        return false;
      }
    },
  });
  
  authSuccessRate.add(success);
  errorRate.add(!success);
}

// 速率限制测试
function testRateLimiting(apiKeys) {
  if (!apiKeys || apiKeys.length === 0) return;
  
  const apiKey = apiKeys[Math.floor(Math.random() * apiKeys.length)];
  
  // 快速连续请求测试速率限制
  for (let i = 0; i < 3; i++) {
    const response = http.get(
      `${BASE_URL}/api/v1/providers/capabilities`,
      {
        headers: {
          'X-App-Key': apiKey.appKey,
          'X-Access-Token': apiKey.accessToken,
        },
      }
    );
    
    check(response, {
      '速率限制响应合理': (r) => r.status === 200 || r.status === 429,
      '速率限制头部存在': (r) => {
        return r.headers['X-RateLimit-Limit'] !== undefined ||
               r.headers['x-ratelimit-limit'] !== undefined;
      },
    });
    
    if (response.status === 429) {
      rateLimitHits.add(1);
    }
    
    // 短暂间隔
    sleep(0.1);
  }
}

// 认证流程完整性测试
function testAuthenticationFlows() {
  // 测试登录流程
  const loginData = {
    username: 'testuser1',
    password: 'password123',
  };
  
  const loginResponse = http.post(
    `${BASE_URL}/api/v1/auth/login`,
    JSON.stringify(loginData),
    { headers: { 'Content-Type': 'application/json' } }
  );
  
  const loginSuccess = check(loginResponse, {
    '登录流程状态码为200': (r) => r.status === 200,
    '登录流程响应时间<300ms': (r) => r.timings.duration < 300,
    '登录流程返回令牌': (r) => {
      try {
        const data = JSON.parse(r.body);
        return data.statusCode === 200 && data.data.accessToken;
      } catch (e) {
        return false;
      }
    },
  });
  
  authSuccessRate.add(loginSuccess);
  errorRate.add(!loginSuccess);
  
  // 如果登录成功，测试使用令牌访问受保护资源
  if (loginSuccess && loginResponse.status === 200) {
    try {
      const loginData = JSON.parse(loginResponse.body);
      const token = loginData.data.accessToken;
      
      const profileResponse = http.get(
        `${BASE_URL}/api/v1/auth/profile`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );
      
      check(profileResponse, {
        '令牌使用状态码为200': (r) => r.status === 200,
        '令牌使用响应时间<100ms': (r) => r.timings.duration < 100,
      });
    } catch (e) {
      errorRate.add(1);
    }
  }
}

// 测试总结
export function handleSummary(data) {
  return {
    'auth-load-test-summary.json': JSON.stringify(data, null, 2),
    stdout: `
=== Authentication Load Test Summary ===

核心指标:
- 总请求数: ${data.metrics.http_reqs.count}
- 平均响应时间: ${data.metrics.http_req_duration.avg.toFixed(2)}ms
- 95%响应时间: ${data.metrics['http_req_duration{p:95}'].value.toFixed(2)}ms
- 认证成功率: ${(data.metrics.auth_success ? data.metrics.auth_success.rate * 100 : 0).toFixed(2)}%
- 错误率: ${(data.metrics.http_req_failed.rate * 100).toFixed(2)}%
- 速率限制触发次数: ${data.metrics.rate_limit_hits ? data.metrics.rate_limit_hits.count : 0}
- JWT验证失败次数: ${data.metrics.jwt_validation_failures ? data.metrics.jwt_validation_failures.count : 0}

通过率:
- 响应时间阈值 (95% < 500ms): ${data.metrics['http_req_duration{p:95}'].value < 500 ? '✅ PASS' : '❌ FAIL'}
- 错误率阈值 (< 5%): ${data.metrics.http_req_failed.rate < 0.05 ? '✅ PASS' : '❌ FAIL'}
- 认证成功率阈值 (> 95%): ${(data.metrics.auth_success ? data.metrics.auth_success.rate : 0) > 0.95 ? '✅ PASS' : '❌ FAIL'}

测试结论: ${data.metrics['http_req_duration{p:95}'].value < 500 && data.metrics.http_req_failed.rate < 0.05 && (data.metrics.auth_success ? data.metrics.auth_success.rate : 0) > 0.95 ? '✅ 认证系统满足负载要求' : '❌ 认证系统需要优化'}
`,
  };
}

export function teardown(data) {
  console.log('认证负载测试完成');
  
  // 清理测试数据（可选）
  // 在实际环境中，可能需要清理创建的测试用户和API密钥
}
