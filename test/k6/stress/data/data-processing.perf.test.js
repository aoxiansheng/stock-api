import http from 'k6/http';
import { check, sleep, group, fail } from 'k6';
import { Rate, Counter, Trend } from 'k6/metrics';
import { htmlReport } from 'https://raw.githubusercontent.com/benc-uk/k6-reporter/main/dist/bundle.js';
import { textSummary } from 'https://jslib.k6.io/k6-summary/0.0.1/index.js';

// 自定义指标
const dataProcessingLatency = new Trend('data_processing_latency');
const dataTransformErrors = new Counter('data_transform_errors');
const dataProcessingSuccess = new Rate('data_processing_success_rate');
const symbolMappingTime = new Trend('symbol_mapping_time');
const dataIngestionRate = new Rate('data_ingestion_success_rate');
const cacheHitRate = new Rate('cache_hit_rate');
const databaseWriteTime = new Trend('database_write_time');
const queryExecutionTime = new Trend('query_execution_time');

// 测试配置 - 数据流性能测试
export const options = {
  stages: [
    { duration: '2m', target: 20 },    // 预热阶段：逐渐增加到20个数据处理用户
    { duration: '5m', target: 50 },    // 标准负载：50个并发数据处理请求
    { duration: '10m', target: 100 },  // 高负载：100个并发数据流处理
    { duration: '5m', target: 150 },   // 峰值负载：150个并发数据处理
    { duration: '3m', target: 200 },   // 极限负载：200个并发数据流
    { duration: '5m', target: 100 },   // 负载回落：回到100个用户
    { duration: '2m', target: 0 },     // 冷却阶段：逐渐减少到0
  ],
  
  thresholds: {
    // 数据处理性能阈值
    data_processing_latency: ['p(95)<3000', 'p(99)<5000', 'avg<1500'], // 数据处理延迟
    http_req_duration: ['p(95)<4000', 'p(99)<8000'],                   // 整体响应时间
    http_req_failed: ['rate<0.05'],                                    // 失败率小于5%
    
    // 数据流成功率
    data_processing_success_rate: ['rate>0.9'],                       // 数据处理成功率90%以上
    data_ingestion_success_rate: ['rate>0.95'],                       // 数据摄取成功率95%以上
    
    // 组件性能
    symbol_mapping_time: ['p(95)<500', 'avg<200'],                    // 符号映射时间
    database_write_time: ['p(95)<1000', 'avg<400'],                   // 数据库写入时间
    query_execution_time: ['p(95)<2000', 'avg<800'],                  // 查询执行时间
    
    // 缓存性能
    cache_hit_rate: ['rate>0.6'],                                     // 缓存命中率60%以上
    
    // 错误控制
    data_transform_errors: ['count<100'],                             // 数据转换错误小于100
  },
};

// 测试配置
const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const API_VERSION = '/api/v1';

// 测试数据集
const STOCK_SYMBOLS = {
  HK: ['700.HK', '9988.HK', '0005.HK', '0001.HK', '2318.HK', '1299.HK', '0388.HK', '0939.HK', '1398.HK', '3690.HK'],
  US: ['AAPL.US', 'GOOGL.US', 'MSFT.US', 'AMZN.US', 'TSLA.US', 'META.US', 'NVDA.US', 'NFLX.US', 'CRM.US', 'ORCL.US'],
  SZ: ['000001.SZ', '000002.SZ', '300059.SZ', '300122.SZ', '000858.SZ', '002415.SZ', '300750.SZ', '000725.SZ'],
  SH: ['600519.SH', '600036.SH', '600276.SH', '600000.SH', '601318.SH', '600028.SH', '601166.SH', '600887.SH']
};

const CAPABILITY_TYPES = ['get-stock-quote', 'stock-basic-info', 'index-quote'];
const QUERY_TYPES = ['by_symbols', 'by_market', 'by_provider'];

// API Key和用户数据
let testApiKeys = [];
let adminToken = '';

