import {
  Injectable,
  ConflictException,
  UnauthorizedException,
} from "@nestjs/common";
import { CreateUserDto, LoginDto } from "../../dto/auth.dto";
import { User } from "../../schemas/user.schema";
import { UserRepository } from "../../repositories/user.repository";
import { PasswordService } from "../infrastructure/password.service";
import { OperationStatus } from "@common/types/enums/shared-base.enum";
import { UserRole } from "../../enums/user-role.enum";
import { DatabaseValidationUtils } from "../../../common/utils/database.utils";
import { createLogger } from "@common/modules/logging";
import { ACCOUNT_DEFAULTS } from "../../constants/user-operations.constants";
import { ERROR_MESSAGES } from "../../../common/constants/semantic/error-messages.constants";

/**
 * 用户认证服务 - 核心认证逻辑
 * 专注于用户身份验证相关的业务逻辑
 * 不包含会话管理、审计日志、事件通知等跨切面关注点
 */
@Injectable()
export class UserAuthenticationService {
  private readonly logger = createLogger(UserAuthenticationService.name);

  constructor(
    private readonly userRepository: UserRepository,
    private readonly passwordService: PasswordService,
  ) {}

  /**
   * 注册新用户
   * 专注于用户创建的核心逻辑，不包含审计、通知等
   */
  async registerUser(createUserDto: CreateUserDto): Promise<User> {
    const {
      username,
      email,
      password,
      role = UserRole.DEVELOPER,
    } = createUserDto;

    this.logger.log("开始创建用户", { username, email, role });

    // 1. 检查用户是否已存在
    const existingUser = await this.userRepository.findByUsernameOrEmail(
      username,
      email,
    );

    if (existingUser) {
      this.logger.warn("用户已存在", { username, email });
      throw new ConflictException(ERROR_MESSAGES.USER_EXISTS);
    }

    // 2. 加密密码
    const passwordHash = await this.passwordService.hashPassword(password);

    // 3. 创建用户
    const user = await this.userRepository.create({
      username,
      email,
      passwordHash,
      role,
      status: OperationStatus.ACTIVE,
    });

    this.logger.log("用户创建成功", {
      userId: user.id,
      username: user.username,
      role: user.role,
    });

    // 返回过滤敏感信息的用户对象
    return user.toJSON() as User;
  }

  /**
   * 认证用户身份
   * 专注于身份验证逻辑，不包含会话创建
   */
  async authenticateUser(loginDto: LoginDto): Promise<User> {
    const { username, password } = loginDto;

    this.logger.log("开始验证用户身份", { username });

    // 1. 查找用户
    const user = await this.userRepository.findByUsername(username);

    if (!user) {
      this.logger.warn("用户不存在", { username });
      throw new UnauthorizedException(ERROR_MESSAGES.INVALID_CREDENTIALS);
    }

    // 2. 检查用户状态
    if (user.status !== OperationStatus.ACTIVE) {
      this.logger.warn("用户账户已禁用", { username, status: user.status });
      throw new UnauthorizedException(ERROR_MESSAGES.INVALID_CREDENTIALS);
    }

    // 3. 验证密码
    const isPasswordValid = await this.passwordService.comparePassword(
      password,
      user.passwordHash,
    );

    if (!isPasswordValid) {
      this.logger.warn("密码验证失败", { username });
      throw new UnauthorizedException(ERROR_MESSAGES.INVALID_CREDENTIALS);
    }

    this.logger.log("用户身份验证成功", {
      userId: user.id,
      username: user.username,
      role: user.role,
    });

    // 返回过滤敏感信息的用户对象
    return user.toJSON() as User;
  }

  /**
   * 根据用户ID获取用户信息
   * 用于令牌验证后的用户信息获取
   */
  async getUserById(userId: string): Promise<User> {
    this.logger.debug("根据ID获取用户信息", { userId });

    // 验证用户ID格式
    DatabaseValidationUtils.validateObjectId(userId, "用户ID");

    const user = await this.userRepository.findById(userId);

    if (!user) {
      this.logger.warn("用户ID无效", { userId });
      throw new UnauthorizedException("用户不存在或已被删除");
    }

    if (user.status !== OperationStatus.ACTIVE) {
      this.logger.warn("用户账户已禁用", { userId, status: user.status });
      throw new UnauthorizedException("用户账户已被禁用");
    }

    return user.toJSON() as User;
  }

  /**
   * 验证用户是否有效
   * 用于令牌验证流程
   */
  async validateUserStatus(userId: string): Promise<boolean> {
    this.logger.debug("验证用户状态", { userId });

    try {
      // 验证用户ID格式
      DatabaseValidationUtils.validateObjectId(userId, "用户ID");

      const user = await this.userRepository.findById(userId);
      return user !== null && user.status === OperationStatus.ACTIVE;
    } catch (error) {
      this.logger.error("验证用户状态失败", { userId, error: error.message });
      return false;
    }
  }

  /**
   * 管理员功能：分页获取所有用户
   * 专注于用户数据检索逻辑
   */
  async getAllUsers(
    page: number = 1,
    limit: number = 10,
    includeInactive: boolean = false,
    includeStats: boolean = true,
  ) {
    this.logger.log("获取用户列表", {
      page,
      limit,
      includeInactive,
      includeStats,
    });

    try {
      // 获取分页用户数据
      const result = await this.userRepository.findAllPaginated(
        page,
        limit,
        includeInactive,
      );

      // 根据需要获取统计信息
      const stats = includeStats
        ? await this.userRepository.getUserStats()
        : undefined;

      this.logger.log("用户列表获取成功", {
        page: result.page,
        total: result.total,
        recordCount: result.users.length,
      });

      return {
        ...result,
        stats,
      };
    } catch (error) {
      this.logger.error("获取用户列表失败", {
        page,
        limit,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * 检查用户名或邮箱是否已被使用
   * 用于注册前的可用性检查
   */
  async checkUserAvailability(
    username?: string,
    email?: string,
  ): Promise<{
    usernameAvailable: boolean;
    emailAvailable: boolean;
  }> {
    this.logger.debug("检查用户名和邮箱可用性", { username, email });

    const result = {
      usernameAvailable: true,
      emailAvailable: true,
    };

    if (username || email) {
      const existingUser = await this.userRepository.findByUsernameOrEmail(
        username || "",
        email || "",
      );

      if (existingUser) {
        if (username && existingUser.username === username) {
          result.usernameAvailable = false;
        }
        if (email && existingUser.email === email) {
          result.emailAvailable = false;
        }
      }
    }

    return result;
  }

  /**
   * 更新用户最后登录时间
   * 用于登录成功后的状态更新
   */
  async updateLastLoginTime(userId: string): Promise<void> {
    this.logger.debug("更新用户最后登录时间", { userId });

    try {
      // 验证用户ID格式
      DatabaseValidationUtils.validateObjectId(userId, "用户ID");

      await this.userRepository.updateLastLoginTime(userId);
    } catch (error) {
      // 这是非关键操作，记录错误但不抛出异常
      this.logger.error("更新最后登录时间失败", {
        userId,
        error: error.message,
      });
    }
  }
}
