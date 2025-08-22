/* eslint-disable @typescript-eslint/no-unused-vars */
/**
 * MonitoringQueryDto 单元测试
 * 测试监控查询DTO的验证功能
 */

import { validate } from "class-validator";
import { plainToClass } from "class-transformer";

import {
  GetDbPerformanceQueryDto,
  MonitoringDateRangeValidator,
} from "../../../../../src/monitoring/dto/monitoring-query.dto";

describe("MonitoringQueryDto", () => {
  describe("GetDbPerformanceQueryDto", () => {
    it("应该允许空的查询参数", async () => {
      // Arrange
      const dto = plainToClass(GetDbPerformanceQueryDto, {});

      // Act
      const errors = await validate(dto);

      // Assert
      expect(errors).toHaveLength(0);
    });

    it("应该允许有效的日期字符串", async () => {
      // Arrange
      const validData = {
        startDate: "2024-01-01T00:00:00.000Z",
        endDate: "2024-01-15T23:59:59.999Z",
      };
      const dto = plainToClass(GetDbPerformanceQueryDto, validData);

      // Act
      const errors = await validate(dto);

      // Assert
      expect(errors).toHaveLength(0);
    });

    it("应该拒绝无效的日期格式", async () => {
      // Arrange - 只有startDate是无效格式，而endDate是有效格式
      const invalidData = {
        startDate: "invalid-date", // 无效的日期格式
        endDate: "2024-01-15", // 有效的ISO 8601日期格式
      };
      const dto = plainToClass(GetDbPerformanceQueryDto, invalidData);

      // Act
      const errors = await validate(dto);

      // Assert
      expect(errors.length).toBeGreaterThan(0);
      const startDateErrors = errors.find((e) => e.property === "startDate");

      // startDate应该有错误
      expect(startDateErrors?.constraints?._isDateString).toBeDefined();

      // 检查endDate不应该有MonitoringDateRangeValidator错误，因为我们跳过了无效日期的范围验证
      const endDateErrors = errors.find((e) => e.property === "endDate");
      expect(
        endDateErrors?.constraints?.MonitoringDateRangeValidator,
      ).toBeUndefined();
    });

    it("应该验证日期范围不超过31天", async () => {
      // Arrange - 32天的范围
      const longRangeData = {
        startDate: "2024-01-01T00:00:00.000Z",
        endDate: "2024-02-02T00:00:00.000Z", // 32天后
      };
      const dto = plainToClass(GetDbPerformanceQueryDto, longRangeData);

      // Act
      const errors = await validate(dto);

      // Assert
      expect(errors.length).toBeGreaterThan(0);
      const endDateError = errors.find((e) => e.property === "endDate");
      expect(endDateError?.constraints).toHaveProperty(
        "MonitoringDateRangeValidator",
      );
    });

    it("应该允许31天以内的日期范围", async () => {
      // Arrange - 正好31天的范围
      const validRangeData = {
        startDate: "2024-01-01T00:00:00.000Z",
        endDate: "2024-02-01T00:00:00.000Z", // 31天后
      };
      const dto = plainToClass(GetDbPerformanceQueryDto, validRangeData);

      // Act
      const errors = await validate(dto);

      // Assert
      expect(errors).toHaveLength(0);
    });

    it("应该拒绝开始日期晚于结束日期的情况", async () => {
      // Arrange
      const invalidRangeData = {
        startDate: "2024-01-15T00:00:00.000Z",
        endDate: "2024-01-01T00:00:00.000Z", // 结束日期早于开始日期
      };
      const dto = plainToClass(GetDbPerformanceQueryDto, invalidRangeData);

      // Act
      const errors = await validate(dto);

      // Assert
      expect(errors.length).toBeGreaterThan(0);
      const endDateError = errors.find((e) => e.property === "endDate");
      expect(endDateError?.constraints).toHaveProperty(
        "MonitoringDateRangeValidator",
      );
    });

    it("应该允许只有开始日期", async () => {
      // Arrange
      const partialData = {
        startDate: "2024-01-01T00:00:00.000Z",
      };
      const dto = plainToClass(GetDbPerformanceQueryDto, partialData);

      // Act
      const errors = await validate(dto);

      // Assert
      expect(errors).toHaveLength(0);
    });

    it("应该允许只有结束日期", async () => {
      // Arrange
      const partialData = {
        endDate: "2024-01-15T23:59:59.999Z",
      };
      const dto = plainToClass(GetDbPerformanceQueryDto, partialData);

      // Act
      const errors = await validate(dto);

      // Assert
      expect(errors).toHaveLength(0);
    });
  });

  describe("MonitoringDateRangeValidator", () => {
    let validator: MonitoringDateRangeValidator;

    beforeEach(() => {
      validator = new MonitoringDateRangeValidator();
    });

    describe("validate", () => {
      it("应该在没有开始日期时返回true", () => {
        // Arrange
        const mockArgs = {
          object: { startDate: undefined },
          const_raints: ["startDate"],
        } as any;

        // Act
        const result = validator.validate("2024-01-15T00:00:00.000Z", mockArgs);

        // Assert
        expect(result).toBe(true);
      });

      it("应该在没有结束日期时返回true", () => {
        // Arrange
        const mockArgs = {
          object: { startDate: "2024-01-01T00:00:00.000Z" },
          const_raints: ["startDate"],
        } as any;

        // Act
        const result = validator.validate(undefined as any, mockArgs);

        // Assert
        expect(result).toBe(true);
      });

      it("应该验证有效的日期范围", () => {
        // Arrange
        const mockArgs = {
          object: { startDate: "2024-01-01T00:00:00.000Z" },
          const_raints: ["startDate"],
        } as any;

        // Act
        const result = validator.validate("2024-01-15T00:00:00.000Z", mockArgs);

        // Assert
        expect(result).toBe(true);
      });

      it("应该拒绝超过31天的日期范围", () => {
        // Arrange
        const mockArgs = {
          object: { startDate: "2024-01-01T00:00:00.000Z" },
          const_raints: ["startDate"],
        } as any;

        // Act
        const result = validator.validate("2024-02-02T00:00:00.000Z", mockArgs); // 32天后

        // Assert
        expect(result).toBe(false);
      });

      it("应该拒绝开始日期晚于结束日期", () => {
        // Arrange
        const mockArgs = {
          object: { startDate: "2024-01-15T00:00:00.000Z" },
          const_raints: ["startDate"],
        } as any;

        // Act
        const result = validator.validate("2024-01-01T00:00:00.000Z", mockArgs);

        // Assert
        expect(result).toBe(false);
      });

      it("应该拒绝无效的开始日期格式", () => {
        // Arrange
        const mockArgs = {
          object: { startDate: "invalid-date" },
          const_raints: ["startDate"],
        } as any;

        // Act
        const result = validator.validate("2024-01-15T00:00:00.000Z", mockArgs);

        // Assert
        expect(result).toBe(false);
      });

      it("应该拒绝无效的结束日期格式", () => {
        // Arrange
        const mockArgs = {
          object: { startDate: "2024-01-01T00:00:00.000Z" },
          const_raints: ["startDate"],
        } as any;

        // Act
        const result = validator.validate("invalid-date", mockArgs);

        // Assert
        expect(result).toBe(false);
      });

      it("应该允许正好31天的日期范围", () => {
        // Arrange
        const mockArgs = {
          object: { startDate: "2024-01-01T00:00:00.000Z" },
          const_raints: ["startDate"],
        } as any;

        // Act
        const result = validator.validate("2024-02-01T00:00:00.000Z", mockArgs); // 正好31天

        // Assert
        expect(result).toBe(true);
      });

      it("应该正确处理相同日期", () => {
        // Arrange
        const mockArgs = {
          object: { startDate: "2024-01-01T00:00:00.000Z" },
          const_raints: ["startDate"],
        } as any;

        // Act
        const result = validator.validate("2024-01-01T00:00:00.000Z", mockArgs);

        // Assert
        expect(result).toBe(true);
      });

      it("应该正确处理跨年的日期范围", () => {
        // Arrange
        const mockArgs = {
          object: { startDate: "2023-12-20T00:00:00.000Z" },
          const_raints: ["startDate"],
        } as any;

        // Act
        const result = validator.validate("2024-01-15T00:00:00.000Z", mockArgs); // 跨年26天

        // Assert
        expect(result).toBe(true);
      });

      it("应该拒绝跨年超过31天的日期范围", () => {
        // Arrange
        const mockArgs = {
          object: { startDate: "2023-12-01T00:00:00.000Z" },
          const_raints: ["startDate"],
        } as any;

        // Act
        const result = validator.validate("2024-01-15T00:00:00.000Z", mockArgs); // 跨年45天

        // Assert
        expect(result).toBe(false);
      });

      it("应该处理闰年的日期计算", () => {
        // Arrange - 2024年是闰年，2月有29天
        const mockArgs = {
          object: { startDate: "2024-02-01T00:00:00.000Z" },
          const_raints: ["startDate"],
        } as any;

        // Act
        const result = validator.validate("2024-03-02T00:00:00.000Z", mockArgs); // 30天（包含闰年2月29日）

        // Assert
        expect(result).toBe(true);
      });
    });

    describe("defaultMessage", () => {
      it("应该返回正确的错误消息", () => {
        // Act
        const message = validator.defaultMessage();

        // Assert
        expect(message).toBe(
          "The date range cannot exceed 31 days, and the start date must be before the end date.",
        );
      });
    });

    describe("边界条件测试", () => {
      it("应该只考虑日期部分，忽略时间部分", () => {
        // Arrange
        const mockArgs = {
          object: { startDate: "2024-01-01T00:00:00.000Z" },
          const_raints: ["startDate"],
        } as any;

        // Act - 即使包含时间部分，也只关心日期部分
        const result = validator.validate("2024-02-_01T23:59:59.999Z", mockArgs);

        // Assert - 结果应该是 true，因为我们只比较日期部分 (2024-01-01 到 2024-02-01 是 31 天)
        expect(result).toBe(true);
      });

      it("应该处理时区差异", () => {
        // Arrange
        const mockArgs = {
          object: { startDate: "2024-01-01T08:00:00+08:00" }, // 北京时间
          const_raints: ["startDate"],
        } as any;

        // Act
        const result = validator.validate(
          "2024-01-_15T16:00:00-_05:00",
          mockArgs,
        ); // 美国东部时间

        // Assert
        expect(result).toBe(true); // 日期计算应该基于UTC
      });
    });
  });
});
