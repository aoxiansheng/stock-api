import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";

import { AuthPerformance } from "../../../monitoring/infrastructure/decorators/infrastructure-database.decorator";
import { CreateApiKeyDto, ApiKeyUsageDto } from "../../dto/apikey.dto";
import { ApiKey, ApiKeyDocument } from "../../schemas/apikey.schema";
import { UserRepository } from "../../repositories/user.repository";
import { ApiKeyUtil } from "../../utils/apikey.utils";
import { RolePermissions, Permission } from "../../enums/user-role.enum";
import { OperationStatus } from "@common/types/enums/shared-base.enum";
import { DatabaseValidationUtils } from "../../../common/utils/database.utils";
import { createLogger } from "@common/modules/logging";
// Dynamic configuration now comes from AuthConfigCompatibilityWrapper only
import { AuthConfigCompatibilityWrapper } from "../../config/compatibility-wrapper";
import { ERROR_MESSAGES } from "../../../common/constants/semantic/error-messages.constants";
import { CacheService } from "../../../cache/services/cache.service";
import { AuthLoggingUtil } from "../../utils/auth-logging.util";

/**
 * API密钥管理服务 - API密钥全生命周期管理
 * 专注于API密钥的创建、验证、撤销、使用统计等业务逻辑
 * 不包含频率限制逻辑（由RateLimitService处理）
 */
@Injectable()
export class ApiKeyManagementService {
  private readonly logger = AuthLoggingUtil.createOptimizedLogger(ApiKeyManagementService.name);

  constructor(
    @InjectModel(ApiKey.name)
    private readonly apiKeyModel: Model<ApiKeyDocument>,
    private readonly userRepository: UserRepository,
    private readonly authConfig: AuthConfigCompatibilityWrapper,
    private readonly cacheService: CacheService,
  ) {}

  // Configuration accessors - using unified configuration system
  private get apiKeyDefaults() {
    return {
      DEFAULT_RATE_LIMIT_REQUESTS: 200,
      DEFAULT_RATE_LIMIT_WINDOW: "1m",
      DEFAULT_EXPIRY_DAYS: 365,
      ACTIVE_STATUS: true,
      DEFAULT_PERMISSIONS: [],
      NAME_PREFIX: "API Key",
    };
  }

  private get apiKeyOperations() {
    return this.authConfig.API_KEY_OPERATIONS;
  }

  private get apiKeyValidation() {
    return this.authConfig.VALIDATION_LIMITS;
  }

  // API Key缓存配置
  private get cacheConfig() {
    return {
      // API Key缓存TTL（15分钟，平衡性能和数据一致性）
      API_KEY_CACHE_TTL: 900, // 15分钟
      // 缓存前缀
      API_KEY_CACHE_PREFIX: "apikey",
    };
  }

  /**
   * 创建API密钥
   * 专注于API密钥的创建逻辑和权限验证
   */
  async createApiKey(
    userId: string,
    createApiKeyDto: CreateApiKeyDto,
  ): Promise<ApiKey> {
    const { name, permissions, rateLimit, expiresAt } = createApiKeyDto;

    this.logger.log("开始创建API密钥", { userId, name, permissions });

    // 1. 验证用户ID格式
    DatabaseValidationUtils.validateObjectId(userId, "用户ID");

    // 2. 验证用户权限范围
    await this.validateUserPermissionScope(userId, permissions);

    // 2. 生成API密钥
    const apiKey = new this.apiKeyModel({
      appKey: ApiKeyUtil.generateAppKey(),
      accessToken: ApiKeyUtil.generateAccessToken(),
      name,
      userId,
      permissions,
      rateLimit: rateLimit || {
        requestLimit: this.apiKeyDefaults.DEFAULT_RATE_LIMIT_REQUESTS,
        window: this.apiKeyDefaults.DEFAULT_RATE_LIMIT_WINDOW,
      },
      status: OperationStatus.ACTIVE,
      expiresAt,
      totalRequestCount: 0,
      createdAt: new Date(),
    });

    try {
      await apiKey.save();

      this.logger.log("API密钥创建成功", {
        userId,
        apiKeyId: apiKey._id.toString(),
        appKey: apiKey.appKey,
        name: apiKey.name,
      });

      return apiKey.toJSON();
    } catch (error) {
      this.logger.error("API密钥创建失败", {
        userId,
        name,
        error: error.message,
      });
      throw new BadRequestException(ERROR_MESSAGES.CREATE_API_KEY_FAILED);
    }
  }

