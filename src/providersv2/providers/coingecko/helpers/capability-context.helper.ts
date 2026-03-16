import {
  BusinessErrorCode,
  ComponentIdentifier,
  UniversalExceptionFactory,
} from "@common/core/exceptions";

export function requireCoinGeckoCapabilityContextService<T>(
  params: { contextService?: T },
  serviceName: string,
): T {
  if (!params.contextService) {
    throwCoinGeckoConfigurationError(`${serviceName} 未提供`, {
      serviceName,
      provider: "coingecko",
    });
  }

  return params.contextService;
}

export function throwCoinGeckoDataValidationError(
  message: string,
  context: Record<string, any> = {},
  operation = "validateInput",
): never {
  throw UniversalExceptionFactory.createBusinessException({
    message,
    errorCode: BusinessErrorCode.DATA_VALIDATION_FAILED,
    operation,
    component: ComponentIdentifier.PROVIDER,
    context: {
      provider: "coingecko",
      ...context,
    },
  });
}

export function throwCoinGeckoConfigurationError(
  message: string,
  context: Record<string, any> = {},
  operation = "validateConfiguration",
): never {
  throw UniversalExceptionFactory.createBusinessException({
    message,
    errorCode: BusinessErrorCode.CONFIGURATION_ERROR,
    operation,
    component: ComponentIdentifier.PROVIDER,
    context: {
      provider: "coingecko",
      ...context,
    },
  });
}

export function buildCoinGeckoExternalApiError(
  message: string,
  context: Record<string, any> = {},
  operation = "externalApiRequest",
) {
  return UniversalExceptionFactory.createBusinessException({
    message,
    errorCode: BusinessErrorCode.EXTERNAL_API_ERROR,
    operation,
    component: ComponentIdentifier.PROVIDER,
    context: {
      provider: "coingecko",
      ...context,
    },
  });
}
