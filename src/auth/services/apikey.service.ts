import {
  Injectable,
  UnauthorizedException,
  NotFoundException,
  ForbiddenException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { BadRequestException } from "@nestjs/common";
import { createLogger } from "@common/config/logger.config";

import { AuthPerformance } from "../../system-status/collect-metrics/decorators/database-performance.decorator";
import {
  APIKEY_OPERATIONS,
  APIKEY_MESSAGES,
  APIKEY_DEFAULTS,
} from "../constants/apikey.constants";
import { ApiKeyUtil } from "../utils/apikey.utils";
import { ERROR_MESSAGES } from "../../common/constants/error-messages.constants";
import { CreateApiKeyDto } from "../dto/apikey.dto";
import { ApiKey, ApiKeyDocument } from "../schemas/apikey.schema";
import { UserRepository } from "../repositories/user.repository";
import { RolePermissions, Permission } from "../enums/user-role.enum";

// 🎯 引入 API Key 服务常量

@Injectable()
export class ApiKeyService {
  private readonly logger = createLogger(ApiKeyService.name);

  constructor(
    @InjectModel(ApiKey.name) private apiKeyModel: Model<ApiKeyDocument>,
    private readonly userRepository: UserRepository,
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

    // 验证用户权限范围
    await this.validatePermissionScope(userId, permissions);

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
      throw new BadRequestException(
        ERROR_MESSAGES.CREATE_API_KEY_FAILED,
      );
    }
  }

  /**
   * 验证用户是否有权限创建具有指定权限的API Key
   */
  private async validatePermissionScope(
    userId: string,
    requestedPermissions: Permission[],
  ): Promise<void> {
    const operation = APIKEY_OPERATIONS.VALIDATE_PERMISSION_SCOPE;

    this.logger.debug("开始验证API Key权限范围", {
      operation,
      userId,
      requestedPermissions,
    });

    try {
      // 获取用户信息
      const user = await this.userRepository.findById(userId);
      if (!user) {
        this.logger.error("用户不存在", { operation, userId });
        throw new ForbiddenException("用户不存在");
      }

      // 获取用户角色对应的权限
      const userPermissions = RolePermissions[user.role] || [];

      this.logger.debug("用户权限信息", {
        operation,
        userId,
        userRole: user.role,
        userPermissions,
      });

      // 检查请求的权限是否都在用户权限范围内
      const invalidPermissions = requestedPermissions.filter(
        (permission) => !userPermissions.includes(permission),
      );

      if (invalidPermissions.length > 0) {
        this.logger.warn("用户尝试创建超出权限范围的API Key", {
          operation,
          userId,
          userRole: user.role,
          userPermissions,
          requestedPermissions,
          invalidPermissions,
        });

        throw new ForbiddenException(
          `无权限创建包含以下权限的API Key: ${invalidPermissions.join(", ")}`,
        );
      }

      this.logger.debug("API Key权限范围验证通过", {
        operation,
        userId,
        userRole: user.role,
        requestedPermissions,
      });
    } catch (error) {
      if (error instanceof ForbiddenException) {
        throw error;
      }

      this.logger.error("权限范围验证失败", {
        operation,
        userId,
        requestedPermissions,
        error: error.stack,
      });

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
      throw new BadRequestException(
        ERROR_MESSAGES.GET_USER_API_KEYS_FAILED,
      );
    }
  }

  /**
   * 撤销API Key
   */
  async revokeApiKey(appKey: string, userId: string): Promise<void> {
    const operation = APIKEY_OPERATIONS.REVOKE_API_KEY;

    this.logger.debug(APIKEY_MESSAGES.API_KEY_REVOCATION_STARTED, {
      operation,
      appKey,
      userId,
    });

    try {
      const result = await this.apiKeyModel.updateOne(
        { appKey: appKey, userId },
        { isActive: false },
      );

      if (result.matchedCount === 0) {
        throw new NotFoundException(
          ERROR_MESSAGES.API_KEY_NOT_FOUND_OR_NO_PERMISSION,
        );
      }

      this.logger.log(APIKEY_MESSAGES.API_KEY_REVOKED, {
        operation,
        appKey,
        userId,
      });
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      this.logger.error(ERROR_MESSAGES.REVOKE_API_KEY_FAILED, {
        operation,
        appKey,
        userId,
        error: error.stack,
      });
      throw new BadRequestException(
        ERROR_MESSAGES.REVOKE_API_KEY_FAILED,
      );
    }
  }
}
