/* eslint-disable @typescript-eslint/no-unused-vars */
import { SetMetadata } from '@nestjs/common';
import {
  PerformanceMonitoring,
  LightPerformanceMonitoring,
  NoPerformanceMonitoring,
  PERFORMANCE_MONITORING_KEY,
} from '@common/core/decorators/performance-monitoring.decorator';

// 模拟 @nestjs/common 模块
jest.mock('@nestjs/common', () => ({
  SetMetadata: jest.fn().mockReturnValue(() => {}), // SetMetadata should return a decorator function
}));

describe('Performance Monitoring Decorators', () => {
  // 在每个测试用例之前，清除 mock 的调用记录
  beforeEach(() => {
    (SetMetadata as jest.Mock).mockClear();
  });

  // 测试 PerformanceMonitoring 装饰器
  it('PerformanceMonitoring should set metadata with default config', () => {
    // 调用装饰器
    const decorator = PerformanceMonitoring();
    decorator(TestClass);

    // 断言 SetMetadata 被调用，并检查其参数
    expect(SetMetadata).toHaveBeenCalledWith(
      PERFORMANCE_MONITORING_KEY,
      expect.objectContaining({
        enabled: true,
        trackSlowRequests: true,
        slowRequestThreshold: 1000,
        recordMetrics: true,
        sampleRate: 1.0,
      }),
    );
  });

  // 测试 PerformanceMonitoring 装饰器带自定义配置
  it('PerformanceMonitoring should set metadata with custom config', () => {
    // 调用装饰器，传入自定义配置
    const decorator = PerformanceMonitoring({ slowRequestThreshold: 500, sampleRate: 0.5 });
    decorator(TestClass);

    // 断言 SetMetadata 被调用，并检查其参数
    expect(SetMetadata).toHaveBeenCalledWith(
      PERFORMANCE_MONITORING_KEY,
      expect.objectContaining({
        enabled: true,
        trackSlowRequests: true,
        slowRequestThreshold: 500,
        recordMetrics: true,
        sampleRate: 0.5,
      }),
    );
  });

  // 测试 LightPerformanceMonitoring 装饰器
  it('LightPerformanceMonitoring should set metadata with light config', () => {
    // 调用装饰器
    const decorator = LightPerformanceMonitoring();
    decorator(TestClass);

    // 断言 SetMetadata 被调用，并检查其参数
    expect(SetMetadata).toHaveBeenCalledWith(
      PERFORMANCE_MONITORING_KEY,
      expect.objectContaining({
        enabled: true,
        trackSlowRequests: true,
        slowRequestThreshold: 2000,
        recordMetrics: false,
        sampleRate: 0.1,
      }),
    );
  });

  // 测试 NoPerformanceMonitoring 装饰器
  it('NoPerformanceMonitoring should set metadata to disable monitoring', () => {
    // 调用装饰器
    const decorator = NoPerformanceMonitoring();
    decorator(TestClass);

    // 断言 SetMetadata 被调用，并检查其参数
    expect(SetMetadata).toHaveBeenCalledWith(
      PERFORMANCE_MONITORING_KEY,
      expect.objectContaining({
        enabled: false,
        trackSlowRequests: false,
        recordMetrics: false,
        sampleRate: 0,
      }),
    );
  });
});

// 测试用类
class TestClass {}