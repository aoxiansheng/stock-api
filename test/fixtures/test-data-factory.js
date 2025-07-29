/**
 * 测试数据工厂 - 为各种测试场景生成标准化测试数据
 * Test Data Factory - Generate standardized test data for various testing scenarios
 */

// 基础数据生成器
export class TestDataFactory {
  
  // 股票符号数据集
  static STOCK_SYMBOLS = {
    HK: {
      large_cap: ['0700.HK', '9988.HK', '0005.HK', '0001.HK', '2318.HK', '1299.HK'],
      mid_cap: ['0388.HK', '0939.HK', '1398.HK', '3690.HK', '0883.HK', '1024.HK'],
      small_cap: ['1810.HK', '2020.HK', '0175.HK', '0968.HK', '2382.HK', '1093.HK'],
      technology: ['0700.HK', '9988.HK', '1024.HK', '3690.HK', '2382.HK', '0968.HK'],
      finance: ['0005.HK', '0001.HK', '1398.HK', '0939.HK', '2318.HK', '1299.HK']
    },
    US: {
      large_cap: ['AAPL.US', 'GOOGL.US', 'MSFT.US', 'AMZN.US', 'TSLA.US', 'META.US'],
      mid_cap: ['NVDA.US', 'NFLX.US', 'CRM.US', 'ORCL.US', 'IBM.US', 'INTC.US'],
      small_cap: ['AMD.US', 'QCOM.US', 'TXN.US', 'AVGO.US', 'CSCO.US', 'ADBE.US'],
      technology: ['AAPL.US', 'GOOGL.US', 'MSFT.US', 'NVDA.US', 'AMD.US', 'INTC.US'],
      growth: ['TSLA.US', 'META.US', 'NFLX.US', 'CRM.US', 'NVDA.US', 'AMD.US']
    },
    CN: {
      SZ: ['000001.SZ', '000002.SZ', '000858.SZ', '002415.SZ', '300059.SZ', '300122.SZ'],
      SH: ['600519.SH', '600036.SH', '600276.SH', '600000.SH', '601318.SH', '600028.SH'],
      technology: ['000858.SZ', '002415.SZ', '300059.SZ', '300122.SZ', '600276.SH', '601318.SH'],
      traditional: ['600519.SH', '600036.SH', '600000.SH', '600028.SH', '000001.SZ', '000002.SZ']
    }
  };

  // 数据类型定义（统一使用get-前缀格式）
  static DATA_TYPES = {
    primary: ['get-stock-quote', 'get-stock-basic-info', 'get-index-quote'],
    extended: ['get-market-status', 'get-trading-days', 'get-global-state'],
    crypto: ['get-crypto-quote'],
    metadata: ['get-stock-logo']
  };

  // 性能测试基准配置
  static PERFORMANCE_BASELINES = {
    response_time: {
      excellent: { min: 0, max: 500 },
      good: { min: 500, max: 1000 },
      acceptable: { min: 1000, max: 2000 },
      poor: { min: 2000, max: 5000 }
    },
    throughput: {
      low: { concurrent: 10, rps: 50 },
      medium: { concurrent: 50, rps: 200 },
      high: { concurrent: 100, rps: 500 },
      extreme: { concurrent: 500, rps: 2000 }
    },
    error_rates: {
      excellent: 0.001, // 0.1%
      good: 0.01,       // 1%
      acceptable: 0.05, // 5%
      poor: 0.1         // 10%
    }
  };

  /**
   * 生成用户测试数据
   */
  static generateUser(options = {}) {
    const defaults = {
      role: 'user',
      active: true,
      prefix: 'test_user'
    };
    const config = { ...defaults, ...options };
    
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 9);
    
