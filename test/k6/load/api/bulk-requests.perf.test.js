import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

// 自定义指标
export const errorRate = new Rate('errors');

// 测试配置 - 专注于批量请求性能
export const options = {
  stages: [
    { duration: '1m', target: 5 },   // 启动阶段
    { duration: '3m', target: 15 },  // 负载阶段
    { duration: '1m', target: 0 },   // 降压阶段
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000'], // 批量请求95%响应时间小于2秒
    http_req_failed: ['rate<0.05'],    // 错误率小于5%
    errors: ['rate<0.05'],
  },
};

// 测试数据
const API_BASE_URL = __ENV.API_BASE_URL || 'http://localhost:3001';
const TEST_APP_KEY = 'test-app-key-for-performance';
const TEST_ACCESS_TOKEN = 'test-access-token-for-performance';

let jwtToken = '';

export function setup() {
  // 获取JWT令牌
  const loginPayload = {
    username: 'admin',
    password: 'admin123',
  };

  const loginResponse = http.post(
    `${API_BASE_URL}/api/v1/auth/login`,
    JSON.stringify(loginPayload),
    {
      headers: { 'Content-Type': 'application/json' },
    }
  );

  if (loginResponse.status === 200) {
    const loginData = JSON.parse(loginResponse.body);
    jwtToken = loginData.data.accessToken;
  }

  return { jwtToken };
}

export default function (data) {
  // 随机选择测试场景
  const scenario = Math.random();
  
  if (scenario < 0.4) {
    testBulkDataRequests();
  } else if (scenario < 0.7) {
    testConcurrentRequests();
  } else {
    testScalabilityLimits();
  }

  sleep(1);
}

// 测试批量数据请求性能
function testBulkDataRequests() {
  // 测试不同大小的批量请求
  const batchSizes = [5, 10, 15, 20];
  const batchSize = batchSizes[Math.floor(Math.random() * batchSizes.length)];
  
  const symbols = Array.from({ length: batchSize }, (_, i) => `TEST${i}.HK`);

  const payload = {
    symbols: symbols,
    dataType: 'stock-quote',
    options: {
      preferredProvider: 'longport'
    }
  };

  const params = {
    headers: {
      'Content-Type': 'application/json',
      'X-App-Key': TEST_APP_KEY,
      'X-Access-Token': TEST_ACCESS_TOKEN,
    },
  };

  const response = http.post(
    `${API_BASE_URL}/api/v1/receiver/data`,
    JSON.stringify(payload),
    params
  );

  const result = check(response, {
    [`bulk request (${batchSize} symbols) status is 200`]: (r) => r.status === 200,
    [`bulk request (${batchSize} symbols) response time < 3000ms`]: (r) => r.timings.duration < 3000,
    [`bulk request (${batchSize} symbols) has correct data count`]: (r) => {
      try {
        const data = JSON.parse(r.body);
        return data.statusCode === 200 && data.data.results.length === batchSize;
      } catch {
        return false;
      }
    },
  });

  errorRate.add(!result);
}

// 测试并发请求处理能力
function testConcurrentRequests() {
  const symbols = ['700.HK', 'AAPL.US', '000001.SZ'];
  
  const payload = {
    symbols: symbols,
    dataType: 'stock-quote'
  };

  const params = {
    headers: {
      'Content-Type': 'application/json',
      'X-App-Key': TEST_APP_KEY,
      'X-Access-Token': TEST_ACCESS_TOKEN,
    },
  };

  const response = http.post(
    `${API_BASE_URL}/api/v1/receiver/data`,
    JSON.stringify(payload),
    params
  );

  const result = check(response, {
    'concurrent request status is 200': (r) => r.status === 200,
    'concurrent request response time < 1500ms': (r) => r.timings.duration < 1500,
    'concurrent request handles multiple markets': (r) => {
      try {
        const data = JSON.parse(r.body);
        return data.statusCode === 200 && data.data.results.length === 3;
      } catch {
        return false;
      }
    },
  });

  errorRate.add(!result);
}

// 测试系统扩展性限制
function testScalabilityLimits() {
  // 测试接近系统限制的大批量请求
  const largeSymbolList = Array.from({ length: 50 }, (_, i) => `SCALE${i}.HK`);
  
  const payload = {
    symbols: largeSymbolList,
    dataType: 'stock-quote'
  };

  const params = {
    headers: {
      'Content-Type': 'application/json',
      'X-App-Key': TEST_APP_KEY,
      'X-Access-Token': TEST_ACCESS_TOKEN,
    },
  };

  const startTime = Date.now();
  
  const response = http.post(
    `${API_BASE_URL}/api/v1/receiver/data`,
    JSON.stringify(payload),
    params
  );

  const responseTime = Date.now() - startTime;

  const result = check(response, {
    'scalability test status is 200 or 429': (r) => r.status === 200 || r.status === 429,
    'scalability test response time < 10000ms': (r) => r.timings.duration < 10000,
    'scalability test handles graceful degradation': (r) => {
      try {
        const data = JSON.parse(r.body);
        // 系统应该返回结果或明确的限制信息
        return data.statusCode >= 200 && data.statusCode < 500;
      } catch {
        return false;
      }
    },
  });

  errorRate.add(!result);
}

// 清理阶段
export function teardown(data) {
  console.log('Bulk requests performance test completed');
  
  // 输出性能总结
  if (data.jwtToken) {
    const params = {
      headers: {
        'Authorization': `Bearer ${data.jwtToken}`,
      },
    };

    const metricsResponse = http.get(
      `${API_BASE_URL}/api/v1/monitoring/metrics/performance`,
      params
    );

    if (metricsResponse.status === 200) {
      console.log('Performance metrics collected for bulk requests test');
    }
  }
}