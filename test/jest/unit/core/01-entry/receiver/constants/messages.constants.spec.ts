/**
 * messages.constants.spec.ts
 * 数据接收消息常量单元测试
 * 路径: unit/core/01-entry/receiver/constants/messages.constants.spec.ts
 */

import {
  RECEIVER_ERROR_MESSAGES,
  RECEIVER_WARNING_MESSAGES,
  RECEIVER_SUCCESS_MESSAGES,
} from '@core/01-entry/receiver/constants/messages.constants';

describe('Receiver Messages Constants', () => {
  describe('RECEIVER_ERROR_MESSAGES', () => {
    it('should be frozen object', () => {
      expect(Object.isFrozen(RECEIVER_ERROR_MESSAGES)).toBe(true);
    });

    it('should contain validation error messages', () => {
      expect(RECEIVER_ERROR_MESSAGES.VALIDATION_FAILED).toBe('请求参数验证失败');
      expect(RECEIVER_ERROR_MESSAGES.SYMBOLS_REQUIRED).toBe('股票代码列表不能为空');
      expect(RECEIVER_ERROR_MESSAGES.DATA_TYPE_REQUIRED).toBe('数据类型参数必须为非空字符串');
    });

    it('should contain format validation messages', () => {
      expect(RECEIVER_ERROR_MESSAGES.INVALID_SYMBOL_FORMAT).toContain('股票代码格式无效');
      expect(RECEIVER_ERROR_MESSAGES.INVALID_SYMBOL_FORMAT).toContain('{maxLength}');
      expect(RECEIVER_ERROR_MESSAGES.TOO_MANY_SYMBOLS).toContain('单次请求股票代码数量不能超过');
      expect(RECEIVER_ERROR_MESSAGES.TOO_MANY_SYMBOLS).toContain('{maxCount}');
    });

    it('should contain provider-related error messages', () => {
      expect(RECEIVER_ERROR_MESSAGES.NO_PROVIDER_FOUND).toContain('无法找到支持数据类型');
      expect(RECEIVER_ERROR_MESSAGES.NO_PROVIDER_FOUND).toContain('{receiverType}');
      expect(RECEIVER_ERROR_MESSAGES.NO_PROVIDER_FOUND).toContain('{market}');

      expect(RECEIVER_ERROR_MESSAGES.PROVIDER_NOT_SUPPORT_CAPABILITY).toContain('不支持');
      expect(RECEIVER_ERROR_MESSAGES.PROVIDER_NOT_SUPPORT_CAPABILITY).toContain('{provider}');
      expect(RECEIVER_ERROR_MESSAGES.PROVIDER_NOT_SUPPORT_CAPABILITY).toContain('{capability}');
    });

    it('should contain parameter validation messages', () => {
      expect(RECEIVER_ERROR_MESSAGES.PREFERRED_PROVIDER_INVALID).toBe('首选提供商参数必须为字符串类型');
      expect(RECEIVER_ERROR_MESSAGES.REALTIME_PARAM_INVALID).toBe('实时数据参数必须为布尔类型');
      expect(RECEIVER_ERROR_MESSAGES.FIELDS_PARAM_INVALID).toBe('字段列表参数必须为字符串数组');
      expect(RECEIVER_ERROR_MESSAGES.MARKET_PARAM_INVALID).toBe('市场参数必须为字符串类型');
    });

    it('should contain operation error messages', () => {
      expect(RECEIVER_ERROR_MESSAGES.DATA_FETCHING_FAILED).toContain('数据获取失败');
      expect(RECEIVER_ERROR_MESSAGES.DATA_FETCHING_FAILED).toContain('{error}');

      expect(RECEIVER_ERROR_MESSAGES.SYMBOL_TRANSFORMATION_FAILED).toBe('股票代码转换失败');
      expect(RECEIVER_ERROR_MESSAGES.SOME_SYMBOLS_FAILED_TO_MAP).toContain('部分股票代码转换失败');
      expect(RECEIVER_ERROR_MESSAGES.SOME_SYMBOLS_FAILED_TO_MAP).toContain('{failedSymbols}');
    });

    it('should have all required error message keys', () => {
      const expectedKeys = [
        'VALIDATION_FAILED',
        'SYMBOLS_REQUIRED',
        'DATA_TYPE_REQUIRED',
        'INVALID_SYMBOL_FORMAT',
        'TOO_MANY_SYMBOLS',
        'UNSUPPORTED_DATA_TYPE',
        'PREFERRED_PROVIDER_INVALID',
        'REALTIME_PARAM_INVALID',
        'FIELDS_PARAM_INVALID',
        'MARKET_PARAM_INVALID',
        'NO_PROVIDER_FOUND',
        'PROVIDER_SELECTION_FAILED',
        'PROVIDER_NOT_SUPPORT_CAPABILITY',
        'DATA_FETCHING_FAILED',
        'SYMBOL_TRANSFORMATION_FAILED',
        'SOME_SYMBOLS_FAILED_TO_MAP',
      ];

      expectedKeys.forEach(key => {
        expect(RECEIVER_ERROR_MESSAGES).toHaveProperty(key);
        expect(typeof RECEIVER_ERROR_MESSAGES[key]).toBe('string');
        expect(RECEIVER_ERROR_MESSAGES[key].length).toBeGreaterThan(0);
      });
    });

    it('should support message template interpolation', () => {
      const templatedMessages = [
        'INVALID_SYMBOL_FORMAT',
        'TOO_MANY_SYMBOLS',
        'UNSUPPORTED_DATA_TYPE',
        'NO_PROVIDER_FOUND',
        'PROVIDER_NOT_SUPPORT_CAPABILITY',
        'DATA_FETCHING_FAILED',
        'SOME_SYMBOLS_FAILED_TO_MAP',
      ];

      templatedMessages.forEach(key => {
        const message = RECEIVER_ERROR_MESSAGES[key];
        expect(message).toMatch(/\{[^}]+\}/); // 包含模板变量
      });
    });
  });

  describe('RECEIVER_WARNING_MESSAGES', () => {
    it('should be frozen object', () => {
      expect(Object.isFrozen(RECEIVER_WARNING_MESSAGES)).toBe(true);
    });

    it('should contain data quality warning messages', () => {
      expect(RECEIVER_WARNING_MESSAGES.DUPLICATE_SYMBOLS).toBe('请求中包含重复的股票代码');
      expect(RECEIVER_WARNING_MESSAGES.SYMBOLS_WITH_WHITESPACE).toBe('部分股票代码包含前后空白字符，已自动去除');
    });

    it('should contain provider-related warning messages', () => {
      expect(RECEIVER_WARNING_MESSAGES.PREFERRED_PROVIDER_NOT_SUPPORT).toBe('首选提供商不支持请求的能力');
      expect(RECEIVER_WARNING_MESSAGES.PREFERRED_PROVIDER_NOT_SUPPORT_MARKET).toContain('不支持市场');
      expect(RECEIVER_WARNING_MESSAGES.PREFERRED_PROVIDER_NOT_SUPPORT_MARKET).toContain('{provider}');
      expect(RECEIVER_WARNING_MESSAGES.PREFERRED_PROVIDER_NOT_SUPPORT_MARKET).toContain('{market}');
    });

    it('should contain performance warning messages', () => {
      expect(RECEIVER_WARNING_MESSAGES.SLOW_REQUEST_DETECTED).toBe('检测到慢请求');
      expect(RECEIVER_WARNING_MESSAGES.LARGE_SYMBOL_COUNT).toBe('请求的股票代码数量较多，可能影响性能');
    });

    it('should contain operation warning messages', () => {
      expect(RECEIVER_WARNING_MESSAGES.SYMBOL_TRANSFORMATION_FALLBACK).toBe('股票代码转换失败，使用原始代码');
      expect(RECEIVER_WARNING_MESSAGES.PARTIAL_SUCCESS_DETECTED).toBe('请求部分成功，部分股票代码处理失败');
    });

    it('should have all required warning message keys', () => {
      const expectedKeys = [
        'DUPLICATE_SYMBOLS',
        'SYMBOLS_WITH_WHITESPACE',
        'PREFERRED_PROVIDER_NOT_SUPPORT',
        'PREFERRED_PROVIDER_NOT_SUPPORT_MARKET',
        'SYMBOL_TRANSFORMATION_FALLBACK',
        'SLOW_REQUEST_DETECTED',
        'LARGE_SYMBOL_COUNT',
        'PARTIAL_SUCCESS_DETECTED',
      ];

      expectedKeys.forEach(key => {
        expect(RECEIVER_WARNING_MESSAGES).toHaveProperty(key);
        expect(typeof RECEIVER_WARNING_MESSAGES[key]).toBe('string');
        expect(RECEIVER_WARNING_MESSAGES[key].length).toBeGreaterThan(0);
      });
    });
  });

  describe('RECEIVER_SUCCESS_MESSAGES', () => {
    it('should be frozen object', () => {
      expect(Object.isFrozen(RECEIVER_SUCCESS_MESSAGES)).toBe(true);
    });

    it('should contain request processing success messages', () => {
      expect(RECEIVER_SUCCESS_MESSAGES.REQUEST_PROCESSED).toBe('数据请求处理成功');
      expect(RECEIVER_SUCCESS_MESSAGES.REQUEST_PARTIALLY_PROCESSED).toBe('数据请求部分处理成功');
    });

    it('should contain provider selection success messages', () => {
      expect(RECEIVER_SUCCESS_MESSAGES.PROVIDER_SELECTED).toBe('自动选择最优提供商');
      expect(RECEIVER_SUCCESS_MESSAGES.PREFERRED_PROVIDER_USED).toBe('使用首选提供商');
    });

    it('should contain operation success messages', () => {
      expect(RECEIVER_SUCCESS_MESSAGES.SYMBOLS_TRANSFORMED).toBe('股票代码转换完成');
      expect(RECEIVER_SUCCESS_MESSAGES.DATA_FETCHED).toBe('数据获取成功');
      expect(RECEIVER_SUCCESS_MESSAGES.VALIDATION_PASSED).toBe('请求参数验证通过');
    });

    it('should have all required success message keys', () => {
      const expectedKeys = [
        'REQUEST_PROCESSED',
        'REQUEST_PARTIALLY_PROCESSED',
        'PROVIDER_SELECTED',
        'PREFERRED_PROVIDER_USED',
        'SYMBOLS_TRANSFORMED',
        'DATA_FETCHED',
        'VALIDATION_PASSED',
      ];

      expectedKeys.forEach(key => {
        expect(RECEIVER_SUCCESS_MESSAGES).toHaveProperty(key);
        expect(typeof RECEIVER_SUCCESS_MESSAGES[key]).toBe('string');
        expect(RECEIVER_SUCCESS_MESSAGES[key].length).toBeGreaterThan(0);
      });
    });
  });

  describe('Message Constants Integration', () => {
    it('should not have overlapping keys between error and warning messages', () => {
      const errorKeys = Object.keys(RECEIVER_ERROR_MESSAGES);
      const warningKeys = Object.keys(RECEIVER_WARNING_MESSAGES);

      const overlap = errorKeys.filter(key => warningKeys.includes(key));
      expect(overlap).toHaveLength(0);
    });

    it('should not have overlapping keys between error and success messages', () => {
      const errorKeys = Object.keys(RECEIVER_ERROR_MESSAGES);
      const successKeys = Object.keys(RECEIVER_SUCCESS_MESSAGES);

      const overlap = errorKeys.filter(key => successKeys.includes(key));
      expect(overlap).toHaveLength(0);
    });

    it('should not have overlapping keys between warning and success messages', () => {
      const warningKeys = Object.keys(RECEIVER_WARNING_MESSAGES);
      const successKeys = Object.keys(RECEIVER_SUCCESS_MESSAGES);

      const overlap = warningKeys.filter(key => successKeys.includes(key));
      expect(overlap).toHaveLength(0);
    });

    it('should have consistent message format', () => {
      const allMessages = [
        ...Object.values(RECEIVER_ERROR_MESSAGES),
        ...Object.values(RECEIVER_WARNING_MESSAGES),
        ...Object.values(RECEIVER_SUCCESS_MESSAGES),
      ];

      allMessages.forEach(message => {
        expect(typeof message).toBe('string');
        expect(message.length).toBeGreaterThan(0);
        expect(message.trim()).toBe(message); // 没有前后空白
      });
    });

    it('should follow Chinese language convention', () => {
      const allMessages = [
        ...Object.values(RECEIVER_ERROR_MESSAGES),
        ...Object.values(RECEIVER_WARNING_MESSAGES),
        ...Object.values(RECEIVER_SUCCESS_MESSAGES),
      ];

      allMessages.forEach(message => {
        // 检查中文字符
        expect(message).toMatch(/[\u4e00-\u9fff]/);
      });
    });
  });
});
