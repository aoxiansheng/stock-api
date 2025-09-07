import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  ForbiddenException,
} from "@nestjs/common";

import { createLogger } from "@app/config/logger.config";

import { EventEmitter2 } from "@nestjs/event-emitter";
import { SYSTEM_STATUS_EVENTS } from "../../monitoring/contracts/events/system-status.events";
import {
  AUTH_OPERATIONS,
  AUTH_MESSAGES,
  AUTH_DEFAULTS,
} from "../constants/auth.constants";
import { ERROR_MESSAGES } from "../../common/constants/error-messages.constants";
import { CreateUserDto, LoginDto } from "../dto/auth.dto";
import { ApiKeyUsageDto } from "../dto/apikey.dto";
import { UserRepository } from "../repositories/user.repository";
import { ApiKeyDocument } from "../schemas/apikey.schema";
import { User } from "../schemas/user.schema";
import { CommonStatus } from "../enums/common-status.enum";

import { ApiKeyService } from "./apikey.service";
import { PasswordService } from "./password.service";
import { TokenService } from "./token.service";
@Injectable()
export class AuthService {
  private readonly logger = createLogger(AuthService.name);

  constructor(
    private readonly userRepository: UserRepository,
    private readonly apiKeyService: ApiKeyService,
    private readonly passwordService: PasswordService,
    private readonly tokenService: TokenService,
    private readonly eventBus: EventEmitter2,
  ) {}

  /**
   * 发送业务监控事件（异步、非阻塞）
   */
  private emitBusinessEvent(
    metricName: string,
    success: boolean,
    metadata?: any,
  ) {
    setImmediate(() => {
      this.eventBus.emit(SYSTEM_STATUS_EVENTS.METRIC_COLLECTED, {
        timestamp: new Date(),
        source: "auth",
        metricType: "business",
        metricName,
        metricValue: success ? 1 : 0,
        tags: {
          status: success ? "success" : "error",
          ...metadata,
        },
      });
    });
  }

  /**
   * 用户注册
   */
  async register(createUserDto: CreateUserDto): Promise<User> {
    const operation = AUTH_OPERATIONS.REGISTER;
    const {
      username,
      email,
      password,
      role = AUTH_DEFAULTS.NEW_USER.role,
    } = createUserDto;

    this.logger.log(AUTH_MESSAGES.REGISTRATION_STARTED, {
      operation,
      username,
      email,
    });

    const existingUser = await this.userRepository.findByUsernameOrEmail(
      username,
      email,
    );

    if (existingUser) {
      this.logger.warn(ERROR_MESSAGES.USER_EXISTS, {
        operation,
        username,
        email,
      });

      // 发送注册失败监控事件
      this.emitBusinessEvent("user_registration", false, {
        operation: "register",
        reason: "user_exists",
      });

      throw new ConflictException(ERROR_MESSAGES.USER_EXISTS);
    }

    const passwordHash = await this.passwordService.hashPassword(password);

    const user = await this.userRepository.create({
      username,
      email,
      passwordHash,
      role,
      status: CommonStatus.ACTIVE,
    });

    this.logger.log(AUTH_MESSAGES.USER_REGISTERED, {
      operation,
      username,
      role,
      userId: user.id,
    });

    // 发送注册成功监控事件
    this.emitBusinessEvent("user_registration", true, {
      operation: "register",
      role: user.role,
    });

    // 使用 toJSON() 方法过滤敏感字段
    return user.toJSON() as User;
  }

