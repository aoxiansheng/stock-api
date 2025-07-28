import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Counter, Trend } from 'k6/metrics';

// 自定义指标
const errorRate = new Rate('errors');
const systemOverloadRate = new Rate('system_overload');
const connectionFailures = new Counter('connection_failures');
const responseTimeP99 = new Trend('response_time_p99');
const memoryPressure = new Rate('memory_pressure_detected');

// 压力测试配置 - 测试系统极限
export const options = {
  stages: [
    { duration: '2m', target: 50 },   // 缓慢启动
    { duration: '3m', target: 200 },  // 中等压力
    { duration: '5m', target: 500 },  // 高压力
    { duration: '3m', target: 1000 }, // 极限压力
    { duration: '5m', target: 500 },  // 恢复阶段
    { duration: '2m', target: 0 },    // 停止
  ],
  thresholds: {
    http_req_duration: ['p(99)<5000'], // 99%响应时间小于5秒
    http_req_failed: ['rate<0.3'],     // 错误率小于30%（压力测试允许更高的失败率）
    errors: ['rate<0.3'],
    system_overload: ['rate<0.5'],     // 系统过载率小于50%
  },
};

// 测试数据
const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const API_KEY = __ENV.API_KEY || 'stress-test-app-key';
const ACCESS_TOKEN = __ENV.ACCESS_TOKEN || 'stress-test-access-token';

// 测试负载数据
const STRESS_SYMBOLS = [
  // 不同市场的大量符号
  Array.from({ length: 20 }, (_, i) => `${700 + i}.HK`),  // 港股
  Array.from({ length: 20 }, (_, i) => `STOCK${i}.US`),   // 美股
  Array.from({ length: 20 }, (_, i) => `${String(1 + i).padStart(6, '0')}.SZ`), // 深股
  Array.from({ length: 20 }, (_, i) => `${600000 + i}.SH`), // 沪股
].flat();

const headers = {
  'Content-Type': 'application/json',
  'X-App-Key': API_KEY,
  'X-Access-Token': ACCESS_TOKEN,
};

export default function () {
  // 根据当前用户数量选择不同的压力策略
  const currentVUs = __VU; 
  const strategy = currentVUs % 4;
  
  switch (strategy) {
    case 0:
      stressTestBulkRequests();
      break;
    case 1:
      stressTestConcurrentConnections();
      break;
    case 2:
      stressTestResourceExhaustion();
      break;
    case 3:
      stressTestDatabaseLoad();
      break;
  }
  
  sleep(Math.random() * 2); // 变化的睡眠时间模拟真实用户行为
}

// 批量请求压力测试
function stressTestBulkRequests() {
  // 大批量符号请求
  const batchSize = Math.floor(Math.random() * 100) + 50; // 50-150个符号
  const symbols = STRESS_SYMBOLS.slice(0, batchSize);
  
  const payload = {
    symbols: symbols,
    dataType: 'get-stock-quote',
    options: {
      timeout: 10000, // 较长的超时时间
      retries: 0,     // 不重试，测试真实性能
    },
  };
  
  const startTime = Date.now();
  
  const response = http.post(
    `${BASE_URL}/api/v1/receiver/data`,
    JSON.stringify(payload),
    { 
      headers,
      timeout: '15s', // k6请求超时
    }
  );
  
  const responseTime = Date.now() - startTime;
  responseTimeP99.add(responseTime);
  
  const success = check(response, {
    '批量请求压力测试状态合理': (r) => {
      return r.status === 200 || r.status === 429 || r.status === 503;
    },
    '批量请求响应时间<15秒': (r) => r.timings.duration < 15000,
    '批量请求处理数据合理': (r) => {
      if (r.status === 200) {
        try {
          const data = JSON.parse(r.body);
          return data.statusCode === 200 && data.data;
        } catch (e) {
          return false;
        }
      }
      return true; // 非200状态也是合理的（限流等）
    },
  });
  
  if (!success) {
    errorRate.add(1);
  } else {
    errorRate.add(0);
  }
  
  // 检测系统过载信号
  if (response.status === 503 || response.status === 429) {
    systemOverloadRate.add(1);
  } else {
    systemOverloadRate.add(0);
  }
  
  // 检测连接失败
  if (response.status === 0) {
    connectionFailures.add(1);
  }
}

