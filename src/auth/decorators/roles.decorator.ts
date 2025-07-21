import { SetMetadata } from "@nestjs/common";

import { UserRole } from "../enums/user-role.enum";

export const ROLES_KEY = "roles";

/**
 * 指定API端点需要的用户角色
 *
 * @param roles 允许访问的用户角色列表
 *
 * @example
 * @Roles(UserRole.ADMIN)
 * @Post('users')
 * createUser() {
 *   // 只有管理员可以创建用户
 * }
 *
 * @example
 * @Roles(UserRole.ADMIN, UserRole.DEVELOPER)
 * @Get('config')
 * getConfig() {
 *   // 管理员和开发者都可以查看配置
 * }
 */
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
