import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Counter, Trend } from 'k6/metrics';

// 安全性能测试自定义指标
const securityErrorRate = new Rate('security_errors');
const authenticationFailures = new Counter('authentication_failures');
const authorizationDenials = new Counter('authorization_denials');
const rateLimitHits = new Counter('rate_limit_hits');
const suspiciousActivityDetected = new Counter('suspicious_activity');
const securityResponseTime = new Trend('security_response_time');
const attackMitigationRate = new Rate('attack_mitigation');

// 安全负载测试配置 - 模拟各种安全攻击场景
export const options = {
  stages: [
    { duration: '1m', target: 10 },   // 启动阶段
    { duration: '2m', target: 25 },   // 正常安全负载
    { duration: '2m', target: 50 },   // 增加攻击尝试
    { duration: '1m', target: 0 },    // 停止
  ],
  thresholds: {
    http_req_duration: ['p(95)<3000'], // 安全检查不应显著影响性能
    security_errors: ['rate<0.1'],     // 安全错误率应低于10%
    attack_mitigation: ['rate>0.9'],   // 攻击缓解率应高于90%
    rate_limit_hits: ['count>0'],      // 应该触发速率限制
  },
};

// 测试数据
const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const TEST_USERS = [
  { username: 'sectest1', password: 'password123' },
  { username: 'sectest2', password: 'password123' },
  { username: 'sectest3', password: 'password123' },
];

// 攻击载荷库
const ATTACK_PAYLOADS = {
  SQL_INJECTION: [
    "'; DROP TABLE users; --",
    "' OR '1'='1",
    "admin'; EXEC xp_cmdshell('dir'); --",
    "1' UNION SELECT password FROM users--",
  ],
  
  XSS_PAYLOADS: [
    '<script>alert("XSS")</script>',
    'javascript:alert("XSS")',
    '<img src="x" onerror="alert(\'XSS\')">',
    '<svg onload="alert(\'XSS\')">',
  ],
  
  COMMAND_INJECTION: [
    '; cat /etc/passwd',
    '| rm -rf /',
    '`id`',
    '$(whoami)',
  ],
  
  PATH_TRAVERSAL: [
    '../../../etc/passwd',
    '..\\..\\..\\windows\\system32\\config\\sam',
    'file:///etc/passwd',
    '....//....//....//etc/passwd',
  ],
  
  HEADER_INJECTION: [
    'test\r\nX-Admin: true',
    'test\nSet-Cookie: admin=true',
    'test\x00admin',
    'test; rm -rf /',
  ],
};

