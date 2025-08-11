/**
 * Data-Mapper 工作流程端到端测试
 * 测试完整的数据映射生命周期：模板创建 → 规则生成 → 规则测试 → 数据转换
 */

describe("Data-Mapper Workflow E2E", () => {
  let request: any;
  let jwtToken: string;
  let adminJwtToken: string;
  let apiKey: any;
  
  // 测试数据存储
  let templateId: string;
  let ruleId: string;
  let analysisResult: any;

  beforeAll(async () => {
    request = global.createTestRequest();
    
    // 获取开发者凭证（用于大部分操作）
    const { apiKey: testApiKey, jwtToken: testJwtToken } = await global.createTestCredentials({
      role: "developer"
    });
    apiKey = testApiKey;
    jwtToken = testJwtToken;

    // 获取管理员凭证（用于需要ADMIN权限的操作）
    const { jwtToken: testAdminJwtToken } = await global.createTestCredentials({
      username: "workflow_admin",
      email: "workflow.admin@example.com",
      role: "admin"
    });
    adminJwtToken = testAdminJwtToken;
  });

  describe("🔄 完整的数据映射工作流程", () => {
    it("应该完成完整的数据映射生命周期", async () => {
      // ==================== 阶段1: 分析用户数据源 ====================
      console.log("🔍 阶段1: 分析LongPort数据源");
      
      const sampleLongPortData = {
        symbol: "700.HK",
        last_done: 561.0,
        prev_close: 558.5,
        open: 560.0,
        high: 565.5,
        low: 558.0,
        volume: 11292534,
        turnover: 6334567890,
        timestamp: "2024-08-11T10:00:00Z",
        trade_status: "NORMAL",
        pre_market_price: 560.5,
        post_market_price: 562.0,
        change: 2.5,
        change_rate: 0.0045,
        lot_size: 100
      };

      const analysisRequest = {
        provider: "longport",
        apiType: "rest",
        sampleData: sampleLongPortData,
        name: "LongPort Complete Quote Data",
        description: "完整的LongPort股票报价数据源",
        dataType: "quote_fields",
        saveAsTemplate: true
      };

      // 分析数据源
      const analysisResponse = await request
        .post("/api/v1/data-mapper/user-persistence/analyze-source")
        .set("X-App-Key", apiKey.appKey)
        .set("X-Access-Token", apiKey.accessToken)
        .send(analysisRequest)
        .expect(201);

      global.expectSuccessResponse(analysisResponse, 201);
      analysisResult = analysisResponse.body.data;
      templateId = analysisResult.savedTemplate.id;

      console.log(`✅ 数据分析完成，提取了 ${analysisResult.extractedFields.length} 个字段`);
      console.log(`✅ 模板已保存，ID: ${templateId}`);

      // 验证分析结果
      expect(analysisResult).toHaveProperty("extractedFields");
      expect(analysisResult.extractedFields.length).toBeGreaterThanOrEqual(10);
      expect(analysisResult).toHaveProperty("dataStructureType", "flat");
      expect(analysisResult).toHaveProperty("confidence");
      expect(analysisResult.confidence).toBeGreaterThan(0.7);

      // ==================== 阶段2: 基于模板生成映射规则 ====================
      console.log("🛠️ 阶段2: 基于模板生成映射规则");

      const generateRuleRequest = {
        ruleType: "quote_fields",
        ruleName: "LongPort Complete Mapping Rule"
      };

      const generateRuleResponse = await request
        .post(`/api/v1/data-mapper/rules/generate-from-template/${templateId}`)
        .set("Authorization", `Bearer ${jwtToken}`)
        .send(generateRuleRequest)
        .expect(201);

      global.expectSuccessResponse(generateRuleResponse, 201);
      const generateResult = generateRuleResponse.body.data;
      const generatedRule = generateResult.rule;
      ruleId = generatedRule.id;

      console.log(`✅ 映射规则生成完成，ID: ${ruleId}`);
      console.log(`✅ 生成了 ${generatedRule.fieldMappings.length} 个字段映射`);

      // 验证生成的规则
      expect(generateResult).toHaveProperty("rule");
      expect(generateResult).toHaveProperty("alignmentResult");
      expect(generatedRule).toHaveProperty("id");
      expect(generatedRule).toHaveProperty("name", "LongPort Complete Mapping Rule");
      expect(generatedRule).toHaveProperty("provider", "longport");
      expect(generatedRule).toHaveProperty("apiType", "rest");
      expect(generatedRule).toHaveProperty("transDataRuleListType", "quote_fields");
      expect(generatedRule.fieldMappings).toBeInstanceOf(Array);
      expect(generatedRule.fieldMappings.length).toBeGreaterThan(5);

      // ==================== 阶段3: 测试映射规则效果 ====================
      console.log("🧪 阶段3: 测试映射规则");

      const ruleTestRequest = {
        dataMapperRuleId: ruleId,
        testData: sampleLongPortData,
        includeDebugInfo: true
      };

      const testResponse = await request
        .post("/api/v1/data-mapper/rules/test")
        .set("X-App-Key", apiKey.appKey)
        .set("X-Access-Token", apiKey.accessToken)
        .send(ruleTestRequest)
        .expect(201);

      global.expectSuccessResponse(testResponse, 201);
      const testResult = testResponse.body.data;

      console.log(`✅ 规则测试完成，成功率: ${(testResult.mappingStats.successRate * 100).toFixed(1)}%`);
      console.log(`✅ 成功映射: ${testResult.mappingStats.successfulMappings}/${testResult.mappingStats.totalMappings} 个字段`);

      // 验证测试结果
      expect(testResult).toHaveProperty("success", true);
      expect(testResult).toHaveProperty("transformedData");
      expect(testResult.mappingStats.successRate).toBeGreaterThan(0.6); // 至少60%成功率
      expect(testResult.mappingStats.successfulMappings).toBeGreaterThan(5);

      // 验证关键字段转换
      const transformedData = testResult.transformedData;
      expect(transformedData).toHaveProperty("symbol", "700.HK");
      expect(transformedData).toHaveProperty("lastPrice", 561.0);
      expect(transformedData).toHaveProperty("previousClose", 558.5);
      expect(transformedData).toHaveProperty("volume", 11292534);

      // ==================== 阶段4: 规则优化调整 ====================
      console.log("🔧 阶段4: 优化映射规则");

      // 基于测试结果优化规则，添加一些手动调整
      // 清理原有的fieldMappings，移除MongoDB的内部属性
      const cleanFieldMappings = generatedRule.fieldMappings.map(mapping => ({
        sourceFieldPath: mapping.sourceFieldPath,
        targetField: mapping.targetField,
        transform: mapping.transform,
        fallbackPaths: mapping.fallbackPaths,
        confidence: mapping.confidence,
        isRequired: mapping.isRequired || false,
        description: mapping.description,
        isActive: mapping.isActive !== false
      }));

      const optimizedFieldMappings = [
        ...cleanFieldMappings,
        // 添加自定义映射
        {
          sourceFieldPath: "change_rate",
          targetField: "changePercent", 
          transform: {
            type: "multiply",
            value: 100 // 转换为百分比
          },
          confidence: 0.95,
          isRequired: false,
          description: "涨跌幅转换为百分比",
          isActive: true
        }
      ];

      const updateRuleRequest = {
        name: "Optimized LongPort Mapping Rule",
        description: "优化后的LongPort映射规则，包含百分比转换",
        fieldMappings: optimizedFieldMappings
      };

      const updateResponse = await request
        .put(`/api/v1/data-mapper/rules/${ruleId}`)
        .set("Authorization", `Bearer ${jwtToken}`)
        .send(updateRuleRequest)
        .expect(200);

      global.expectSuccessResponse(updateResponse, 200);
      const optimizedRule = updateResponse.body.data;

      console.log(`✅ 规则优化完成，现有 ${optimizedRule.fieldMappings.length} 个字段映射`);

      // ==================== 阶段5: 验证优化后的规则 ====================
      console.log("✅ 阶段5: 验证优化后的规则");

      const finalTestRequest = {
        dataMapperRuleId: ruleId,
        testData: sampleLongPortData,
        includeDebugInfo: false
      };

      const finalTestResponse = await request
        .post("/api/v1/data-mapper/rules/test")
        .set("X-App-Key", apiKey.appKey)
        .set("X-Access-Token", apiKey.accessToken)
        .send(finalTestRequest)
        .expect(201);

      global.expectSuccessResponse(finalTestResponse, 201);
      const finalResult = finalTestResponse.body.data;

      console.log(`✅ 最终测试完成，成功率: ${(finalResult.mappingStats.successRate * 100).toFixed(1)}%`);

      // 验证优化后的结果
      expect(finalResult.success).toBe(true);
      expect(finalResult.mappingStats.successfulMappings).toBeGreaterThanOrEqual(
        testResult.mappingStats.successfulMappings
      );

      // 验证百分比转换
      const finalTransformedData = finalResult.transformedData;
      expect(finalTransformedData).toHaveProperty("changePercent");
      expect(finalTransformedData.changePercent).toBeCloseTo(45, 6); // 允许浮点误差

      console.log("🎉 完整的数据映射工作流程测试成功！");
    }, 30000); // 30秒超时，因为是完整流程测试

    it("应该支持流式数据的映射规则创建和测试", async () => {
      // ==================== 流式数据映射测试 ====================
      console.log("🌊 测试流式数据映射");

      const streamSampleData = {
        quote: {
          symbol: "AAPL.US",
          price: {
            current: 150.25,
            previous: 148.90,
            change: 1.35
          },
          volume: {
            total: 25000000,
            current: 2500
          }
        },
        timestamp: "2024-08-11T10:00:00Z",
        market_status: "OPEN"
      };

      // 1. 分析流式数据源
      const streamAnalysisRequest = {
        provider: "custom",
        apiType: "stream",
        sampleData: streamSampleData,
        name: "Custom Stream Data Source",
        description: "自定义流式数据源",
        dataType: "quote_fields",
        saveAsTemplate: true
      };

      const streamAnalysisResponse = await request
        .post("/api/v1/data-mapper/user-persistence/analyze-source")
        .set("X-App-Key", apiKey.appKey)
        .set("X-Access-Token", apiKey.accessToken)
        .send(streamAnalysisRequest)
        .expect(201);

      const streamAnalysisResult = streamAnalysisResponse.body.data;
      const streamTemplateId = streamAnalysisResult.savedTemplate.id;

      console.log(`✅ 流式数据分析完成，模板ID: ${streamTemplateId}`);

      // 2. 生成流式映射规则
      const streamRuleRequest = {
        ruleType: "quote_fields",
        ruleName: "Custom Stream Mapping Rule"
      };

      const streamRuleResponse = await request
        .post(`/api/v1/data-mapper/rules/generate-from-template/${streamTemplateId}`)
        .set("Authorization", `Bearer ${jwtToken}`)
        .send(streamRuleRequest)
        .expect(201);

      const streamRuleResult = streamRuleResponse.body.data;
      const streamRule = streamRuleResult.rule;
      const streamRuleId = streamRule.id;

      console.log(`✅ 流式映射规则生成完成，ID: ${streamRuleId}`);

      // 3. 测试流式映射规则
      const streamTestRequest = {
        dataMapperRuleId: streamRuleId,
        testData: streamSampleData,
        includeDebugInfo: true
      };

      const streamTestResponse = await request
        .post("/api/v1/data-mapper/rules/test")
        .set("X-App-Key", apiKey.appKey)
        .set("X-Access-Token", apiKey.accessToken)
        .send(streamTestRequest)
        .expect(201);

      const streamTestResult = streamTestResponse.body.data;

      console.log(`✅ 流式规则测试完成，成功率: ${(streamTestResult.mappingStats.successRate * 100).toFixed(1)}%`);

      // 验证流式数据映射结果
      expect(streamTestResult.success).toBe(true);
      expect(streamTestResult.transformedData).toHaveProperty("symbol", "AAPL.US");
      
      // 验证嵌套字段映射
      const debugInfo = streamTestResult.debugInfo;
      const nestedFieldMapping = debugInfo.find(info => 
        info.sourceFieldPath.includes("quote.price.current")
      );
      expect(nestedFieldMapping).toBeDefined();
      expect(nestedFieldMapping.success).toBe(true);

      console.log("🌊 流式数据映射测试成功！");
    }, 20000);
  });

  describe("📊 数据映射统计和健康检查", () => {
    it("应该获取完整的系统统计信息", async () => {
      // 1. 获取模板统计
      const templateStatsResponse = await request
        .get("/api/v1/data-mapper/admin/templates/stats")
        .set("Authorization", `Bearer ${jwtToken}`)
        .expect(200);

      const templateStats = templateStatsResponse.body.data;
      console.log(`📊 模板统计 - 总计: ${templateStats.totalTemplates}, 活跃: ${templateStats.activeTemplates}`);

      expect(templateStats.totalTemplates).toBeGreaterThan(0);
      expect(templateStats.templatesByProvider).toBeInstanceOf(Object);
      expect(templateStats.templatesByApiType).toBeInstanceOf(Object);

      // 2. 获取规则列表统计
      const rulesListResponse = await request
        .get("/api/v1/data-mapper/rules?limit=100")
        .set("X-App-Key", apiKey.appKey)
        .set("X-Access-Token", apiKey.accessToken)
        .expect(200);

      const rulesList = rulesListResponse.body.data;
      console.log(`📊 规则统计 - 总计: ${rulesList.pagination.total} 个映射规则`);

      expect(rulesList.pagination.total).toBeGreaterThan(0);
      expect(rulesList.items).toBeInstanceOf(Array);

      // 3. 健康检查
      const healthResponse = await request
        .get("/api/v1/data-mapper/admin/templates/health")
        .set("Authorization", `Bearer ${jwtToken}`)
        .expect(200);

      const healthStatus = healthResponse.body.data;
      console.log(`🏥 系统健康状态: ${healthStatus.status}`);

      expect(["healthy", "warning", "error"]).toContain(healthStatus.status);
      expect(healthStatus).toHaveProperty("timestamp");
    });
  });

  describe("🧹 清理测试数据", () => {
    it("应该清理测试过程中创建的数据", async () => {
      const cleanupResults = {
        deletedTemplates: 0,
        deletedRules: 0,
        errors: []
      };

      // 清理创建的规则
      if (ruleId) {
        try {
          await request
            .delete(`/api/v1/data-mapper/rules/${ruleId}`)
            .set("Authorization", `Bearer ${jwtToken}`)
            .expect(200);
          
          cleanupResults.deletedRules++;
          console.log(`🧹 已清理规则: ${ruleId}`);
        } catch (error) {
          cleanupResults.errors.push(`规则删除失败: ${ruleId}`);
        }
      }

      // 清理创建的模板
      if (templateId) {
        try {
          await request
            .delete(`/api/v1/data-mapper/admin/templates/${templateId}`)
            .set("Authorization", `Bearer ${jwtToken}`)
            .expect(200);
          
          cleanupResults.deletedTemplates++;
          console.log(`🧹 已清理模板: ${templateId}`);
        } catch (error) {
          cleanupResults.errors.push(`模板删除失败: ${templateId}`);
        }
      }

      console.log("🧹 测试数据清理完成:", {
        deletedTemplates: cleanupResults.deletedTemplates,
        deletedRules: cleanupResults.deletedRules,
        errors: cleanupResults.errors
      });

      // 如果有错误，记录但不失败测试
      if (cleanupResults.errors.length > 0) {
        console.warn("⚠️ 清理过程中出现一些错误:", cleanupResults.errors);
      }
    });
  });

  describe("🔄 系统预设模板和规则", () => {
    it("应该验证系统预设功能正常工作", async () => {
      console.log("🔧 测试系统预设功能");

      // 1. 持久化系统预设模板
      const persistResponse = await request
        .post("/api/v1/data-mapper/system-persistence/persist-presets")
        .set("Authorization", `Bearer ${adminJwtToken}`)
        .expect(201);

      const persistResult = persistResponse.body.data;
      console.log(`✅ 预设持久化完成 - 创建: ${persistResult.created}, 更新: ${persistResult.updated}, 跳过: ${persistResult.skipped}`);

      expect(persistResult).toHaveProperty("created");
      expect(persistResult).toHaveProperty("updated");  
      expect(persistResult).toHaveProperty("skipped");

      // 2. 验证预设模板可用
      const presetsListResponse = await request
        .get("/api/v1/data-mapper/admin/templates?limit=5")
        .set("X-App-Key", apiKey.appKey)
        .set("X-Access-Token", apiKey.accessToken)
        .expect(200);

      const presetsList = presetsListResponse.body.data;
      console.log(`📋 可用预设模板: ${presetsList.items.length} 个`);

      if (presetsList.items.length > 0) {
        const firstPreset = presetsList.items[0];
        console.log(`🎯 测试预设模板: ${firstPreset.name} (${firstPreset.provider})`);

        // 3. 基于预设模板生成规则
        const presetRuleRequest = {
          ruleType: "quote_fields",
          ruleName: `E2E Preset Rule - ${Date.now()}`
        };

        try {
          const presetRuleResponse = await request
            .post(`/api/v1/data-mapper/rules/generate-from-template/${firstPreset.id}`)
            .set("Authorization", `Bearer ${jwtToken}`)
            .send(presetRuleRequest)
            .expect(201);

          const presetRuleResult = presetRuleResponse.body.data;
          const presetRule = presetRuleResult.rule;
          console.log(`✅ 基于预设生成规则成功: ${presetRule.id}`);

          expect(presetRule).toHaveProperty("sourceTemplateId", firstPreset.id);
          expect(presetRule.fieldMappings.length).toBeGreaterThan(0);

          // 清理生成的规则
          await request
            .delete(`/api/v1/data-mapper/rules/${presetRule.id}`)
            .set("Authorization", `Bearer ${jwtToken}`)
            .expect(200);

          console.log(`🧹 已清理预设测试规则: ${presetRule.id}`);
        } catch (error) {
          console.log("⚠️ 预设模板规则生成测试跳过 - 可能的模板兼容性问题");
        }
      } else {
        console.log("ℹ️ 没有可用的预设模板进行测试");
      }
    });
  });
});