import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, CallHandler } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Response, Request } from 'express';
import { Observable, of } from 'rxjs';

import { ResponseInterceptor } from '@common/core/interceptors/response.interceptor';
// // import { SYSTEM_STATUS_EVENTS } from '@monitoring/contracts/events/system-status.events';

describe('ResponseInterceptor', () => {
  let interceptor: ResponseInterceptor<any>;
  let eventEmitter: jest.Mocked<EventEmitter2>;
  let executionContext: jest.Mocked<ExecutionContext>;
  let callHandler: jest.Mocked<CallHandler>;
  let mockResponse: jest.Mocked<Response>;
  let mockRequest: jest.Mocked<Request>;

  beforeEach(async () => {
    const mockEventEmitter = {
      emit: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ResponseInterceptor,
        { provide: EventEmitter2, useValue: mockEventEmitter },
      ],
    }).compile();

    interceptor = module.get<ResponseInterceptor<any>>(ResponseInterceptor);
    eventEmitter = module.get(EventEmitter2) as jest.Mocked<EventEmitter2>;

    // Setup mock objects
    mockRequest = {
      method: 'GET',
      url: '/api/test',
      headers: {},
    } as jest.Mocked<Request>;

    mockResponse = {
      statusCode: 200,
    } as jest.Mocked<Response>;

    executionContext = {
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue(mockRequest),
        getResponse: jest.fn().mockReturnValue(mockResponse),
      }),
    } as any;

    callHandler = {
      handle: jest.fn(),
    } as jest.Mocked<CallHandler>;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('intercept', () => {
    it('should wrap response data in standard format', (done) => {
      const testData = { key: 'value' };
      callHandler.handle.mockReturnValue(of(testData));

      const result = interceptor.intercept(executionContext, callHandler);

      result.subscribe((response) => {
        expect(response).toEqual({
          statusCode: 200,
          message: '操作成功',
          data: testData,
          timestamp: expect.any(String),
        });
        done();
      });
    });

    it('should return already formatted response unchanged', (done) => {
      const preFormattedData = {
        statusCode: 201,
        message: '创建成功',
        data: { id: 1 },
        timestamp: new Date().toISOString(),
      };

      callHandler.handle.mockReturnValue(of(preFormattedData));

      const result = interceptor.intercept(executionContext, callHandler);

      result.subscribe((response) => {
        expect(response).toEqual(preFormattedData);
        done();
      });
    });

    it('should handle null/undefined data correctly', (done) => {
      callHandler.handle.mockReturnValue(of(undefined));

      const result = interceptor.intercept(executionContext, callHandler);

      result.subscribe((response) => {
        expect(response.data).toBeNull();
        done();
      });
    });

    it('should emit performance metrics', (done) => {
      callHandler.handle.mockReturnValue(of({ data: 'test' }));

      const result = interceptor.intercept(executionContext, callHandler);

      result.subscribe(() => {
        // Use setImmediate to wait for the async emit
        setImmediate(() => {
          expect(eventEmitter.emit).toHaveBeenCalledWith(
//             SYSTEM_STATUS_EVENTS.METRIC_COLLECTED,
            expect.objectContaining({
              source: 'response_interceptor',
              metricType: 'performance',
              metricName: 'http_request_duration',
              metricValue: expect.any(Number),
              tags: expect.objectContaining({
                method: 'GET',
                url: '/api/test',
                status_code: 200,
                status: 'success',
              }),
            }),
          );
          done();
        });
      });
    });

    it('should handle different status codes with correct messages', (done) => {
      mockResponse.statusCode = 201;
      callHandler.handle.mockReturnValue(of({ created: true }));

      const result = interceptor.intercept(executionContext, callHandler);

      result.subscribe((response) => {
        expect(response.statusCode).toBe(201);
        expect(response.message).toBe('创建成功');
        done();
      });
    });

    it('should mark error status correctly in metrics', (done) => {
      mockResponse.statusCode = 400;
      callHandler.handle.mockReturnValue(of({ error: 'bad request' }));

      const result = interceptor.intercept(executionContext, callHandler);

      result.subscribe(() => {
        setImmediate(() => {
          expect(eventEmitter.emit).toHaveBeenCalledWith(
//             SYSTEM_STATUS_EVENTS.METRIC_COLLECTED,
            expect.objectContaining({
              tags: expect.objectContaining({
                status: 'error',
              }),
            }),
          );
          done();
        });
      });
    });
  });

  describe('sanitizeUrl', () => {
    it('should sanitize sensitive parameters in URL', (done) => {
      mockRequest.url = '/api/test?password=secret&key=value&normal=param';
      callHandler.handle.mockReturnValue(of({}));

      const result = interceptor.intercept(executionContext, callHandler);

      result.subscribe(() => {
        setImmediate(() => {
          expect(eventEmitter.emit).toHaveBeenCalledWith(
//             SYSTEM_STATUS_EVENTS.METRIC_COLLECTED,
            expect.objectContaining({
              tags: expect.objectContaining({
                url: '/api/test?password=[REDACTED]&key=[REDACTED]&normal=param',
              }),
            }),
          );
          done();
        });
      });
    });

    it('should handle various sensitive parameter names', (done) => {
      mockRequest.url = '/api/test?token=abc&secret=def&apikey=ghi&authorization=jkl';
      callHandler.handle.mockReturnValue(of({}));

      const result = interceptor.intercept(executionContext, callHandler);

      result.subscribe(() => {
        setImmediate(() => {
          const call = eventEmitter.emit.mock.calls[0];
          const sanitizedUrl = call[1].tags.url;

          expect(sanitizedUrl).toContain('token=[REDACTED]');
          expect(sanitizedUrl).toContain('secret=[REDACTED]');
          expect(sanitizedUrl).toContain('apikey=[REDACTED]');
          expect(sanitizedUrl).toContain('authorization=[REDACTED]');
          done();
        });
      });
    });

    it('should handle malformed URLs gracefully', (done) => {
      mockRequest.url = 'not-a-valid-url?param=value';
      callHandler.handle.mockReturnValue(of({}));

      const result = interceptor.intercept(executionContext, callHandler);

      result.subscribe(() => {
        setImmediate(() => {
          expect(eventEmitter.emit).toHaveBeenCalledWith(
//             SYSTEM_STATUS_EVENTS.METRIC_COLLECTED,
            expect.objectContaining({
              tags: expect.objectContaining({
                url: 'not-a-valid-url?[REDACTED]',
              }),
            }),
          );
          done();
        });
      });
    });

    it('should handle URLs without query parameters', (done) => {
      mockRequest.url = '/api/test';
      callHandler.handle.mockReturnValue(of({}));

      const result = interceptor.intercept(executionContext, callHandler);

      result.subscribe(() => {
        setImmediate(() => {
          expect(eventEmitter.emit).toHaveBeenCalledWith(
//             SYSTEM_STATUS_EVENTS.METRIC_COLLECTED,
            expect.objectContaining({
              tags: expect.objectContaining({
                url: '/api/test',
              }),
            }),
          );
          done();
        });
      });
    });
  });

  describe('getDefaultMessage', () => {
    const testCases = [
      { statusCode: 200, expected: '操作成功' },
      { statusCode: 201, expected: '创建成功' },
      { statusCode: 202, expected: '请求已接受' },
      { statusCode: 204, expected: '操作成功' },
      { statusCode: 299, expected: '请求完成' },
      { statusCode: 404, expected: '请求完成' },
    ];

    testCases.forEach(({ statusCode, expected }) => {
      it(`should return "${expected}" for status code ${statusCode}`, (done) => {
        mockResponse.statusCode = statusCode;
        callHandler.handle.mockReturnValue(of({}));

        const result = interceptor.intercept(executionContext, callHandler);

        result.subscribe((response) => {
          expect(response.message).toBe(expected);
          done();
        });
      });
    });
  });

  describe('performance tracking', () => {
    it('should measure request duration accurately', (done) => {
      const startTime = Date.now();
      callHandler.handle.mockReturnValue(
        new Observable((subscriber) => {
          setTimeout(() => {
            subscriber.next({ data: 'test' });
            subscriber.complete();
          }, 100);
        }),
      );

      const result = interceptor.intercept(executionContext, callHandler);

      result.subscribe(() => {
        setImmediate(() => {
          const call = eventEmitter.emit.mock.calls[0];
          const duration = call[1].metricValue;

          expect(duration).toBeGreaterThanOrEqual(100);
          expect(duration).toBeLessThan(200); // Allow some tolerance
          done();
        });
      });
    });

    it('should include request metadata in metrics', (done) => {
      mockRequest.method = 'POST';
      mockRequest.url = '/api/create';
      mockResponse.statusCode = 201;
      callHandler.handle.mockReturnValue(of({}));

      const result = interceptor.intercept(executionContext, callHandler);

      result.subscribe(() => {
        setImmediate(() => {
          expect(eventEmitter.emit).toHaveBeenCalledWith(
//             SYSTEM_STATUS_EVENTS.METRIC_COLLECTED,
            expect.objectContaining({
              tags: {
                method: 'POST',
                url: '/api/create',
                status_code: 201,
                status: 'success',
              },
            }),
          );
          done();
        });
      });
    });
  });

  describe('edge cases', () => {
    it('should handle missing request gracefully', (done) => {
      const contextWithoutRequest = {
        switchToHttp: jest.fn().mockReturnValue({
          getRequest: jest.fn().mockReturnValue(null),
          getResponse: jest.fn().mockReturnValue(mockResponse),
        }),
      } as any;

      callHandler.handle.mockReturnValue(of({}));

      const result = interceptor.intercept(contextWithoutRequest, callHandler);

      result.subscribe((response) => {
        expect(response).toEqual({
          statusCode: 200,
          message: '操作成功',
          data: {},
          timestamp: expect.any(String),
        });
        done();
      });
    });

    it('should handle complex nested data structures', (done) => {
      const complexData = {
        user: { id: 1, name: 'test' },
        items: [{ id: 1 }, { id: 2 }],
        metadata: { count: 2, hasMore: false },
      };

      callHandler.handle.mockReturnValue(of(complexData));

      const result = interceptor.intercept(executionContext, callHandler);

      result.subscribe((response) => {
        expect(response.data).toEqual(complexData);
        expect(response.statusCode).toBe(200);
        done();
      });
    });

    it('should handle empty string data', (done) => {
      callHandler.handle.mockReturnValue(of(''));

      const result = interceptor.intercept(executionContext, callHandler);

      result.subscribe((response) => {
        expect(response.data).toBe('');
        done();
      });
    });

    it('should handle zero as valid data', (done) => {
      callHandler.handle.mockReturnValue(of(0));

      const result = interceptor.intercept(executionContext, callHandler);

      result.subscribe((response) => {
        expect(response.data).toBe(0);
        done();
      });
    });

    it('should handle false as valid data', (done) => {
      callHandler.handle.mockReturnValue(of(false));

      const result = interceptor.intercept(executionContext, callHandler);

      result.subscribe((response) => {
        expect(response.data).toBe(false);
        done();
      });
    });
  });
});