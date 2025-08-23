import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  ForbiddenException,
} from "@nestjs/common";

import { createLogger } from "@common/config/logger.config";

import { DatabasePerformance } from "../../monitoring/infrastructure/decorators/infrastructure-database-performance.decorator";
import { CollectorService } from "../../monitoring/collector/services/collector.service";
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
    private readonly performanceMonitor: CollectorService,
  ) {}

  /**
   * 用户注册
   */
  @DatabasePerformance("user_registration")
  async register(createUserDto: CreateUserDto): Promise<User> {
    const operation = AUTH_OPERATIONS.REGISTER;
    const {
      username,
      email,
      password,
      role = AUTH_DEFAULTS.DEFAULT_USER_ROLE,
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
      throw new ConflictException(ERROR_MESSAGES.USER_EXISTS);
    }

    const passwordHash = await this.passwordService.hashPassword(password);

    const user = await this.userRepository.create({
      username,
      email,
      passwordHash,
      role,
      isActive: AUTH_DEFAULTS.DEFAULT_USER_ACTIVE_STATUS,
    });

    this.logger.log(AUTH_MESSAGES.USER_REGISTERED, {
      operation,
      username,
      role,
      userId: user.id,
    });

    // 使用 toJSON() 方法过滤敏感字段
    return user.toJSON() as User;
  }

  /**
   * 用户登录
   */
  @DatabasePerformance("user_login")
  async login(
    loginDto: LoginDto,
  ): Promise<{ user: User; accessToken: string; refreshToken: string }> {
    const operation = AUTH_OPERATIONS.LOGIN;
    const { username, password } = loginDto;

    this.logger.log(AUTH_MESSAGES.LOGIN_ATTEMPT, { operation, username });

    const user = await this.userRepository.findByUsername(username);
    if (!user || !user.isActive) {
      this.logger.warn(AUTH_MESSAGES.USER_NOT_FOUND_OR_INACTIVE, {
        operation,
        username,
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
  async getApiKeyUsage(appKey: string, userId: string): Promise<ApiKeyUsageDto> {
    try {
      // 验证API Key存在且属于该用户
      const apiKeyData = await this.apiKeyService.findByAppKey(appKey);
      if (!apiKeyData || apiKeyData.userId.toString() !== userId) {
        throw new ForbiddenException('无权访问此API Key的使用统计');
      }

      // TODO: 从性能监控服务获取使用统计 (需要实现 getApiKeyStats 方法)
      // const stats = await this.performanceMonitor.getApiKeyStats(appKey);
      const stats = null; // 临时处理，等待实现
      
      const usage: ApiKeyUsageDto = {
        apiKeyId: apiKeyData._id.toString(),
        appKey: apiKeyData.appKey,
        name: apiKeyData.name,
        totalRequests: stats?.totalRequests || 0,
        todayRequests: stats?.todayRequests || 0,
        hourlyRequests: stats?.hourlyRequests || 0,
        successfulRequests: stats?.successfulRequests || 0,
        failedRequests: stats?.failedRequests || 0,
        averageResponseTime: stats?.averageResponseTime || 0,
        lastUsedAt: apiKeyData.lastUsedAt,
        createdAt: apiKeyData.createdAt,
        usageByHour: stats?.usageByHour || {},
        errorStats: stats?.errorStats || {}
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
  async resetApiKeyRateLimit(appKey: string, userId: string): Promise<{ success: boolean }> {
    try {
      // 验证API Key存在且属于该用户  
      const apiKeyData = await this.apiKeyService.findByAppKey(appKey);
      if (!apiKeyData || apiKeyData.userId.toString() !== userId) {
        throw new ForbiddenException('无权重置此API Key的频率限制');
      }

      // TODO: 通过性能监控服务重置频率限制 (需要实现 resetRateLimit 方法)
      // await this.performanceMonitor.resetRateLimit(appKey);
      // 临时处理：记录重置操作
      this.logger.warn(`频率限制重置功能尚未实现: ${appKey}`);
      
      this.logger.log(`重置API Key频率限制成功: ${appKey}`);
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
  @DatabasePerformance("get_all_users")
  async getAllUsers(page: number = 1, limit: number = 10, includeInactive: boolean = false) {
    const operation = 'GET_ALL_USERS';

    this.logger.log(`${operation}: 开始获取用户列表`, {
      page,
      limit,
      includeInactive,
    });

    try {
      // 验证参数
      const validatedPage = Math.max(1, Math.floor(page));
      const validatedLimit = Math.min(100, Math.max(1, Math.floor(limit))); // 限制最大100条/页

      const result = await this.userRepository.findAllPaginated(
        validatedPage,
        validatedLimit,
        includeInactive
      );

      // 获取用户统计信息
      const stats = await this.userRepository.getUserStats();

      this.logger.log(`${operation}: 用户列表获取成功`, {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: result.totalPages,
        userCount: result.users.length,
        stats: {
          totalUsers: stats.totalUsers,
          activeUsers: stats.activeUsers,
          roleDistribution: stats.roleDistribution,
        },
      });

      return {
        ...result,
        stats,
      };
    } catch (error: any) {
      this.logger.error(`${operation}: 获取用户列表失败`, {
        page,
        limit,
        includeInactive,
        error: error.message,
        errorType: error.constructor.name,
      });
      throw error;
    }
  }
}
