import "reflect-metadata";
import { GUARDS_METADATA } from "@nestjs/common/constants";

import {
  Auth,
  ApiKeyAuth,
  MixedAuth,
  ReadAccess,
  AdminOnly,
  Public,
} from "@authv2/decorators";
import {
  IS_PUBLIC_KEY,
  PERMISSIONS_KEY,
  ROLES_KEY,
  READ_PROFILE,
  ADMIN_PROFILE,
} from "@authv2/constants";
import { Permission, UserRole } from "@authv2/enums";

describe("auth decorators metadata", () => {
  class TestController {
    @Auth([UserRole.ADMIN], [Permission.DATA_READ])
    auth() {}

    @ApiKeyAuth([Permission.QUERY_EXECUTE])
    apiKey() {}

    @MixedAuth([UserRole.DEVELOPER], [Permission.STREAM_READ])
    mixed() {}

    @ReadAccess()
    readAccess() {}

    @AdminOnly()
    adminOnly() {}

    @Public()
    publicRoute() {}
  }

  it("Auth/ApiKeyAuth/MixedAuth 不再附加局部 guards 元数据", () => {
    expect(Reflect.getMetadata(GUARDS_METADATA, TestController.prototype.auth)).toBeUndefined();
    expect(Reflect.getMetadata(GUARDS_METADATA, TestController.prototype.apiKey)).toBeUndefined();
    expect(Reflect.getMetadata(GUARDS_METADATA, TestController.prototype.mixed)).toBeUndefined();
  });

  it("仍保留角色与权限元数据", () => {
    expect(Reflect.getMetadata(ROLES_KEY, TestController.prototype.auth)).toEqual([
      UserRole.ADMIN,
    ]);
    expect(
      Reflect.getMetadata(PERMISSIONS_KEY, TestController.prototype.auth),
    ).toEqual([Permission.DATA_READ]);

    expect(Reflect.getMetadata(ROLES_KEY, TestController.prototype.mixed)).toEqual([
      UserRole.DEVELOPER,
    ]);
    expect(
      Reflect.getMetadata(PERMISSIONS_KEY, TestController.prototype.mixed),
    ).toEqual([Permission.STREAM_READ]);
  });

  it("便捷装饰器仍输出既有权限画像", () => {
    expect(
      Reflect.getMetadata(ROLES_KEY, TestController.prototype.readAccess),
    ).toEqual([UserRole.DEVELOPER, UserRole.ADMIN]);
    expect(
      Reflect.getMetadata(PERMISSIONS_KEY, TestController.prototype.readAccess),
    ).toEqual([...READ_PROFILE]);

    expect(
      Reflect.getMetadata(ROLES_KEY, TestController.prototype.adminOnly),
    ).toEqual([UserRole.ADMIN]);
    expect(
      Reflect.getMetadata(PERMISSIONS_KEY, TestController.prototype.adminOnly),
    ).toEqual([...ADMIN_PROFILE]);
  });

  it("Public 仍保留公开路由元数据", () => {
    expect(
      Reflect.getMetadata(IS_PUBLIC_KEY, TestController.prototype.publicRoute),
    ).toBe(true);
  });
});
