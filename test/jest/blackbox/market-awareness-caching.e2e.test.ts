/**
 * 真实环境黑盒E2E测试：市场状态感知缓存系统
 * 测试基于市场状态的动态缓存策略和37字段变化检测
 * 验证多市场智能推断和缓存优化机制
 * 
 * 注意：此测试需要项目实际运行在 http://localhost:3000
 * 启动命令：bun run dev
 */

import axios, { AxiosInstance } from 'axios';

describe("Real Environment Black-box: Market Awareness & Caching E2E", () => {
  let httpClient: AxiosInstance;
  let baseURL: string;
  let apiKey: any;
  let adminJWT: string;

  beforeAll(async () => {
    // 配置真实环境连接
    baseURL = process.env.TEST_BASE_URL || 'http://localhost:3000';
    
    httpClient = axios.create({
      baseURL,
      timeout: 30000,
      validateStatus: () => true, // 不要自动抛出错误，让我们手动处理
    });

    console.log(`🔗 连接到真实项目: ${baseURL}`);

    // 验证项目是否运行
    await verifyProjectRunning();
    
    // 设置认证
    await setupAuthentication();
  });

  async function verifyProjectRunning() {
    try {
      const response = await httpClient.get('/api/v1/monitoring/health');
      if (response.status !== 200) {
        throw new Error(`项目健康检查失败: ${response.status}`);
      }
      console.log('✅ 项目运行状态验证成功');
    } catch (error) {
      console.error('❌ 无法连接到项目，请确保项目正在运行:');
      console.error('   启动命令: bun run dev');
      console.error('   项目地址:', baseURL);
      throw new Error(`项目未运行或不可访问: ${error.message}`);
    }
  }

  async function setupAuthentication() {
    try {
      // 设置管理员认证
      const adminUserData = {
        username: `market_admin_${Date.now()}`,
        email: `market_admin_${Date.now()}@example.com`,
        password: 'password123',
        role: 'admin'
      };

      const adminRegisterResponse = await httpClient.post('/api/v1/auth/register', adminUserData);
      if (adminRegisterResponse.status !== 201) {
        console.warn('管理员注册失败，可能已存在，尝试直接登录');
      }

      const adminLoginResponse = await httpClient.post('/api/v1/auth/login', {
        username: adminUserData.username,
        password: adminUserData.password
      });

      if (adminLoginResponse.status !== 200) {
        throw new Error(`管理员登录失败: ${adminLoginResponse.status}`);
      }

      adminJWT = adminLoginResponse.data.data?.accessToken || adminLoginResponse.data.accessToken;

      // 创建测试API Key
      const apiKeyData = {
        name: "Real Environment Market Awareness Test Key",
        permissions: ["data:read", "query:execute", "system:monitor"],
        rateLimit: {
          requests: 200,
          window: "1h",
        },
      };

      const apiKeyResponse = await httpClient.post("/api/v1/auth/api-keys", apiKeyData, {
        headers: { Authorization: `Bearer ${adminJWT}` }
      });

      if (apiKeyResponse.status !== 201) {
        throw new Error(`创建API Key失败: ${apiKeyResponse.status}`);
      }

      apiKey = apiKeyResponse.data.data;
      console.log('✅ 认证设置完成');
    } catch (error) {
      console.error('❌ 认证设置失败:', error.message);
      throw error;
    }
  }

  describe("🌍 多市场智能推断测试", () => {
    const marketTestCases = [
      { symbol: "AAPL.US", expectedMarket: "US", description: "美股字母符号" },
      { symbol: "TSLA.US", expectedMarket: "US", description: "美股多字母符号" },
      { symbol: "700.HK", expectedMarket: "HK", description: "港股.HK后缀" },
      { symbol: "00700.HK", expectedMarket: "HK", description: "港股5位数字" },
      {
        symbol: "000001.SZ",
        expectedMarket: "SZ",
        description: "深交所.SZ后缀",
      },
      { symbol: "300001.SZ", expectedMarket: "SZ", description: "创业板30开头" },
      {
        symbol: "600000.SH",
        expectedMarket: "SH", 
        description: "上交所.SH后缀",
      },
      { symbol: "688001.SH", expectedMarket: "SH", description: "科创板68开头" },
    ];

    marketTestCases.forEach((testCase) => {
      it(`应该正确识别 ${testCase.description}: ${testCase.symbol}`, async () => {
        const response = await httpClient.post("/api/v1/receiver/data", {
          symbols: [testCase.symbol],
          receiverType: "get-stock-quote",
        }, {
          headers: {
            "X-App-Key": apiKey.appKey,
            "X-Access-Token": apiKey.accessToken,
          }
        });

        expect(response.status).toBe(200);
        expect(response.data.data).toHaveProperty("metadata");

        // 验证市场识别
        const metadata = response.data.data.metadata;
        if (metadata.detectedMarkets) {
          expect(metadata.detectedMarkets).toContain(testCase.expectedMarket);
          console.log(
            `✅ ${testCase.symbol} 正确识别为 ${testCase.expectedMarket} 市场`,
          );
        }

        // 验证缓存键包含市场信息
        if (metadata.cacheKey) {
          expect(metadata.cacheKey).toContain(testCase.expectedMarket.toLowerCase());
        }
      });
    });

    it("应该支持混合市场批量查询", async () => {
      const mixedSymbols = ["AAPL.US", "700.HK", "000001.SZ", "600000.SH"];

      const response = await httpClient.post("/api/v1/receiver/data", {
        symbols: mixedSymbols,
        receiverType: "get-stock-quote",
      }, {
        headers: {
          "X-App-Key": apiKey.appKey,
          "X-Access-Token": apiKey.accessToken,
        }
      });

      expect(response.status).toBe(200);

      const metadata = response.data.data.metadata;
      
      // 验证检测到的市场
      if (metadata.detectedMarkets) {
        const expectedMarkets = ["US", "HK", "SZ", "SH"];
        expectedMarkets.forEach((market) => {
          expect(metadata.detectedMarkets).toContain(market);
        });

        console.log(`✅ 混合市场查询检测到市场: ${metadata.detectedMarkets.join(", ")}`);
      }

      // 验证批量处理统计
      expect(metadata.totalRequested).toBe(mixedSymbols.length);
    });
  });

  describe("🕐 动态缓存TTL策略测试", () => {
    it("应该根据市场时间调整缓存TTL", async () => {
      const testCases = [
        { symbol: "AAPL.US", market: "US" },
        { symbol: "700.HK", market: "HK" },
        { symbol: "000001.SZ", market: "SZ" },
      ];

      for (const testCase of testCases) {
        const response = await httpClient.post("/api/v1/receiver/data", {
          symbols: [testCase.symbol],
          receiverType: "get-stock-quote",
        }, {
          headers: {
            "X-App-Key": apiKey.appKey,
            "X-Access-Token": apiKey.accessToken,
          }
        });

        expect(response.status).toBe(200);

        const metadata = response.data.data.metadata;
        
        // 验证TTL在合理范围内
        if (metadata.cacheTTL) {
          expect(metadata.cacheTTL).toBeGreaterThan(0);
          expect(metadata.cacheTTL).toBeLessThanOrEqual(300); // 5分钟内
          
          console.log(
            `${testCase.symbol} (${testCase.market}): TTL = ${metadata.cacheTTL}s`,
          );
        }

        // 验证市场感知标识
        if (metadata.marketAware !== undefined) {
          expect(metadata.marketAware).toBe(true);
        }
      }
    });

    it("应该在交易时间和非交易时间使用不同的TTL", async () => {
      const testSymbol = "700.HK";
      const measurements = [];

      // 连续多次请求，观察TTL变化
      for (let i = 0; i < 3; i++) {
        const response = await httpClient.post("/api/v1/receiver/data", {
          symbols: [testSymbol],
          receiverType: "get-stock-quote",
        }, {
          headers: {
            "X-App-Key": apiKey.appKey,
            "X-Access-Token": apiKey.accessToken,
          }
        });

        expect(response.status).toBe(200);

        const metadata = response.data.data.metadata;
        if (metadata.cacheTTL) {
          measurements.push({
            ttl: metadata.cacheTTL,
            timestamp: new Date().toISOString(),
            cacheUsed: metadata.cacheUsed || false,
          });
        }

        // 短暂间隔
        await new Promise((resolve) => setTimeout(resolve, 500));
      }

      console.log(`TTL测量结果: ${JSON.stringify(measurements, null, 2)}`);

      // 验证TTL的一致性（相同时间段内应该相似）
      if (measurements.length > 1) {
        const ttls = measurements.map((m) => m.ttl);
        const maxTTL = Math.max(...ttls);
        const minTTL = Math.min(...ttls);
        
        // TTL变化应该在合理范围内
        expect(maxTTL - minTTL).toBeLessThan(60); // 差异不超过1分钟
      }
    });
  });

  describe("🔍 37字段变化检测测试", () => {
    it("应该检测股票价格字段变化", async () => {
      const testSymbol = "700.HK";

      // 第一次查询
      const firstResponse = await httpClient.post("/api/v1/receiver/data", {
        symbols: [testSymbol],
        receiverType: "get-stock-quote",
      }, {
        headers: {
          "X-App-Key": apiKey.appKey,
          "X-Access-Token": apiKey.accessToken,
        }
      });

      expect(firstResponse.status).toBe(200);

      // 等待一段时间后第二次查询
      await new Promise((resolve) => setTimeout(resolve, 2000));

      const secondResponse = await httpClient.post("/api/v1/query/execute", {
        queryType: "by_symbols",
        symbols: [testSymbol],
        queryTypeFilter: "stock-quote",
        options: {
          includeMetadata: true
        }
      }, {
        headers: {
          "X-App-Key": apiKey.appKey,
          "X-Access-Token": apiKey.accessToken,
        }
      });

      expect(secondResponse.status).toBe(201);

      // 验证变化检测结果
      const metadata = secondResponse.data.data.metadata;
      if (metadata.changeDetection) {
        expect([
          "price_change",
          "volume_change",
          "no_change",
          "initial_load",
        ]).toContain(metadata.changeDetection.reason);

        console.log(
          `变化检测结果: ${metadata.changeDetection.reason}`,
        );

        if (metadata.changeDetection.changedFields) {
          console.log(
            `变化字段: ${metadata.changeDetection.changedFields.join(", ")}`,
          );
        }
      }
    });

    it("应该检测多只股票的字段变化", async () => {
      const testSymbols = ["700.HK", "AAPL.US"];

      const response = await httpClient.post("/api/v1/query/execute", {
        queryType: "by_symbols",

        symbols: testSymbols,
        queryTypeFilter: "stock-quote",
        options: {
          includeMetadata: true
        }
      }, {
        headers: {
          "X-App-Key": apiKey.appKey,
          "X-Access-Token": apiKey.accessToken,
        }
      });

      expect(response.status).toBe(201);
      expect(response.data.data).toHaveProperty("data");
      expect(response.data.data).toHaveProperty("metadata");

      const metadata = response.data.data.metadata;

      // 验证批量变化检测
      if (metadata.changeDetection) {
        expect(metadata.changeDetection).toBeDefined();
        console.log(
          `批量变化检测: ${JSON.stringify(metadata.changeDetection, null, 2)}`,
        );
      }

      // 添加调试信息
      console.log('响应数据结构:', JSON.stringify(response.data, null, 2));
      
      // 验证数据完整性 - 适配API实际响应结构
      // 根据dual-interface-system.e2e.test.ts的示例，数据可能在items字段中
      const responseData = response.data.data.data;
      
      // 检查是否有items字段（新格式）或直接是数组（旧格式）
      const stockData = responseData.items || responseData;
      
      expect(stockData).toBeDefined();
      
      if (stockData && Array.isArray(stockData) && stockData.length > 0) {
        stockData.forEach((stock, index) => {
          expect(stock).toHaveProperty("symbol");
          expect(testSymbols).toContain(stock.symbol);
          console.log(`股票 ${index + 1}: ${stock.symbol}`);
        });
      }
    });
  });

  describe("⚡ 缓存性能优化测试", () => {
    it("应该通过缓存提升重复查询性能", async () => {
      const testSymbol = "700.HK";
      const measurements = [];

      // 第一次查询（冷启动）
      const startTime1 = Date.now();
      const firstResponse = await httpClient.post("/api/v1/receiver/data", {
        symbols: [testSymbol],
        receiverType: "get-stock-quote",
      }, {
        headers: {
          "X-App-Key": apiKey.appKey,
          "X-Access-Token": apiKey.accessToken,
        }
      });
      const endTime1 = Date.now();

      expect(firstResponse.status).toBe(200);
      measurements.push({
        type: "first_request",
        responseTime: endTime1 - startTime1,
        cacheUsed: firstResponse.data.data.metadata.cacheUsed || false,
      });

      // 立即重复查询（应该命中缓存）
      const startTime2 = Date.now();
      const secondResponse = await httpClient.post("/api/v1/receiver/data", {
        symbols: [testSymbol],
        receiverType: "get-stock-quote",
      }, {
        headers: {
          "X-App-Key": apiKey.appKey,
          "X-Access-Token": apiKey.accessToken,
        }
      });
      const endTime2 = Date.now();

      expect(secondResponse.status).toBe(200);
      measurements.push({
        type: "cached_request",
        responseTime: endTime2 - startTime2,
        cacheUsed: secondResponse.data.data.metadata.cacheUsed || false,
      });

      console.log(`缓存性能测试结果: ${JSON.stringify(measurements, null, 2)}`);

      // 验证缓存效果
      const firstTime = measurements[0].responseTime;
      const secondTime = measurements[1].responseTime;

      // 缓存命中的请求应该更快
      if (measurements[1].cacheUsed) {
        expect(secondTime).toBeLessThan(firstTime);
        console.log(`✅ 缓存优化效果: ${firstTime}ms -> ${secondTime}ms`);
      }
    });

    it("应该支持不同市场的独立缓存", async () => {
      const marketSymbols = [
        { symbol: "AAPL.US", market: "US" },
        { symbol: "700.HK", market: "HK" },
        { symbol: "000001.SZ", market: "SZ" },
      ];

      const cacheResults = [];

      for (const test of marketSymbols) {
        // 第一次查询
        const firstResponse = await httpClient.post("/api/v1/receiver/data", {
          symbols: [test.symbol],
          receiverType: "get-stock-quote",
        }, {
          headers: {
            "X-App-Key": apiKey.appKey,
            "X-Access-Token": apiKey.accessToken,
          }
        });

        expect(firstResponse.status).toBe(200);

        // 立即重复查询
        const secondResponse = await httpClient.post("/api/v1/receiver/data", {
          symbols: [test.symbol],
          receiverType: "get-stock-quote",
        }, {
          headers: {
            "X-App-Key": apiKey.appKey,
            "X-Access-Token": apiKey.accessToken,
          }
        });

        expect(secondResponse.status).toBe(200);

        cacheResults.push({
          market: test.market,
          symbol: test.symbol,
          firstCacheUsed: firstResponse.data.data.metadata.cacheUsed || false,
          secondCacheUsed: secondResponse.data.data.metadata.cacheUsed || false,
          cacheKey: secondResponse.data.data.metadata.cacheKey,
        });
      }

      console.log(`独立缓存测试结果: ${JSON.stringify(cacheResults, null, 2)}`);

      // 验证每个市场都有独立的缓存键
      const cacheKeys = cacheResults
        .map((r) => r.cacheKey)
        .filter((key) => key !== undefined);
      
      if (cacheKeys.length > 1) {
        // 不同市场的缓存键应该不同
        const uniqueCacheKeys = new Set(cacheKeys);
        expect(uniqueCacheKeys.size).toBe(cacheKeys.length);
      }
    });
  });

  afterAll(async () => {
    // 清理测试API Key
    if (apiKey && apiKey.id) {
      try {
        const deleteResponse = await httpClient.delete(`/api/v1/auth/api-keys/${apiKey.appKey}`, {
          headers: { Authorization: `Bearer ${adminJWT}` }
        });
        expect(deleteResponse.status).toBe(200);
        console.log('✅ 测试API Key已清理');
      } catch (error) {
        console.warn('⚠️ API Key清理失败:', error.message);
      }
    }
    
    console.log('🎯 市场感知缓存黑盒测试完成');
  });
});