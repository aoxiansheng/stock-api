import { HttpStatus } from '@nestjs/common';
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

// Mock @nestjs/swagger's ApiResponse
jest.mock('@nestjs/swagger', () => ({
  ApiResponse: jest.fn((options) => () => options), // Return a decorator function
}));

// Mock applyDecorators to track what decorators are applied
jest.mock('@nestjs/common', () => ({
  ...jest.requireActual('@nestjs/common'),
  applyDecorators: jest.fn((...decorators) => decorators),
  HttpStatus: jest.requireActual('@nestjs/common').HttpStatus,
}));

describe('Swagger Response Decorators', () => {
  const mockApiResponse = ApiResponse as jest.MockedFunction<typeof ApiResponse>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('ApiSuccessResponse', () => {
    it('should create a success response decorator with default options', () => {
      const decorator = ApiSuccessResponse();

      expect(mockApiResponse).toHaveBeenCalledWith({
        status: HttpStatus.OK,
        description: '操作成功',
        schema: {
          type: 'object',
          properties: {
            statusCode: { type: 'number', example: 200 },
            message: { type: 'string', example: '操作成功' },
            data: { type: 'object' },
            timestamp: { type: 'string', format: 'date-time' },
          },
        },
      });
    });

    it('should merge custom options', () => {
      const customOptions = {
        description: 'Custom success message',
        example: { custom: 'data' },
      };

      ApiSuccessResponse(customOptions);

      expect(mockApiResponse).toHaveBeenCalledWith(
        expect.objectContaining({
          status: HttpStatus.OK,
          description: 'Custom success message',
          example: { custom: 'data' },
        })
      );
    });

    it('should handle type option for schema reference', () => {
      class TestDto {}
      const customOptions = { type: TestDto };

      ApiSuccessResponse(customOptions as any);

      expect(mockApiResponse).toHaveBeenCalledWith(
        expect.objectContaining({
          schema: expect.objectContaining({
            properties: expect.objectContaining({
              data: { $ref: '#/components/schemas/TestDto' },
            }),
          }),
        })
      );
    });
  });

  describe('ApiCreatedResponse', () => {
    it('should create a created response decorator with default options', () => {
      ApiCreatedResponse();

      expect(mockApiResponse).toHaveBeenCalledWith({
        status: HttpStatus.CREATED,
        description: '创建成功',
        schema: {
          type: 'object',
          properties: {
            statusCode: { type: 'number', example: 201 },
            message: { type: 'string', example: '创建成功' },
            data: { type: 'object' },
            timestamp: { type: 'string', format: 'date-time' },
          },
        },
      });
    });

    it('should merge custom options', () => {
      const customOptions = {
        description: 'Custom created message',
        headers: { 'Location': { description: 'Resource location' } },
      };

      ApiCreatedResponse(customOptions);

      expect(mockApiResponse).toHaveBeenCalledWith(
        expect.objectContaining({
          status: HttpStatus.CREATED,
          description: 'Custom created message',
          headers: { 'Location': { description: 'Resource location' } },
        })
      );
    });

    it('should handle type option for schema reference', () => {
      class CreatedDto {}
      const customOptions = { type: CreatedDto };

      ApiCreatedResponse(customOptions as any);

      expect(mockApiResponse).toHaveBeenCalledWith(
        expect.objectContaining({
          schema: expect.objectContaining({
            properties: expect.objectContaining({
              data: { $ref: '#/components/schemas/CreatedDto' },
            }),
          }),
        })
      );
    });
  });

  describe('ApiPaginatedResponse', () => {
    it('should create a paginated response decorator without item schema', () => {
      ApiPaginatedResponse();

      expect(mockApiResponse).toHaveBeenCalledWith({
        status: HttpStatus.OK,
        description: '分页数据获取成功',
        schema: {
          type: 'object',
          properties: {
            statusCode: { type: 'number', example: 200 },
            message: { type: 'string', example: '分页数据获取成功' },
            data: {
              type: 'object',
              properties: {
                items: {
                  type: 'array',
                  items: { type: 'object' },
                },
                pagination: {
                  type: 'object',
                  properties: {
                    page: { type: 'number' },
                    limit: { type: 'number' },
                    total: { type: 'number' },
                    totalPages: { type: 'number' },
                    hasNext: { type: 'boolean' },
                    hasPrev: { type: 'boolean' },
                  },
                },
              },
            },
            timestamp: { type: 'string', format: 'date-time' },
          },
        },
      });
    });

    it('should create a paginated response decorator with item schema type', () => {
      class ItemDto {}

      ApiPaginatedResponse(ItemDto);

      expect(mockApiResponse).toHaveBeenCalledWith(
        expect.objectContaining({
          schema: expect.objectContaining({
            properties: expect.objectContaining({
              data: expect.objectContaining({
                properties: expect.objectContaining({
                  items: {
                    type: 'array',
                    items: { $ref: '#/components/schemas/ItemDto' },
                  },
                }),
              }),
            }),
          }),
        })
      );
    });

    it('should merge custom options', () => {
      class ItemDto {}
      const customOptions = {
        description: 'Custom paginated response',
        headers: { 'X-Total-Count': { description: 'Total items' } },
      };

      ApiPaginatedResponse(ItemDto, customOptions);

      expect(mockApiResponse).toHaveBeenCalledWith(
        expect.objectContaining({
          description: 'Custom paginated response',
          headers: { 'X-Total-Count': { description: 'Total items' } },
        })
      );
    });
  });

  describe('ApiStandardResponses', () => {
    it('should create multiple standard error response decorators', () => {
      ApiStandardResponses();

      // Should call ApiResponse multiple times for different error statuses
      expect(mockApiResponse).toHaveBeenCalledTimes(7); // 400, 401, 403, 404, 409, 429, 500

      // Check specific status codes are included
      const calls = mockApiResponse.mock.calls;
      const statusCodes = calls.map(call => call[0].status);

      expect(statusCodes).toContain(HttpStatus.BAD_REQUEST);
      expect(statusCodes).toContain(HttpStatus.UNAUTHORIZED);
      expect(statusCodes).toContain(HttpStatus.FORBIDDEN);
      expect(statusCodes).toContain(HttpStatus.NOT_FOUND);
      expect(statusCodes).toContain(HttpStatus.CONFLICT);
      expect(statusCodes).toContain(HttpStatus.TOO_MANY_REQUESTS);
      expect(statusCodes).toContain(HttpStatus.INTERNAL_SERVER_ERROR);
    });

    it('should include proper error examples', () => {
      ApiStandardResponses();

      const calls = mockApiResponse.mock.calls;
      const badRequestCall = calls.find(call => call[0].status === HttpStatus.BAD_REQUEST);

      expect(badRequestCall?.[0]).toMatchObject({
        status: 400,
        description: '请求参数错误',
        schema: {
          example: expect.objectContaining({
            statusCode: 400,
            message: expect.any(Array),
            error: 'Bad Request',
            timestamp: expect.any(String),
            path: expect.any(String),
          }),
        },
      });
    });
  });

  describe('JwtAuthResponses', () => {
    it('should create JWT auth specific error responses', () => {
      JwtAuthResponses();

      expect(mockApiResponse).toHaveBeenCalledTimes(5); // 400, 401, 403, 404, 500

      const calls = mockApiResponse.mock.calls;
      const statusCodes = calls.map(call => call[0].status);

      expect(statusCodes).toContain(HttpStatus.BAD_REQUEST);
      expect(statusCodes).toContain(HttpStatus.UNAUTHORIZED);
      expect(statusCodes).toContain(HttpStatus.FORBIDDEN);
      expect(statusCodes).toContain(HttpStatus.NOT_FOUND);
      expect(statusCodes).toContain(HttpStatus.INTERNAL_SERVER_ERROR);
    });

    it('should include JWT specific error messages', () => {
      JwtAuthResponses();

      const calls = mockApiResponse.mock.calls;
      const unauthorizedCall = calls.find(call => call[0].status === HttpStatus.UNAUTHORIZED);

      expect(unauthorizedCall?.[0]).toHaveProperty('schema');
    });
  });

  describe('ApiKeyAuthResponses', () => {
    it('should create API Key auth specific error responses', () => {
      ApiKeyAuthResponses();

      expect(mockApiResponse).toHaveBeenCalledTimes(7); // 400, 401, 403, 404, 409, 429, 500

      const calls = mockApiResponse.mock.calls;
      const statusCodes = calls.map(call => call[0].status);

      expect(statusCodes).toContain(HttpStatus.BAD_REQUEST);
      expect(statusCodes).toContain(HttpStatus.UNAUTHORIZED);
      expect(statusCodes).toContain(HttpStatus.FORBIDDEN);
      expect(statusCodes).toContain(HttpStatus.NOT_FOUND);
      expect(statusCodes).toContain(HttpStatus.CONFLICT);
      expect(statusCodes).toContain(HttpStatus.TOO_MANY_REQUESTS);
      expect(statusCodes).toContain(HttpStatus.INTERNAL_SERVER_ERROR);
    });

    it('should include API Key specific error messages', () => {
      ApiKeyAuthResponses();

      const calls = mockApiResponse.mock.calls;
      const unauthorizedCall = calls.find(call => call[0].status === HttpStatus.UNAUTHORIZED);
      const forbiddenCall = calls.find(call => call[0].status === HttpStatus.FORBIDDEN);

      expect(unauthorizedCall?.[0]).toHaveProperty('schema');
      expect(forbiddenCall?.[0]).toHaveProperty('schema');
    });
  });

  describe('PermissionResponses', () => {
    it('should create permission specific error response', () => {
      PermissionResponses();

      expect(mockApiResponse).toHaveBeenCalledTimes(1);
      expect(mockApiResponse).toHaveBeenCalledWith(
        expect.objectContaining({
          status: HttpStatus.FORBIDDEN,
          description: '权限不足',
          schema: {
            example: expect.objectContaining({
              statusCode: 403,
              message: expect.stringContaining('权限'),
              error: 'Forbidden',
            }),
          },
        })
      );
    });
  });

  describe('ApiHealthResponse', () => {
    it('should create health check response decorators', () => {
      ApiHealthResponse();

      expect(mockApiResponse).toHaveBeenCalledTimes(2); // OK and SERVICE_UNAVAILABLE

      const calls = mockApiResponse.mock.calls;
      const statusCodes = calls.map(call => call[0].status);

      expect(statusCodes).toContain(HttpStatus.OK);
      expect(statusCodes).toContain(HttpStatus.SERVICE_UNAVAILABLE);
    });

    it('should include proper health check examples', () => {
      ApiHealthResponse();

      const calls = mockApiResponse.mock.calls;
      const okCall = calls.find(call => call[0].status === HttpStatus.OK);
      const unavailableCall = calls.find(call => call[0].status === HttpStatus.SERVICE_UNAVAILABLE);

      expect(okCall?.[0]).toHaveProperty('schema');
      expect(unavailableCall?.[0]).toHaveProperty('schema');
    });
  });

  describe('Integration Tests', () => {
    it('should handle undefined or null options gracefully', () => {
      expect(() => ApiSuccessResponse(undefined)).not.toThrow();
      expect(() => ApiCreatedResponse(null as any)).not.toThrow();
      expect(() => ApiPaginatedResponse(undefined, undefined)).not.toThrow();
    });

    it('should preserve existing properties when merging options', () => {
      const customOptions = {
        status: 299, // This should be overridden
        description: 'Custom description', // This should be kept
        headers: { 'Custom-Header': { description: 'Test' } }, // This should be added
      };

      ApiSuccessResponse(customOptions);

      expect(mockApiResponse).toHaveBeenCalledWith(
        expect.objectContaining({
          status: HttpStatus.OK, // Should be 200, not 299
          description: 'Custom description',
          headers: { 'Custom-Header': { description: 'Test' } },
        })
      );
    });

    it('should work with complex schema types', () => {
      class ComplexDto {
        field1: string;
        field2: string;
      }

      ApiSuccessResponse({ type: ComplexDto } as any);

      expect(mockApiResponse).toHaveBeenCalledWith(
        expect.objectContaining({
          schema: expect.objectContaining({
            properties: expect.objectContaining({
              data: { $ref: '#/components/schemas/ComplexDto' },
            }),
          }),
        })
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle missing type name gracefully', () => {
      const typeWithoutName = {};

      expect(() => ApiSuccessResponse({ type: typeWithoutName } as any)).not.toThrow();

      expect(mockApiResponse).toHaveBeenCalled();
    });

    it('should handle invalid schema types', () => {
      const invalidType = null;

      expect(() => ApiPaginatedResponse(invalidType as any)).not.toThrow();
    });
  });

  describe('Schema Structure Validation', () => {
    it('should generate correct schema structure for success response', () => {
      ApiSuccessResponse();

      const call = mockApiResponse.mock.calls[0];
      expect(call[0]).toHaveProperty('schema');
      expect(call[0].status).toBe(HttpStatus.OK);
    });

    it('should generate correct pagination schema structure', () => {
      ApiPaginatedResponse();

      const call = mockApiResponse.mock.calls[0];
      expect(call[0]).toHaveProperty('schema');
      expect(call[0].status).toBe(HttpStatus.OK);
      expect(call[0].description).toBe('分页数据获取成功');
    });
  });
});