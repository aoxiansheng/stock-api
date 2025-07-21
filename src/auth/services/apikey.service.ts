import {
  Injectable,
  UnauthorizedException,
  NotFoundException,
  InternalServerErrorException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";

import { createLogger } from "@common/config/logger.config";

import { AuthPerformance } from "../../metrics/decorators/database-performance.decorator";
import {
  APIKEY_OPERATIONS,
  APIKEY_MESSAGES,
  APIKEY_DEFAULTS,
  ApiKeyUtil,
} from "../constants/apikey.constants";
import { ERROR_MESSAGES } from "../../common/constants/error-messages.constants";
import { CreateApiKeyDto } from "../dto/apikey.dto";
import { ApiKey, ApiKeyDocument } from "../schemas/apikey.schema";

// 🎯 引入 API Key 服务常量

@Injectable()
export class ApiKeyService {
  private readonly logger = createLogger(ApiKeyService.name);

  constructor(
    @InjectModel(ApiKey.name) private apiKeyModel: Model<ApiKeyDocument>,
  ) {}

  /**
   * 验证API Key
   */
  @AuthPerformance("api_key")
  async validateApiKey(
    appKey: string,
    accessToken: string,
  ): Promise<ApiKeyDocument> {
    const operation = APIKEY_OPERATIONS.VALIDATE_API_KEY;

    this.logger.debug(APIKEY_MESSAGES.API_KEY_VALIDATION_STARTED, {
      operation,
      appKey,
      accessToken: ApiKeyUtil.sanitizeAccessToken(accessToken),
    });

    const apiKey = await this.apiKeyModel
      .findOne({
        appKey,
        accessToken,
        isActive: true,
      })
      .exec();

    if (!apiKey) {
      this.logger.warn(ERROR_MESSAGES.API_CREDENTIALS_INVALID, {
        operation,
        appKey,
      });
      throw new UnauthorizedException(ERROR_MESSAGES.API_CREDENTIALS_INVALID);
    }

    if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
      this.logger.warn(ERROR_MESSAGES.API_CREDENTIALS_EXPIRED, {
        operation,
        appKey,
      });
      throw new UnauthorizedException(ERROR_MESSAGES.API_CREDENTIALS_EXPIRED);
    }

    // 更新使用统计（异步执行，不影响响应时间）
    this.updateApiKeyUsage(apiKey._id.toString()).catch((error) => {
      this.logger.error(ERROR_MESSAGES.UPDATE_USAGE_FAILED, {
        operation,
        apiKeyId: apiKey._id.toString(),
        error: error.stack,
      });
    });

    this.logger.debug(APIKEY_MESSAGES.API_KEY_VALIDATED, {
      operation,
      apiKeyId: apiKey._id.toString(),
      appKey,
    });

    return apiKey;
  }

  /**
   * 更新API Key使用统计
   */
  private async updateApiKeyUsage(apiKeyId: string): Promise<void> {
    const operation = APIKEY_OPERATIONS.UPDATE_API_KEY_USAGE;

    this.logger.debug(APIKEY_MESSAGES.API_KEY_USAGE_UPDATE_STARTED, {
      operation,
      apiKeyId,
    });

    try {
      await this.apiKeyModel.findByIdAndUpdate(apiKeyId, {
        $inc: { usageCount: 1 },
        $set: { lastUsedAt: new Date() },
      });

      this.logger.debug(APIKEY_MESSAGES.API_KEY_USAGE_UPDATED, {
        operation,
        apiKeyId,
      });
    } catch (error) {
      this.logger.error(ERROR_MESSAGES.UPDATE_USAGE_DB_FAILED, {
        operation,
        apiKeyId,
        error: error.stack,
      });
      // 不向上抛出错误，因为这是后台操作
    }
  }

  /**
   * 创建API Key
   */
  async createApiKey(
    userId: string,
    createApiKeyDto: CreateApiKeyDto,
  ): Promise<ApiKey> {
    const operation = APIKEY_OPERATIONS.CREATE_API_KEY;
    const { name, permissions, rateLimit, expiresAt } = createApiKeyDto;

    this.logger.debug(APIKEY_MESSAGES.API_KEY_CREATION_STARTED, {
      operation,
      userId,
      name,
    });

    const apiKey = new this.apiKeyModel({
      appKey: ApiKeyUtil.generateAppKey(),
      accessToken: ApiKeyUtil.generateAccessToken(),
      name,
      userId,
      permissions,
      rateLimit: rateLimit || APIKEY_DEFAULTS.DEFAULT_RATE_LIMIT,
      isActive: APIKEY_DEFAULTS.DEFAULT_ACTIVE_STATUS,
      expiresAt,
    });

    try {
      await apiKey.save();
      this.logger.log(APIKEY_MESSAGES.API_KEY_CREATED, {
        operation,
        apiKeyName: name,
        userId,
        apiKeyId: apiKey._id.toString(),
        appKey: apiKey.appKey,
      });
      return apiKey.toJSON();
    } catch (error) {
      this.logger.error(ERROR_MESSAGES.CREATE_API_KEY_FAILED, {
        operation,
        apiKeyName: name,
        userId,
        error: error.stack,
      });
      throw new InternalServerErrorException(
        ERROR_MESSAGES.CREATE_API_KEY_FAILED,
      );
    }
  }

  /**
   * 获取用户的API Keys
   */
  async getUserApiKeys(userId: string): Promise<ApiKey[]> {
    const operation = APIKEY_OPERATIONS.GET_USER_API_KEYS;

    this.logger.debug(APIKEY_MESSAGES.USER_API_KEYS_LOOKUP_STARTED, {
      operation,
      userId,
    });

    try {
      const apiKeys = await this.apiKeyModel
        .find({ userId, isActive: true })
        .exec();

      this.logger.debug(APIKEY_MESSAGES.USER_API_KEYS_RETRIEVED, {
        operation,
        userId,
        count: apiKeys.length,
      });

      return apiKeys.map((apiKey) => apiKey.toJSON());
    } catch (error) {
      this.logger.error(ERROR_MESSAGES.GET_USER_API_KEYS_FAILED, {
        operation,
        userId,
        error: error.stack,
      });
      throw new InternalServerErrorException(
        ERROR_MESSAGES.GET_USER_API_KEYS_FAILED,
      );
    }
  }

  /**
   * 撤销API Key
   */
  async revokeApiKey(apiKeyId: string, userId: string): Promise<void> {
    const operation = APIKEY_OPERATIONS.REVOKE_API_KEY;

    this.logger.debug(APIKEY_MESSAGES.API_KEY_REVOCATION_STARTED, {
      operation,
      apiKeyId,
      userId,
    });

    try {
      const result = await this.apiKeyModel.updateOne(
        { _id: apiKeyId, userId },
        { isActive: false },
      );

      if (result.matchedCount === 0) {
        throw new NotFoundException(
          ERROR_MESSAGES.API_KEY_NOT_FOUND_OR_NO_PERMISSION,
        );
      }

      this.logger.log(APIKEY_MESSAGES.API_KEY_REVOKED, {
        operation,
        apiKeyId,
        userId,
      });
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      this.logger.error(ERROR_MESSAGES.REVOKE_API_KEY_FAILED, {
        operation,
        apiKeyId,
        userId,
        error: error.stack,
      });
      throw new InternalServerErrorException(
        ERROR_MESSAGES.REVOKE_API_KEY_FAILED,
      );
    }
  }
}
