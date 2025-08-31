import { QueryRequestDto } from '../dto/query-request.dto';
import { QueryExecutionResultDto } from '../dto/query-internal.dto';

/**
 * Query执行器接口
 * 
 * 定义所有查询执行器必须实现的标准接口，支持不同类型的查询逻辑扩展
 */
export interface QueryExecutor {
  /**
   * 执行查询请求
   * 
   * @param request 查询请求DTO
   * @returns 查询执行结果
   */
  execute(request: QueryRequestDto): Promise<QueryExecutionResultDto>;
}