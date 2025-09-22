/**
 * 标签净化功能独立测试
 * 测试高基数标签修复的核心逻辑
 */

describe('标签净化功能测试', () => {
  // 模拟SymbolMapperService的标签净化方法
  class TagSanitizer {
    sanitizeEventTags(tags: Record<string, any>): Record<string, string> {
      const sanitized: Record<string, string> = {};

      // ✅ 保留低基数标签
      const allowedTags = [
        'operation', 'status', 'service', 'collection',
        'conflict', 'errorType', 'architecture'
      ];

      allowedTags.forEach(key => {
        if (tags[key] !== undefined) {
          sanitized[key] = String(tags[key]);
        }
      });

      // 🔧 转换高基数标签为计数标签
      if (tags.rulesCount !== undefined) {
        const count = Number(tags.rulesCount) || 0;
        sanitized.rules_batch_size = count <= 10 ? 'small' : count <= 50 ? 'medium' : 'large';
      }

      if (tags.resultCount !== undefined) {
        sanitized.has_results = Number(tags.resultCount) > 0 ? 'true' : 'false';
      }

      if (tags.totalRules !== undefined) {
        const total = Number(tags.totalRules) || 0;
        sanitized.total_rules_range = total <= 20 ? 'low' : total <= 100 ? 'medium' : 'high';
      }

      // 🔧 错误消息归类
      if (tags.error && typeof tags.error === 'string') {
        sanitized.error_category = this.categorizeError(tags.error);
      }

      // 🔧 符号类型归类
      if (tags.standardSymbol && typeof tags.standardSymbol === 'string') {
        sanitized.symbol_type = this.categorizeSymbol(tags.standardSymbol);
      }

      return sanitized;
    }

    categorizeError(errorMessage: string): string {
      const lowerError = errorMessage.toLowerCase();

      if (lowerError.includes('not found') || lowerError.includes('不存在')) {
        return 'not_found';
      }
      if (lowerError.includes('duplicate') || lowerError.includes('已存在')) {
        return 'duplicate';
      }
      if (lowerError.includes('validation') || lowerError.includes('invalid')) {
        return 'validation';
      }
      if (lowerError.includes('timeout') || lowerError.includes('超时')) {
        return 'timeout';
      }
      if (lowerError.includes('permission') || lowerError.includes('unauthorized')) {
        return 'permission';
      }
      return 'unknown';
    }

    categorizeSymbol(symbol: string): string {
      // 港股格式: 数字.HK
      if (/^\d+\.HK$/i.test(symbol)) {
        return 'hk_stock';
      }
      // 美股格式: 字母组合
      if (/^[A-Z]{1,5}$/.test(symbol)) {
        return 'us_stock';
      }
      // A股格式: 6位数字
      if (/^\d{6}$/.test(symbol)) {
        return 'cn_stock';
      }
      // 指数或其他
      if (symbol.includes('INDEX') || symbol.includes('指数')) {
        return 'index';
      }
      return 'other';
    }
  }

  let sanitizer: TagSanitizer;

  beforeEach(() => {
    sanitizer = new TagSanitizer();
  });

  describe('🔧 高基数标签移除', () => {
    it('应该移除MongoDB ObjectId', () => {
      const input = {
        operation: 'test',
        id: '507f1f77bcf86cd799439011', // 高基数，应该移除
        status: 'success',
      };

      const result = sanitizer.sanitizeEventTags(input);

      expect(result).toEqual({
        operation: 'test',
        status: 'success',
      });
      expect(result).not.toHaveProperty('id');
    });

    it('应该移除具体的符号值', () => {
      const input = {
        operation: 'mapping_retrieved',
        standardSymbol: '00700.HK', // 高基数，应该转换
        sdkSymbol: 'TENCENT_HK',    // 高基数，应该移除
      };

      const result = sanitizer.sanitizeEventTags(input);

      expect(result).toEqual({
        operation: 'mapping_retrieved',
        symbol_type: 'hk_stock', // 转换后的类型
      });
      expect(result).not.toHaveProperty('standardSymbol');
      expect(result).not.toHaveProperty('sdkSymbol');
    });

    it('应该移除动态错误消息', () => {
      const input = {
        operation: 'error_handling',
        error: 'Failed to connect to database at 192.168.1.100:27017', // 高基数
        errorType: 'DatabaseConnectionError', // 低基数，保留
      };

      const result = sanitizer.sanitizeEventTags(input);

      expect(result).toEqual({
        operation: 'error_handling',
        errorType: 'DatabaseConnectionError',
        error_category: 'unknown', // 转换后的错误类别
      });
      expect(result).not.toHaveProperty('error');
    });
  });

  describe('🔧 数值标签分类转换', () => {
    it('应该将规则数量转换为批次大小分类', () => {
      const testCases = [
        { rulesCount: 5, expected: 'small' },
        { rulesCount: 25, expected: 'medium' },
        { rulesCount: 100, expected: 'large' },
        { rulesCount: 0, expected: 'small' },
      ];

      testCases.forEach(({ rulesCount, expected }) => {
        const result = sanitizer.sanitizeEventTags({ rulesCount });
        expect(result.rules_batch_size).toBe(expected);
        expect(result).not.toHaveProperty('rulesCount');
      });
    });

    it('应该将结果数量转换为布尔值', () => {
      const testCases = [
        { resultCount: 0, expected: 'false' },
        { resultCount: 1, expected: 'true' },
        { resultCount: 50, expected: 'true' },
      ];

      testCases.forEach(({ resultCount, expected }) => {
        const result = sanitizer.sanitizeEventTags({ resultCount });
        expect(result.has_results).toBe(expected);
        expect(result).not.toHaveProperty('resultCount');
      });
    });

    it('应该将总规则数转换为范围分类', () => {
      const testCases = [
        { totalRules: 10, expected: 'low' },
        { totalRules: 50, expected: 'medium' },
        { totalRules: 200, expected: 'high' },
      ];

      testCases.forEach(({ totalRules, expected }) => {
        const result = sanitizer.sanitizeEventTags({ totalRules });
        expect(result.total_rules_range).toBe(expected);
        expect(result).not.toHaveProperty('totalRules');
      });
    });
  });

  describe('🔧 错误消息分类', () => {
    it('应该正确分类各种错误消息', () => {
      const testCases = [
        { error: 'User not found', expected: 'not_found' },
        { error: '资源不存在', expected: 'not_found' },
        { error: 'Duplicate key error', expected: 'duplicate' },
        { error: '映射已存在', expected: 'duplicate' },
        { error: 'Validation failed', expected: 'validation' },
        { error: 'Invalid format', expected: 'validation' },
        { error: 'Connection timeout', expected: 'timeout' },
        { error: '请求超时', expected: 'timeout' },
        { error: 'Permission denied', expected: 'permission' },
        { error: 'Unauthorized access', expected: 'permission' },
        { error: 'Random error message', expected: 'unknown' },
      ];

      testCases.forEach(({ error, expected }) => {
        const category = sanitizer.categorizeError(error);
        expect(category).toBe(expected);
      });
    });
  });

  describe('🔧 股票代码分类', () => {
    it('应该正确识别港股代码', () => {
      const hkStocks = ['00700.HK', '09988.hk', '01234.HK'];
      hkStocks.forEach(symbol => {
        expect(sanitizer.categorizeSymbol(symbol)).toBe('hk_stock');
      });
    });

    it('应该正确识别美股代码', () => {
      const usStocks = ['AAPL', 'GOOGL', 'MSFT', 'AMZN', 'TSLA'];
      usStocks.forEach(symbol => {
        expect(sanitizer.categorizeSymbol(symbol)).toBe('us_stock');
      });
    });

    it('应该正确识别A股代码', () => {
      const cnStocks = ['000001', '399006', '600519', '000858'];
      cnStocks.forEach(symbol => {
        expect(sanitizer.categorizeSymbol(symbol)).toBe('cn_stock');
      });
    });

    it('应该正确识别指数代码', () => {
      const indices = ['SPY_INDEX', '沪深300指数', 'NASDAQ_INDEX'];
      indices.forEach(symbol => {
        expect(sanitizer.categorizeSymbol(symbol)).toBe('index');
      });
    });

    it('应该将未知格式标记为other', () => {
      const others = ['UNKNOWN_FORMAT', '12345', 'TEST.ABC'];
      others.forEach(symbol => {
        expect(sanitizer.categorizeSymbol(symbol)).toBe('other');
      });
    });
  });

  describe('🔧 综合标签净化测试', () => {
    it('应该完整处理复杂的标签组合', () => {
      const input = {
        // 保留的低基数标签
        operation: 'create_mapping',
        status: 'success',
        service: 'SymbolMapperService',
        collection: 'symbolMappings',
        errorType: 'ValidationError',

        // 应该转换的高基数标签
        standardSymbol: '00700.HK',
        error: 'Document not found in collection',
        rulesCount: 25,
        resultCount: 3,
        totalRules: 150,

        // 应该移除的标签
        id: '507f1f77bcf86cd799439011',
        sessionId: 'sess_12345',
        requestId: 'req_abcdef',
        timestamp: '2024-01-22T10:30:00Z',
      };

      const result = sanitizer.sanitizeEventTags(input);

      // 验证保留的标签
      expect(result).toMatchObject({
        operation: 'create_mapping',
        status: 'success',
        service: 'SymbolMapperService',
        collection: 'symbolMappings',
        errorType: 'ValidationError',
      });

      // 验证转换的标签
      expect(result).toMatchObject({
        symbol_type: 'hk_stock',
        error_category: 'not_found',
        rules_batch_size: 'medium',
        has_results: 'true',
        total_rules_range: 'high',
      });

      // 验证移除的标签
      expect(result).not.toHaveProperty('id');
      expect(result).not.toHaveProperty('standardSymbol');
      expect(result).not.toHaveProperty('error');
      expect(result).not.toHaveProperty('rulesCount');
      expect(result).not.toHaveProperty('resultCount');
      expect(result).not.toHaveProperty('totalRules');
      expect(result).not.toHaveProperty('sessionId');
      expect(result).not.toHaveProperty('requestId');
      expect(result).not.toHaveProperty('timestamp');
    });

    it('应该处理空标签对象', () => {
      const result = sanitizer.sanitizeEventTags({});
      expect(result).toEqual({});
    });

    it('应该处理undefined和null值', () => {
      const input = {
        operation: 'test',
        undefinedField: undefined,
        nullField: null,
        emptyString: '',
        zeroValue: 0,
      };

      const result = sanitizer.sanitizeEventTags(input);

      expect(result).toEqual({
        operation: 'test',
        // undefined和null字段被忽略
        // 空字符串和0被保留（如果在allowedTags中）
      });
    });
  });

  describe('📊 性能基准测试', () => {
    it('标签净化应该高效执行', () => {
      const input = {
        operation: 'performance_test',
        status: 'success',
        standardSymbol: '00700.HK',
        error: 'Some error message for testing',
        rulesCount: 25,
        id: '507f1f77bcf86cd799439011',
      };

      const iterations = 1000;
      const startTime = Date.now();

      for (let i = 0; i < iterations; i++) {
        sanitizer.sanitizeEventTags(input);
      }

      const duration = Date.now() - startTime;
      const avgTimePerOperation = duration / iterations;

      // 每次操作应该在1ms以内完成
      expect(avgTimePerOperation).toBeLessThan(1);

      console.log(`✅ 标签净化性能: ${iterations}次操作耗时${duration}ms, 平均${avgTimePerOperation.toFixed(3)}ms/次`);
    });
  });
});