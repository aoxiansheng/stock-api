import { applyDecorators, HttpStatus } from "@nestjs/common";
import { ApiResponse, ApiResponseOptions } from "@nestjs/swagger";
import { REFERENCE_DATA } from "@common/constants/domain";

// Note: PaginatedDataDto is available in common-response.dto if needed for future use

/**
 * 标准成功响应装饰器
 * 使用ResponseInterceptor提供的标准格式
 */
export const ApiSuccessResponse = (options?: Partial<ApiResponseOptions>) =>
  applyDecorators(
    ApiResponse({
      status: HttpStatus.OK,
      description: "操作成功",
      schema: {
        type: "object",
        properties: {
          success: { type: "boolean", example: true },
          statusCode: { type: "number", example: 200 },
          message: { type: "string", example: "操作成功" },
          data: (options as any)?.type
            ? { $ref: `#/components/schemas/${(options as any).type.name}` }
            : { type: "object" },
          timestamp: { type: "string", format: "date-time" },
        },
      },
      ...options,
    }),
  );

/**
 * 创建成功响应装饰器
 * 使用ResponseInterceptor提供的标准格式
 */
export const ApiCreatedResponse = (options?: Partial<ApiResponseOptions>) =>
  applyDecorators(
    ApiResponse({
      status: HttpStatus.CREATED,
      description: "创建成功",
      schema: {
        type: "object",
        properties: {
          success: { type: "boolean", example: true },
          statusCode: { type: "number", example: 201 },
          message: { type: "string", example: "创建成功" },
          data: (options as any)?.type
            ? { $ref: `#/components/schemas/${(options as any).type.name}` }
            : { type: "object" },
          timestamp: { type: "string", format: "date-time" },
        },
      },
      ...options,
    }),
  );

/**
 * 分页响应装饰器
 * 使用ResponseInterceptor提供的标准格式，数据部分使用PaginatedDataDto结构
 */
export const ApiPaginatedResponse = (
  itemSchemaType?: unknown,
  options?: Partial<ApiResponseOptions>,
) =>
  applyDecorators(
    ApiResponse({
      status: HttpStatus.OK,
      description: "分页数据获取成功",
      schema: {
        type: "object",
        properties: {
          success: { type: "boolean", example: true },
          statusCode: { type: "number", example: 200 },
          message: { type: "string", example: "分页数据获取成功" },
          data: {
            type: "object",
            properties: {
              items: {
                type: "array",
                items: itemSchemaType
                  ? { $ref: `#/components/schemas/${(itemSchemaType as any).name}` }
                  : { type: "object" },
              },
              pagination: {
                type: "object",
                properties: {
                  page: { type: "number" },
                  limit: { type: "number" },
                  total: { type: "number" },
                  totalPages: { type: "number" },
                  hasNext: { type: "boolean" },
                  hasPrev: { type: "boolean" },
                },
              },
            },
          },
          timestamp: { type: "string", format: "date-time" },
        },
      },
      ...options,
    }),
  );

/**
 * 标准错误响应装饰器组合
 * 定义通用的错误响应格式
 */
