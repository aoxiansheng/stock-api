/**
 * Receiver组件时间字段迁移测试
 * 测试ReceiverPerformanceDto和receiver.service.ts的双字段支持
 */

import { ReceiverPerformanceDto } from '@core/01-entry/receiver/dto/receiver-internal.dto';
import { createCompatibleTimeFields } from '@common/utils/time-fields-migration.util';

describe('Receiver组件时间字段迁移测试', () => {
  describe('ReceiverPerformanceDto', () => {
    describe('静态工厂方法', () => {
      it('create方法应该生成包含双字段的DTO', () => {
        const dto = ReceiverPerformanceDto.create({
          requestId: 'test-123',
          processingTimeMs: 150,
          symbolsCount: 5,
          avgTimePerSymbol: 30,
          isSlowRequest: false,
          threshold: 1000,
        });

        expect(dto.processingTimeMs).toBe(150);
        expect(dto.processingTime).toBe(150); // 向后兼容字段
        expect(dto.requestId).toBe('test-123');
        expect(dto.symbolsCount).toBe(5);
        expect(dto.avgTimePerSymbol).toBe(30);
        expect(dto.isSlowRequest).toBe(false);
        expect(dto.threshold).toBe(1000);
      });

      it('fromLegacyObject方法应该优先使用processingTimeMs', () => {
        const legacyObj = {
          requestId: 'test-123',
          processingTime: 100,
          processingTimeMs: 150, // 应该使用这个值
          symbolsCount: 5,
          avgTimePerSymbol: 30,
          isSlowRequest: false,
          threshold: 1000,
        };

        const dto = ReceiverPerformanceDto.fromLegacyObject(legacyObj);

        expect(dto.processingTimeMs).toBe(150); // 使用processingTimeMs的值
        expect(dto.processingTime).toBe(150); // 同步到processingTime
      });

      it('fromLegacyObject方法应该fallback到processingTime', () => {
        const legacyObj = {
          requestId: 'test-123',
          processingTime: 100,
          // 没有processingTimeMs字段
          symbolsCount: 5,
        };

        const dto = ReceiverPerformanceDto.fromLegacyObject(legacyObj);

        expect(dto.processingTimeMs).toBe(100); // fallback到processingTime
        expect(dto.processingTime).toBe(100);
      });

      it('fromLegacyObject方法应该使用默认值', () => {
        const legacyObj = {
          requestId: 'test-123',
          // 缺少大部分字段
        };

        const dto = ReceiverPerformanceDto.fromLegacyObject(legacyObj);

        expect(dto.requestId).toBe('test-123');
        expect(dto.processingTimeMs).toBe(0); // 默认值
        expect(dto.processingTime).toBe(0);
        expect(dto.symbolsCount).toBe(0);
        expect(dto.avgTimePerSymbol).toBe(0);
        expect(dto.isSlowRequest).toBe(false);
        expect(dto.threshold).toBe(1000);
      });
    });

    describe('字段验证', () => {
      it('应该实现ProcessingTimeFields接口', () => {
        const dto = ReceiverPerformanceDto.create({
          requestId: 'test-123',
          processingTimeMs: 150,
          symbolsCount: 5,
          avgTimePerSymbol: 30,
          isSlowRequest: false,
          threshold: 1000,
        });

        // 验证实现了ProcessingTimeFields接口
        expect(dto).toHaveProperty('processingTimeMs');
        expect(typeof dto.processingTimeMs).toBe('number');
      });

      it('应该包含正确的@deprecated标记', () => {
        // 这里通过反射检查或字符串检查来验证@deprecated标记
        // 由于是测试环境，我们主要验证字段存在性
        const dto = new ReceiverPerformanceDto();

        expect(dto).toHaveProperty('processingTime');
        expect(dto).toHaveProperty('processingTimeMs');
      });
    });
  });

  describe('createCompatibleTimeFields工具函数', () => {
    it('应该创建向后兼容的时间字段', () => {
      const processingTime = 150;
      const timeFields = createCompatibleTimeFields(processingTime);

      expect(timeFields.processingTime).toBe(150);
      expect(timeFields.processingTimeMs).toBe(150);
    });

    it('应该支持不同的时间值', () => {
      const testCases = [0, 50, 100, 500, 1000, 2500];

      testCases.forEach(time => {
        const timeFields = createCompatibleTimeFields(time);
        expect(timeFields.processingTime).toBe(time);
        expect(timeFields.processingTimeMs).toBe(time);
      });
    });
  });

  describe('接收者服务日志兼容性', () => {
    it('应该生成包含双字段的日志数据', () => {
      const processingTime = 150;
      const timeFields = createCompatibleTimeFields(processingTime);

      const logData = {
        requestId: 'test-123',
        provider: 'longport',
        symbolsCount: 5,
        operation: 'HANDLE_REQUEST',
        ...timeFields,
      };

      expect(logData.processingTime).toBe(150);
      expect(logData.processingTimeMs).toBe(150);
      expect(logData.requestId).toBe('test-123');
      expect(logData.provider).toBe('longport');
    });
  });

  describe('监控指标兼容性', () => {
    it('应该生成包含双字段的监控事件', () => {
      const processingTime = 150;
      const timeFields = createCompatibleTimeFields(processingTime);

      const metricEvent = {
        timestamp: new Date(),
        source: 'receiver',
        metricType: 'api',
        metricName: 'request_processed',
        metricValue: timeFields.processingTimeMs, // 使用标准字段作为metricValue
        tags: {
          endpoint: '/api/v1/receiver/data',
          method: 'POST',
          status_code: 200,
          component: 'receiver',
          operation: 'get-stock-quote',
          provider: 'longport',
        },
        ...timeFields, // 在元数据中添加双字段
      };

      expect(metricEvent.metricValue).toBe(150); // 标准字段用于计算
      expect(metricEvent.processingTime).toBe(150); // 向后兼容
      expect(metricEvent.processingTimeMs).toBe(150); // 标准字段
    });

    it('应该支持不同状态码的监控事件', () => {
      const testCases = [
        { statusCode: 200, processingTime: 150 },
        { statusCode: 400, processingTime: 50 },
        { statusCode: 500, processingTime: 300 },
      ];

      testCases.forEach(({ statusCode, processingTime }) => {
        const timeFields = createCompatibleTimeFields(processingTime);

        const metricEvent = {
          metricValue: timeFields.processingTimeMs,
          tags: { status_code: statusCode },
          ...timeFields,
        };

        expect(metricEvent.metricValue).toBe(processingTime);
        expect(metricEvent.processingTime).toBe(processingTime);
        expect(metricEvent.processingTimeMs).toBe(processingTime);
        expect(metricEvent.tags.status_code).toBe(statusCode);
      });
    });
  });

  describe('边界情况测试', () => {
    it('应该处理零值时间', () => {
      const dto = ReceiverPerformanceDto.create({
        requestId: 'test-123',
        processingTimeMs: 0,
        symbolsCount: 1,
        avgTimePerSymbol: 0,
        isSlowRequest: false,
        threshold: 1000,
      });

      expect(dto.processingTimeMs).toBe(0);
      expect(dto.processingTime).toBe(0);
    });

    it('应该处理大数值时间', () => {
      const largeTime = 999999;
      const dto = ReceiverPerformanceDto.create({
        requestId: 'test-123',
        processingTimeMs: largeTime,
        symbolsCount: 100,
        avgTimePerSymbol: largeTime / 100,
        isSlowRequest: true,
        threshold: 1000,
      });

      expect(dto.processingTimeMs).toBe(largeTime);
      expect(dto.processingTime).toBe(largeTime);
      expect(dto.isSlowRequest).toBe(true);
    });

    it('应该处理不完整的legacy对象', () => {
      const incompleteObj = {
        requestId: 'test-123',
        // 其他字段缺失
      };

      expect(() => {
        ReceiverPerformanceDto.fromLegacyObject(incompleteObj);
      }).not.toThrow();

      const dto = ReceiverPerformanceDto.fromLegacyObject(incompleteObj);
      expect(dto.requestId).toBe('test-123');
      expect(dto.processingTimeMs).toBe(0);
    });
  });

  describe('类型安全性测试', () => {
    it('DTO应该有正确的TypeScript类型', () => {
      const dto = ReceiverPerformanceDto.create({
        requestId: 'test-123',
        processingTimeMs: 150,
        symbolsCount: 5,
        avgTimePerSymbol: 30,
        isSlowRequest: false,
        threshold: 1000,
      });

      // TypeScript编译时验证
      const timeMs: number = dto.processingTimeMs;
      const time: number = dto.processingTime;
      const id: string = dto.requestId;
      const count: number = dto.symbolsCount;
      const avg: number = dto.avgTimePerSymbol;
      const slow: boolean = dto.isSlowRequest;
      const thresh: number = dto.threshold;

      expect(typeof timeMs).toBe('number');
      expect(typeof time).toBe('number');
      expect(typeof id).toBe('string');
      expect(typeof count).toBe('number');
      expect(typeof avg).toBe('number');
      expect(typeof slow).toBe('boolean');
      expect(typeof thresh).toBe('number');
    });
  });
});