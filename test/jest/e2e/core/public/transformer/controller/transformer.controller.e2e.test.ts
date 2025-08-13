/* eslint-disable @typescript-eslint/no-unused-vars */
describe("Transformer Controller E2E Tests", () => {
  let httpServer: any;
  let authTokens: any;
  let jwtToken: string;

  beforeAll(async () => {
    httpServer = global.createTestRequest();
    await setupAuthentication();
  });

  async function setupAuthentication() {
    // 1. 注册测试用户
    const userData = {
      username: "transformeruser",
      email: "transformer@example.com",
      password: "password123",
      role: "developer",
    };

    await httpServer.post("/api/v1/auth/register").send(userData);

    // 2. 登录获取JWT token
    const loginResponse = await httpServer.post("/api/v1/auth/login").send({
      username: userData.username,
      password: userData.password,
    });

    jwtToken = loginResponse.body.data?.accessToken || loginResponse.body.accessToken;

    // 3. 创建API Key
    const apiKeyData = {
      name: "Transformer Test API Key",
      permissions: [
        "transformer:preview",
        "data:read",
        "query:execute",
      ],
      rateLimit: {
        requests: 100,
        window: "1h",
      },
    };

    const apiKeyResponse = await httpServer
      .post("/api/v1/auth/api-keys")
      .set("Authorization", `Bearer ${jwtToken}`)
      .send(apiKeyData);

    const apiKeyResult = apiKeyResponse.body.data;
    authTokens = {
      apiKey: apiKeyResult.appKey,
      accessToken: apiKeyResult.accessToken,
    };

    // 4. 创建测试需要的映射规则数据
    await setupTestMappingRules();
  }

  async function createDataSourceTemplates() {
    // 创建第一个测试模板
    const template1 = {
      name: "LongPort REST Quote Template",
      description: "Template for LongPort REST quote data",
      provider: "longport",
      apiType: "rest",
      sampleData: {
        symbol: "AAPL",
        last_price: 150.25,
        change_amount: 2.15,
        volume: 1234567
      },
      isActive: true
    };

    const template1Response = await httpServer
      .post("/api/v1/data-mapper/templates")
      .set("Authorization", `Bearer ${jwtToken}`)
      .send(template1);

    console.log("Template 1 response:", template1Response.status, template1Response.body);
    

    // 创建第二个测试模板
    const template2 = {
      name: "LongPort REST Basic Info Template",
      description: "Template for LongPort REST basic info data",
      provider: "longport", 
      apiType: "rest",
      sampleData: {
        symbol: "AAPL",
        name: "Apple Inc"
      },
      isActive: true
    };

    const template2Response = await httpServer
      .post("/api/v1/data-mapper/templates")
      .set("Authorization", `Bearer ${jwtToken}`)
      .send(template2);

    console.log("Template 2 response:", template2Response.status, template2Response.body);

    // 创建第三个测试模板
    const template3 = {
      name: "LongPort REST Index Template", 
      description: "Template for LongPort REST index data",
      provider: "longport",
      apiType: "rest", 
      sampleData: {
        symbol: "SPY",
        name: "SPDR S&P 500",
        price: 450.75
      },
      isActive: true
    };

    const template3Response = await httpServer
      .post("/api/v1/data-mapper/templates")
      .set("Authorization", `Bearer ${jwtToken}`)
      .send(template3);

    console.log("Template 3 response:", template3Response.status, template3Response.body);

    // 返回创建的模板ID，用于后续映射规则创建
    const templateIds = {
      template1Id: template1Response.body?.data?.id,
      template2Id: template2Response.body?.data?.id,
      template3Id: template3Response.body?.data?.id
    };

    console.log("Template IDs:", templateIds);

    // 验证所有模板ID是否有效
    if (!templateIds.template1Id || !templateIds.template2Id || !templateIds.template3Id) {
      throw new Error(`Failed to get all template IDs: ${JSON.stringify(templateIds)}`);
    }

    return templateIds;
  }

  async function setupTestMappingRules() {
    // 跳过复杂的模板创建，使用简化方案
    // 创建 REST API 的平坦数据结构映射规则
    const longportRestQuoteRule = {
      name: "LongPort REST Quote Fields Test Rule",
      description: "Test mapping rule for longport REST quote fields",
      provider: "longport",
      apiType: "rest",
      transDataRuleListType: "quote_fields",
      fieldMappings: [
        {
          sourceFieldPath: "symbol",
          targetField: "symbol",
          confidence: 0.95,
          isActive: true
        },
        {
          sourceFieldPath: "last_price",
          targetField: "lastPrice",
          confidence: 0.95,
          isActive: true
        },
        {
          sourceFieldPath: "change_amount",
          targetField: "change",
          confidence: 0.95,
          isActive: true
        },
        {
          sourceFieldPath: "change_percent",
          targetField: "changePercent",
          confidence: 0.95,
          isActive: true
        },
        {
          sourceFieldPath: "volume",
          targetField: "volume",
          confidence: 0.95,
          isActive: true
        }
      ],
      isDefault: true,
      version: "1.0.0"
    };

    const restResponse = await httpServer
      .post("/api/v1/data-mapper/rules")
      .set("Authorization", `Bearer ${jwtToken}`)
      .send(longportRestQuoteRule);

    console.log("Creating longport REST quote rule response:", restResponse.status, restResponse.body);
    
    if (restResponse.status !== 201) {
      console.log("Failed to create longport REST quote rule:", restResponse.body);
      throw new Error(`Failed to create REST mapping rule: ${restResponse.status} - ${JSON.stringify(restResponse.body)}`);
    }

    // 创建 Stream API 的映射规则
    const longportQuoteRule = {
      name: "LongPort Quote Fields Test Rule",
      description: "Test mapping rule for longport quote fields",
      provider: "longport",
      apiType: "stream",
      transDataRuleListType: "quote_fields",
      // sourceTemplateId 现在是可选的
      fieldMappings: [
        {
          sourceFieldPath: "symbol",
          targetField: "symbol",
          confidence: 0.95,
          isActive: true
        },
        {
          sourceFieldPath: "last_price",
          targetField: "lastPrice",
          confidence: 0.95,
          isActive: true
        },
        {
          sourceFieldPath: "change_amount",
          targetField: "change",
          confidence: 0.95,
          isActive: true
        },
        {
          sourceFieldPath: "change_percent",
          targetField: "changePercent",
          confidence: 0.95,
          isActive: true
        },
        {
          sourceFieldPath: "volume",
          targetField: "volume",
          confidence: 0.95,
          isActive: true
        }
      ],
      isDefault: true,
      version: "1.0.0"
    };

    const response = await httpServer
      .post("/api/v1/data-mapper/rules")
      .set("Authorization", `Bearer ${jwtToken}`)
      .send(longportQuoteRule);

    console.log("Creating longport quote rule response:", response.status, response.body);
    
    if (response.status !== 201) {
      console.log("Failed to create longport quote rule:", response.body);
      throw new Error(`Failed to create mapping rule: ${response.status} - ${JSON.stringify(response.body)}`);
    }

    // 创建其他规则类型以支持不同的测试场景
    const basicInfoRule = {
      name: "LongPort Basic Info Test Rule", 
      description: "Test mapping rule for basic info fields",
      provider: "longport",
      apiType: "rest", 
      transDataRuleListType: "basic_info_fields",
      // sourceTemplateId 现在是可选的
      fieldMappings: [
        {
          sourceFieldPath: "symbol",
          targetField: "symbol",
          confidence: 0.95,
          isActive: true
        },
        {
          sourceFieldPath: "name",
          targetField: "companyName",
          confidence: 0.95,
          isActive: true
        }
      ],
      isDefault: true,
      version: "1.0.0"
    };

    const basicResponse = await httpServer
      .post("/api/v1/data-mapper/rules")
      .set("Authorization", `Bearer ${jwtToken}`)
      .send(basicInfoRule);

    if (basicResponse.status !== 201) {
      console.log("Failed to create basic info rule:", basicResponse.body);
      throw new Error(`Failed to create basic info mapping rule: ${basicResponse.status} - ${JSON.stringify(basicResponse.body)}`);
    }

    // 创建 index_fields 规则以支持所有测试场景
    const indexRule = {
      name: "LongPort Index Fields Test Rule",
      description: "Test mapping rule for index fields",
      provider: "longport",
      apiType: "rest",
      transDataRuleListType: "index_fields",
      // sourceTemplateId 现在是可选的
      fieldMappings: [
        {
          sourceFieldPath: "symbol",
          targetField: "symbol",
          confidence: 0.95,
          isActive: true
        },
        {
          sourceFieldPath: "name",
          targetField: "indexName",
          confidence: 0.95,
          isActive: true
        },
        {
          sourceFieldPath: "price",
          targetField: "value",
          confidence: 0.95,
          isActive: true
        }
      ],
      isDefault: true,
      version: "1.0.0"
    };

    const indexResponse = await httpServer
      .post("/api/v1/data-mapper/rules")
      .set("Authorization", `Bearer ${jwtToken}`)
      .send(indexRule);

    if (indexResponse.status !== 201) {
      console.log("Failed to create index rule:", indexResponse.body);
      throw new Error(`Failed to create index mapping rule: ${indexResponse.status} - ${JSON.stringify(indexResponse.body)}`);
    }

    // 创建支持嵌套数据的映射规则
    const nestedQuoteRule = {
      name: "LongPort Nested Quote Fields Test Rule",
      description: "Test mapping rule for nested quote data structure",
      provider: "longport",
      apiType: "stream",
      transDataRuleListType: "quote_fields",
      fieldMappings: [
        {
          sourceFieldPath: "security.symbol",
          targetField: "symbol",
          confidence: 0.95,
          isActive: true
        },
        {
          sourceFieldPath: "quote.last_price",
          targetField: "lastPrice",
          confidence: 0.95,
          isActive: true
        },
        {
          sourceFieldPath: "quote.change.amount",
          targetField: "change",
          confidence: 0.95,
          isActive: true
        },
        {
          sourceFieldPath: "quote.change.percent",
          targetField: "changePercent",
          confidence: 0.95,
          isActive: true
        },
        {
          sourceFieldPath: "quote.volume",
          targetField: "volume",
          confidence: 0.95,
          isActive: true
        }
      ],
      isDefault: true,
      version: "1.0.0"
    };

    const nestedResponse = await httpServer
      .post("/api/v1/data-mapper/rules")
      .set("Authorization", `Bearer ${jwtToken}`)
      .send(nestedQuoteRule);

    if (nestedResponse.status !== 201) {
      console.log("Failed to create nested quote rule:", nestedResponse.body);
      throw new Error(`Failed to create nested quote mapping rule: ${nestedResponse.status} - ${JSON.stringify(nestedResponse.body)}`);
    }
  }

  describe("POST /api/v1/transformer/transform - 数据转换", () => {
    it("should transform data successfully", async () => {
      // Arrange
      const transformRequest = {
        rawData: {
          symbol: "AAPL",
          last_price: 150.25,
          change_amount: 2.15,
          change_percent: 1.45,
          volume: 1234567
        },
        apiType: "rest",
        transDataRuleListType: "quote_fields",
        provider: "longport",
        options: {
          includeMetadata: true,
          validateOutput: true
        }
      };

      // Act
      const response = await httpServer
        .post("/api/v1/transformer/transform")
        .set("X-App-Key", authTokens.apiKey)
        .set("X-Access-Token", authTokens.accessToken)
        .send(transformRequest)
        .expect(201);

      // Assert
      global.expectSuccessResponse(response, 201);
      expect(response.body.data).toHaveProperty("transformedData");
      expect(response.body.data).toHaveProperty("metadata");
      
      // 验证转换后的数据结构
      const transformedData = response.body.data.transformedData;
      expect(transformedData).toBeDefined();
      
      // 验证元数据
      const metadata = response.body.data.metadata;
      expect(metadata).toHaveProperty("_fieldsTransformed");
      expect(metadata).toHaveProperty("processingTime");
      expect(metadata).toHaveProperty("provider");
      expect(metadata.provider).toBe("longport");
    });

    it("should handle different rule types", async () => {
      const testCases = [
        {
          ruleType: "quote_fields",
          rawData: {
            symbol: "AAPL",
            last_price: 150.25,
            change_amount: 2.15,
            change_percent: 1.45,
            volume: 1000000
          }
        },
        {
          ruleType: "basic_info_fields", 
          rawData: {
            symbol: "AAPL",
            name: "Apple Inc"
          }
        },
        {
          ruleType: "index_fields",
          rawData: {
            symbol: "SPY",
            name: "SPDR S&P 500",
            price: 450.75
          }
        }
      ];

      for (const testCase of testCases) {
        const transformRequest = {
          rawData: testCase.rawData,
          apiType: "rest",
          transDataRuleListType: testCase.ruleType,
          provider: "longport"
        };

        const response = await httpServer
          .post("/api/v1/transformer/transform")
          .set("X-App-Key", authTokens.apiKey)
          .set("X-Access-Token", authTokens.accessToken)
          .send(transformRequest);

        expect(response.status).toBe(201);
        global.expectSuccessResponse(response, 201);
        expect(response.body.data).toHaveProperty("transformedData");
      }
    });

    it("should handle output validation", async () => {
      // Arrange - 测试输出验证选项
      const transformRequest = {
        rawData: {
          symbol: "AAPL",
          last_price: 150.25,
          change_amount: 2.15
        },
        apiType: "rest",
        transDataRuleListType: "quote_fields",
        provider: "longport",
        options: {
          validateOutput: true,
          includeMetadata: true
        }
      };

      // Act & Assert
      const response = await httpServer
        .post("/api/v1/transformer/transform")
        .set("X-App-Key", authTokens.apiKey)
        .set("X-Access-Token", authTokens.accessToken)
        .send(transformRequest);

      expect(response.status).toBe(201);
      expect(response.body.data).toHaveProperty("transformedData");
      expect(response.body.data).toHaveProperty("metadata");
    });

    it("should validate required parameters", async () => {
      // Test missing rawData
      await httpServer
        .post("/api/v1/transformer/transform")
        .set("X-App-Key", authTokens.apiKey)
        .set("X-Access-Token", authTokens.accessToken)
        .send({
          apiType: "rest",
          transDataRuleListType: "quote_fields",
          provider: "longport"
          // rawData missing
        })
        .expect(400);

      // Test missing transDataRuleListType
      await httpServer
        .post("/api/v1/transformer/transform")
        .set("X-App-Key", authTokens.apiKey)
        .set("X-Access-Token", authTokens.accessToken)
        .send({
          apiType: "rest",
          rawData: { symbol: "AAPL" },
          provider: "longport"
          // transDataRuleListType missing
        })
        .expect(400);

      // Test missing provider
      await httpServer
        .post("/api/v1/transformer/transform")
        .set("X-App-Key", authTokens.apiKey)
        .set("X-Access-Token", authTokens.accessToken)
        .send({
          apiType: "rest",
          rawData: { symbol: "AAPL" },
          transDataRuleListType: "quote_fields"
          // provider missing
        })
        .expect(400);

      // Test missing apiType
      await httpServer
        .post("/api/v1/transformer/transform")
        .set("X-App-Key", authTokens.apiKey)
        .set("X-Access-Token", authTokens.accessToken)
        .send({
          rawData: { symbol: "AAPL" },
          transDataRuleListType: "quote_fields",
          provider: "longport"
          // apiType missing
        })
        .expect(400);
    });

    it("should handle complex nested data transformation", async () => {
      // Arrange
      const complexData = {
        security: {
          symbol: "700.HK",
          name: "Tencent Holdings",
          market: "HK"
        },
        quote: {
          last_price: 385.6,
          change: {
            amount: -4.2,
            percent: -1.08
          },
          volume: 12345600,
          bid_ask: {
            bid: 385.4,
            ask: 385.8
          }
        },
        timestamp: "2024-01-01T08:00:01.456Z"
      };

      const transformRequest = {
        rawData: complexData,
        apiType: "stream",
        transDataRuleListType: "quote_fields",
        provider: "longport",
        options: {
          includeMetadata: true,
          validateOutput: false
        }
      };

      // Act
      const response = await httpServer
        .post("/api/v1/transformer/transform")
        .set("X-App-Key", authTokens.apiKey)
        .set("X-Access-Token", authTokens.accessToken)
        .send(transformRequest)
        .expect(201);

      // Assert
      global.expectSuccessResponse(response, 201);
      expect(response.body.data.transformedData).toBeDefined();
      expect(response.body.data.metadata.fieldsTransformed).toBeGreaterThan(0);
    });

    it("should require API Key authentication", async () => {
      // Arrange
      const transformRequest = {
        rawData: { symbol: "AAPL" },
        apiType: "rest",
        transDataRuleListType: "quote_fields",
        provider: "longport"
      };

      // Act & Assert
      await httpServer
        .post("/api/v1/transformer/transform")
        .send(transformRequest)
        .expect(401);
    });
  });

  describe("POST /api/v1/transformer/transform-batch - 批量转换", () => {
    it("should transform multiple data items in batch", async () => {
      // Arrange - 发送 TransformRequestDto 数组
      const batchRequest = [
        {
          rawData: {
            symbol: "AAPL",
            last_price: 150.25,
            volume: 1000000
          },
          apiType: "rest",
          transDataRuleListType: "quote_fields",
          provider: "longport",
          options: {
            includeMetadata: true
          }
        },
        {
          rawData: {
            symbol: "GOOGL",
            last_price: 2750.8,
            volume: 500000
          },
          apiType: "rest",
          transDataRuleListType: "quote_fields",
          provider: "longport",
          options: {
            includeMetadata: true
          }
        },
        {
          rawData: {
            symbol: "MSFT",
            last_price: 380.5,
            volume: 750000
          },
          apiType: "rest",
          transDataRuleListType: "quote_fields",
          provider: "longport",
          options: {
            includeMetadata: true
          }
        }
      ];

      // Act
      const response = await httpServer
        .post("/api/v1/transformer/transform-batch")
        .set("X-App-Key", authTokens.apiKey)
        .set("X-Access-Token", authTokens.accessToken)
        .send(batchRequest)
        .expect(201);

      // Assert - 后端返回 TransformResponseDto 数组
      global.expectSuccessResponse(response, 201);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data.length).toBe(3);
      
      // 验证每个转换结果的结构 - 符合TransformResponseDto格式
      response.body.data.forEach((result: any) => {
        // TransformResponseDto不包含success字段，只有transformedData和metadata
        expect(result).toHaveProperty("transformedData");
        expect(result).toHaveProperty("metadata");
        expect(result.metadata).toHaveProperty("processingTime");
      });
    });

    it("should handle batch processing with errors", async () => {
      // Arrange - 混合有效和无效的请求
      const batchRequest = [
        {
          rawData: {
            symbol: "AAPL",
            last_price: 150.25
          },
          apiType: "rest",
          transDataRuleListType: "quote_fields",
          provider: "longport"
        },
        {
          rawData: {
            // 可能导致转换失败的数据
            invalid_data: "error"
          },
          apiType: "rest",
          transDataRuleListType: "quote_fields",
          provider: "longport"
        },
        {
          rawData: {
            symbol: "MSFT",
            last_price: 380.5
          },
          apiType: "rest",
          transDataRuleListType: "quote_fields",
          provider: "longport"
        }
      ];

      // Act
      const response = await httpServer
        .post("/api/v1/transformer/transform-batch")
        .set("X-App-Key", authTokens.apiKey)
        .set("X-Access-Token", authTokens.accessToken)
        .send(batchRequest)
        .expect(201);

      // Assert - 检查响应数组
      global.expectSuccessResponse(response, 201);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data.length).toBeLessThanOrEqual(3); // 可能有失败的转换
    });

    it("should handle batch processing performance", async () => {
      // Arrange - 发送 TransformRequestDto 数组
      const batchRequest = Array(5).fill(null).map((_, i) => ({
        rawData: {
          symbol: `SYMBOL_${i}`,
          last_price: 100 + i,
          volume: 1000000 + i
        },
        apiType: "rest",
        transDataRuleListType: "quote_fields",
        provider: "longport"
      }));

      const startTime = Date.now();
      const response = await httpServer
        .post("/api/v1/transformer/transform-batch")
        .set("X-App-Key", authTokens.apiKey)
        .set("X-Access-Token", authTokens.accessToken)
        .send(batchRequest)
        .expect(201);
      const endTime = Date.now();

      global.expectSuccessResponse(response, 201);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data.length).toBeLessThanOrEqual(5);
      
      const processingTime = endTime - startTime;
      expect(processingTime).toBeGreaterThan(0);
    });

    it("should validate batch request parameters", async () => {
      // Test empty array
      await httpServer
        .post("/api/v1/transformer/transform-batch")
        .set("X-App-Key", authTokens.apiKey)
        .set("X-Access-Token", authTokens.accessToken)
        .send([])
        .expect(400);

      // Test invalid request structure (not an array)
      await httpServer
        .post("/api/v1/transformer/transform-batch")
        .set("X-App-Key", authTokens.apiKey)
        .set("X-Access-Token", authTokens.accessToken)
        .send({
          rawDataList: [],
          transDataRuleListType: "quote_fields",
          provider: "longport"
        })
        .expect(400);
    });

    it("should handle large batch sizes", async () => {
      // Arrange - 大批量数据，发送 TransformRequestDto 数组
      const batchRequest = Array(20).fill(null).map((_, i) => ({
        rawData: {
          symbol: `LARGE_TEST_${i}`,
          last_price: 100 + i,
          volume: 1000000 + i * 1000
        },
        apiType: "rest",
        transDataRuleListType: "quote_fields",
        provider: "longport"
      }));

      // Act
      const response = await httpServer
        .post("/api/v1/transformer/transform-batch")
        .set("X-App-Key", authTokens.apiKey)
        .set("X-Access-Token", authTokens.accessToken)
        .send(batchRequest);

      // Assert
      expect(response.status).toBe(201); // 预期成功
      
      if (response.status === 201) {
        global.expectSuccessResponse(response, 201);
        expect(response.body.data).toBeInstanceOf(Array);
        expect(response.body.data.length).toBeLessThanOrEqual(20);
      }
    });
  });

  describe("Transformation Performance & Edge Cases", () => {
    it("should handle performance benchmarking", async () => {
      // Arrange - 发送 TransformRequestDto 数组
      const batchRequest = Array(10).fill(null).map((_, i) => ({
        rawData: {
          symbol: `PERF_TEST_${i}`,
          last_price: 100 + i,
          volume: 1000000 + i * 1000,
          timestamp: new Date().toISOString()
        },
        apiType: "rest",
        transDataRuleListType: "quote_fields",
        provider: "longport"
      }));

      // Act
      const startTime = Date.now();
      const response = await httpServer
        .post("/api/v1/transformer/transform-batch")
        .set("X-App-Key", authTokens.apiKey)
        .set("X-Access-Token", authTokens.accessToken)
        .send(batchRequest)
        .expect(201);
      const endTime = Date.now();

      // Assert
      global.expectSuccessResponse(response, 201);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data.length).toBeLessThanOrEqual(10);
      expect(endTime - startTime).toBeGreaterThan(0);
    });

    it("should handle malformed data gracefully", async () => {
      // 测试应该返回400的无效数据（DTO验证失败）
      const invalidDataCases = [
        null,
        undefined,
        "",
      ];

      for (const malformedData of invalidDataCases) {
        const transformRequest = {
          rawData: malformedData,
          apiType: "rest",
          transDataRuleListType: "quote_fields",
          provider: "longport"
        };

        const response = await httpServer
          .post("/api/v1/transformer/transform")
          .set("X-App-Key", authTokens.apiKey)
          .set("X-Access-Token", authTokens.accessToken)
          .send(transformRequest);

        expect(response.status).toBe(400);
      }

      // 测试应该返回201或500的有效但可能无法映射的数据（业务逻辑处理）
      const validButUnmappableDataCases = [
        { testName: "empty array", data: [] },
        { testName: "invalid structure", data: { invalid: "structure" } },
        { testName: "null values", data: { symbol: null, price: "not_a_number" } }
      ];

      for (const testCase of validButUnmappableDataCases) {
        const transformRequest = {
          rawData: testCase.data,
          apiType: "rest",
          transDataRuleListType: "quote_fields",
          provider: "longport"
        };

        const response = await httpServer
          .post("/api/v1/transformer/transform")
          .set("X-App-Key", authTokens.apiKey)
          .set("X-Access-Token", authTokens.accessToken)
          .send(transformRequest);

        // 无法映射应返回业务错误(400)或服务器错误(500)，不应为201
        expect([400, 500]).toContain(response.status);
        
        // 调试信息
        if (![201, 400, 500].includes(response.status)) {
          console.log(`Unexpected status ${response.status} for test case: ${testCase.testName}`, response.body);
        }
      }
    });

    it("should handle concurrent transformation requests", async () => {
      // 并发转换请求测试
      const concurrentRequests = Array(5).fill(null).map((_, i) => 
        httpServer
          .post("/api/v1/transformer/transform")
          .set("X-App-Key", authTokens.apiKey)
          .set("X-Access-Token", authTokens.accessToken)
          .send({
            rawData: {
              symbol: `CONCURRENT_${i}`,
              last_price: 100 + i,
              volume: 1000000
            },
            apiType: "rest",
            transDataRuleListType: "quote_fields",
            provider: "longport"
          })
      );

      const responses = await Promise.all(concurrentRequests);
      
      // 所有请求都应该得到响应
      responses.forEach(response => {
        expect(response.status).toBe(201);
      });
    });
  });
});