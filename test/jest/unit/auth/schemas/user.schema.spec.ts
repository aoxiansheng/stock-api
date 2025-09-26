import { User, UserSchema, UserDocument } from '@auth/schemas/user.schema';
import { UserRole } from '@auth/enums/user-role.enum';
import { OperationStatus } from '@common/types/enums/shared-base.enum';
import { Schema, model } from 'mongoose';

describe('User Schema', () => {
  let userModel: Schema<UserDocument>;

  beforeEach(() => {
    userModel = UserSchema;
  });

  it('应该成功创建User模型', () => {
    // Assert
    expect(userModel).toBeDefined();
  });

  it('应该正确定义User类的属性', () => {
    // Arrange
    const user = new User();
    
    // Assert
    expect(user).toHaveProperty('id');
    expect(user).toHaveProperty('username');
    expect(user).toHaveProperty('email');
    expect(user).toHaveProperty('passwordHash');
    expect(user).toHaveProperty('role');
    expect(user).toHaveProperty('status');
    expect(user).toHaveProperty('lastAccessedAt');
    expect(user).toHaveProperty('refreshToken');
  });

  it('应该正确定义UserSchema的属性和类型', () => {
    // Arrange
    const schemaPaths = userModel.paths;
    
    // Assert
    expect(schemaPaths.username).toBeDefined();
    expect(schemaPaths.username.options.required).toBe(true);
    expect(schemaPaths.username.options.unique).toBe(true);
    expect(schemaPaths.username.options.trim).toBe(true);
    
    expect(schemaPaths.email).toBeDefined();
    expect(schemaPaths.email.options.required).toBe(true);
    expect(schemaPaths.email.options.unique).toBe(true);
    expect(schemaPaths.email.options.trim).toBe(true);
    expect(schemaPaths.email.options.lowercase).toBe(true);
    
    expect(schemaPaths.passwordHash).toBeDefined();
    expect(schemaPaths.passwordHash.options.required).toBe(true);
    
    expect(schemaPaths.role).toBeDefined();
    expect(schemaPaths.role.options.required).toBe(true);
    expect(schemaPaths.role.options.enum).toEqual(Object.values(UserRole));
    expect(schemaPaths.role.options.default).toBe(UserRole.DEVELOPER);
    
    expect(schemaPaths.status).toBeDefined();
    expect(schemaPaths.status.options.enum).toEqual(Object.values(OperationStatus));
    expect(schemaPaths.status.options.default).toBe(OperationStatus.ACTIVE);
  });

  it('应该正确创建索引', () => {
    // Arrange
    const indexes = userModel.indexes();
    
    // Assert
    // username和email的唯一索引由@Prop装饰器自动创建
    expect(indexes.some(index => index[0].username === 1)).toBe(true);
    expect(indexes.some(index => index[0].email === 1)).toBe(true);

    // role索引
    expect(indexes.some(index => index[0].role === 1)).toBe(true);

    // status索引
    expect(indexes.some(index => index[0].status === 1)).toBe(true);
  });

  it('应该正确实现toJSON方法', () => {
    // Arrange
    const userData = {
      _id: 'user123',
      __v: 1,
      username: 'testuser',
      email: 'test@example.com',
      passwordHash: 'hashedpassword',
      refreshToken: 'refresh-token',
      role: UserRole.DEVELOPER,
      status: OperationStatus.ACTIVE,
    };
    
    // 创建一个模拟的文档对象
    const userDoc = {
      toObject: jest.fn().mockReturnValue(userData),
    };
    
    // Act
    const result = userModel.methods.toJSON.call(userDoc);
    
    // Assert
    expect(result).toEqual({
      id: 'user123',
      username: 'testuser',
      email: 'test@example.com',
      role: UserRole.DEVELOPER,
      status: OperationStatus.ACTIVE,
    });
    expect(result).not.toHaveProperty('_id');
    expect(result).not.toHaveProperty('__v');
    expect(result).not.toHaveProperty('passwordHash');
    expect(result).not.toHaveProperty('refreshToken');
  });
});