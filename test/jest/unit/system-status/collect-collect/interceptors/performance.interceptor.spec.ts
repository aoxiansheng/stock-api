/* eslint-disable @typescript-eslint/no-unused-vars */
import { Test, TestingModule } from "@nestjs/testing";
import {
  CallHandler,
  ExecutionContext,
  HttpException,
  HttpStatus,
} from "@nestjs/common";
import { of, throwError } from "rxjs";

import { PerformanceInterceptor } from "../../../../../src/metrics/interceptors/performance.interceptor";
import { MetricsPerformanceService } from "../../../../../src/metrics/services/metrics-performance.service";
import { Reflector } from "@nestjs/core";

describe("PerformanceInterceptor", () => {
  let interceptor: PerformanceInterceptor;
  let MetricsPerformanceService: jest.Mocked<MetricsPerformanceService>;

  beforeEach(async () => {
    const mockMetricsPerformanceService = {
      recordRequest: jest.fn(),
      wrapWithTiming: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PerformanceInterceptor,
        {
          provide: MetricsPerformanceService,
          useValue: mockMetricsPerformanceService,
        },
        Reflector, // 修复：添加 Reflector 依赖
      ],
    }).compile();

    interceptor = module.get<PerformanceInterceptor>(PerformanceInterceptor);
    MetricsPerformanceService = module.get(MetricsPerformanceService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("PerformanceInterceptor - Definition", () => {
    it("should be defined", () => {
      expect(interceptor).toBeDefined();
    });

    it("should have MetricsPerformanceService dependency", () => {
      expect(MetricsPerformanceService).toBeDefined();
    });
  });

  describe("intercept", () => {
    let mockExecutionContext: jest.Mocked<ExecutionContext>;
    let mockCallHandler: jest.Mocked<CallHandler>;
    let mockGetRequest: jest.Mock;

    // 创建一个模拟的类和方法，为 Reflector 提供目标
    class MockController {}
    const mockHandler = () => {};

    beforeEach(() => {
      mockGetRequest = jest.fn().mockReturnValue({
        method: "GET",
        url: "/api/v1/test",
        route: { path: "/api/v1/test" },
      });

      const mockGetResponse = jest.fn().mockReturnValue({
        setHeader: jest.fn(),
      });

      mockExecutionContext = {
        switchToHttp: jest.fn().mockReturnValue({
          getRequest: mockGetRequest,
          getResponse: mockGetResponse,
        }),
        getHandler: jest.fn().mockReturnValue(mockHandler),
        getClass: jest.fn().mockReturnValue(MockController),
        getArgs: jest.fn(),
        getArgByIndex: jest.fn(),
        switchToRpc: jest.fn(),
        switchToWs: jest.fn(),
        getType: jest.fn(),
      };

      mockCallHandler = {
        handle: jest.fn(),
      };
    });

    it("should record successful request performance", (done) => {
      const responseData = { message: "success" };
      const startTime = Date.now();

      mockCallHandler.handle.mockReturnValue(of(responseData));
      MetricsPerformanceService.recordRequest.mockResolvedValue();

      // Mock Date.now to control timing
      const originalDateNow = Date.now;
      let callCount = 0;
      Date.now = jest.fn(() => {
        callCount++;
        return callCount === 1 ? startTime : startTime + 150; // 150ms duration
      });

      const result$ = interceptor.intercept(
        mockExecutionContext,
        mockCallHandler,
      );

      result$.subscribe({
        next: (data) => {
          expect(data).toEqual(responseData);
        },
        complete: () => {
          expect(MetricsPerformanceService.recordRequest).toHaveBeenCalledWith(
            "/api/v1/test",
            "GET",
            150,
            true,
          );
          Date.now = originalDateNow;
          done();
        },
      });
    });

    it("should record failed request performance on HTTP exception", (done) => {
      const httpException = new HttpException(
        "Bad Request",
        HttpStatus.BAD_REQUEST,
      );
      const startTime = Date.now();

      mockCallHandler.handle.mockReturnValue(throwError(() => httpException));
      MetricsPerformanceService.recordRequest.mockResolvedValue();

      // Mock Date.now to control timing
      const originalDateNow = Date.now;
      let callCount = 0;
      Date.now = jest.fn(() => {
        callCount++;
        return callCount === 1 ? startTime : startTime + 250; // 250ms duration
      });

      const result$ = interceptor.intercept(
        mockExecutionContext,
        mockCallHandler,
      );

      result$.subscribe({
        error: (error) => {
          expect(error).toBe(httpException);
          expect(MetricsPerformanceService.recordRequest).toHaveBeenCalledWith(
            "/api/v1/test",
            "GET",
            250,
            false,
          );
          Date.now = originalDateNow;
          done();
        },
      });
    });

    it("should record failed request performance on general error", (done) => {
      const generalError = new Error("Internal Server Error");
      const startTime = Date.now();

      mockCallHandler.handle.mockReturnValue(throwError(() => generalError));
      MetricsPerformanceService.recordRequest.mockResolvedValue();

      // Mock Date.now to control timing
      const originalDateNow = Date.now;
      let callCount = 0;
      Date.now = jest.fn(() => {
        callCount++;
        return callCount === 1 ? startTime : startTime + 300; // 300ms duration
      });

      const result$ = interceptor.intercept(
        mockExecutionContext,
        mockCallHandler,
      );

      result$.subscribe({
        error: (error) => {
          expect(error).toBe(generalError);
          expect(MetricsPerformanceService.recordRequest).toHaveBeenCalledWith(
            "/api/v1/test",
            "GET",
            300,
            false,
          );
          Date.now = originalDateNow;
          done();
        },
      });
    });

    it("should handle different HTTP methods", (done) => {
      mockGetRequest.mockReturnValue({
        method: "POST",
        url: "/api/v1/data",
        route: { path: "/api/v1/data" },
      });

      mockCallHandler.handle.mockReturnValue(of({ created: true }));
      MetricsPerformanceService.recordRequest.mockResolvedValue();

      const result$ = interceptor.intercept(
        mockExecutionContext,
        mockCallHandler,
      );

      result$.subscribe({
        complete: () => {
          expect(MetricsPerformanceService.recordRequest).toHaveBeenCalledWith(
            "/api/v1/data",
            "POST",
            expect.any(Number),
            true,
          );
          done();
        },
      });
    });

    it("should use request URL when route path is not available", (done) => {
      mockGetRequest.mockReturnValue({
        method: "GET",
        url: "/api/v1/custom",
        route: undefined, // No route information
      });

      mockCallHandler.handle.mockReturnValue(of({ data: "test" }));
      MetricsPerformanceService.recordRequest.mockResolvedValue();

      const result$ = interceptor.intercept(
        mockExecutionContext,
        mockCallHandler,
      );

      result$.subscribe({
        complete: () => {
          expect(MetricsPerformanceService.recordRequest).toHaveBeenCalledWith(
            "/api/v1/custom",
            "GET",
            expect.any(Number),
            true,
          );
          done();
        },
      });
    });

    it("should handle route path with parameters", (done) => {
      mockGetRequest.mockReturnValue({
        method: "GET",
        url: "/api/v1/users/123",
        route: { path: "/api/v1/users/:id" },
      });

      mockCallHandler.handle.mockReturnValue(of({ userId: 123 }));
      MetricsPerformanceService.recordRequest.mockResolvedValue();

      const result$ = interceptor.intercept(
        mockExecutionContext,
        mockCallHandler,
      );

      result$.subscribe({
        complete: () => {
          expect(MetricsPerformanceService.recordRequest).toHaveBeenCalledWith(
            "/api/v1/users/:id",
            "GET",
            expect.any(Number),
            true,
          );
          done();
        },
      });
    });

    it("should handle missing request information gracefully", (done) => {
      mockGetRequest.mockReturnValue({
        // Missing method and url
        route: { path: "/unknown" },
      });

      mockCallHandler.handle.mockReturnValue(of({ result: "ok" }));
      MetricsPerformanceService.recordRequest.mockResolvedValue();

      const result$ = interceptor.intercept(
        mockExecutionContext,
        mockCallHandler,
      );

      result$.subscribe({
        complete: () => {
          expect(MetricsPerformanceService.recordRequest).toHaveBeenCalledWith(
            "/unknown",
            undefined,
            expect.any(Number),
            true,
          );
          done();
        },
      });
    });

    it("should measure timing accurately for slow requests", (done) => {
      const startTime = Date.now();
      const slowDuration = 2000; // 2 seconds

      mockCallHandler.handle.mockReturnValue(of({ slow: "response" }));
      MetricsPerformanceService.recordRequest.mockResolvedValue();

      // Mock Date.now to simulate slow request
      const originalDateNow = Date.now;
      let callCount = 0;
      Date.now = jest.fn(() => {
        callCount++;
        return callCount === 1 ? startTime : startTime + slowDuration;
      });

      const result$ = interceptor.intercept(
        mockExecutionContext,
        mockCallHandler,
      );

      result$.subscribe({
        complete: () => {
          expect(MetricsPerformanceService.recordRequest).toHaveBeenCalledWith(
            "/api/v1/test",
            "GET",
            slowDuration,
            true,
          );
          Date.now = originalDateNow;
          done();
        },
      });
    });

    it("should handle zero duration requests", (done) => {
      const sameTime = Date.now();

      mockCallHandler.handle.mockReturnValue(of({ fast: "response" }));
      MetricsPerformanceService.recordRequest.mockResolvedValue();

      // Mock Date.now to return same time (0ms duration)
      Date.now = jest.fn(() => sameTime);

      const result$ = interceptor.intercept(
        mockExecutionContext,
        mockCallHandler,
      );

      result$.subscribe({
        complete: () => {
          expect(MetricsPerformanceService.recordRequest).toHaveBeenCalledWith(
            "/api/v1/test",
            "GET",
            0,
            true,
          );
          done();
        },
      });
    });

    it("should not affect the original response data", (done) => {
      const originalResponseData = {
        id: 123,
        name: "test",
        nested: { value: "nested" },
        array: [1, 2, 3],
      };

      mockCallHandler.handle.mockReturnValue(of(originalResponseData));
      MetricsPerformanceService.recordRequest.mockResolvedValue();

      const result$ = interceptor.intercept(
        mockExecutionContext,
        mockCallHandler,
      );

      result$.subscribe({
        next: (data) => {
          expect(data).toEqual(originalResponseData);
          expect(data).toBe(originalResponseData); // Should be exact same reference
        },
        complete: () => {
          done();
        },
      });
    });

    it("should handle performance monitoring service errors gracefully", (done) => {
      const responseData = { message: "success" };

      mockCallHandler.handle.mockReturnValue(of(responseData));
      MetricsPerformanceService.recordRequest.mockRejectedValue(
        new Error("Monitoring service error"),
      );

      const result$ = interceptor.intercept(
        mockExecutionContext,
        mockCallHandler,
      );

      result$.subscribe({
        next: (data) => {
          // Should still return the original response even if monitoring fails
          expect(data).toEqual(responseData);
        },
        complete: () => {
          expect(MetricsPerformanceService.recordRequest).toHaveBeenCalled();
          done();
        },
      });
    });
  });
});
