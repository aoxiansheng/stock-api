jest.mock("@common/logging/index", () => ({
  createLogger: () => ({
    debug: jest.fn(),
    log: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  }),
  sanitizeLogData: (data: unknown) => data,
}));

import { NotFoundException } from "@nestjs/common";

import {
  BusinessErrorCode,
  BusinessException,
  ComponentIdentifier,
  UniversalExceptionFactory,
} from "@common/core/exceptions";
import { DataTransformerService } from "@core/02-processing/transformer/services/data-transformer.service";

describe("DataTransformerService transform catch", () => {
  const symbolTransformerService = {
    transformSingleSymbol: jest.fn(),
  };
  const configService = {
    get: jest.fn(() => undefined),
  };

  const createRequest = () => ({
    provider: "longport",
    transDataRuleListType: "stock_quote",
    mappingOutRuleId: "rule-1",
    rawData: { symbol: "AAPL" },
  });

  it("优先透传 BusinessException", async () => {
    const businessError = UniversalExceptionFactory.createBusinessException({
      component: ComponentIdentifier.TRANSFORMER,
      errorCode: BusinessErrorCode.DATA_NOT_FOUND,
      operation: "transform",
      message: "rule not found",
      retryable: false,
    });

    const flexibleMappingRuleService = {
      findRuleById: jest.fn().mockRejectedValue(businessError),
    };

    const service = new DataTransformerService(
      flexibleMappingRuleService as any,
      symbolTransformerService as any,
      undefined,
      configService as any,
    );

    await expect(service.transform(createRequest() as any)).rejects.toBe(
      businessError,
    );
  });

  it("Nest 异常分支保持透传", async () => {
    const notFound = new NotFoundException("missing rule");
    const flexibleMappingRuleService = {
      findRuleById: jest.fn().mockRejectedValue(notFound),
    };

    const service = new DataTransformerService(
      flexibleMappingRuleService as any,
      symbolTransformerService as any,
      undefined,
      configService as any,
    );

    await expect(service.transform(createRequest() as any)).rejects.toBe(notFound);
  });

  it("未知异常重包为 DATA_PROCESSING_FAILED", async () => {
    const originalError = new Error("boom");
    const flexibleMappingRuleService = {
      findRuleById: jest.fn().mockRejectedValue(originalError),
    };

    const service = new DataTransformerService(
      flexibleMappingRuleService as any,
      symbolTransformerService as any,
      undefined,
      configService as any,
    );

    try {
      await service.transform(createRequest() as any);
      throw new Error("should throw wrapped business exception");
    } catch (error: any) {
      expect(BusinessException.isBusinessException(error)).toBe(true);
      expect(error).not.toBe(originalError);
      expect(error.errorCode).toBe(BusinessErrorCode.DATA_PROCESSING_FAILED);
      expect(error.operation).toBe("transform");
      expect(error.context).toMatchObject({
        provider: "longport",
        transDataRuleListType: "stock_quote",
        originalError: "boom",
      });
    }
  });
});