// 并发连接压力测试
function stressTestConcurrentConnections() {
  // 短时间内发起多个请求
  const concurrentRequests = Math.floor(Math.random() * 5) + 3; // 3-8个并发请求
  
  const requests = [];
  
  for (let i = 0; i < concurrentRequests; i++) {
    const symbols = STRESS_SYMBOLS.slice(i * 10, (i + 1) * 10);
    
    const payload = {
      symbols: symbols,
      dataType: 'get-stock-quote',
    };
    
    // 模拟并发请求（k6中每个虚拟用户本身就是并发的）
    requests.push(
      http.post(
        `${BASE_URL}/api/v1/receiver/data`,
        JSON.stringify(payload),
        { headers }
      )
    );
    
    // 微小间隔
    sleep(0.01);
  }
  
  // 检查所有请求的结果
  let successCount = 0;
  
  requests.forEach((response, index) => {
    const success = check(response, {
      [`并发请求${index}状态合理`]: (r) => {
        return r.status === 200 || r.status === 429 || r.status === 503;
      },
      [`并发请求${index}响应时间<5秒`]: (r) => r.timings.duration < 5000,
    });
    
    if (success) {
      successCount++;
    }
    
    if (response.status === 0) {
      connectionFailures.add(1);
    }
  });
  
  // 检查整体成功率
  const overallSuccess = successCount / requests.length > 0.5;
  errorRate.add(overallSuccess ? 0 : 1);
}

// 资源耗尽压力测试
function stressTestResourceExhaustion() {
  // 创建大量数据输入
  const massiveSymbolList = Array.from({ length: 200 }, (_, i) => `MASSIVE${i}.HK`);
  
  const payload = {
    symbols: massiveSymbolList,
    dataType: 'get-stock-quote',
    options: {
      includeMetadata: true,
      includeDebugInfo: true,
      expandedResponse: true,
    },
  };
  
  const response = http.post(
    `${BASE_URL}/api/v1/receiver/data`,
    JSON.stringify(payload),
    { 
      headers,
      timeout: '30s',
    }
  );
  
  const success = check(response, {
    '资源耗尽测试系统存活': (r) => {
      return r.status !== 0; // 系统没有完全崩溃
    },
    '资源耗尽测试优雅降级': (r) => {
      // 系统应该优雅地处理资源不足，而不是崩溃
      return r.status === 200 || r.status === 413 || r.status === 429 || r.status === 503;
    },
    '资源耗尽测试响应时间可接受': (r) => r.timings.duration < 30000,
  });
  
  if (!success) {
    errorRate.add(1);
  } else {
    errorRate.add(0);
  }
  
  // 检测内存压力信号
  if (response.headers['X-Memory-Usage'] && parseInt(response.headers['X-Memory-Usage']) > 80) {
    memoryPressure.add(1);
  } else {
    memoryPressure.add(0);
  }
  
  if (response.status === 503 || response.status === 507) {
    systemOverloadRate.add(1);
  } else {
    systemOverloadRate.add(0);
  }
}

// 数据库负载压力测试
function stressTestDatabaseLoad() {
  // 复杂查询操作
  const complexQueryPayload = {
    queryType: 'advanced',
    filters: [
      {
        field: 'market',
        operator: 'in',
        value: ['HK', 'US', 'SZ', 'SH'],
      },
      {
        field: 'lastPrice',
        operator: 'between',
        value: [100, 1000],
      },
    ],
    sort: {
      field: 'volume',
      direction: 'desc',
    },
    limit: 100,
    offset: Math.floor(Math.random() * 1000),
  };
  
  const response = http.post(
    `${BASE_URL}/api/v1/query/execute`,
    JSON.stringify(complexQueryPayload),
    { headers }
  );
  
  const success = check(response, {
    '数据库负载测试状态合理': (r) => {
      return r.status === 200 || r.status === 429 || r.status === 503;
    },
    '数据库负载测试响应时间<10秒': (r) => r.timings.duration < 10000,
    '数据库负载测试返回数据': (r) => {
      if (r.status === 200) {
        try {
          const data = JSON.parse(r.body);
          return data.statusCode === 200;
        } catch (e) {
          return false;
        }
      }
      return true;
    },
  });
  
  if (!success) {
    errorRate.add(1);
  } else {
    errorRate.add(0);
  }
  
  // 检测数据库过载
  if (response.status === 503) {
    systemOverloadRate.add(1);
  } else {
    systemOverloadRate.add(0);
  }
}

