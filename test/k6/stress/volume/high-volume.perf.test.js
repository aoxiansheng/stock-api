import http from 'k6/http';
import { check, sleep, group, fail } from 'k6';
import { Rate, Counter, Trend } from 'k6/metrics';
import { htmlReport } from 'https://raw.githubusercontent.com/benc-uk/k6-reporter/main/dist/bundle.js';
import { textSummary } from 'https://jslib.k6.io/k6-summary/0.0.1/index.js';

// 自定义指标
const volumeProcessingLatency = new Trend('volume_processing_latency');
const volumeErrors = new Counter('volume_errors');
const volumeSuccessRate = new Rate('volume_success_rate');
const bulkRequestTime = new Trend('bulk_request_time');
const dataVolumeProcessed = new Counter('data_volume_processed');
const systemThroughput = new Trend('system_throughput');
const memoryCacheHitRate = new Rate('memory_cache_hit_rate');
const databaseConnectionPool = new Trend('db_connection_pool_usage');
const queueProcessingTime = new Trend('queue_processing_time');

// 测试配置 - 高容量数据处理测试
export const options = {
  stages: [
    { duration: '3m', target: 30 },    // 预热阶段：30个用户
    { duration: '5m', target: 60 },    // 中等容量：60个用户
    { duration: '10m', target: 120 },  // 高容量：120个用户
    { duration: '5m', target: 200 },   // 极高容量：200个用户
    { duration: '10m', target: 300 },  // 💥 超高容量：300个用户
    { duration: '5m', target: 400 },   // 💥 极限容量：400个用户
    { duration: '5m', target: 200 },   // 负载回落：200个用户
    { duration: '3m', target: 0 },     // 冷却阶段：回到0
  ],
  
  thresholds: {
    // 高容量处理性能阈值
    volume_processing_latency: ['p(95)<8000', 'p(99)<15000', 'avg<4000'], // 高容量处理延迟
    http_req_duration: ['p(95)<10000', 'p(99)<20000'],                     // 整体响应时间
    http_req_failed: ['rate<0.1'],                                         // 失败率控制在10%以内
    
    // 容量处理成功率
    volume_success_rate: ['rate>0.85'],                                   // 高容量处理成功率85%以上
    
    // 批量处理性能
    bulk_request_time: ['p(95)<12000', 'avg<6000'],                       // 批量请求处理时间
    system_throughput: ['p(95)<5000'],                                    // 系统吞吐量延迟
    
    // 系统资源利用
    memory_cache_hit_rate: ['rate>0.4'],                                  // 内存缓存命中率40%以上
    db_connection_pool_usage: ['p(95)<80'],                               // 数据库连接池使用率
    queue_processing_time: ['p(95)<3000', 'avg<1500'],                    // 队列处理时间
    
    // 错误控制
    volume_errors: ['count<500'],                                         // 容量错误数控制在500以内
    data_volume_processed: ['count>1000'],                               // 处理的数据量计数
  },
};

// 测试配置
const BASE_URL = _ENV.BASE_URL || 'http://localhost:3000';
const API_VERSION = '/api/v1';

// 大数据集定义
const LARGE_SYMBOL_SETS = {
  HK_LARGE: [
    '0700.HK', '9988.HK', '0005.HK', '0001.HK', '2318.HK', '1299.HK', '0388.HK', '0939.HK', 
    '1398.HK', '3690.HK', '0883.HK', '1024.HK', '1810.HK', '2020.HK', '0175.HK', '0968.HK',
    '2382.HK', '1093.HK', '0002.HK', '0003.HK', '0004.HK', '0006.HK', '0008.HK', '0011.HK',
    '0012.HK', '0016.HK', '0017.HK', '0019.HK', '0023.HK', '0027.HK', '0066.HK', '0101.HK'
  ],
  US_LARGE: [
    'AAPL.US', 'GOOGL.US', 'MSFT.US', 'AMZN.US', 'TSLA.US', 'META.US', 'NVDA.US', 'NFLX.US',
    'CRM.US', 'ORCL.US', 'IBM.US', 'INTC.US', 'AMD.US', 'QCOM.US', 'TXN.US', 'AVGO.US',
    'CSCO.US', 'ADBE.US', 'NOW.US', 'SNOW.US', 'UBER.US', 'ABNB.US', 'DOCU.US', 'ZM.US',
    'SHOP.US', 'SQ.US', 'PYPL.US', 'SPOT.US', 'TWTR.US', 'SNAP.US', 'PINS.US', 'RBLX.US'
  ],
  CN_LARGE: [
    '000001.SZ', '000002.SZ', '000858.SZ', '002415.SZ', '300059.SZ', '300122.SZ', '300750.SZ',
    '600519.SH', '600036.SH', '600276.SH', '600000.SH', '601318.SH', '600028.SH', '601166.SH',
    '600887.SH', '000725.SZ', '002027.SZ', '002594.SZ', '300014.SZ', '300015.SZ', '300017.SZ',
    '600519.SH', '600036.SH', '600000.SH', '601398.SH', '601939.SH', '601288.SH', '600036.SH',
    '600519.SH', '000858.SZ', '002415.SZ', '300059.SZ', '000001.SZ', '000002.SZ', '002027.SZ'
  ]
};

