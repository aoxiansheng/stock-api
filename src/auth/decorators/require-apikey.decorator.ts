import { SetMetadata } from "@nestjs/common";

export const REQUIRE_API_KEY = "requireApiKey";

/**
 * 标记API端点需要API Key认证
 *
 * @example
 * @RequireApiKey()
 * @Post('receiver/data')
 * handleDataRequest() {
 *   // 需要提供有效的API Key
 * }
 */
export const RequireApiKey = () => SetMetadata(REQUIRE_API_KEY, true);
