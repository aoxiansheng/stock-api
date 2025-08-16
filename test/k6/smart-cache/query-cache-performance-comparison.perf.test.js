import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// 自定义指标
export const errorRate = new Rate('errors');
export const cacheHitRate = new Rate('cache_hits');
export const cacheMissRate = new Rate('cache_misses');
export const queryResponseTime = new Trend('query_response_time');
export const receiverResponseTime = new Trend('receiver_response_time');

// 测试配置 - 专注于Query智能缓存性能对比
export const options = {
  stages: [
    { duration: '2m', target: 10 },  // 预热阶段，建立缓存
    { duration: '5m', target: 30 },  // 正常负载测试
    { duration: '3m', target: 50 },  // 高负载测试
    { duration: '2m', target: 10 },  // 冷却阶段
    { duration: '1m', target: 0 },   // 停止阶段
  ],
  thresholds: {
    http_req_duration: ['p(95)<3000'], // 95%响应时间小于3秒
    http_req_failed: ['rate<0.02'],    // 错误率小于2%
    errors: ['rate<0.02'],
    cache_hits: ['rate>0.6'],          // 缓存命中率大于60%
    query_response_time: ['p(95)<2000'], // Query响应时间95%小于2秒
    receiver_response_time: ['p(95)<1000'], // Receiver响应时间95%小于1秒
  },
};

// 测试数据
const API_BASE_URL = __ENV.API_BASE_URL || 'http://localhost:3000';
const TEST_APP_KEY = 'test-app-key-for-performance';
const TEST_ACCESS_TOKEN = 'test-access-token-for-performance';

// 测试股票池 - 用于缓存性能测试
const STOCK_POOLS = {
  popular: ['700.HK', '939.HK', '388.HK', 'AAPL.US', 'TSLA.US', 'MSFT.US'],
  emerging: ['9988.HK', '3690.HK', '2269.HK', 'NVDA.US', 'GOOGL.US', 'AMZN.US'],
  traditional: ['1398.HK', '3988.HK', '2318.HK', 'JPM.US', 'XOM.US', 'JNJ.US'],
  mixed: ['700.HK', 'AAPL.US', '000001.SZ', '600036.SH', '939.HK', 'TSLA.US']
};

let jwtToken = '';

export function setup() {
  console.log('🚀 Starting Query Smart Cache Performance Comparison Test');
  
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
    console.log('✅ Admin authentication successful');
  } else {
    console.log('❌ Admin authentication failed');
  }

  return { jwtToken };
}

export default function (data) {
  // 随机选择测试场景以模拟真实用户行为
  const scenario = Math.random();
  
  if (scenario < 0.3) {
    // 30% - 热门股票查询（高缓存命中率）
    testPopularStockQueries();
  } else if (scenario < 0.5) {
    // 20% - 混合市场查询（中等缓存命中率）
    testMixedMarketQueries();
  } else if (scenario < 0.7) {
    // 20% - 批量查询（测试批量缓存性能）
    testBatchQueryPerformance();
  } else if (scenario < 0.9) {
    // 20% - 新兴股票查询（低缓存命中率）
    testEmergingStockQueries();
  } else {
    // 10% - Query vs Receiver性能对比
    testQueryVsReceiverPerformance();
  }

  sleep(0.5 + Math.random() * 1.5); // 0.5-2秒随机间隔
}

// 测试热门股票查询 - 高缓存命中率场景
function testPopularStockQueries() {
  const symbols = getRandomSymbols(STOCK_POOLS.popular, 3);
  
  const queryPayload = {
    symbols: symbols,
    queryTypeFilter: 'get-stock-quote',
    options: {
      useCache: true,
      maxCacheAge: 300, // 5分钟缓存
      provider: 'longport'
    }
  };

  const startTime = Date.now();
  const response = executeQueryRequest(queryPayload);
  const responseTime = Date.now() - startTime;
  
  queryResponseTime.add(responseTime);

  const result = check(response, {
    'popular stocks query status is 200': (r) => r.status === 200,
    'popular stocks query response time < 2000ms': (r) => r.timings.duration < 2000,
    'popular stocks query returns expected data': (r) => {
      try {
        const data = JSON.parse(r.body);
        return data.statusCode === 200 && data.data && data.data.results.length === symbols.length;
      } catch {
        return false;
      }
    },
  });

  // 检查缓存命中情况
  checkCacheMetrics(response, 'popular_stocks');
  errorRate.add(!result);
}

