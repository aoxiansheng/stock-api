import {
  ALERTING_OPERATIONS,
  ALERTING_MESSAGES,
  ALERTING_ERROR_TEMPLATES,
  ALERTING_CONFIG,
  ALERTING_DEFAULT_STATS,
  ALERTING_SEVERITY_LEVELS,
  ALERTING_METRICS,
  ALERTING_CACHE_PATTERNS,
  ALERTING_VALIDATION_RULES,
  ALERTING_TIME_CONFIG,
  ALERTING_THRESHOLDS,
  ALERTING_RETRY_CONFIG,
  AlertingTemplateUtil,
} from '../../../../../src/alert/constants/alerting.constants';

describe('Alerting Constants', () => {
  describe('ALERTING_OPERATIONS', () => {
    it('应包含所有必需的操作常量', () => {
      expect(ALERTING_OPERATIONS.CREATE_RULE).toBe('createRule');
      expect(ALERTING_OPERATIONS.UPDATE_RULE).toBe('updateRule');
      expect(ALERTING_OPERATIONS.DELETE_RULE).toBe('deleteRule');
      expect(ALERTING_OPERATIONS.GET_RULES).toBe('getRules');
      expect(ALERTING_OPERATIONS.GET_RULE_BY_ID).toBe('getRuleById');
      expect(ALERTING_OPERATIONS.TOGGLE_RULE).toBe('toggleRule');
      expect(ALERTING_OPERATIONS.PROCESS_METRICS).toBe('processMetrics');
      expect(ALERTING_OPERATIONS.ACKNOWLEDGE_ALERT).toBe('acknowledgeAlert');
      expect(ALERTING_OPERATIONS.RESOLVE_ALERT).toBe('resolveAlert');
      expect(ALERTING_OPERATIONS.GET_STATS).toBe('getStats');
      expect(ALERTING_OPERATIONS.HANDLE_SYSTEM_EVENT).toBe('handleSystemEvent');
      expect(ALERTING_OPERATIONS.EVALUATE_RULES_SCHEDULED).toBe('evaluateRulesScheduled');
      expect(ALERTING_OPERATIONS.CREATE_NEW_ALERT).toBe('createNewAlert');
      expect(ALERTING_OPERATIONS.LOAD_ACTIVE_ALERTS).toBe('loadActiveAlerts');
      expect(ALERTING_OPERATIONS.HANDLE_RULE_EVALUATION).toBe('handleRuleEvaluation');
      expect(ALERTING_OPERATIONS.CONVERT_EVENT_TO_METRIC).toBe('convertEventToMetric');
      expect(ALERTING_OPERATIONS.GENERATE_RULE_ID).toBe('generateRuleId');
    });

    it('应是不可变对象', () => {
      expect(Object.isFrozen(ALERTING_OPERATIONS)).toBe(true);
    });
  });

  describe('ALERTING_MESSAGES', () => {
    it('应包含所有成功消息', () => {
      expect(ALERTING_MESSAGES.SERVICE_INITIALIZED).toBe('告警服务初始化...');
      expect(ALERTING_MESSAGES.RULE_CREATED).toBe('告警规则创建成功');
      expect(ALERTING_MESSAGES.RULE_UPDATED).toBe('告警规则更新成功');
      expect(ALERTING_MESSAGES.RULE_DELETED).toBe('告警规则删除成功');
      expect(ALERTING_MESSAGES.RULE_STATUS_TOGGLED).toBe('切换告警规则状态成功');
      expect(ALERTING_MESSAGES.ALERT_ACKNOWLEDGED).toBe('告警已确认');
      expect(ALERTING_MESSAGES.ALERT_RESOLVED).toBe('告警已解决');
    });

    it('应包含所有错误消息', () => {
      expect(ALERTING_MESSAGES.INITIALIZATION_FAILED).toBe('初始化加载活跃告警失败');
      expect(ALERTING_MESSAGES.CREATE_RULE_DB_FAILED).toBe('创建告警规则数据库操作失败');
      expect(ALERTING_MESSAGES.UPDATE_RULE_FAILED).toBe('更新告警规则失败');
      expect(ALERTING_MESSAGES.DELETE_RULE_FAILED).toBe('删除告警规则失败');
    });

    it('应是不可变对象', () => {
      expect(Object.isFrozen(ALERTING_MESSAGES)).toBe(true);
    });
  });

  describe('ALERTING_CONFIG', () => {
    it('应包含正确的配置值', () => {
      expect(ALERTING_CONFIG.RULE_ID_PREFIX).toBe('rule_');
      expect(ALERTING_CONFIG.RULE_ID_TIMESTAMP_BASE).toBe(36);
      expect(ALERTING_CONFIG.RULE_ID_RANDOM_LENGTH).toBe(6);
      expect(ALERTING_CONFIG.RULE_ID_RANDOM_START).toBe(2);
      expect(ALERTING_CONFIG.DEFAULT_COOLDOWN_SECONDS).toBe(300);
      expect(ALERTING_CONFIG.MAX_RULE_NAME_LENGTH).toBe(100);
      expect(ALERTING_CONFIG.MAX_RULE_DESCRIPTION_LENGTH).toBe(500);
      expect(ALERTING_CONFIG.MAX_TAGS_COUNT).toBe(10);
      expect(ALERTING_CONFIG.MAX_TAG_LENGTH).toBe(50);
    });

    it('应是不可变对象', () => {
      expect(Object.isFrozen(ALERTING_CONFIG)).toBe(true);
    });
  });

  describe('ALERTING_SEVERITY_LEVELS', () => {
    it('应包含所有严重程度级别', () => {
      expect(ALERTING_SEVERITY_LEVELS.CRITICAL).toBe('critical');
      expect(ALERTING_SEVERITY_LEVELS.HIGH).toBe('high');
      expect(ALERTING_SEVERITY_LEVELS.MEDIUM).toBe('medium');
      expect(ALERTING_SEVERITY_LEVELS.LOW).toBe('low');
      expect(ALERTING_SEVERITY_LEVELS.INFO).toBe('info');
    });

    it('应是不可变对象', () => {
      expect(Object.isFrozen(ALERTING_SEVERITY_LEVELS)).toBe(true);
    });
  });

  describe('ALERTING_VALIDATION_RULES', () => {
    it('应包含正确的验证模式', () => {
      expect(ALERTING_VALIDATION_RULES.RULE_NAME_PATTERN).toBeInstanceOf(RegExp);
      expect(ALERTING_VALIDATION_RULES.RULE_ID_PATTERN).toBeInstanceOf(RegExp);
      expect(ALERTING_VALIDATION_RULES.METRIC_NAME_PATTERN).toBeInstanceOf(RegExp);
      expect(ALERTING_VALIDATION_RULES.TAG_PATTERN).toBeInstanceOf(RegExp);
      expect(ALERTING_VALIDATION_RULES.THRESHOLD_MIN).toBe(0);
      expect(ALERTING_VALIDATION_RULES.THRESHOLD_MAX).toBe(Number.MAX_SAFE_INTEGER);
    });

    it('应是不可变对象', () => {
      expect(Object.isFrozen(ALERTING_VALIDATION_RULES)).toBe(true);
    });
  });

  describe('AlertingTemplateUtil', () => {
    describe('replaceErrorTemplate', () => {
      it('应正确替换模板中的占位符', () => {
        const template = '规则 {ruleId} 操作失败: {operation}';
        const params = { ruleId: 'rule_123', operation: 'create' };
        const result = AlertingTemplateUtil.replaceErrorTemplate(template, params);
        expect(result).toBe('规则 rule_123 操作失败: create');
      });

      it('应处理数组参数', () => {
        const template = '验证失败: {errors}';
        const params = { errors: ['字段必填', '格式不正确', '长度超限'] };
        const result = AlertingTemplateUtil.replaceErrorTemplate(template, params);
        expect(result).toBe('验证失败: 字段必填, 格式不正确, 长度超限');
      });

      it('应保留未找到的占位符', () => {
        const template = '规则 {ruleId} 操作失败: {operation}';
        const params = { ruleId: 'rule_123' };
        const result = AlertingTemplateUtil.replaceErrorTemplate(template, params);
        expect(result).toBe('规则 rule_123 操作失败: {operation}');
      });

      it('应处理undefined和null值', () => {
        const template = '值: {value}, 空值: {nullValue}';
        const params = { value: undefined, nullValue: null };
        const result = AlertingTemplateUtil.replaceErrorTemplate(template, params);
        expect(result).toBe('值: {value}, 空值: null');
      });

      it('应将非字符串值转换为字符串', () => {
        const template = '数字: {number}, 布尔: {boolean}';
        const params = { number: 123, boolean: true };
        const result = AlertingTemplateUtil.replaceErrorTemplate(template, params);
        expect(result).toBe('数字: 123, 布尔: true');
      });
    });

    describe('generateErrorMessage', () => {
      it('应生成规则未找到错误消息', () => {
        const result = AlertingTemplateUtil.generateErrorMessage('RULE_NOT_FOUND', { ruleId: 'rule_123' });
        expect(result).toBe('未找到ID为 rule_123 的规则');
      });

      it('应生成规则验证失败消息', () => {
        const result = AlertingTemplateUtil.generateErrorMessage('RULE_VALIDATION_FAILED', { 
          errors: ['名称不能为空', '阈值无效'] 
        });
        expect(result).toBe('规则验证失败: 名称不能为空, 阈值无效');
      });

      it('应生成告警未找到确认消息', () => {
        const result = AlertingTemplateUtil.generateErrorMessage('ALERT_NOT_FOUND_FOR_ACK', { 
          alertId: 'alert_456' 
        });
        expect(result).toBe('未找到ID为 alert_456 的告警进行确认');
      });

      it('应生成告警未找到解决消息', () => {
        const result = AlertingTemplateUtil.generateErrorMessage('ALERT_NOT_FOUND_FOR_RESOLVE', { 
          alertId: 'alert_789' 
        });
        expect(result).toBe('未找到ID为 alert_789 的告警进行解决');
      });

      it('应生成规则操作失败消息', () => {
        const result = AlertingTemplateUtil.generateErrorMessage('RULE_OPERATION_FAILED', { 
          operation: 'update',
          ruleId: 'rule_abc'
        });
        expect(result).toBe('规则操作失败: update，规则ID: rule_abc');
      });

      it('应生成告警操作失败消息', () => {
        const result = AlertingTemplateUtil.generateErrorMessage('ALERT_OPERATION_FAILED', { 
          operation: 'acknowledge',
          alertId: 'alert_def'
        });
        expect(result).toBe('告警操作失败: acknowledge，告警ID: alert_def');
      });

      it('应生成指标处理错误消息', () => {
        const result = AlertingTemplateUtil.generateErrorMessage('METRIC_PROCESSING_ERROR', { 
          metric: 'cpu_usage',
          error: 'Connection timeout'
        });
        expect(result).toBe('处理指标 cpu_usage 时发生错误: Connection timeout');
      });

      it('应生成缓存操作失败消息', () => {
        const result = AlertingTemplateUtil.generateErrorMessage('CACHE_OPERATION_FAILED', { 
          operation: 'set',
          key: 'alert:rule:123'
        });
        expect(result).toBe('缓存操作失败: set，键: alert:rule:123');
      });
    });

    describe('generateRuleId', () => {
      it('应生成符合格式的规则ID', () => {
        const ruleId = AlertingTemplateUtil.generateRuleId();
        expect(typeof ruleId).toBe('string');
        expect(ruleId).toMatch(/^rule_[a-z0-9]+_[a-z0-9]{6}$/);
        expect(ruleId.startsWith('rule_')).toBe(true);
      });

      it('应生成唯一的规则ID', () => {
        const ids = new Set();
        for (let i = 0; i < 100; i++) {
          const id = AlertingTemplateUtil.generateRuleId();
          expect(ids.has(id)).toBe(false);
          ids.add(id);
        }
      });

      it('生成的ID应通过验证', () => {
        const ruleId = AlertingTemplateUtil.generateRuleId();
        expect(AlertingTemplateUtil.isValidRuleId(ruleId)).toBe(true);
      });
    });

    describe('isValidRuleName', () => {
      it('应接受有效的规则名称', () => {
        expect(AlertingTemplateUtil.isValidRuleName('CPU使用率告警')).toBe(true);
        expect(AlertingTemplateUtil.isValidRuleName('Memory Alert')).toBe(true);
        expect(AlertingTemplateUtil.isValidRuleName('Database-Connection_Alert.v1')).toBe(true);
        expect(AlertingTemplateUtil.isValidRuleName('告警123')).toBe(true);
      });

      it('应拒绝无效的规则名称', () => {
        expect(AlertingTemplateUtil.isValidRuleName('')).toBe(false);
        expect(AlertingTemplateUtil.isValidRuleName('   ')).toBe(false);
        expect(AlertingTemplateUtil.isValidRuleName(null as any)).toBe(false);
        expect(AlertingTemplateUtil.isValidRuleName(undefined as any)).toBe(false);
        expect(AlertingTemplateUtil.isValidRuleName(123 as any)).toBe(false);
      });

      it('应拒绝过长的规则名称', () => {
        const longName = 'a'.repeat(101);
        expect(AlertingTemplateUtil.isValidRuleName(longName)).toBe(false);
      });

      it('应接受最大长度的规则名称', () => {
        const maxLengthName = 'a'.repeat(100);
        expect(AlertingTemplateUtil.isValidRuleName(maxLengthName)).toBe(true);
      });
    });

    describe('isValidRuleId', () => {
      it('应接受有效的规则ID', () => {
        expect(AlertingTemplateUtil.isValidRuleId('rule_abc123_def456')).toBe(true);
        expect(AlertingTemplateUtil.isValidRuleId('rule_123abc_456def')).toBe(true);
      });

      it('应拒绝无效的规则ID', () => {
        expect(AlertingTemplateUtil.isValidRuleId('invalid')).toBe(false);
        expect(AlertingTemplateUtil.isValidRuleId('rule_')).toBe(false);
        expect(AlertingTemplateUtil.isValidRuleId('rule_abc')).toBe(false);
        expect(AlertingTemplateUtil.isValidRuleId('rule_abc_')).toBe(false);
        expect(AlertingTemplateUtil.isValidRuleId('rule_abc_defgh')).toBe(false); // 超过6位
        expect(AlertingTemplateUtil.isValidRuleId('rule_ABC_def123')).toBe(false); // 大写字母
        expect(AlertingTemplateUtil.isValidRuleId('')).toBe(false);
      });
    });

    describe('isValidMetricName', () => {
      it('应接受有效的指标名称', () => {
        expect(AlertingTemplateUtil.isValidMetricName('cpu_usage')).toBe(true);
        expect(AlertingTemplateUtil.isValidMetricName('memory.usage')).toBe(true);
        expect(AlertingTemplateUtil.isValidMetricName('Database123')).toBe(true);
        expect(AlertingTemplateUtil.isValidMetricName('system_load_1m')).toBe(true);
      });

      it('应拒绝无效的指标名称', () => {
        expect(AlertingTemplateUtil.isValidMetricName('')).toBe(false);
        expect(AlertingTemplateUtil.isValidMetricName('   ')).toBe(false);
        expect(AlertingTemplateUtil.isValidMetricName('cpu-usage')).toBe(false); // 连字符不允许
        expect(AlertingTemplateUtil.isValidMetricName('cpu usage')).toBe(false); // 空格不允许
        expect(AlertingTemplateUtil.isValidMetricName('cpu@usage')).toBe(false); // 特殊字符不允许
        expect(AlertingTemplateUtil.isValidMetricName(null as any)).toBe(false);
        expect(AlertingTemplateUtil.isValidMetricName(undefined as any)).toBe(false);
        expect(AlertingTemplateUtil.isValidMetricName(123 as any)).toBe(false);
      });
    });

    describe('isValidThreshold', () => {
      it('应接受有效的阈值', () => {
        expect(AlertingTemplateUtil.isValidThreshold(0)).toBe(true);
        expect(AlertingTemplateUtil.isValidThreshold(100)).toBe(true);
        expect(AlertingTemplateUtil.isValidThreshold(0.5)).toBe(true);
        expect(AlertingTemplateUtil.isValidThreshold(Number.MAX_SAFE_INTEGER)).toBe(true);
      });

      it('应拒绝无效的阈值', () => {
        expect(AlertingTemplateUtil.isValidThreshold(null as any)).toBe(false);
        expect(AlertingTemplateUtil.isValidThreshold(undefined as any)).toBe(false);
        expect(AlertingTemplateUtil.isValidThreshold(Infinity)).toBe(false);
        expect(AlertingTemplateUtil.isValidThreshold(-Infinity)).toBe(false);
        expect(AlertingTemplateUtil.isValidThreshold(NaN)).toBe(false);
        expect(AlertingTemplateUtil.isValidThreshold(-1)).toBe(false);
        expect(AlertingTemplateUtil.isValidThreshold(Number.MAX_SAFE_INTEGER + 1)).toBe(false);
      });
    });

    describe('formatAlertMessage', () => {
      it('应格式化告警消息', () => {
        const template = '告警: {metric} 当前值 {value} 超过阈值 {threshold}';
        const context = { metric: 'cpu_usage', value: 85.5, threshold: 80 };
        const result = AlertingTemplateUtil.formatAlertMessage(template, context);
        expect(result).toBe('告警: cpu_usage 当前值 85.5 超过阈值 80');
      });

      it('应处理复杂的上下文数据', () => {
        const template = '服务器 {server} 在 {timestamp} 发生告警，详情: {details}';
        const context = { 
          server: 'web-01', 
          timestamp: '2023-12-01 10:30:00',
          details: ['CPU过高', '内存不足', '磁盘空间告警']
        };
        const result = AlertingTemplateUtil.formatAlertMessage(template, context);
        expect(result).toBe('服务器 web-01 在 2023-12-01 10:30:00 发生告警，详情: CPU过高, 内存不足, 磁盘空间告警');
      });
    });

    describe('calculatePriorityScore', () => {
      it('应计算CRITICAL级别的优先级分数', () => {
        const score = AlertingTemplateUtil.calculatePriorityScore('critical', 100, 80);
        expect(score).toBe(125); // 100 * (100/80) = 125
      });

      it('应计算HIGH级别的优先级分数', () => {
        const score = AlertingTemplateUtil.calculatePriorityScore('high', 90, 100);
        expect(score).toBe(72); // 80 * (90/100) = 72
      });

      it('应计算MEDIUM级别的优先级分数', () => {
        const score = AlertingTemplateUtil.calculatePriorityScore('medium', 50, 60);
        expect(score).toBe(50); // 60 * (50/60) = 50
      });

      it('应计算LOW级别的优先级分数', () => {
        const score = AlertingTemplateUtil.calculatePriorityScore('low', 30, 40);
        expect(score).toBe(30); // 40 * (30/40) = 30
      });

      it('应计算INFO级别的优先级分数', () => {
        const score = AlertingTemplateUtil.calculatePriorityScore('info', 10, 20);
        expect(score).toBe(10); // 20 * (10/20) = 10
      });

      it('应处理未知严重程度级别', () => {
        const score = AlertingTemplateUtil.calculatePriorityScore('unknown', 100, 80);
        expect(score).toBe(0); // 0 * ratio = 0
      });

      it('应限制最大比率为2', () => {
        const score = AlertingTemplateUtil.calculatePriorityScore('critical', 200, 80);
        expect(score).toBe(200); // 100 * 2 = 200 (限制比率为2)
      });

      it('应处理阈值为0的情况', () => {
        const score = AlertingTemplateUtil.calculatePriorityScore('critical', 100, 0);
        expect(score).toBe(100); // 100 * 1 = 100 (使用默认比率1)
      });

      it('应处理负阈值的情况', () => {
        const score = AlertingTemplateUtil.calculatePriorityScore('high', 50, -10);
        expect(score).toBe(80); // 80 * 1 = 80 (使用默认比率1)
      });

      it('应正确四舍五入结果', () => {
        const score = AlertingTemplateUtil.calculatePriorityScore('medium', 33, 100);
        expect(score).toBe(20); // Math.round(60 * 0.33) = 20
      });
    });
  });

  describe('All Constants Immutability', () => {
    it('所有导出的常量对象应该是不可变的', () => {
      expect(Object.isFrozen(ALERTING_OPERATIONS)).toBe(true);
      expect(Object.isFrozen(ALERTING_MESSAGES)).toBe(true);
      expect(Object.isFrozen(ALERTING_ERROR_TEMPLATES)).toBe(true);
      expect(Object.isFrozen(ALERTING_CONFIG)).toBe(true);
      expect(Object.isFrozen(ALERTING_DEFAULT_STATS)).toBe(true);
      expect(Object.isFrozen(ALERTING_SEVERITY_LEVELS)).toBe(true);
      expect(Object.isFrozen(ALERTING_METRICS)).toBe(true);
      expect(Object.isFrozen(ALERTING_CACHE_PATTERNS)).toBe(true);
      expect(Object.isFrozen(ALERTING_VALIDATION_RULES)).toBe(true);
      expect(Object.isFrozen(ALERTING_TIME_CONFIG)).toBe(true);
      expect(Object.isFrozen(ALERTING_THRESHOLDS)).toBe(true);
      expect(Object.isFrozen(ALERTING_RETRY_CONFIG)).toBe(true);
    });
  });

  describe('Constants Content Validation', () => {
    it('ALERTING_DEFAULT_STATS应包含所有默认统计字段', () => {
      expect(ALERTING_DEFAULT_STATS).toEqual({
        activeAlerts: 0,
        criticalAlerts: 0,
        warningAlerts: 0,
        infoAlerts: 0,
        totalAlertsToday: 0,
        resolvedAlertsToday: 0,
        averageResolutionTime: 0,
      });
    });

    it('ALERTING_TIME_CONFIG应包含合理的时间配置', () => {
      expect(ALERTING_TIME_CONFIG.DEFAULT_EVALUATION_INTERVAL_MS).toBe(60000);
      expect(ALERTING_TIME_CONFIG.MIN_COOLDOWN_SECONDS).toBe(60);
      expect(ALERTING_TIME_CONFIG.MAX_COOLDOWN_SECONDS).toBe(86400);
      expect(ALERTING_TIME_CONFIG.ALERT_TTL_SECONDS).toBe(3600);
      expect(ALERTING_TIME_CONFIG.STATS_CACHE_TTL_SECONDS).toBe(300);
      expect(ALERTING_TIME_CONFIG.RULE_CACHE_TTL_SECONDS).toBe(1800);
    });

    it('ALERTING_THRESHOLDS应包含合理的阈值', () => {
      expect(ALERTING_THRESHOLDS.MAX_ACTIVE_ALERTS).toBe(1000);
      expect(ALERTING_THRESHOLDS.MAX_RULES_PER_USER).toBe(50);
      expect(ALERTING_THRESHOLDS.MAX_ALERTS_PER_RULE_PER_HOUR).toBe(10);
      expect(ALERTING_THRESHOLDS.CRITICAL_ALERT_THRESHOLD).toBe(100);
      expect(ALERTING_THRESHOLDS.WARNING_ALERT_THRESHOLD).toBe(50);
    });

    it('ALERTING_RETRY_CONFIG应包含合理的重试配置', () => {
      expect(ALERTING_RETRY_CONFIG.MAX_RETRIES).toBe(3);
      expect(ALERTING_RETRY_CONFIG.INITIAL_DELAY_MS).toBe(1000);
      expect(ALERTING_RETRY_CONFIG.BACKOFF_MULTIPLIER).toBe(2);
      expect(ALERTING_RETRY_CONFIG.MAX_DELAY_MS).toBe(10000);
      expect(ALERTING_RETRY_CONFIG.TIMEOUT_MS).toBe(30000);
    });
  });
});