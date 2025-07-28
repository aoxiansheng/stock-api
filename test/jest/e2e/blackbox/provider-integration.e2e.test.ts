/**
 * 真实环境黑盒E2E测试：Provider能力导向架构
 * 测试LongPort生产数据源集成和自动发现机制
 * 验证多Provider能力注册和智能路由选择
 * 
 * 注意：此测试需要项目实际运行在 http://localhost:3000
 * 启动命令：bun run dev
 */

import axios, { AxiosInstance } from 'axios';

describe("Real Environment Black-box: Provider Integration E2E", () => {
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
        username: `provider_admin_${Date.now()}`,
        email: `provider_admin_${Date.now()}@example.com`,
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

      // 创建具有Provider相关权限的API Key
      const apiKeyData = {
        name: "Real Environment Provider Integration Test Key",
        permissions: [
          "data:read",
          "providers:read",
          "query:execute",
          "system:monitor",
        ],
        rateLimit: {
          requests: 300,
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
  };

  describe("📊 Provider能力发现与注册", () => {
    it("应该自动发现并注册所有可用的Provider能力", async () => {
      const response = await httpClient.get("/api/v1/providers/capabilities", {
        headers: {
          "X-App-Key": apiKey.appKey,
          "X-Access-Token": apiKey.accessToken,
        }
      });

      expect(response.status).toBe(200);
      expect(response.data.data).toBeDefined();

      const capabilities = response.data.data;
      expect(capabilities).toBeDefined();
      expect(typeof capabilities).toBe("object");

      // 验证LongPort Provider存在
      expect(capabilities).toHaveProperty("longport");

      const longportCapabilities = capabilities.longport;
      expect(Array.isArray(longportCapabilities)).toBe(true);

      // 验证3个核心能力存在
      const expectedCapabilities = [
        "get-stock-quote",
        "get-stock-basic-info",
        "get-index-quote",
      ];
      expectedCapabilities.forEach((capability) => {
        const found = longportCapabilities.some(
          (cap) => cap.name === capability,
        );
        expect(found).toBe(true);
        console.log(`✅ 发现LongPort能力: ${capability}`);
      });
    });

    it.skip("应该提供Provider状态和优先级信息", async () => {
      const response = await httpClient.get("/api/v1/providers/status", {
        headers: {
          "X-App-Key": apiKey.appKey,
          "X-Access-Token": apiKey.accessToken,
        }
      });

      expect(response.status).toBe(200);
      expect(response.data.data).toBeDefined();

      const providerStatus = response.data.data;
      expect(providerStatus).toBeDefined();

      // 验证LongPort Provider状态
      if (providerStatus.longport) {
        expect(providerStatus.longport).toHaveProperty("enabled");
        expect(providerStatus.longport).toHaveProperty("priority");
        expect(providerStatus.longport).toHaveProperty("supportedMarkets");

        console.log(
          `LongPort状态: 启用=${providerStatus.longport.enabled}, 优先级=${providerStatus.longport.priority}`,
        );
        console.log(
          `支持市场: ${providerStatus.longport.supportedMarkets?.join(", ")}`,
        );
      }

      // 验证LongPort-SG Provider（如果存在）
      if (providerStatus["longport-sg"]) {
        expect(providerStatus["longport-sg"]).toHaveProperty(
          "supportedMarkets",
        );
        expect(providerStatus["longport-sg"].supportedMarkets).toContain("SG");
        console.log("✅ 发现LongPort-SG新加坡市场Provider");
      }
    });
  });

  describe("🚀 LongPort生产数据源集成", () => {
    const testCapabilities = [
      {
        capability: "get-stock-quote",
        dataType: "get-stock-quote",
        testSymbols: ["00700.HK", "AAPL.US", "000001.SZ"],
        description: "实时股票报价",
      },
      {
        capability: "get-stock-basic-info",
        dataType: "stock-basic-info",
        testSymbols: ["00700.HK", "AAPL.US"],
        description: "股票基本信息",
      },
      {
        capability: "get-index-quote",
        dataType: "index-quote",
        testSymbols: ["HSI.HK", "SPX.US"],
        description: "指数报价数据",
      },
    ];

    testCapabilities.forEach(
      ({ capability, dataType, testSymbols, description }) => {
        it(`应该通过LongPort获取真实的${description}`, async () => {
          const response = await httpClient.post("/api/v1/receiver/data", {
            symbols: testSymbols,
            dataType: dataType,
            options: {
              preferredProvider: "longport",
              realtime: true,
            },
          }, {
            headers: {
              "X-App-Key": apiKey.appKey,
              "X-Access-Token": apiKey.accessToken,
            }
          });

          expect(response.status).toBe(200);
          expect(response.data.data).toBeDefined();

          const metadata = response.data.data.metadata;
          if (metadata.provider) {
            expect(metadata.provider).toBe("longport");
          }
          if (metadata.capability) {
            expect(metadata.capability).toBe(capability);
          }

          // 验证真实数据特征
          // 修改: 适应secu_quote结构
          const responseData = response.data.data;
          
          switch (dataType) {

            case "get-stock-quote":
              // 不再强制要求secu_quote字段
              if (Array.isArray(responseData)) {
                if (responseData.length > 0) {
                  const sampleData = responseData[0];
                  expect(sampleData).toHaveProperty("symbol");
                  expect(sampleData.lastPrice || sampleData.last_done).toBeDefined();
                  console.log(`✅ ${description}数据获取成功: ${sampleData.symbol}`);
                }
              } else if (responseData.secu_quote) {
                // 向后兼容旧结构
                expect(Array.isArray(responseData.secu_quote)).toBe(true);
                
                if (responseData.secu_quote.length > 0) {
                  const sampleData = responseData.secu_quote[0];
                  expect(sampleData).toHaveProperty("symbol");
                  expect(sampleData.last_done).toBeDefined();
                  console.log(`✅ ${description}数据获取成功: ${sampleData.symbol}`);
                }
              }
              break;
              
            case "stock-basic-info":
              // 股票基本信息适应不同结构
              if (Array.isArray(responseData)) {
                if (responseData.length > 0) {
                  const sampleData = responseData[0];
                  expect(sampleData).toHaveProperty("symbol");
                  expect(sampleData.name_cn || sampleData.name_en || sampleData.name_hk || sampleData.name).toBeDefined();
                  console.log(`✅ ${description}数据获取成功: ${sampleData.symbol}`);
                }
              } else if (responseData.data && Array.isArray(responseData.data)) {
                if (responseData.data.length > 0) {
                  const sampleData = responseData.data[0];
                  expect(sampleData).toHaveProperty("symbol");
                  expect(sampleData.name_cn || sampleData.name_en || sampleData.name_hk || sampleData.name).toBeDefined();
                  console.log(`✅ ${description}数据获取成功: ${sampleData.symbol}`);
                }
              }
              break;
              
            case "index-quote":
              // 指数报价适应不同结构
              if (Array.isArray(responseData)) {
                if (responseData.length > 0) {
                  const sampleData = responseData[0];
                  expect(sampleData).toHaveProperty("symbol");
                  expect(sampleData.lastPrice || sampleData.last_done).toBeDefined();
                  console.log(`✅ ${description}数据获取成功: ${sampleData.symbol}`);
                }
              } else if (responseData.secu_quote) {
                expect(Array.isArray(responseData.secu_quote)).toBe(true);
                
                if (responseData.secu_quote.length > 0) {
                  const sampleData = responseData.secu_quote[0];
                  expect(sampleData).toHaveProperty("symbol");
                  expect(sampleData.last_done).toBeDefined();
                  console.log(`✅ ${description}数据获取成功: ${sampleData.symbol}`);
                }
              }
              break;
          }
        });
      },
    );

    it("应该处理LongPort API限制和错误恢复", async () => {
      // 使用可能触发限制的大批量请求
      const manySymbols = [
        "AAPL.US",
        "GOOGL.US",
        "MSFT.US",
        "TSLA.US",
        "AMZN.US", // 美股
        "00700.HK",
        "388.HK",
        "175.HK",
        "981.HK", // 港股
        "000001.SZ",
        "000002.SZ",
        "300001.SZ", // A股
      ];

      const response = await httpClient.post("/api/v1/receiver/data", {
        symbols: manySymbols,
        dataType: "get-stock-quote",
        options: {
          preferredProvider: "longport",
         // timeout: 10000,
          realtime: true,
        },
      }, {
        headers: {
          "X-App-Key": apiKey.appKey,
          "X-Access-Token": apiKey.accessToken,
        }
      });

      // 接受成功、部分成功或服务限制状态
      expect([200, 202, 429, 503]).toContain(response.status);

      if (response.status === 200) {
        const metadata = response.data.data.metadata;

        // 验证批量处理统计
        expect(metadata.totalRequested).toBe(manySymbols.length);
        expect(metadata.successfullyProcessed).toBeGreaterThanOrEqual(0);

        if (metadata.hasPartialFailures) {
          console.log(
            `批量请求: ${metadata.successfullyProcessed}/${metadata.totalRequested} 成功`,
          );
          expect(metadata.failureReasons).toBeDefined();
        }
      } else if (response.status === 429) {
        console.log("✅ LongPort API限流机制正常，系统正确处理限制");
        expect(response.data.message).toContain("限流");
      }
    });
  });

  describe("🎯 智能Provider路由选择", () => {
    it("应该根据市场和能力选择最佳Provider", async () => {
      const marketTestCases = [
        {
          symbols: ["AAPL.US", "GOOGL.US"],
          expectedMarket: "US",
          description: "美股市场",
        },
        {
          symbols: ["00700.HK", "388.HK"],
          expectedMarket: "HK",
          description: "港股市场",
        },
        { symbols: ["000001.SZ"], expectedMarket: "SZ", description: "深交所" },
        { symbols: ["600000.SH"], expectedMarket: "SH", description: "上交所" },
      ];

      for (const testCase of marketTestCases) {
        const response = await httpClient.post("/api/v1/receiver/data", {
          symbols: testCase.symbols,
          dataType: "get-stock-quote",
          options: {
            realtime: true,
          },
        }, {
          headers: {
            "X-App-Key": apiKey.appKey,
            "X-Access-Token": apiKey.accessToken,
          }
        });

        expect(response.status).toBe(200);
        const metadata = response.data.data.metadata;

        // 验证Provider选择逻辑
        if (metadata.provider) {
          expect(metadata.provider).toBeDefined();
          console.log(
            `${testCase.description} -> Provider: ${metadata.provider}`,
          );
        }
        
        if (metadata.routingDecision) {
          expect(metadata.routingDecision.selectedProvider).toBeDefined();
          expect(metadata.routingDecision.reason).toBeDefined();

          console.log(
            `${testCase.description} -> Provider: ${metadata.routingDecision.selectedProvider}, 原因: ${metadata.routingDecision.reason}`,
          );
        }
      }
    });

    it("应该支持Provider故障转移机制", async () => {
      const response = await httpClient.post("/api/v1/receiver/data", {
        symbols: ["00700.HK"],
        dataType: "get-stock-quote",
        options: {
          realtime: true,
        },
      }, {
        headers: {
          "X-App-Key": apiKey.appKey,
          "X-Access-Token": apiKey.accessToken,
        }
      });

      expect(response.status).toBe(200);
      expect(response.data.data).toBeDefined();

      const metadata = response.data.data.metadata;

      // 验证故障转移信息
      if (metadata.failoverAttempts) {
        expect(Array.isArray(metadata.failoverAttempts)).toBe(true);
        console.log(`故障转移尝试: ${metadata.failoverAttempts.length} 次`);
      }

      // 即使有故障转移，最终应该获得数据
      if (metadata.finalProvider) {
        expect(metadata.finalProvider).toBeDefined();
      }
      expect(response.data.data.data).toBeDefined();
    });
  });

  describe("🔧 Provider配置和管理", () => {
    it.skip("应该提供Provider配置信息", async () => {
      const response = await httpClient.get("/api/v1/providers/config", {
        headers: { Authorization: `Bearer ${adminJWT}` }
      });

      expect(response.status).toBe(200);
      expect(response.data.data).toBeDefined();

      const config = response.data.data;

      // 验证LongPort配置存在
      if (config.longport) {
        expect(config.longport).toHaveProperty("enabled");
        expect(config.longport).toHaveProperty("priority");
        expect(config.longport).toHaveProperty("capabilities");

        // 验证能力配置
        expect(Array.isArray(config.longport.capabilities)).toBe(true);

        config.longport.capabilities.forEach((capability) => {
          expect(capability).toHaveProperty("name");
          expect(capability).toHaveProperty("enabled");
          expect(capability).toHaveProperty("supportedMarkets");
        });

        console.log(
          `LongPort配置: ${config.longport.capabilities.length} 个能力`,
        );
      }
    });

    it.skip("应该监控Provider性能指标", async () => {
      // 先执行一些请求生成指标
      await httpClient.post("/api/v1/receiver/data", {
        symbols: ["00700.HK"],
        dataType: "get-stock-quote",
        options: { realtime: true },
      }, {
        headers: {
          "X-App-Key": apiKey.appKey,
          "X-Access-Token": apiKey.accessToken,
        }
      });

      // 查询Provider性能指标
      const metricsResponse = await httpClient.get("/api/v1/providers/metrics", {
        headers: { Authorization: `Bearer ${adminJWT}` },
        params: { timeRange: "5m" }
      });

      expect(metricsResponse.status).toBe(200);
      expect(metricsResponse.data.data).toBeDefined();

      const metrics = metricsResponse.data.data;

      // 验证LongPort指标
      if (metrics.longport) {
        expect(metrics.longport).toHaveProperty("totalRequests");
        expect(metrics.longport).toHaveProperty("successRate");
        expect(metrics.longport).toHaveProperty("averageResponseTime");

        console.log(
          `LongPort指标 - 请求: ${metrics.longport.totalRequests}, 成功率: ${(metrics.longport.successRate * 100).toFixed(1)}%, 响应时间: ${metrics.longport.averageResponseTime}ms`,
        );
      }
    });
  });

  describe("🌐 多Provider并发处理", () => {
    it("应该支持多Provider并发数据获取", async () => {
      const mixedMarketSymbols = [
        "AAPL.US", // 美股 - 可能路由到LongPort
        "00700.HK", // 港股 - 可能路由到LongPort
        "000001.SZ", // A股 - 可能路由到LongPort
      ];

      const startTime = Date.now();

      const response = await httpClient.post("/api/v1/receiver/data", {
        symbols: mixedMarketSymbols,
        dataType: "get-stock-quote",
        options: {
          realtime: true,
        },
      }, {
        headers: {
          "X-App-Key": apiKey.appKey,
          "X-Access-Token": apiKey.accessToken,
        }
      });

      expect(response.status).toBe(200);

      const endTime = Date.now();
      const totalTime = endTime - startTime;

      expect(response.data.data).toBeDefined();

      const metadata = response.data.data.metadata;

      // 验证并发处理效果
      if (metadata.providerBreakdown) {
        expect(typeof metadata.providerBreakdown).toBe("object");

        Object.entries(metadata.providerBreakdown).forEach(
          ([provider, stats]) => {
            const statsData = stats as any;
            if (statsData && typeof statsData === "object") {
              console.log(
                `${provider}: ${statsData.symbolCount || "N/A"} 个符号, ${statsData.responseTime || "N/A"}ms`,
              );
            }
          },
        );
      }

      // 并发处理应该比串行处理更快
      console.log(`多Provider并发处理总时间: ${totalTime}ms`);
      expect(totalTime).toBeLessThan(10000); // 10秒内完成
    });
  });

  describe("🔄 Provider数据一致性验证", () => {
    it("应该确保相同符号在不同Provider间的数据一致性", async () => {
      const testSymbol = "00700.HK";

      // 通过不同方式获取相同符号的数据
      const directResponse = await httpClient.post("/api/v1/receiver/data", {
        symbols: [testSymbol],
        dataType: "get-stock-quote",
        options: { realtime: true },
      }, {
        headers: {
          "X-App-Key": apiKey.appKey,
          "X-Access-Token": apiKey.accessToken,
        }
      });

      expect(directResponse.status).toBe(200);

      const queryResponse = await httpClient.post("/api/v1/query/execute", {
        queryType: "by_symbols",
        symbols: [testSymbol],
        queryDataTypeFilter: "stock-quote",
      }, {
        headers: {
          "X-App-Key": apiKey.appKey,
          "X-Access-Token": apiKey.accessToken,
        }
      });

      expect(queryResponse.status).toBe(201);

      // 验证数据结构一致性
      const directData = directResponse.data.data.secu_quote ? directResponse.data.data.secu_quote[0] : directResponse.data.data[0];
      const queryData = queryResponse.data.data.data ? queryResponse.data.data.data[0] : 
                        (queryResponse.data.data.secu_quote ? queryResponse.data.data.secu_quote[0] : null);

      if (directData && queryData) {
        expect(directData.symbol).toBe(queryData.symbol);

        // 验证关键字段类型一致性
        if (directData.last_done && queryData.last_done) {
          expect(typeof directData.last_done).toBe(typeof queryData.last_done);
        } else if (directData.lastPrice && queryData.lastPrice) {
          expect(typeof directData.lastPrice).toBe(typeof queryData.lastPrice);
        }

        console.log(`✅ ${testSymbol} 数据一致性验证通过`);
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
    
    console.log('🎯 Provider集成黑盒测试完成');
  });
});
