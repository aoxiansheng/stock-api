import { Module, Global } from '@nestjs/common';
import { PaginationService } from '../services/pagination.service';

/**
 * 分页服务全局模块
 * 提供统一的分页处理服务，可在应用的任何地方注入使用
 */
@Global()
@Module({
  providers: [PaginationService],
  exports: [PaginationService],
})
export class PaginationModule {} 