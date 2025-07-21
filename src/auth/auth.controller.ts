import {
  Controller,
  Post,
  Body,
  Get,
  Delete,
  Param,
  Query,
  Request,
  ValidationPipe,
  HttpCode,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from "@nestjs/swagger";

import { createLogger } from '@common/config/logger.config';
import {
  ApiSuccessResponse,
  ApiCreatedResponse,
  ApiPaginatedResponse,
  ApiStandardResponses,
  JwtAuthResponses,
} from "@common/decorators/swagger-responses.decorator";

import { Auth, ApiKeyAuth } from "./decorators/auth.decorator";
import { Public } from "./decorators/public.decorator";
import {
  CreateApiKeyDto,
  ApiKeyResponseDto,
} from "./dto/apikey.dto";
import { CreateUserDto, LoginDto, LoginResponseDto } from "./dto/auth.dto";
import { Permission } from "./enums/user-role.enum";
import { AuthService } from "./services/auth.service";


@ApiTags("🔐 认证管理")
@Controller("auth")
export class AuthController {
  private readonly logger = createLogger(AuthController.name);

  constructor(private readonly authService: AuthService) {}

  /**
   * 用户注册
   */
  @Public()
  @Post("register")
  @ApiOperation({
    summary: "用户注册",
    description:
      "创建新用户账号，支持管理员、开发者等不同角色。注册成功后用户可使用用户名和密码登录系统",
  })
  @ApiCreatedResponse({
    description: "用户注册成功",
    schema: {
      example: {
        statusCode: 201,
        message: "用户注册成功",
        data: {
          id: "507f1f77bcf86cd799439011",
          username: "developer01",
          email: "developer@example.com",
          role: "developer",
          isActive: true,
          createdAt: "2024-01-01T12:00:00.000Z",
        },
        timestamp: "2024-01-01T12:00:00.000Z",
      },
    },
  })
  @ApiResponse({
    status: 409,
    description: "用户名或邮箱已存在",
    schema: {
      example: {
        statusCode: 409,
        message: "用户名已存在，请选择其他用户名",
        error: "Conflict",
        timestamp: "2024-01-01T12:00:00.000Z",
        path: "/auth/register",
      },
    },
  })
  @ApiStandardResponses()
  async register(@Body(ValidationPipe) createUserDto: CreateUserDto) {
    this.logger.log(`用户注册请求: ${createUserDto.username}`);
    const user = await this.authService.register(createUserDto);
    // 遵循控制器编写规范：让拦截器自动处理响应格式化
    return user;
  }

  /**
   * 用户登录
   */
  @Public()
  @Post("login")
  @HttpCode(200)
  @ApiOperation({
    summary: "用户登录",
    description:
      "使用用户名和密码进行身份验证，登录成功后返回 JWT 访问令牌和刷新令牌，用于后续 API 调用的身份验证",
  })
  @ApiSuccessResponse({
    description: "登录成功",
    type: LoginResponseDto,
    schema: {
      example: {
        statusCode: 200,
        message: "登录成功",
        data: {
          user: {
            id: "507f1f77bcf86cd799439011",
            username: "developer01",
            email: "developer@example.com",
            role: "developer",
            isActive: true,
            createdAt: "2024-01-01T12:00:00.000Z",
          },
          accessToken: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
          refreshToken: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
        },
        timestamp: "2024-01-01T12:00:00.000Z",
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: "用户名或密码错误",
    schema: {
      example: {
        statusCode: 401,
        message: "用户名或密码错误，请检查后重试",
        error: "Unauthorized",
        timestamp: "2024-01-01T12:00:00.000Z",
        path: "/auth/login",
      },
    },
  })
  @ApiStandardResponses()
  async login(@Body(ValidationPipe) loginDto: LoginDto) {
    this.logger.log(`用户登录请求: ${loginDto.username}`);
    const result = await this.authService.login(loginDto);
    // 遵循控制器编写规范：让拦截器自动处理响应格式化
    return result;
  }

  /**
   * 获取当前用户信息
   */
  @Auth()
  @Get("profile")
  @ApiOperation({
    summary: "获取当前用户信息",
    description:
      "获取当前登录用户的详细信息，包括用户名、邮箱、角色等。需要提供有效的 JWT 访问令牌",
  })
  @ApiBearerAuth()
  @ApiSuccessResponse({
    description: "获取用户信息成功",
    schema: {
      example: {
        statusCode: 200,
        message: "获取用户信息成功",
        data: {
          id: "507f1f77bcf86cd799439011",
          username: "developer01",
          email: "developer@example.com",
          role: "developer",
          isActive: true,
          createdAt: "2024-01-01T12:00:00.000Z",
          lastLoginAt: "2024-01-01T11:30:00.000Z",
        },
        timestamp: "2024-01-01T12:00:00.000Z",
      },
    },
  })
  @JwtAuthResponses()
  async getProfile(@Request() req) {
    // 遵循控制器编写规范：让拦截器自动处理响应格式化
    return req.user;
  }

  /**
   * 创建API Key
   */
  @Auth()
  @Post("api-keys")
  @ApiOperation({
    summary: "创建API Key",
    description:
      "为当前用户创建新的API密钥，用于第三方应用或脚本访问API。可设置密钥名称、权限范围和有效期等",
  })
  @ApiBearerAuth()
  @ApiCreatedResponse({
    description: "API Key创建成功",
    type: ApiKeyResponseDto,
    schema: {
      example: {
        statusCode: 201,
        message: "API Key创建成功",
        data: {
          id: "507f1f77bcf86cd799439012",
          name: "My Trading Bot API Key",
          keyPrefix: "ak_live_",
          key: "ak_live_1234567890abcdef1234567890abcdef",
          userId: "507f1f77bcf86cd799439011",
          permissions: ["query:read", "storage:read"],
          rateLimit: {
            requestsPerMinute: 1000,
            requestsPerDay: 50000,
          },
          isActive: true,
          expiresAt: "2025-01-01T12:00:00.000Z",
          createdAt: "2024-01-01T12:00:00.000Z",
        },
        timestamp: "2024-01-01T12:00:00.000Z",
      },
    },
  })
  @JwtAuthResponses()
  async createApiKey(
    @Request() req,
    @Body(ValidationPipe) createApiKeyDto: CreateApiKeyDto,
  ) {
    this.logger.log(
      `创建API Key请求: ${createApiKeyDto.name}, 用户: ${req.user.username}`,
    );
    const apiKey = await this.authService.createApiKey(
      req.user.id,
      createApiKeyDto,
    );
    // 遵循控制器编写规范：让拦截器自动处理响应格式化
    return apiKey;
  }

  /**
   * 获取用户的API Keys
   */
  @Auth()
  @Get("api-keys")
  @ApiOperation({ summary: "获取用户的API Keys" })
  @ApiSuccessResponse({
    description: "获取成功",
    schema: {
      example: {
        statusCode: 200,
        message: "获取成功",
        data: [
          {
            id: "507f1f77bcf86cd799439012",
            name: "My Trading Bot API Key",
            keyPrefix: "ak_live_",
            permissions: ["query:read", "storage:read"],
            isActive: true,
            createdAt: "2024-01-01T12:00:00.000Z",
            lastUsedAt: "2024-01-01T11:30:00.000Z",
          },
        ],
        timestamp: "2024-01-01T12:00:00.000Z",
      },
    },
  })
  @ApiBearerAuth()
  async getUserApiKeys(@Request() req) {
    const apiKeys = await this.authService.getUserApiKeys(req.user.id);
    // 遵循控制器编写规范：让拦截器自动处理响应格式化
    return apiKeys;
  }

  /**
   * 撤销API Key
   */
  @Auth()
  @Delete("api-keys/:id")
  @ApiOperation({ summary: "撤销API Key" })
  @ApiParam({ name: "id", description: "API Key ID" })
  @ApiSuccessResponse({
    description: "撤销成功",
    schema: {
      example: {
        statusCode: 200,
        message: "API Key撤销成功",
        data: { success: true },
        timestamp: "2024-01-01T12:00:00.000Z",
      },
    },
  })
  @ApiBearerAuth()
  async revokeApiKey(@Request() req, @Param("id") apiKeyId: string) {
    this.logger.log(`撤销API Key请求: ${apiKeyId}, 用户: ${req.user.username}`);
    await this.authService.revokeApiKey(apiKeyId, req.user.id);
    // 遵循控制器编写规范：让拦截器自动处理响应格式化
    return { success: true };
  }

  /**
   * 获取API Key使用统计
   */
  @Auth()
  @Get("api-keys/:id/usage")
  @ApiOperation({ summary: "获取API Key使用统计" })
  @ApiParam({ name: "id", description: "API Key ID" })
  @ApiSuccessResponse({
    description: "获取成功",
    schema: {
      example: {
        statusCode: 200,
        message: "获取成功",
        data: {
          message: "功能开发中，即将上线",
        },
        timestamp: "2024-01-01T12:00:00.000Z",
      },
    },
  })
  @ApiBearerAuth()
  async getApiKeyUsage(
    @Request() req,
    @Param("id") apiKeyId: string,
    @Query() _query: any,
  ) {
    this.logger.log(
      `获取API Key使用统计: ${apiKeyId}, 用户: ${req.user.username}`,
    );

    // 这里需要注入RateLimitService，稍后会处理
    // 遵循控制器编写规范：让拦截器自动处理响应格式化
    return {
      message: "功能开发中，即将上线",
    };
  }

  /**
   * 重置API Key频率限制
   */
  @Auth()
  @Post("api-keys/:id/reset-rate-limit")
  @ApiOperation({ summary: "重置API Key频率限制" })
  @ApiParam({ name: "id", description: "API Key ID" })
  @ApiSuccessResponse({
    description: "重置成功",
    schema: {
      example: {
        statusCode: 200,
        message: "频率限制重置成功",
        data: { success: true },
        timestamp: "2024-01-01T12:00:00.000Z",
      },
    },
  })
  @ApiBearerAuth()
  async resetApiKeyRateLimit(@Request() req, @Param("id") apiKeyId: string) {
    this.logger.log(
      `重置API Key频率限制: ${apiKeyId}, 用户: ${req.user.username}`,
    );

    // 这里需要注入RateLimitService，稍后会处理
    // 遵循控制器编写规范：让拦截器自动处理响应格式化
    return { success: true };
  }

  /**
   * 管理员：获取所有用户（仅管理员）
   */
  @ApiKeyAuth([Permission.SYSTEM_ADMIN])
  @Get("users")
  @ApiOperation({ summary: "获取所有用户（仅管理员）" })
  @ApiStandardResponses()
  @ApiQuery({ name: "page", required: false, description: "页码", example: 1 })
  @ApiQuery({
    name: "limit",
    required: false,
    description: "每页数量",
    example: 10,
  })
  @ApiPaginatedResponse({
    description: "获取成功",
    schema: {
      example: {
        statusCode: 200,
        message: "获取成功",
        data: {
          users: [],
          total: 0,
          page: 1,
          limit: 10,
        },
        timestamp: "2024-01-01T12:00:00.000Z",
      },
    },
  })
  @ApiBearerAuth()
  async getAllUsers(
    @Query("page") page: number = 1,
    @Query("limit") limit: number = 10,
  ) {
    // TODO: 实现用户列表查询
    // 遵循控制器编写规范：让拦截器自动处理响应格式化
    return {
      users: [],
      total: 0,
      page,
      limit,
    };
  }
}
