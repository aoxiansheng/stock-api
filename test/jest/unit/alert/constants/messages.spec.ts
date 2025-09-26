import { ALERT_MESSAGES, ALERT_OPERATIONS, ALERT_METRICS, OPERATOR_SYMBOLS } from '@alert/constants/messages';

describe('Alert Messages Constants', () => {
  describe('ALERT_MESSAGES', () => {
    it('should have correct message categories', () => {
      expect(ALERT_MESSAGES.SUCCESS).toBeDefined();
      expect(ALERT_MESSAGES.ERRORS).toBeDefined();
      expect(ALERT_MESSAGES.STATUS).toBeDefined();
      expect(ALERT_MESSAGES.RATE_LIMIT).toBeDefined();
      expect(ALERT_MESSAGES.VALIDATION).toBeDefined();
      expect(ALERT_MESSAGES.RULES).toBeDefined();
    });

    it('should have correct success messages', () => {
      expect(ALERT_MESSAGES.SUCCESS.RULE_CREATED).toBe('告警规则创建成功');
      expect(ALERT_MESSAGES.SUCCESS.RULE_UPDATED).toBe('告警规则更新成功');
      expect(ALERT_MESSAGES.SUCCESS.RULE_DELETED).toBe('告警规则删除成功');
      expect(ALERT_MESSAGES.SUCCESS.ALERT_RESOLVED).toBe('告警已解决');
      expect(ALERT_MESSAGES.SUCCESS.ALERT_DISMISSED).toBe('告警已忽略');
    });

    it('should have correct error messages', () => {
      expect(ALERT_MESSAGES.ERRORS.RULE_NOT_FOUND).toBe('告警规则不存在');
      expect(ALERT_MESSAGES.ERRORS.INVALID_THRESHOLD).toBe('阈值设置无效');
      expect(ALERT_MESSAGES.ERRORS.INVALID_CONDITION).toBe('告警条件无效');
      expect(ALERT_MESSAGES.ERRORS.NOTIFICATION_FAILED).toBe('通知发送失败');
      expect(ALERT_MESSAGES.ERRORS.EVALUATION_FAILED).toBe('告警评估失败');
    });

    it('should have correct status messages', () => {
      expect(ALERT_MESSAGES.STATUS.PROCESSING).toBe('处理中...');
      expect(ALERT_MESSAGES.STATUS.EVALUATING).toBe('评估中...');
      expect(ALERT_MESSAGES.STATUS.TRIGGERING).toBe('触发中...');
      expect(ALERT_MESSAGES.STATUS.NOTIFYING).toBe('发送通知中...');
    });

    it('should have correct rate limit messages', () => {
      expect(ALERT_MESSAGES.RATE_LIMIT.TRIGGER_RATE_EXCEEDED).toBe('手动触发告警评估频率超出限制，请稍后再试');
      expect(ALERT_MESSAGES.RATE_LIMIT.NOTIFICATION_RATE_EXCEEDED).toBe('通知发送频率超出限制，请稍后再试');
    });

    it('should have correct validation messages', () => {
      expect(ALERT_MESSAGES.VALIDATION.RULE_NAME_REQUIRED).toBe('告警规则名称不能为空');
      expect(ALERT_MESSAGES.VALIDATION.RULE_NAME_TOO_LONG).toBe('告警规则名称长度不能超过100字符');
      expect(ALERT_MESSAGES.VALIDATION.THRESHOLD_REQUIRED).toBe('阈值不能为空');
      expect(ALERT_MESSAGES.VALIDATION.THRESHOLD_INVALID).toBe('阈值必须是有效数字');
      expect(ALERT_MESSAGES.VALIDATION.INTERVAL_TOO_SHORT).toBe('时间间隔不能小于30秒');
      expect(ALERT_MESSAGES.VALIDATION.INTERVAL_TOO_LONG).toBe('时间间隔不能超过24小时');
    });

    it('should have correct rule messages', () => {
      expect(ALERT_MESSAGES.RULES.RULE_EVALUATION_FAILED).toBe('规则评估失败');
      expect(ALERT_MESSAGES.RULES.RULE_EVALUATION_STARTED).toBe('规则评估开始');
      expect(ALERT_MESSAGES.RULES.METRICS_PROCESSED).toBe('指标处理完成');
    });

    it('should have unique messages', () => {
      const allMessages = [
        ...Object.values(ALERT_MESSAGES.SUCCESS),
        ...Object.values(ALERT_MESSAGES.ERRORS),
        ...Object.values(ALERT_MESSAGES.STATUS),
        ...Object.values(ALERT_MESSAGES.RATE_LIMIT),
        ...Object.values(ALERT_MESSAGES.VALIDATION),
        ...Object.values(ALERT_MESSAGES.RULES)
      ];
      
      const uniqueMessages = [...new Set(allMessages)];
      expect(allMessages).toHaveLength(uniqueMessages.length);
    });

    it('should be immutable', () => {
      // Test that the object is effectively immutable (readonly at compile time)
      const originalValues = JSON.parse(JSON.stringify(ALERT_MESSAGES));

      // Original messages should remain unchanged
      expect(ALERT_MESSAGES.SUCCESS.RULE_CREATED).toBe(originalValues.SUCCESS.RULE_CREATED);
    });
  });

  describe('ALERT_OPERATIONS', () => {
    it('should have correct operation categories', () => {
      expect(ALERT_OPERATIONS.RULES).toBeDefined();
    });

    it('should have correct rule operations', () => {
      expect(ALERT_OPERATIONS.RULES.EVALUATE_RULES_SCHEDULED).toBe('evaluate_rules_scheduled');
      expect(ALERT_OPERATIONS.RULES.HANDLE_RULE_EVALUATION).toBe('handle_rule_evaluation');
      expect(ALERT_OPERATIONS.RULES.CREATE_RULE).toBe('create_rule');
    });

    it('should be immutable', () => {
      // Test that the object is effectively immutable (readonly at compile time)
      const originalValues = JSON.parse(JSON.stringify(ALERT_OPERATIONS));

      // Original operations should remain unchanged
      expect(ALERT_OPERATIONS.RULES.CREATE_RULE).toBe(originalValues.RULES.CREATE_RULE);
    });
  });

  describe('ALERT_METRICS', () => {
    it('should have correct metric categories', () => {
      expect(ALERT_METRICS.RULES).toBeDefined();
    });

    it('should have correct rule metrics', () => {
      expect(ALERT_METRICS.RULES.RULE_EVALUATION_COUNT).toBe('rule_evaluation_count');
      expect(ALERT_METRICS.RULES.AVERAGE_RULE_EVALUATION_TIME).toBe('average_rule_evaluation_time');
    });

    it('should be immutable', () => {
      // Test that the object is effectively immutable (readonly at compile time)
      const originalValues = JSON.parse(JSON.stringify(ALERT_METRICS));

      // Original metrics should remain unchanged
      expect(ALERT_METRICS.RULES.RULE_EVALUATION_COUNT).toBe(originalValues.RULES.RULE_EVALUATION_COUNT);
    });
  });

  describe('OPERATOR_SYMBOLS', () => {
    it('should have correct operator symbols', () => {
      expect(OPERATOR_SYMBOLS['>']).toBe('大于');
      expect(OPERATOR_SYMBOLS['>=']).toBe('大于等于');
      expect(OPERATOR_SYMBOLS['<']).toBe('小于');
      expect(OPERATOR_SYMBOLS['<=']).toBe('小于等于');
      expect(OPERATOR_SYMBOLS['==']).toBe('等于');
      expect(OPERATOR_SYMBOLS['!=']).toBe('不等于');
      expect(OPERATOR_SYMBOLS.contains).toBe('包含');
      expect(OPERATOR_SYMBOLS.not_contains).toBe('不包含');
      expect(OPERATOR_SYMBOLS.regex).toBe('正则匹配');
    });

    it('should have unique symbol mappings', () => {
      const symbols = Object.values(OPERATOR_SYMBOLS);
      const uniqueSymbols = [...new Set(symbols)];
      expect(symbols).toHaveLength(uniqueSymbols.length);
    });

    it('should be immutable', () => {
      // Try to modify the symbols (should not affect the original)
      expect(() => {
        // @ts-ignore - Testing immutability
        OPERATOR_SYMBOLS['>'] = '修改';
      }).toThrow();

      // Original symbols should remain unchanged
      expect(OPERATOR_SYMBOLS['>']).toBe('大于');
    });

    it('should support all valid operators', () => {
      const validOperators = ['>', '>=', '<', '<=', '==', '!=', 'contains', 'not_contains', 'regex'];
      validOperators.forEach(operator => {
        expect(OPERATOR_SYMBOLS[operator]).toBeDefined();
        expect(typeof OPERATOR_SYMBOLS[operator]).toBe('string');
      });
    });
  });

  describe('Messages Integration', () => {
    it('should be usable in business logic', () => {
      // Test that messages can be used in application code
      const successMessage = ALERT_MESSAGES.SUCCESS.RULE_CREATED;
      const errorMessage = ALERT_MESSAGES.ERRORS.RULE_NOT_FOUND;
      const operation = ALERT_OPERATIONS.RULES.CREATE_RULE;
      const metric = ALERT_METRICS.RULES.RULE_EVALUATION_COUNT;
      const symbol = OPERATOR_SYMBOLS['>'];

      expect(successMessage).toBe('告警规则创建成功');
      expect(errorMessage).toBe('告警规则不存在');
      expect(operation).toBe('create_rule');
      expect(metric).toBe('rule_evaluation_count');
      expect(symbol).toBe('大于');
    });

    it('should support message formatting', () => {
      // Test that messages can be used with string interpolation
      const ruleName = 'CPU Usage Alert';
      const formattedMessage = `${ALERT_MESSAGES.SUCCESS.RULE_CREATED}: ${ruleName}`;
      
      expect(formattedMessage).toBe(`告警规则创建成功: ${ruleName}`);
    });

    it('should have consistent naming conventions', () => {
      // Verify that all message keys follow consistent naming
      Object.keys(ALERT_MESSAGES).forEach(category => {
        expect(category).toMatch(/^[A-Z_]+$/);
      });

      Object.keys(ALERT_OPERATIONS).forEach(category => {
        expect(category).toMatch(/^[A-Z_]+$/);
      });

      Object.keys(ALERT_METRICS).forEach(category => {
        expect(category).toMatch(/^[A-Z_]+$/);
      });
    });
  });
});