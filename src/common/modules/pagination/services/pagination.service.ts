import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PaginatedDataDto } from "@common/modules/pagination/dto/paginated-data";

export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface PaginationQuery {
  page?: number;
  limit?: number;
}

@Injectable()
export class PaginationService {
  private readonly DEFAULT_PAGE: number;
  private readonly DEFAULT_LIMIT: number;
  private readonly MAX_LIMIT: number;

  constructor(private readonly configService: ConfigService) {
    // 从配置服务读取，提供默认值作为回退
    this.DEFAULT_PAGE = this.configService.get<number>('PAGINATION_DEFAULT_PAGE', 1);
    this.DEFAULT_LIMIT = this.configService.get<number>('PAGINATION_DEFAULT_LIMIT', 10);
    this.MAX_LIMIT = this.configService.get<number>('PAGINATION_MAX_LIMIT', 100);
  }

  /**
   * 获取默认页码
   */
  getDefaultPage(): number {
    return this.DEFAULT_PAGE;
  }

  /**
   * 获取默认每页条数
   */
  getDefaultLimit(): number {
    return this.DEFAULT_LIMIT;
  }

  /**
   * 获取最大每页条数
   */
  getMaxLimit(): number {
    return this.MAX_LIMIT;
  }

  /**
   * 计算跳过的记录数
   * @param page 页码
   * @param limit 每页条数
   * @returns 跳过的记录数
   */
  calculateSkip(page: number, limit: number): number {
    return (page - 1) * limit;
  }

  /**
   * 标准化分页参数
   * @param query 分页查询参数
   * @returns 标准化后的分页参数
   */
  normalizePaginationQuery(query: PaginationQuery): {
    page: number;
    limit: number;
  } {
    const page = Math.max(1, query.page || this.DEFAULT_PAGE);
    let limit = query.limit;

    // 如果limit无效（undefined、null、0或负数），使用默认值
    if (!limit || limit <= 0) {
      limit = this.DEFAULT_LIMIT;
    }

    // 限制最大值
    limit = Math.min(this.MAX_LIMIT, limit);

    return { page, limit };
  }

  /**
   * 创建分页信息
   * @param page 当前页码
   * @param limit 每页条数
   * @param total 总记录数
   * @returns 分页信息对象
   */
  createPagination(page: number, limit: number, total: number): PaginationInfo {
    const totalPages = Math.ceil(total / limit);
    const hasNext = page < totalPages;
    const hasPrev = page > 1;

    return {
      page,
      limit,
      total,
      totalPages,
      hasNext,
      hasPrev,
    };
  }

  /**
   * 创建分页响应对象
   * @param items 数据列表
   * @param page 当前页码
   * @param limit 每页条数
   * @param total 总记录数
   * @returns 分页数据传输对象
   */
  createPaginatedResponse<T>(
    items: T[],
    page: number,
    limit: number,
    total: number,
  ): PaginatedDataDto<T> {
    const pagination = this.createPagination(page, limit, total);
    return new PaginatedDataDto(items, pagination);
  }

  /**
   * 从查询参数创建分页响应对象
   * @param items 数据列表
   * @param query 分页查询参数
   * @param total 总记录数
   * @returns 分页数据传输对象
   */
  createPaginatedResponseFromQuery<T>(
    items: T[],
    query: PaginationQuery,
    total: number,
  ): PaginatedDataDto<T> {
    const { page, limit } = this.normalizePaginationQuery(query);
    return this.createPaginatedResponse(items, page, limit, total);
  }

  /**
   * 验证分页参数是否有效
   * @param page 页码
   * @param limit 每页条数
   * @param total 总记录数
   * @returns 验证结果和错误信息
   */
  validatePaginationParams(
    page: number,
    limit: number,
    total: number,
  ): { isValid: boolean; error?: string } {
    if (page < 1) {
      return { isValid: false, error: "页码必须大于0" };
    }

    if (limit < 1) {
      return { isValid: false, error: "每页条数必须大于0" };
    }

    if (limit > this.MAX_LIMIT) {
      return {
        isValid: false,
        error: `每页条数不能超过${this.MAX_LIMIT}`,
      };
    }

    if (total >= 0) {
      const totalPages = Math.ceil(total / limit);
      if (page > totalPages && totalPages > 0) {
        return {
          isValid: false,
          error: `页码不能超过总页数${totalPages}`,
        };
      }
    }

    return { isValid: true };
  }
}
