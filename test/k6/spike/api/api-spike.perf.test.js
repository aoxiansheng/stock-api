import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Counter, Trend } from 'k6/metrics';

// 自定义指标
const errorRate = new Rate('errors');
const spikeRecoveryTime = new Trend('spike_recovery_time');
const systemStabilityRate = new Rate('system_stability');
const peakPerformanceRate = new Rate('peak_performance');
const circuitBreakerTriggers = new Counter('circuit_breaker_triggers');

// 峰值测试配置 - 模拟突发流量
export const options = {
  stages: [
    { duration: '1m', target: 10 },    // 基线
    { duration: '30s', target: 10 },   // 稳定基线
    { duration: '10s', target: 200 },  // 快速上升到峰值
    { duration: '30s', target: 200 },  // 保持峰值
    { duration: '10s', target: 500 },  // 第二次峰值
    { duration: '20s', target: 500 },  // 保持第二次峰值
    { duration: '10s', target: 50 },   // 快速下降
    { duration: '1m', target: 10 },    // 恢复基线
    { duration: '30s', target: 0 },    // 停止
  ],
  thresholds: {
    http_req_duration: ['p(95)<3000'], // 95%响应时间小于3秒
    http_req_failed: ['rate<0.2'],     // 错误率小于20%
    errors: ['rate<0.2'],
    system_stability: ['rate>0.7'],    // 系统稳定性大于70%
    peak_performance: ['rate>0.5'],    // 峰值性能大于50%
  },
};

// 测试数据
const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const API_KEY = __ENV.API_KEY || 'spike-test-app-key';
const ACCESS_TOKEN = __ENV.ACCESS_TOKEN || 'spike-test-access-token';

// 峰值测试场景
const SPIKE_SCENARIOS = {
  LIGHT_LOAD: ['700.HK', 'AAPL.US'],
  MEDIUM_LOAD: ['700.HK', 'AAPL.US', 'TSLA.US', 'GOOGL.US', '941.HK'],
  HEAVY_LOAD: Array.from({ length: 15 }, (_, i) => `SPIKE${i}.HK`),
  EXTREME_LOAD: Array.from({ length: 30 }, (_, i) => `EXTREME${i}.US`),
};

const headers = {
  'Content-Type': 'application/json',
  'X-App-Key': API_KEY,
  'X-Access-Token': ACCESS_TOKEN,
};

// 全局状态跟踪
let spikeStartTime = null;
let baselinePerformance = null;

export default function () {
  const currentVUs = __VU;
  const currentTime = Date.now();
  
  // 根据当前虚拟用户数判断峰值阶段
  const phase = detectSpikePhase(currentVUs);
  
  if (phase === 'SPIKE_START' && !spikeStartTime) {
    spikeStartTime = currentTime;
  }
  
  // 根据阶段选择测试策略
  switch (phase) {
    case 'BASELINE':
      testBaseline();
      break;
    case 'SPIKE_START':
    case 'SPIKE_PEAK':
      testSpikeLoad();
      break;
    case 'EXTREME_SPIKE':
      testExtremeLoad();
      break;
    case 'RECOVERY':
      testRecovery();
      break;
  }
  
  sleep(Math.random() * 0.5); // 变化的睡眠时间
}

// 检测峰值阶段
function detectSpikePhase(currentVUs) {
  if (currentVUs <= 20) {
    return 'BASELINE';
  } else if (currentVUs <= 200) {
    return 'SPIKE_START';
  } else if (currentVUs <= 300) {
    return 'SPIKE_PEAK';
  } else if (currentVUs <= 500) {
    return 'EXTREME_SPIKE';
  } else {
    return 'RECOVERY';
  }
}

// 基线性能测试
function testBaseline() {
  const symbols = SPIKE_SCENARIOS.LIGHT_LOAD;
  
  const payload = {
    symbols: symbols,
    dataType: 'get-stock-quote',
  };
  
  const startTime = Date.now();
  
  const response = http.post(
    `${BASE_URL}/api/v1/receiver/data`,
    JSON.stringify(payload),
    { headers }
  );
  
  const responseTime = Date.now() - startTime;
  
  // 记录基线性能
  if (!baselinePerformance && response.status === 200) {
    baselinePerformance = responseTime;
  }
  
  const success = check(response, {
    '基线测试状态码为200': (r) => r.status === 200,
    '基线测试响应时间<500ms': (r) => r.timings.duration < 500,
    '基线测试返回数据': (r) => {
      try {
        const data = JSON.parse(r.body);
        return data.statusCode === 200 && data.data;
      } catch (e) {
        return false;
      }
    },
  });
  
  errorRate.add(!success);
  systemStabilityRate.add(success);
}

