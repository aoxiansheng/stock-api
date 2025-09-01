/* eslint-disable @typescript-eslint/no-unused-vars */
/**
 * MappingRuleController 端到端测试
 * 测试映射规则管理和测试功能
 */

describe("MappingRuleController E2E", () => {
  let request: any;
  let jwtToken: string;
  let apiKey: any;
  let createdRuleId: string;
  let templateId: string;

  beforeAll(async () => {
    request = global.createTestRequest();

    // 获取测试凭证
    const { apiKey: testApiKey, jwtToken: testJwtToken } =
      await global.createTestCredentials();
    apiKey = testApiKey;
    jwtToken = testJwtToken;

    // 创建一个测试用模板
    const templateRequest = {
      name: "Mapping Rule Test Template",
      provider: "longport",
      apiType: "rest",
      description: "用于映射规则测试的模板",
      sampleData: {
        symbol: "700.HK",
        last_done: 561.0,
        prev_close: 558.5,
        volume: 11292534,
      },
      extractedFields: [
        {
          fieldPath: "symbol",
          fieldName: "symbol",
          fieldType: "string",
          sampleValue: "700.HK",
          confidence: 0.95,
          isNested: false,
          nestingLevel: 0,
        },
        {
          fieldPath: "last_done",
          fieldName: "last_done",
          fieldType: "number",
          sampleValue: 561.0,
          confidence: 0.9,
          isNested: false,
          nestingLevel: 0,
        },
      ],

      confidence: 0.9,
    };

    try {
      const templateResponse = await request
        .post("/api/v1/data-mapper/admin/templates")
        .set("Authorization", `Bearer ${jwtToken}`)
        .send(templateRequest);

      if (templateResponse.status === 201) {
        templateId = templateResponse.body.data.id;
      }
    } catch (error) {
      console.log("模板创建失败，某些测试可能会被跳过");
    }
  });

  describe("POST /api/v1/data-mapper/rules", () => {
    describe("✅ 成功场景", () => {
      it("应该成功创建映射规则", async () => {
        // Arrange
        const ruleRequest = {
          name: "E2E Test Mapping Rule",
          provider: "longport",
          apiType: "rest",
          transDataRuleListType: "quote_fields",
          description: "端到端测试用映射规则",
          sourceTemplateId: templateId,
          fieldMappings: [
            {
              sourceFieldPath: "symbol",
              targetField: "symbol",
              confidence: 0.95,
              description: "股票代码映射",
              isActive: true,
            },
            {
              sourceFieldPath: "last_done",
              targetField: "lastPrice",
              confidence: 0.9,
              description: "最新价格映射",
              isActive: true,
            },
            {
              sourceFieldPath: "prev_close",
              targetField: "previousClose",
              confidence: 0.85,
              description: "昨收价映射",
              isActive: true,
            },
            {
              sourceFieldPath: "volume",
              targetField: "volume",
              transform: {
                type: "divide",
                value: 1000,
              },
              confidence: 0.8,
              description: "成交量映射（转换为千股）",
              isActive: true,
            },
          ],
          isDefault: false,
          version: "1.0.0",
        };

        // Act
        const response = await request
          .post("/api/v1/data-mapper/rules")
          .set("Authorization", `Bearer ${jwtToken}`)
          .send(ruleRequest)
          .expect(201);

        // Assert
        global.expectSuccessResponse(response, 201);
        const result = response.body.data;

        expect(result).toHaveProperty("id");
        expect(result).toHaveProperty("name", "E2E Test Mapping Rule");
        expect(result).toHaveProperty("provider", "longport");
        expect(result).toHaveProperty("apiType", "rest");
        expect(result).toHaveProperty("transDataRuleListType", "quote_fields");
        expect(result).toHaveProperty("fieldMappings");
        expect(result).toHaveProperty("version", "1.0.0");
        expect(result).toHaveProperty("overallConfidence");

        expect(result.fieldMappings).toBeInstanceOf(Array);
        expect(result.fieldMappings).toHaveLength(4);

        // 验证包含转换规则的字段映射
        const volumeMapping = result.fieldMappings.find(
          (m) => m.targetField === "volume",
        );
        expect(volumeMapping).toBeDefined();
        expect(volumeMapping.transform).toMatchObject({
          type: "divide",
          value: 1000,
        });

        // 保存创建的规则ID
        createdRuleId = result.id;
      });

      it("应该成功创建带有回退路径的映射规则", async () => {
        // Arrange
        const ruleWithFallbackRequest = {
          name: "Fallback Test Rule",
          provider: "longport",
          apiType: "stream",
          transDataRuleListType: "quote_fields",
          description: "带回退路径的映射规则",
          fieldMappings: [
            {
              sourceFieldPath: "price.current",
              targetField: "lastPrice",
              fallbackPaths: ["last_done", "current_price", "price"],
              confidence: 0.85,
              description: "价格映射（含回退路径）",
              isActive: true,
            },
            {
              sourceFieldPath: "trade_volume",
              targetField: "volume",
              fallbackPaths: ["volume", "vol"],
              confidence: 0.8,
              description: "成交量映射（含回退路径）",
              isActive: true,
            },
          ],
          isDefault: false,
          version: "1.0.0",
        };

        // Act
        const response = await request
          .post("/api/v1/data-mapper/rules")
          .set("Authorization", `Bearer ${jwtToken}`)
          .send(ruleWithFallbackRequest)
          .expect(201);

        // Assert
        global.expectSuccessResponse(response, 201);
        const result = response.body.data;

        // 验证回退路径
        const priceMapping = result.fieldMappings.find(
          (m) => m.targetField === "lastPrice",
        );
        expect(priceMapping.fallbackPaths).toEqual([
          "last_done",
          "current_price",
          "price",
        ]);
      });

      it("应该成功创建默认映射规则", async () => {
        // Arrange
        const defaultRuleRequest = {
          name: "Default Test Rule",
          provider: "test",
          apiType: "rest",
          transDataRuleListType: "basic_info_fields",
          description: "默认映射规则测试",
          fieldMappings: [
            {
              sourceFieldPath: "test_field",
              targetField: "testField",
              confidence: 0.9,
              isActive: true,
            },
          ],
          isDefault: true, // 设置为默认规则
          version: "1.0.0",
        };

        // Act
        const response = await request
          .post("/api/v1/data-mapper/rules")
          .set("Authorization", `Bearer ${jwtToken}`)
          .send(defaultRuleRequest)
          .expect(201);

        // Assert
        global.expectSuccessResponse(response, 201);
        const result = response.body.data;
        expect(result).toHaveProperty("isDefault", true);
      });
    });

    describe("❌ 失败场景", () => {
      it("应该在缺少必需字段时返回400错误", async () => {
        // Arrange - 缺少name字段
        const invalidRequest = {
          provider: "longport",
          apiType: "rest",
          transDataRuleListType: "quote_fields",
          fieldMappings: [],
        };

        // Act & Assert
        const response = await request
          .post("/api/v1/data-mapper/rules")
          .set("Authorization", `Bearer ${jwtToken}`)
          .send(invalidRequest)
          .expect(400);

        global.expectErrorResponse(response, 400);
      });

      it("应该在重复规则名称时返回冲突错误", async () => {
        // Arrange - 使用已存在的名称
        const duplicateRequest = {
          name: "E2E Test Mapping Rule", // 重复名称
          provider: "longport",
          apiType: "rest",
          transDataRuleListType: "quote_fields",
          fieldMappings: [
            {
              sourceFieldPath: "test",
              targetField: "test",
              confidence: 0.9,
              isActive: true,
            },
          ],
        };

        // Act & Assert
        const response = await request
          .post("/api/v1/data-mapper/rules")
          .set("Authorization", `Bearer ${jwtToken}`)
          .send(duplicateRequest)
          .expect(409);

        global.expectErrorResponse(response, 409);
      });

      it("应该在无效的transDataRuleListType时返回400错误", async () => {
        // Arrange
        const invalidTypeRequest = {
          name: "Invalid Type Rule",
          provider: "longport",
          apiType: "rest",
          transDataRuleListType: "invalid_type", // 无效类型
          fieldMappings: [
            {
              sourceFieldPath: "test",
              targetField: "test",
              confidence: 0.9,
              isActive: true,
            },
          ],
        };

        // Act & Assert
        const response = await request
          .post("/api/v1/data-mapper/rules")
          .set("Authorization", `Bearer ${jwtToken}`)
          .send(invalidTypeRequest)
          .expect(400);

        global.expectErrorResponse(response, 400);
      });

      it("应该在无认证时返回401错误", async () => {
        // Arrange
        const ruleRequest = {
          name: "Test Rule",
          provider: "longport",
          apiType: "rest",
          transDataRuleListType: "quote_fields",
          fieldMappings: [],
        };

        // Act & Assert
        await request
          .post("/api/v1/data-mapper/rules")
          .send(ruleRequest)
          .expect(401);
      });
    });
  });

  describe("GET /api/v1/data-mapper/rules", () => {
    describe("✅ 成功场景", () => {
      it("应该成功获取映射规则列表", async () => {
        // Act
        const response = await request
          .get("/api/v1/data-mapper/rules?page=1&limit=10")
          .set("X-App-Key", apiKey.appKey)
          .set("X-Access-Token", apiKey.accessToken)
          .expect(200);

        // Assert
        global.expectSuccessResponse(response, 200);
        const result = response.body.data;

        expect(result).toHaveProperty("_items");
        expect(result).toHaveProperty("pagination");
        expect(result.pagination).toHaveProperty("total");
        expect(result.pagination).toHaveProperty("page");
        expect(result.pagination).toHaveProperty("limit");

        expect(result.items).toBeInstanceOf(Array);
      });

      it("应该支持提供商筛选", async () => {
        // Act
        const response = await request
          .get("/api/v1/data-mapper/rules?provider=longport&page=1&limit=10")
          .set("X-App-Key", apiKey.appKey)
          .set("X-Access-Token", apiKey.accessToken)
          .expect(200);

        // Assert
        global.expectSuccessResponse(response, 200);
        const result = response.body.data;

        // 验证所有返回的规则都是longport提供商
        result.items.forEach((rule) => {
          expect(rule.provider).toBe("longport");
        });
      });

      it("应该支持规则类型筛选", async () => {
        // Act
        const response = await request
          .get(
            "/api/v1/data-mapper/rules?transDataRuleListType=quote_fields&page=1&limit=10",
          )
          .set("X-App-Key", apiKey.appKey)
          .set("X-Access-Token", apiKey.accessToken)
          .expect(200);

        // Assert
        global.expectSuccessResponse(response, 200);
        const result = response.body.data;

        // 验证所有返回的规则都是quote_fields类型
        result.items.forEach((rule) => {
          expect(rule.transDataRuleListType).toBe("quote_fields");
        });
      });

      it("应该支持分页查询", async () => {
        // Act
        const response = await request
          .get("/api/v1/data-mapper/rules?page=1&limit=2")
          .set("X-App-Key", apiKey.appKey)
          .set("X-Access-Token", apiKey.accessToken)
          .expect(200);

        // Assert
        global.expectSuccessResponse(response, 200);
        const result = response.body.data;

        expect(result.pagination.page).toBe(1);
        expect(result.pagination.limit).toBe(2);
        expect(result.items.length).toBeLessThanOrEqual(2);
      });
    });

    describe("❌ 失败场景", () => {
      it("应该在无认证时返回401错误", async () => {
        // Act & Assert
        await request.get("/api/v1/data-mapper/rules").expect(401);
      });
    });
  });

  describe("GET /api/v1/data-mapper/rules/:id", () => {
    describe("✅ 成功场景", () => {
      it("应该成功获取映射规则详情", async () => {
        // Skip if no rule was created
        if (!createdRuleId) {
          console.log("跳过规则详情测试 - 没有可用的规则ID");
          return;
        }

        // Act
        const response = await request
          .get(`/api/v1/data-mapper/rules/${createdRuleId}`)
          .set("X-App-Key", apiKey.appKey)
          .set("X-Access-Token", apiKey.accessToken)
          .expect(200);

        // Assert
        global.expectSuccessResponse(response, 200);
        const result = response.body.data;

        expect(result).toHaveProperty("id", createdRuleId);
        expect(result).toHaveProperty("name");
        expect(result).toHaveProperty("provider");
        expect(result).toHaveProperty("fieldMappings");
        expect(result.fieldMappings).toBeInstanceOf(Array);
      });
    });

    describe("❌ 失败场景", () => {
      it("应该在规则不存在时返回404错误", async () => {
        // Act & Assert
        const response = await request
          .get("/api/v1/data-mapper/rules/aaaaaaaaaaaaaaaaaaaaaaaa")
          .set("X-App-Key", apiKey.appKey)
          .set("X-Access-Token", apiKey.accessToken)
          .expect(404);

        global.expectErrorResponse(response, 404);
      });

      it("应该在无认证时返回401错误", async () => {
        // Act & Assert
        await request.get("/api/v1/data-mapper/rules/some-id").expect(401);
      });
    });
  });

  describe("POST /api/v1/data-mapper/rules/test", () => {
    describe("✅ 成功场景", () => {
      it("应该成功测试映射规则", async () => {
        // Skip if no rule was created
        if (!createdRuleId) {
          console.log("跳过规则测试 - 没有可用的规则ID");
          return;
        }

        // Arrange
        const testRequest = {
          dataMapperRuleId: createdRuleId,
          testData: {
            symbol: "700.HK",
            last_done: 561.0,
            prev_close: 558.5,
            volume: 11292534,
          },
          includeDebugInfo: true,
        };

        // Act
        const response = await request
          .post("/api/v1/data-mapper/rules/test")
          .set("X-App-Key", apiKey.appKey)
          .set("X-Access-Token", apiKey.accessToken)
          .send(testRequest)
          .expect(201);

        // Assert
        global.expectSuccessResponse(response, 201);
        const result = response.body.data;

        expect(result).toHaveProperty("dataMapperRuleId", createdRuleId);
        expect(result).toHaveProperty("ruleName");
        expect(result).toHaveProperty("originalData");
        expect(result).toHaveProperty("transformedData");
        expect(result).toHaveProperty("success");
        expect(result).toHaveProperty("mappingStats");
        expect(result).toHaveProperty("executionTime");

        // 验证映射统计
        expect(result.mappingStats).toHaveProperty("totalMappings");
        expect(result.mappingStats).toHaveProperty("_successfulMappings");
        expect(result.mappingStats).toHaveProperty("_failedMappings");
        expect(result.mappingStats).toHaveProperty("successRate");

        // 验证转换结果
        expect(result.transformedData).toHaveProperty("symbol", "700.HK");
        expect(result.transformedData).toHaveProperty("lastPrice", 561.0);
        expect(result.transformedData).toHaveProperty("previousClose", 558.5);

        // 验证数量转换（volume / 1000）
        expect(result.transformedData).toHaveProperty("volume", 11292.534);

        // 验证调试信息
        if (result.debugInfo) {
          expect(result.debugInfo).toBeInstanceOf(Array);
        }
      });

      it("应该正确处理不完整的测试数据", async () => {
        // Skip if no rule was created
        if (!createdRuleId) {
          console.log("跳过不完整数据测试 - 没有可用的规则ID");
          return;
        }

        // Arrange - 只提供部分数据
        const partialTestRequest = {
          dataMapperRuleId: createdRuleId,
          testData: {
            symbol: "AAPL.US",
            last_done: 150.25,
            // 缺少其他字段
          },
          includeDebugInfo: false,
        };

        // Act
        const response = await request
          .post("/api/v1/data-mapper/rules/test")
          .set("X-App-Key", apiKey.appKey)
          .set("X-Access-Token", apiKey.accessToken)
          .send(partialTestRequest)
          .expect(201);

        // Assert
        global.expectSuccessResponse(response, 201);
        const result = response.body.data;

        expect(result.mappingStats.failedMappings).toBeGreaterThan(0);
        expect(result.mappingStats.successfulMappings).toBeGreaterThan(0);
      });
    });

    describe("❌ 失败场景", () => {
      it("应该在规则不存在时返回404错误", async () => {
        // Arrange
        const testRequest = {
          dataMapperRuleId: "aaaaaaaaaaaaaaaaaaaaaaaa",
          testData: { test: "data" },
        };

        // Act & Assert
        const response = await request
          .post("/api/v1/data-mapper/rules/test")
          .set("X-App-Key", apiKey.appKey)
          .set("X-Access-Token", apiKey.accessToken)
          .send(testRequest)
          .expect(404);

        global.expectErrorResponse(response, 404);
      });

      it("应该在缺少testData时返回400错误", async () => {
        // Arrange
        const invalidRequest = {
          dataMapperRuleId: "some-rule-id",
          // testData缺失
        };

        // Act & Assert
        const response = await request
          .post("/api/v1/data-mapper/rules/test")
          .set("X-App-Key", apiKey.appKey)
          .set("X-Access-Token", apiKey.accessToken)
          .send(invalidRequest)
          .expect(400);

        global.expectErrorResponse(response, 400);
      });

      it("应该在无认证时返回401错误", async () => {
        // Arrange
        const testRequest = {
          dataMapperRuleId: "some-rule-id",
          testData: { test: "data" },
        };

        // Act & Assert
        await request
          .post("/api/v1/data-mapper/rules/test")
          .send(testRequest)
          .expect(401);
      });
    });
  });

  describe("POST /api/v1/data-mapper/rules/generate-from-template/:templateId", () => {
    describe("✅ 成功场景", () => {
      it("应该成功基于模板生成映射规则", async () => {
        // Skip if no template was created
        if (!templateId) {
          console.log("跳过模板生成规则测试 - 没有可用的模板ID");
          return;
        }

        // Arrange
        const generateRequest = {
          transDataRuleListType: "quote_fields",
          ruleName: "Generated from Template Rule",
        };

        // Act
        const response = await request
          .post(
            `/api/v1/data-mapper/rules/generate-from-template/${templateId}`,
          )
          .set("Authorization", `Bearer ${jwtToken}`)
          .send(generateRequest)
          .expect(201);

        // Assert
        global.expectSuccessResponse(response, 201);
        const { rule } = response.body.data;

        expect(rule).toHaveProperty("id");
        expect(rule).toHaveProperty("name", "Generated from Template Rule");
        expect(rule).toHaveProperty("sourceTemplateId", templateId);
        expect(rule).toHaveProperty("transDataRuleListType", "quote_fields");
        expect(rule).toHaveProperty("fieldMappings");
        expect(rule.fieldMappings).toBeInstanceOf(Array);
        expect(rule.fieldMappings.length).toBeGreaterThan(0);
      });
    });

    describe("❌ 失败场景", () => {
      it("应该在模板不存在时返回404错误", async () => {
        // Arrange
        const generateRequest = {
          transDataRuleListType: "quote_fields",
          ruleName: "Test Rule",
        };

        // Act & Assert
        const response = await request
          .post(
            "/api/v1/data-mapper/rules/generate-from-template/aaaaaaaaaaaaaaaaaaaaaaaa",
          )
          .set("Authorization", `Bearer ${jwtToken}`)
          .send(generateRequest)
          .expect(404);

        global.expectErrorResponse(response, 404);
      });

      it("应该在无认证时返回401错误", async () => {
        // Arrange
        const generateRequest = {
          transDataRuleListType: "quote_fields",
          ruleName: "Test Rule",
        };

        // Act & Assert
        await request
          .post(
            "/api/v1/data-mapper/rules/generate-from-template/some-template-id",
          )
          .send(generateRequest)
          .expect(401);
      });
    });
  });

  describe("PUT /api/v1/data-mapper/rules/:id", () => {
    describe("✅ 成功场景", () => {
      it("应该成功更新映射规则", async () => {
        // Skip if no rule was created
        if (!createdRuleId) {
          console.log("跳过规则更新测试 - 没有可用的规则ID");
          return;
        }

        // Arrange
        const updateRequest = {
          name: "Updated E2E Test Rule",
          description: "更新后的端到端测试规则",
          fieldMappings: [
            {
              sourceFieldPath: "symbol",
              targetField: "symbol",
              confidence: 0.98, // 提高置信度
              description: "更新的股票代码映射",
              isActive: true,
            },
            {
              sourceFieldPath: "last_done",
              targetField: "lastPrice",
              confidence: 0.95, // 提高置信度
              description: "更新的最新价格映射",
              isActive: true,
            },
          ],
        };

        // Act
        const response = await request
          .put(`/api/v1/data-mapper/rules/${createdRuleId}`)
          .set("Authorization", `Bearer ${jwtToken}`)
          .send(updateRequest)
          .expect(200);

        // Assert
        global.expectSuccessResponse(response, 200);
        const result = response.body.data;

        expect(result).toHaveProperty("id", createdRuleId);
        expect(result).toHaveProperty("name", "Updated E2E Test Rule");
        expect(result).toHaveProperty("description", "更新后的端到端测试规则");
        expect(result.fieldMappings).toHaveLength(2);
      });
    });

    describe("❌ 失败场景", () => {
      it("应该在规则不存在时返回404错误", async () => {
        // Arrange
        const updateRequest = {
          name: "Updated Rule",
        };

        // Act & Assert
        const response = await request
          .put("/api/v1/data-mapper/rules/aaaaaaaaaaaaaaaaaaaaaaaa")
          .set("Authorization", `Bearer ${jwtToken}`)
          .send(updateRequest)
          .expect(404);

        global.expectErrorResponse(response, 404);
      });

      it("应该在无认证时返回401错误", async () => {
        // Arrange
        const updateRequest = {
          name: "Updated Rule",
        };

        // Act & Assert
        await request
          .put("/api/v1/data-mapper/rules/some-id")
          .send(updateRequest)
          .expect(401);
      });
    });
  });

  describe("DELETE /api/v1/data-mapper/rules/:id", () => {
    let ruleToDeleteId: string;
    let adminJwtToken: string;

    beforeAll(async () => {
      // 创建admin角色的凭证用于DELETE操作
      const { jwtToken: adminToken } = await global.createTestCredentials({
        username: "adminuser",
        email: "admin@example.com",
        password: "password123",
        role: "admin",
      });
      adminJwtToken = adminToken;

      // 创建一个专门用于删除的规则
      const ruleRequest = {
        name: "Rule to Delete",
        provider: "test",
        apiType: "rest",
        transDataRuleListType: "quote_fields",
        fieldMappings: [
          {
            sourceFieldPath: "test",
            targetField: "test",
            confidence: 0.9,
            isActive: true,
          },
        ],
      };

      try {
        const response = await request
          .post("/api/v1/data-mapper/rules")
          .set("Authorization", `Bearer ${jwtToken}`)
          .send(ruleRequest);

        if (response.status === 201) {
          ruleToDeleteId = response.body.data.id;
        }
      } catch (error) {
        console.log("删除测试规则创建失败");
      }
    });

    describe("✅ 成功场景", () => {
      it("应该成功删除映射规则", async () => {
        // Skip if no rule was created for deletion
        if (!ruleToDeleteId) {
          console.log("跳过规则删除测试 - 没有可删除的规则");
          return;
        }

        // Act
        const response = await request
          .delete(`/api/v1/data-mapper/rules/${ruleToDeleteId}`)
          .set("Authorization", `Bearer ${adminJwtToken}`)
          .expect(200);

        // Assert
        global.expectSuccessResponse(response, 200);

        // 验证规则已被删除
        await request
          .get(`/api/v1/data-mapper/rules/${ruleToDeleteId}`)
          .set("X-App-Key", apiKey.appKey)
          .set("X-Access-Token", apiKey.accessToken)
          .expect(404);
      });
    });

    describe("❌ 失败场景", () => {
      it("应该在规则不存在时返回404错误", async () => {
        // Act & Assert
        const response = await request
          .delete("/api/v1/data-mapper/rules/aaaaaaaaaaaaaaaaaaaaaaaa")
          .set("Authorization", `Bearer ${adminJwtToken}`)
          .expect(404);

        global.expectErrorResponse(response, 404);
      });

      it("应该在无认证时返回401错误", async () => {
        // Act & Assert
        await request.delete("/api/v1/data-mapper/rules/some-id").expect(401);
      });
    });
  });

  describe("🔒 权限和安全测试", () => {
    it("应该验证API Key和JWT认证要求", async () => {
      // API Key认证端点
      const apiKeyEndpoints = [
        "GET /api/v1/data-mapper/rules",
        "GET /api/v1/data-mapper/rules/some-id",
        "POST /api/v1/data-mapper/rules/test",
      ];

      // JWT认证端点
      const jwtEndpoints = [
        "POST /api/v1/data-mapper/rules",
        "PUT /api/v1/data-mapper/rules/some-id",
        "DELETE /api/v1/data-mapper/rules/some-id",
      ];

      // 测试API Key认证端点
      for (const endpoint of apiKeyEndpoints) {
        const [method, path] = endpoint.split(" ");
        const req = method === "GET" ? request.get(path) : request.post(path);

        if (method === "POST") {
          await req.send({ test: "data" }).expect(401);
        } else {
          await req.expect(401);
        }
      }

      // 测试JWT认证端点
      for (const endpoint of jwtEndpoints) {
        const [method, path] = endpoint.split(" ");
        let req;

        switch (method) {
          case "POST":
            req = request.post(path);
            break;
          case "PUT":
            req = request.put(path);
            break;
          case "DELETE":
            req = request.delete(path);
            break;
          default:
            continue;
        }

        if (method !== "DELETE") {
          await req.send({ test: "data" }).expect(401);
        } else {
          await req.expect(401);
        }
      }
    });
  });
});
