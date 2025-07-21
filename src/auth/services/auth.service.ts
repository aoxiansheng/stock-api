import {
  Injectable,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';

import { createLogger } from '@common/config/logger.config';


import { DatabasePerformance } from '../../metrics/decorators/database-performance.decorator';
import { PerformanceMonitorService } from '../../metrics/services/performance-monitor.service';
import {
  AUTH_OPERATIONS,
  AUTH_MESSAGES,
  AUTH_DEFAULTS,
} from '../constants/auth.constants';
import { CreateUserDto, LoginDto } from '../dto/auth.dto';
import { UserRepository } from '../repositories/user.repository';
import { ApiKeyDocument } from '../schemas/apikey.schema';
import { User } from '../schemas/user.schema';

import { ApiKeyService } from './apikey.service';
import { PasswordService } from './password.service';
import { TokenService } from './token.service';
@Injectable()
export class AuthService {
  private readonly logger = createLogger(AuthService.name);

  constructor(
    private readonly userRepository: UserRepository,
    private readonly apiKeyService: ApiKeyService,
    private readonly passwordService: PasswordService,
    private readonly tokenService: TokenService,
    private readonly performanceMonitor: PerformanceMonitorService,
  ) {}

  /**
   * 用户注册
   */
  @DatabasePerformance('user_registration')
  async register(createUserDto: CreateUserDto): Promise<User> {
    const operation = AUTH_OPERATIONS.REGISTER;
    const {
      username,
      email,
      password,
      role = AUTH_DEFAULTS.DEFAULT_USER_ROLE,
    } = createUserDto;

    this.logger.log(AUTH_MESSAGES.REGISTRATION_STARTED, { operation, username, email });

    const existingUser = await this.userRepository.findByUsernameOrEmail(
      username,
      email,
    );

    if (existingUser) {
      this.logger.warn(AUTH_MESSAGES.USER_EXISTS, { operation, username, email });
      throw new ConflictException(AUTH_MESSAGES.USER_EXISTS);
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
  @DatabasePerformance('user_login')
  async login(
    loginDto: LoginDto,
  ): Promise<{ user: User; accessToken: string; refreshToken: string }> {
    const operation = AUTH_OPERATIONS.LOGIN;
    const { username, password } = loginDto;

    this.logger.log(AUTH_MESSAGES.LOGIN_ATTEMPT, { operation, username });

    const user = await this.userRepository.findByUsername(username);
    if (!user || !user.isActive) {
      this.logger.warn(AUTH_MESSAGES.USER_NOT_FOUND_OR_INACTIVE, { operation, username });
      throw new UnauthorizedException(AUTH_MESSAGES.INVALID_CREDENTIALS);
    }

    this.logger.debug(AUTH_MESSAGES.PASSWORD_VALIDATION_STARTED, { operation, username });
    const isPasswordValid = await this.passwordService.comparePassword(
      password,
      user.passwordHash,
    );
    if (!isPasswordValid) {
      this.logger.warn(AUTH_MESSAGES.PASSWORD_VERIFICATION_FAILED, { operation, username });
      throw new UnauthorizedException(AUTH_MESSAGES.INVALID_CREDENTIALS);
    }

    const { accessToken, refreshToken } = await this.tokenService.generateTokens(user);

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
  async revokeApiKey(apiKeyId: string, userId: string): Promise<void> {
    return this.apiKeyService.revokeApiKey(apiKeyId, userId);
  }

  /**
   * 验证API Key - 委托给ApiKeyService
   */
  async validateApiKey(appKey: string, accessToken: string): Promise<ApiKeyDocument> {
    return this.apiKeyService.validateApiKey(appKey, accessToken);
  }
}
