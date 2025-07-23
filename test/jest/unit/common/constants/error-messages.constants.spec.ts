import {
  AUTH_ERROR_MESSAGES,
  BUSINESS_ERROR_MESSAGES,
  SYSTEM_ERROR_MESSAGES,
  HTTP_ERROR_MESSAGES,
  ERROR_MESSAGES,
  ErrorMessageType,
  ErrorMessageUtil,
} from '../../../../../src/common/constants/error-messages.constants';

describe('Error Messages Constants', () => {
  describe('AUTH_ERROR_MESSAGES', () => {
    it('should have all required auth error messages', () => {
      expect(AUTH_ERROR_MESSAGES.UNAUTHORIZED_ACCESS).toBe('未授权访问');
      expect(AUTH_ERROR_MESSAGES.INVALID_CREDENTIALS).toBe('用户名或密码错误');
      expect(AUTH_ERROR_MESSAGES.TOKEN_EXPIRED).toBe('token已过期');
      expect(AUTH_ERROR_MESSAGES.API_KEY_NOT_FOUND).toBe('API Key不存在');
    });

    it('should be immutable', () => {
      expect(() => {
        // @ts-ignore
        AUTH_ERROR_MESSAGES.NEW_ERROR = '新错误';
      }).toThrow();
    });
  });

  describe('BUSINESS_ERROR_MESSAGES', () => {
    it('should have all required business error messages', () => {
      expect(BUSINESS_ERROR_MESSAGES.VALIDATION_FAILED).toBe('数据验证失败');
      expect(BUSINESS_ERROR_MESSAGES.RESOURCE_NOT_FOUND).toBe('资源不存在');
      expect(BUSINESS_ERROR_MESSAGES.OPERATION_FAILED).toBe('操作失败');
    });

    it('should be immutable', () => {
      expect(() => {
        // @ts-ignore
        BUSINESS_ERROR_MESSAGES.NEW_ERROR = '新错误';
      }).toThrow();
    });
  });

  describe('SYSTEM_ERROR_MESSAGES', () => {
    it('should have all required system error messages', () => {
      expect(SYSTEM_ERROR_MESSAGES.INTERNAL_SERVER_ERROR).toBe('服务器内部错误');
      expect(SYSTEM_ERROR_MESSAGES.DATABASE_ERROR).toBe('数据库错误');
      expect(SYSTEM_ERROR_MESSAGES.NETWORK_ERROR).toBe('网络错误');
    });

    it('should be immutable', () => {
      expect(() => {
        // @ts-ignore
        SYSTEM_ERROR_MESSAGES.NEW_ERROR = '新错误';
      }).toThrow();
    });
  });

  describe('HTTP_ERROR_MESSAGES', () => {
    it('should have all required HTTP error messages', () => {
      expect(HTTP_ERROR_MESSAGES.BAD_REQUEST).toBe('请求参数错误');
      expect(HTTP_ERROR_MESSAGES.HTTP_UNAUTHORIZED).toBe('未授权访问');
      expect(HTTP_ERROR_MESSAGES.NOT_FOUND).toBe('资源不存在');
      expect(HTTP_ERROR_MESSAGES.HTTP_INTERNAL_SERVER_ERROR).toBe('服务器内部错误');
    });

    it('should be immutable', () => {
      expect(() => {
        // @ts-ignore
        HTTP_ERROR_MESSAGES.NEW_ERROR = '新错误';
      }).toThrow();
    });
  });

  describe('ERROR_MESSAGES (unified)', () => {
    it('should contain all error messages from different categories', () => {
      // Check it contains auth messages
      expect(ERROR_MESSAGES.UNAUTHORIZED_ACCESS).toBe('未授权访问');
      
      // Check it contains business messages
      expect(ERROR_MESSAGES.VALIDATION_FAILED).toBe('数据验证失败');
      
      // Check it contains system messages
      expect(ERROR_MESSAGES.DATABASE_ERROR).toBe('数据库错误');
      
      // Check it contains HTTP messages
      expect(ERROR_MESSAGES.BAD_REQUEST).toBe('请求参数错误');
    });

    it('should be immutable', () => {
      expect(() => {
        // @ts-ignore
        ERROR_MESSAGES.NEW_ERROR = '新错误';
      }).toThrow();
    });

    it('should have all messages from constituent objects', () => {
      const authKeys = Object.keys(AUTH_ERROR_MESSAGES);
      const businessKeys = Object.keys(BUSINESS_ERROR_MESSAGES);
      const systemKeys = Object.keys(SYSTEM_ERROR_MESSAGES);
      const httpKeys = Object.keys(HTTP_ERROR_MESSAGES);

      authKeys.forEach(key => {
        expect(ERROR_MESSAGES).toHaveProperty(key);
      });

      businessKeys.forEach(key => {
        expect(ERROR_MESSAGES).toHaveProperty(key);
      });

      systemKeys.forEach(key => {
        expect(ERROR_MESSAGES).toHaveProperty(key);
      });

      httpKeys.forEach(key => {
        expect(ERROR_MESSAGES).toHaveProperty(key);
      });
    });
  });

  describe('ErrorMessageType enum', () => {
    it('should have all required error message types', () => {
      expect(ErrorMessageType.AUTH).toBe('AUTH');
      expect(ErrorMessageType.BUSINESS).toBe('BUSINESS');
      expect(ErrorMessageType.SYSTEM).toBe('SYSTEM');
      expect(ErrorMessageType.HTTP).toBe('HTTP');
    });

    it('should have exactly 4 types', () => {
      const enumValues = Object.values(ErrorMessageType);
      expect(enumValues).toHaveLength(4);
    });
  });

  describe('ErrorMessageUtil', () => {
    describe('getByType', () => {
      it('should return correct AUTH messages', () => {
        const message = ErrorMessageUtil.getByType(ErrorMessageType.AUTH, 'UNAUTHORIZED_ACCESS');
        expect(message).toBe('未授权访问');
      });

      it('should return fallback AUTH message for invalid AUTH key', () => {
        const message = ErrorMessageUtil.getByType(ErrorMessageType.AUTH, 'INVALID_KEY');
        expect(message).toBe(AUTH_ERROR_MESSAGES.UNAUTHORIZED_ACCESS);
      });

      it('should return correct BUSINESS messages', () => {
        const message = ErrorMessageUtil.getByType(ErrorMessageType.BUSINESS, 'VALIDATION_FAILED');
        expect(message).toBe('数据验证失败');
      });

      it('should return fallback BUSINESS message for invalid BUSINESS key', () => {
        const message = ErrorMessageUtil.getByType(ErrorMessageType.BUSINESS, 'INVALID_KEY');
        expect(message).toBe(BUSINESS_ERROR_MESSAGES.OPERATION_FAILED);
      });

      it('should return correct SYSTEM messages', () => {
        const message = ErrorMessageUtil.getByType(ErrorMessageType.SYSTEM, 'DATABASE_ERROR');
        expect(message).toBe('数据库错误');
      });

      it('should return fallback SYSTEM message for invalid SYSTEM key', () => {
        const message = ErrorMessageUtil.getByType(ErrorMessageType.SYSTEM, 'INVALID_KEY');
        expect(message).toBe(SYSTEM_ERROR_MESSAGES.INTERNAL_SERVER_ERROR);
      });

      it('should return correct HTTP messages', () => {
        const message = ErrorMessageUtil.getByType(ErrorMessageType.HTTP, 'BAD_REQUEST');
        expect(message).toBe('请求参数错误');
      });

      it('should return fallback HTTP message for invalid HTTP key', () => {
        const message = ErrorMessageUtil.getByType(ErrorMessageType.HTTP, 'INVALID_KEY');
        expect(message).toBe(HTTP_ERROR_MESSAGES.HTTP_INTERNAL_SERVER_ERROR);
      });

      it('should return fallback message for unknown type', () => {
        const message = ErrorMessageUtil.getByType('UNKNOWN_TYPE' as any, 'SOME_KEY');
        expect(message).toBe(AUTH_ERROR_MESSAGES.UNAUTHORIZED_ACCESS);
      });

      it('should return message from unified collection for unknown type with valid key', () => {
        const message = ErrorMessageUtil.getByType('UNKNOWN_TYPE' as any, 'TOKEN_EXPIRED');
        expect(message).toBe('token已过期');
      });

      it('should handle all enum values', () => {
        Object.values(ErrorMessageType).forEach(type => {
          const message = ErrorMessageUtil.getByType(type, 'SOME_VALID_KEY');
          expect(typeof message).toBe('string');
          expect(message.length).toBeGreaterThan(0);
        });
      });

      it('should test switch statement default case', () => {
        // Test the default case in the switch statement
        const message = ErrorMessageUtil.getByType(null as any, 'UNAUTHORIZED_ACCESS');
        expect(message).toBe('未授权访问');
      });

      it('should test fallback to unified ERROR_MESSAGES for default case', () => {
        const message = ErrorMessageUtil.getByType(undefined as any, 'INVALID_KEY_NOT_IN_ERROR_MESSAGES');
        expect(message).toBe(AUTH_ERROR_MESSAGES.UNAUTHORIZED_ACCESS);
      });
    });

    describe('exists', () => {
      it('should return true for existing error message keys', () => {
        expect(ErrorMessageUtil.exists('UNAUTHORIZED_ACCESS')).toBe(true);
        expect(ErrorMessageUtil.exists('VALIDATION_FAILED')).toBe(true);
        expect(ErrorMessageUtil.exists('DATABASE_ERROR')).toBe(true);
        expect(ErrorMessageUtil.exists('BAD_REQUEST')).toBe(true);
      });

      it('should return false for non-existing error message keys', () => {
        expect(ErrorMessageUtil.exists('NON_EXISTING_KEY')).toBe(false);
        expect(ErrorMessageUtil.exists('INVALID_KEY')).toBe(false);
        expect(ErrorMessageUtil.exists('')).toBe(false);
      });

      it('should handle edge cases', () => {
        expect(ErrorMessageUtil.exists(null as any)).toBe(false);
        expect(ErrorMessageUtil.exists(undefined as any)).toBe(false);
        expect(ErrorMessageUtil.exists(123 as any)).toBe(false);
      });

      it('should check against unified ERROR_MESSAGES', () => {
        // Test with keys from different categories
        const authKeys = Object.keys(AUTH_ERROR_MESSAGES);
        const businessKeys = Object.keys(BUSINESS_ERROR_MESSAGES);
        const systemKeys = Object.keys(SYSTEM_ERROR_MESSAGES);
        const httpKeys = Object.keys(HTTP_ERROR_MESSAGES);

        [...authKeys, ...businessKeys, ...systemKeys, ...httpKeys].forEach(key => {
          expect(ErrorMessageUtil.exists(key)).toBe(true);
        });
      });
    });

    describe('getAll', () => {
      it('should return all error messages', () => {
        const allMessages = ErrorMessageUtil.getAll();
        
        expect(typeof allMessages).toBe('object');
        expect(allMessages).not.toBeNull();
      });

      it('should return the same object as ERROR_MESSAGES', () => {
        const allMessages = ErrorMessageUtil.getAll();
        expect(allMessages).toBe(ERROR_MESSAGES);
      });

      it('should contain messages from all categories', () => {
        const allMessages = ErrorMessageUtil.getAll();
        
        // Check some auth messages
        expect(allMessages.UNAUTHORIZED_ACCESS).toBe('未授权访问');
        expect(allMessages.TOKEN_EXPIRED).toBe('token已过期');
        
        // Check some business messages
        expect(allMessages.VALIDATION_FAILED).toBe('数据验证失败');
        expect(allMessages.OPERATION_FAILED).toBe('操作失败');
        
        // Check some system messages
        expect(allMessages.DATABASE_ERROR).toBe('数据库错误');
        expect(allMessages.NETWORK_ERROR).toBe('网络错误');
        
        // Check some HTTP messages
        expect(allMessages.BAD_REQUEST).toBe('请求参数错误');
        expect(allMessages.NOT_FOUND).toBe('资源不存在');
      });

      it('should return immutable object', () => {
        const allMessages = ErrorMessageUtil.getAll();
        
        expect(() => {
          // @ts-ignore
          allMessages.NEW_ERROR = '新错误';
        }).toThrow();
      });

      it('should have expected number of messages', () => {
        const allMessages = ErrorMessageUtil.getAll();
        const messageCount = Object.keys(allMessages).length;
        
        const expectedCount = 
          Object.keys(AUTH_ERROR_MESSAGES).length +
          Object.keys(BUSINESS_ERROR_MESSAGES).length +
          Object.keys(SYSTEM_ERROR_MESSAGES).length +
          Object.keys(HTTP_ERROR_MESSAGES).length;
        
        expect(messageCount).toBe(expectedCount);
      });
    });

    describe('comprehensive branch coverage', () => {
      it('should test all combinations of valid and invalid keys for each type', () => {
        const validKeys = {
          [ErrorMessageType.AUTH]: 'UNAUTHORIZED_ACCESS',
          [ErrorMessageType.BUSINESS]: 'VALIDATION_FAILED',
          [ErrorMessageType.SYSTEM]: 'DATABASE_ERROR',
          [ErrorMessageType.HTTP]: 'BAD_REQUEST',
        };

        const invalidKey = 'DEFINITELY_INVALID_KEY';

        // Test all valid combinations
        Object.entries(validKeys).forEach(([type, key]) => {
          const message = ErrorMessageUtil.getByType(type as ErrorMessageType, key);
          expect(message).toBeTruthy();
          expect(typeof message).toBe('string');
        });

        // Test all invalid key combinations
        Object.keys(validKeys).forEach(type => {
          const message = ErrorMessageUtil.getByType(type as ErrorMessageType, invalidKey);
          expect(message).toBeTruthy();
          expect(typeof message).toBe('string');
        });
      });

      it('should test edge cases for exists method', () => {
        // Test with various data types
        const testValues = [
          '',
          ' ',
          'null',
          'undefined',
          '0',
          '1',
          'true',
          'false',
        ];

        testValues.forEach(value => {
          const result = ErrorMessageUtil.exists(value);
          expect(typeof result).toBe('boolean');
        });
      });
    });
  });

  describe('Message consistency', () => {
    it('should have consistent message format across categories', () => {
      const allMessages = [
        ...Object.values(AUTH_ERROR_MESSAGES),
        ...Object.values(BUSINESS_ERROR_MESSAGES),
        ...Object.values(SYSTEM_ERROR_MESSAGES),
        ...Object.values(HTTP_ERROR_MESSAGES),
      ];

      allMessages.forEach(message => {
        expect(typeof message).toBe('string');
        expect(message.length).toBeGreaterThan(0);
        expect(message).not.toContain('undefined');
        expect(message).not.toContain('null');
      });
    });

    it('should have unique message keys across the unified collection', () => {
      const keys = Object.keys(ERROR_MESSAGES);
      const uniqueKeys = new Set(keys);
      expect(keys.length).toBe(uniqueKeys.size);
    });

    it('should maintain message integrity after freezing', () => {
      // Verify that all frozen objects still have their expected properties
      expect(Object.isFrozen(AUTH_ERROR_MESSAGES)).toBe(true);
      expect(Object.isFrozen(BUSINESS_ERROR_MESSAGES)).toBe(true);
      expect(Object.isFrozen(SYSTEM_ERROR_MESSAGES)).toBe(true);
      expect(Object.isFrozen(HTTP_ERROR_MESSAGES)).toBe(true);
      expect(Object.isFrozen(ERROR_MESSAGES)).toBe(true);
    });
  });
});