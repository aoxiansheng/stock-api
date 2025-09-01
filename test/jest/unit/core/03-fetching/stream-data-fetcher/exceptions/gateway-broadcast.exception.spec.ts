/* eslint-disable @typescript-eslint/no-unused-vars */
/**
 * GatewayBroadcastError异常单元测试
 */

import { GatewayBroadcastError } from "../../../../../../../src/core/03-fetching/stream-data-fetcher/exceptions/gateway-broadcast.exception";

describe("GatewayBroadcastError", () => {
  const mockSymbol = "TEST.HK";
  const mockHealthStatus = {
    status: "unhealthy",
    details: {
      reason: "No server instance",
      isInitialized: false,
    },
  };
  const mockReason = "Gateway服务器未集成";

  describe("基础功能测试", () => {
    test("应该正确创建异常实例", () => {
      const error = new GatewayBroadcastError(
        mockSymbol,
        mockHealthStatus,
        mockReason,
      );

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(GatewayBroadcastError);
      expect(error.name).toBe("GatewayBroadcastError");
      expect(error.symbol).toBe(mockSymbol);
      expect(error.healthStatus).toEqual(mockHealthStatus);
      expect(error.reason).toBe(mockReason);
      expect(error.message).toBe(
        `Gateway广播失败 [${mockSymbol}]: ${mockReason}`,
      );
      expect(error.timestamp).toBeDefined();
    });

    test("应该保持Stack Trace", () => {
      const error = new GatewayBroadcastError(
        mockSymbol,
        mockHealthStatus,
        mockReason,
      );
      expect(error.stack).toBeDefined();
    });
  });

  describe("错误详情功能", () => {
    test("应该返回完整的错误详情", () => {
      const error = new GatewayBroadcastError(
        mockSymbol,
        mockHealthStatus,
        mockReason,
      );
      const details = error.getErrorDetails();

      expect(details).toEqual({
        errorType: "GatewayBroadcastError",
        symbol: mockSymbol,
        reason: mockReason,
        healthStatus: mockHealthStatus,
        timestamp: error.timestamp,
        message: error.message,
      });
    });

    test("应该正确判断严重错误", () => {
      // unhealthy状态应该是严重错误
      const criticalError1 = new GatewayBroadcastError(
        mockSymbol,
        { status: "unhealthy" },
        mockReason,
      );
      expect(criticalError1.isCritical()).toBe(true);

      // 包含"No server instance"应该是严重错误
      const criticalError2 = new GatewayBroadcastError(
        mockSymbol,
        {},
        "No server instance",
      );
      expect(criticalError2.isCritical()).toBe(true);

      // 包含"未集成"应该是严重错误
      const criticalError3 = new GatewayBroadcastError(
        mockSymbol,
        {},
        "Gateway服务器未集成",
      );
      expect(criticalError3.isCritical()).toBe(true);

      // 其他情况应该不是严重错误
      const normalError = new GatewayBroadcastError(
        mockSymbol,
        { status: "healthy" },
        "网络超时",
      );
      expect(normalError.isCritical()).toBe(false);
    });
  });

  describe("修复建议功能", () => {
    test("应该为不同错误类型提供正确建议", () => {
      // No server instance
      const error1 = new GatewayBroadcastError(
        mockSymbol,
        {},
        "No server instance",
      );
      expect(error1.getRecommendation()).toContain(
        "检查Gateway服务器是否正常启动",
      );

      // 未集成
      const error2 = new GatewayBroadcastError(
        mockSymbol,
        {},
        "Gateway服务器未集成",
      );
      expect(error2.getRecommendation()).toContain(
        "确保StreamReceiverGateway.afterInit()",
      );

      // degraded状态
      const error3 = new GatewayBroadcastError(
        mockSymbol,
        { status: "degraded" },
        "Server not fully initialized",
      );
      expect(error3.getRecommendation()).toContain(
        "检查Gateway服务器初始化状态",
      );

      // unhealthy状态
      const error4 = new GatewayBroadcastError(
        mockSymbol,
        { status: "unhealthy" },
        "Health check failed",
      );
      expect(error4.getRecommendation()).toContain("立即检查Gateway健康状态");

      // 其他情况
      const error5 = new GatewayBroadcastError(
        mockSymbol,
        { status: "healthy" },
        "网络错误",
      );
      expect(error5.getRecommendation()).toContain("检查Gateway连接状态");
    });
  });

  describe("JSON序列化功能", () => {
    test("应该正确序列化为JSON", () => {
      const error = new GatewayBroadcastError(
        mockSymbol,
        mockHealthStatus,
        mockReason,
      );
      const json = error.toJSON();

      expect(json).toEqual({
        errorType: "GatewayBroadcastError",
        symbol: mockSymbol,
        reason: mockReason,
        healthStatus: mockHealthStatus,
        timestamp: error.timestamp,
        message: error.message,
        isCritical: true, // 因为healthStatus.status是unhealthy
        recommendation: expect.any(String),
        stack: error.stack,
      });
    });
  });

  describe("实际使用场景测试", () => {
    test("Gateway服务器不可用场景", () => {
      const healthStatus = {
        status: "unhealthy",
        details: { reason: "No server instance" },
      };

      const error = new GatewayBroadcastError(
        "700.HK",
        healthStatus,
        "WebSocket服务器不可用",
      );

      expect(error.isCritical()).toBe(true);
      expect(error.getRecommendation()).toContain("立即检查Gateway健康状态");
      expect(error.message).toBe(
        "Gateway广播失败 [700.HK]: WebSocket服务器不可用",
      );
    });

    test("Gateway广播返回失败场景", () => {
      const healthStatus = {
        status: "healthy",
        details: { connectedClients: 5 },
      };

      const error = new GatewayBroadcastError(
        "AAPL.US",
        healthStatus,
        "Gateway广播返回失败状态",
      );

      expect(error.isCritical()).toBe(false);
      expect(error.symbol).toBe("AAPL.US");
      expect(error.healthStatus).toEqual(healthStatus);
    });

    test("Gateway广播异常场景", () => {
      const healthStatus = {
        status: "degraded",
        details: { reason: "Server not fully initialized" },
      };

      const error = new GatewayBroadcastError(
        "TSLA.US",
        healthStatus,
        "Gateway广播异常: Connection timeout",
      );

      expect(error.reason).toBe("Gateway广播异常: Connection timeout");
      expect(error.getRecommendation()).toContain(
        "检查Gateway服务器初始化状态",
      );
    });
  });
});