// 峰值负载测试
function testSpikeLoad() {
  const symbols = SPIKE_SCENARIOS.MEDIUM_LOAD;
  
  const payload = {
    symbols: symbols,
    dataType: 'get-stock-quote',
    options: {
      priority: 'high', // 模拟高优先级请求
    },
  };
  
  const response = http.post(
    `${BASE_URL}/api/v1/receiver/data`,
    JSON.stringify(payload),
    { headers }
  );
  
  const success = check(response, {
    '峰值负载测试状态合理': (r) => {
      return r.status === 200 || r.status === 429 || r.status === 503;
    },
    '峰值负载测试响应时间<2秒': (r) => r.timings.duration < 2000,
    '峰值负载测试系统未崩溃': (r) => r.status !== 0,
  });
  
  errorRate.add(!success);
  
  // 评估峰值期间性能
  if (response.status === 200) {
    peakPerformanceRate.add(1);
    systemStabilityRate.add(1);
  } else if (response.status === 429 || response.status === 503) {
    // 限流是合理的保护机制
    peakPerformanceRate.add(0.5);
    systemStabilityRate.add(1);
    circuitBreakerTriggers.add(1);
  } else {
    peakPerformanceRate.add(0);
    systemStabilityRate.add(0);
  }
}

// 极限负载测试
function testExtremeLoad() {
  const symbols = SPIKE_SCENARIOS.HEAVY_LOAD;
  
  const payload = {
    symbols: symbols,
    dataType: 'get-stock-quote',
    options: {
      timeout: 5000,
      retries: 0,
    },
  };
  
  const response = http.post(
    `${BASE_URL}/api/v1/receiver/data`,
    JSON.stringify(payload),
    { 
      headers,
      timeout: '10s',
    }
  );
  
  const success = check(response, {
    '极限负载测试系统存活': (r) => r.status !== 0,
    '极限负载测试响应时间<10秒': (r) => r.timings.duration < 10000,
    '极限负载测试优雅降级': (r) => {
      // 系统应该优雅地处理极限负载
      return r.status === 200 || r.status === 429 || r.status === 503 || r.status === 413;
    },
  });
  
  errorRate.add(!success);
  
  // 极限情况下的系统稳定性
  if (response.status === 429 || response.status === 503) {
    systemStabilityRate.add(1); // 限流是好的
    circuitBreakerTriggers.add(1);
  } else if (response.status === 200) {
    systemStabilityRate.add(1);
    peakPerformanceRate.add(1);
  } else {
    systemStabilityRate.add(0);
    peakPerformanceRate.add(0);
  }
}

// 恢复阶段测试
function testRecovery() {
  const symbols = SPIKE_SCENARIOS.LIGHT_LOAD;
  
  const payload = {
    symbols: symbols,
    dataType: 'get-stock-quote',
  };
  
  const startTime = Date.now();
  
  const response = http.post(
    `${BASE_URL}/api/v1/receiver/data`,
    JSON.stringify(payload),
    { headers }
  );
  
  const responseTime = Date.now() - startTime;
  
  // 评估恢复情况
  if (baselinePerformance && spikeStartTime) {
    const recoveryFactor = responseTime / baselinePerformance;
    spikeRecoveryTime.add(responseTime);
    
    if (recoveryFactor < 2) {
      // 恢复到基线性能的2倍以内
      systemStabilityRate.add(1);
    } else {
      systemStabilityRate.add(0.5);
    }
  }
  
  const success = check(response, {
    '恢复阶段状态码为200': (r) => r.status === 200,
    '恢复阶段响应时间近似基线': (r) => {
      if (!baselinePerformance) return true;
      return r.timings.duration < baselinePerformance * 3; // 允耸3倍以内
    },
    '恢复阶段系统功能正常': (r) => {
      try {
        const data = JSON.parse(r.body);
        return data.statusCode === 200 && data.data;
      } catch (e) {
        return false;
      }
    },
  });
  
  errorRate.add(!success);
}

