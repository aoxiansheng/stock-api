import {
  IsValidUsername,
  IsStrongPassword,
  IsValidAccessToken,
  IsValidRoleName,
  AUTH_VALIDATION_CONSTANTS,
} from '@auth/decorators/validation.decorator';
import { validate, ValidationError } from 'class-validator';

// Mock class-validator
jest.mock('class-validator', () => ({
  registerDecorator: jest.fn(),
  validate: jest.fn(),
  ValidationError: jest.fn(),
}));

describe('Validation Decorators', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('IsValidUsername', () => {
    it('should register decorator with correct configuration', () => {
      const mockRegisterDecorator = require('class-validator').registerDecorator as jest.Mock;
      const target = { constructor: class TestClass {} };
      const propertyName = 'username';

      IsValidUsername()(target, propertyName);

      expect(mockRegisterDecorator).toHaveBeenCalledWith({
        name: 'isValidUsername',
        target: target.constructor,
        propertyName: propertyName,
        options: {
          message: '用户名必须是3-32个字符，只能包含字母、数字、下划线和连字符',
        },
        validator: expect.any(Object),
      });
    });
  });

  describe('IsStrongPassword', () => {
    it('should register decorator with correct configuration', () => {
      const mockRegisterDecorator = require('class-validator').registerDecorator as jest.Mock;
      const target = { constructor: class TestClass {} };
      const propertyName = 'password';

      IsStrongPassword()(target, propertyName);

      expect(mockRegisterDecorator).toHaveBeenCalledWith({
        name: 'isStrongPassword',
        target: target.constructor,
        propertyName: propertyName,
        options: {
          message: '密码必须是8-128个字符，包含至少一个大写字母、一个小写字母、一个数字',
        },
        validator: expect.any(Object),
      });
    });
  });

  describe('IsValidAccessToken', () => {
    it('should register decorator with correct configuration', () => {
      const mockRegisterDecorator = require('class-validator').registerDecorator as jest.Mock;
      const target = { constructor: class TestClass {} };
      const propertyName = 'accessToken';

      IsValidAccessToken()(target, propertyName);

      expect(mockRegisterDecorator).toHaveBeenCalledWith({
        name: 'isValidAccessToken',
        target: target.constructor,
        propertyName: propertyName,
        options: {
          message: '访问令牌必须是64位十六进制字符串',
        },
        validator: expect.any(Object),
      });
    });
  });

  describe('IsValidRoleName', () => {
    it('should register decorator with correct configuration', () => {
      const mockRegisterDecorator = require('class-validator').registerDecorator as jest.Mock;
      const target = { constructor: class TestClass {} };
      const propertyName = 'roleName';

      IsValidRoleName()(target, propertyName);

      expect(mockRegisterDecorator).toHaveBeenCalledWith({
        name: 'isValidRoleName',
        target: target.constructor,
        propertyName: propertyName,
        options: {
          message: `角色名称必须是1-${AUTH_VALIDATION_CONSTANTS.ROLE_NAME_MAX_LENGTH}个字符，只能包含字母、数字、下划线、连字符和空格`,
        },
        validator: expect.any(Object),
      });
    });
  });

  describe('AUTH_VALIDATION_CONSTANTS', () => {
    it('should contain correct validation limits', () => {
      expect(AUTH_VALIDATION_CONSTANTS).toEqual({
        USERNAME_MIN_LENGTH: 3,
        USERNAME_MAX_LENGTH: 32,
        PASSWORD_MIN_LENGTH: 8,
        PASSWORD_MAX_LENGTH: 128,
        API_KEY_LENGTH: 32,
        ACCESS_TOKEN_LENGTH: 64,
        SESSION_TIMEOUT_MIN: 300,
        SESSION_TIMEOUT_MAX: 86400,
        ROLE_NAME_MAX_LENGTH: 50,
        PERMISSION_NAME_MAX_LENGTH: 100,
      });
    });

    it('should have frozen AUTH_VALIDATION_CONSTANTS object', () => {
      expect(Object.isFrozen(AUTH_VALIDATION_CONSTANTS)).toBe(true);
    });
  });

  describe('Re-exported validators', () => {
    it('should re-export IsValidEmail from common validators', () => {
      // This test ensures the re-export is working correctly
      // The actual implementation is tested in common validators
      const decoratorModule = require('@auth/decorators/validation.decorator');
      expect(decoratorModule.IsValidEmail).toBeDefined();
    });

    it('should re-export IsValidPhoneNumber from common validators', () => {
      // This test ensures the re-export is working correctly
      // The actual implementation is tested in common validators
      const decoratorModule = require('@auth/decorators/validation.decorator');
      expect(decoratorModule.IsValidPhoneNumber).toBeDefined();
    });
  });
});