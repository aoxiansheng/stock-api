import { PaginatedDataDto } from "@common/modules/pagination/dto/paginated-data";
import { QueryMetadataDto } from "./query-response.dto";

/**
 * 查询处理结果DTO (内部DTO)
 * 
 * 用于查询结果处理后、转换为响应DTO前的中间表示
 */
export interface QueryProcessedResultDto {
  data: PaginatedDataDto;
  metadata: QueryMetadataDto;
} 