// 测试总结
export function handleSummary(data) {
  const avgResponseTime = data.metrics.http_req_duration.avg;
  const p95ResponseTime = data.metrics['http_req_duration{p:95}'].value;
  const errorRate = data.metrics.http_req_failed.rate;
  const stabilityRate = data.metrics.system_stability ? data.metrics.system_stability.rate : 0;
  const peakPerformanceRate = data.metrics.peak_performance ? data.metrics.peak_performance.rate : 0;
  const circuitBreakerCount = data.metrics.circuit_breaker_triggers ? data.metrics.circuit_breaker_triggers.count : 0;
  const avgRecoveryTime = data.metrics.spike_recovery_time ? data.metrics.spike_recovery_time.avg : 0;
  
  return {
    'api-spike-test-summary.json': JSON.stringify(data, null, 2),
    stdout: `
=== API Spike Test Summary ===

核心指标:
- 总请求数: ${data.metrics.http_reqs.count}
- 平均响应时间: ${avgResponseTime.toFixed(2)}ms
- 95%响应时间: ${p95ResponseTime.toFixed(2)}ms
- 错误率: ${(errorRate * 100).toFixed(2)}%
- 系统稳定性: ${(stabilityRate * 100).toFixed(2)}%
- 峰值性能: ${(peakPerformanceRate * 100).toFixed(2)}%
- 燔断器触发次数: ${circuitBreakerCount}
- 平均恢复时间: ${avgRecoveryTime.toFixed(2)}ms

峰值测试评估:
- 响应能力 (95% < 3秒): ${p95ResponseTime < 3000 ? '✅ 优秀' : p95ResponseTime < 5000 ? '⚠️ 可接受' : '❌ 需优化'}
- 稳定性 (> 70%): ${stabilityRate > 0.7 ? '✅ 稳定' : stabilityRate > 0.5 ? '⚠️ 一般' : '❌ 不稳定'}
- 峰值处理 (> 50%): ${peakPerformanceRate > 0.5 ? '✅ 良好' : peakPerformanceRate > 0.3 ? '⚠️ 一般' : '❌ 较差'}
- 保护机制: ${circuitBreakerCount > 0 ? '✅ 有效' : '⚠️ 未触发'}

峰值测试等级: ${getSpikeTestGrade(p95ResponseTime, stabilityRate, peakPerformanceRate)}

系统弹性评估:
${getResilienceAssessment(errorRate, stabilityRate, circuitBreakerCount, avgRecoveryTime)}
`,
  };
}

// 峰值测试等级评定
function getSpikeTestGrade(p95Time, stabilityRate, peakPerformanceRate) {
  if (p95Time < 2000 && stabilityRate > 0.8 && peakPerformanceRate > 0.6) {
    return '🎆 A级 - 弹性优秀';
  } else if (p95Time < 3000 && stabilityRate > 0.7 && peakPerformanceRate > 0.5) {
    return '🟡 B级 - 弹性良好';
  } else if (p95Time < 5000 && stabilityRate > 0.5) {
    return '🟠 C级 - 弹性一般';
  } else {
    return '🔴 D级 - 弹性不足';
  }
}

// 系统弹性评估
function getResilienceAssessment(errorRate, stabilityRate, circuitBreakerCount, avgRecoveryTime) {
  const assessments = [];
  
  // 错误处理能力
  if (errorRate < 0.2) {
    assessments.push('✅ 错误处理: 优秀 - 系统在峰值负载下保持低错误率');
  } else {
    assessments.push('❌ 错误处理: 需改进 - 错误率过高，建议优化错误处理逻辑');
  }
  
  // 系统稳定性
  if (stabilityRate > 0.7) {
    assessments.push('✅ 系统稳定性: 优秀 - 系统在流量波动中保持稳定');
  } else {
    assessments.push('❌ 系统稳定性: 需改进 - 建议加强负载均衡和自动扩容');
  }
  
  // 保护机制
  if (circuitBreakerCount > 0) {
    assessments.push('✅ 保护机制: 有效 - 限流和燔断机制正常工作');
  } else {
    assessments.push('⚠️ 保护机制: 未检测到 - 建议检查限流配置');
  }
  
  // 恢复能力
  if (avgRecoveryTime > 0 && avgRecoveryTime < 1000) {
    assessments.push('✅ 恢复能力: 优秀 - 系统快速恢复到正常状态');
  } else if (avgRecoveryTime > 0) {
    assessments.push('⚠️ 恢复能力: 一般 - 恢复时间较长，可优化缓存策略');
  } else {
    assessments.push('📋 恢复能力: 未测试 - 需要更长的测试周期评估');
  }
  
  return assessments.join('\n');
}

export function teardown(data) {
  console.log('API峰值测试完成');
  
  if (baselinePerformance) {
    console.log(`基线性能: ${baselinePerformance}ms`);
  }
  
  if (spikeStartTime) {
    const testDuration = Date.now() - spikeStartTime;
    console.log(`峰值测试总时长: ${(testDuration / 1000).toFixed(2)}秒`);
  }
}
