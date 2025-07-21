import { ApiProperty } from "@nestjs/swagger";

// Note: ApiResponseDto and ErrorResponseDto have been removed as they duplicated
// the functionality of the global ResponseInterceptor. All API responses are now
// automatically formatted by the ResponseInterceptor in a consistent manner.

/**
 * 分页数据结构 (纯业务数据DTO)
 * Note: 移除了statusCode、message、timestamp等HTTP响应字段
 * ResponseInterceptor会自动添加这些标准响应字段
 */
export class PaginatedDataDto<T = unknown> {
  @ApiProperty({
    description: "数据列表",
  })
  items: T[];

  @ApiProperty({
    description: "分页信息",
    example: {
      page: 1,
      limit: 10,
      total: 100,
      totalPages: 10,
      hasNext: true,
      hasPrev: false,
    },
  })
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };

  constructor(
    items: T[],
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
    },
  ) {
    this.items = items;
    this.pagination = pagination;
  }
}
