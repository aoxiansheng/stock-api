import { Injectable, UnauthorizedException } from "@nestjs/common";
import { UniversalExceptionFactory, BusinessErrorCode, ComponentIdentifier } from "@common/core/exceptions";
import { AUTH_ERROR_CODES } from "../constants/auth-error-codes.constants";
import { PassportStrategy } from "@nestjs/passport";
import type { Request } from "express";
import { Strategy } from "passport-custom";

import { HttpHeadersUtil } from "@common/utils/http-headers.util";

import { ApiKeyDocument } from "../schemas/apikey.schema";
import { AuthFacadeService } from "../services/facade/auth-facade.service";

@Injectable()
export class ApiKeyStrategy extends PassportStrategy(Strategy, "apikey") {
  constructor(private authFacade: AuthFacadeService) {
    super();
  }

  async validate(req: Request): Promise<ApiKeyDocument> {
    try {
      // 使用统一的工具类获取和验证 API 凭证
      const { appKey, accessToken } =
        HttpHeadersUtil.validateApiCredentials(req);

      // 调用认证服务验证凭证
      const apiKey = await this.authFacade.validateApiKey(appKey, accessToken);
      return apiKey;
    } catch (error) {
      // 如果是工具类抛出的凭证缺失错误
      if (error.message === "缺少API凭证") {
        throw UniversalExceptionFactory.createBusinessException({
          message: "Missing API credentials",
          errorCode: BusinessErrorCode.DATA_VALIDATION_FAILED,
          operation: 'validate',
          component: ComponentIdentifier.AUTH,
          context: {
            authErrorCode: AUTH_ERROR_CODES.MISSING_REQUIRED_PARAMETERS,
            strategy: 'ApiKeyStrategy'
          }
        });
      }
      // 如果是工具类抛出的格式错误
      if (error.message?.includes("API凭证格式无效")) {
        throw UniversalExceptionFactory.createBusinessException({
          message: "Invalid API credential format",
          errorCode: BusinessErrorCode.DATA_VALIDATION_FAILED,
          operation: 'validate',
          component: ComponentIdentifier.AUTH,
          context: {
            authErrorCode: AUTH_ERROR_CODES.INVALID_API_KEY_FORMAT,
            strategy: 'ApiKeyStrategy',
            originalError: error.message
          }
        });
      }
      // 其他错误统一处理为凭证无效
      throw UniversalExceptionFactory.createBusinessException({
        message: "Invalid API credentials",
        errorCode: BusinessErrorCode.OPERATION_NOT_ALLOWED,
        operation: 'validate',
        component: ComponentIdentifier.AUTH,
        context: {
          authErrorCode: AUTH_ERROR_CODES.AUTHENTICATION_FAILED,
          strategy: 'ApiKeyStrategy',
          originalError: error.message
        }
      });
    }
  }
}