// 生成大批量数据请求
function generateVolumeDataRequest(size = 'large') {
  const sizeConfig = {
    small: { min: 5, max: 10 },
    medium: { min: 10, max: 20 },
    large: { min: 20, max: 50 },
    xlarge: { min: 50, max: 100 }
  };
  
  const config = sizeConfig[size] || sizeConfig.large;
  const symbolCount = Math.floor(Math.random() * (config.max - config.min + 1)) + config.min;
  
  // 从所有大数据集中随机选择符号
  const allSymbols = [
    ...LARGE_SYMBOL_SETS.HK_LARGE,
    ...LARGE_SYMBOL_SETS.US_LARGE,
    ...LARGE_SYMBOL_SETS.CN_LARGE
  ];
  
  const shuffled = allSymbols.sort(() => 0.5 - Math.random());
  const selectedSymbols = shuffled.slice(0, symbolCount);
  
  return {
    symbols: selectedSymbols,
    receiverType: 'get-stock-quote',
    options: {
      bulkMode: true,
      batchSize: Math.min(symbolCount, 25),
      timeout: 15000,
      enableCompression: true,
      cacheStrategy: 'write-through'
    }
  };
}

// 生成超大批量查询
function generateMegaQuery(complexity = 'high') {
  const complexityConfig = {
    low: { symbols: 30, options: 2 },
    medium: { symbols: 60, options: 4 },
    high: { symbols: 100, options: 6 },
    extreme: { symbols: 200, options: 8 }
  };
  
  const config = complexityConfig[complexity] || complexityConfig.high;
  
  const allSymbols = [
    ...LARGE_SYMBOL_SETS.HK_LARGE,
    ...LARGE_SYMBOL_SETS.US_LARGE,
    ...LARGE_SYMBOL_SETS.CN_LARGE
  ];
  
  const shuffled = allSymbols.sort(() => 0.5 - Math.random());
  const selectedSymbols = shuffled.slice(0, config.symbols);
  
  return {
    queryType: 'by_symbols',
    symbols: selectedSymbols,
    options: {
      includeMetadata: true,
      includeHistorical: complexity === 'extreme',
      format: 'detailed',
      aggregation: complexity === 'high' || complexity === 'extreme' ? 'summary' : 'basic',
      parallelism: Math.min(config.options, 8),
      cacheLevel: 'L2'
    }
  };
}

// API Key和用户数据
let testApiKeys = [];
let adminToken = '';

