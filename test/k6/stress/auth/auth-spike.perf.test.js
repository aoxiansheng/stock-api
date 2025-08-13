import http from 'k6/http';
import { check, sleep, group, fail } from 'k6';
import { Rate, Counter, Trend } from 'k6/metrics';
import { htmlReport } from 'https://raw.githubusercontent.com/benc-uk/k6-reporter/main/dist/bundle.js';
import { textSummary } from 'https://jslib.k6.io/k6-summary/0.0.1/index.js';

// 自定义指标
const spikeFailures = new Counter('spike_failures');
const spikeSuccessRate = new Rate('spike_success_rate');
const authSpikeResponseTime = new Trend('auth_spike_response_time');
const spikeAuthErrors = new Counter('spike_auth_errors');
const systemRecoveryTime = new Trend('system_recovery_time');
const concurrentAuthAttempts = new Counter('concurrent_auth_attempts');

// 测试配置 - 认证系统突发负载测试
export const options = {
  stages: [
    { duration: '30s', target: 50 },    // 基线负载：50用户
    { duration: '30s', target: 50 },    // 稳定基线：维持50用户
    { duration: '10s', target: 500 },   // 💥 突发负载：10秒内激增到500用户
    { duration: '30s', target: 500 },   // 突发维持：保持500用户30秒
    { duration: '10s', target: 1000 },  // 💥 极限突发：10秒内再次激增到1000用户
    { duration: '15s', target: 1000 },  // 极限维持：保持1000用户15秒
    { duration: '30s', target: 100 },   // 快速恢复：30秒内降到100用户
    { duration: '30s', target: 0 },     // 完全恢复：回到0用户
  ],
  
  thresholds: {
    // 突发负载阈值
    http_req_duration: ['p(95)<5000', 'p(99)<10000'], // 突发期间允许更高延迟
    http_req_failed: ['rate<0.25'],                  // 突发期间失败率控制在25%以内
    spike_success_rate: ['rate>0.7'],               // 突发期间成功率保持70%以上
    spike_failures: ['count<1000'],                 // 突发失败数控制在1000以内
    
    // 认证性能阈值
    auth_spike_response_time: ['p(95)<3000', 'avg<1000'], // 突发期间认证响应时间
    spike_auth_errors: ['count<200'],               // 认证错误数控制
    
    // 系统恢复能力
    system_recovery_time: ['p(95)<2000'],           // 系统恢复时间
    concurrent_auth_attempts: ['count>0'],          // 记录并发认证尝试数
  },
};

// 测试配置
const BASE_URL = _ENV.BASE_URL || 'http://localhost:3000';
const API_VERSION = '/api/v1';

// 测试用户池
const TEST_USERS = [];
const API_KEYS = [];

// 生成测试用户数据
function generateTestUsers(count) {
  const users = [];
  for (let i = 0; i < count; i++) {
    users.push({
      username: `spike_user_${i}_${Math.random().toString(36).substr(2, 9)}`,
      email: `spike${i}@example.com`,
      password: `SpikeTest123!${i}`,
      role: i % 10 === 0 ? 'admin' : (i % 4 === 0 ? 'developer' : 'user')
    });
  }
  return users;
}

// 生成API Key测试数据
function generateApiKeyData() {
  return {
    name: `Spike Test API Key ${Math.random().toString(36).substr(2, 9)}`,
    description: '突发负载测试专用API Key',
    permissions: ['data:read', 'query:execute', 'providers:read'],
    rateLimit: {
      requests: 2000,
      window: '1h'
    }
  };
}

