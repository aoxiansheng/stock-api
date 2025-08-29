import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';

// SmartCache专用指标
const cacheHits = new Counter('cache_hits');
const cacheMisses = new Counter('cache_misses');
const cacheResponseTime = new Trend('cache_response_time');
const cacheFailureRate = new Rate('cache_failures');

// 基础配置 - 适中的负载用于验证SmartCache功能
export const options = {
  scenarios: {
    // 基础负载测试
    cache_performance: {
      executor: 'ramping-vus',
      startVUs: 5,
      stages: [
        { duration: '30s', target: 20 },  // 逐步增加到20用户
        { duration: '1m', target: 20 },   // 保持20用户1分钟
        { duration: '30s', target: 50 },  // 增加到50用户测试并发
        { duration: '1m', target: 50 },   // 保持高负载
        { duration: '30s', target: 0 },   // 逐步停止
      ],
    },
  },
  thresholds: {
    cache_response_time: ['p(95)<1000'], // 95%响应时间小于1秒
    cache_failures: ['rate<0.02'],        // 失败率小于2%
    http_req_duration: ['p(95)<2000'],    // HTTP响应时间
    http_req_failed: ['rate<0.05'],       // HTTP失败率小于5%
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

// 测试数据
const TEST_SYMBOLS = [
  ['700.HK', '9988.HK'],      // 港股
  ['AAPL.US', 'MSFT.US'],    // 美股
  ['000001.SZ', '000002.SZ'], // 深圳
  ['600036.SH', '600519.SH'], // 上海
];

export default function () {
  // 随机选择股票组合
  const symbols = TEST_SYMBOLS[Math.floor(Math.random() * TEST_SYMBOLS.length)];
  
  // 测试1: Receiver接口 (强时效性缓存)
  testReceiverCache(symbols);
  
  // 测试2: Query接口 (弱时效性缓存)  
  testQueryCache(symbols);
  
  // 模拟用户思考时间
  sleep(Math.random() * 2 + 0.5); // 0.5-2.5秒
}

function testReceiverCache(symbols) {
  const payload = {
    symbols: symbols,
    receiverType: 'get-stock-quote'
  };
  
  const response = http.post(`${BASE_URL}/api/v1/receiver/data`, JSON.stringify(payload), {
    headers: {
      'Content-Type': 'application/json',
      'X-App-Key': 'test-app-key',
      'X-Access-Token': 'test-access-token',
    },
    tags: { endpoint: 'receiver', cache_type: 'strong_timeliness' },
  });
  
  // 记录响应时间
  cacheResponseTime.add(response.timings.duration);
  
  const success = check(response, {
    'receiver status is 200': (r) => r.status === 200,
    'receiver has response body': (r) => r.body && r.body.length > 0,
    'receiver response time < 1000ms': (r) => r.timings.duration < 1000,
  });
  
  if (!success) {
    cacheFailureRate.add(1);
    console.error(`Receiver test failed: ${response.status}, ${response.body}`);
  } else {
    // 检查是否来自缓存 (通过响应时间估算)
    if (response.timings.duration < 100) {
      cacheHits.add(1);
    } else {
      cacheMisses.add(1);
    }
  }
}

function testQueryCache(symbols) {
  const payload = {
    symbols: symbols,
    queryTypeFilter: 'get-stock-quote',
    cacheStrategy: 'WEAK_TIMELINESS'
  };
  
  const response = http.post(`${BASE_URL}/api/v1/query/data`, JSON.stringify(payload), {
    headers: {
      'Content-Type': 'application/json',
      'X-App-Key': 'test-app-key', 
      'X-Access-Token': 'test-access-token',
    },
    tags: { endpoint: 'query', cache_type: 'weak_timeliness' },
  });
  
  // 记录响应时间
  cacheResponseTime.add(response.timings.duration);
  
  const success = check(response, {
    'query status is 200': (r) => r.status === 200,
    'query has response body': (r) => r.body && r.body.length > 0,
    'query response time < 2000ms': (r) => r.timings.duration < 2000,
  });
  
  if (!success) {
    cacheFailureRate.add(1);
    console.error(`Query test failed: ${response.status}, ${response.body}`);
  } else {
    // 检查是否来自缓存
    if (response.timings.duration < 200) {
      cacheHits.add(1);
    } else {
      cacheMisses.add(1);
    }
  }
}

// 生成测试报告
export function handleSummary(data) {
  const summary = {
    duration: Math.round(data.state.testRunDuration / 1000),
    totalRequests: data.metrics.http_reqs?.values.count || 0,
    failedRequests: data.metrics.http_req_failed?.values.count || 0,
    avgResponseTime: data.metrics.cache_response_time?.values.avg || 0,
    p95ResponseTime: data.metrics.cache_response_time?.values['p(95)'] || 0,
    cacheHits: data.metrics.cache_hits?.values.count || 0,
    cacheMisses: data.metrics.cache_misses?.values.count || 0,
    failureRate: data.metrics.cache_failures?.values.rate || 0,
  };
  
  const cacheHitRate = summary.cacheHits / (summary.cacheHits + summary.cacheMisses) * 100;
  
  return {
    'stdout': `
🎯 SmartCache K6 Performance Test Results
=========================================

⏱️  Test Duration: ${summary.duration}s
📊 Total Requests: ${summary.totalRequests}
❌ Failed Requests: ${summary.failedRequests}
📈 Failure Rate: ${(summary.failureRate * 100).toFixed(2)}%

🚀 Response Times:
- Average: ${summary.avgResponseTime.toFixed(2)}ms
- P95: ${summary.p95ResponseTime.toFixed(2)}ms

🎯 Cache Performance:
- Cache Hits: ${summary.cacheHits}
- Cache Misses: ${summary.cacheMisses}
- Cache Hit Rate: ${cacheHitRate.toFixed(1)}%

✅ Performance Goals:
${summary.p95ResponseTime < 1000 ? '✅' : '❌'} P95 Response Time (<1000ms)
${summary.failureRate < 0.02 ? '✅' : '❌'} Failure Rate (<2%)
${cacheHitRate > 50 ? '✅' : '❌'} Cache Hit Rate (>50%)

=========================================
`,
    'k6-smart-cache-results.json': JSON.stringify(summary, null, 2),
  };
}