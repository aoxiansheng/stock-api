/**
 * AlertRuleValidator 增强功能测试
 * 🎯 验证器增强后的测试用例
 *
 * @description 测试验证器的ID格式验证和错误消息格式统一性
 * @author Claude Code Assistant
 * @date 2025-09-17
 */

import { Test, TestingModule } from "@nestjs/testing";
import { ConfigService } from "@nestjs/config";
import { AlertRuleValidator } from "../../../../../src/alert/validators/alert-rule.validator";
import { IAlertRule } from "../../../../../src/alert/interfaces";

describe("AlertRuleValidator - Enhanced Features", () => {
  let validator: AlertRuleValidator;
  let configService: ConfigService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AlertRuleValidator,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockImplementation((key) => {
              if (key === "alert") {
                return {
                  validation: {
                    duration: { min: 30, max: 3600 },
                    cooldown: { min: 60, max: 86400 },
                  },
                };
              }
              return null;
            }),
          },
        },
        {
          provide: 'cacheUnified',
          useValue: {
            defaultTtl: 300,
          },
        },
      ],
    }).compile();

    validator = module.get<AlertRuleValidator>(AlertRuleValidator);
    configService = module.get<ConfigService>(ConfigService);
  });

  describe("ID格式验证", () => {
    it("应该通过有效的ObjectId验证", () => {
      const validRule: IAlertRule = {
        id: "507f1f77bcf86cd799439011", // 有效的ObjectId
        name: "test-rule",
        metric: "cpu_usage",
        operator: ">",
        threshold: 80,
        duration: 60,
        cooldown: 300,
        severity: "warning",
        channels: [
          { name: "email-channel", type: "email", enabled: true, config: {} },
        ],
        enabled: true,
        tags: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = validator.validateRule(validRule);
      expect(result.valid).toBe(true);
      expect(result.errors).not.toEqual(
        expect.arrayContaining([expect.stringMatching(/无效的告警规则ID格式/)]),
      );
    });

    it("应该拒绝无效的ObjectId格式", () => {
      const invalidRule: IAlertRule = {
        id: "invalid-id-format", // 无效的ObjectId
        name: "test-rule",
        metric: "cpu_usage",
        operator: ">",
        threshold: 80,
        duration: 60,
        cooldown: 300,
        severity: "warning",
        channels: [
          { name: "email-channel", type: "email", enabled: true, config: {} },
        ],
        enabled: true,
        tags: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = validator.validateRule(invalidRule);
      expect(result.valid).toBe(false);
      expect(result.errors).toEqual(
        expect.arrayContaining([expect.stringMatching(/无效的告警规则ID格式/)]),
      );
    });

    it("应该允许空的rule.id（创建新规则时）", () => {
      const ruleWithoutId: Partial<IAlertRule> = {
        name: "test-rule",
        metric: "cpu_usage",
        operator: ">",
        threshold: 80,
        duration: 60,
        cooldown: 300,
        severity: "warning",
        channels: [
          { name: "email-channel", type: "email", enabled: true, config: {} },
        ],
        enabled: true,
        tags: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = validator.validateRule(ruleWithoutId as IAlertRule);
      expect(result.valid).toBe(true);
      expect(result.errors).not.toEqual(
        expect.arrayContaining([expect.stringMatching(/无效的告警规则ID格式/)]),
      );
    });
  });

  describe("错误消息格式统一性", () => {
    it("应该返回统一格式的规则名称错误消息", () => {
      const invalidRule: IAlertRule = {
        id: "507f1f77bcf86cd799439011",
        name: "", // 无效的规则名称
        metric: "cpu_usage",
        operator: ">",
        threshold: 80,
        duration: 60,
        cooldown: 300,
        severity: "warning",
        channels: [
          { name: "email-channel", type: "email", enabled: true, config: {} },
        ],
        enabled: true,
        tags: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = validator.validateRule(invalidRule);
      expect(result.valid).toBe(false);
      expect(result.errors).toEqual(
        expect.arrayContaining([
          expect.stringMatching(/无效的规则名称格式.*\(空\)/),
        ]),
      );
    });

    it("应该返回统一格式的监控指标错误消息", () => {
      const invalidRule: IAlertRule = {
        id: "507f1f77bcf86cd799439011",
        name: "test-rule",
        metric: "", // 无效的监控指标
        operator: ">",
        threshold: 80,
        duration: 60,
        cooldown: 300,
        severity: "warning",
        channels: [
          { name: "email-channel", type: "email", enabled: true, config: {} },
        ],
        enabled: true,
        tags: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = validator.validateRule(invalidRule);
      expect(result.valid).toBe(false);
      expect(result.errors).toEqual(
        expect.arrayContaining([
          expect.stringMatching(/无效的监控指标名称格式.*\(空\)/),
        ]),
      );
    });

    it("应该返回统一格式的阈值错误消息", () => {
      const invalidRule: IAlertRule = {
        id: "507f1f77bcf86cd799439011",
        name: "test-rule",
        metric: "cpu_usage",
        operator: ">",
        threshold: NaN, // 无效的阈值
        duration: 60,
        cooldown: 300,
        severity: "warning",
        channels: [
          { name: "email-channel", type: "email", enabled: true, config: {} },
        ],
        enabled: true,
        tags: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = validator.validateRule(invalidRule);
      expect(result.valid).toBe(false);
      expect(result.errors).toEqual(
        expect.arrayContaining([
          expect.stringMatching(/无效的阈值.*必须是有效数字/),
        ]),
      );
    });

    it("应该返回统一格式的持续时间错误消息", () => {
      const invalidRule: IAlertRule = {
        id: "507f1f77bcf86cd799439011",
        name: "test-rule",
        metric: "cpu_usage",
        operator: ">",
        threshold: 80,
        duration: 10, // 小于最小值30
        cooldown: 300,
        severity: "warning",
        channels: [
          { name: "email-channel", type: "email", enabled: true, config: {} },
        ],
        enabled: true,
        tags: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = validator.validateRule(invalidRule);
      expect(result.valid).toBe(false);
      expect(result.errors).toEqual(
        expect.arrayContaining([
          expect.stringMatching(/无效的持续时间.*必须在30-3600秒之间/),
        ]),
      );
    });

    it("应该返回统一格式的冷却时间错误消息", () => {
      const invalidRule: IAlertRule = {
        id: "507f1f77bcf86cd799439011",
        name: "test-rule",
        metric: "cpu_usage",
        operator: ">",
        threshold: 80,
        duration: 60,
        cooldown: 30, // 小于最小值60
        severity: "warning",
        channels: [
          { name: "email-channel", type: "email", enabled: true, config: {} },
        ],
        enabled: true,
        tags: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = validator.validateRule(invalidRule);
      expect(result.valid).toBe(false);
      expect(result.errors).toEqual(
        expect.arrayContaining([
          expect.stringMatching(/无效的冷却时间.*必须在60-86400秒之间/),
        ]),
      );
    });

    it("应该返回统一格式的通知渠道错误消息", () => {
      const invalidRule: IAlertRule = {
        id: "507f1f77bcf86cd799439011",
        name: "test-rule",
        metric: "cpu_usage",
        operator: ">",
        threshold: 80,
        duration: 60,
        cooldown: 300,
        severity: "warning",
        channels: [], // 空的通知渠道
        enabled: true,
        tags: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = validator.validateRule(invalidRule);
      expect(result.valid).toBe(false);
      expect(result.errors).toEqual(
        expect.arrayContaining([
          expect.stringMatching(/无效的通知渠道配置.*至少需要配置一个通知渠道/),
        ]),
      );
    });
  });

  describe("完整功能验证", () => {
    it("应该同时检测多个错误并返回统一格式的错误消息", () => {
      const multipleErrorRule: any = {
        id: "invalid-id",
        name: "",
        metric: "",
        operator: "invalid",
        threshold: NaN,
        duration: 10,
        cooldown: 30,
        severity: "invalid",
        channels: [],
        enabled: true,
        tags: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = validator.validateRule(multipleErrorRule);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(5);

      // 验证每个错误消息都遵循统一格式
      result.errors.forEach((error) => {
        expect(error).toMatch(/^无效的/);
      });
    });
  });
});
