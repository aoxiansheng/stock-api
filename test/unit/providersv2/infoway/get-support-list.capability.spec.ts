import { BusinessErrorCode } from "@common/core/exceptions";
import { getSupportList } from "@providersv2/providers/infoway/capabilities/get-support-list";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { SupportListRequestDto } from "@core/01-entry/receiver/dto/support-list-request.dto";
import { INFOWAY_SUPPORT_SYMBOL_MAX_LENGTH } from "@providersv2/providers/infoway/utils/infoway-support-list.util";

describe("get-support-list capability", () => {
  it("type 非法时抛 DATA_VALIDATION_FAILED", async () => {
    const contextService = {
      getSupportList: jest.fn(),
    };

    await expect(
      getSupportList.execute({
        type: "INVALID_TYPE",
        contextService: contextService as any,
      }),
    ).rejects.toMatchObject({
      errorCode: BusinessErrorCode.DATA_VALIDATION_FAILED,
      message: expect.stringContaining("type 不受支持"),
    });

    expect(contextService.getSupportList).not.toHaveBeenCalled();
  });

  it("symbols 规范化后透传到 contextService", async () => {
    const contextService = {
      getSupportList: jest.fn().mockResolvedValue([{ symbol: ".DJI.US" }]),
    };

    const result = await getSupportList.execute({
      type: "stock_us",
      symbols: [" .dji.us ", ".IXIC.us", ".DJI.US"],
      contextService: contextService as any,
    });

    expect(contextService.getSupportList).toHaveBeenCalledWith({
      type: "STOCK_US",
      symbols: [".DJI.US", ".IXIC.US"],
    });
    expect(result).toEqual([{ symbol: ".DJI.US" }]);
  });

  it("SupportListRequestDto: 单个 symbol 超长时应拒绝", async () => {
    const oversizedSymbol = "A".repeat(INFOWAY_SUPPORT_SYMBOL_MAX_LENGTH + 1);
    const instance = plainToInstance(SupportListRequestDto, {
      type: "STOCK_US",
      symbols: [oversizedSymbol],
    });

    const errors = await validate(instance);
    const symbolErrors = errors.find((error) => error.property === "symbols");

    expect(symbolErrors).toBeDefined();
  });
});
