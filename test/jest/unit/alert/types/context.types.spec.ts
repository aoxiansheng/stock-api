import { 
  AlertContext, 
  NotificationMetadata, 
  StatsMetadata 
} from "../../../../../src/alert/types/context.types";

describe("ContextTypes", () => {
  describe("AlertContext", () => {
    it("should define the correct structure for alert context", () => {
      const context: AlertContext = {
        dataSource: "prometheus",
        market: "NASDAQ",
        symbol: "AAPL",
        triggerValue: 150.5,
        threshold: 150,
        operator: ">",
        triggeredAt: new Date(),
        environment: {
          hostname: "server-1",
          ip: "192.168.1.1",
          region: "us-east-1",
        },
      };

      // 验证可选字段
      expect(context.dataSource).toBeDefined();
      expect(context.market).toBeDefined();
      expect(context.symbol).toBeDefined();
      expect(context.triggerValue).toBeDefined();
      expect(context.threshold).toBeDefined();
      expect(context.operator).toBeDefined();
      expect(context.triggeredAt).toBeDefined();
      expect(context.environment).toBeDefined();

      // 验证环境信息字段
      if (context.environment) {
        expect(context.environment.hostname).toBeDefined();
        expect(context.environment.ip).toBeDefined();
        expect(context.environment.region).toBeDefined();
      }
    });

    it("should allow additional custom fields", () => {
      const context: AlertContext = {
        customField1: "value1",
        customField2: 123,
        nestedObject: {
          nestedField: "nestedValue",
        },
      };

      // 验证自定义字段
      expect(context.customField1).toBe("value1");
      expect(context.customField2).toBe(123);
      expect(context.nestedObject).toEqual({ nestedField: "nestedValue" });
    });

    it("should allow empty alert context", () => {
      const context: AlertContext = {};

      expect(context).toBeDefined();
    });
  });

  describe("NotificationMetadata", () => {
    it("should define the correct structure for notification metadata", () => {
      const metadata: NotificationMetadata = {
        sendStartTime: new Date("2023-01-01T00:00:00Z"),
        sendEndTime: new Date("2023-01-01T00:00:05Z"),
        sendDuration: 5000,
        retryCount: 2,
        httpStatusCode: 200,
        responseBody: "Notification sent successfully",
        errorMessage: undefined,
        errorStack: undefined,
        channelSpecific: {
          messageId: "msg-123",
          channelId: "channel-456",
          threadTs: "thread-789",
          phoneNumber: "+1234567890",
        },
      };

      // 验证可选字段
      expect(metadata.sendStartTime).toBeDefined();
      expect(metadata.sendEndTime).toBeDefined();
      expect(metadata.sendDuration).toBeDefined();
      expect(metadata.retryCount).toBeDefined();
      expect(metadata.httpStatusCode).toBeDefined();
      expect(metadata.responseBody).toBeDefined();
      expect(metadata.errorMessage).toBeUndefined();
      expect(metadata.errorStack).toBeUndefined();
      expect(metadata.channelSpecific).toBeDefined();

      // 验证渠道特定字段
      if (metadata.channelSpecific) {
        expect(metadata.channelSpecific.messageId).toBeDefined();
        expect(metadata.channelSpecific.channelId).toBeDefined();
        expect(metadata.channelSpecific.threadTs).toBeDefined();
        expect(metadata.channelSpecific.phoneNumber).toBeDefined();
      }
    });

    it("should allow additional custom fields", () => {
      const metadata: NotificationMetadata = {
        customField1: "value1",
        customField2: 123,
        nestedObject: {
          nestedField: "nestedValue",
        },
      };

      // 验证自定义字段
      expect(metadata.customField1).toBe("value1");
      expect(metadata.customField2).toBe(123);
      expect(metadata.nestedObject).toEqual({ nestedField: "nestedValue" });
    });

    it("should allow empty notification metadata", () => {
      const metadata: NotificationMetadata = {};

      expect(metadata).toBeDefined();
    });
  });

  describe("StatsMetadata", () => {
    it("should define the correct structure for stats metadata", () => {
      const metadata: StatsMetadata = {
        calculatedAt: new Date("2023-01-01T00:00:00Z"),
        period: "daily",
        dataPoints: 100,
        cacheHitRate: 0.95,
        performance: {
          queryTime: 100,
          processingTimeMs: 200,
          totalTime: 300,
        },
      };

      // 验证可选字段
      expect(metadata.calculatedAt).toBeDefined();
      expect(metadata.period).toBeDefined();
      expect(metadata.dataPoints).toBeDefined();
      expect(metadata.cacheHitRate).toBeDefined();
      expect(metadata.performance).toBeDefined();

      // 验证性能指标字段
      if (metadata.performance) {
        expect(metadata.performance.queryTime).toBeDefined();
        expect(metadata.performance.processingTimeMs).toBeDefined();
        expect(metadata.performance.totalTime).toBeDefined();
      }
    });

    it("should allow additional custom fields", () => {
      const metadata: StatsMetadata = {
        customField1: "value1",
        customField2: 123,
        nestedObject: {
          nestedField: "nestedValue",
        },
      };

      // 验证自定义字段
      expect(metadata.customField1).toBe("value1");
      expect(metadata.customField2).toBe(123);
      expect(metadata.nestedObject).toEqual({ nestedField: "nestedValue" });
    });

    it("should allow empty stats metadata", () => {
      const metadata: StatsMetadata = {};

      expect(metadata).toBeDefined();
    });
  });
});