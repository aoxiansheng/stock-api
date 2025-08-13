/* eslint-disable @typescript-eslint/no-unused-vars */
import { plainToClass } from "class-transformer";
import { validate } from "class-validator";
import {
  CreateAlertDataDto,
  AlertStatusUpdateDataDto,
  AlertQueryParamsDto,
  AlertCleanupParamsDto,
  ActiveAlertsQueryOptionsDto,
  AlertOperationHistoryDto,
} from "../../../../../src/alert/dto/alert-history-internal.dto";
import { AlertStatus } from "../../../../../src/alert/types/alert.types";

describe("AlertHistoryInternalDTOs", () => {
  describe("CreateAlertDataDto", () => {
    it("should pass validation with valid data", async () => {
      const dto = plainToClass(CreateAlertDataDto, {
        ruleId: "rule-1",
        ruleName: "Test Rule",
        message: "This is a test alert",
        severity: "critical",
        currentValue: 100,
        threshold: 90,
        metric: "cpu.usage",
      });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });
  });

  describe("AlertStatusUpdateDataDto", () => {
    it("should pass validation with valid data", async () => {
      const dto = plainToClass(AlertStatusUpdateDataDto, {
        status: AlertStatus.ACKNOWLEDGED,
        acknowledgedBy: "admin",
      });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });
  });

  describe("AlertQueryParamsDto", () => {
    it("should pass validation with valid data", async () => {
      const dto = plainToClass(AlertQueryParamsDto, {
        page: 1,
        limit: 10,
        status: AlertStatus.FIRING,
      });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });
  });

  describe("AlertCleanupParamsDto", () => {
    it("should pass validation with valid data", async () => {
      const dto = plainToClass(AlertCleanupParamsDto, { daysToKeep: 30 });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });
  });

  describe("ActiveAlertsQueryOptionsDto", () => {
    it("should pass validation with valid data", async () => {
      const dto = plainToClass(ActiveAlertsQueryOptionsDto, {
        includeSeverities: ["critical", "warning"],
      });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });
  });

  describe("AlertOperationHistoryDto", () => {
    it("should pass validation with valid data", async () => {
      const dto = plainToClass(AlertOperationHistoryDto, {
        operationType: "create",
        operationTime: new Date(),
      });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });
  });
});
