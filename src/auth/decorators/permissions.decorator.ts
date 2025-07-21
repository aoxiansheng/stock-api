import { SetMetadata } from "@nestjs/common";

import { Permission } from "../enums/user-role.enum";

export const PERMISSIONS_KEY = "permissions";

/**
 * 指定API端点需要的具体权限
 *
 * @param permissions 需要的权限列表
 *
 * @example
 * @RequirePermissions(Permission.CONFIG_WRITE)
 * @Put('config/:id')
 * updateConfig() {
 *   // 需要配置写入权限
 * }
 *
 * @example
 * @RequirePermissions(Permission.DATA_READ, Permission.QUERY_EXECUTE)
 * @Post('query')
 * executeQuery() {
 *   // 需要数据读取和查询执行权限
 * }
 */
export const RequirePermissions = (...permissions: Permission[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);