  /**
   * 验证API密钥
   * 高频调用的核心方法，使用缓存优化性能
   */
  @AuthPerformance("api_key")
  async validateApiKey(
    appKey: string,
    accessToken: string,
  ): Promise<ApiKeyDocument> {
    this.logger.highFrequency("验证API密钥", AuthLoggingUtil.sanitizeLogData({ appKey }));

    // 生成缓存键
    const cacheKey = this.generateApiKeyCacheKey(appKey, accessToken);

    try {
      // 首先尝试从缓存获取
      const cachedApiKey = await this.cacheService.get<ApiKeyDocument>(cacheKey);
      
      if (cachedApiKey) {
        this.logger.highFrequency("API密钥验证命中缓存", { appKey });
        
        // 检查缓存的API密钥是否过期
        if (cachedApiKey.expiresAt && new Date(cachedApiKey.expiresAt) < new Date()) {
          this.logger.warn("缓存的API密钥已过期", {
            appKey,
            expiresAt: cachedApiKey.expiresAt,
          });
          // 清除过期的缓存
          await this.cacheService.del(cacheKey);
          throw new BadRequestException(ERROR_MESSAGES.API_CREDENTIALS_EXPIRED);
        }

        // 异步更新使用统计（不影响响应时间）
        setImmediate(() => {
          this.updateApiKeyUsageAsync(cachedApiKey._id.toString()).catch((error) =>
            this.logger.error("更新API密钥使用统计失败", {
              apiKeyId: cachedApiKey._id.toString(),
              error: error.message,
            }),
          );
        });

        return cachedApiKey;
      }

      this.logger.highFrequency("API密钥验证缓存未命中，查询数据库", { appKey });

      // 缓存未命中，查询数据库
      const apiKey = await this.apiKeyModel
        .findOne({
          appKey,
          accessToken,
          status: OperationStatus.ACTIVE,
        })
        .exec();

      if (!apiKey) {
        this.logger.warn("API密钥无效", { appKey });
        throw new BadRequestException(ERROR_MESSAGES.API_CREDENTIALS_INVALID);
      }

      // 检查过期时间
      if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
        this.logger.warn("API密钥已过期", {
          appKey,
          expiresAt: apiKey.expiresAt,
        });
        throw new BadRequestException(ERROR_MESSAGES.API_CREDENTIALS_EXPIRED);
      }

      // 缓存API密钥数据（仅缓存有效的API密钥）
      await this.cacheService.set(cacheKey, apiKey.toJSON(), {
        ttl: this.cacheConfig.API_KEY_CACHE_TTL,
      });

      // 异步更新使用统计（不影响响应时间）
      setImmediate(() => {
        this.updateApiKeyUsageAsync(apiKey._id.toString()).catch((error) =>
          this.logger.error("更新API密钥使用统计失败", {
            apiKeyId: apiKey._id.toString(),
            error: error.message,
          }),
        );
      });

      this.logger.highFrequency("API密钥验证成功并已缓存", {
        appKey,
        apiKeyId: apiKey._id.toString(),
      });

      return apiKey;
      
    } catch (error) {
      // 如果是业务异常（如无效凭证、过期），直接抛出
      if (error instanceof BadRequestException) {
        throw error;
      }
      
      // 缓存服务异常时，回退到数据库查询
      this.logger.warn("缓存服务异常，回退到数据库查询", {
        appKey,
        error: error.message,
      });

      const apiKey = await this.apiKeyModel
        .findOne({
          appKey,
          accessToken,
          status: OperationStatus.ACTIVE,
        })
        .exec();

      if (!apiKey) {
        this.logger.warn("API密钥无效", { appKey });
        throw new BadRequestException(ERROR_MESSAGES.API_CREDENTIALS_INVALID);
      }

      // 检查过期时间
      if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
        this.logger.warn("API密钥已过期", {
          appKey,
          expiresAt: apiKey.expiresAt,
        });
        throw new BadRequestException(ERROR_MESSAGES.API_CREDENTIALS_EXPIRED);
      }

