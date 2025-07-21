import { SetMetadata } from "@nestjs/common";

export const IS_PUBLIC_KEY = "isPublic";

/**
 * 标记API端点为公开访问，无需认证
 *
 * @example
 * @Public()
 * @Get('health')
 * getHealth() {
 *   return { status: 'OK' };
 * }
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
