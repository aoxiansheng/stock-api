import {
  BusinessErrorCode,
  ComponentIdentifier,
  UniversalExceptionFactory,
} from "@common/core/exceptions";

export function requireInfowayCapabilityContextService<T>(
  params: { contextService?: T },
  serviceName: string,
): T {
  if (!params.contextService) {
    throwInfowayConfigurationError(`${serviceName} 未提供`, {
      serviceName,
      provider: "infoway",
    });
  }
  return params.contextService;
}

export function throwInfowayDataValidationError(
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
      provider: "infoway",
      ...context,
    },
  });
}

export function throwInfowayConfigurationError(
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
      provider: "infoway",
      ...context,
    },
  });
}
