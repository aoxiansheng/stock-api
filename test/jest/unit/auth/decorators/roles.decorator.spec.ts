
import { Reflector } from '@nestjs/core';
import { Roles, ROLES_KEY } from '../../../../../src/auth/decorators/roles.decorator';
import { UserRole } from '../../../../../src/auth/enums/user-role.enum';

describe('Roles Decorator', () => {
  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
  });

  // 定义一个测试类，用于应用装饰器
  class TestClass {
    @Roles(UserRole.ADMIN)
    adminMethod() {}

    @Roles(UserRole.ADMIN, UserRole.DEVELOPER)
    adminDeveloperMethod() {}

    publicMethod() {}

    @Roles()
    emptyRolesMethod() {}
  }

  it('should set metadata for a single role', () => {
    const roles = reflector.get<UserRole[]>(ROLES_KEY, TestClass.prototype.adminMethod);
    expect(roles).toBeDefined();
    expect(roles).toEqual([UserRole.ADMIN]);
  });

  it('should set metadata for multiple roles', () => {
    const roles = reflector.get<UserRole[]>(ROLES_KEY, TestClass.prototype.adminDeveloperMethod);
    expect(roles).toBeDefined();
    expect(roles).toEqual([UserRole.ADMIN, UserRole.DEVELOPER]);
  });

  it('should not set metadata when the decorator is not used', () => {
    const roles = reflector.get<UserRole[]>(ROLES_KEY, TestClass.prototype.publicMethod);
    expect(roles).toBeUndefined();
  });

  it('should return an empty array when no roles are passed to the decorator', () => {
    const roles = reflector.get<UserRole[]>(ROLES_KEY, TestClass.prototype.emptyRolesMethod);
    expect(roles).toBeDefined();
    expect(roles).toEqual([]);
  });

  it('should export the correct ROLES_KEY constant', () => {
    expect(ROLES_KEY).toBe('roles');
  });
});
