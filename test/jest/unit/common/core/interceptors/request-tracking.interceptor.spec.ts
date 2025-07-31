import { RequestTrackingInterceptor } from '@common/core/interceptors/request-tracking.interceptor';
import { ExecutionContext, CallHandler } from '@nestjs/common';
import { of } from 'rxjs';

describe('RequestTrackingInterceptor', () => {
  let interceptor: RequestTrackingInterceptor;

  // 在每个测试用例之前，创建一个新的拦截器实例
  beforeEach(() => {
    interceptor = new RequestTrackingInterceptor();
  });

  // 测试 intercept 方法
  it('should set request and correlation IDs and headers', () => {
    // 模拟 Request 和 Response 对象
    const mockRequest: { headers: any; requestId?: string; correlationId?: string } = {
      headers: {},
    };
    const mockResponse = {
      setHeader: jest.fn(),
    };

    // 模拟 ExecutionContext
    const mockExecutionContext = {
      switchToHttp: () => ({
        getRequest: () => mockRequest,
        getResponse: () => mockResponse,
      }),
      getClass: () => class MockClass {},
      getHandler: () => function mockHandler() {},
      getArgs: () => [],
      getArgByIndex: jest.fn(),
      getType: jest.fn(),
    } as unknown as ExecutionContext;

    // 模拟 CallHandler
    const mockCallHandler: CallHandler = {
      handle: () => of({}),
    };

    // 调用 intercept 方法
    interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe();

    // 断言 requestId 和 correlationId 被设置到请求对象上
    expect(mockRequest.requestId).toBeDefined();
    expect(mockRequest.correlationId).toBeDefined();

    // 断言响应头被设置
    expect(mockResponse.setHeader).toHaveBeenCalledWith(
      'x-request-id',
      mockRequest.requestId,
    );
    expect(mockResponse.setHeader).toHaveBeenCalledWith(
      'x-correlation-id',
      mockRequest.correlationId,
    );
    expect(mockResponse.setHeader).toHaveBeenCalledWith(
      'x-request-timestamp',
      expect.any(String),
    );
  });

  // 测试当 x-correlation-id 存在时的情况
  it('should use existing x-correlation-id from headers', () => {
    // 模拟 Request 对象，包含 x-correlation-id
    const existingCorrelationId = 'existing-correlation-id';
    const mockRequest: { headers: any; requestId?: string; correlationId?: string } = {
      headers: {
        'x-correlation-id': existingCorrelationId,
      },
    };
    const mockResponse = {
      setHeader: jest.fn(),
    };

    // 模拟 ExecutionContext
    const mockExecutionContext = {
      switchToHttp: () => ({
        getRequest: () => mockRequest,
        getResponse: () => mockResponse,
      }),
      getClass: () => class MockClass {},
      getHandler: () => function mockHandler() {},
      getArgs: () => [],
      getArgByIndex: jest.fn(),
      getType: jest.fn(),
    } as unknown as ExecutionContext;

    // 模拟 CallHandler
    const mockCallHandler: CallHandler = {
      handle: () => of({}),
    };

    // 调用 intercept 方法
    interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe();

    // 断言 correlationId 使用了现有的值
    expect(mockRequest.correlationId).toBe(existingCorrelationId);
    expect(mockResponse.setHeader).toHaveBeenCalledWith(
      'x-correlation-id',
      existingCorrelationId,
    );
  });
});