export const ApiStandardResponses = () =>
  applyDecorators(
    ApiResponse({
      status: HttpStatus.BAD_REQUEST,
      description: "请求参数错误",
      schema: {
        example: {
          statusCode: 400,
          message: ["username不能为空", "password长度至少6位"],
          error: "Bad Request",
          details: [
            {
              field: "username",
              code: "IS_NOT_EMPTY",
              message: "username不能为空",
            },
          ],
          timestamp: REFERENCE_DATA.TEST_TIMESTAMPS.REFERENCE_DATE,
          path: "/api/v1/auth/login",
        },
      },
    }),
    ApiResponse({
      status: HttpStatus.UNAUTHORIZED,
      description: "认证失败",
      schema: {
        example: {
          statusCode: 401,
          message: "认证失败，请检查用户名和密码",
          error: "Unauthorized",
          timestamp: REFERENCE_DATA.TEST_TIMESTAMPS.REFERENCE_DATE,
          path: "/api/v1/auth/login",
        },
      },
    }),
    ApiResponse({
      status: HttpStatus.FORBIDDEN,
      description: "权限不足",
      schema: {
        example: {
          statusCode: 403,
          message: "权限不足，需要管理员权限",
          error: "Forbidden",
          timestamp: REFERENCE_DATA.TEST_TIMESTAMPS.REFERENCE_DATE,
          path: "/api/v1/auth/profile",
        },
      },
    }),
    ApiResponse({
      status: HttpStatus.NOT_FOUND,
      description: "资源不存在",
      schema: {
        example: {
          statusCode: 404,
          message: "用户不存在",
          error: "Not Found",
          timestamp: REFERENCE_DATA.TEST_TIMESTAMPS.REFERENCE_DATE,
          path: "/api/v1/auth/profile",
        },
      },
    }),
    ApiResponse({
      status: HttpStatus.CONFLICT,
      description: "资源冲突",
      schema: {
        example: {
          statusCode: 409,
          message: "用户名已存在",
          error: "Conflict",
          timestamp: REFERENCE_DATA.TEST_TIMESTAMPS.REFERENCE_DATE,
          path: "/api/v1/auth/register",
        },
      },
    }),
    ApiResponse({
      status: HttpStatus.TOO_MANY_REQUESTS,
      description: "请求过于频繁",
      schema: {
        example: {
          statusCode: 429,
          message: "请求过于频繁，请稍后再试",
          error: "Too Many Requests",
          timestamp: REFERENCE_DATA.TEST_TIMESTAMPS.REFERENCE_DATE,
          path: "/api/v1/query/execute",
        },
      },
    }),
    ApiResponse({
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      description: "服务器内部错误",
      schema: {
        example: {
          statusCode: 500,
          message: "服务器内部错误",
          error: "Internal Server Error",
          timestamp: REFERENCE_DATA.TEST_TIMESTAMPS.REFERENCE_DATE,
          path: "/api/v1/query/execute",
        },
      },
    }),
  );

/**
 * JWT 认证相关响应（完整版）
 * 包含JWT认证端点可能出现的所有错误响应
 */
export const JwtAuthResponses = () =>
  applyDecorators(
    ApiResponse({
      status: HttpStatus.BAD_REQUEST,
      description: "请求参数错误",
      schema: {
        example: {
          statusCode: 400,
          message: ["字段验证失败"],
          error: "Bad Request",
          timestamp: REFERENCE_DATA.TEST_TIMESTAMPS.REFERENCE_DATE,
          path: "/api/v1/auth/profile",
        },
      },
    }),
    ApiResponse({
      status: HttpStatus.UNAUTHORIZED,
      description: "JWT Token 认证失败",
      schema: {
        example: {
          statusCode: 401,
          message: "JWT Token 无效或已过期",
          error: "Unauthorized",
          timestamp: REFERENCE_DATA.TEST_TIMESTAMPS.REFERENCE_DATE,
          path: "/api/v1/auth/profile",
        },
      },
    }),
    ApiResponse({
      status: HttpStatus.FORBIDDEN,
      description: "权限不足",
      schema: {
        example: {
          statusCode: 403,
          message: "权限不足，需要管理员权限",
          error: "Forbidden",
          timestamp: REFERENCE_DATA.TEST_TIMESTAMPS.REFERENCE_DATE,
          path: "/api/v1/auth/profile",
        },
      },
    }),
    ApiResponse({
      status: HttpStatus.NOT_FOUND,
      description: "资源不存在",
      schema: {
        example: {
          statusCode: 404,
          message: "用户不存在",
          error: "Not Found",
          timestamp: REFERENCE_DATA.TEST_TIMESTAMPS.REFERENCE_DATE,
          path: "/api/v1/auth/profile",
        },
      },
    }),
    ApiResponse({
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      description: "服务器内部错误",
      schema: {
        example: {
          statusCode: 500,
          message: "服务器内部错误",
          error: "Internal Server Error",
          timestamp: REFERENCE_DATA.TEST_TIMESTAMPS.REFERENCE_DATE,
          path: "/auth/profile",
        },
      },
    }),
  );

/**
 * API Key 认证相关响应
 * 专门用于API Key认证端点的错误响应
 */
