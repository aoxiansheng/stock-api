import { validate } from "class-validator";
import { plainToClass } from "class-transformer";
import {
  GetVulnerabilitiesQueryDto,
  GetAuditEventsQueryDto,
  SecurityDateRangeValidator,
  RecordManualEventDto,
} from "../../../../../src/security/dto/security-query.dto";

describe("Security Query DTOs", () => {
  describe("GetVulnerabilitiesQueryDto", () => {
    it("应该验证有效的漏洞查询参数", async () => {
      const queryData = {
        severity: "critical",
        type: "injection",
      };

      const dto = plainToClass(GetVulnerabilitiesQueryDto, queryData);
      const errors = await validate(dto);

      expect(errors).toHaveLength(0);
      expect(dto.severity).toBe("critical");
      expect(dto.type).toBe("injection");
    });

    it("应该验证空的查询参数", async () => {
      const queryData = {};

      const dto = plainToClass(GetVulnerabilitiesQueryDto, queryData);
      const errors = await validate(dto);

      expect(errors).toHaveLength(0);
      expect(dto.severity).toBeUndefined();
      expect(dto.type).toBeUndefined();
    });

    it("应该拒绝无效的严重程度值", async () => {
      const queryData = {
        severity: "invalid-severity",
      };

      const dto = plainToClass(GetVulnerabilitiesQueryDto, queryData);
      const errors = await validate(dto);

      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe("severity");
      expect(errors[0].constraints).toHaveProperty("isIn");
    });

    it("应该拒绝无效的漏洞类型", async () => {
      const queryData = {
        type: "invalid-type",
      };

      const dto = plainToClass(GetVulnerabilitiesQueryDto, queryData);
      const errors = await validate(dto);

      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe("type");
      expect(errors[0].constraints).toHaveProperty("isIn");
    });

    it("应该验证所有有效的严重程度值", async () => {
      const validSeverities = ["critical", "high", "medium", "low", "info"];

      for (const severity of validSeverities) {
        const queryData = { severity };
        const dto = plainToClass(GetVulnerabilitiesQueryDto, queryData);
        const errors = await validate(dto);

        expect(errors).toHaveLength(0);
        expect(dto.severity).toBe(severity);
      }
    });

    it("应该验证所有有效的漏洞类型", async () => {
      const validTypes = [
        "authentication",
        "authorization",
        "data_exposure",
        "injection",
        "configuration",
        "encryption",
      ];

      for (const type of validTypes) {
        const queryData = { type };
        const dto = plainToClass(GetVulnerabilitiesQueryDto, queryData);
        const errors = await validate(dto);

        expect(errors).toHaveLength(0);
        expect(dto.type).toBe(type);
      }
    });
  });

  describe("GetAuditEventsQueryDto", () => {
    it("应该验证有效的审计事件查询参数", async () => {
      const queryData = {
        startDate: "2023-01-01T00:00:00.000Z",
        endDate: "2023-01-10T00:00:00.000Z",
        type: "authentication",
        severity: "high",
        clientIP: "192.168.1.1",
        outcome: "success",
        limit: 50,
        offset: 10,
      };

      const dto = plainToClass(GetAuditEventsQueryDto, queryData);
      const errors = await validate(dto);

      expect(errors).toHaveLength(0);
      expect(dto.startDate).toBe(queryData.startDate);
      expect(dto.endDate).toBe(queryData.endDate);
      expect(dto.type).toBe(queryData.type);
      expect(dto.severity).toBe(queryData.severity);
      expect(dto.clientIP).toBe(queryData.clientIP);
      expect(dto.outcome).toBe(queryData.outcome);
      expect(dto.limit).toBe(queryData.limit);
      expect(dto.offset).toBe(queryData.offset);
    });

    it("应该使用默认的分页参数", async () => {
      const queryData = {};

      const dto = plainToClass(GetAuditEventsQueryDto, queryData);
      const errors = await validate(dto);

      expect(errors).toHaveLength(0);
      expect(dto.limit).toBe(100);
      expect(dto.offset).toBe(0);
    });

    it("应该拒绝无效的日期格式", async () => {
      const queryData = {
        startDate: "invalid-date",
        endDate: "2023-01-10T00:00:00.000Z",
      };

      const dto = plainToClass(GetAuditEventsQueryDto, queryData);
      const errors = await validate(dto);

      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe("startDate");
      expect(errors[0].constraints).toHaveProperty("isDateString");
    });

    it("应该拒绝超出范围的limit值", async () => {
      const queryData = {
        limit: 1001, // 超出最大值1000
      };

      const dto = plainToClass(GetAuditEventsQueryDto, queryData);
      const errors = await validate(dto);

      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe("limit");
      expect(errors[0].constraints).toHaveProperty("max");
    });

    it("应该拒绝负数offset值", async () => {
      const queryData = {
        offset: -5,
      };

      const dto = plainToClass(GetAuditEventsQueryDto, queryData);
      const errors = await validate(dto);

      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe("offset");
      expect(errors[0].constraints).toHaveProperty("min");
    });

    it("应该拒绝无效的IP地址", async () => {
      const queryData = {
        clientIP: "not-an-ip",
      };

      const dto = plainToClass(GetAuditEventsQueryDto, queryData);
      const errors = await validate(dto);

      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe("clientIP");
      expect(errors[0].constraints).toHaveProperty("isIp");
    });
  });

  describe("SecurityDateRangeValidator", () => {
    it("应该验证日期范围在允许的时间范围内", () => {
      const validator = new SecurityDateRangeValidator();
      const obj = {
        startDate: "2023-01-01T00:00:00.000Z",
        endDate: "2023-01-15T00:00:00.000Z",
      };

      const result = validator.validate(null, { object: obj } as any);
      expect(result).toBe(true);
    });

    it("应该拒绝开始日期晚于结束日期", () => {
      const validator = new SecurityDateRangeValidator();
      const obj = {
        startDate: "2023-01-15T00:00:00.000Z",
        endDate: "2023-01-01T00:00:00.000Z",
      };

      const result = validator.validate(null, { object: obj } as any);
      expect(result).toBe(false);
    });

    it("应该拒绝超过90天的日期范围", () => {
      const validator = new SecurityDateRangeValidator();
      const obj = {
        startDate: "2023-01-01T00:00:00.000Z",
        endDate: "2023-04-15T00:00:00.000Z", // 超过90天
      };

      const result = validator.validate(null, { object: obj } as any);
      expect(result).toBe(false);
    });

    it("应该生成适当的错误消息", () => {
      const validator = new SecurityDateRangeValidator();

      // 开始日期晚于结束日期的错误消息
      const obj1 = {
        startDate: "2023-01-15T00:00:00.000Z",
        endDate: "2023-01-01T00:00:00.000Z",
      };
      const message1 = validator.defaultMessage({ object: obj1 } as any);
      expect(message1).toBe("startDate must be before endDate");

      // 日期范围过长的错误消息
      const obj2 = {
        startDate: "2023-01-01T00:00:00.000Z",
        endDate: "2023-04-15T00:00:00.000Z",
      };
      const message2 = validator.defaultMessage({ object: obj2 } as any);
      expect(message2).toBe("The date range cannot exceed 90 days");
    });

    it("应该处理缺少日期的情况", () => {
      const validator = new SecurityDateRangeValidator();

      // 缺少开始日期
      const obj1 = { endDate: "2023-01-15T00:00:00.000Z" };
      const result1 = validator.validate(null, { object: obj1 } as any);
      expect(result1).toBe(true);

      // 缺少结束日期
      const obj2 = { startDate: "2023-01-01T00:00:00.000Z" };
      const result2 = validator.validate(null, { object: obj2 } as any);
      expect(result2).toBe(true);
    });
  });

  describe("RecordManualEventDto", () => {
    it("应该验证有效的手动事件记录", async () => {
      const eventData = {
        type: "authentication",
        severity: "high",
        action: "Manual login attempt",
        clientIP: "192.168.1.1",
        userAgent: "Mozilla/5.0",
        outcome: "success",
        userId: "user-123",
        apiKeyId: "key-456",
        details: { reason: "Suspicious activity" },
      };

      const dto = plainToClass(RecordManualEventDto, eventData);
      const errors = await validate(dto);

      expect(errors).toHaveLength(0);
      expect(dto.type).toBe(eventData.type);
      expect(dto.severity).toBe(eventData.severity);
      expect(dto.action).toBe(eventData.action);
      expect(dto.clientIP).toBe(eventData.clientIP);
      expect(dto.userAgent).toBe(eventData.userAgent);
      expect(dto.outcome).toBe(eventData.outcome);
      expect(dto.userId).toBe(eventData.userId);
      expect(dto.apiKeyId).toBe(eventData.apiKeyId);
      expect(dto.details).toEqual(eventData.details);
    });

    it("应该验证最小必填字段", async () => {
      const eventData = {
        type: "authentication",
        severity: "high",
        action: "Manual login attempt",
        clientIP: "192.168.1.1",
        userAgent: "Mozilla/5.0",
        outcome: "success",
      };

      const dto = plainToClass(RecordManualEventDto, eventData);
      const errors = await validate(dto);

      expect(errors).toHaveLength(0);
      expect(dto.userId).toBeUndefined();
      expect(dto.apiKeyId).toBeUndefined();
      expect(dto.details).toBeUndefined();
    });

    it("应该拒绝缺少必填字段的请求", async () => {
      const eventData = {
        // 缺少type, severity, action, clientIP, userAgent, outcome
        userId: "user-123",
      };

      const dto = plainToClass(RecordManualEventDto, eventData);
      const errors = await validate(dto);

      expect(errors.length).toBeGreaterThan(0);
      const properties = errors.map((e) => e.property);
      expect(properties).toContain("type");
      expect(properties).toContain("severity");
      expect(properties).toContain("action");
      expect(properties).toContain("clientIP");
      expect(properties).toContain("userAgent");
      expect(properties).toContain("outcome");
    });

    it("应该验证所有有效的事件类型", async () => {
      const validTypes = [
        "authentication",
        "authorization",
        "data_access",
        "system",
        "suspicious_activity",
      ];

      for (const type of validTypes) {
        const eventData = {
          type,
          severity: "high",
          action: "Test action",
          clientIP: "192.168.1.1",
          userAgent: "Mozilla/5.0",
          outcome: "success",
        };

        const dto = plainToClass(RecordManualEventDto, eventData);
        const errors = await validate(dto);

        expect(errors).toHaveLength(0);
        expect(dto.type).toBe(type);
      }
    });

    it("应该验证所有有效的事件结果", async () => {
      const validOutcomes = ["success", "failure", "blocked"];

      for (const outcome of validOutcomes) {
        const eventData = {
          type: "authentication",
          severity: "high",
          action: "Test action",
          clientIP: "192.168.1.1",
          userAgent: "Mozilla/5.0",
          outcome,
        };

        const dto = plainToClass(RecordManualEventDto, eventData);
        const errors = await validate(dto);

        expect(errors).toHaveLength(0);
        expect(dto.outcome).toBe(outcome);
      }
    });

    it("应该拒绝空的操作描述", async () => {
      const eventData = {
        type: "authentication",
        severity: "high",
        action: "", // 空字符串
        clientIP: "192.168.1.1",
        userAgent: "Mozilla/5.0",
        outcome: "success",
      };

      const dto = plainToClass(RecordManualEventDto, eventData);
      const errors = await validate(dto);

      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe("action");
      expect(errors[0].constraints).toHaveProperty("isNotEmpty");
    });
  });
});
