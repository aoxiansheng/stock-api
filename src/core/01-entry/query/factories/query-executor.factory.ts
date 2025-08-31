import { BadRequestException, Injectable } from '@nestjs/common';

import { QueryType } from '../dto/query-types.dto';
import { QueryExecutor } from '../interfaces/query-executor.interface';
import { SymbolQueryExecutor } from './executors/symbol-query.executor';
import { MarketQueryExecutor } from './executors/market-query.executor';

/**
 * Query执行器工厂服务
 * 
 * 核心设计理念：
 * - 工厂模式：根据查询类型创建相应的执行器实例
 * - 可扩展性：新增查询类型只需添加新的执行器和工厂映射
 * - 依赖注入：所有执行器通过NestJS DI容器管理
 * - 类型安全：强类型检查确保查询类型和执行器匹配
 * 
 * 支持的查询类型：
 * - BY_SYMBOLS: 基于符号列表的查询（现有逻辑迁移）
 * - BY_MARKET: 基于市场的查询（未来扩展）
 * - BY_PROVIDER: 基于提供商的查询（未来扩展）
 */
@Injectable()
export class QueryExecutorFactory {
  constructor(
    private readonly symbolExecutor: SymbolQueryExecutor,
    private readonly marketExecutor: MarketQueryExecutor,
  ) {}

  /**
   * 创建查询执行器
   * 
   * @param queryType 查询类型枚举
   * @returns 对应的查询执行器实例
   * @throws BadRequestException 当查询类型不支持时
   */
  create(queryType: QueryType): QueryExecutor {
    switch (queryType) {
      case QueryType.BY_SYMBOLS:
        return this.symbolExecutor;
      
      case QueryType.BY_MARKET:
        return this.marketExecutor;
      
      // 未来可扩展的查询类型
      // case QueryType.BY_PROVIDER:
      //   return this.providerExecutor;
      // 
      // case QueryType.BY_SECTOR:
      //   return this.sectorExecutor;
      
      default:
        throw new BadRequestException(`不支持的查询类型: ${queryType}`);
    }
  }

  /**
   * 获取支持的查询类型列表
   * 
   * @returns 支持的查询类型数组
   */
  getSupportedQueryTypes(): QueryType[] {
    return [
      QueryType.BY_SYMBOLS,
      QueryType.BY_MARKET,
    ];
  }

  /**
   * 检查查询类型是否受支持
   * 
   * @param queryType 查询类型
   * @returns 是否支持该查询类型
   */
  isQueryTypeSupported(queryType: QueryType): boolean {
    return this.getSupportedQueryTypes().includes(queryType);
  }
}