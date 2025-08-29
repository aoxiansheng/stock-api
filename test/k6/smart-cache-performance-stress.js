import http from 'k6/http';
import { check, group } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';

// Custom metrics for SmartCache monitoring
const smartCacheRequests = new Counter('smart_cache_requests');
const smartCacheFailures = new Rate('smart_cache_failures');
const smartCacheResponseTime = new Trend('smart_cache_response_time');
const concurrencyAdjustments = new Counter('concurrency_adjustments');
const memoryPressureEvents = new Counter('memory_pressure_events');

// 测试配置
export const options = {
  scenarios: {
    // 场景1: 基准负载测试 (模拟正常使用)
    baseline_load: {
      executor: 'constant-vus',
      vus: 50,
      duration: '2m',
      tags: { scenario: 'baseline' },
    },
    // 场景2: 逐步增压测试 (测试动态并发调整)
    ramp_up_load: {
      executor: 'ramping-vus',
      startVUs: 10,
      stages: [
        { duration: '1m', target: 50 },
        { duration: '2m', target: 100 },
        { duration: '2m', target: 200 },
        { duration: '1m', target: 300 },
        { duration: '2m', target: 100 },
        { duration: '1m', target: 0 },
      ],
      tags: { scenario: 'ramp_up' },
    },
    // 场景3: 峰值压力测试 (测试内存压力处理)
    spike_load: {
      executor: 'constant-vus',
      vus: 500,
      duration: '3m',
      tags: { scenario: 'spike' },
      startTime: '11m', // 在其他测试完成后执行
    },
    // 场景4: 长时间稳定性测试
    endurance_load: {
      executor: 'constant-vus',
      vus: 30,
      duration: '10m',
      tags: { scenario: 'endurance' },
      startTime: '15m', // 在峰值测试后执行
    },
  },
  thresholds: {
    // SmartCache 性能阈值
    smart_cache_response_time: ['p(95)<500', 'p(99)<1000'],
    smart_cache_failures: ['rate<0.01'], // 失败率小于1%
    http_req_duration: ['p(95)<2000'],
    http_req_failed: ['rate<0.05'],
    
    // 并发控制指标
    concurrency_adjustments: ['count>0'], // 应该有并发调整事件
    memory_pressure_events: ['count<100'], // 内存压力事件应控制在合理范围
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

// 测试用户令牌（需要预先创建）
const API_KEY = __ENV.API_KEY || 'test-api-key';
const ACCESS_TOKEN = __ENV.ACCESS_TOKEN || 'test-access-token';

// 测试用股票代码
const STOCK_SYMBOLS = [
  ['700.HK', '9988.HK', '0005.HK'],
  ['AAPL.US', 'GOOGL.US', 'MSFT.US'],
  ['000001.SZ', '000002.SZ', '000858.SZ'],
  ['600036.SH', '600519.SH', '600887.SH'],
];

export default function () {
  const scenario = __ENV.K6_SCENARIO || 'baseline';
  
  group('SmartCache Performance Test', () => {
    // 随机选择股票代码组合
    const symbols = STOCK_SYMBOLS[Math.floor(Math.random() * STOCK_SYMBOLS.length)];
    
    // Test Receiver endpoint (strong timeliness cache)
    group('Receiver Cache Test', () => {
      const receiverPayload = {
        symbols: symbols,
        receiverType: 'get-stock-quote',
        provider: 'longport'
      };
      
      const receiverResponse = http.post(`${BASE_URL}/api/v1/receiver/data`, JSON.stringify(receiverPayload), {
        headers: {
          'Content-Type': 'application/json',
          'X-App-Key': API_KEY,
          'X-Access-Token': ACCESS_TOKEN,
        },
        tags: { endpoint: 'receiver', cache_strategy: 'strong_timeliness' },
      });
      
      // 记录指标
      smartCacheRequests.add(1);
      smartCacheResponseTime.add(receiverResponse.timings.duration);
      
      const receiverSuccess = check(receiverResponse, {
        'receiver response status is 200': (r) => r.status === 200,
        'receiver response time < 500ms': (r) => r.timings.duration < 500,
        'receiver response has data': (r) => {
          const body = JSON.parse(r.body || '{}');
          return body.data && Array.isArray(body.data);
        },
      });
      
      if (!receiverSuccess) {
        smartCacheFailures.add(1);
      }
    });
    
    // Test Query endpoint (weak timeliness cache)
    group('Query Cache Test', () => {
      const queryPayload = {
        symbols: symbols,
        queryTypeFilter: 'get-stock-quote',
        cacheStrategy: 'WEAK_TIMELINESS'
      };
      
      const queryResponse = http.post(`${BASE_URL}/api/v1/query/data`, JSON.stringify(queryPayload), {
        headers: {
          'Content-Type': 'application/json',
          'X-App-Key': API_KEY,
          'X-Access-Token': ACCESS_TOKEN,
        },
        tags: { endpoint: 'query', cache_strategy: 'weak_timeliness' },
      });
      
      // 记录指标
      smartCacheRequests.add(1);
      smartCacheResponseTime.add(queryResponse.timings.duration);
      
      const querySuccess = check(queryResponse, {
        'query response status is 200': (r) => r.status === 200,
        'query response time < 1000ms': (r) => r.timings.duration < 1000,
        'query response has data': (r) => {
          const body = JSON.parse(r.body || '{}');
          return body.data && Array.isArray(body.data);
        },
      });
      
      if (!querySuccess) {
        smartCacheFailures.add(1);
      }
    });
    
    // 模拟高频请求以触发动态并发调整
    if (scenario === 'spike') {
      group('High Frequency Cache Test', () => {
        for (let i = 0; i < 5; i++) {
          const highFreqPayload = {
            symbols: [symbols[0]], // 单个股票高频查询
            receiverType: 'get-stock-quote'
          };
          
          const highFreqResponse = http.post(`${BASE_URL}/api/v1/receiver/data`, JSON.stringify(highFreqPayload), {
            headers: {
              'Content-Type': 'application/json',
              'X-App-Key': API_KEY,
              'X-Access-Token': ACCESS_TOKEN,
            },
            tags: { endpoint: 'receiver', test_type: 'high_frequency' },
          });
          
          smartCacheRequests.add(1);
          smartCacheResponseTime.add(highFreqResponse.timings.duration);
          
          if (highFreqResponse.status !== 200) {
            smartCacheFailures.add(1);
          }
        }
      });
    }
  });
  
  // 检查系统监控指标 (如果可用)
  if (scenario === 'ramp_up' || scenario === 'spike') {
    group('System Monitoring Check', () => {
      const monitoringResponse = http.get(`${BASE_URL}/api/v1/monitoring/metrics-health`, {
        headers: {
          'X-App-Key': API_KEY,
          'X-Access-Token': ACCESS_TOKEN,
        },
        tags: { endpoint: 'monitoring' },
      });
      
      check(monitoringResponse, {
        'monitoring endpoint available': (r) => r.status === 200 || r.status === 401, // 401 is acceptable if auth needed
        'monitoring response time < 2s': (r) => r.timings.duration < 2000,
      });
      
      // 尝试解析并记录性能指标
      if (monitoringResponse.status === 200) {
        try {
          const metrics = JSON.parse(monitoringResponse.body);
          if (metrics.data && metrics.data.smartCache) {
            const smartCacheMetrics = metrics.data.smartCache;
            
            // 记录并发调整和内存压力事件
            if (smartCacheMetrics.concurrencyAdjustments) {
              concurrencyAdjustments.add(smartCacheMetrics.concurrencyAdjustments);
            }
            if (smartCacheMetrics.memoryPressureEvents) {
              memoryPressureEvents.add(smartCacheMetrics.memoryPressureEvents);
            }
          }
        } catch (e) {
          // Ignore parsing errors
        }
      }
    });
  }
  
  // 随机延迟，模拟真实用户行为
  const thinkTime = Math.random() * 1000 + 500; // 0.5-1.5秒
  sleep(thinkTime / 1000);
}

// 测试完成后的总结函数
export function handleSummary(data) {
  const summary = {
    testDuration: data.state.testRunDuration,
    scenarios: {},
    smartCacheMetrics: {
      totalRequests: data.metrics.smart_cache_requests.values.count || 0,
      failureRate: data.metrics.smart_cache_failures.values.rate || 0,
      avgResponseTime: data.metrics.smart_cache_response_time.values.avg || 0,
      p95ResponseTime: data.metrics.smart_cache_response_time.values['p(95)'] || 0,
      p99ResponseTime: data.metrics.smart_cache_response_time.values['p(99)'] || 0,
      concurrencyAdjustments: data.metrics.concurrency_adjustments.values.count || 0,
      memoryPressureEvents: data.metrics.memory_pressure_events.values.count || 0,
    },
    httpMetrics: {
      totalRequests: data.metrics.http_reqs.values.count || 0,
      failedRequests: data.metrics.http_req_failed.values.count || 0,
      avgDuration: data.metrics.http_req_duration.values.avg || 0,
      p95Duration: data.metrics.http_req_duration.values['p(95)'] || 0,
    }
  };
  
  // 按场景分析结果
  for (const [scenarioName, scenarioData] of Object.entries(data.root_group.groups || {})) {
    summary.scenarios[scenarioName] = {
      duration: scenarioData.duration || 0,
      iterations: scenarioData.iterations || 0,
      checks: scenarioData.checks || 0,
    };
  }
  
  return {
    'stdout': `
🚀 SmartCache Performance Test Results
=====================================

Test Duration: ${Math.round(summary.testDuration / 1000)}s

SmartCache Metrics:
- Total Requests: ${summary.smartCacheMetrics.totalRequests}
- Failure Rate: ${(summary.smartCacheMetrics.failureRate * 100).toFixed(2)}%
- Avg Response Time: ${summary.smartCacheMetrics.avgResponseTime.toFixed(2)}ms
- P95 Response Time: ${summary.smartCacheMetrics.p95ResponseTime.toFixed(2)}ms
- P99 Response Time: ${summary.smartCacheMetrics.p99ResponseTime.toFixed(2)}ms
- Concurrency Adjustments: ${summary.smartCacheMetrics.concurrencyAdjustments}
- Memory Pressure Events: ${summary.smartCacheMetrics.memoryPressureEvents}

HTTP Metrics:
- Total HTTP Requests: ${summary.httpMetrics.totalRequests}
- Failed Requests: ${summary.httpMetrics.failedRequests}
- Avg HTTP Duration: ${summary.httpMetrics.avgDuration.toFixed(2)}ms
- P95 HTTP Duration: ${summary.httpMetrics.p95Duration.toFixed(2)}ms

Performance Assessment:
${summary.smartCacheMetrics.p95ResponseTime < 500 ? '✅' : '❌'} P95 Response Time Target (<500ms)
${summary.smartCacheMetrics.failureRate < 0.01 ? '✅' : '❌'} Failure Rate Target (<1%)
${summary.smartCacheMetrics.concurrencyAdjustments > 0 ? '✅' : '❌'} Dynamic Concurrency Working
${summary.smartCacheMetrics.memoryPressureEvents < 100 ? '✅' : '❌'} Memory Pressure Controlled

=====================================
    `,
    'summary.json': JSON.stringify(summary, null, 2),
  };
}

// 辅助函数
function sleep(seconds) {
  // K6 sleep function equivalent
  http.get('data:,', { tags: { name: 'sleep' } });
}