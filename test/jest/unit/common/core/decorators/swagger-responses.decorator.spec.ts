import { applyDecorators, HttpStatus } from '@nestjs/common';
import { ApiResponse } from '@nestjs/swagger';
import {
  ApiSuccessResponse,
  ApiCreatedResponse,
  ApiPaginatedResponse,
  ApiStandardResponses,
  JwtAuthResponses,
  ApiKeyAuthResponses,
  PermissionResponses,
  ApiHealthResponse,
} from '@common/core/decorators/swagger-responses.decorator';

// 模拟 @nestjs/common 和 @nestjs/swagger 模块
jest.mock('@nestjs/common', () => ({
  applyDecorators: jest.fn((...args) => args), // 模拟 applyDecorators，直接返回其参数
  HttpStatus: {
    OK: 200,
    CREATED: 201,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    CONFLICT: 409,
    TOO_MANY_REQUESTS: 429,
    INTERNAL_SERVER_ERROR: 500,
    SERVICE_UNAVAILABLE: 503,
  },
}));

jest.mock('@nestjs/swagger', () => ({
  ApiResponse: jest.fn((options) => options), // 模拟 ApiResponse，直接返回其选项
}));

describe('Swagger Responses Decorators', () => {
  // 在每个测试用例之前，清除 mock 的调用记录
  beforeEach(() => {
    (applyDecorators as jest.Mock).mockClear();
    (ApiResponse as jest.Mock).mockClear();
  });

  // 测试 ApiSuccessResponse 装饰器
  it('ApiSuccessResponse should apply correct Swagger response for success', () => {
    // 调用装饰器
    ApiSuccessResponse();
    // 断言 applyDecorators 被调用
    expect(applyDecorators).toHaveBeenCalled();
    // 断言 ApiResponse 被调用，并检查其参数
    expect(ApiResponse).toHaveBeenCalledWith(
      expect.objectContaining({
        status: HttpStatus.OK,
        description: '操作成功',
        schema: expect.objectContaining({
          properties: expect.objectContaining({
            statusCode: { type: 'number', example: 200 },
            message: { type: 'string', example: '操作成功' },
            data: { type: 'object' },
            timestamp: { type: 'string', format: 'date-time' },
          }),
        }),
      }),
    );
  });

  // 测试 ApiCreatedResponse 装饰器
  it('ApiCreatedResponse should apply correct Swagger response for creation', () => {
    // 调用装饰器
    ApiCreatedResponse();
    // 断言 applyDecorators 被调用
    expect(applyDecorators).toHaveBeenCalled();
    // 断言 ApiResponse 被调用，并检查其参数
    expect(ApiResponse).toHaveBeenCalledWith(
      expect.objectContaining({
        status: HttpStatus.CREATED,
        description: '创建成功',
        schema: expect.objectContaining({
          properties: expect.objectContaining({
            statusCode: { type: 'number', example: 201 },
            message: { type: 'string', example: '创建成功' },
            data: { type: 'object' },
            timestamp: { type: 'string', format: 'date-time' },
          }),
        }),
      }),
    );
  });

  // 测试 ApiPaginatedResponse 装饰器
  it('ApiPaginatedResponse should apply correct Swagger response for pagination', () => {
    // 调用装饰器
    ApiPaginatedResponse();
    // 断言 applyDecorators 被调用
    expect(applyDecorators).toHaveBeenCalled();
    // 断言 ApiResponse 被调用，并检查其参数
    expect(ApiResponse).toHaveBeenCalledWith(
      expect.objectContaining({
        status: HttpStatus.OK,
        description: '分页数据获取成功',
        schema: expect.objectContaining({
          properties: expect.objectContaining({
            data: expect.objectContaining({
              properties: expect.objectContaining({
                items: expect.objectContaining({ type: 'array' }),
                pagination: expect.objectContaining({ type: 'object' }),
              }),
            }),
          }),
        }),
      }),
    );
  });

  // 测试 ApiStandardResponses 装饰器
  it('ApiStandardResponses should apply correct Swagger responses for standard errors', () => {
    // 调用装饰器
    ApiStandardResponses();
    // 断言 applyDecorators 被调用
    expect(applyDecorators).toHaveBeenCalled();
    // 断言 ApiResponse 被多次调用，并检查其参数
    expect(ApiResponse).toHaveBeenCalledWith(expect.objectContaining({ status: HttpStatus.BAD_REQUEST }));
    expect(ApiResponse).toHaveBeenCalledWith(expect.objectContaining({ status: HttpStatus.UNAUTHORIZED }));
    expect(ApiResponse).toHaveBeenCalledWith(expect.objectContaining({ status: HttpStatus.FORBIDDEN }));
    expect(ApiResponse).toHaveBeenCalledWith(expect.objectContaining({ status: HttpStatus.NOT_FOUND }));
    expect(ApiResponse).toHaveBeenCalledWith(expect.objectContaining({ status: HttpStatus.CONFLICT }));
    expect(ApiResponse).toHaveBeenCalledWith(expect.objectContaining({ status: HttpStatus.TOO_MANY_REQUESTS }));
    expect(ApiResponse).toHaveBeenCalledWith(expect.objectContaining({ status: HttpStatus.INTERNAL_SERVER_ERROR }));
  });

  // 测试 JwtAuthResponses 装饰器
  it('JwtAuthResponses should apply correct Swagger responses for JWT auth errors', () => {
    // 调用装饰器
    JwtAuthResponses();
    // 断言 applyDecorators 被调用
    expect(applyDecorators).toHaveBeenCalled();
    // 断言 ApiResponse 被多次调用，并检查其参数
    expect(ApiResponse).toHaveBeenCalledWith(expect.objectContaining({ status: HttpStatus.BAD_REQUEST }));
    expect(ApiResponse).toHaveBeenCalledWith(expect.objectContaining({ status: HttpStatus.UNAUTHORIZED }));
    expect(ApiResponse).toHaveBeenCalledWith(expect.objectContaining({ status: HttpStatus.FORBIDDEN }));
    expect(ApiResponse).toHaveBeenCalledWith(expect.objectContaining({ status: HttpStatus.NOT_FOUND }));
    expect(ApiResponse).toHaveBeenCalledWith(expect.objectContaining({ status: HttpStatus.INTERNAL_SERVER_ERROR }));
  });

  // 测试 ApiKeyAuthResponses 装饰器
  it('ApiKeyAuthResponses should apply correct Swagger responses for API Key auth errors', () => {
    // 调用装饰器
    ApiKeyAuthResponses();
    // 断言 applyDecorators 被调用
    expect(applyDecorators).toHaveBeenCalled();
    // 断言 ApiResponse 被多次调用，并检查其参数
    expect(ApiResponse).toHaveBeenCalledWith(expect.objectContaining({ status: HttpStatus.BAD_REQUEST }));
    expect(ApiResponse).toHaveBeenCalledWith(expect.objectContaining({ status: HttpStatus.UNAUTHORIZED }));
    expect(ApiResponse).toHaveBeenCalledWith(expect.objectContaining({ status: HttpStatus.FORBIDDEN }));
    expect(ApiResponse).toHaveBeenCalledWith(expect.objectContaining({ status: HttpStatus.NOT_FOUND }));
    expect(ApiResponse).toHaveBeenCalledWith(expect.objectContaining({ status: HttpStatus.CONFLICT }));
    expect(ApiResponse).toHaveBeenCalledWith(expect.objectContaining({ status: HttpStatus.TOO_MANY_REQUESTS }));
    expect(ApiResponse).toHaveBeenCalledWith(expect.objectContaining({ status: HttpStatus.INTERNAL_SERVER_ERROR }));
  });

  // 测试 PermissionResponses 装饰器
  it('PermissionResponses should apply correct Swagger response for permission errors', () => {
    // 调用装饰器
    PermissionResponses();
    // 断言 applyDecorators 被调用
    expect(applyDecorators).toHaveBeenCalled();
    // 断言 ApiResponse 被调用，并检查其参数
    expect(ApiResponse).toHaveBeenCalledWith(expect.objectContaining({ status: HttpStatus.FORBIDDEN }));
  });

  // 测试 ApiHealthResponse 装饰器
  it('ApiHealthResponse should apply correct Swagger responses for health checks', () => {
    // 调用装饰器
    ApiHealthResponse();
    // 断言 applyDecorators 被调用
    expect(applyDecorators).toHaveBeenCalled();
    // 断言 ApiResponse 被多次调用，并检查其参数
    expect(ApiResponse).toHaveBeenCalledWith(expect.objectContaining({ status: HttpStatus.OK }));
    expect(ApiResponse).toHaveBeenCalledWith(expect.objectContaining({ status: HttpStatus.SERVICE_UNAVAILABLE }));
  });
});