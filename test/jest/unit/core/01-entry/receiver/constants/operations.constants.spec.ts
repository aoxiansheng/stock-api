/**
 * operations.constants.spec.ts
 * 数据接收操作常量单元测试
 * 路径: unit/core/01-entry/receiver/constants/operations.constants.spec.ts
 */

import {
  SUPPORTED_CAPABILITY_TYPES,
  RECEIVER_OPERATIONS,
  RECEIVER_STATUS,
  RECEIVER_EVENTS,
  RECEIVER_METRICS,
} from '@core/01-entry/receiver/constants/operations.constants';
import { API_OPERATIONS } from '@common/constants/domain';
import { OperationStatus } from '@monitoring/contracts/enums/operation-status.enum';

describe('Receiver Operations Constants', () => {
  describe('SUPPORTED_CAPABILITY_TYPES', () => {
    it('should be frozen array', () => {
      expect(Object.isFrozen(SUPPORTED_CAPABILITY_TYPES)).toBe(true);
      expect(Array.isArray(SUPPORTED_CAPABILITY_TYPES)).toBe(true);
    });

    it('should include stock quote capability from domain constants', () => {
      expect(SUPPORTED_CAPABILITY_TYPES).toContain(API_OPERATIONS.STOCK_DATA.GET_QUOTE);
    });

    it('should contain all basic stock data capabilities', () => {
      const expectedStockCapabilities = [
        'get-stock-basic-info',
        'get-stock-logo',
        'get-stock-news',
      ];

      expectedStockCapabilities.forEach(capability => {
        expect(SUPPORTED_CAPABILITY_TYPES).toContain(capability);
      });
    });

    it('should contain market data capabilities', () => {
      const expectedMarketCapabilities = [
        'get-index-quote',
        'get-market-status',
        'get-trading-days',
        'get-global-state',
      ];

      expectedMarketCapabilities.forEach(capability => {
        expect(SUPPORTED_CAPABILITY_TYPES).toContain(capability);
      });
    });

    it('should contain crypto data capabilities', () => {
      const expectedCryptoCapabilities = [
        'get-crypto-quote',
        'get-crypto-basic-info',
        'get-crypto-logo',
        'get-crypto-news',
      ];

      expectedCryptoCapabilities.forEach(capability => {
        expect(SUPPORTED_CAPABILITY_TYPES).toContain(capability);
      });
    });

    it('should have unique capability types', () => {
      const uniqueCapabilities = [...new Set(SUPPORTED_CAPABILITY_TYPES)];
      expect(uniqueCapabilities.length).toBe(SUPPORTED_CAPABILITY_TYPES.length);
    });

    it('should follow naming convention for capability types', () => {
      SUPPORTED_CAPABILITY_TYPES.forEach(capability => {
        expect(typeof capability).toBe('string');
        expect(capability.length).toBeGreaterThan(0);
        // 检查命名模式: get-{resource}-{action} 或简单的动作名
        expect(capability).toMatch(/^(get-[\w-]+|[\w-]+)$/);
      });
    });

    it('should contain expected number of capabilities', () => {
      // 验证包含预期数量的能力类型
      expect(SUPPORTED_CAPABILITY_TYPES.length).toBe(12);
    });
  });

  describe('RECEIVER_OPERATIONS', () => {
    it('should be frozen object', () => {
      expect(Object.isFrozen(RECEIVER_OPERATIONS)).toBe(true);
    });

    it('should contain request handling operations', () => {
      expect(RECEIVER_OPERATIONS.HANDLE_REQUEST).toBe('handleRequest');
      expect(RECEIVER_OPERATIONS.VALIDATE_REQUEST).toBe('validateRequest');
    });

    it('should contain provider operations', () => {
      expect(RECEIVER_OPERATIONS.DETERMINE_PROVIDER).toBe('determineOptimalProvider');
      expect(RECEIVER_OPERATIONS.VALIDATE_PREFERRED_PROVIDER).toBe('validatePreferredProvider');
    });

    it('should contain symbol processing operations', () => {
      expect(RECEIVER_OPERATIONS.TRANSFORM_SYMBOLS).toBe('transformSymbols');
      expect(RECEIVER_OPERATIONS.INFER_MARKET).toBe('inferMarketFromSymbols');
      expect(RECEIVER_OPERATIONS.GET_MARKET_FROM_SYMBOL).toBe('getMarketFromSymbol');
    });

    it('should contain data fetching operations', () => {
      expect(RECEIVER_OPERATIONS.EXECUTE_DATA_FETCHING).toBe('executeDataFetching');
    });

    it('should contain monitoring operations', () => {
      expect(RECEIVER_OPERATIONS.RECORD_PERFORMANCE).toBe('recordPerformanceMetrics');
    });

    it('should have all required operation keys', () => {
      const expectedKeys = [
        'HANDLE_REQUEST',
        'VALIDATE_REQUEST',
        'DETERMINE_PROVIDER',
        'VALIDATE_PREFERRED_PROVIDER',
        'TRANSFORM_SYMBOLS',
        'EXECUTE_DATA_FETCHING',
        'RECORD_PERFORMANCE',
        'INFER_MARKET',
        'GET_MARKET_FROM_SYMBOL',
      ];

      expectedKeys.forEach(key => {
        expect(RECEIVER_OPERATIONS).toHaveProperty(key);
        expect(typeof RECEIVER_OPERATIONS[key]).toBe('string');
      });
    });

    it('should use camelCase for operation values', () => {
      Object.values(RECEIVER_OPERATIONS).forEach(operation => {
        expect(operation).toMatch(/^[a-z][a-zA-Z]*$/);
      });
    });
  });

  describe('RECEIVER_STATUS', () => {
    it('should be frozen object', () => {
      expect(Object.isFrozen(RECEIVER_STATUS)).toBe(true);
    });

    it('should use monitoring operation status for pending', () => {
      expect(RECEIVER_STATUS.PENDING).toBe(OperationStatus.PENDING);
    });

    it('should contain all processing states', () => {
      const expectedProcessingStates = [
        'VALIDATING',
        'SELECTING_PROVIDER',
        'TRANSFORMING_SYMBOLS',
        'FETCHING_DATA',
      ];

      expectedProcessingStates.forEach(state => {
        expect(RECEIVER_STATUS).toHaveProperty(state);
        expect(typeof RECEIVER_STATUS[state]).toBe('string');
      });
    });

    it('should contain final states', () => {
      const expectedFinalStates = [
        'SUCCESS',
        'FAILED',
        'TIMEOUT',
        'CANCELLED',
      ];

      expectedFinalStates.forEach(state => {
        expect(RECEIVER_STATUS).toHaveProperty(state);
        expect(typeof RECEIVER_STATUS[state]).toBe('string');
      });
    });

    it('should use snake_case for status values', () => {
      // 除了从枚举导入的PENDING状态外，其他都应该是snake_case
      Object.entries(RECEIVER_STATUS).forEach(([key, value]) => {
        if (key !== 'PENDING') {
          expect(value).toMatch(/^[a-z_]+$/);
        }
      });
    });

    it('should have unique status values', () => {
      const statusValues = Object.values(RECEIVER_STATUS);
      const uniqueValues = [...new Set(statusValues)];
      expect(uniqueValues.length).toBe(statusValues.length);
    });
  });

  describe('RECEIVER_EVENTS', () => {
    it('should be frozen object', () => {
      expect(Object.isFrozen(RECEIVER_EVENTS)).toBe(true);
    });

    it('should follow event naming convention', () => {
      Object.values(RECEIVER_EVENTS).forEach(event => {
        expect(event).toMatch(/^receiver\./);
      });
    });

    it('should contain request lifecycle events', () => {
      const expectedLifecycleEvents = [
        'REQUEST_RECEIVED',
        'VALIDATION_COMPLETED',
        'PROVIDER_SELECTED',
        'SYMBOLS_TRANSFORMED',
        'DATA_FETCHED',
        'REQUEST_COMPLETED',
        'REQUEST_FAILED',
      ];

      expectedLifecycleEvents.forEach(event => {
        expect(RECEIVER_EVENTS).toHaveProperty(event);
        expect(RECEIVER_EVENTS[event]).toContain('receiver.');
      });
    });

    it('should contain monitoring events', () => {
      const expectedMonitoringEvents = [
        'SLOW_REQUEST_DETECTED',
        'PERFORMANCE_WARNING',
      ];

      expectedMonitoringEvents.forEach(event => {
        expect(RECEIVER_EVENTS).toHaveProperty(event);
        expect(RECEIVER_EVENTS[event]).toContain('receiver.');
      });
    });

    it('should use consistent event naming pattern', () => {
      Object.values(RECEIVER_EVENTS).forEach(event => {
        // 格式: receiver.{snake_case_event_name}
        expect(event).toMatch(/^receiver\.[a-z_]+$/);
      });
    });

    it('should have all required event keys', () => {
      const expectedKeys = [
        'REQUEST_RECEIVED',
        'VALIDATION_COMPLETED',
        'PROVIDER_SELECTED',
        'SYMBOLS_TRANSFORMED',
        'DATA_FETCHED',
        'REQUEST_COMPLETED',
        'REQUEST_FAILED',
        'SLOW_REQUEST_DETECTED',
        'PERFORMANCE_WARNING',
      ];

      expectedKeys.forEach(key => {
        expect(RECEIVER_EVENTS).toHaveProperty(key);
      });
    });

    it('should have correct event values', () => {
      expect(RECEIVER_EVENTS.REQUEST_RECEIVED).toBe('receiver.request_received');
      expect(RECEIVER_EVENTS.VALIDATION_COMPLETED).toBe('receiver.validation_completed');
      expect(RECEIVER_EVENTS.DATA_FETCHED).toBe('receiver.data_fetched');
    });
  });

  describe('RECEIVER_METRICS', () => {
    it('should be frozen object', () => {
      expect(Object.isFrozen(RECEIVER_METRICS)).toBe(true);
    });

    it('should follow metrics naming convention', () => {
      Object.values(RECEIVER_METRICS).forEach(metric => {
        expect(metric).toMatch(/^receiver_/);
      });
    });

    it('should contain counter metrics', () => {
      const expectedCounterMetrics = [
        'REQUESTS_TOTAL',
        'VALIDATION_ERRORS',
        'SYMBOLS_PROCESSED',
        'SLOW_REQUESTS',
      ];

      expectedCounterMetrics.forEach(metric => {
        expect(RECEIVER_METRICS).toHaveProperty(metric);
        expect(RECEIVER_METRICS[metric]).toContain('receiver_');
      });
    });

    it('should contain timing metrics', () => {
      const expectedTimingMetrics = [
        'REQUEST_DURATION',
        'PROVIDER_SELECTION_TIME',
        'SYMBOL_TRANSFORMATION_TIME',
        'DATA_FETCHING_TIME',
      ];

      expectedTimingMetrics.forEach(metric => {
        expect(RECEIVER_METRICS).toHaveProperty(metric);
        expect(RECEIVER_METRICS[metric]).toContain('receiver_');
      });
    });

    it('should contain rate metrics', () => {
      const expectedRateMetrics = [
        'SUCCESS_RATE',
        'ERROR_RATE',
      ];

      expectedRateMetrics.forEach(metric => {
        expect(RECEIVER_METRICS).toHaveProperty(metric);
        expect(RECEIVER_METRICS[metric]).toContain('receiver_');
      });
    });

    it('should use consistent metrics naming pattern', () => {
      Object.values(RECEIVER_METRICS).forEach(metric => {
        // 格式: receiver_{snake_case_metric_name}
        expect(metric).toMatch(/^receiver_[a-z_]+$/);
      });
    });

    it('should have unique metric names', () => {
      const metricValues = Object.values(RECEIVER_METRICS);
      const uniqueValues = [...new Set(metricValues)];
      expect(uniqueValues.length).toBe(metricValues.length);
    });

    it('should have all required metric keys', () => {
      const expectedKeys = [
        'REQUESTS_TOTAL',
        'REQUEST_DURATION',
        'VALIDATION_ERRORS',
        'PROVIDER_SELECTION_TIME',
        'SYMBOL_TRANSFORMATION_TIME',
        'DATA_FETCHING_TIME',
        'SUCCESS_RATE',
        'ERROR_RATE',
        'SYMBOLS_PROCESSED',
        'SLOW_REQUESTS',
      ];

      expectedKeys.forEach(key => {
        expect(RECEIVER_METRICS).toHaveProperty(key);
      });
    });

    it('should have correct metric values', () => {
      expect(RECEIVER_METRICS.REQUESTS_TOTAL).toBe('receiver_requests_total');
      expect(RECEIVER_METRICS.REQUEST_DURATION).toBe('receiver_request_duration');
      expect(RECEIVER_METRICS.SUCCESS_RATE).toBe('receiver_success_rate');
    });
  });

  describe('Operations Constants Integration', () => {
    it('should not have conflicting constant names across different groups', () => {
      const operationsKeys = Object.keys(RECEIVER_OPERATIONS);
      const statusKeys = Object.keys(RECEIVER_STATUS);
      const eventsKeys = Object.keys(RECEIVER_EVENTS);
      const metricsKeys = Object.keys(RECEIVER_METRICS);

      // 检查各组之间没有重复的键名
      const allKeys = [...operationsKeys, ...statusKeys, ...eventsKeys, ...metricsKeys];
      const uniqueKeys = [...new Set(allKeys)];
      expect(uniqueKeys.length).toBe(allKeys.length);
    });

    it('should maintain consistency between operations and events', () => {
      // 一些操作应该有对应的事件
      const operationEventMapping = {
        'VALIDATE_REQUEST': 'VALIDATION_COMPLETED',
        'DETERMINE_PROVIDER': 'PROVIDER_SELECTED',
        'TRANSFORM_SYMBOLS': 'SYMBOLS_TRANSFORMED',
        'EXECUTE_DATA_FETCHING': 'DATA_FETCHED',
      };

      Object.entries(operationEventMapping).forEach(([operation, event]) => {
        expect(RECEIVER_OPERATIONS).toHaveProperty(operation);
        expect(RECEIVER_EVENTS).toHaveProperty(event);
      });
    });

    it('should maintain consistency between status and events', () => {
      // 某些状态应该有对应的事件
      const statusEventMapping = {
        'SUCCESS': 'REQUEST_COMPLETED',
        'FAILED': 'REQUEST_FAILED',
      };

      Object.entries(statusEventMapping).forEach(([status, event]) => {
        expect(RECEIVER_STATUS).toHaveProperty(status);
        expect(RECEIVER_EVENTS).toHaveProperty(event);
      });
    });

    it('should have metrics corresponding to key operations', () => {
      // 关键操作应该有对应的指标
      const operationMetricsMapping = {
        'HANDLE_REQUEST': ['REQUESTS_TOTAL', 'REQUEST_DURATION'],
        'VALIDATE_REQUEST': ['VALIDATION_ERRORS'],
        'DETERMINE_PROVIDER': ['PROVIDER_SELECTION_TIME'],
        'TRANSFORM_SYMBOLS': ['SYMBOL_TRANSFORMATION_TIME'],
        'EXECUTE_DATA_FETCHING': ['DATA_FETCHING_TIME'],
      };

      Object.entries(operationMetricsMapping).forEach(([operation, metrics]) => {
        expect(RECEIVER_OPERATIONS).toHaveProperty(operation);
        metrics.forEach(metric => {
          expect(RECEIVER_METRICS).toHaveProperty(metric);
        });
      });
    });
  });
});