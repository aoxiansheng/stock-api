import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { CronExpression } from "@nestjs/schedule";
import { SCHEDULE_CRON_OPTIONS } from "@nestjs/schedule/dist/schedule.constants";
import { SupportListQueryController } from "@core/01-entry/query/controller/support-list-query.controller";
import {
  QuerySupportListMetaRequestDto,
  QuerySupportListRequestDto,
} from "@core/01-entry/query/dto/query-support-list-request.dto";

describe("SupportListQueryController 参数校验", () => {
  const supportListQueryServiceMock = {
    getMeta: jest.fn(),
    getSupportList: jest.fn(),
  };

  const controller = new SupportListQueryController(
    supportListQueryServiceMock as any,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("QuerySupportListRequestDto: since 非法时校验失败", async () => {
    const dto = plainToInstance(QuerySupportListRequestDto, {
      type: "STOCK_US",
      since: "invalid",
    });

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    const sinceError = errors.find((item) => item.property === "since");
    expect(sinceError?.constraints?.matches).toBe(
      "since 必须是 14 位数字版本号",
    );
  });

  it("QuerySupportListRequestDto: since 超过 14 位时校验失败", async () => {
    const dto = plainToInstance(QuerySupportListRequestDto, {
      type: "STOCK_US",
      since: "202603090200001",
    });

    const errors = await validate(dto);
    const sinceError = errors.find((item) => item.property === "since");

    expect(sinceError?.constraints?.matches).toBe(
      "since 必须是 14 位数字版本号",
    );
  });

  it("QuerySupportListMetaRequestDto: type 非法时校验失败", async () => {
    const dto = plainToInstance(QuerySupportListMetaRequestDto, {
      type: "INVALID",
    });

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it("参数合法时 controller 正常调用 service", async () => {
    supportListQueryServiceMock.getSupportList.mockResolvedValue({
      full: true,
      version: "20260309020000",
      items: [],
    });

    const dto = plainToInstance(QuerySupportListRequestDto, {
      type: "STOCK_US",
      since: "20260309020000",
    });
    const result = await controller.getSupportList(dto);

    expect(result).toEqual({
      full: true,
      version: "20260309020000",
      items: [],
    });
    expect(supportListQueryServiceMock.getSupportList).toHaveBeenCalledWith(dto);
  });
});

describe("SupportListSyncScheduler cron 配置", () => {
  const originalCronEnv = process.env.SUPPORT_LIST_SYNC_CRON;
  const originalNodeEnv = process.env.NODE_ENV;

  afterEach(() => {
    if (originalCronEnv === undefined) {
      delete process.env.SUPPORT_LIST_SYNC_CRON;
    } else {
      process.env.SUPPORT_LIST_SYNC_CRON = originalCronEnv;
    }
    if (originalNodeEnv === undefined) {
      delete process.env.NODE_ENV;
    } else {
      process.env.NODE_ENV = originalNodeEnv;
    }
    jest.dontMock("@common/logging/index");
    jest.resetModules();
  });

  function loadCronMetadata(cronValue: string, nodeEnv = "test") {
    process.env.SUPPORT_LIST_SYNC_CRON = cronValue;
    process.env.NODE_ENV = nodeEnv;

    const warnMock = jest.fn();
    let metadata: { cronTime?: string } | undefined;
    let importError: Error | undefined;

    jest.isolateModules(() => {
      jest.doMock("@common/logging/index", () => ({
        createLogger: jest.fn(() => ({
          log: jest.fn(),
          warn: warnMock,
          error: jest.fn(),
          debug: jest.fn(),
          verbose: jest.fn(),
        })),
      }));

      try {
        const {
          SupportListSyncScheduler,
        } = require("@core/03-fetching/support-list/services/support-list-sync.scheduler");
        metadata = Reflect.getMetadata(
          SCHEDULE_CRON_OPTIONS,
          SupportListSyncScheduler.prototype.handleDailyRefresh,
        ) as { cronTime?: string } | undefined;
      } catch (error) {
        importError = error as Error;
      }
    });

    return { metadata, warnMock, importError };
  }

  it("test 环境非法 cron 配置应回退默认值并记录告警", () => {
    const { metadata, warnMock, importError } = loadCronMetadata(
      "invalid-cron",
      "test",
    );

    expect(importError).toBeUndefined();
    expect(metadata?.cronTime).toBe(CronExpression.EVERY_DAY_AT_2AM);
    expect(warnMock).toHaveBeenCalledTimes(1);
    expect(warnMock).toHaveBeenCalledWith(
      "SUPPORT_LIST_SYNC_CRON 非法，非生产环境回退默认表达式",
      expect.objectContaining({
        inputCron: "invalid-cron",
        fallbackCron: CronExpression.EVERY_DAY_AT_2AM,
        environment: "test",
      }),
    );
  });

  it("production 环境非法 cron 配置应 fail-fast", () => {
    const { metadata, warnMock, importError } = loadCronMetadata(
      "invalid-cron",
      "production",
    );

    expect(metadata).toBeUndefined();
    expect(warnMock).not.toHaveBeenCalled();
    expect(importError).toBeInstanceOf(Error);
    expect(importError?.message).toContain("SUPPORT_LIST_SYNC_CRON 非法");
    expect(importError?.message).toContain("生产环境禁止回退默认值");
  });

  it("production 环境合法 cron 配置应直接生效且不告警", () => {
    const { metadata, warnMock, importError } = loadCronMetadata(
      "0 15 3 * * *",
      "production",
    );

    expect(importError).toBeUndefined();
    expect(metadata?.cronTime).toBe("0 15 3 * * *");
    expect(warnMock).not.toHaveBeenCalled();
  });
});
