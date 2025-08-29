import { Injectable } from '@nestjs/common';

import { QueryRequestDto } from '../../dto/query-request.dto';
import { QueryExecutionResultDto } from '../../dto/query-internal.dto';
import { QueryExecutor } from '../query-executor.factory';
import { QueryService } from '../../services/query.service';

/**
 * 基于符号列表的查询执行器
 * 
 * 负责处理BY_SYMBOLS类型的查询请求，这是系统中最常用的查询类型。
 * 
 * 核心功能：
 * - 处理单个或多个股票符号的数据查询
 * - 自动市场检测和符号格式化
 * - 智能缓存和批量处理
 * - 多数据源聚合和结果标准化
 * 
 * 该执行器将现有QueryService中的executeSymbolBasedQuery逻辑进行封装，
 * 为工厂模式提供标准接口实现。
 */
@Injectable()
export class SymbolQueryExecutor implements QueryExecutor {
  constructor(private readonly queryService: QueryService) {}

  /**
   * 执行基于符号的查询
   * 
   * 处理流程：
   * 1. 验证和标准化输入符号
   * 2. 检查智能缓存
   * 3. 执行批量处理管道
   * 4. 合并和标准化结果
   * 5. 记录性能指标
   * 
   * @param request 查询请求DTO，必须包含symbols字段
   * @returns 查询执行结果
   */
  async execute(request: QueryRequestDto): Promise<QueryExecutionResultDto> {
    // 直接委托给QueryService的现有实现
    return await this.queryService.executeSymbolBasedQuery(request);
  }
}