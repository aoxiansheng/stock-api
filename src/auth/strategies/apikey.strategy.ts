import { Injectable, UnauthorizedException } from "@nestjs/common";
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
        throw new UnauthorizedException("缺少API凭证");
      }
      // 如果是工具类抛出的格式错误
      if (error.message?.includes("API凭证格式无效")) {
        throw new UnauthorizedException(error.message);
      }
      // 其他错误统一处理为凭证无效
      throw new UnauthorizedException("API凭证无效");
    }
  }
}
