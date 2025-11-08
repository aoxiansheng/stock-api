import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthService } from './service';
import { JwtAuthGuard } from './guards';
import { Public } from './decorators';
import {
  RegisterDto,
  LoginDto,
  RefreshTokenDto,
  CreateApiKeyDto,
} from './dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * 用户注册
   * POST /api/v1/auth/register
   */
  @Public()
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  /**
   * 用户登录
   * POST /api/v1/auth/login
   */
  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  /**
   * 刷新 Token
   * POST /api/v1/auth/refresh
   */
  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Body() refreshTokenDto: RefreshTokenDto) {
    return this.authService.refreshToken(refreshTokenDto.refreshToken);
  }

  /**
   * 创建 API Key
   * POST /api/v1/auth/api-keys
   * 需要 JWT 认证
   */
  @Post('api-keys')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  async createApiKey(
    @Request() req: any,
    @Body() createApiKeyDto: CreateApiKeyDto,
  ) {
    const userId = req.user.id;
    return this.authService.createApiKey(userId, createApiKeyDto);
  }

  /**
   * 列出所有 API Keys
   * GET /api/v1/auth/api-keys
   * 需要 JWT 认证
   */
  @Get('api-keys')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async listApiKeys(@Request() req: any) {
    const userId = req.user.id;
    return this.authService.listApiKeys(userId);
  }

  /**
   * 撤销 API Key
   * DELETE /api/v1/auth/api-keys/:appKey
   * 需要 JWT 认证
   */
  @Delete('api-keys/:appKey')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async revokeApiKey(
    @Request() req: any,
    @Param('appKey') appKey: string,
  ) {
    const userId = req.user.id;
    return this.authService.revokeApiKey(userId, appKey);
  }

  /**
   * 获取当前用户信息
   * GET /api/v1/auth/me
   * 需要 JWT 认证
   */
  @Get('me')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async getCurrentUser(@Request() req: any) {
    return req.user;
  }

  /**
   * 获取当前用户信息（别名）
   * GET /api/v1/auth/profile
   * 需要 JWT 认证
   */
  @Get('profile')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async getUserProfile(@Request() req: any) {
    return req.user;
  }
}