// 设置阶段
export function setup() {
  console.log('🚀 开始高容量数据处理测试设置...');
  
  // 创建管理员用户
  const adminUser = {
    username: 'volume_admin',
    email: 'volume_admin@example.com',
    password: 'VolumeTest123!',
    role: 'admin'
  };
  
  // 注册管理员
  const adminRegisterResponse = http.post(`${BASE_URL}${API_VERSION}/auth/register`, JSON.stringify(adminUser), {
    headers: { 'Content-Type': 'application/json' },
  });
  
  if (adminRegisterResponse.status !== 201) {
    console.warn('⚠️ 管理员用户可能已存在');
  }
  
  // 管理员登录
  const adminLoginResponse = http.post(`${BASE_URL}${API_VERSION}/auth/login`, JSON.stringify({
    username: adminUser.username,
    password: adminUser.password
  }), {
    headers: { 'Content-Type': 'application/json' },
  });
  
  if (adminLoginResponse.status !== 200) {
    fail('管理员登录失败，无法继续高容量测试');
  }
  
  adminToken = JSON.parse(adminLoginResponse.body).data.accessToken;
  
  // 创建多个高容量API Key
  console.log('📝 创建高容量测试专用API Keys...');
  for (let i = 0; i < 20; i++) {
    const apiKeyData = {
      name: `高容量测试 API Key ${i}`,
      description: '高容量数据处理测试专用',
      permissions: ['data:read', 'query:execute', 'providers:read', 'transform:execute', 'bulk:process'],
      rateLimit: {
        requests: 10000,
        window: '1h',
        burstLimit: 200
      }
    };
    
    const apiKeyResponse = http.post(`${BASE_URL}${API_VERSION}/auth/api-keys`, JSON.stringify(apiKeyData), {
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
    });
    
    if (apiKeyResponse.status === 201) {
      const apiKeyInfo = JSON.parse(apiKeyResponse.body).data;
      testApiKeys.push({
        appKey: apiKeyInfo.appKey,
        accessToken: apiKeyInfo.accessToken
      });
    }
    
    sleep(0.05); // 快速创建
  }
  
  console.log(`✅ 成功创建 ${testApiKeys.length} 个高容量API Keys`);
  console.log('🎯 高容量数据处理测试准备完成...');
  
  return {
    adminToken,
    apiKeys: testApiKeys
  };
}

// 主测试函数
export default function(data) {
  // 根据当前虚拟用户数量选择测试强度
  const currentVUs = _VU;
  let testIntensity = 'medium';
  
  if (currentVUs > 300) {
    testIntensity = 'extreme';
  } else if (currentVUs > 200) {
    testIntensity = 'high';
  } else if (currentVUs > 120) {
    testIntensity = 'medium';
  } else {
    testIntensity = 'low';
  }
  
  // 随机选择测试类型
  const testType = Math.random();
  
  if (testType < 0.3) {
    bulkDataProcessing(data, testIntensity);
  } else if (testType < 0.6) {
    megaQueryProcessing(data, testIntensity);
  } else if (testType < 0.8) {
    concurrentVolumeLoad(data, testIntensity);
  } else {
    systemStressValidation(data, testIntensity);
  }
  
  // 根据测试强度调整等待时间
  const sleepConfig = {
    low: Math.random() * 2 + 1,      // 1-3秒
    medium: Math.random() * 1.5 + 0.5, // 0.5-2秒
    high: Math.random() * 1 + 0.5,    // 0.5-1.5秒
    extreme: Math.random() * 0.5 + 0.2 // 0.2-0.7秒
  };
  
  sleep(sleepConfig[testIntensity]);
}

// 批量数据处理测试
function bulkDataProcessing(data, intensity) {
  group('Bulk Data Processing', () => {
    const apiKey = data.apiKeys[Math.floor(Math.random() * data.apiKeys.length)];
    
    // 根据强度选择数据规模
    const volumeSize = {
      low: 'small',
      medium: 'medium', 
      high: 'large',
      extreme: 'xlarge'
    }[intensity];
    
    const volumeRequest = generateVolumeDataRequest(volumeSize);
    dataVolumeProcessed.add(volumeRequest.symbols.length);
    
    // 执行批量数据处理
    const bulkStart = Date.now();
    const bulkResponse = http.post(`${BASE_URL}${API_VERSION}/receiver/data`, JSON.stringify(volumeRequest), {
      headers: {
        'Content-Type': 'application/json',
        'X-App-Key': apiKey.appKey,
        'X-Access-Token': apiKey.accessToken,
      },
    });
    
    const bulkLatency = Date.now() - bulkStart;
    volumeProcessingLatency.add(bulkLatency);
    bulkRequestTime.add(bulkLatency);
    
    const bulkSuccess = check(bulkResponse, {
      'bulk processing success': (r) => r.status === 200,
      'bulk processing time reasonable': (r) => r.timings.duration < (intensity === 'extreme' ? 20000 : 15000),
      'bulk response has data': (r) => {
        if (r.status === 200) {
          const body = JSON.parse(r.body);
          return body.statusCode === 200 && body.data;
        }
        return false;
      },
    });
    
    if (bulkSuccess) {
      volumeSuccessRate.add(1);
      
      // 检查缓存性能
      const cacheStatus = bulkResponse.headers['x-cache-status'];
      if (cacheStatus === 'hit' || cacheStatus === 'partial-hit') {
        memoryCacheHitRate.add(1);
      } else {
        memoryCacheHitRate.add(0);
      }
      
      // 记录系统吞吐量
      const throughputHeader = bulkResponse.headers['x-throughput-time'];
      if (throughputHeader) {
        systemThroughput.add(parseInt(throughputHeader));
      }
    } else {
      volumeSuccessRate.add(0);
      volumeErrors.add(1);
    }
  });
}

