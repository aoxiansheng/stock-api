/**
 * TemplateAdminController 端到端测试
 * 测试数据源模板管理功能
 */

describe("TemplateAdminController E2E", () => {
  let request: any;
  let jwtToken: string;
  let adminJwtToken: string;
  let apiKey: any;
  let createdTemplateId: string;

  beforeAll(async () => {
    request = global.createTestRequest();
    
    // 获取开发者凭证（用于需要 DEVELOPER 权限的操作）
    const { apiKey: testApiKey, jwtToken: testJwtToken } = await global.createTestCredentials({
      role: "developer"
    }, {
      permissions: ["data:read", "query:execute", "providers:read"]
    });
    apiKey = testApiKey;
    jwtToken = testJwtToken;

    // 获取管理员凭证（用于需要 ADMIN 权限的操作）
    const { jwtToken: testAdminJwtToken } = await global.createTestCredentials({
      username: "admin_user",
      email: "admin@example.com", 
      role: "admin"
    });
    adminJwtToken = testAdminJwtToken;
  });

  describe("POST /api/v1/data-mapper/admin/templates", () => {
    describe("✅ 成功场景", () => {
      it("应该成功创建数据源模板", async () => {
        // Arrange
        const templateRequest = {
          name: "E2E Test Template",
          provider: "longport",
          apiType: "rest",
          description: "端到端测试用模板",
          sampleData: {
            symbol: "700.HK",
            last_done: 561.0,
            prev_close: 558.5,
            open: 560.0,
            high: 565.5,
            low: 558.0,
            volume: 11292534,
            turnover: 6334567890,
            timestamp: "2024-08-11T10:00:00Z",
            trade_status: "NORMAL"
          },
          extractedFields: [
            {
              fieldPath: "symbol",
              fieldName: "symbol",
              fieldType: "string",
              sampleValue: "700.HK",
              confidence: 0.95,
              isNested: false,
              nestingLevel: 0
            },
            {
              fieldPath: "last_done",
              fieldName: "last_done",
              fieldType: "number",
              sampleValue: 561.0,
              confidence: 0.9,
              isNested: false,
              nestingLevel: 0
            },
            {
              fieldPath: "volume",
              fieldName: "volume",
              fieldType: "number",
              sampleValue: 11292534,
              confidence: 0.85,
              isNested: false,
              nestingLevel: 0
            }
          ],
          dataStructureType: "flat",
          isDefault: false,
          confidence: 0.9
        };

        // Act
        const response = await request
          .post("/api/v1/data-mapper/admin/templates")
          .set("Authorization", `Bearer ${jwtToken}`)
          .send(templateRequest)
          .expect(201);

        // Assert
        global.expectSuccessResponse(response, 201);
        const result = response.body.data;
        
        expect(result).toHaveProperty("id");
        expect(result).toHaveProperty("name", "E2E Test Template");
        expect(result).toHaveProperty("provider", "longport");
        expect(result).toHaveProperty("apiType", "rest");
        expect(result).toHaveProperty("dataStructureType", "flat");
        expect(result).toHaveProperty("confidence", 0.9);
        expect(result).toHaveProperty("extractedFields");
        expect(result.extractedFields).toBeInstanceOf(Array);
        expect(result.extractedFields.length).toBe(3);
        
        // 保存创建的模板ID用于后续测试
        createdTemplateId = result.id;
      });

      it("应该成功创建带有嵌套结构的模板", async () => {
        // Arrange
        const nestedTemplateRequest = {
          name: "E2E Nested Template",
          provider: "custom",
          apiType: "stream",
          description: "嵌套结构测试模板",
          sampleData: {
            quote: {
              basic: {
                symbol: "AAPL.US",
                name: "Apple Inc"
              },
              price: {
                current: 150.25,
                previous: 148.90,
                change: 1.35
              }
            },
            timestamp: "2024-08-11T10:00:00Z"
          },
          extractedFields: [
            {
              fieldPath: "quote.basic.symbol",
              fieldName: "symbol",
              fieldType: "string",
              sampleValue: "AAPL.US",
              confidence: 0.95,
              isNested: true,
              nestingLevel: 2
            },
            {
              fieldPath: "quote.price.current",
              fieldName: "current_price",
              fieldType: "number",
              sampleValue: 150.25,
              confidence: 0.9,
              isNested: true,
              nestingLevel: 2
            },
            {
              fieldPath: "timestamp",
              fieldName: "timestamp",
              fieldType: "string",
              sampleValue: "2024-08-11T10:00:00Z",
              confidence: 0.9,
              isNested: false,
              nestingLevel: 0
            }
          ],
          dataStructureType: "nested",
          isDefault: false,
          confidence: 0.88
        };

        // Act
        const response = await request
          .post("/api/v1/data-mapper/admin/templates")
          .set("Authorization", `Bearer ${jwtToken}`)
          .send(nestedTemplateRequest)
          .expect(201);

        // Assert
        global.expectSuccessResponse(response, 201);
        const result = response.body.data;
        
        expect(result).toHaveProperty("dataStructureType", "nested");
        expect(result.extractedFields).toHaveLength(3);
        
        // 验证嵌套字段
        const nestedField = result.extractedFields.find(f => f.fieldPath === "quote.price.current");
        expect(nestedField).toBeDefined();
        expect(nestedField).toMatchObject({
          isNested: true,
          nestingLevel: 2
        });
      });

      it("应该成功创建默认模板", async () => {
        // Arrange
        const defaultTemplateRequest = {
          name: "E2E Default Template",
          provider: "test",
          apiType: "rest",
          description: "默认模板测试",
          sampleData: { test: "data" },
          extractedFields: [
            {
              fieldPath: "test",
              fieldName: "test",
              fieldType: "string",
              sampleValue: "data",
              confidence: 0.9,
              isNested: false,
              nestingLevel: 0
            }
          ],
          dataStructureType: "flat",
          isDefault: true,  // 设置为默认模板
          confidence: 0.9
        };

        // Act
        const response = await request
          .post("/api/v1/data-mapper/admin/templates")
          .set("Authorization", `Bearer ${jwtToken}`)
          .send(defaultTemplateRequest)
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
          sampleData: { test: "data" },
          extractedFields: [],
          dataStructureType: "flat",
          confidence: 0.9
        };

        // Act & Assert
        const response = await request
          .post("/api/v1/data-mapper/admin/templates")
          .set("Authorization", `Bearer ${jwtToken}`)
          .send(invalidRequest)
          .expect(400);

        global.expectErrorResponse(response, 400);
      });

      it("应该在重复模板名称时返回冲突错误", async () => {
        // Arrange - 使用已存在的名称
        const duplicateRequest = {
          name: "E2E Test Template", // 重复名称
          provider: "longport",
          apiType: "rest",
          sampleData: { test: "data" },
          extractedFields: [],
          dataStructureType: "flat",
          confidence: 0.9
        };

        // Act & Assert
        const response = await request
          .post("/api/v1/data-mapper/admin/templates")
          .set("Authorization", `Bearer ${jwtToken}`)
          .send(duplicateRequest)
          .expect(409);

        global.expectErrorResponse(response, 409);
      });

      it("应该在无效apiType时返回400错误", async () => {
        // Arrange
        const invalidApiTypeRequest = {
          name: "Invalid API Type Template",
          provider: "longport",
          apiType: "invalid", // 无效的API类型
          sampleData: { test: "data" },
          extractedFields: [],
          dataStructureType: "flat",
          confidence: 0.9
        };

        // Act & Assert
        const response = await request
          .post("/api/v1/data-mapper/admin/templates")
          .set("Authorization", `Bearer ${jwtToken}`)
          .send(invalidApiTypeRequest)
          .expect(400);

        global.expectErrorResponse(response, 400);
      });

      it("应该在无认证时返回401错误", async () => {
        // Arrange
        const templateRequest = {
          name: "Test Template",
          provider: "longport",
          apiType: "rest",
          sampleData: { test: "data" },
          extractedFields: [],
          dataStructureType: "flat",
          confidence: 0.9
        };

        // Act & Assert
        await request
          .post("/api/v1/data-mapper/admin/templates")
          .send(templateRequest)
          .expect(401);
      });
    });
  });

  describe("GET /api/v1/data-mapper/admin/templates", () => {
    describe("✅ 成功场景", () => {
      it("应该成功获取模板列表", async () => {
        // Act
        const response = await request
          .get("/api/v1/data-mapper/admin/templates")
          .set("X-App-Key", apiKey.appKey)
          .set("X-Access-Token", apiKey.accessToken)
          .expect(200);

        // Assert
        global.expectSuccessResponse(response, 200);
        const result = response.body.data;
        
        expect(result).toHaveProperty("items");
        expect(result).toHaveProperty("pagination");
        const { pagination } = result;
        expect(pagination).toHaveProperty("total");
        expect(pagination).toHaveProperty("page");
        expect(pagination).toHaveProperty("limit");
        expect(pagination).toHaveProperty("totalPages");
        
        expect(result.items).toBeInstanceOf(Array);
        expect(pagination.total).toBeGreaterThanOrEqual(0);
      });

      it("应该支持分页查询", async () => {
        // Act
        const response = await request
          .get("/api/v1/data-mapper/admin/templates?page=1&limit=2")
          .set("X-App-Key", apiKey.appKey)
          .set("X-Access-Token", apiKey.accessToken)
          .expect(200);

        // Assert
        global.expectSuccessResponse(response, 200);
        const result = response.body.data;
        const { pagination } = result;
        expect(pagination.page).toBe(1);
        expect(pagination.limit).toBe(2);
        expect(result.items.length).toBeLessThanOrEqual(2);
      });

      it("应该支持提供商筛选", async () => {
        // Act
        const response = await request
          .get("/api/v1/data-mapper/admin/templates?provider=longport")
          .set("X-App-Key", apiKey.appKey)
          .set("X-Access-Token", apiKey.accessToken)
          .expect(200);

        // Assert
        global.expectSuccessResponse(response, 200);
        const result = response.body.data;
        
        // 验证所有返回的模板都是longport提供商
        result.items.forEach(template => {
          expect(template.provider).toBe("longport");
        });
      });

      it("应该支持API类型筛选", async () => {
        // Act
        const response = await request
          .get("/api/v1/data-mapper/admin/templates?apiType=rest")
          .set("X-App-Key", apiKey.appKey)
          .set("X-Access-Token", apiKey.accessToken)
          .expect(200);

        // Assert
        global.expectSuccessResponse(response, 200);
        const result = response.body.data;
        
        // 验证所有返回的模板都是rest类型
        result.items.forEach(template => {
          expect(template.apiType).toBe("rest");
        });
      });
    });

    describe("❌ 失败场景", () => {
      it("应该在无认证时返回401错误", async () => {
        // Act & Assert
        await request
          .get("/api/v1/data-mapper/admin/templates")
          .expect(401);
      });

      it("应该自动标准化无效分页参数", async () => {
        // Act
        const response = await request
          .get("/api/v1/data-mapper/admin/templates?page=-1&limit=0")
          .set("X-App-Key", apiKey.appKey)
          .set("X-Access-Token", apiKey.accessToken)
          .expect(200);

        // Assert - 无效参数应被自动标准化
        global.expectSuccessResponse(response, 200);
        const result = response.body.data;
        const { pagination } = result;
        
        // 无效的page=-1应被标准化为1
        expect(pagination.page).toBe(1);
        // 无效的limit=0应被标准化为默认值10
        expect(pagination.limit).toBe(10);
      });
    });
  });

  describe("GET /api/v1/data-mapper/admin/templates/:id", () => {
    describe("✅ 成功场景", () => {
      it("应该成功获取模板详情", async () => {
        // Skip if no template was created
        if (!createdTemplateId) {
          console.log("跳过模板详情测试 - 没有可用的模板ID");
          return;
        }

        // Act
        const response = await request
          .get(`/api/v1/data-mapper/admin/templates/${createdTemplateId}`)
          .set("X-App-Key", apiKey.appKey)
          .set("X-Access-Token", apiKey.accessToken)
          .expect(200);

        // Assert
        global.expectSuccessResponse(response, 200);
        const result = response.body.data;
        
        expect(result).toHaveProperty("id", createdTemplateId);
        expect(result).toHaveProperty("name");
        expect(result).toHaveProperty("provider");
        expect(result).toHaveProperty("apiType");
        expect(result).toHaveProperty("sampleData");
        expect(result).toHaveProperty("extractedFields");
        expect(result.extractedFields).toBeInstanceOf(Array);
      });
    });

    describe("❌ 失败场景", () => {
      it("应该在模板不存在时返回404错误", async () => {
        // 使用有效的ObjectId格式但不存在的ID
        const nonExistentId = "507f1f77bcf86cd799439011";
        
        // Act & Assert
        const response = await request
          .get(`/api/v1/data-mapper/admin/templates/${nonExistentId}`)
          .set("X-App-Key", apiKey.appKey)
          .set("X-Access-Token", apiKey.accessToken)
          .expect(404);

        global.expectErrorResponse(response, 404);
      });

      it("应该在无效ObjectId格式时返回400错误", async () => {
        // Act & Assert
        const response = await request
          .get("/api/v1/data-mapper/admin/templates/invalid-objectid")
          .set("X-App-Key", apiKey.appKey)
          .set("X-Access-Token", apiKey.accessToken)
          .expect(400);

        global.expectErrorResponse(response, 400);
        expect(response.body.message).toContain("无效的模板ID格式");
      });

      it("应该在无认证时返回401错误", async () => {
        // Act & Assert
        await request
          .get("/api/v1/data-mapper/admin/templates/some-id")
          .expect(401);
      });
    });
  });

  describe("PUT /api/v1/data-mapper/admin/templates/:id", () => {
    describe("✅ 成功场景", () => {
      it("应该成功更新模板", async () => {
        // Skip if no template was created
        if (!createdTemplateId) {
          console.log("跳过模板更新测试 - 没有可用的模板ID");
          return;
        }

        // Arrange
        const updateRequest = {
          name: "Updated E2E Test Template",
          description: "更新后的端到端测试模板",
          confidence: 0.95
        };

        // Act
        const response = await request
          .put(`/api/v1/data-mapper/admin/templates/${createdTemplateId}`)
          .set("Authorization", `Bearer ${adminJwtToken}`)
          .send(updateRequest)
          .expect(200);

        // Assert
        global.expectSuccessResponse(response, 200);
        const result = response.body.data;
        
        expect(result).toHaveProperty("id", createdTemplateId);
        expect(result).toHaveProperty("name", "Updated E2E Test Template");
        expect(result).toHaveProperty("description", "更新后的端到端测试模板");
        expect(result).toHaveProperty("confidence", 0.95);
      });
    });

    describe("❌ 失败场景", () => {
      it("应该在无效ObjectId格式时返回400错误", async () => {
        // Arrange
        const updateRequest = {
          name: "Updated Template"
        };

        // Act & Assert
        const response = await request
          .put("/api/v1/data-mapper/admin/templates/invalid-objectid")
          .set("Authorization", `Bearer ${adminJwtToken}`)
          .send(updateRequest)
          .expect(400);

        global.expectErrorResponse(response, 400);
        expect(response.body.message).toContain("无效的模板ID格式");
      });

      it("应该在模板不存在时返回404错误", async () => {
        // Arrange
        const updateRequest = {
          name: "Updated Template"
        };
        // 使用有效的ObjectId格式但不存在的ID
        const nonExistentId = "507f1f77bcf86cd799439011";

        // Act & Assert
        const response = await request
          .put(`/api/v1/data-mapper/admin/templates/${nonExistentId}`)
          .set("Authorization", `Bearer ${adminJwtToken}`)
          .send(updateRequest)
          .expect(404);

        global.expectErrorResponse(response, 404);
      });

      it("应该在无认证时返回401错误", async () => {
        // Arrange
        const updateRequest = {
          name: "Updated Template"
        };

        // Act & Assert
        await request
          .put("/api/v1/data-mapper/admin/templates/some-id")
          .send(updateRequest)
          .expect(401);
      });
    });
  });

  describe("DELETE /api/v1/data-mapper/admin/templates/:id", () => {
    let templateToDeleteId: string;

    beforeAll(async () => {
      // 创建一个专门用于删除的模板
      const templateRequest = {
        name: "Template to Delete",
        provider: "test",
        apiType: "rest",
        sampleData: { test: "data" },
        extractedFields: [
          {
            fieldPath: "test",
            fieldName: "test",
            fieldType: "string",
            sampleValue: "data",
            confidence: 0.9,
            isNested: false,
            nestingLevel: 0
          }
        ],
        dataStructureType: "flat",
        confidence: 0.9
      };

      const response = await request
        .post("/api/v1/data-mapper/admin/templates")
        .set("Authorization", `Bearer ${jwtToken}`)
        .send(templateRequest)
        .expect(201);

      templateToDeleteId = response.body.data.id;
    });

    describe("✅ 成功场景", () => {
      it("应该成功删除模板", async () => {
        // Act
        const response = await request
          .delete(`/api/v1/data-mapper/admin/templates/${templateToDeleteId}`)
          .set("Authorization", `Bearer ${adminJwtToken}`)
          .expect(200);

        // Assert
        global.expectSuccessResponse(response, 200);

        // 验证模板已被删除
        await request
          .get(`/api/v1/data-mapper/admin/templates/${templateToDeleteId}`)
          .set("X-App-Key", apiKey.appKey)
          .set("X-Access-Token", apiKey.accessToken)
          .expect(404);
      });
    });

    describe("❌ 失败场景", () => {
      it("应该在无效ObjectId格式时返回400错误", async () => {
        // Act & Assert
        const response = await request
          .delete("/api/v1/data-mapper/admin/templates/invalid-objectid")
          .set("Authorization", `Bearer ${adminJwtToken}`)
          .expect(400);

        global.expectErrorResponse(response, 400);
        expect(response.body.message).toContain("无效的模板ID格式");
      });

      it("应该在模板不存在时返回404错误", async () => {
        // 使用有效的ObjectId格式但不存在的ID
        const nonExistentId = "507f1f77bcf86cd799439011";
        
        // Act & Assert
        const response = await request
          .delete(`/api/v1/data-mapper/admin/templates/${nonExistentId}`)
          .set("Authorization", `Bearer ${adminJwtToken}`)
          .expect(404);

        global.expectErrorResponse(response, 404);
      });

      it("应该在无认证时返回401错误", async () => {
        // Act & Assert
        await request
          .delete("/api/v1/data-mapper/admin/templates/some-id")
          .expect(401);
      });
    });
  });

  describe("GET /api/v1/data-mapper/admin/templates/stats", () => {
    describe("✅ 成功场景", () => {
      it("应该成功获取模板统计信息", async () => {
        // Act
        const response = await request
          .get("/api/v1/data-mapper/admin/templates/stats")
          .set("Authorization", `Bearer ${jwtToken}`)
          .expect(200);

        // Assert
        global.expectSuccessResponse(response, 200);
        const result = response.body.data;
        
        expect(result).toHaveProperty("totalTemplates");
        expect(result).toHaveProperty("templatesByProvider");
        expect(result).toHaveProperty("templatesByApiType");
        expect(result).toHaveProperty("activeTemplates");
        expect(result).toHaveProperty("presetTemplates");
        
        expect(typeof result.totalTemplates).toBe("number");
        expect(typeof result.templatesByProvider).toBe("object");
        expect(typeof result.templatesByApiType).toBe("object");
        expect(typeof result.activeTemplates).toBe("number");
        expect(typeof result.presetTemplates).toBe("number");
      });
    });

    describe("❌ 失败场景", () => {
      it("应该在无认证时返回401错误", async () => {
        // Act & Assert
        await request
          .get("/api/v1/data-mapper/admin/templates/stats")
          .expect(401);
      });
    });
  });

  describe("GET /api/v1/data-mapper/admin/templates/health", () => {
    describe("✅ 成功场景", () => {
      it("应该成功获取模板健康状态", async () => {
        // Act
        const response = await request
          .get("/api/v1/data-mapper/admin/templates/health")
          .set("Authorization", `Bearer ${jwtToken}`)
          .expect(200);

        // Assert
        global.expectSuccessResponse(response, 200);
        const result = response.body.data;
        
        expect(result).toHaveProperty("status");
        expect(result).toHaveProperty("timestamp");
        expect(["healthy", "warning", "error"]).toContain(result.status);
      });
    });

    describe("❌ 失败场景", () => {
      it("应该在无认证时返回401错误", async () => {
        // Act & Assert
        await request
          .get("/api/v1/data-mapper/admin/templates/health")
          .expect(401);
      });
    });
  });
});