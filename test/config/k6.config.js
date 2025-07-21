/**
 * K6 性能测试配置
 */

// 基础配置选项
export const BASE_OPTIONS = {
  // 基础阈值设置
  thresholds: {
    http_req_duration: ['p(95)<1000'], // 95%请求响应时间小于1秒
    http_req_failed: ['rate<0.1'],     // 错误率小于10%
  },
  
  // 基础场景配置
  scenarios: {
    smoke_test: {
      executor: 'constant-vus',
      vus: 1,
      duration: '30s',
    }
  }
};

// 负载测试配置
export const LOAD_TEST_OPTIONS = {
  stages: [
    { duration: '2m', target: 10 },  // 启动阶段
    { duration: '5m', target: 10 },  // 稳定负载
    { duration: '2m', target: 0 },   // 降压阶段
  ],
  thresholds: {
    http_req_duration: ['p(95)<1000'],
    http_req_failed: ['rate<0.05'],
    http_reqs: ['rate>10'], // 每秒至少10个请求
  },
};

// 压力测试配置
export const STRESS_TEST_OPTIONS = {
  stages: [
    { duration: '1m', target: 10 },  // 启动
    { duration: '2m', target: 50 },  // 压力增加
    { duration: '2m', target: 100 }, // 高压力
    { duration: '1m', target: 0 },   // 降压
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000'],
    http_req_failed: ['rate<0.2'],
  },
};

// 峰值测试配置
export const SPIKE_TEST_OPTIONS = {
  stages: [
    { duration: '30s', target: 10 },  // 正常负载
    { duration: '1m', target: 200 },  // 突然峰值
    { duration: '30s', target: 10 },  // 回到正常
  ],
  thresholds: {
    http_req_duration: ['p(95)<3000'],
    http_req_failed: ['rate<0.3'],
  },
};

// 容量测试配置
export const VOLUME_TEST_OPTIONS = {
  stages: [
    { duration: '5m', target: 20 },   // 逐步增加
    { duration: '10m', target: 50 },  // 持续负载
    { duration: '5m', target: 0 },    // 降压
  ],
  thresholds: {
    http_req_duration: ['p(95)<1500'],
    http_req_failed: ['rate<0.1'],
  },
};

// 测试环境配置
export const TEST_ENVIRONMENTS = {
  local: {
    baseUrl: 'http://localhost:3001',
    apiKey: 'test-app-key-for-performance',
    accessToken: 'test-access-token-for-performance',
  },
  staging: {
    baseUrl: 'https://staging-api.example.com',
    apiKey: __ENV.STAGING_API_KEY,
    accessToken: __ENV.STAGING_ACCESS_TOKEN,
  },
  production: {
    baseUrl: 'https://api.example.com',
    apiKey: __ENV.PROD_API_KEY,
    accessToken: __ENV.PROD_ACCESS_TOKEN,
  }
};

// 测试数据配置
export const TEST_DATA = {
  symbols: {
    hk: ['700.HK', '0005.HK', '0941.HK', '1299.HK'],
    us: ['AAPL.US', 'GOOGL.US', 'MSFT.US', 'TSLA.US'],
    cn_sz: ['000001.SZ', '000002.SZ', '300001.SZ'],
    cn_sh: ['600036.SH', '600519.SH', '601318.SH']
  },
  
  dataTypes: ['stock-quote', 'stock-basic-info', 'index-quote'],
  
  providers: ['longport', 'futu', 'twelvedata']
};

// 性能监控配置
export const MONITORING_CONFIG = {
  // 自定义指标
  customMetrics: {
    api_errors: 'Rate',
    auth_failures: 'Rate',
    data_quality_issues: 'Rate',
    provider_timeouts: 'Rate'
  },
  
  // 报警阈值
  alertThresholds: {
    error_rate: 0.05,
    response_time_p95: 2000,
    auth_failure_rate: 0.02,
    provider_timeout_rate: 0.1
  }
};

// 测试场景配置
export const TEST_SCENARIOS = {
  // 认证相关测试
  auth_scenarios: {
    login_load: {
      weight: 10,
      exec: 'testLogin'
    },
    api_key_validation: {
      weight: 30,
      exec: 'testApiKeyAuth'
    },
    rate_limiting: {
      weight: 20,
      exec: 'testRateLimit'
    }
  },
  
  // 数据流相关测试
  data_scenarios: {
    single_symbol_request: {
      weight: 40,
      exec: 'testSingleSymbol'
    },
    bulk_symbol_request: {
      weight: 30,
      exec: 'testBulkSymbols'
    },
    cross_market_request: {
      weight: 20,
      exec: 'testCrossMarket'
    },
    provider_failover: {
      weight: 10,
      exec: 'testProviderFailover'
    }
  }
};

// 报告配置
export const REPORTING_CONFIG = {
  outputs: {
    json: 'test-results/k6-results.json',
    html: 'test-results/k6-report.html',
    csv: 'test-results/k6-summary.csv'
  },
  
  summaryTrendStats: ['avg', 'min', 'med', 'max', 'p(95)', 'p(99)', 'count'],
  
  tags: {
    test_type: 'performance',
    environment: __ENV.TEST_ENV || 'local',
    version: __ENV.APP_VERSION || 'dev'
  }
};

// 辅助函数
export function getOptionsForTestType(testType) {
  switch (testType) {
    case 'load':
      return LOAD_TEST_OPTIONS;
    case 'stress':
      return STRESS_TEST_OPTIONS;
    case 'spike':
      return SPIKE_TEST_OPTIONS;
    case 'volume':
      return VOLUME_TEST_OPTIONS;
    default:
      return BASE_OPTIONS;
  }
}

export function getEnvironmentConfig(env = 'local') {
  return TEST_ENVIRONMENTS[env] || TEST_ENVIRONMENTS.local;
}

export function getRandomSymbols(market, count = 1) {
  const symbols = TEST_DATA.symbols[market] || TEST_DATA.symbols.hk;
  const shuffled = symbols.sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

export function getRandomDataType() {
  const types = TEST_DATA.dataTypes;
  return types[Math.floor(Math.random() * types.length)];
}