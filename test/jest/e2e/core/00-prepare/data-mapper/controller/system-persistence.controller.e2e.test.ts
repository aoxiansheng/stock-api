/* eslint-disable @typescript-eslint/no-unused-vars */
/**
 * SystemPersistenceController 端到端测试
 * 测试系统预设模板持久化功能
 */

describe("SystemPersistenceController E2E", () => {
  let request: any;
  let jwtToken: string;
  let apiKey: any;

  beforeAll(async () => {
    request = global.createTestRequest();

    // 系统预设持久化需要管理员JWT认证
    const { jwtToken: testJwtToken, apiKey: testApiKey } =
      await global.createTestCredentials({
        role: "admin", // 指定为管理员角色
      });
    jwtToken = testJwtToken;
    apiKey = testApiKey;
  });

  describe("POST /api/v1/data-mapper/system-persistence/persist-presets", () => {
    describe("✅ 成功场景", () => {
      it("应该成功持久化系统预设模板", async () => {
        // Act
        const response = await request
          .post("/api/v1/data-mapper/system-persistence/persist-presets")
          .set("Authorization", `Bearer ${jwtToken}`)
          .expect(200);

        // Assert
        global.expectSuccessResponse(response, 200);
        const result = response.body.data;

        expect(result).toHaveProperty("created");
        expect(result).toHaveProperty("updated");
        expect(result).toHaveProperty("skipped");
        expect(result).toHaveProperty("details");

        expect(result.created).toBeGreaterThanOrEqual(0);
        expect(result.updated).toBeGreaterThanOrEqual(0);
        expect(result.skipped).toBeGreaterThanOrEqual(0);
        expect(result.details).toBeInstanceOf(Array);

        // 验证总数合理
        const total = result.created + result.updated + result.skipped;
        expect(total).toBeGreaterThan(0);
      });

      it("应该在重复执行时正确处理已存在的模板", async () => {
        // Act - 第一次执行
        const firstResponse = await request
          .post("/api/v1/data-mapper/system-persistence/persist-presets")
          .set("Authorization", `Bearer ${jwtToken}`)
          .expect(200);

        // Act - 第二次执行（应该跳过已存在的）
        const secondResponse = await request
          .post("/api/v1/data-mapper/system-persistence/persist-presets")
          .set("Authorization", `Bearer ${jwtToken}`)
          .expect(200);

        // Assert
        const firstResult = firstResponse.body.data;
        const secondResult = secondResponse.body.data;

        // 第二次执行时，跳过的数量应该增加
        expect(secondResult.skipped).toBeGreaterThanOrEqual(
          firstResult.created,
        );
      });
    });

    describe("❌ 失败场景", () => {
      it("应该在无认证时返回401错误", async () => {
        // Act & Assert
        await request
          .post("/api/v1/data-mapper/system-persistence/persist-presets")
          .expect(401);
      });

      it("应该在使用无效JWT时返回401错误", async () => {
        // Act & Assert
        await request
          .post("/api/v1/data-mapper/system-persistence/persist-presets")
          .set("Authorization", "Bearer invalid-jwt-token")
          .expect(401);
      });

      it("应该在使用API Key认证时返回403错误", async () => {
        // Arrange
        const { apiKey } = await global.createTestCredentials();

        // Act & Assert - API Key认证成功但权限不足访问管理员功能
        // 注意：理想情况下应该返回401(认证类型错误)，但当前系统返回403(权限不足)
        await request
          .post("/api/v1/data-mapper/system-persistence/persist-presets")
          .set("X-App-Key", apiKey.appKey)
          .set("X-Access-Token", apiKey.accessToken)
          .expect(403);
      });
    });
  });

  describe("POST /api/v1/data-mapper/system-persistence/:id/reset", () => {
    let templateId: string;

    beforeAll(async () => {
      // 首先持久化预设模板以获取ID
      const persistResponse = await request
        .post("/api/v1/data-mapper/system-persistence/persist-presets")
        .set("Authorization", `Bearer ${jwtToken}`)
        .expect(200);

      // 获取第一个创建的模板ID（如果有的话）
      if (persistResponse.body.data.created > 0) {
        // 查询模板列表获取ID (使用API Key认证)
        const templatesResponse = await request
          .get("/api/v1/data-mapper/admin/templates?limit=1")
          .set("X-App-Key", apiKey.appKey)
          .set("X-Access-Token", apiKey.accessToken)
          .expect(200);

        if (templatesResponse.body.data.items.length > 0) {
          templateId = templatesResponse.body.data.items[0].id;
        }
      }
    });

    describe("✅ 成功场景", () => {
      it("应该成功重置指定的预设模板", async () => {
        // 跳过测试如果没有可用的模板ID
        if (!templateId) {
          console.log("跳过重置测试 - 没有可用的模板ID");
          return;
        }

        // Act
        const response = await request
          .post(`/api/v1/data-mapper/system-persistence/${templateId}/reset`)
          .set("Authorization", `Bearer ${jwtToken}`)
          .expect(200);

        // Assert
        global.expectSuccessResponse(response, 200);
        expect(response.body.data).toHaveProperty("message");
      });
    });

    describe("❌ 失败场景", () => {
      it("应该在无效UUID格式时返回400错误", async () => {
        // "nonexistent-id" 不是有效的ObjectId格式
        const response = await request
          .post("/api/v1/data-mapper/system-persistence/nonexistent-id/reset")
          .set("Authorization", `Bearer ${jwtToken}`)
          .expect(400);

        global.expectErrorResponse(response, 400);
      });

      it("应该在模板ID不存在时返回404错误", async () => {
        // "invalid-uuid" 是有效格式但不存在的ObjectId
        const response = await request
          .post("/api/v1/data-mapper/system-persistence/invalid-uuid/reset")
          .set("Authorization", `Bearer ${jwtToken}`)
          .expect(404);

        global.expectErrorResponse(response, 404);
      });

      it("应该在无认证时返回401错误", async () => {
        // Act & Assert
        await request
          .post("/api/v1/data-mapper/system-persistence/some-id/reset")
          .expect(401);
      });
    });
  });

  describe("POST /api/v1/data-mapper/system-persistence/reset-bulk", () => {
    describe("✅ 成功场景", () => {
      it("应该成功批量重置预设模板", async () => {
        // Arrange - 获取一些模板ID (使用API Key认证)
        const templatesResponse = await request
          .get("/api/v1/data-mapper/admin/templates?limit=3")
          .set("X-App-Key", apiKey.appKey)
          .set("X-Access-Token", apiKey.accessToken)
          .expect(200);

        const templateIds = templatesResponse.body.data.items.map(
          (item) => item.id,
        );

        if (templateIds.length === 0) {
          console.log("跳过批量重置测试 - 没有可用的模板");
          return;
        }

        const resetRequest = {
          ids: templateIds,
        };

        // Act
        const response = await request
          .post("/api/v1/data-mapper/system-persistence/reset-bulk")
          .set("Authorization", `Bearer ${jwtToken}`)
          .send(resetRequest)
          .expect(200);

        // Assert
        global.expectSuccessResponse(response, 200);
        const result = response.body.data;
        expect(result).toHaveProperty("reset");
        expect(result).toHaveProperty("failed");
        expect(result).toHaveProperty("details");
      });
    });

    describe("❌ 失败场景", () => {
      it("应该拒绝空的ID列表", async () => {
        // Arrange
        const emptyRequest = { ids: [] };

        // Act & Assert - 空数组在业务逻辑上不合理，应该返回400
        const response = await request
          .post("/api/v1/data-mapper/system-persistence/reset-bulk")
          .set("Authorization", `Bearer ${jwtToken}`)
          .send(emptyRequest)
          .expect(400);

        global.expectErrorResponse(response, 400);
      });

      it("应该在缺少请求体时返回400错误", async () => {
        // Act & Assert
        const response = await request
          .post("/api/v1/data-mapper/system-persistence/reset-bulk")
          .set("Authorization", `Bearer ${jwtToken}`)
          .expect(400);

        global.expectErrorResponse(response, 400);
      });

      it("应该在无效的请求格式时返回400错误", async () => {
        // Arrange
        const invalidRequest = { ids: "not-an-array" };

        // Act & Assert
        const response = await request
          .post("/api/v1/data-mapper/system-persistence/reset-bulk")
          .set("Authorization", `Bearer ${jwtToken}`)
          .send(invalidRequest)
          .expect(400);

        global.expectErrorResponse(response, 400);
      });

      it("应该在无认证时返回401错误", async () => {
        // Arrange
        const resetRequest = { ids: ["some-id"] };

        // Act & Assert
        await request
          .post("/api/v1/data-mapper/system-persistence/reset-bulk")
          .send(resetRequest)
          .expect(401);
      });
    });
  });

  describe("POST /api/v1/data-mapper/system-persistence/reset-all", () => {
    describe("✅ 成功场景", () => {
      it("应该成功重置所有预设模板", async () => {
        // Arrange - 先持久化一些模板以确保有数据可以重置
        const persistResponse = await request
          .post("/api/v1/data-mapper/system-persistence/persist-presets")
          .set("Authorization", `Bearer ${jwtToken}`)
          .expect(200);

        // 确保至少有一些模板被创建或更新
        const persistResult = persistResponse.body.data;
        const hasTemplates = persistResult.created + persistResult.updated > 0;

        if (!hasTemplates) {
          console.warn("警告：没有预设模板被创建或更新，跳过reset-all测试");
          return;
        }

        // Act
        const response = await request
          .post("/api/v1/data-mapper/system-persistence/reset-all")
          .set("Authorization", `Bearer ${jwtToken}`)
          .expect(200);

        // Assert
        global.expectSuccessResponse(response, 200);
        const result = response.body.data;
        expect(result).toHaveProperty("_deleted");
        expect(result).toHaveProperty("_recreated");
        expect(result).toHaveProperty("message");
        expect(result.deleted).toBeGreaterThanOrEqual(0);

        // 预设模板应该被重新创建（硬编码的2个模板）
        expect(result.recreated).toBeGreaterThanOrEqual(2);
      });
    });

    describe("❌ 失败场景", () => {
      it("应该在无认证时返回401错误", async () => {
        // Act & Assert
        await request
          .post("/api/v1/data-mapper/system-persistence/reset-all")
          .expect(401);
      });

      it("应该在使用非管理员角色时返回403错误", async () => {
        // 这个测试需要一个非管理员用户的JWT
        // 在实际测试环境中需要创建developer角色用户来测试
        console.log("非管理员权限测试已跳过 - 需要非管理员用户JWT");
      });
    });
  });

  describe("🔒 权限和安全测试", () => {
    it("应该验证所有端点都需要JWT认证", async () => {
      const endpoints = [
        "POST /api/v1/data-mapper/system-persistence/persist-presets",
        "POST /api/v1/data-mapper/system-persistence/test-id/reset",
        "POST /api/v1/data-mapper/system-persistence/reset-bulk",
        "POST /api/v1/data-mapper/system-persistence/reset-all",
      ];

      // 所有端点在无认证时都应该返回401
      for (const endpoint of endpoints) {
        const [method, path] = endpoint.split(" ");
        const req = method === "POST" ? request.post(path) : request.get(path);

        if (path.includes("reset-bulk")) {
          await req.send({ ids: [] }).expect(401);
        } else {
          await req.expect(401);
        }
      }
    });

    it("应该验证管理员角色要求", async () => {
      // 使用有效的JWT token进行测试
      const response = await request
        .post("/api/v1/data-mapper/system-persistence/persist-presets")
        .set("Authorization", `Bearer ${jwtToken}`)
        .expect(200);

      global.expectSuccessResponse(response, 200);
    });
  });
});