export function setup() {
  console.log('🔒 启动安全性能测试 - 模拟各种攻击场景');
  
  // 创建测试用户
  for (const user of TEST_USERS) {
    const registerResponse = http.post(
      `${BASE_URL}/api/v1/auth/register`,
      JSON.stringify({
        username: user.username,
        email: `${user.username}@sectest.com`,
        password: user.password,
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );
    
    if (registerResponse.status === 201) {
      console.log(`安全测试用户 ${user.username} 创建成功`);
    }
  }
  
  return { testUsers: TEST_USERS };
}

export default function (data) {
  const currentVU = __VU;
  const scenario = currentVU % 6;
  
  switch (scenario) {
    case 0:
      testAuthenticationSecurity();
      break;
    case 1:
      testInputValidationSecurity(data.testUsers);
      break;
    case 2:
      testAuthorizationSecurity(data.testUsers);
      break;
    case 3:
      testRateLimitingSecurity();
      break;
    case 4:
      testSessionSecurity(data.testUsers);
      break;
    case 5:
      testAPISecurityHeaders();
      break;
  }
  
  sleep(Math.random() * 2);
}

// 认证安全测试
function testAuthenticationSecurity() {
  const startTime = Date.now();
  
  // 测试暴力破解防护
  const bruteForceAttempts = [
    { username: 'admin', password: 'admin' },
    { username: 'admin', password: 'password' },
    { username: 'admin', password: '123456' },
    { username: 'root', password: 'root' },
    { username: 'administrator', password: 'administrator' },
  ];
  
  const randomAttempt = bruteForceAttempts[Math.floor(Math.random() * bruteForceAttempts.length)];
  
  const response = http.post(
    `${BASE_URL}/api/v1/auth/login`,
    JSON.stringify(randomAttempt),
    { headers: { 'Content-Type': 'application/json' } }
  );
  
  const responseTime = Date.now() - startTime;
  securityResponseTime.add(responseTime);
  
  const securityCheckPassed = check(response, {
    '暴力破解尝试被阻止': (r) => r.status === 401 || r.status === 429,
    '认证响应时间合理': (r) => r.timings.duration < 5000,
    '不泄露用户存在信息': (r) => {
      const body = r.body || '';
      return !body.includes('用户不存在') && !body.includes('user not found');
    },
  });
  
  if (!securityCheckPassed) {
    securityErrorRate.add(1);
  } else {
    attackMitigationRate.add(1);
  }
  
  if (response.status === 401) {
    authenticationFailures.add(1);
  }
  
  if (response.status === 429) {
    rateLimitHits.add(1);
  }
}

// 输入验证安全测试
function testInputValidationSecurity(testUsers) {
  if (!testUsers || testUsers.length === 0) return;
  
  const user = testUsers[Math.floor(Math.random() * testUsers.length)];
  const startTime = Date.now();
  
  // 随机选择攻击载荷类型
  const attackTypes = Object.keys(ATTACK_PAYLOADS);
  const attackType = attackTypes[Math.floor(Math.random() * attackTypes.length)];
  const payloads = ATTACK_PAYLOADS[attackType];
  const payload = payloads[Math.floor(Math.random() * payloads.length)];
  
  // 注入到不同的输入字段
  const injectionTargets = [
    { endpoint: '/api/v1/auth/register', field: 'username', method: 'POST' },
    { endpoint: '/api/v1/auth/register', field: 'email', method: 'POST' },
    { endpoint: '/api/v1/receiver/data', field: 'symbols', method: 'POST' },
    { endpoint: '/api/v1/receiver/data', field: 'dataType', method: 'POST' },
  ];
  
  const target = injectionTargets[Math.floor(Math.random() * injectionTargets.length)];
  
  let requestBody = {};
  if (target.endpoint === '/api/v1/auth/register') {
    requestBody = {
      username: target.field === 'username' ? payload : `testuser${Date.now()}`,
      email: target.field === 'email' ? payload : `test${Date.now()}@example.com`,
      password: 'password123',
    };
  } else if (target.endpoint === '/api/v1/receiver/data') {
    requestBody = {
      symbols: target.field === 'symbols' ? [payload] : ['AAPL.US'],
      dataType: target.field === 'dataType' ? payload : 'get-stock-quote',
    };
  }
  
  const response = http.post(
    `${BASE_URL}${target.endpoint}`,
    JSON.stringify(requestBody),
    { headers: { 'Content-Type': 'application/json' } }
  );
  
  const responseTime = Date.now() - startTime;
  securityResponseTime.add(responseTime);
  
  const inputValidationPassed = check(response, {
    '恶意输入被拒绝': (r) => r.status === 400 || r.status === 422,
    '不执行注入代码': (r) => {
      const body = r.body || '';
      // 检查响应不包含攻击成功的标志
      return !body.includes('DROP TABLE') && 
             !body.includes('<script>') && 
             !body.includes('/etc/passwd') &&
             !body.includes('root:');
    },
    '服务器不崩溃': (r) => r.status !== 500,
    '响应时间正常': (r) => r.timings.duration < 10000,
  });
  
  if (inputValidationPassed) {
    attackMitigationRate.add(1);
  } else {
    securityErrorRate.add(1);
    suspiciousActivityDetected.add(1);
  }
}

// 授权安全测试
function testAuthorizationSecurity(testUsers) {
  if (!testUsers || testUsers.length === 0) return;
  
  const user = testUsers[Math.floor(Math.random() * testUsers.length)];
  const startTime = Date.now();
  
  // 先登录获取令牌
  const loginResponse = http.post(
    `${BASE_URL}/api/v1/auth/login`,
    JSON.stringify({
      username: user.username,
      password: user.password,
    }),
    { headers: { 'Content-Type': 'application/json' } }
  );
  
  if (loginResponse.status !== 200) {
    return;
  }
  
  const loginData = JSON.parse(loginResponse.body);
  const token = loginData.data?.accessToken;
  
  if (!token) {
    return;
  }
  
  // 尝试权限提升攻击
  const privilegeEscalationAttempts = [
    // 尝试修改JWT令牌
    token.replace('user', 'admin'),
    token + '.admin',
    'Bearer admin.' + token,
    // 尝试访问管理员端点
    token, // 使用有效令牌但访问超出权限的端点
  ];
  
  const adminEndpoints = [
    '/api/v1/monitoring/dashboard',
    '/api/v1/security/scan/vulnerabilities',
    '/api/v1/auth/users/list', // 假设的管理员端点
  ];
  
  const manipulatedToken = privilegeEscalationAttempts[Math.floor(Math.random() * privilegeEscalationAttempts.length)];
  const adminEndpoint = adminEndpoints[Math.floor(Math.random() * adminEndpoints.length)];
  
  const response = http.get(
    `${BASE_URL}${adminEndpoint}`,
    {
      headers: {
        'Authorization': `Bearer ${manipulatedToken}`,
      },
    }
  );
  
  const responseTime = Date.now() - startTime;
  securityResponseTime.add(responseTime);
  
  const authorizationSecure = check(response, {
    '权限提升被阻止': (r) => r.status === 401 || r.status === 403,
    '令牌篡改被检测': (r) => {
      if (manipulatedToken !== token) {
        return r.status === 401;
      }
      return true;
    },
    '不泄露敏感信息': (r) => {
      const body = r.body || '';
      return !body.includes('password') && 
             !body.includes('secret') && 
             !body.includes('private');
    },
  });
  
  if (authorizationSecure) {
    attackMitigationRate.add(1);
  } else {
    securityErrorRate.add(1);
    authorizationDenials.add(1);
  }
}

// 速率限制安全测试
function testRateLimitingSecurity() {
  const startTime = Date.now();
  
  // 快速连续请求测试速率限制
  const rapidRequests = [];
  for (let i = 0; i < 10; i++) {
    const response = http.get(`${BASE_URL}/api/v1/providers/capabilities`);
    rapidRequests.push(response);
    
    if (response.status === 429) {
      rateLimitHits.add(1);
    }
  }
  
  const responseTime = Date.now() - startTime;
  securityResponseTime.add(responseTime);
  
  const rateLimitingEffective = check(rapidRequests[rapidRequests.length - 1], {
    '速率限制生效': () => {
      const rateLimitedCount = rapidRequests.filter(r => r.status === 429).length;
      return rateLimitedCount > 0;
    },
    '速率限制头部正确': (r) => {
      return r.headers['X-RateLimit-Limit'] !== undefined ||
             r.headers['x-ratelimit-limit'] !== undefined;
    },
    '服务保持可用': () => {
      const serverErrors = rapidRequests.filter(r => r.status >= 500).length;
      return serverErrors === 0;
    },
  });
  
  if (rateLimitingEffective) {
    attackMitigationRate.add(1);
  } else {
    securityErrorRate.add(1);
  }
}

// 会话安全测试
function testSessionSecurity(testUsers) {
  if (!testUsers || testUsers.length === 0) return;
  
  const user = testUsers[Math.floor(Math.random() * testUsers.length)];
  const startTime = Date.now();
  
  // 测试会话固定攻击
  const initialResponse = http.get(`${BASE_URL}/api/v1/providers/capabilities`);
  const initialCookies = initialResponse.headers['Set-Cookie'];
  
  // 尝试登录时保持相同的会话ID
  const loginResponse = http.post(
    `${BASE_URL}/api/v1/auth/login`,
    JSON.stringify({
      username: user.username,
      password: user.password,
    }),
    {
      headers: {
        'Content-Type': 'application/json',
        'Cookie': initialCookies || '',
      },
    }
  );
  
  const responseTime = Date.now() - startTime;
  securityResponseTime.add(responseTime);
  
  const sessionSecure = check(loginResponse, {
    '登录成功': (r) => r.status === 200 || r.status === 401,
    '会话ID更新': (r) => {
      if (r.status === 200) {
        const newCookies = r.headers['Set-Cookie'];
        return newCookies !== initialCookies;
      }
      return true;
    },
    '安全Cookie属性': (r) => {
      const cookies = r.headers['Set-Cookie'] || '';
      return cookies.includes('HttpOnly') && 
             cookies.includes('Secure') && 
             cookies.includes('SameSite');
    },
  });
  
  if (sessionSecure) {
    attackMitigationRate.add(1);
  } else {
    securityErrorRate.add(1);
  }
}

// API安全头部测试
function testAPISecurityHeaders() {
  const startTime = Date.now();
  
  const response = http.get(`${BASE_URL}/api/v1/providers/capabilities`);
  
  const responseTime = Date.now() - startTime;
  securityResponseTime.add(responseTime);
  
  const securityHeadersPresent = check(response, {
    'X-Frame-Options设置': (r) => r.headers['X-Frame-Options'] !== undefined,
    'X-Content-Type-Options设置': (r) => r.headers['X-Content-Type-Options'] === 'nosniff',
    'X-XSS-Protection设置': (r) => r.headers['X-XSS-Protection'] !== undefined,
    'Content-Security-Policy设置': (r) => r.headers['Content-Security-Policy'] !== undefined,
    'Referrer-Policy设置': (r) => r.headers['Referrer-Policy'] !== undefined,
    '不泄露服务器信息': (r) => {
      const server = r.headers['Server'] || '';
      return !server.includes('Express') && 
             !server.includes('Node.js') && 
             !server.includes('nginx/');
    },
  });
  
  if (securityHeadersPresent) {
    attackMitigationRate.add(1);
  } else {
    securityErrorRate.add(1);
  }
}

// 测试总结
export function handleSummary(data) {
  const avgSecurityResponseTime = data.metrics.security_response_time?.avg || 0;
  const securityErrorRate = data.metrics.security_errors?.rate || 0;
  const attackMitigationRate = data.metrics.attack_mitigation?.rate || 0;
  const authFailures = data.metrics.authentication_failures?.count || 0;
  const authzDenials = data.metrics.authorization_denials?.count || 0;
  const rateLimitHits = data.metrics.rate_limit_hits?.count || 0;
  const suspiciousActivities = data.metrics.suspicious_activity?.count || 0;
  
  return {
    'security-performance-summary.json': JSON.stringify(data, null, 2),
    stdout: `
=== 🔒 安全性能测试总结 ===

核心安全指标:
- 总请求数: ${data.metrics.http_reqs?.count || 0}
- 平均安全响应时间: ${avgSecurityResponseTime.toFixed(2)}ms
- 安全错误率: ${(securityErrorRate * 100).toFixed(2)}%
- 攻击缓解率: ${(attackMitigationRate * 100).toFixed(2)}%

安全事件统计:
- 认证失败次数: ${authFailures}
- 授权拒绝次数: ${authzDenials}
- 速率限制触发: ${rateLimitHits}
- 可疑活动检测: ${suspiciousActivities}

安全性能评估:
- 攻击防护能力 (>90%): ${attackMitigationRate > 0.9 ? '✅ 优秀' : attackMitigationRate > 0.7 ? '⚠️ 良好' : '❌ 需改进'}
- 安全响应速度 (<3秒): ${avgSecurityResponseTime < 3000 ? '✅ 快速' : '⚠️ 较慢'}
- 错误率控制 (<10%): ${securityErrorRate < 0.1 ? '✅ 优秀' : '❌ 需优化'}
- 速率限制效果: ${rateLimitHits > 0 ? '✅ 有效' : '⚠️ 未触发'}

安全等级评定: ${getSecurityGrade(attackMitigationRate, securityErrorRate, avgSecurityResponseTime)}

安全建议:
${getSecurityRecommendations(attackMitigationRate, securityErrorRate, rateLimitHits, suspiciousActivities)}
`,
  };
}

// 安全等级评定
function getSecurityGrade(mitigationRate, errorRate, responseTime) {
  if (mitigationRate > 0.9 && errorRate < 0.05 && responseTime < 2000) {
    return '🛡️ A级 - 安全性优秀';
  } else if (mitigationRate > 0.8 && errorRate < 0.1 && responseTime < 3000) {
    return '🟡 B级 - 安全性良好';
  } else if (mitigationRate > 0.7 && errorRate < 0.15) {
    return '🟠 C级 - 安全性一般';
  } else {
    return '🔴 D级 - 安全性不足';
  }
}

// 安全建议
function getSecurityRecommendations(mitigationRate, errorRate, rateLimitHits, suspiciousActivities) {
  const recommendations = [];
  
  if (mitigationRate < 0.8) {
    recommendations.push('- 加强输入验证和过滤机制');
    recommendations.push('- 完善攻击检测和防护逻辑');
  }
  
  if (errorRate > 0.1) {
    recommendations.push('- 优化错误处理避免信息泄露');
    recommendations.push('- 完善异常情况的安全处理');
  }
  
  if (rateLimitHits === 0) {
    recommendations.push('- 检查速率限制配置是否正确');
    recommendations.push('- 确保DDoS防护机制有效');
  }
  
  if (suspiciousActivities > 100) {
    recommendations.push('- 加强实时威胁检测能力');
    recommendations.push('- 优化安全事件响应机制');
  }
  
  if (recommendations.length === 0) {
    recommendations.push('- 系统安全性表现良好，继续保持监控');
    recommendations.push('- 建议定期进行安全评估和渗透测试');
  }
  
  return recommendations.join('\n');
}

export function teardown(data) {
  console.log('🔒 安全性能测试完成');
  console.log(`攻击缓解率: ${((data.metrics?.attack_mitigation?.rate || 0) * 100).toFixed(2)}%`);
  console.log(`安全错误率: ${((data.metrics?.security_errors?.rate || 0) * 100).toFixed(2)}%`);
}