// 生成随机股票组合
function getRandomSymbols(count = 5) {
  const allSymbols = [
    ...STOCK_SYMBOLS.HK,
    ...STOCK_SYMBOLS.US,
    ...STOCK_SYMBOLS.SZ,
    ...STOCK_SYMBOLS.SH
  ];
  
  const shuffled = allSymbols.sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

// 生成批量数据请求
function generateBatchDataRequest() {
  return {
    symbols: getRandomSymbols(Math.floor(Math.random() * 10) + 1),
    capabilityType: CAPABILITY_TYPES[Math.floor(Math.random() * CAPABILITY_TYPES.length)],
    options: {
      includeCache: Math.random() > 0.3, // 70%使用缓存
      validateSymbols: Math.random() > 0.5, // 50%验证符号
      timeout: 5000
    }
  };
}

// 生成复杂查询请求
function generateComplexQuery() {
  const queryType = QUERY_TYPES[Math.floor(Math.random() * QUERY_TYPES.length)];
  
  switch (queryType) {
    case 'by_symbols':
      return {
        queryType: 'by_symbols',
        symbols: getRandomSymbols(Math.floor(Math.random() * 8) + 2),
        options: {
          includeMetadata: true,
          format: 'detailed'
        }
      };
    case 'by_market':
      const markets = ['HK', 'US', 'SZ', 'SH'];
      return {
        queryType: 'by_market',
        market: markets[Math.floor(Math.random() * markets.length)],
        limit: Math.floor(Math.random() * 20) + 5,
        options: {
          includeIndexes: true
        }
      };
    case 'by_provider':
      return {
        queryType: 'by_provider',
        provider: 'longport',
        capabilityType: CAPABILITY_TYPES[Math.floor(Math.random() * CAPABILITY_TYPES.length)],
        symbols: getRandomSymbols(3)
      };
    default:
      return generateComplexQuery();
  }
}

// 设置阶段
export function setup() {
  console.log('🚀 开始数据流性能测试设置...');
  
  // 创建管理员用户
  const adminUser = {
    username: 'data_perf_admin',
    email: 'data_perf_admin@example.com',
    password: 'DataPerf123!',
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
    fail('管理员登录失败，无法继续数据流性能测试');
  }
  
  adminToken = JSON.parse(adminLoginResponse.body).data.accessToken;
  
  // 创建多个API Key用于数据流测试
  console.log('📝 创建数据流测试专用API Keys...');
  for (let i = 0; i < 10; i++) {
    const apiKeyData = {
      name: `数据流性能测试 API Key ${i}`,
      description: '数据流性能测试专用',
      permissions: ['data:read', 'query:execute', 'providers:read', 'transform:execute'],
      rateLimit: {
        requests: 5000,
        window: '1h'
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
    
    sleep(0.1);
  }
  
  console.log(`✅ 成功创建 ${testApiKeys.length} 个API Keys用于数据流测试`);
  
  return {
    adminToken,
    apiKeys: testApiKeys
  };
}

// 主测试函数
export default function(data) {
  // 随机选择测试类型
  const testType = Math.random();
  
  if (testType < 0.4) {
    dataIngestionWorkflow(data);
  } else if (testType < 0.7) {
    dataTransformationWorkflow(data);
  } else if (testType < 0.9) {
    complexQueryWorkflow(data);
  } else {
    endToEndDataFlow(data);
  }
  
  // 模拟数据处理间隔
  sleep(Math.random() * 2 + 0.5); // 0.5-2.5秒
}

// 数据摄取工作流测试
function dataIngestionWorkflow(data) {
  group('Data Ingestion Workflow', () => {
    const apiKey = data.apiKeys[Math.floor(Math.random() * data.apiKeys.length)];
    const request = generateBatchDataRequest();
    
    // 步骤1: 符号映射
    const symbolMappingStart = Date.now();
    const symbolMappingResponse = http.post(`${BASE_URL}${API_VERSION}/symbol-mapper/transform`, JSON.stringify({
      dataSourceName: 'longport',
      symbols: request.symbols
    }), {
      headers: {
        'Content-Type': 'application/json',
        'X-App-Key': apiKey.appKey,
        'X-Access-Token': apiKey.accessToken,
      },
    });
    
    const symbolMappingTime_ms = Date.now() - symbolMappingStart;
    symbolMappingTime.add(symbolMappingTime_ms);
    
    const symbolMappingSuccess = check(symbolMappingResponse, {
      'symbol mapping success': (r) => r.status === 200,
      'symbol mapping time < 1s': (r) => r.timings.duration < 1000,
    });
    
    if (!symbolMappingSuccess) {
      dataTransformErrors.add(1);
      dataIngestionRate.add(0);
      return;
    }
    
    // 步骤2: 数据接收
    const dataIngestionStart = Date.now();
    const dataResponse = http.post(`${BASE_URL}${API_VERSION}/receiver/data`, JSON.stringify(request), {
      headers: {
        'Content-Type': 'application/json',
        'X-App-Key': apiKey.appKey,
        'X-Access-Token': apiKey.accessToken,
      },
    });
    
    const ingestionLatency = Date.now() - dataIngestionStart;
    dataProcessingLatency.add(ingestionLatency);
    
    const ingestionSuccess = check(dataResponse, {
      'data ingestion success': (r) => r.status === 200,
      'data ingestion time < 5s': (r) => r.timings.duration < 5000,
      'data response has valid structure': (r) => {
        if (r.status === 200) {
          const body = JSON.parse(r.body);
          return body.statusCode === 200 && body.data !== null;
        }
        return false;
      },
    });
    
    if (ingestionSuccess) {
      dataIngestionRate.add(1);
      dataProcessingSuccess.add(1);
      
      // 检查缓存命中
      const cacheHeader = dataResponse.headers['x-cache-status'];
      if (cacheHeader === 'hit') {
        cacheHitRate.add(1);
      } else {
        cacheHitRate.add(0);
      }
    } else {
      dataIngestionRate.add(0);
      dataProcessingSuccess.add(0);
      if (dataResponse.status >= 500) {
        dataTransformErrors.add(1);
      }
    }
  });
}

// 数据转换工作流测试
function dataTransformationWorkflow(data) {
  group('Data Transformation Workflow', () => {
    // 模拟原始数据
    const rawData = {
      secu_quote: [
        {
          symbol: '700.HK',
          last_done: '503.000',
          open: '505.000',
          high: '510.000',
          low: '502.000',
          volume: '2547836',
          turnover: '1286789234.500'
        },
        {
          symbol: 'AAPL.US',
          last_done: '175.23',
          open: '174.50',
          high: '176.00',
          low: '173.80',
          volume: '45123456',
          turnover: '7912345678.90'
        }
      ]
    };
    
    // 数据转换测试
    const transformStart = Date.now();
    const transformResponse = http.post(`${BASE_URL}${API_VERSION}/transformer/transform`, JSON.stringify({
      provider: 'preset',
      capabilityType: 'get-stock-quote-fields',
      rawData: rawData
    }), {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${data.adminToken}`,
      },
    });
    
    const transformLatency = Date.now() - transformStart;
    dataProcessingLatency.add(transformLatency);
    
    const transformSuccess = check(transformResponse, {
      'data transformation success': (r) => r.status === 200,
      'transformation time < 2s': (r) => r.timings.duration < 2000,
      'transformed data valid': (r) => {
        if (r.status === 200) {
          const body = JSON.parse(r.body);
          return body.data && body.data.length > 0;
        }
        return false;
      },
    });
    
    if (transformSuccess) {
      dataProcessingSuccess.add(1);
    } else {
      dataProcessingSuccess.add(0);
      dataTransformErrors.add(1);
    }
    
    // 批量转换测试
    const batchTransformResponse = http.post(`${BASE_URL}${API_VERSION}/transformer/transform-batch`, JSON.stringify({
      transformations: [
        {
          provider: 'preset',
          capabilityType: 'get-stock-quote-fields',
          rawData: rawData
        },
        {
          provider: 'preset', 
          capabilityType: 'get-stock-quote-fields',
          rawData: {
            secu_quote: [
              {
                symbol: '9988.HK',
                last_done: '135.20',
                volume: '1234567'
              }
            ]
          }
        }
      ]
    }), {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${data.adminToken}`,
      },
    });
    
    check(batchTransformResponse, {
      'batch transformation success': (r) => r.status === 200,
      'batch transformation time < 3s': (r) => r.timings.duration < 3000,
    });
  });
}

// 复杂查询工作流测试
function complexQueryWorkflow(data) {
  group('Complex Query Workflow', () => {
    const apiKey = data.apiKeys[Math.floor(Math.random() * data.apiKeys.length)];
    const queryRequest = generateComplexQuery();
    
    // 执行复杂查询
    const queryStart = Date.now();
    const queryResponse = http.post(`${BASE_URL}${API_VERSION}/query/execute`, JSON.stringify(queryRequest), {
      headers: {
        'Content-Type': 'application/json',
        'X-App-Key': apiKey.appKey,
        'X-Access-Token': apiKey.accessToken,
      },
    });
    
    const queryLatency = Date.now() - queryStart;
    queryExecutionTime.add(queryLatency);
    
    const querySuccess = check(queryResponse, {
      'complex query success': (r) => r.status === 200,
      'query execution time < 4s': (r) => r.timings.duration < 4000,
      'query response has data': (r) => {
        if (r.status === 200) {
          const body = JSON.parse(r.body);
          return body.data !== null;
        }
        return false;
      },
    });
    
    if (querySuccess) {
      dataProcessingSuccess.add(1);
      
      // 检查查询性能指标
      const responseHeaders = queryResponse.headers;
      if (responseHeaders['x-query-cache'] === 'hit') {
        cacheHitRate.add(1);
      } else {
        cacheHitRate.add(0);
      }
      
      // 检查数据库操作时间
      if (responseHeaders['x-db-time']) {
        const dbTime = parseInt(responseHeaders['x-db-time']);
        databaseWriteTime.add(dbTime);
      }
    } else {
      dataProcessingSuccess.add(0);
      if (queryResponse.status >= 500) {
        dataTransformErrors.add(1);
      }
    }
  });
}

// 端到端数据流测试
function endToEndDataFlow(data) {
  group('End-to-End Data Flow', () => {
    const apiKey = data.apiKeys[Math.floor(Math.random() * data.apiKeys.length)];
    
    // 完整的数据流：接收 -> 处理 -> 查询 -> 存储
    const e2eStart = Date.now();
    
    // 1. 数据接收
    const symbols = getRandomSymbols(3);
    const dataRequest = {
      symbols: symbols,
      capabilityType: 'get-stock-quote',
      options: {
        includeCache: false, // 强制从源获取新数据
        storeInCache: true,
        validateSymbols: true
      }
    };
    
    const receiverResponse = http.post(`${BASE_URL}${API_VERSION}/receiver/data`, JSON.stringify(dataRequest), {
      headers: {
        'Content-Type': 'application/json',
        'X-App-Key': apiKey.appKey,
        'X-Access-Token': apiKey.accessToken,
      },
    });
    
    const step1Success = check(receiverResponse, {
      'e2e receiver success': (r) => r.status === 200,
    });
    
    if (!step1Success) {
      dataProcessingSuccess.add(0);
      return;
    }
    
    // 等待数据处理完成
    sleep(0.5);
    
    // 2. 查询刚刚处理的数据
    const queryRequest = {
      queryType: 'by_symbols',
      symbols: symbols,
      options: {
        includeMetadata: true,
        format: 'detailed'
      }
    };
    
    const queryResponse = http.post(`${BASE_URL}${API_VERSION}/query/execute`, JSON.stringify(queryRequest), {
      headers: {
        'Content-Type': 'application/json',
        'X-App-Key': apiKey.appKey,
        'X-Access-Token': apiKey.accessToken,
      },
    });
    
    const step2Success = check(queryResponse, {
      'e2e query success': (r) => r.status === 200,
      'e2e data consistency': (r) => {
        if (r.status === 200) {
          const body = JSON.parse(r.body);
          return body.data && symbols.every(symbol => 
            body.data.some(item => item.symbol === symbol)
          );
        }
        return false;
      },
    });
    
    const e2eLatency = Date.now() - e2eStart;
    dataProcessingLatency.add(e2eLatency);
    
    if (step1Success && step2Success) {
      dataProcessingSuccess.add(1);
      
      // 这应该是缓存命中
      if (queryResponse.headers['x-cache-status'] === 'hit') {
        cacheHitRate.add(1);
      } else {
        cacheHitRate.add(0);
      }
    } else {
      dataProcessingSuccess.add(0);
    }
    
    // 3. 性能监控检查
    const monitoringResponse = http.get(`${BASE_URL}${API_VERSION}/monitoring/metrics/performance`, {
      headers: {
        'Authorization': `Bearer ${data.adminToken}`,
      },
    });
    
    check(monitoringResponse, {
      'e2e monitoring available': (r) => r.status === 200,
    });
  });
}

// 高频数据流测试
export function highFrequencyDataFlow(data) {
  group('High Frequency Data Flow', () => {
    const apiKey = data.apiKeys[Math.floor(Math.random() * data.apiKeys.length)];
    
    // 快速连续数据请求
    const rapidRequests = Array(5).fill(0).map((_, i) => {
      const symbols = getRandomSymbols(2);
      return http.post(`${BASE_URL}${API_VERSION}/receiver/data`, JSON.stringify({
        symbols: symbols,
        capabilityType: 'get-stock-quote',
        options: { timeout: 3000 }
      }), {
        headers: {
          'Content-Type': 'application/json',
          'X-App-Key': apiKey.appKey,
          'X-Access-Token': apiKey.accessToken,
        },
      });
    });
    
    // 验证高频请求处理
    rapidRequests.forEach((response, index) => {
      check(response, {
        [`rapid request ${index} success`]: (r) => r.status < 400,
        [`rapid request ${index} time < 2s`]: (r) => r.timings.duration < 2000,
      });
    });
  });
}

// 清理阶段
export function teardown(data) {
  console.log('🧹 开始清理数据流性能测试数据...');
  
  console.log(`📊 数据流性能测试完成:
    - API Key数量: ${data.apiKeys.length}
    - 数据处理平均延迟: ${dataProcessingLatency.avg}ms
    - 符号映射平均时间: ${symbolMappingTime.avg}ms
    - 查询执行平均时间: ${queryExecutionTime.avg}ms
    - 数据转换错误数: ${dataTransformErrors.count}
    - 缓存命中率: ${(cacheHitRate.rate * 100).toFixed(2)}%`);
}

// 生成测试报告
export function handleSummary(data) {
  return {
    'data-processing-report.html': htmlReport(data),
    stdout: textSummary(data, { indent: ' ', enableColors: true }),
    'data-processing-summary.json': JSON.stringify(data),
  };
}