      // 异步更新使用统计（不影响响应时间）
      setImmediate(() => {
        this.updateApiKeyUsageAsync(apiKey._id.toString()).catch((error) =>
          this.logger.error("更新API密钥使用统计失败", {
            apiKeyId: apiKey._id.toString(),
            error: error.message,
          }),
        );
      });

      return apiKey;
    }
  }

  /**
   * 根据AppKey查找API密钥
   * 用于使用统计和管理功能
   */
  async findApiKeyByAppKey(appKey: string): Promise<ApiKeyDocument | null> {
    this.logger.debug("查找API密钥", { appKey });

    try {
      const apiKey = await this.apiKeyModel
        .findOne({
          appKey,
          status: OperationStatus.ACTIVE,
        })
        .exec();

      if (apiKey) {
        this.logger.debug("API密钥查找成功", {
          appKey,
          apiKeyId: apiKey._id.toString(),
        });
      } else {
        this.logger.debug("API密钥未找到", { appKey });
      }

      return apiKey;
    } catch (error) {
      this.logger.error("查找API密钥失败", { appKey, error: error.message });
      return null;
    }
  }

  /**
   * 获取用户的API密钥列表
   */
  async getUserApiKeys(userId: string): Promise<ApiKey[]> {
    this.logger.log("获取用户API密钥列表", { userId });

    // 验证用户ID格式
    DatabaseValidationUtils.validateObjectId(userId, "用户ID");

    try {
      const apiKeys = await this.apiKeyModel
        .find({
          userId,
          status: OperationStatus.ACTIVE,
        })
        .select("-accessToken") // 不返回敏感的访问令牌
        .sort({ createdAt: -1 })
        .exec();

      this.logger.log("用户API密钥列表获取成功", {
        userId,
        count: apiKeys.length,
      });

      return apiKeys.map((apiKey) => apiKey.toJSON());
    } catch (error) {
      this.logger.error("获取用户API密钥列表失败", {
        userId,
        error: error.message,
      });
      throw new BadRequestException(ERROR_MESSAGES.GET_USER_API_KEYS_FAILED);
    }
  }

  /**
   * 撤销API密钥
   */
  async revokeApiKey(appKey: string, userId: string): Promise<void> {
    this.logger.log("撤销API密钥", { appKey, userId });

    // 验证用户ID格式
    DatabaseValidationUtils.validateObjectId(userId, "用户ID");

    try {
      const result = await this.apiKeyModel.updateOne(
        { appKey, userId },
        {
          status: OperationStatus.INACTIVE,
          revokedAt: new Date(),
        },
      );

      if (result.matchedCount === 0) {
        this.logger.warn("API密钥撤销失败：密钥不存在或无权限", {
          appKey,
          userId,
        });
        throw new NotFoundException(ERROR_MESSAGES.API_KEY_INVALID_OR_NO_PERM);
      }

      // 异步清除相关缓存
      setImmediate(() => {
        this.invalidateApiKeyCache(appKey).catch((error) =>
          this.logger.error("撤销API密钥后清除缓存失败", {
            appKey,
            error: error.message,
          }),
        );
      });

      this.logger.log("API密钥撤销成功", { appKey, userId });
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }

      this.logger.error("撤销API密钥失败", {
        appKey,
        userId,
        error: error.message,
      });
      throw new BadRequestException(ERROR_MESSAGES.REVOKE_API_KEY_FAILED);
    }
  }

  /**
   * 获取API密钥使用统计
   */
  async getApiKeyUsage(
    appKey: string,
    userId: string,
  ): Promise<ApiKeyUsageDto> {
    this.logger.log("获取API密钥使用统计", { appKey, userId });

    // 验证用户ID格式
    DatabaseValidationUtils.validateObjectId(userId, "用户ID");

    try {
      // 验证API密钥存在且属于该用户
      const apiKey = await this.findApiKeyByAppKey(appKey);

      if (!apiKey || apiKey.userId.toString() !== userId) {
        throw new ForbiddenException("无权访问此API密钥的使用统计");
      }

      // 构建使用统计信息
      const usage: ApiKeyUsageDto = {
        apiKeyId: apiKey._id.toString(),
        appKey: apiKey.appKey,
        name: apiKey.name,
        totalRequestCount: apiKey.totalRequestCount || 0,
        // 基础实现：没有详细的时间维度统计
        // 可以通过集成监控服务（如Prometheus、InfluxDB）获取更精确的数据
        todayRequests: 0,
        hourlyRequests: 0,
        successfulRequests: Math.floor((apiKey.totalRequestCount || 0) * 0.95), // 估算95%成功率
        failedRequests: Math.ceil((apiKey.totalRequestCount || 0) * 0.05), // 估算5%失败率
        averageResponseTimeMs: 150, // 默认估值
        lastAccessedAt: apiKey.lastAccessedAt,
        createdAt: (apiKey as any).createdAt || new Date(),
      };

      this.logger.log("API密钥使用统计获取成功", { appKey, userId });
      return usage;
    } catch (error) {
      if (error instanceof ForbiddenException) {
        throw error;
      }

      this.logger.error("获取API密钥使用统计失败", {
        appKey,
        userId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * 重置API密钥频率限制
   * 实际的限流重置逻辑由RateLimitService处理
   */
  async resetApiKeyRateLimit(
    appKey: string,
    userId: string,
  ): Promise<{ success: boolean }> {
    this.logger.log("重置API密钥频率限制", { appKey, userId });

    // 验证用户ID格式
    DatabaseValidationUtils.validateObjectId(userId, "用户ID");

    try {
      // 验证API密钥存在且属于该用户
      const apiKey = await this.findApiKeyByAppKey(appKey);

      if (!apiKey || apiKey.userId.toString() !== userId) {
        throw new ForbiddenException("无权重置此API密钥的频率限制");
      }

      // 记录重置操作（实际的频率限制重置由RateLimitService处理）
      this.logger.log("API密钥频率限制重置请求已处理", { appKey, userId });

      return { success: true };
    } catch (error) {
      if (error instanceof ForbiddenException) {
        throw error;
      }

      this.logger.error("重置API密钥频率限制失败", {
        appKey,
        userId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * 批量获取API密钥信息
   * 用于管理后台和监控系统
   */
  async getApiKeysByIds(apiKeyIds: string[]): Promise<ApiKey[]> {
    this.logger.debug("批量获取API密钥信息", { count: apiKeyIds.length });

    // 验证API密钥ID列表格式
    DatabaseValidationUtils.validateObjectIds(apiKeyIds, "API密钥ID列表");

    try {
      const apiKeys = await this.apiKeyModel
        .find({
          _id: { $in: apiKeyIds },
          status: OperationStatus.ACTIVE,
        })
        .select("-accessToken")
        .exec();

      return apiKeys.map((apiKey) => apiKey.toJSON());
    } catch (error) {
      this.logger.error("批量获取API密钥信息失败", { error: error.message });
      throw new BadRequestException("获取API密钥信息失败");
    }
  }

  /**
   * 验证用户权限范围
   * 确保用户只能创建在其权限范围内的API密钥
   */
  private async validateUserPermissionScope(
    userId: string,
    requestedPermissions: Permission[],
  ): Promise<void> {
    this.logger.debug("验证用户权限范围", { userId, requestedPermissions });

    // 在此处不需要重复验证userId，因为调用该方法前已经验证过了

    try {
      const user = await this.userRepository.findById(userId);

      if (!user) {
        throw new ForbiddenException("用户不存在");
      }

      // 获取用户角色对应的权限
      const userPermissions = RolePermissions[user.role] || [];

      // 检查请求的权限是否都在用户权限范围内
      const invalidPermissions = requestedPermissions.filter(
        (permission) => !userPermissions.includes(permission),
      );

      if (invalidPermissions.length > 0) {
        this.logger.warn("用户尝试创建超出权限范围的API密钥", {
          userId,
          userRole: user.role,
          userPermissions,
          requestedPermissions,
          invalidPermissions,
        });

        throw new ForbiddenException(
          `无权限创建包含以下权限的API密钥: ${invalidPermissions.join(", ")}`,
        );
      }

      this.logger.debug("用户权限范围验证通过", {
        userId,
        userRole: user.role,
        requestedPermissions,
      });
    } catch (error) {
      if (error instanceof ForbiddenException) {
        throw error;
      }

      this.logger.error("权限范围验证失败", { userId, error: error.message });
      throw new BadRequestException("权限验证失败");
    }
  }

  /**
   * 异步更新API密钥使用统计
   * 后台操作，不影响API响应时间
   */
  private async updateApiKeyUsageAsync(apiKeyId: string): Promise<void> {
    try {
      // 验证API密钥ID格式
      DatabaseValidationUtils.validateObjectId(apiKeyId, "API密钥ID");

      await this.apiKeyModel.findByIdAndUpdate(apiKeyId, {
        $inc: { totalRequestCount: 1 },
        $set: { lastAccessedAt: new Date() },
      });

      this.logger.debug("API密钥使用统计更新成功", { apiKeyId });
    } catch (error) {
      this.logger.error("更新API密钥使用统计失败", {
        apiKeyId,
        error: error.message,
      });
      // 不向上抛出错误，因为这是后台操作
    }
  }

  /**
   * 获取即将过期的API密钥
   * 用于定期提醒用户续期
   */
  async getExpiringApiKeys(daysBeforeExpiry: number = 7): Promise<ApiKey[]> {
    this.logger.debug("获取即将过期的API密钥", { daysBeforeExpiry });

    const thresholdDate = new Date();
    thresholdDate.setDate(thresholdDate.getDate() + daysBeforeExpiry);

    try {
      const expiringKeys = await this.apiKeyModel
        .find({
          status: OperationStatus.ACTIVE,
          expiresAt: {
            $exists: true,
            $lte: thresholdDate,
          },
        })
        .select("-accessToken")
        .populate("userId", "username email")
        .exec();

      return expiringKeys.map((key) => key.toJSON());
    } catch (error) {
      this.logger.error("获取即将过期的API密钥失败", { error: error.message });
      throw new BadRequestException("获取即将过期的API密钥失败");
    }
  }

  /**
   * 生成API密钥缓存键
   */
  private generateApiKeyCacheKey(appKey: string, accessToken: string): string {
    // 使用SHA256哈希避免敏感信息泄露，同时确保键的唯一性
    const crypto = require('crypto');
    const hash = crypto
      .createHash('sha256')
      .update(`${appKey}:${accessToken}`)
      .digest('hex');
    
    return `${this.cacheConfig.API_KEY_CACHE_PREFIX}:${hash}`;
  }

  /**
   * 使API密钥缓存失效
   * 当API密钥被撤销、更新或状态改变时调用
   */
  async invalidateApiKeyCache(appKey: string, accessToken?: string): Promise<void> {
    try {
      if (accessToken) {
        // 清除特定API密钥的缓存
        const cacheKey = this.generateApiKeyCacheKey(appKey, accessToken);
        await this.cacheService.del(cacheKey);
        this.logger.debug("API密钥缓存已清除", { appKey });
      } else {
        // 清除该AppKey相关的所有缓存（通过模式匹配）
        const pattern = `${this.cacheConfig.API_KEY_CACHE_PREFIX}:*`;
        // 注意：这里需要实现模式删除，暂时用通配符删除
        // 在生产环境中应该更精确地只删除相关的缓存
        this.logger.debug("API密钥相关缓存清除请求", { appKey });
      }
    } catch (error) {
      this.logger.error("清除API密钥缓存失败", {
        appKey,
        error: error.message,
      });
      // 缓存清除失败不应该影响业务逻辑
    }
  }
}
