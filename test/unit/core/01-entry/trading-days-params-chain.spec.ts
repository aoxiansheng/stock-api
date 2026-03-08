jest.mock("@common/logging/index", () => ({
  createLogger: () => ({
    debug: jest.fn(),
    log: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  }),
  sanitizeLogData: (data: unknown) => data,
}));

import { plainToInstance } from "class-transformer";
import { validate, ValidationError } from "class-validator";

import { CAPABILITY_NAMES } from "@providersv2/providers/constants/capability-names.constants";
import { QueryType } from "@core/01-entry/query/dto/query-types.dto";
import { QueryRequestDto } from "@core/01-entry/query/dto/query-request.dto";
import { QueryExecutionEngine } from "@core/01-entry/query/services/query-execution-engine.service";
import { DataRequestDto } from "@core/01-entry/receiver/dto/data-request.dto";
import { ReceiverService } from "@core/01-entry/receiver/services/receiver.service";

function collectValidationMessages(errors: ValidationError[]): string[] {
  const messages: string[] = [];
  for (const error of errors) {
    if (error.constraints) {
      messages.push(...Object.values(error.constraints));
    }
    if (error.children && error.children.length > 0) {
      messages.push(...collectValidationMessages(error.children));
    }
  }
  return messages;
}

function createQueryExecutionEngine(): QueryExecutionEngine {
  return new QueryExecutionEngine(
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
  );
}

function createReceiverService(): ReceiverService {
  const configService = {
    get: jest.fn(),
  };

  return new ReceiverService(
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    configService as any,
  );
}

describe("C2 trading-days 参数链路错误路径", () => {
  describe("QueryExecutionEngine -> ReceiverRequest", () => {
    it("startTime 格式非法时抛错", () => {
      const engine = createQueryExecutionEngine();
      const request = {
        queryType: QueryType.BY_SYMBOLS,
        queryTypeFilter: CAPABILITY_NAMES.GET_TRADING_DAYS,
        startTime: "2026/01/01",
        endTime: "20260131",
      } as QueryRequestDto;

      expect(() =>
        (engine as any).convertQueryToReceiverRequest(request, ["AAPL.US"]),
      ).toThrow("startTime 格式非法，仅支持 YYYYMMDD 或 YYYY-MM-DD");
    });

    it("startTime 非法日期时抛错", () => {
      const engine = createQueryExecutionEngine();
      const request = {
        queryType: QueryType.BY_SYMBOLS,
        queryTypeFilter: CAPABILITY_NAMES.GET_TRADING_DAYS,
        startTime: "20260230",
        endTime: "20260301",
      } as QueryRequestDto;

      expect(() =>
        (engine as any).convertQueryToReceiverRequest(request, ["AAPL.US"]),
      ).toThrow("startTime 不是有效日期: 20260230");
    });

    it("startTime/endTime 区间反转时抛错", () => {
      const engine = createQueryExecutionEngine();
      const request = {
        queryType: QueryType.BY_SYMBOLS,
        queryTypeFilter: CAPABILITY_NAMES.GET_TRADING_DAYS,
        startTime: "20260131",
        endTime: "20260101",
      } as QueryRequestDto;

      expect(() =>
        (engine as any).convertQueryToReceiverRequest(request, ["AAPL.US"]),
      ).toThrow("startTime 不能晚于 endTime");
    });
  });

  describe("DataRequestDto", () => {
    it("beginDay 非法日期时返回 DTO 校验错误", async () => {
      const dto = plainToInstance(DataRequestDto, {
        symbols: ["AAPL.US"],
        receiverType: CAPABILITY_NAMES.GET_TRADING_DAYS,
        options: {
          beginDay: "20260230",
          endDay: "20260301",
        },
      });

      const errors = await validate(dto);
      const messages = collectValidationMessages(errors);
      expect(messages).toContain("beginDay 必须是有效日期（YYYYMMDD）");
    });
  });

  describe("ReceiverService", () => {
    it("beginDay/endDay 区间反转时返回业务校验错误", async () => {
      const service = createReceiverService();
      const validationResult = await (service as any).performRequestValidation({
        symbols: ["AAPL.US"],
        receiverType: CAPABILITY_NAMES.GET_TRADING_DAYS,
        options: {
          beginDay: "20260131",
          endDay: "20260101",
        },
      } as DataRequestDto);

      expect(validationResult.isValid).toBe(false);
      expect(validationResult.errors).toContain("beginDay 不能晚于 endDay");
    });

    it("跨度超过 366 天时返回业务校验错误", async () => {
      const service = createReceiverService();
      const validationResult = await (service as any).performRequestValidation({
        symbols: ["AAPL.US"],
        receiverType: CAPABILITY_NAMES.GET_TRADING_DAYS,
        options: {
          beginDay: "20240101",
          endDay: "20250101",
        },
      } as DataRequestDto);

      expect(validationResult.isValid).toBe(false);
      expect(validationResult.errors).toContain("日期跨度不能超过 366 天");
    });

    it("早于最小日期边界时返回业务校验错误", async () => {
      const service = createReceiverService();
      const validationResult = await (service as any).performRequestValidation({
        symbols: ["AAPL.US"],
        receiverType: CAPABILITY_NAMES.GET_TRADING_DAYS,
        options: {
          beginDay: "18991231",
          endDay: "19000101",
        },
      } as DataRequestDto);

      expect(validationResult.isValid).toBe(false);
      expect(validationResult.errors).toContain("beginDay 不能早于 19000101");
    });
  });
});