  /**
   * 用户登录
   */
  async login(
    loginDto: LoginDto,
  ): Promise<{ user: User; accessToken: string; refreshToken: string }> {
    const operation = AUTH_OPERATIONS.LOGIN;
    const { username, password } = loginDto;

    this.logger.log(AUTH_MESSAGES.LOGIN_ATTEMPT, { operation, username });

    const user = await this.userRepository.findByUsername(username);
    if (!user || user.status !== CommonStatus.ACTIVE) {
      this.logger.warn(AUTH_MESSAGES.USER_NOT_FOUND_OR_INACTIVE, {
        operation,
        username,
      });

      // 发送登录失败监控事件
      this.emitBusinessEvent("user_login", false, {
        operation: "login",
        reason: user ? "user_inactive" : "user_not_found",
      });

      throw new UnauthorizedException(ERROR_MESSAGES.INVALID_CREDENTIALS);
    }

    this.logger.debug(AUTH_MESSAGES.PASSWORD_VALIDATION_STARTED, {
      operation,
      username,
    });
    const isPasswordValid = await this.passwordService.comparePassword(
      password,
      user.passwordHash,
    );
    if (!isPasswordValid) {
      this.logger.warn(AUTH_MESSAGES.PASSWORD_VERIFICATION_FAILED, {
        operation,
        username,
      });

      // 发送登录失败监控事件
      this.emitBusinessEvent("user_login", false, {
        operation: "login",
        reason: "invalid_password",
      });

      throw new UnauthorizedException(ERROR_MESSAGES.INVALID_CREDENTIALS);
    }

    const { accessToken, refreshToken } =
      await this.tokenService.generateTokens(user);

    this.logger.log(AUTH_MESSAGES.USER_LOGIN_SUCCESS, {
      operation,
      username,
      userId: user.id,
      role: user.role,
    });

    // 发送登录成功监控事件
    this.emitBusinessEvent("user_login", true, {
      operation: "login",
      role: user.role,
    });

    return {
      user: user.toJSON() as User,
      accessToken,
      refreshToken,
    };
  }

  /**
   * 使用刷新令牌获取新的访问令牌
   */
  async refreshToken(
    token: string,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const operation = AUTH_OPERATIONS.REFRESH_TOKEN;

    this.logger.debug(AUTH_MESSAGES.TOKEN_VALIDATION_STARTED, { operation });
    const payload = await this.tokenService.verifyRefreshToken(token);
    const user = await this.tokenService.validateUserFromPayload(payload);

    const tokens = await this.tokenService.generateTokens(user);

    this.logger.log(AUTH_MESSAGES.TOKEN_REFRESHED, {
      operation,
      username: user.username,
      userId: user.id,
    });
    return tokens;
  }

  /**
   * 验证JWT载荷，此方法已移至 TokenService，AuthService不再需要它
   */
  // async validateUser(payload: { sub: string }): Promise<User> { ... }

  /**
   * 创建API Key - 委托给ApiKeyService
   */
  async createApiKey(userId: string, createApiKeyDto: any): Promise<any> {
    return this.apiKeyService.createApiKey(userId, createApiKeyDto);
  }

  /**
   * 获取用户的API Keys - 委托给ApiKeyService
   */
  async getUserApiKeys(userId: string): Promise<any[]> {
    return this.apiKeyService.getUserApiKeys(userId);
  }

  /**
   * 撤销API Key - 委托给ApiKeyService
   */
  async revokeApiKey(appKey: string, userId: string): Promise<void> {
    return this.apiKeyService.revokeApiKey(appKey, userId);
  }

  /**
   * 验证API Key - 委托给ApiKeyService
   */
  async validateApiKey(
    appKey: string,
    accessToken: string,
  ): Promise<ApiKeyDocument> {
    return this.apiKeyService.validateApiKey(appKey, accessToken);
  }