// 超大查询处理测试
function megaQueryProcessing(data, intensity) {
  group('Mega Query Processing', () => {
    const apiKey = data.apiKeys[Math.floor(Math.random() * data.apiKeys.length)];
    
    const complexityLevel = {
      low: 'low',
      medium: 'medium',
      high: 'high', 
      extreme: 'extreme'
    }[intensity];
    
    const megaQuery = generateMegaQuery(complexityLevel);
    dataVolumeProcessed.add(megaQuery.symbols.length);
    
    // 执行超大查询
    const queryStart = Date.now();
    const queryResponse = http.post(`${BASE_URL}${API_VERSION}/query/execute`, JSON.stringify(megaQuery), {
      headers: {
        'Content-Type': 'application/json',
        'X-App-Key': apiKey.appKey,
        'X-Access-Token': apiKey.accessToken,
      },
    });
    
    const queryLatency = Date.now() - queryStart;
    volumeProcessingLatency.add(queryLatency);
    
    const querySuccess = check(queryResponse, {
      'mega query success': (r) => r.status === 200,
      'mega query time acceptable': (r) => r.timings.duration < (intensity === 'extreme' ? 25000 : 20000),
      'mega query response valid': (r) => {
        if (r.status === 200) {
          const body = JSON.parse(r.body);
          return body.data !== null;
        }
        return false;
      },
    });
    
    if (querySuccess) {
      volumeSuccessRate.add(1);
      
      // 检查队列处理时间
      const queueTimeHeader = queryResponse.headers['x-queue-time'];
      if (queueTimeHeader) {
        queueProcessingTime.add(parseInt(queueTimeHeader));
      }
      
      // 检查数据库连接池使用率
      const dbPoolHeader = queryResponse.headers['x-db-pool-usage'];
      if (dbPoolHeader) {
        databaseConnectionPool.add(parseInt(dbPoolHeader));
      }
    } else {
      volumeSuccessRate.add(0);
      volumeErrors.add(1);
    }
  });
}

// 并发容量负载测试
function concurrentVolumeLoad(data, intensity) {
  group('Concurrent Volume Load', () => {
    const apiKey = data.apiKeys[Math.floor(Math.random() * data.apiKeys.length)];
    
    // 根据强度调整并发数
    const concurrencyLevel = {
      low: 2,
      medium: 3,
      high: 5,
      extreme: 8
    }[intensity];
    
    // 并发执行多个中等规模请求
    const concurrentRequests = Array(concurrencyLevel).fill(0).map((_, i) => {
      const request = generateVolumeDataRequest('medium');
      dataVolumeProcessed.add(request.symbols.length);
      
      return http.post(`${BASE_URL}${API_VERSION}/receiver/data`, JSON.stringify(request), {
        headers: {
          'Content-Type': 'application/json',
          'X-App-Key': apiKey.appKey,
          'X-Access-Token': apiKey.accessToken,
        },
      });
    });
    
    // 验证并发请求结果
    let successCount = 0;
    concurrentRequests.forEach((response, index) => {
      const success = check(response, {
        [`concurrent request ${index} success`]: (r) => r.status === 200,
        [`concurrent request ${index} time ok`]: (r) => r.timings.duration < 10000,
      });
      
      if (success) {
        successCount++;
      } else {
        volumeErrors.add(1);
      }
    });
    
    volumeSuccessRate.add(successCount / concurrentRequests.length);
  });
}

