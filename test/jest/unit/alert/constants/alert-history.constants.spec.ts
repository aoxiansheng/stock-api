/* eslint-disable @typescript-eslint/no-unused-vars */
import {
  ALERT_HISTORY_OPERATIONS,
  ALERT_HISTORY_MESSAGES,
  ALERT_HISTORY_CONFIG,
  ALERT_HISTORY_DEFAULT_STATS,
  ALERT_STATUS_MAPPING,
  ALERT_HISTORY_METRICS,
  ALERT_HISTORY_VALIDATION_RULES,
  ALERT_HISTORY_TIME_CONFIG,
  ALERT_HISTORY_THRESHOLDS,
  AlertHistoryUtil,
} from '../../../../../src/alert/constants/alert-history.constants';

describe('Alert History Constants', () => {
  describe('ALERT_HISTORY_OPERATIONS', () => {
    it('应包含所有必需的操作常量', () => {
      expect(ALERT_HISTORY_OPERATIONS.CREATE_ALERT).toBe('createAlert');
      expect(ALERT_HISTORY_OPERATIONS.UPDATE_ALERT_STATUS).toBe('updateAlertStatus');
      expect(ALERT_HISTORY_OPERATIONS.QUERY_ALERTS).toBe('queryAlerts');
      expect(ALERT_HISTORY_OPERATIONS.GET_ACTIVE_ALERTS).toBe('getActiveAlerts');
      expect(ALERT_HISTORY_OPERATIONS.GET_ALERT_STATS).toBe('getAlertStats');
      expect(ALERT_HISTORY_OPERATIONS.GET_ALERT_BY_ID).toBe('getAlertById');
      expect(ALERT_HISTORY_OPERATIONS.CLEANUP_EXPIRED_ALERTS).toBe('cleanupExpiredAlerts');
      expect(ALERT_HISTORY_OPERATIONS.BATCH_UPDATE_ALERT_STATUS).toBe('batchUpdateAlertStatus');
      expect(ALERT_HISTORY_OPERATIONS.GET_ALERT_COUNT_BY_STATUS).toBe('getAlertCountByStatus');
      expect(ALERT_HISTORY_OPERATIONS.GET_RECENT_ALERTS).toBe('getRecentAlerts');
      expect(ALERT_HISTORY_OPERATIONS.GET_SERVICE_STATS).toBe('getServiceStats');
      expect(ALERT_HISTORY_OPERATIONS.GENERATE_ALERT_ID).toBe('generateAlertId');
      expect(ALERT_HISTORY_OPERATIONS.CALCULATE_STATISTICS).toBe('calculateStatistics');
      expect(ALERT_HISTORY_OPERATIONS.VALIDATE_QUERY_PARAMS).toBe('validateQueryParams');
      expect(ALERT_HISTORY_OPERATIONS.PROCESS_BATCH_RESULTS).toBe('processBatchResults');
    });

    it('应是不可变对象', () => {
      expect(Object.isFrozen(ALERT_HISTORY_OPERATIONS)).toBe(true);
    });
  });

  describe('ALERT_HISTORY_MESSAGES', () => {
    it('应包含所有成功消息', () => {
      expect(ALERT_HISTORY_MESSAGES.ALERT_CREATED).toBe('创建告警记录成功');
      expect(ALERT_HISTORY_MESSAGES.ALERT_STATUS_UPDATED).toBe('更新告警状态成功');
      expect(ALERT_HISTORY_MESSAGES.ALERTS_QUERIED).toBe('查询告警记录成功');
      expect(ALERT_HISTORY_MESSAGES.ACTIVE_ALERTS_RETRIEVED).toBe('获取活跃告警成功');
      expect(ALERT_HISTORY_MESSAGES.ALERT_STATS_RETRIEVED).toBe('获取告警统计成功');
      expect(ALERT_HISTORY_MESSAGES.ALERT_RETRIEVED).toBe('获取告警记录成功');
      expect(ALERT_HISTORY_MESSAGES.CLEANUP_COMPLETED).toBe('清理过期告警成功');
      expect(ALERT_HISTORY_MESSAGES.BATCH_UPDATE_COMPLETED).toBe('批量更新告警状态完成');
    });

    it('应包含所有错误消息', () => {
      expect(ALERT_HISTORY_MESSAGES.CREATE_ALERT_FAILED).toBe('创建告警记录失败');
      expect(ALERT_HISTORY_MESSAGES.UPDATE_ALERT_STATUS_FAILED).toBe('更新告警状态失败');
      expect(ALERT_HISTORY_MESSAGES.QUERY_ALERTS_FAILED).toBe('查询告警记录失败');
      expect(ALERT_HISTORY_MESSAGES.GET_ACTIVE_ALERTS_FAILED).toBe('获取活跃告警失败');
      expect(ALERT_HISTORY_MESSAGES.GET_ALERT_STATS_FAILED).toBe('获取告警统计失败');
      expect(ALERT_HISTORY_MESSAGES.GET_ALERT_FAILED).toBe('获取告警失败');
      expect(ALERT_HISTORY_MESSAGES.CLEANUP_FAILED).toBe('清理过期告警失败');
      expect(ALERT_HISTORY_MESSAGES.BATCH_UPDATE_FAILED).toBe('批量更新告警状态失败');
    });

    it('应包含所有信息消息', () => {
      expect(ALERT_HISTORY_MESSAGES.CLEANUP_STARTED).toBe('开始清理过期告警');
      expect(ALERT_HISTORY_MESSAGES.BATCH_UPDATE_STARTED).toBe('开始批量更新告警状态');
      expect(ALERT_HISTORY_MESSAGES.ALERT_CREATION_STARTED).toBe('开始创建告警记录');
      expect(ALERT_HISTORY_MESSAGES.ALERT_STATUS_UPDATE_STARTED).toBe('开始更新告警状态');
    });

    it('应包含所有警告消息', () => {
      expect(ALERT_HISTORY_MESSAGES.NO_ALERTS_FOUND).toBe('未找到告警记录');
      expect(ALERT_HISTORY_MESSAGES.PARTIAL_BATCH_UPDATE_SUCCESS).toBe('批量更新部分成功');
      expect(ALERT_HISTORY_MESSAGES.CLEANUP_NO_EXPIRED_ALERTS).toBe('没有过期告警需要清理');
      expect(ALERT_HISTORY_MESSAGES.STATISTICS_INCOMPLETE).toBe('统计数据不完整');
      expect(ALERT_HISTORY_MESSAGES.QUERY_LIMIT_EXCEEDED).toBe('查询限制超出范围');
    });

    it('应是不可变对象', () => {
      expect(Object.isFrozen(ALERT_HISTORY_MESSAGES)).toBe(true);
    });
  });

  describe('ALERT_HISTORY_CONFIG', () => {
    it('应包含正确的配置值', () => {
      expect(ALERT_HISTORY_CONFIG.ALERT_ID_PREFIX).toBe('alrt_');
      expect(ALERT_HISTORY_CONFIG.DEFAULT_CLEANUP_DAYS).toBe(90);
      expect(ALERT_HISTORY_CONFIG.DEFAULT_PAGE_LIMIT).toBe(20);
      expect(ALERT_HISTORY_CONFIG.DEFAULT_RECENT_ALERTS_LIMIT).toBe(10);
      expect(ALERT_HISTORY_CONFIG.MAX_PAGE_LIMIT).toBe(100);
      expect(ALERT_HISTORY_CONFIG.MIN_PAGE_LIMIT).toBe(1);
      expect(ALERT_HISTORY_CONFIG.MAX_CLEANUP_DAYS).toBe(365);
      expect(ALERT_HISTORY_CONFIG.MIN_CLEANUP_DAYS).toBe(1);
      expect(ALERT_HISTORY_CONFIG.ID_FORMAT_TEMPLATE).toBe('alrt_{timestamp}_{random}');
      expect(ALERT_HISTORY_CONFIG.TIMESTAMP_BASE).toBe(36);
      expect(ALERT_HISTORY_CONFIG.RANDOM_LENGTH).toBe(6);
      expect(ALERT_HISTORY_CONFIG.RANDOM_START).toBe(2);
      expect(ALERT_HISTORY_CONFIG.BATCH_SIZE_LIMIT).toBe(1000);
      expect(ALERT_HISTORY_CONFIG.STATISTICS_CACHE_TTL_SECONDS).toBe(300);
      expect(ALERT_HISTORY_CONFIG.CLEANUP_CHUNK_SIZE).toBe(1000);
      expect(ALERT_HISTORY_CONFIG.BATCH_UPDATE_LIMIT).toBe(1000);
    });

    it('分页限制应合理', () => {
      expect(ALERT_HISTORY_CONFIG.MIN_PAGE_LIMIT).toBeLessThan(ALERT_HISTORY_CONFIG.MAX_PAGE_LIMIT);
      expect(ALERT_HISTORY_CONFIG.DEFAULT_PAGE_LIMIT).toBeGreaterThanOrEqual(ALERT_HISTORY_CONFIG.MIN_PAGE_LIMIT);
      expect(ALERT_HISTORY_CONFIG.DEFAULT_PAGE_LIMIT).toBeLessThanOrEqual(ALERT_HISTORY_CONFIG.MAX_PAGE_LIMIT);
    });

    it('清理天数应合理', () => {
      expect(ALERT_HISTORY_CONFIG.MIN_CLEANUP_DAYS).toBeLessThan(ALERT_HISTORY_CONFIG.MAX_CLEANUP_DAYS);
      expect(ALERT_HISTORY_CONFIG.DEFAULT_CLEANUP_DAYS).toBeGreaterThanOrEqual(ALERT_HISTORY_CONFIG.MIN_CLEANUP_DAYS);
      expect(ALERT_HISTORY_CONFIG.DEFAULT_CLEANUP_DAYS).toBeLessThanOrEqual(ALERT_HISTORY_CONFIG.MAX_CLEANUP_DAYS);
    });

    it('应是不可变对象', () => {
      expect(Object.isFrozen(ALERT_HISTORY_CONFIG)).toBe(true);
    });
  });

  describe('ALERT_HISTORY_DEFAULT_STATS', () => {
    it('应包含所有默认统计字段', () => {
      expect(ALERT_HISTORY_DEFAULT_STATS).toEqual({
        activeAlerts: 0,
        criticalAlerts: 0,
        _warningAlerts: 0,
        infoAlerts: 0,
        totalAlertsToday: 0,
        resolvedAlertsToday: 0,
        averageResolutionTime: 0,
      });
    });

    it('所有默认值应为数字', () => {
      Object.values(ALERT_HISTORY_DEFAULT_STATS).forEach(value => {
        expect(typeof value).toBe('number');
      });
    });

    it('应是不可变对象', () => {
      expect(Object.isFrozen(ALERT_HISTORY_DEFAULT_STATS)).toBe(true);
    });
  });

  describe('ALERT_STATUS_MAPPING', () => {
    it('应包含所有状态映射', () => {
      expect(ALERT_STATUS_MAPPING.FIRING).toBe('firing');
      expect(ALERT_STATUS_MAPPING.ACKNOWLEDGED).toBe('acknowledged');
      expect(ALERT_STATUS_MAPPING.RESOLVED).toBe('resolved');
    });

    it('应是不可变对象', () => {
      expect(Object.isFrozen(ALERT_STATUS_MAPPING)).toBe(true);
    });
  });

  describe('ALERT_HISTORY_METRICS', () => {
    it('应包含所有指标名称', () => {
      expect(ALERT_HISTORY_METRICS.ALERT_CREATION_COUNT).toBe('alert_history_creation_count');
      expect(ALERT_HISTORY_METRICS.ALERT_UPDATE_COUNT).toBe('alert_history_update_count');
      expect(ALERT_HISTORY_METRICS.ALERT_QUERY_COUNT).toBe('alert_history_query_count');
      expect(ALERT_HISTORY_METRICS.CLEANUP_EXECUTION_COUNT).toBe('alert_history_cleanup_count');
      expect(ALERT_HISTORY_METRICS.BATCH_UPDATE_COUNT).toBe('alert_history_batch_update_count');
      expect(ALERT_HISTORY_METRICS.AVERAGE_QUERY_TIME).toBe('alert_history_avg_query_time');
      expect(ALERT_HISTORY_METRICS.AVERAGE_UPDATE_TIME).toBe('alert_history_avg_update_time');
      expect(ALERT_HISTORY_METRICS.AVERAGE_CLEANUP_TIME).toBe('alert_history_avg_cleanup_time');
      expect(ALERT_HISTORY_METRICS.ACTIVE_ALERTS_COUNT).toBe('alert_history_active_alerts_count');
      expect(ALERT_HISTORY_METRICS.TOTAL_ALERTS_COUNT).toBe('alert_history_total_alerts_count');
    });

    it('所有指标名称应遵循命名规范', () => {
      Object.values(ALERT_HISTORY_METRICS).forEach(metric => {
        expect(metric).toMatch(/^alert_history_[a-z_]+$/);
      });
    });

    it('应是不可变对象', () => {
      expect(Object.isFrozen(ALERT_HISTORY_METRICS)).toBe(true);
    });
  });

  describe('ALERT_HISTORY_VALIDATION_RULES', () => {
    it('应包含正确的验证规则', () => {
      expect(ALERT_HISTORY_VALIDATION_RULES.ALERT_ID_PATTERN).toBeInstanceOf(RegExp);
      expect(ALERT_HISTORY_VALIDATION_RULES.MIN_ALERT_ID_LENGTH).toBe(15);
      expect(ALERT_HISTORY_VALIDATION_RULES.MAX_ALERT_ID_LENGTH).toBe(50);
      expect(ALERT_HISTORY_VALIDATION_RULES.MIN_RULE_ID_LENGTH).toBe(1);
      expect(ALERT_HISTORY_VALIDATION_RULES.MAX_RULE_ID_LENGTH).toBe(100);
      expect(ALERT_HISTORY_VALIDATION_RULES.MIN_MESSAGE_LENGTH).toBe(1);
      expect(ALERT_HISTORY_VALIDATION_RULES.MAX_MESSAGE_LENGTH).toBe(1000);
    });

    it('告警ID模式应验证正确的格式', () => {
      expect(ALERT_HISTORY_VALIDATION_RULES.ALERT_ID_PATTERN.test('alrt_abc123_def456')).toBe(true);
      expect(ALERT_HISTORY_VALIDATION_RULES.ALERT_ID_PATTERN.test('alrt_123abc_456def')).toBe(true);
      expect(ALERT_HISTORY_VALIDATION_RULES.ALERT_ID_PATTERN.test('invalid')).toBe(false);
      expect(ALERT_HISTORY_VALIDATION_RULES.ALERT_ID_PATTERN.test('alrt_')).toBe(false);
      expect(ALERT_HISTORY_VALIDATION_RULES.ALERT_ID_PATTERN.test('alrt_abc')).toBe(false);
    });

    it('长度限制应合理', () => {
      expect(ALERT_HISTORY_VALIDATION_RULES.MIN_ALERT_ID_LENGTH).toBeLessThan(ALERT_HISTORY_VALIDATION_RULES.MAX_ALERT_ID_LENGTH);
      expect(ALERT_HISTORY_VALIDATION_RULES.MIN_RULE_ID_LENGTH).toBeLessThan(ALERT_HISTORY_VALIDATION_RULES.MAX_RULE_ID_LENGTH);
      expect(ALERT_HISTORY_VALIDATION_RULES.MIN_MESSAGE_LENGTH).toBeLessThan(ALERT_HISTORY_VALIDATION_RULES.MAX_MESSAGE_LENGTH);
    });

    it('应是不可变对象', () => {
      expect(Object.isFrozen(ALERT_HISTORY_VALIDATION_RULES)).toBe(true);
    });
  });

  describe('ALERT_HISTORY_TIME_CONFIG', () => {
    it('应包含合理的时间配置', () => {
      expect(ALERT_HISTORY_TIME_CONFIG.DEFAULT_QUERY_TIMEOUT_MS).toBe(30000);
      expect(ALERT_HISTORY_TIME_CONFIG.BATCH_UPDATE_TIMEOUT_MS).toBe(60000);
      expect(ALERT_HISTORY_TIME_CONFIG.CLEANUP_TIMEOUT_MS).toBe(300000);
      expect(ALERT_HISTORY_TIME_CONFIG.STATISTICS_CALCULATION_TIMEOUT_MS).toBe(60000);
      expect(ALERT_HISTORY_TIME_CONFIG.ALERT_CREATION_TIMEOUT_MS).toBe(10000);
      expect(ALERT_HISTORY_TIME_CONFIG.ALERT_UPDATE_TIMEOUT_MS).toBe(10000);
    });

    it('清理超时应大于其他操作超时', () => {
      expect(ALERT_HISTORY_TIME_CONFIG.CLEANUP_TIMEOUT_MS).toBeGreaterThan(ALERT_HISTORY_TIME_CONFIG.DEFAULT_QUERY_TIMEOUT_MS);
      expect(ALERT_HISTORY_TIME_CONFIG.CLEANUP_TIMEOUT_MS).toBeGreaterThan(ALERT_HISTORY_TIME_CONFIG.BATCH_UPDATE_TIMEOUT_MS);
    });

    it('应是不可变对象', () => {
      expect(Object.isFrozen(ALERT_HISTORY_TIME_CONFIG)).toBe(true);
    });
  });

  describe('ALERT_HISTORY_THRESHOLDS', () => {
    it('应包含合理的阈值', () => {
      expect(ALERT_HISTORY_THRESHOLDS.MAX_ACTIVE_ALERTS).toBe(10000);
      expect(ALERT_HISTORY_THRESHOLDS.MAX_ALERTS_PER_RULE).toBe(1000);
      expect(ALERT_HISTORY_THRESHOLDS.MAX_BATCH_UPDATE_SIZE).toBe(1000);
      expect(ALERT_HISTORY_THRESHOLDS.CLEANUP_BATCH_SIZE).toBe(1000);
      expect(ALERT_HISTORY_THRESHOLDS.STATISTICS_REFRESH_INTERVAL_MS).toBe(300000);
    });

    it('最大活跃告警数应大于单规则告警数', () => {
      expect(ALERT_HISTORY_THRESHOLDS.MAX_ACTIVE_ALERTS).toBeGreaterThan(ALERT_HISTORY_THRESHOLDS.MAX_ALERTS_PER_RULE);
    });

    it('应是不可变对象', () => {
      expect(Object.isFrozen(ALERT_HISTORY_THRESHOLDS)).toBe(true);
    });
  });

  describe('AlertHistoryUtil', () => {
    describe('generateAlertId', () => {
      it('应生成符合格式的告警ID', () => {
        const alertId = AlertHistoryUtil.generateAlertId();
        expect(typeof alertId).toBe('string');
        expect(alertId).toMatch(/^alrt_[a-z0-9]+_[a-z0-9]{6}$/);
        expect(alertId.startsWith('alrt_')).toBe(true);
      });

      it('应生成唯一的告警ID', () => {
        const ids = new Set();
        for (let i = 0; i < 100; i++) {
          const id = AlertHistoryUtil.generateAlertId();
          expect(ids.has(id)).toBe(false);
          ids.add(id);
        }
      });

      it('生成的ID应通过验证', () => {
        const alertId = AlertHistoryUtil.generateAlertId();
        expect(AlertHistoryUtil.isValidAlertId(alertId)).toBe(true);
      });
    });

    describe('isValidAlertId', () => {
      it('应接受有效的告警ID', () => {
        expect(AlertHistoryUtil.isValidAlertId('alrt_abc123_def456')).toBe(true);
        expect(AlertHistoryUtil.isValidAlertId('alrt_123abc_456def')).toBe(true);
      });

      it('应拒绝无效的告警ID', () => {
        expect(AlertHistoryUtil.isValidAlertId('invalid')).toBe(false);
        expect(AlertHistoryUtil.isValidAlertId('alrt_')).toBe(false);
        expect(AlertHistoryUtil.isValidAlertId('alrt_abc')).toBe(false);
        expect(AlertHistoryUtil.isValidAlertId('alrt_abc_')).toBe(false);
        expect(AlertHistoryUtil.isValidAlertId('alrt_abc_defgh')).toBe(false); // 超过6位
        expect(AlertHistoryUtil.isValidAlertId('')).toBe(false);
      });

      it('应检查ID长度', () => {
        const shortId = 'alrt_a_b12345'; // 太短
        const longId = 'alrt_' + 'a'.repeat(50) + '_' + 'b'.repeat(50); // 太长
        expect(AlertHistoryUtil.isValidAlertId(shortId)).toBe(false);
        expect(AlertHistoryUtil.isValidAlertId(longId)).toBe(false);
      });
    });

    describe('validatePaginationParams', () => {
      it('应接受有效的分页参数', () => {
        const result = AlertHistoryUtil.validatePaginationParams(1, 20);
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('应拒绝无效的页码', () => {
        const result = AlertHistoryUtil.validatePaginationParams(0, 20);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('页码必须大于0');
      });

      it('应拒绝过小的每页数量', () => {
        const result = AlertHistoryUtil.validatePaginationParams(1, 0);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('每页数量不能少于1');
      });

      it('应拒绝过大的每页数量', () => {
        const result = AlertHistoryUtil.validatePaginationParams(1, 101);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('每页数量不能超过100');
      });

      it('应返回多个验证错误', () => {
        const result = AlertHistoryUtil.validatePaginationParams(-1, 200);
        expect(result.isValid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(1);
      });
    });

    describe('isValidCleanupDays', () => {
      it('应接受有效的清理天数', () => {
        expect(AlertHistoryUtil.isValidCleanupDays(1)).toBe(true);
        expect(AlertHistoryUtil.isValidCleanupDays(90)).toBe(true);
        expect(AlertHistoryUtil.isValidCleanupDays(365)).toBe(true);
      });

      it('应拒绝无效的清理天数', () => {
        expect(AlertHistoryUtil.isValidCleanupDays(0)).toBe(false);
        expect(AlertHistoryUtil.isValidCleanupDays(366)).toBe(false);
        expect(AlertHistoryUtil.isValidCleanupDays(-1)).toBe(false);
      });
    });

    describe('calculatePagination', () => {
      it('应正确计算分页信息', () => {
        const result = AlertHistoryUtil.calculatePagination(100, 2, 20);
        expect(result).toEqual({
          total: 100,
          page: 2,
          limit: 20,
          totalPages: 5,
          hasNext: true,
          hasPrev: true,
          _offset: 20,
        });
      });

      it('应处理第一页', () => {
        const result = AlertHistoryUtil.calculatePagination(50, 1, 10);
        expect(result.hasPrev).toBe(false);
        expect(result.hasNext).toBe(true);
        expect(result.offset).toBe(0);
      });

      it('应处理最后一页', () => {
        const result = AlertHistoryUtil.calculatePagination(50, 5, 10);
        expect(result.hasPrev).toBe(true);
        expect(result.hasNext).toBe(false);
        expect(result.totalPages).toBe(5);
      });

      it('应处理不整除的情况', () => {
        const result = AlertHistoryUtil.calculatePagination(23, 3, 10);
        expect(result.totalPages).toBe(3);
      });
    });

    describe('calculateExecutionTime', () => {
      it('应正确计算执行时间', () => {
        const startTime = new Date('2023-01-01T10:00:00.000Z');
        const endTime = new Date('2023-01-01T10:00:01._500Z');
        const executionTime = AlertHistoryUtil.calculateExecutionTime(startTime, endTime);
        expect(executionTime).toBe(1500);
      });

      it('应处理同一时间', () => {
        const time = new Date();
        const executionTime = AlertHistoryUtil.calculateExecutionTime(time, time);
        expect(executionTime).toBe(0);
      });
    });

    describe('isValidAlertMessage', () => {
      it('应接受有效的告警消息', () => {
        expect(AlertHistoryUtil.isValidAlertMessage('告警消息')).toBe(true);
        expect(AlertHistoryUtil.isValidAlertMessage('A')).toBe(true);
        expect(AlertHistoryUtil.isValidAlertMessage('a'.repeat(1000))).toBe(true);
      });

      it('应拒绝无效的告警消息', () => {
        expect(AlertHistoryUtil.isValidAlertMessage('')).toBe(false);
        expect(AlertHistoryUtil.isValidAlertMessage('a'.repeat(1001))).toBe(false);
      });
    });

    describe('generateBatchResultSummary', () => {
      it('应生成正确的批量操作结果摘要', () => {
        const summary = AlertHistoryUtil.generateBatchResultSummary(80, 20, ['错误1', '错误2']);
        expect(summary).toEqual({
          totalProcessed: 100,
          successRate: 80,
          hasErrors: true,
          errorSummary: '2 个错误',
        });
      });

      it('应处理全部成功的情况', () => {
        const summary = AlertHistoryUtil.generateBatchResultSummary(100, 0, []);
        expect(summary).toEqual({
          totalProcessed: 100,
          successRate: 100,
          hasErrors: false,
          errorSummary: '无错误',
        });
      });

      it('应处理无处理项的情况', () => {
        const summary = AlertHistoryUtil.generateBatchResultSummary(0, 0, []);
        expect(summary).toEqual({
          totalProcessed: 0,
          successRate: 0,
          hasErrors: false,
          errorSummary: '无错误',
        });
      });

      it('应正确计算成功率并四舍五入', () => {
        const summary = AlertHistoryUtil.generateBatchResultSummary(33, 67, []);
        expect(summary.successRate).toBe(33);
        expect(summary.totalProcessed).toBe(100);
      });
    });

    describe('formatStatistics', () => {
      it('应合并默认统计和原始统计', () => {
        const rawStats = { activeAlerts: 5, criticalAlerts: 2 };
        const formatted = AlertHistoryUtil.formatStatistics(rawStats);
        expect(formatted.activeAlerts).toBe(5);
        expect(formatted.criticalAlerts).toBe(2);
        expect(formatted.warningAlerts).toBe(0); // 默认值
        expect(formatted.statisticsTime).toBeInstanceOf(Date);
      });

      it('应添加统计时间', () => {
        const rawStats = {};
        const formatted = AlertHistoryUtil.formatStatistics(rawStats);
        expect(formatted.statisticsTime).toBeInstanceOf(Date);
      });
    });

    describe('isValidBatchSize', () => {
      it('应接受有效的批量大小', () => {
        expect(AlertHistoryUtil.isValidBatchSize(1)).toBe(true);
        expect(AlertHistoryUtil.isValidBatchSize(500)).toBe(true);
        expect(AlertHistoryUtil.isValidBatchSize(1000)).toBe(true);
      });

      it('应拒绝无效的批量大小', () => {
        expect(AlertHistoryUtil.isValidBatchSize(0)).toBe(false);
        expect(AlertHistoryUtil.isValidBatchSize(-1)).toBe(false);
        expect(AlertHistoryUtil.isValidBatchSize(1001)).toBe(false);
      });
    });

    describe('generateQueryCacheKey', () => {
      it('应生成一致的缓存键', () => {
        const params1 = { status: 'firing', page: 1, limit: 20 };
        const params2 = { limit: 20, status: 'firing', page: 1 }; // 顺序不同
        const key1 = AlertHistoryUtil.generateQueryCacheKey(params1);
        const key2 = AlertHistoryUtil.generateQueryCacheKey(params2);
        expect(key1).toBe(key2);
      });

      it('应生成不同的缓存键对于不同的参数', () => {
        const params1 = { status: 'firing', page: 1 };
        const params2 = { status: 'resolved', page: 1 };
        const key1 = AlertHistoryUtil.generateQueryCacheKey(params1);
        const key2 = AlertHistoryUtil.generateQueryCacheKey(params2);
        expect(key1).not.toBe(key2);
      });

      it('应包含固定前缀', () => {
        const params = { test: 'value' };
        const key = AlertHistoryUtil.generateQueryCacheKey(params);
        expect(key).toMatch(/^alert_query_/);
      });
    });
  });

  describe('All Constants Immutability', () => {
    it('所有导出的常量对象应该是不可变的', () => {
      const constants = [
        ALERT_HISTORY_OPERATIONS,
        ALERT_HISTORY_MESSAGES,
        ALERT_HISTORY_CONFIG,
        ALERT_HISTORY_DEFAULT_STATS,
        ALERT_STATUS_MAPPING,
        ALERT_HISTORY_METRICS,
        ALERT_HISTORY_VALIDATION_RULES,
        ALERT_HISTORY_TIME_CONFIG,
        ALERT_HISTORY_THRESHOLDS,
      ];

      constants.forEach(constant => {
        expect(Object.isFrozen(constant)).toBe(true);
      });
    });
  });
});