// 测试总结
export function handleSummary(data) {
  const avgResponseTime = data.metrics.http_req_duration.avg;
  const p99ResponseTime = data.metrics['http_req_duration{p:99}'].value;
  const errorRate = data.metrics.http_req_failed.rate;
  const overloadRate = data.metrics.system_overload ? data.metrics.system_overload.rate : 0;
  const connectionFailures = data.metrics.connection_failures ? data.metrics.connection_failures.count : 0;
  
  return {
    'api-stress-test-summary.json': JSON.stringify(data, null, 2),
    stdout: `
=== API Stress Test Summary ===

核心指标:
- 总请求数: ${data.metrics.http_reqs.count}
- 平均响应时间: ${avgResponseTime.toFixed(2)}ms
- 99%响应时间: ${p99ResponseTime.toFixed(2)}ms
- 错误率: ${(errorRate * 100).toFixed(2)}%
- 系统过载率: ${(overloadRate * 100).toFixed(2)}%
- 连接失败次数: ${connectionFailures}

压力测试评估:
- 响应时间承受能力 (99% < 5秒): ${p99ResponseTime < 5000 ? '✅ 优秀' : p99ResponseTime < 10000 ? '⚠️ 可接受' : '❌ 需优化'}
- 错误率控制 (< 30%): ${errorRate < 0.3 ? '✅ 优秀' : errorRate < 0.5 ? '⚠️ 可接受' : '❌ 需优化'}
- 系统稳定性 (< 50% 过载): ${overloadRate < 0.5 ? '✅ 稳定' : '❌ 不稳定'}
- 连接可靠性: ${connectionFailures < 100 ? '✅ 可靠' : '❌ 需排查'}

性能等级: ${getPerformanceGrade(p99ResponseTime, errorRate, overloadRate)}

优化建议:
${getOptimizationSuggestions(p99ResponseTime, errorRate, overloadRate, connectionFailures)}
`,
  };
}

// 性能等级评定
function getPerformanceGrade(p99Time, errorRate, overloadRate) {
  if (p99Time < 2000 && errorRate < 0.1 && overloadRate < 0.2) {
    return '🎆 A级 - 优秀';
  } else if (p99Time < 5000 && errorRate < 0.3 && overloadRate < 0.5) {
    return '🟡 B级 - 良好';
  } else if (p99Time < 10000 && errorRate < 0.5) {
    return '🟠 C级 - 可接受';
  } else {
    return '🔴 D级 - 需优化';
  }
}

// 优化建议
function getOptimizationSuggestions(p99Time, errorRate, overloadRate, connectionFailures) {
  const suggestions = [];
  
  if (p99Time > 5000) {
    suggestions.push('- 考虑增加缓存层或优化数据库查询');
  }
  
  if (errorRate > 0.3) {
    suggestions.push('- 检查错误处理逻辑和异常捕获机制');
  }
  
  if (overloadRate > 0.3) {
    suggestions.push('- 实施更好的负载均衡和自动扩容');
  }
  
  if (connectionFailures > 50) {
    suggestions.push('- 检查网络配置和连接池设置');
  }
  
  if (suggestions.length === 0) {
    suggestions.push('- 系统表现良好，继续保持监控');
  }
  
  return suggestions.join('\n');
}

export function teardown(data) {
  console.log('API压力测试完成');
  console.log(`最大并发用户数: ${data ? data.maxVUs || 'N/A' : 'N/A'}`);
}
