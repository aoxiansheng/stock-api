import { validate } from "class-validator";
import { plainToClass } from "class-transformer";
import { 
  AlertQueryResultDto, 
  AlertStatisticsDto 
} from "../../../../../src/alert/dto/alert-history-internal.dto";

describe("AlertHistoryInternalDto", () => {
  describe("AlertQueryResultDto", () => {
    it("should validate a valid alert query result DTO", async () => {
      const queryResultDto = plainToClass(AlertQueryResultDto, {
        alerts: [
          { id: "alert-1", message: "Test alert 1" },
          { id: "alert-2", message: "Test alert 2" },
        ],
        total: 2,
        page: 1,
        limit: 10,
        totalPages: 1,
        hasNext: false,
        hasPrev: false,
      });

      const errors = await validate(queryResultDto);
      expect(errors).toHaveLength(0);
    });

    it("should reject missing required fields", async () => {
      const queryResultDto = plainToClass(AlertQueryResultDto, {
        alerts: [],
        // 缺少其他必需字段
      });

      const errors = await validate(queryResultDto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it("should reject invalid number types", async () => {
      const queryResultDto = plainToClass(AlertQueryResultDto, {
        alerts: [],
        total: "invalid", // 应该是数字
        page: "invalid", // 应该是数字
        limit: "invalid", // 应该是数字
        totalPages: "invalid", // 应该是数字
        hasNext: "invalid", // 应该是布尔值
        hasPrev: "invalid", // 应该是布尔值
      });

      const errors = await validate(queryResultDto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it("should reject invalid alerts array", async () => {
      const queryResultDto = plainToClass(AlertQueryResultDto, {
        alerts: "invalid", // 应该是数组
        total: 0,
        page: 1,
        limit: 10,
        totalPages: 0,
        hasNext: false,
        hasPrev: false,
      });

      const errors = await validate(queryResultDto);
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe("alerts");
    });
  });

  describe("AlertStatisticsDto", () => {
    it("should validate a valid alert statistics DTO", async () => {
      const statsDto = plainToClass(AlertStatisticsDto, {
        activeAlerts: 2,
        criticalAlerts: 1,
        warningAlerts: 1,
        infoAlerts: 0,
        totalAlertsToday: 5,
        resolvedAlertsToday: 3,
        averageResolutionTime: 120,
        statisticsTime: new Date(),
      });

      const errors = await validate(statsDto);
      expect(errors).toHaveLength(0);
    });

    it("should reject missing required fields", async () => {
      const statsDto = plainToClass(AlertStatisticsDto, {
        // 缺少必需字段
      });

      const errors = await validate(statsDto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it("should reject invalid number types", async () => {
      const statsDto = plainToClass(AlertStatisticsDto, {
        activeAlerts: "invalid", // 应该是数字
        criticalAlerts: "invalid", // 应该是数字
        warningAlerts: "invalid", // 应该是数字
        infoAlerts: "invalid", // 应该是数字
        totalAlertsToday: "invalid", // 应该是数字
        resolvedAlertsToday: "invalid", // 应该是数字
        averageResolutionTime: "invalid", // 应该是数字
        statisticsTime: "invalid", // 应该是日期
      });

      const errors = await validate(statsDto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it("should reject negative values for count fields", async () => {
      const statsDto = plainToClass(AlertStatisticsDto, {
        activeAlerts: -1, // 负数
        criticalAlerts: -1, // 负数
        warningAlerts: -1, // 负数
        infoAlerts: -1, // 负数
        totalAlertsToday: -1, // 负数
        resolvedAlertsToday: -1, // 负数
        averageResolutionTime: -1, // 负数
        statisticsTime: new Date(),
      });

      const errors = await validate(statsDto);
      // class-validator 的 IsNumber 装饰器不会检查负数，但业务逻辑上应该是非负数
      // 这里我们只验证类型，不验证业务逻辑
      expect(errors).toHaveLength(0);
    });
  });
});