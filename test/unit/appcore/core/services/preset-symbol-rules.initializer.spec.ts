import { REFERENCE_DATA } from "@common/constants/domain";
import { PresetSymbolRulesInitializer } from "@appcore/core/services/preset-symbol-rules.initializer";

describe("PresetSymbolRulesInitializer", () => {
  const provider = REFERENCE_DATA.PROVIDER_IDS.LONGPORT;

  function createContext() {
    const symbolMapperServiceMock = {
      getSymbolMappingByDataSource: jest.fn(),
      createDataSourceMapping: jest.fn(),
      updateSymbolMappingRule: jest.fn(),
      addSymbolMappingRule: jest.fn(),
      removeSymbolMappingRule: jest.fn(),
    };

    const loggerMock = {
      log: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
    };

    const initializer = new PresetSymbolRulesInitializer(
      symbolMapperServiceMock as any,
    );
    Object.defineProperty(initializer as any, "logger", {
      value: loggerMock,
    });

    return { initializer, symbolMapperServiceMock, loggerMock };
  }

  it("已有数据源时使用 update-or-insert：优先 errorCode=DATA_NOT_FOUND，message 仅兜底", async () => {
    const { initializer, symbolMapperServiceMock, loggerMock } = createContext();

    symbolMapperServiceMock.getSymbolMappingByDataSource.mockResolvedValue({
      dataSourceName: provider,
    });

    let updateCall = 0;
    symbolMapperServiceMock.updateSymbolMappingRule.mockImplementation(
      async () => {
        updateCall += 1;
        if (updateCall === 2) {
          const notFoundError = new Error("rule missing");
          (notFoundError as any).errorCode = "DATA_NOT_FOUND";
          throw notFoundError;
        }
        if (updateCall === 3) {
          const conflictError = new Error("symbol mapping rule not found");
          (conflictError as any).errorCode = "RESOURCE_CONFLICT";
          throw conflictError;
        }
        if (updateCall === 4) {
          throw new Error("symbol mapping rule not found for update");
        }
        return {};
      },
    );
    symbolMapperServiceMock.addSymbolMappingRule.mockResolvedValue({});

    await initializer.onModuleInit();

    expect(symbolMapperServiceMock.updateSymbolMappingRule).toHaveBeenCalledTimes(
      12,
    );
    expect(symbolMapperServiceMock.addSymbolMappingRule).toHaveBeenCalledTimes(2);
    expect(symbolMapperServiceMock.removeSymbolMappingRule).not.toHaveBeenCalled();

    expect(loggerMock.log).toHaveBeenCalledWith(
      "预设符号规则同步完成",
      expect.objectContaining({
        provider,
        updated: 9,
        inserted: 2,
        failed: 1,
      }),
    );
  });
});
