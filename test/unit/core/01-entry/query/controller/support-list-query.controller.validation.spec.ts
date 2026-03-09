import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
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
    expect(errors[0].constraints).toBeDefined();
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