// 设置阶段 - 创建测试数据
export function setup() {
  console.log('🚀 开始认证系统突发负载测试设置...');
  
  const testUsers = generateTestUsers(100); // 创建100个测试用户用于突发测试
  const createdUsers = [];
  const createdApiKeys = [];
  
  // 创建管理员用户
  const adminUser = {
    username: 'spike_admin',
    email: 'spike_admin@example.com',
    password: 'SpikeAdmin123!',
    role: 'admin'
  };
  
  // 注册管理员
  let adminRegisterResponse = http.post(`${BASE_URL}${API_VERSION}/auth/register`, JSON.stringify(adminUser), {
    headers: { 'Content-Type': 'application/json' },
  });
  
  if (adminRegisterResponse.status !== 201) {
    console.warn('⚠️ 管理员用户创建失败，可能已存在');
  }
  
  // 管理员登录
  let adminLoginResponse = http.post(`${BASE_URL}${API_VERSION}/auth/login`, JSON.stringify({
    username: adminUser.username,
    password: adminUser.password
  }), {
    headers: { 'Content-Type': 'application/json' },
  });
  
  if (adminLoginResponse.status !== 200) {
    fail('管理员登录失败，无法继续突发负载测试');
  }
  
  const adminToken = JSON.parse(adminLoginResponse.body).data.accessToken;
  
  // 批量创建测试用户（更多用户用于突发测试）
  console.log(`📝 创建 ${Math.min(testUsers.length, 50)} 个测试用户...`);
  for (let i = 0; i < Math.min(testUsers.length, 50); i++) {
    const user = testUsers[i];
    const registerResponse = http.post(`${BASE_URL}${API_VERSION}/auth/register`, JSON.stringify(user), {
      headers: { 'Content-Type': 'application/json' },
    });
    
    if (registerResponse.status === 201) {
      createdUsers.push(user);
      
      // 为更多用户创建API Key（用于突发API调用）
      if (i % 2 === 0) {
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
    
    // 减少设置阶段的延迟，为突发测试做准备
    sleep(0.05);
  }
  
  console.log(`✅ 成功创建 ${createdUsers.length} 个用户和 ${createdApiKeys.length} 个API Key`);
  console.log('🎯 突发负载测试数据准备完成，开始执行突发模式...');
  
  return {
    adminToken,
    users: createdUsers,
    apiKeys: createdApiKeys
  };
}

// 主测试函数
export default function(data) {
  // 检测当前阶段的虚拟用户数来判断是否为突发阶段
  const currentVUs = _VU;
  const currentStage = getCurrentStage();
  
  if (currentStage === 'spike' || currentStage === 'extreme_spike') {
    spikeAuthenticationBurst(data);
  } else if (currentStage === 'recovery') {
    systemRecoveryValidation(data);
  } else {
    normalAuthenticationLoad(data);
  }
  
  // 突发期间减少等待时间，恢复期间增加等待时间
  const sleepTime = currentStage === 'spike' || currentStage === 'extreme_spike' ? 
    Math.random() * 1 + 0.5 : // 0.5-1.5秒
    Math.random() * 2 + 1;    // 1-3秒
  sleep(sleepTime);
}

// 获取当前测试阶段
function getCurrentStage() {
  const elapsedTime = _ITER * 1000; // 估算已用时间
  
  if (elapsedTime < 60000) return 'baseline';
  if (elapsedTime < 70000) return 'spike';
  if (elapsedTime < 100000) return 'spike_maintain';
  if (elapsedTime < 110000) return 'extreme_spike';
  if (elapsedTime < 125000) return 'extreme_maintain';
  if (elapsedTime < 155000) return 'recovery';
  return 'cooldown';
}

// 突发认证负载测试
function spikeAuthenticationBurst(data) {
  group('Spike Authentication Burst', () => {
    concurrentAuthAttempts.add(1);
    
    // 随机选择认证方式，突发期间更多使用JWT认证测试系统承载能力
    const authType = Math.random() < 0.7 ? 'jwt_burst' : 'api_key_burst';
    
    if (authType === 'jwt_burst') {
      jwtAuthenticationBurst(data);
    } else {
      apiKeyAuthenticationBurst(data);
    }
  });
}

// JWT认证突发测试
function jwtAuthenticationBurst(data) {
  group('JWT Authentication Burst', () => {
    const user = data.users[Math.floor(Math.random() * data.users.length)];
    
    // 快速连续登录测试
    const burstStart = Date.now();
    const loginResponse = http.post(`${BASE_URL}${API_VERSION}/auth/login`, JSON.stringify({
      username: user.username,
      password: user.password
    }), {
      headers: { 'Content-Type': 'application/json' },
    });
    
    const authTime = Date.now() - burstStart;
    authSpikeResponseTime.add(authTime);
    
    const loginSuccess = check(loginResponse, {
      'spike login status is 200': (r) => r.status === 200,
      'spike login response time < 5s': (r) => r.timings.duration < 5000,
      'spike login returns token': (r) => r.status === 200 && JSON.parse(r.body).data?.accessToken,
    });
    
    if (!loginSuccess) {
      spikeFailures.add(1);
      spikeAuthErrors.add(1);
      spikeSuccessRate.add(0);
      return;
    }
    
    spikeSuccessRate.add(1);
    const token = JSON.parse(loginResponse.body).data.accessToken;
    
    // 突发期间快速连续API调用
    const burstEndpoints = [
      '/monitoring/health',
      '/monitoring/metrics/performance',
      '/providers/capabilities'
    ];
    
    // 并发调用多个端点
    const burstRequests = burstEndpoints.map(endpoint => {
      const start = Date.now();
      const response = http.get(`${BASE_URL}${API_VERSION}${endpoint}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      
      const responseTime = Date.now() - start;
      authSpikeResponseTime.add(responseTime);
      
      const success = check(response, {
        [`spike ${endpoint} success`]: (r) => r.status < 400,
        [`spike ${endpoint} response time < 3s`]: (r) => r.timings.duration < 3000,
      });
      
      if (!success) {
        spikeFailures.add(1);
        if (response.status === 429) {
          // 期望突发期间会有限流
          console.log(`✓ 预期的限流响应: ${endpoint}`);
        } else {
          spikeAuthErrors.add(1);
        }
      }
      
      return response;
    });
  });
}

// API Key认证突发测试
function apiKeyAuthenticationBurst(data) {
  group('API Key Authentication Burst', () => {
    if (data.apiKeys.length === 0) {
      return;
    }
    
    const apiKeyInfo = data.apiKeys[Math.floor(Math.random() * data.apiKeys.length)];
    
    // 突发期间高频数据请求
    const burstDataEndpoints = [
      {
        path: '/receiver/data',
        method: 'POST',
        body: {
          symbols: ['AAPL.US', 'GOOGL.US', 'TSLA.US'],
          receiverType: 'get-stock-quote'
        }
      },
      {
        path: '/query/execute',
        method: 'POST', 
        body: {
          queryType: 'by_symbols',
          symbols: ['700.HK', '9988.HK']
        }
      }
    ];
    
    burstDataEndpoints.forEach(endpoint => {
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
      
      const responseTime = Date.now() - start;
      authSpikeResponseTime.add(responseTime);
      
      const success = check(response, {
        [`spike API ${endpoint.path} success`]: (r) => r.status < 400,
        [`spike API ${endpoint.path} response time < 5s`]: (r) => r.timings.duration < 5000,
      });
      
      if (success) {
        spikeSuccessRate.add(1);
      } else {
        spikeFailures.add(1);
        spikeSuccessRate.add(0);
        
        if (response.status === 429) {
          console.log(`✓ 突发期间触发限流保护: ${endpoint.path}`);
        } else {
          spikeAuthErrors.add(1);
        }
      }
    });
  });
}

// 普通认证负载测试
function normalAuthenticationLoad(data) {
  group('Normal Authentication Load', () => {
    const user = data.users[Math.floor(Math.random() * data.users.length)];
    
    // 正常速度的认证测试
    const loginResponse = http.post(`${BASE_URL}${API_VERSION}/auth/login`, JSON.stringify({
      username: user.username,
      password: user.password
    }), {
      headers: { 'Content-Type': 'application/json' },
    });
    
    const success = check(loginResponse, {
      'normal login status is 200': (r) => r.status === 200,
      'normal login response time < 2s': (r) => r.timings.duration < 2000,
    });
    
    if (success) {
      spikeSuccessRate.add(1);
      const token = JSON.parse(loginResponse.body).data.accessToken;
      
      // 正常的API调用
      const response = http.get(`${BASE_URL}${API_VERSION}/monitoring/health`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      
      check(response, {
        'normal health check success': (r) => r.status === 200,
      });
    } else {
      spikeSuccessRate.add(0);
    }
  });
}

// 系统恢复验证
function systemRecoveryValidation(data) {
  group('System Recovery Validation', () => {
    const recoveryStart = Date.now();
    
    // 测试系统是否能快速恢复到正常状态
    const user = data.users[Math.floor(Math.random() * data.users.length)];
    
    const loginResponse = http.post(`${BASE_URL}${API_VERSION}/auth/login`, JSON.stringify({
      username: user.username,
      password: user.password
    }), {
      headers: { 'Content-Type': 'application/json' },
    });
    
    const recoveryTime = Date.now() - recoveryStart;
    systemRecoveryTime.add(recoveryTime);
    
    const recoverySuccess = check(loginResponse, {
      'recovery login success': (r) => r.status === 200,
      'recovery response time < 1s': (r) => r.timings.duration < 1000,
      'recovery login fast': (r) => r.timings.duration < 500, // 恢复期间应该很快
    });
    
    if (recoverySuccess) {
      spikeSuccessRate.add(1);
      
      // 验证系统功能完全恢复
      const token = JSON.parse(loginResponse.body).data.accessToken;
      const healthResponse = http.get(`${BASE_URL}${API_VERSION}/monitoring/health`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      
      check(healthResponse, {
        'recovery health check success': (r) => r.status === 200,
        'recovery health fast': (r) => r.timings.duration < 500,
      });
    } else {
      spikeSuccessRate.add(0);
    }
  });
}

// 峰值并发认证测试
export function extremeConcurrentAuth(data) {
  group('Extreme Concurrent Authentication', () => {
    const user = data.users[Math.floor(Math.random() * data.users.length)];
    
    // 模拟极端并发场景：同一用户多次同时登录
    const concurrentLogins = Array(3).fill(0).map(() =>
      http.post(`${BASE_URL}${API_VERSION}/auth/login`, JSON.stringify({
        username: user.username,
        password: user.password
      }), {
        headers: { 'Content-Type': 'application/json' },
      })
    );
    
    // 验证并发认证的处理
    concurrentLogins.forEach((response, index) => {
      check(response, {
        [`concurrent login ${index} handled`]: (r) => r.status === 200 || r.status === 429,
      });
    });
  });
}

// 清理阶段
export function teardown(data) {
  console.log('🧹 开始清理突发负载测试数据...');
  
  console.log(`📊 突发负载测试完成:
    - 测试用户数: ${data.users.length}
    - API Key数: ${data.apiKeys.length}
    - 突发失败数: ${spikeFailures.count}
    - 认证错误数: ${spikeAuthErrors.count}
    - 并发认证尝试: ${concurrentAuthAttempts.count}
    - 系统恢复性能: 平均 ${systemRecoveryTime.avg}ms`);
}

// 生成测试报告
export function handleSummary(data) {
  return {
    'auth-spike-report.html': htmlReport(data),
    stdout: textSummary(data, { indent: ' ', enableColors: true }),
    'auth-spike-summary.json': JSON.stringify(data),
  };
}