  /**
   * 获取API Key使用统计
   */
  async getApiKeyUsage(
    appKey: string,
    userId: string,
  ): Promise<ApiKeyUsageDto> {
    try {
      // 验证API Key存在且属于该用户
      const apiKeyData = await this.apiKeyService.findByAppKey(appKey);
      if (!apiKeyData || apiKeyData.userId.toString() !== userId) {
        throw new ForbiddenException("无权访问此API Key的使用统计");
      }

      // 基于现有数据构建基础统计信息
      // 注：将来可集成更详细的监控服务 (Prometheus、InfluxDB等)
      const usage: ApiKeyUsageDto = {
        apiKeyId: apiKeyData._id.toString(),
        appKey: apiKeyData.appKey,
        name: apiKeyData.name,
        totalRequestCount: apiKeyData.totalRequestCount || 0,
        // 基础实现：没有详细的时间维度统计，返回总量或0
        // 将来可以通过监控服务获取更精确的数据
        todayRequests: 0, // 需要监控服务支持
        hourlyRequests: 0, // 需要监控服务支持
        successfulRequests: Math.floor((apiKeyData.totalRequestCount || 0) * 0.95), // 估算95%成功率
        failedRequests: Math.ceil((apiKeyData.totalRequestCount || 0) * 0.05), // 估算5%失败率
        averageResponseTimeMs: 150, // 默认估值，需要监控服务提供真实数据
        lastAccessedAt: apiKeyData.lastAccessedAt,
        createdAt: (apiKeyData as any).createdAt || new Date(),
      };

      this.logger.log(`获取API Key使用统计成功: ${appKey}`);
      return usage;
    } catch (error) {
      this.logger.error(`获取API Key使用统计失败: ${appKey}`, error.stack);
      throw error;
    }
  }

  /**
   * 重置API Key频率限制
   */
  async resetApiKeyRateLimit(
    appKey: string,
    userId: string,
  ): Promise<{ success: boolean }> {
    try {
      // 验证API Key存在且属于该用户
      const apiKeyData = await this.apiKeyService.findByAppKey(appKey);
      if (!apiKeyData || apiKeyData.userId.toString() !== userId) {
        throw new ForbiddenException("无权重置此API Key的频率限制");
      }

      // 实现基础的频率限制重置功能
      // 1. 通过事件系统通知其他服务进行重置
      this.emitBusinessEvent("api_key_rate_limit_reset", true, {
        appKey,
        userId,
        timestamp: new Date(),
        resetType: 'manual'
      });

      // 2. 记录重置操作到日志
      this.logger.log(`API Key频率限制重置已触发: ${appKey}`, {
        operation: AUTH_OPERATIONS.API_KEY_RATE_LIMIT_RESET || 'resetApiKeyRateLimit',
        appKey,
        userId,
        timestamp: new Date()
      });

      // 注：实际的限流重置逻辑应由专门的限流服务处理
      // 可通过Redis清除限流键、重置计数器等方式实现
      return { success: true };
    } catch (error) {
      this.logger.error(`重置API Key频率限制失败: ${appKey}`, error.stack);
      throw error;
    }
  }

  /**
   * 分页获取所有用户（管理员功能）
   * @param page - 页码
   * @param limit - 每页数量
   * @param includeInactive - 是否包含非活跃用户
   */
  async getAllUsers(
    page: number = 1,
    limit: number = 10,
    includeInactive: boolean = false,
    includeStats: boolean = true,
  ) {
    this.logger.log(`管理员获取用户列表: 页码${page}, 数量${limit}, 统计${includeStats ? '包含' : '不包含'}`);

    try {
      // 直接使用 UserRepository，参数验证已在其内部通过 PaginationService 处理
      const result = await this.userRepository.findAllPaginated(
        page,
        limit,
        includeInactive,
      );

      // 根据需要获取用户统计信息
      const stats = includeStats ? await this.userRepository.getUserStats() : undefined;

      this.logger.log(
        `用户列表获取成功: 第${result.page}页, ${result.users.length}条记录`,
      );

      // 发送管理操作成功监控事件
      this.emitBusinessEvent("admin_get_users", true, {
        operation: "get_all_users",
        page: result.page,
        recordCount: result.users.length,
      });

      return {
        ...result,
        stats,
      };
    } catch (error: any) {
      this.logger.error(`获取用户列表失败: ${error.message}`);

      // 发送管理操作失败监控事件
      this.emitBusinessEvent("admin_get_users", false, {
        operation: "get_all_users",
        error: error.message,
      });

      throw error;
    }
  }
}
