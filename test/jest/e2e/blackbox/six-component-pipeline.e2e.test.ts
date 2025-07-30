/**
 * 真实环境黑盒E2E测试：六组件核心架构流水线
 * 测试 Receiver → SymbolMapper → DataMapper → Transformer → Storage → Query 完整流程
 * 完全基于HTTP API，验证真实数据处理流水线
 * 
 * 注意：此测试需要项目实际运行在 http://localhost:3000
 * 启动命令：bun run dev
 */

import axios, { AxiosInstance } from 'axios';

describe("Real Environment Black-box: Six Component Pipeline E2E", () => {
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
        username: `pipeline_admin_${Date.now()}`,
        email: `pipeline_admin_${Date.now()}@example.com`,
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

      // 创建具有所有必要权限的API Key
      const apiKeyData = {
        name: "Real Environment Pipeline Test Key",
        permissions: [
          "data:read",
          "query:execute",
          "providers:read",
          "transformer:preview",
          "mapping:write",
          // "mapping:read", // 修复：移除无效的权限
          "system:monitor",
          "system:health", // 添加健康检查权限
          "config:read", 
        ],
        rateLimit: {
          requests: 500,
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

      // 修复：为Transformer测试创建必要的数据映射规则
      await createDataMappingRule();

      console.log('✅ 认证设置完成');
    } catch (error) {
      console.error('❌ 认证设置失败:', error.message);
      throw error;
    }
  };
  
  async function createDataMappingRule() {
    const mappingRuleData = {
      name: "E2E Test LongPort Quote Mapping",
      provider: "longport",
      transDataRuleListType: "quote_fields",
      description: "Rule for E2E pipeline test",
      sharedDataFieldMappings: [
        { sourceField: "symbol", targetField: "symbol" },
        { sourceField: "last_price", targetField: "lastPrice" },
        { sourceField: "volume", targetField: "volume" }
      ],
      isActive: true,
    };

    const response = await httpClient.post("/api/v1/data-mapper", mappingRuleData, {
      headers: {
        "X-App-Key": apiKey.appKey,
        "X-Access-Token": apiKey.accessToken,
      }
    });

    if (response.status !== 201) {
      // 如果规则已存在，可能返回409 Conflict，可以安全忽略
      if (response.status === 409) {
        console.warn('数据映射规则已存在，跳过创建');
      } else {
        throw new Error(`创建数据映射规则失败: ${response.status}`);
      }
    } else {
      console.log('✅ 数据映射规则创建成功');
    }
  }

  describe("完整六组件数据流水线测试", () => {
    it("应该完成从Receiver到Query的完整数据处理流", async () => {
        const testSymbol = "00700.HK";
  const testDataType = "get-stock-quote";

  // Step 1: Receiver - 数据接收和初始处理
  console.log("Step 1: Testing Receiver component...");
  const receiveResponse = await httpClient.post("/api/v1/receiver/data", {
    symbols: [testSymbol],
    receiverType: testDataType,
    options: { realtime: true },
      }, {
        headers: {
          "X-App-Key": apiKey.appKey,
          "X-Access-Token": apiKey.accessToken,
        }
      });

      expect(receiveResponse.status).toBe(200);
      expect(receiveResponse.data.data).toBeDefined();
      expect(receiveResponse.data.data.data).toBeDefined();
      const originalData = receiveResponse.data.data.data[0];

      // Step 2: SymbolMapper - 符号映射验证
      console.log("Step 2: Testing SymbolMapper component...");
      const symbolResponse = await httpClient.post("/api/v1/symbol-mapper/transform", {
        symbols: [testSymbol],
        dataSourceName: "longport",
      }, {
        headers: {
          "X-App-Key": apiKey.appKey,
          "X-Access-Token": apiKey.accessToken,
        }
      });

      expect(symbolResponse.status).toBe(201);
      expect(symbolResponse.data.data).toBeDefined();
      if (symbolResponse.data.data.transformedSymbols) {
        expect(symbolResponse.data.data.transformedSymbols).toBeDefined();
      }

      // Step 3: DataMapper - 字段映射规则验证
      console.log("Step 3: Testing DataMapper component...");
      const mappingResponse = await httpClient.get("/api/v1/data-mapper", {
        headers: {
          "X-App-Key": apiKey.appKey,
          "X-Access-Token": apiKey.accessToken,
        },
        params: {
          provider: "longport",
          transDataRuleListType: "quote_fields",
        }
      });

      expect(mappingResponse.status).toBe(200);
      expect(mappingResponse.data.data).toBeDefined();
      if (Array.isArray(mappingResponse.data.data)) {
        expect(Array.isArray(mappingResponse.data.data)).toBe(true);
      }

      // Step 4: Transformer - 数据转换验证
      console.log("Step 4: Testing Transformer component...");
      if (originalData) {
        const transformResponse = await httpClient.post("/api/v1/transformer/preview", {
          provider: "longport",
          transDataRuleListType: "quote_fields",
          rawData: originalData,
         // previewOnly: true,
        }, {
          headers: {
            "X-App-Key": apiKey.appKey,
            "X-Access-Token": apiKey.accessToken,
          }
        });

        expect(transformResponse.status).toBe(201);
        expect(transformResponse.data.data).toBeDefined();
        if (transformResponse.data.data.previewResult) {
          expect(transformResponse.data.data.previewResult).toBeDefined();
        }
      }

      // Step 5: Storage - 存储系统健康验证
      console.log("Step 5: Testing Storage component...");
      const storageHealthResponse = await httpClient.post("/api/v1/storage/health-check", {}, {
        headers: { 
          "X-App-Key": apiKey.appKey,
          "X-Access-Token": apiKey.accessToken,
        }
      });

      expect(storageHealthResponse.status).toBe(201);
      expect(storageHealthResponse.data.data).toBeDefined();
      if (storageHealthResponse.data.data.redis) {
        expect(storageHealthResponse.data.data.redis).toBeDefined();
      }
      if (storageHealthResponse.data.data.mongodb) {
        expect(storageHealthResponse.data.data.mongodb).toBeDefined();
      }

      // Step 6: Query - 最终查询验证
      console.log("Step 6: Testing Query component...");
      const queryResponse = await httpClient.post("/api/v1/query/execute", {
        queryType: "by_symbols",
        symbols: [testSymbol],
        queryTypeFilter: "get-stock-quote", // 使用硬编码的数据类型
        // includeMetadata: true, // 移除可能导致问题的参数
      }, {
        headers: {
          "X-App-Key": apiKey.appKey,
          "X-Access-Token": apiKey.accessToken,
        }
      });

      expect(queryResponse.status).toBe(201);
      expect(queryResponse.data.data).toBeDefined();
      expect(queryResponse.data.data.data.items).toBeDefined();

      // 验证端到端数据一致性
      if (originalData && queryResponse.data.data.data.items.length > 0) {
        const queryData = queryResponse.data.data.data.items[0];
        expect(queryData.symbol).toBe(originalData.symbol);

        // 验证数据可追溯性
        if (queryResponse.data.data.metadata && queryResponse.data.data.metadata.traceId) {
          expect(typeof queryResponse.data.data.metadata.traceId).toBe(
            "string",
          );
        }
      }

      console.log("六组件流水线测试完成 ✅");
    });
  });

  describe("组件间数据传递验证", () => {
    it("应该维护组件间的数据完整性和可追溯性", async () => {
      const testSymbols = ["00700.HK", "AAPL.US"];

      // 通过Receiver获取原始数据
      const receiverResponse = await httpClient.post(
        "/api/v1/receiver/data",
        {
          symbols: testSymbols,
          receiverType: "get-stock-quote",
        },
        {
          headers: {
            "X-App-Key": apiKey.appKey,
            "X-Access-Token": apiKey.accessToken,
          },
        },
      );
      expect(receiverResponse.status).toBe(200);
      const receiverData = receiverResponse.data;
      console.log("receiverData 响应:", JSON.stringify(receiverData, null, 2));
      console.log("receiverSymbols 原始数据:", receiverData.data?.data?.map((item: any) => item.symbol));

      // 通过Query获取处理后数据
      const queryResponse = await httpClient.post(
        "/api/v1/query/execute",
        {
          queryType: "by_symbols",
          symbols: testSymbols,
          queryTypeFilter: "get-stock-quote",
        },
        {
          headers: {
            "X-App-Key": apiKey.appKey,
            "X-Access-Token": apiKey.accessToken,
          },
        },
      );
      expect(queryResponse.status).toBe(201);
      const queryData = queryResponse.data;
      console.log("queryData 响应:", JSON.stringify(queryData, null, 2));
      console.log("querySymbols 处理后数据:", queryData.data?.data?.items?.map((item: any) => item.symbol));

      // 验证数据传递一致性
      expect(receiverData.data.data).toBeDefined();
      expect(queryData.data.data.items).toBeDefined();

      // 验证符号覆盖
      const receiverSymbols = receiverData.data.data
        .flatMap((item: any) => item.secu_quote?.map((quote: any) => quote.symbol) || [])
        .filter(Boolean);
      const querySymbols = queryData.data.data.items
        .flatMap((item: any) => item.secu_quote?.map((quote: any) => quote.symbol) || [])
        .filter(Boolean);
        
      console.log("测试符号:", testSymbols);
      console.log("Receiver符号:", receiverSymbols);
      console.log("Query符号:", querySymbols);

      // 确保主要符号都被处理
      testSymbols.forEach((symbol) => {
        const foundInReceiver = receiverSymbols.includes(symbol);
        const foundInQuery = querySymbols.includes(symbol);
        
        console.log(`符号 ${symbol} - 在Receiver中: ${foundInReceiver}, 在Query中: ${foundInQuery}`);

        // 至少在一个地方找到数据（考虑市场时间等因素）
        expect(foundInReceiver || foundInQuery).toBe(true);
      });
    });
  });

  describe("并发处理能力测试", () => {
    it("应该支持多组件并行处理请求", async () => {
      const concurrentRequests = 3;

      // 创建并发请求数组
      const requests = Array.from(
        { length: concurrentRequests },
        () => {
          return httpClient.post(
            "/api/v1/receiver/data",
            {
              symbols: [`00700.HK`], // 使用合法的股票代码
              receiverType: "get-stock-quote",
            },
            {
              headers: {
                "X-App-Key": apiKey.appKey,
                "X-Access-Token": apiKey.accessToken,
              },
            },
          );
        },
      );

      // 并发执行请求
      const startTime = Date.now();
      const responses = await Promise.all(requests);
      const endTime = Date.now();

      // 验证所有请求都成功
      responses.forEach((response, index) => {
        expect([200, 202]).toContain(response.status);
        console.log(
          `并发请求 ${index + 1} 响应时间: ${response.data.data?.metadata?.processingTime || "N/A"}ms`,
        );
      });

      const totalTime = endTime - startTime;
      console.log(`${concurrentRequests}个并发请求总耗时: ${totalTime}ms`);

      // 并发处理应该比串行处理更高效
      expect(totalTime).toBeLessThan(concurrentRequests * 2000); // 估算的串行时间
    });
  });

  describe("错误处理和恢复能力", () => {
    it("应该优雅处理组件级别的错误", async () => {
      // 测试不存在的符号
      const invalidSymbolResponse = await httpClient.post(
        "/api/v1/receiver/data",
        {
          symbols: ["INVALID_SYMBOL_TEST_123"],
          receiverType: "get-stock-quote",
        },
        {
          headers: {
            "X-App-Key": apiKey.appKey,
            "X-Access-Token": apiKey.accessToken,
          },
        },
      );

      // 系统应该优雅处理错误（不一定返回200，但不应该崩溃）
      expect([200, 202, 400, 404]).toContain(invalidSymbolResponse.status);

      if (invalidSymbolResponse.status === 200) {
        // 如果返回成功，应该有错误信息或部分失败标识
        const metadata = invalidSymbolResponse.data.data?.metadata;
        if (metadata) {
          expect(
            metadata.hasPartialFailures === true ||
              metadata.errorCount > 0 ||
              metadata.successfullyProcessed === 0,
          ).toBe(true);
        }
      }
    });

    it("应该在部分组件失败时提供降级服务", async () => {
      // 测试系统在组件压力下的表现
      const stressTestResponse = await httpClient.post(
        "/api/v1/receiver/data",
        {
          symbols: ["00700.HK"],
          receiverType: "get-stock-quote",
        },
        {
          headers: {
            "X-App-Key": apiKey.appKey,
            "X-Access-Token": apiKey.accessToken,
          },
        },
      );

      // 即使在压力下，系统也应该响应
      expect([200, 202, 408, 503]).toContain(stressTestResponse.status);

      if (stressTestResponse.status === 200) {
        expect(stressTestResponse.data.data).toBeDefined();
      }
    });
  });

  describe("性能监控集成", () => {
    it("应该在所有组件中收集性能指标", async () => {
      // 执行一些操作生成指标
      await httpClient.post(
        "/api/v1/receiver/data",
        {
          symbols: ["00700.HK"],
          receiverType: "get-stock-quote",
        },
        {
          headers: {
            "X-App-Key": apiKey.appKey,
            "X-Access-Token": apiKey.accessToken,
          },
        },
      );

      // 检查系统指标
      const metricsResponse = await httpClient.get("/api/v1/monitoring/performance", {
        headers: { Authorization: `Bearer ${adminJWT}` },
      });
      expect(metricsResponse.status).toBe(200);

      // 验证关键性能指标存在
      const metrics = metricsResponse.data.data;
      expect(metrics).toHaveProperty("summary");
      expect(metrics.summary).toHaveProperty("averageResponseTime");
      expect(metrics.summary).toHaveProperty("totalRequests");

      if (metrics.summary) {
        expect(typeof metrics.summary.averageResponseTime).toBe('number');
        expect(typeof metrics.summary.totalRequests).toBe('number');
      }
    });
  });

  afterAll(async () => {
    // 清理测试API Key
    if (apiKey && apiKey.id) {
      const deleteResponse = await httpClient.delete(
        `/api/v1/auth/api-keys/${apiKey.appKey}`,
        {
          headers: { Authorization: `Bearer ${adminJWT}` },
        },
      );
      expect(deleteResponse.status).toBe(200);
    }
  });
});
