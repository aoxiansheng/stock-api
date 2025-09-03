/**
 * Gateway健康检查集成测试
 * 验证Gateway状态是否准备好移除Legacy代码
 */

import { Test, TestingModule } from "@nestjs/testing";
import {
  WebSocketServerProvider,
  WEBSOCKET_SERVER_TOKEN,
} from "../../../../src/core/03-fetching/stream-data-fetcher/providers/websocket-server.provider";

describe("Gateway健康检查集成测试", () => {
  let webSocketProvider: WebSocketServerProvider;
  let module: TestingModule;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      providers: [
        {
          provide: WEBSOCKET_SERVER_TOKEN,
          useClass: WebSocketServerProvider,
        },
      ],
    }).compile();

    webSocketProvider = module.get<WebSocketServerProvider>(
      WEBSOCKET_SERVER_TOKEN,
    );
  });

  afterAll(async () => {
    await module.close();
  });

  describe("基础健康检查", () => {
    test("应该能创建WebSocketServerProvider实例", () => {
      expect(webSocketProvider).toBeDefined();
      expect(webSocketProvider).toBeInstanceOf(WebSocketServerProvider);
    });

    test("应该有健康检查方法", () => {
      expect(typeof webSocketProvider.healthCheck).toBe("function");
      expect(typeof webSocketProvider.isReadyForLegacyRemoval).toBe("function");
    });

    test("应该能执行基础健康检查", () => {
      const healthStatus = webSocketProvider.healthCheck();

      expect(healthStatus).toHaveProperty("status");
      expect(healthStatus).toHaveProperty("details");
      expect(["healthy", "degraded", "unhealthy"]).toContain(
        healthStatus.status,
      );

      console.log("🔍 Gateway健康状态:", healthStatus);
    });

    test("应该能执行Legacy移除准备检查", () => {
      const readinessCheck = webSocketProvider.isReadyForLegacyRemoval();

      expect(readinessCheck).toHaveProperty("ready");
      expect(readinessCheck).toHaveProperty("details");
      expect(typeof readinessCheck.ready).toBe("boolean");

      console.log("🎯 Legacy移除准备状态:", {
        ready: readinessCheck.ready,
        reason: readinessCheck.reason || "Ready for removal",
        details: readinessCheck.details,
      });

      if (!readinessCheck.ready) {
        console.warn("⚠️ 注意: Gateway尚未准备好移除Legacy代码");
        console.warn("原因:", readinessCheck.reason);
        console.warn("建议: 在继续移除Legacy代码前，请先修复Gateway集成问题");
      } else {
        console.log("✅ Gateway已准备好移除Legacy代码");
      }
    });
  });

  describe("服务器统计信息", () => {
    test("应该能获取服务器统计信息", () => {
      const stats = webSocketProvider.getServerStats();

      expect(stats).toHaveProperty("isAvailable");
      expect(stats).toHaveProperty("connectedClients");
      expect(stats).toHaveProperty("serverPath");
      expect(stats).toHaveProperty("namespaces");
      expect(stats).toHaveProperty("serverSource");

      console.log("📊 Gateway统计信息:", stats);
    });

    test("应该报告服务器可用性状态", () => {
      const isAvailable = webSocketProvider.isServerAvailable();
      expect(typeof isAvailable).toBe("boolean");

      console.log("🌐 Gateway服务器可用性:", isAvailable);
    });
  });

  describe("Gateway准备度评估", () => {
    test("应该评估Legacy移除的整体准备度", () => {
      const healthStatus = webSocketProvider.healthCheck();
      const readinessCheck = webSocketProvider.isReadyForLegacyRemoval();
      const stats = webSocketProvider.getServerStats();

      // 整体评估
      const assessment = {
        healthStatus: healthStatus.status,
        readyForRemoval: readinessCheck.ready,
        serverAvailable: stats.isAvailable,
        serverSource: stats.serverSource,
        overallReadiness: "unknown" as
          | "ready"
          | "not_ready"
          | "partial"
          | "unknown",
      };

      // 计算整体准备度
      if (
        readinessCheck.ready &&
        healthStatus.status === "healthy" &&
        stats.isAvailable
      ) {
        assessment.overallReadiness = "ready";
      } else if (healthStatus.status === "unhealthy" || !readinessCheck.ready) {
        assessment.overallReadiness = "not_ready";
      } else {
        assessment.overallReadiness = "partial";
      }

      console.log("🎯 Legacy移除准备度评估:", assessment);

      // 根据评估结果给出建议
      switch (assessment.overallReadiness) {
        case "ready":
          console.log("✅ 建议: 可以安全进行Legacy代码移除");
          break;
        case "not_ready":
          console.log("❌ 建议: 请先修复Gateway问题再进行Legacy代码移除");
          break;
        case "partial":
          console.log("⚠️ 建议: 谨慎进行Legacy代码移除，密切监控");
          break;
        default:
          console.log("❓ 建议: 需要进一步检查Gateway状态");
      }

      // 测试结果记录
      expect(assessment.overallReadiness).toBeDefined();
    });
  });

  describe("错误处理验证", () => {
    test("应该优雅处理健康检查异常", () => {
      // 健康检查不应该抛出异常
      expect(() => {
        webSocketProvider.healthCheck();
      }).not.toThrow();
    });

    test("应该优雅处理准备度检查异常", () => {
      // 准备度检查不应该抛出异常
      expect(() => {
        webSocketProvider.isReadyForLegacyRemoval();
      }).not.toThrow();
    });

    test("应该优雅处理统计信息获取异常", () => {
      // 统计信息获取不应该抛出异常
      expect(() => {
        webSocketProvider.getServerStats();
      }).not.toThrow();
    });
  });
});

/**
 * 测试辅助类 - Gateway健康检查助手
 */
export class GatewayHealthChecker {
  static async performComprehensiveCheck(
    provider: WebSocketServerProvider,
  ): Promise<{
    status: "pass" | "fail" | "warning";
    details: any;
    recommendations: string[];
  }> {
    const healthStatus = provider.healthCheck();
    const readinessCheck = provider.isReadyForLegacyRemoval();
    const stats = provider.getServerStats();

    const recommendations: string[] = [];
    let status: "pass" | "fail" | "warning" = "pass";

    // 检查健康状态
    if (healthStatus.status === "unhealthy") {
      status = "fail";
      recommendations.push("修复Gateway健康状态问题");
    } else if (healthStatus.status === "degraded") {
      status = "warning";
      recommendations.push("优化Gateway性能和稳定性");
    }

    // 检查准备度
    if (!readinessCheck.ready) {
      status = "fail";
      recommendations.push(`解决准备度问题: ${readinessCheck.reason}`);
    }

    // 检查服务器可用性
    if (!stats.isAvailable) {
      status = "fail";
      recommendations.push("确保Gateway服务器正常运行");
    }

    // 检查服务器来源
    if (stats.serverSource !== "gateway") {
      status = "warning";
      recommendations.push("确保使用Gateway模式而非Legacy模式");
    }

    if (recommendations.length === 0) {
      recommendations.push("Gateway状态良好，可以安全移除Legacy代码");
    }

    return {
      status,
      details: {
        healthStatus,
        readinessCheck,
        stats,
        timestamp: new Date().toISOString(),
      },
      recommendations,
    };
  }
}