export const ApiKeyAuthResponses = () =>
  applyDecorators(
    ApiResponse({
      status: HttpStatus.BAD_REQUEST,
      description: "请求参数错误",
      schema: {
        example: {
          statusCode: 400,
          message: ["字段验证失败"],
          error: "Bad Request",
          timestamp: REFERENCE_DATA.TEST_TIMESTAMPS.REFERENCE_DATE,
          path: "/api/v1/receiver/data",
        },
      },
    }),
    ApiResponse({
      status: HttpStatus.UNAUTHORIZED,
      description: "API Key 认证失败",
      schema: {
        example: {
          statusCode: 401,
          message: "API Key 无效或已过期",
          error: "Unauthorized",
          timestamp: REFERENCE_DATA.TEST_TIMESTAMPS.REFERENCE_DATE,
          path: "/api/v1/receiver/data",
        },
      },
    }),
    ApiResponse({
      status: HttpStatus.FORBIDDEN,
      description: "API Key 权限不足",
      schema: {
        example: {
          statusCode: 403,
          message: "当前API Key权限不足，需要data:read权限",
          error: "Forbidden",
          timestamp: REFERENCE_DATA.TEST_TIMESTAMPS.REFERENCE_DATE,
          path: "/api/v1/receiver/data",
        },
      },
    }),
    ApiResponse({
      status: HttpStatus.NOT_FOUND,
      description: "资源不存在",
      schema: {
        example: {
          statusCode: 404,
          message: "请求的数据源不存在",
          error: "Not Found",
          timestamp: REFERENCE_DATA.TEST_TIMESTAMPS.REFERENCE_DATE,
          path: "/api/v1/receiver/data",
        },
      },
    }),
    ApiResponse({
      status: HttpStatus.CONFLICT,
      description: "资源冲突",
      schema: {
        example: {
          statusCode: 409,
          message: "数据源冲突，请检查请求参数",
          error: "Conflict",
          timestamp: REFERENCE_DATA.TEST_TIMESTAMPS.REFERENCE_DATE,
          path: "/api/v1/receiver/data",
        },
      },
    }),
    ApiResponse({
      status: HttpStatus.TOO_MANY_REQUESTS,
      description: "API Key 请求频率超限",
      schema: {
        example: {
          statusCode: 429,
          message: "API Key请求频率超限，请稍后再试",
          error: "Too Many Requests",
          timestamp: REFERENCE_DATA.TEST_TIMESTAMPS.REFERENCE_DATE,
          path: "/api/v1/receiver/data",
        },
      },
    }),
    ApiResponse({
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      description: "服务器内部错误",
      schema: {
        example: {
          statusCode: 500,
          message: "数据处理服务内部错误",
          error: "Internal Server Error",
          timestamp: REFERENCE_DATA.TEST_TIMESTAMPS.REFERENCE_DATE,
          path: "/receiver/data",
        },
      },
    }),
  );

/**
 * 权限验证相关响应
 */
export const PermissionResponses = () =>
  applyDecorators(
    ApiResponse({
      status: HttpStatus.FORBIDDEN,
      description: "权限不足",
      schema: {
        example: {
          statusCode: 403,
          message: "需要管理员权限才能访问该资源",
          error: "Forbidden",
          timestamp: REFERENCE_DATA.TEST_TIMESTAMPS.REFERENCE_DATE,
          path: "/api/v1/monitoring/performance",
        },
      },
    }),
  );

/**
 * 健康检查响应装饰器
 */
export const ApiHealthResponse = () =>
  applyDecorators(
    ApiResponse({
      status: HttpStatus.OK,
      description: "健康检查通过",
      schema: {
        example: {
          status: "ok",
          timestamp: REFERENCE_DATA.TEST_TIMESTAMPS.REFERENCE_DATE,
          uptime: 3600,
          version: "1.0.0",
          environment: "production",
        },
      },
    }),
    ApiResponse({
      status: HttpStatus.SERVICE_UNAVAILABLE,
      description: "服务不可用",
      schema: {
        example: {
          status: "error",
          timestamp: REFERENCE_DATA.TEST_TIMESTAMPS.REFERENCE_DATE,
          uptime: 3600,
          version: "1.0.0",
          environment: "production",
          errors: ["数据库连接失败", "Redis 连接超时"],
        },
      },
    }),
  );