    return {
      username: `${config.prefix}_${timestamp}_${random}`,
      email: `${config.prefix}_${timestamp}@test.example.com`,
      password: `TestPass123!${timestamp}`,
      role: config.role,
      isActive: config.active,
      createdAt: new Date().toISOString(),
      metadata: {
        testGenerated: true,
        timestamp: timestamp,
        scenario: config.scenario || 'default'
      }
    };
  }

  /**
   * 生成API Key测试数据
   */
  static generateApiKey(options = {}) {
    const defaults = {
      name: 'Test API Key',
      permissions: ['data:read', 'query:execute', 'providers:read'],
      rateLimit: { requests: 1000, window: '1h' }
    };
    const config = { ...defaults, ...options };
    
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 9);
    
    return {
      name: `${config.name} ${timestamp}`,
      description: `测试专用API Key - ${new Date().toISOString()}`,
      permissions: config.permissions,
      rateLimit: config.rateLimit,
      metadata: {
        testGenerated: true,
        timestamp: timestamp,
        scenario: config.scenario || 'default'
      }
    };
  }

  /**
   * 生成股票符号组合
   */
  static generateSymbols(options = {}) {
    const defaults = {
      markets: ['HK', 'US'],
      categories: ['large_cap'],
      count: 5,
      shuffle: true
    };
    const config = { ...defaults, ...options };
    
    let symbols = [];
    
    config.markets.forEach(market => {
      config.categories.forEach(category => {
        if (this.STOCK_SYMBOLS[market] && this.STOCK_SYMBOLS[market][category]) {
          symbols.push(...this.STOCK_SYMBOLS[market][category]);
        }
      });
    });
    
    // 添加中国市场处理
    if (config.markets.includes('CN')) {
      const cnCategories = config.categories.filter(cat => 
        this.STOCK_SYMBOLS.CN[cat] || ['SZ', 'SH'].includes(cat)
      );
      cnCategories.forEach(category => {
        if (this.STOCK_SYMBOLS.CN[category]) {
          symbols.push(...this.STOCK_SYMBOLS.CN[category]);
        }
      });
    }
    
    if (config.shuffle) {
      symbols = symbols.sort(() => 0.5 - Math.random());
    }
    
    return symbols.slice(0, config.count);
  }

  /**
   * 生成批量数据请求
   */
  static generateDataRequest(options = {}) {
    const defaults = {
      symbolCount: 5,
      capabilityType: 'get-stock-quote',
      includeOptions: true
    };
    const config = { ...defaults, ...options };
    
    const symbols = this.generateSymbols({ 
      count: config.symbolCount,
      ...config.symbolOptions 
    });
    
    const request = {
      symbols: symbols,
      capabilityType: config.capabilityType
    };
    
    if (config.includeOptions) {
      request.options = {
        includeCache: Math.random() > 0.3,
        validateSymbols: Math.random() > 0.5,
        timeout: config.timeout || 5000,
        ...(config.customOptions || {})
      };
    }
    
    return request;
  }

  /**
   * 生成查询请求数据
   */
  static generateQuery(options = {}) {
    const defaults = {
      type: 'by_symbols',
      symbolCount: 3
    };
    const config = { ...defaults, ...options };
    
    const queryGenerators = {
      by_symbols: () => ({
        queryType: 'by_symbols',
        symbols: this.generateSymbols({ count: config.symbolCount }),
        options: {
          includeMetadata: Math.random() > 0.5,
          format: Math.random() > 0.5 ? 'detailed' : 'basic'
        }
      }),
      
      by_market: () => {
        const markets = ['HK', 'US', 'SZ', 'SH'];
        return {
          queryType: 'by_market',
          market: markets[Math.floor(Math.random() * markets.length)],
          limit: Math.floor(Math.random() * 20) + 5,
          options: {
            includeIndexes: Math.random() > 0.5
          }
        };
      },
      
      by_provider: () => ({
        queryType: 'by_provider',
        provider: 'longport',
        dataTypeFilter: this.DATA_TYPES.primary[Math.floor(Math.random() * this.DATA_TYPES.primary.length)],
        symbols: this.generateSymbols({ count: 3 })
      }),
      
      advanced: () => ({
        queryType: 'advanced',
        filters: {
          market: Math.random() > 0.5 ? 'HK' : 'US',
          category: Math.random() > 0.5 ? 'technology' : 'finance',
          minVolume: Math.floor(Math.random() * 1000000),
          priceRange: {
            min: Math.floor(Math.random() * 50),
            max: Math.floor(Math.random() * 500) + 100
          }
        },
        options: {
          sortBy: Math.random() > 0.5 ? 'volume' : 'price',
          limit: Math.floor(Math.random() * 50) + 10
        }
      })
    };
    
    const generator = queryGenerators[config.type] || queryGenerators.by_symbols;
    return generator();
  }

  /**
   * 生成原始股票数据（模拟）
   */
  static generateRawStockData(symbols = [], provider = 'longport') {
    const dataStructures = {
      longport: {
        secu_quote: symbols.map(symbol => ({
          symbol: symbol,
          last_done: (Math.random() * 500 + 50).toFixed(3),
          open: (Math.random() * 500 + 50).toFixed(3),
          high: (Math.random() * 600 + 60).toFixed(3),
          low: (Math.random() * 400 + 40).toFixed(3),
          volume: Math.floor(Math.random() * 10000000).toString(),
          turnover: (Math.random() * 1000000000).toFixed(2),
          prev_close: (Math.random() * 500 + 50).toFixed(3),
          change_rate: ((Math.random() - 0.5) * 0.1).toFixed(6),
          timestamp: Date.now()
        }))
      },
      
      itick: {
        quotes: symbols.map(symbol => ({
          code: symbol,
          price: Math.random() * 500 + 50,
          open_price: Math.random() * 500 + 50,
          high_price: Math.random() * 600 + 60,
          low_price: Math.random() * 400 + 40,
          vol: Math.floor(Math.random() * 10000000),
          amount: Math.random() * 1000000000,
          pre_close: Math.random() * 500 + 50,
          change: (Math.random() - 0.5) * 50,
          change_percent: (Math.random() - 0.5) * 0.1,
          update_time: Date.now()
        }))
      }
    };
    
    return dataStructures[provider] || dataStructures.longport;
  }

  /**
   * 生成性能测试场景数据集
   */
  static generatePerformanceScenario(scenario = 'standard') {
    const scenarios = {
      light: {
        users: { min: 1, max: 10 },
        requests: { count: 50, interval: 1000 },
        data: { symbolCount: 3, complexity: 'low' },
        duration: '2m'
      },
      
      standard: {
        users: { min: 10, max: 50 },
        requests: { count: 200, interval: 500 },
        data: { symbolCount: 10, complexity: 'medium' },
        duration: '5m'
      },
      
      heavy: {
        users: { min: 50, max: 200 },
        requests: { count: 1000, interval: 200 },
        data: { symbolCount: 25, complexity: 'high' },
        duration: '10m'
      },
      
      spike: {
        users: { min: 50, max: 500, spike: true },
        requests: { count: 2000, interval: 100 },
        data: { symbolCount: 15, complexity: 'medium' },
        duration: '3m'
      },
      
      volume: {
        users: { min: 100, max: 400 },
        requests: { count: 5000, interval: 50 },
        data: { symbolCount: 100, complexity: 'extreme' },
        duration: '15m'
      }
    };
    
    return scenarios[scenario] || scenarios.standard;
  }

  /**
   * 生成告警规则测试数据
   */
  static generateAlertRule(options = {}) {
    const defaults = {
      severity: 'warning',
      enabled: true
    };
    const config = { ...defaults, ...options };
    
    const metrics = ['cpu_usage', 'memory_usage', 'response_time', 'error_rate', 'db_connections'];
    const operators = ['gt', 'lt', 'gte', 'lte', 'eq'];
    
    const timestamp = Date.now();
    const metric = config.metric || metrics[Math.floor(Math.random() * metrics.length)];
    
    return {
      name: `测试告警规则_${metric}_${timestamp}`,
      metric: metric,
      operator: config.operator || operators[Math.floor(Math.random() * operators.length)],
      threshold: config.threshold || this.generateThreshold(metric),
      duration: config.duration || Math.floor(Math.random() * 300) + 60, // 60-360秒
      severity: config.severity,
      enabled: config.enabled,
      channels: config.channels || [
        {
          type: 'log',
          config: { level: config.severity }
        }
      ],
      metadata: {
        testGenerated: true,
        timestamp: timestamp,
        scenario: config.scenario || 'default'
      }
    };
  }

  /**
   * 为不同指标生成合理的阈值
   */
  static generateThreshold(metric) {
    const thresholds = {
      cpu_usage: Math.floor(Math.random() * 30) + 70,      // 70-100%
      memory_usage: Math.floor(Math.random() * 20) + 80,   // 80-100%
      response_time: Math.floor(Math.random() * 2000) + 1000, // 1000-3000ms
      error_rate: Math.floor(Math.random() * 10) + 5,      // 5-15%
      db_connections: Math.floor(Math.random() * 20) + 80, // 80-100
      throughput: Math.floor(Math.random() * 500) + 100    // 100-600 rps
    };
    
    return thresholds[metric] || Math.floor(Math.random() * 100);
  }

  /**
   * 生成测试数据批次
   */
  static generateTestBatch(type, count = 10, options = {}) {
    const generators = {
      users: () => this.generateUser(options),
      apiKeys: () => this.generateApiKey(options),
      dataRequests: () => this.generateDataRequest(options),
      queries: () => this.generateQuery(options),
      alertRules: () => this.generateAlertRule(options)
    };
    
    const generator = generators[type];
    if (!generator) {
      throw new Error(`Unknown test data type: ${type}`);
    }
    
    return Array(count).fill(0).map(() => generator());
  }

  /**
   * 生成完整的测试场景数据包
   */
  static generateScenarioPackage(scenario = 'integration') {
    const packages = {
      integration: {
        users: this.generateTestBatch('users', 5, { role: 'developer' }),
        apiKeys: this.generateTestBatch('apiKeys', 3),
        dataRequests: this.generateTestBatch('dataRequests', 10),
        queries: this.generateTestBatch('queries', 5),
        symbols: this.generateSymbols({ count: 20, markets: ['HK', 'US', 'CN'] })
      },
      
      performance: {
        users: this.generateTestBatch('users', 20, { role: 'user' }),
        apiKeys: this.generateTestBatch('apiKeys', 10, { 
          rateLimit: { requests: 5000, window: '1h' }
        }),
        scenarios: Object.keys(this.generatePerformanceScenario()).map(name => ({
          name,
          config: this.generatePerformanceScenario(name)
        })),
        baselines: this.PERFORMANCE_BASELINES
      },
      
      monitoring: {
        users: this.generateTestBatch('users', 3, { role: 'admin' }),
        alertRules: this.generateTestBatch('alertRules', 15),
        metrics: ['cpu_usage', 'memory_usage', 'response_time', 'error_rate', 'throughput'],
        thresholds: this.PERFORMANCE_BASELINES
      },
      
      security: {
        users: this.generateTestBatch('users', 8, { role: 'user' }),
        invalidUsers: [
          { username: 'hacker', password: 'password123' },
          { username: 'admin', password: 'admin' },
          { username: 'test', password: '123456' }
        ],
        suspiciousPatterns: [
          'DROP TABLE users',
          '<script>alert("xss")</script>',
          '../../../etc/passwd',
          'union select * from users'
        ]
      }
    };
    
    return packages[scenario] || packages.integration;
  }

  /**
   * 清理测试数据的辅助方法
   */
  static generateCleanupFilter(testData) {
    return {
      metadata: { testGenerated: true },
      createdAt: {
        $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // 最近24小时
      }
    };
  }
}

export default TestDataFactory;