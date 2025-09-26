/**
 * InfrastructureInterceptor Unit Tests
 * 测试基础设施拦截器的功能
 */

import { of, throwError } from 'rxjs';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Reflector } from '@nestjs/core';
import { InfrastructureInterceptor } from '@monitoring/infrastructure/interceptors/infrastructure.interceptor';
import { SYSTEM_STATUS_EVENTS } from '@monitoring/contracts/events/system-status.events';
import { createLogger } from '@common/logging/index';
import { MONITORING_SYSTEM_LIMITS } from '@monitoring/constants/config/monitoring-system.constants';

// Mock dependencies
jest.mock('@common/logging/index');

describe('InfrastructureInterceptor', () => {
  let interceptor: InfrastructureInterceptor;
  let eventBus: jest.Mocked<EventEmitter2>;
  let reflector: jest.Mocked<Reflector>;
  let mockLogger: any;

  beforeEach(() => {
    mockLogger = {
      debug: jest.fn(),
      error: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
    };

    (createLogger as jest.Mock).mockReturnValue(mockLogger);

    eventBus = {
      emit: jest.fn(),
      on: jest.fn(),
      off: jest.fn(),
      removeAllListeners: jest.fn(),
    } as any;

    reflector = {
      get: jest.fn(),
    } as any;

    interceptor = new InfrastructureInterceptor(eventBus, reflector);
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
  });

  describe('intercept', () => {
    it('should emit performance metrics for successful requests', (done) => {
      const request = {
        route: { path: '/api/test' },
        method: 'GET',
      };

      const response = {
        statusCode: 200,
      };

      const context = {
        switchToHttp: () => ({
          getRequest: () => request,
          getResponse: () => response,
        }),
        getHandler: () => ({ name: 'testHandler' }),
        getClass: () => ({ name: 'TestController' }),
      };

      const next = {
        handle: () => of({ data: 'test' }),
      };

      interceptor.intercept(context as any, next as any).subscribe({
        complete: () => {
          // Wait for setImmediate to execute
          setImmediate(() => {
            expect(eventBus.emit).toHaveBeenCalledWith(
              SYSTEM_STATUS_EVENTS.METRIC_COLLECTED,
              expect.objectContaining({
                timestamp: expect.any(Date),
                source: 'infrastructure_interceptor',
                metricType: 'performance',
                metricName: 'http_request_processed',
                metricValue: expect.any(Number),
                tags: {
                  route: '/api/test',
                  method: 'GET',
                  status_code: 200,
                  success: true,
                  handler: 'testHandler',
                  controller: 'TestController',
                  operation: 'GET /api/test',
                  layer: 'infrastructure',
                },
              })
            );
            done();
          });
        },
      });
    });

    it('should emit performance metrics for failed requests', (done) => {
      const request = {
        route: { path: '/api/test' },
        method: 'POST',
      };

      const response = {
        statusCode: 500,
      };

      const context = {
        switchToHttp: () => ({
          getRequest: () => request,
          getResponse: () => response,
        }),
        getHandler: () => ({ name: 'testHandler' }),
        getClass: () => ({ name: 'TestController' }),
      };

      const error = new Error('Test error');

      const next = {
        handle: () => throwError(() => error),
      };

      interceptor.intercept(context as any, next as any).subscribe({
        error: () => {
          // Wait for setImmediate to execute
          setImmediate(() => {
            expect(eventBus.emit).toHaveBeenCalledWith(
              SYSTEM_STATUS_EVENTS.METRIC_COLLECTED,
              expect.objectContaining({
                timestamp: expect.any(Date),
                source: 'infrastructure_interceptor',
                metricType: 'performance',
                metricName: 'http_request_processed',
                metricValue: expect.any(Number),
                tags: {
                  route: '/api/test',
                  method: 'POST',
                  status_code: 500,
                  success: false,
                  handler: 'testHandler',
                  controller: 'TestController',
                  error: 'Test error',
                  operation: 'POST /api/test',
                  layer: 'infrastructure',
                },
              })
            );
            done();
          });
        },
      });
    });

    it('should use request URL when route is not available', (done) => {
      const request = {
        url: '/api/test',
        method: 'GET',
      };

      const response = {
        statusCode: 200,
      };

      const context = {
        switchToHttp: () => ({
          getRequest: () => request,
          getResponse: () => response,
        }),
        getHandler: () => ({ name: 'testHandler' }),
        getClass: () => ({ name: 'TestController' }),
      };

      const next = {
        handle: () => of({ data: 'test' }),
      };

      interceptor.intercept(context as any, next as any).subscribe({
        complete: () => {
          // Wait for setImmediate to execute
          setImmediate(() => {
            expect(eventBus.emit).toHaveBeenCalledWith(
              SYSTEM_STATUS_EVENTS.METRIC_COLLECTED,
              expect.objectContaining({
                tags: expect.objectContaining({
                  route: '/api/test',
                }),
              })
            );
            done();
          });
        },
      });
    });

    it('should use server error threshold when response status is not set', (done) => {
      const request = {
        route: { path: '/api/test' },
        method: 'GET',
      };

      const response = {};

      const context = {
        switchToHttp: () => ({
          getRequest: () => request,
          getResponse: () => response,
        }),
        getHandler: () => ({ name: 'testHandler' }),
        getClass: () => ({ name: 'TestController' }),
      };

      const error = new Error('Test error');

      const next = {
        handle: () => throwError(() => error),
      };

      interceptor.intercept(context as any, next as any).subscribe({
        error: () => {
          // Wait for setImmediate to execute
          setImmediate(() => {
            expect(eventBus.emit).toHaveBeenCalledWith(
              SYSTEM_STATUS_EVENTS.METRIC_COLLECTED,
              expect.objectContaining({
                tags: expect.objectContaining({
                  status_code: MONITORING_SYSTEM_LIMITS.HTTP_SERVER_ERROR_THRESHOLD,
                }),
              })
            );
            done();
          });
        },
      });
    });
  });

  describe('recordPerformanceMetrics', () => {
    it('should log slow requests', () => {
      const data = {
        route: '/api/slow',
        method: 'GET',
        duration: MONITORING_SYSTEM_LIMITS.SLOW_REQUEST_THRESHOLD_MS + 100, // Above threshold
        statusCode: 200,
        success: true,
        handler: 'slowHandler',
        controller: 'SlowController',
      };

      (interceptor as any).recordPerformanceMetrics(data);

      expect(mockLogger.warn).toHaveBeenCalledWith(
        '慢请求检测',
        expect.objectContaining({
          route: '/api/slow',
          method: 'GET',
          duration: MONITORING_SYSTEM_LIMITS.SLOW_REQUEST_THRESHOLD_MS + 100,
        })
      );
    });

    it('should not log fast requests as slow', () => {
      const data = {
        route: '/api/fast',
        method: 'GET',
        duration: MONITORING_SYSTEM_LIMITS.SLOW_REQUEST_THRESHOLD_MS - 100, // Below threshold
        statusCode: 200,
        success: true,
        handler: 'fastHandler',
        controller: 'FastController',
      };

      (interceptor as any).recordPerformanceMetrics(data);

      expect(mockLogger.warn).not.toHaveBeenCalled();
    });

    it('should handle errors when recording performance metrics', () => {
      eventBus.emit.mockImplementation(() => {
        throw new Error('Emit error');
      });

      const data = {
        route: '/api/test',
        method: 'GET',
        duration: 100,
        statusCode: 200,
        success: true,
        handler: 'testHandler',
        controller: 'TestController',
      };

      (interceptor as any).recordPerformanceMetrics(data);

      expect(mockLogger.error).toHaveBeenCalledWith(
        '性能指标记录失败',
        expect.objectContaining({
          error: 'Emit error',
          route: '/api/test',
          method: 'GET',
        })
      );
    });
  });
});