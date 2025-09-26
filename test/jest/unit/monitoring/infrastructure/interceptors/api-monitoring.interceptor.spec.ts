/**
 * ApiMonitoringInterceptor Unit Tests
 * 测试API监控拦截器的功能
 */

import { of, throwError } from 'rxjs';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ApiMonitoringInterceptor } from '@monitoring/infrastructure/interceptors/api-monitoring.interceptor';
import { SYSTEM_STATUS_EVENTS } from '@monitoring/contracts/events/system-status.events';
import { createLogger } from '@common/logging/index';
import { MONITORING_SYSTEM_LIMITS } from '@monitoring/constants/config/monitoring-system.constants';

// Mock dependencies
jest.mock('@common/logging/index');

describe('ApiMonitoringInterceptor', () => {
  let interceptor: ApiMonitoringInterceptor;
  let eventBus: jest.Mocked<EventEmitter2>;
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

    interceptor = new ApiMonitoringInterceptor(eventBus);
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
  });

  describe('intercept', () => {
    it('should emit API request started event', (done) => {
      const request = {
        path: '/api/test',
        method: 'GET',
        requestId: 'test-request-id',
        ip: '127.0.0.1',
        headers: {
          'user-agent': 'test-agent',
          'content-length': '100',
          'referer': 'https://test.com'
        }
      };

      const response = {
        statusCode: 200,
        get: jest.fn().mockReturnValue('200')
      };

      const context = {
        switchToHttp: () => ({
          getRequest: () => request,
          getResponse: () => response
        })
      };

      const next = {
        handle: () => of({ data: 'test' })
      };

      interceptor.intercept(context as any, next as any).subscribe({
        complete: () => {
          // Wait for setImmediate to execute
          setImmediate(() => {
            expect(eventBus.emit).toHaveBeenCalledWith(
              SYSTEM_STATUS_EVENTS.API_REQUEST_STARTED,
              expect.objectContaining({
                timestamp: expect.any(Date),
                source: 'api',
                endpoint: '/api/test',
                method: 'GET',
                requestId: 'test-request-id',
                metadata: {
                  ip: '127.0.0.1',
                  userAgent: 'test-agent',
                  contentLength: '100',
                  referer: 'https://test.com'
                }
              })
            );
            done();
          });
        }
      });
    });

    it('should emit API request completed event on success', (done) => {
      const startTime = Date.now();
      const request = {
        path: '/api/test',
        method: 'POST',
        requestId: 'test-request-id'
      };

      const response = {
        statusCode: 201,
        get: jest.fn().mockImplementation((header) => {
          if (header === 'content-length') return '150';
          if (header === 'x-cache-hit') return 'true';
          return undefined;
        })
      };

      const context = {
        switchToHttp: () => ({
          getRequest: () => request,
          getResponse: () => response
        })
      };

      const next = {
        handle: () => of({ result: 'success' })
      };

      interceptor.intercept(context as any, next as any).subscribe({
        complete: () => {
          // Wait for setImmediate to execute
          setImmediate(() => {
            expect(eventBus.emit).toHaveBeenCalledWith(
              SYSTEM_STATUS_EVENTS.API_REQUEST_COMPLETED,
              expect.objectContaining({
                timestamp: expect.any(Date),
                source: 'api',
                endpoint: '/api/test',
                method: 'POST',
                statusCode: 201,
                duration: expect.any(Number),
                requestId: 'test-request-id',
                metadata: {
                  responseSize: '150',
                  cacheHit: true,
                  processingTimeMs: expect.any(Number)
                }
              })
            );
            done();
          });
        }
      });
    });

    it('should emit API request error event on failure', (done) => {
      const request = {
        path: '/api/test',
        method: 'PUT',
        requestId: 'test-request-id'
      };

      const response = {
        statusCode: 500,
        get: jest.fn()
      };

      const context = {
        switchToHttp: () => ({
          getRequest: () => request,
          getResponse: () => response
        })
      };

      const error = new Error('Test error');
      (error as any).status = 500;

      const next = {
        handle: () => throwError(() => error)
      };

      interceptor.intercept(context as any, next as any).subscribe({
        error: () => {
          // Wait for setImmediate to execute
          setImmediate(() => {
            expect(eventBus.emit).toHaveBeenCalledWith(
              SYSTEM_STATUS_EVENTS.API_REQUEST_ERROR,
              expect.objectContaining({
                timestamp: expect.any(Date),
                source: 'api',
                endpoint: '/api/test',
                method: 'PUT',
                statusCode: 500,
                duration: expect.any(Number),
                requestId: 'test-request-id',
                metadata: {
                  errorType: 'Error',
                  errorMessage: 'Test error',
                  processingTimeMs: expect.any(Number)
                }
              })
            );
            done();
          });
        }
      });
    });

    it('should use fallback request ID when not provided', (done) => {
      const request = {
        path: '/api/test',
        method: 'GET'
        // No requestId property
      };

      const response = {
        statusCode: 200,
        get: jest.fn()
      };

      const context = {
        switchToHttp: () => ({
          getRequest: () => request,
          getResponse: () => response
        })
      };

      const next = {
        handle: () => of({ data: 'test' })
      };

      interceptor.intercept(context as any, next as any).subscribe({
        complete: () => {
          // Wait for setImmediate to execute
          setImmediate(() => {
            expect(eventBus.emit).toHaveBeenCalledWith(
              SYSTEM_STATUS_EVENTS.API_REQUEST_STARTED,
              expect.objectContaining({
                requestId: expect.stringContaining('fallback_req_')
              })
            );
            done();
          });
        }
      });
    });

    it('should estimate response size correctly', (done) => {
      const request = {
        path: '/api/test',
        method: 'POST',
        requestId: 'test-request-id'
      };

      const response = {
        statusCode: 200,
        get: jest.fn().mockReturnValue(undefined) // No content-length header
      };

      const context = {
        switchToHttp: () => ({
          getRequest: () => request,
          getResponse: () => response
        })
      };

      const next = {
        handle: () => of({ message: 'Hello World' }) // String response
      };

      interceptor.intercept(context as any, next as any).subscribe({
        complete: () => {
          // Wait for setImmediate to execute
          setImmediate(() => {
            expect(eventBus.emit).toHaveBeenCalledWith(
              SYSTEM_STATUS_EVENTS.API_REQUEST_COMPLETED,
              expect.objectContaining({
                metadata: expect.objectContaining({
                  responseSize: expect.any(Number)
                })
              })
            );
            done();
          });
        }
      });
    });
  });

  describe('emitEvent', () => {
    it('should emit event successfully', () => {
      const eventType = 'test.event';
      const eventData = { test: 'data' };

      (interceptor as any).emitEvent(eventType, eventData);

      expect(eventBus.emit).toHaveBeenCalledWith(eventType, eventData);
    });

    it('should handle event emission errors gracefully', () => {
      const eventType = 'test.event';
      const eventData = { test: 'data' };
      
      eventBus.emit.mockImplementation(() => {
        throw new Error('Emission failed');
      });

      (interceptor as any).emitEvent(eventType, eventData);

      expect(mockLogger.debug).toHaveBeenCalledWith(
        'ApiMonitoringInterceptor: API监控事件发送失败',
        expect.objectContaining({
          component: 'ApiMonitoringInterceptor',
          operation: 'emitEvent',
          eventType: 'test.event',
          error: 'Emission failed',
          success: false
        })
      );
    });
  });

  describe('getFallbackRequestId', () => {
    it('should generate fallback request ID', () => {
      const requestId1 = (interceptor as any).getFallbackRequestId();
      const requestId2 = (interceptor as any).getFallbackRequestId();

      expect(requestId1).toMatch(/^fallback_req_\d+_[a-z0-9]+$/);
      expect(requestId2).toMatch(/^fallback_req_\d+_[a-z0-9]+$/);
      expect(requestId1).not.toBe(requestId2);
    });
  });

  describe('estimateResponseSize', () => {
    it('should return 0 for null or undefined data', () => {
      expect((interceptor as any).estimateResponseSize(null)).toBe(0);
      expect((interceptor as any).estimateResponseSize(undefined)).toBe(0);
    });

    it('should estimate size for string data', () => {
      const size = (interceptor as any).estimateResponseSize('Hello World');
      expect(size).toBe(11); // 11 bytes for "Hello World"
    });

    it('should estimate size for object data', () => {
      const data = { message: 'Hello World' };
      const size = (interceptor as any).estimateResponseSize(data);
      expect(size).toBe(JSON.stringify(data).length);
    });

    it('should estimate size for number data', () => {
      const size = (interceptor as any).estimateResponseSize(12345);
      expect(size).toBe(5); // 5 bytes for "12345"
    });

    it('should return 0 when estimation fails', () => {
      // Mock JSON.stringify to throw an error
      const originalStringify = JSON.stringify;
      JSON.stringify = jest.fn(() => {
        throw new Error('Stringify failed');
      });

      const size = (interceptor as any).estimateResponseSize({ test: 'data' });
      expect(size).toBe(0);

      // Restore original function
      JSON.stringify = originalStringify;
    });
  });

  describe('shouldMonitorRequest', () => {
    it('should monitor normal requests', () => {
      const request = { path: '/api/users' };
      const shouldMonitor = (interceptor as any).shouldMonitorRequest(request);
      expect(shouldMonitor).toBe(true);
    });

    it('should not monitor health check requests', () => {
      const request = { path: '/health/status' };
      const shouldMonitor = (interceptor as any).shouldMonitorRequest(request);
      expect(shouldMonitor).toBe(false);
    });

    it('should not monitor metrics requests', () => {
      const request = { path: '/metrics' };
      const shouldMonitor = (interceptor as any).shouldMonitorRequest(request);
      expect(shouldMonitor).toBe(false);
    });

    it('should not monitor internal requests', () => {
      const request = { path: '/_internal/status' };
      const shouldMonitor = (interceptor as any).shouldMonitorRequest(request);
      expect(shouldMonitor).toBe(false);
    });

    it('should not monitor swagger requests', () => {
      const request = { path: '/swagger/ui' };
      const shouldMonitor = (interceptor as any).shouldMonitorRequest(request);
      expect(shouldMonitor).toBe(false);
    });

    it('should not monitor favicon requests', () => {
      const request = { path: '/favicon.ico' };
      const shouldMonitor = (interceptor as any).shouldMonitorRequest(request);
      expect(shouldMonitor).toBe(false);
    });
  });

  describe('getInterceptorMetrics', () => {
    it('should return interceptor metrics', () => {
      const metrics = interceptor.getInterceptorMetrics();

      expect(metrics).toEqual({
        name: 'ApiMonitoringInterceptor',
        status: 'active',
        description: 'API请求生命周期监控拦截器',
        eventsSupported: [
          'API_REQUEST_STARTED',
          'API_REQUEST_COMPLETED',
          'API_REQUEST_ERROR'
        ]
      });
    });
  });
});