// 测试混合市场查询 - 中等缓存命中率场景
function testMixedMarketQueries() {
  const symbols = getRandomSymbols(STOCK_POOLS.mixed, 4);
  
  const queryPayload = {
    symbols: symbols,
    queryTypeFilter: 'get-stock-quote',
    options: {
      useCache: true,
      maxCacheAge: 300
    }
  };

  const startTime = Date.now();
  const response = executeQueryRequest(queryPayload);
  const responseTime = Date.now() - startTime;
  
  queryResponseTime.add(responseTime);

  const result = check(response, {
    'mixed market query status is 200': (r) => r.status === 200,
    'mixed market query response time < 2500ms': (r) => r.timings.duration < 2500,
    'mixed market query handles multi-market': (r) => {
      try {
        const data = JSON.parse(r.body);
        return data.statusCode === 200 && data.data && data.data.results.length === symbols.length;
      } catch {
        return false;
      }
    },
  });

  checkCacheMetrics(response, 'mixed_market');
  errorRate.add(!result);
}

// 测试批量查询性能 - 智能缓存批量处理能力
function testBatchQueryPerformance() {
  // 混合热门和新股票，测试部分缓存命中
  const popularSymbols = getRandomSymbols(STOCK_POOLS.popular, 3);
  const emergingSymbols = getRandomSymbols(STOCK_POOLS.emerging, 2);
  const symbols = [...popularSymbols, ...emergingSymbols];
  
  const queryPayload = {
    symbols: symbols,
    queryTypeFilter: 'get-stock-quote',
    options: {
      useCache: true,
      maxCacheAge: 300,
      batchSize: 10 // 测试批量处理
    }
  };

  const startTime = Date.now();
  const response = executeQueryRequest(queryPayload);
  const responseTime = Date.now() - startTime;
  
  queryResponseTime.add(responseTime);

  const result = check(response, {
    'batch query status is 200': (r) => r.status === 200,
    'batch query response time < 3000ms': (r) => r.timings.duration < 3000,
    'batch query handles partial cache hits': (r) => {
      try {
        const data = JSON.parse(r.body);
        return data.statusCode === 200 && data.data && data.data.results.length === symbols.length;
      } catch {
        return false;
      }
    },
  });

  checkCacheMetrics(response, 'batch_query');
  errorRate.add(!result);
}

// 测试新兴股票查询 - 低缓存命中率场景
function testEmergingStockQueries() {
  const symbols = getRandomSymbols(STOCK_POOLS.emerging, 2);
  
  const queryPayload = {
    symbols: symbols,
    queryTypeFilter: 'get-stock-quote',
    options: {
      useCache: true,
      maxCacheAge: 300
    }
  };

  const startTime = Date.now();
  const response = executeQueryRequest(queryPayload);
  const responseTime = Date.now() - startTime;
  
  queryResponseTime.add(responseTime);

  const result = check(response, {
    'emerging stocks query status is 200': (r) => r.status === 200,
    'emerging stocks query response time < 4000ms': (r) => r.timings.duration < 4000,
    'emerging stocks query fresh data fetch': (r) => {
      try {
        const data = JSON.parse(r.body);
        return data.statusCode === 200 && data.data && data.data.results.length === symbols.length;
      } catch {
        return false;
      }
    },
  });

  checkCacheMetrics(response, 'emerging_stocks');
  errorRate.add(!result);
}

// 测试Query vs Receiver性能对比 - 两层缓存协作效果
function testQueryVsReceiverPerformance() {
  const symbol = getRandomSymbols(STOCK_POOLS.popular, 1)[0];
  
  // 先通过Query接口请求
  const queryPayload = {
    symbols: [symbol],
    queryTypeFilter: 'get-stock-quote',
    options: {
      useCache: true,
      maxCacheAge: 300
    }
  };

  const queryStartTime = Date.now();
  const queryResponse = executeQueryRequest(queryPayload);
  const queryResponseTime = Date.now() - queryStartTime;
  queryResponseTime.add(queryResponseTime);

  // 再通过Receiver接口请求同一股票
  const receiverPayload = {
    symbols: [symbol],
    receiverType: 'get-stock-quote',
    options: {
      preferredProvider: 'longport'
    }
  };

  const receiverStartTime = Date.now();
  const receiverResponse = executeReceiverRequest(receiverPayload);
  const receiverTime = Date.now() - receiverStartTime;
  receiverResponseTime.add(receiverTime);

  const result = check(queryResponse, {
    'query interface status is 200': (r) => r.status === 200,
    'query interface response time recorded': (r) => r.timings.duration > 0,
  }) && check(receiverResponse, {
    'receiver interface status is 200': (r) => r.status === 200,
    'receiver interface response time recorded': (r) => r.timings.duration > 0,
  });

  // 比较两个接口的性能差异
  if (queryResponse.status === 200 && receiverResponse.status === 200) {
    console.log(`Performance Comparison - Symbol: ${symbol}, Query: ${queryResponseTime}ms, Receiver: ${receiverTime}ms`);
  }

  checkCacheMetrics(queryResponse, 'query_vs_receiver');
  errorRate.add(!result);
}