// 系统压力验证测试
function systemStressValidation(data, intensity) {
  group('System Stress Validation', () => {
    // 检查系统健康状况
    const healthResponse = http.get(`${BASE_URL}${API_VERSION}/monitoring/health`, {
      headers: {
        'Authorization': `Bearer ${data.adminToken}`,
      },
    });
    
    const healthCheck = check(healthResponse, {
      'system health check success': (r) => r.status === 200,
      'system health response time < 2s': (r) => r.timings.duration < 2000,
    });
    
    if (!healthCheck) {
      volumeErrors.add(1);
      return;
    }
    
    // 获取性能指标
    const metricsResponse = http.get(`${BASE_URL}${API_VERSION}/monitoring/metrics/performance`, {
      headers: {
        'Authorization': `Bearer ${data.adminToken}`,
      },
    });
    
    const metricsCheck = check(metricsResponse, {
      'performance metrics available': (r) => r.status === 200,
      'metrics response time < 3s': (r) => r.timings.duration < 3000,
    });
    
    if (metricsCheck && metricsResponse.status === 200) {
      const metrics = JSON.parse(metricsResponse.body).data;
      
      // 验证系统仍在正常参数范围内
      if (metrics.summary) {
        const checks = check(metrics.summary, {
          'system load acceptable': (m) => !m.systemLoad || m.systemLoad.cpu < 90,
          'error rate acceptable': (m) => !m.errorRate || m.errorRate < 15,
          'response time acceptable': (m) => !m.averageResponseTime || m.averageResponseTime < 5000,
        });
        
        if (checks) {
          volumeSuccessRate.add(1);
        } else {
          volumeSuccessRate.add(0);
          volumeErrors.add(1);
        }
      }
    }
  });
}

// 极限容量测试
export function extremeVolumeStress(data) {
  group('Extreme Volume Stress', () => {
    const apiKey = data.apiKeys[Math.floor(Math.random() * data.apiKeys.length)];
    
    // 极限容量：处理500+符号的超大请求
    const extremeRequest = {
      symbols: [
        ...LARGE_SYMBOL_SETS.HK_LARGE,
        ...LARGE_SYMBOL_SETS.US_LARGE,
        ...LARGE_SYMBOL_SETS.CN_LARGE,
        ...LARGE_SYMBOL_SETS.HK_LARGE.slice(0, 15), // 重复一些以达到500+
        ...LARGE_SYMBOL_SETS.US_LARGE.slice(0, 15)
      ].slice(0, 500), // 限制在500个符号
      receiverType: 'get-stock-quote',
      options: {
        bulkMode: true,
        batchSize: 50,
        timeout: 30000,
        enableCompression: true,
        cacheStrategy: 'write-through',
        parallelism: 10
      }
    };
    
    dataVolumeProcessed.add(extremeRequest.symbols.length);
    
    const extremeStart = Date.now();
    const extremeResponse = http.post(`${BASE_URL}${API_VERSION}/receiver/data`, JSON.stringify(extremeRequest), {
      headers: {
        'Content-Type': 'application/json',
        'X-App-Key': apiKey.appKey,
        'X-Access-Token': apiKey.accessToken,
      },
    });
    
    const extremeLatency = Date.now() - extremeStart;
    volumeProcessingLatency.add(extremeLatency);
    
    const extremeSuccess = check(extremeResponse, {
      'extreme volume processed': (r) => r.status === 200 || r.status === 202, // Accept async processing
      'extreme volume time reasonable': (r) => r.timings.duration < 30000,
    });
    
    if (extremeSuccess) {
      volumeSuccessRate.add(1);
    } else {
      volumeSuccessRate.add(0);
      volumeErrors.add(1);
    }
  });
}

// 清理阶段
export function teardown(data) {
  console.log('🧹 开始清理高容量测试数据...');
  
  console.log(`📊 高容量数据处理测试完成:
    - API Key数量: ${data.apiKeys.length}
    - 处理数据总量: ${dataVolumeProcessed.count} 个符号
    - 平均处理延迟: ${volumeProcessingLatency.avg}ms
    - 批量请求平均时间: ${bulkRequestTime.avg}ms
    - 系统吞吐量平均: ${systemThroughput.avg}ms
    - 容量错误总数: ${volumeErrors.count}
    - 内存缓存命中率: ${(memoryCacheHitRate.rate * 100).toFixed(2)}%
    - 队列处理平均时间: ${queueProcessingTime.avg}ms
    - 数据库连接池平均使用率: ${databaseConnectionPool.avg}%`);
}

// 生成测试报告
export function handleSummary(data) {
  return {
    'high-volume-report.html': htmlReport(data),
    stdout: textSummary(data, { indent: ' ', enableColors: true }),
    'high-volume-summary.json': JSON.stringify(data),
  };
}