// 执行Query请求
function executeQueryRequest(payload) {
  const params = {
    headers: {
      'Content-Type': 'application/json',
      'X-App-Key': TEST_APP_KEY,
      'X-Access-Token': TEST_ACCESS_TOKEN,
    },
    timeout: 10000, // 10秒超时
  };

  return http.post(
    `${API_BASE_URL}/api/v1/query/execute`,
    JSON.stringify(payload),
    params
  );
}

// 执行Receiver请求
function executeReceiverRequest(payload) {
  const params = {
    headers: {
      'Content-Type': 'application/json',
      'X-App-Key': TEST_APP_KEY,
      'X-Access-Token': TEST_ACCESS_TOKEN,
    },
    timeout: 10000, // 10秒超时
  };

  return http.post(
    `${API_BASE_URL}/api/v1/receiver/data`,
    JSON.stringify(payload),
    params
  );
}

// 检查缓存指标
function checkCacheMetrics(response, scenario) {
  try {
    const data = JSON.parse(response.body);
    
    // 检查响应头中的缓存信息
    const cacheStatus = response.headers['X-Cache-Status'];
    const cacheSource = response.headers['X-Cache-Source'];
    
    if (cacheStatus === 'HIT' || cacheSource === 'cache') {
      cacheHitRate.add(1);
      cacheMissRate.add(0);
    } else {
      cacheHitRate.add(0);
      cacheMissRate.add(1);
    }

    // 检查响应数据中的缓存信息
    if (data.metadata && data.metadata.cacheInfo) {
      const cacheInfo = data.metadata.cacheInfo;
      if (cacheInfo.hitCount > 0) {
        cacheHitRate.add(cacheInfo.hitCount / (cacheInfo.hitCount + cacheInfo.missCount));
      }
    }
  } catch (error) {
    // 缓存信息解析失败，记录为缓存未命中
    cacheMissRate.add(1);
  }
}

// 从股票池中随机选择股票
function getRandomSymbols(pool, count) {
  const shuffled = [...pool].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, Math.min(count, pool.length));
}

// 清理阶段 - 收集性能指标
export function teardown(data) {
  console.log('🏁 Query Smart Cache Performance Test Completed');
  
  if (data.jwtToken) {
    const params = {
      headers: {
        'Authorization': `Bearer ${data.jwtToken}`,
      },
    };

    // 获取系统性能指标
    const metricsResponse = http.get(
      `${API_BASE_URL}/api/v1/monitoring/metrics/performance`,
      params
    );

    if (metricsResponse.status === 200) {
      try {
        const metrics = JSON.parse(metricsResponse.body);
        console.log('📊 Performance Metrics Summary:');
        console.log(`   Cache Hit Rate: ${metrics.data.cache.hitRate || 'N/A'}`);
        console.log(`   Average Response Time: ${metrics.data.performance.averageResponseTime || 'N/A'}ms`);
        console.log(`   Request Count: ${metrics.data.performance.requestCount || 'N/A'}`);
        console.log(`   Error Rate: ${metrics.data.performance.errorRate || 'N/A'}`);
      } catch (error) {
        console.log('📊 Performance metrics collected but parsing failed');
      }
    }

    // 获取智能缓存编排器指标
    const cacheMetricsResponse = http.get(
      `${API_BASE_URL}/api/v1/monitoring/smart-cache/metrics`,
      params
    );

    if (cacheMetricsResponse.status === 200) {
      console.log('🧠 Smart Cache Orchestrator metrics collected successfully');
    }
  }

  console.log('✅ Performance comparison test teardown completed');
}