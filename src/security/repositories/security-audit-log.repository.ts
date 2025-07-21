import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { createLogger } from '@common/config/logger.config';

import {
  SecurityAuditLog,
  SecurityAuditLogDocument,
} from '../schemas/security-audit-log.schema';

interface AuditLogFilters {
  startDate?: Date;
  endDate?: Date;
  type?: string;
  severity?: string;
  clientIP?: string;
  userId?: string;
  outcome?: string;
}

@Injectable()
export class SecurityAuditLogRepository {
  private readonly logger = createLogger(SecurityAuditLogRepository.name);

  constructor(
    @InjectModel(SecurityAuditLog.name)
    private readonly auditLogModel: Model<SecurityAuditLogDocument>,
  ) {}

  async insertMany(logs: Partial<SecurityAuditLog>[]): Promise<void> {
    const operation = 'insertMany';
    try {
      await this.auditLogModel.insertMany(logs);
      this.logger.debug(
        { operation, count: logs.length },
        '批量保存审计日志成功',
      );
    } catch (error) {
      this.logger.error({ operation, error: error.stack }, '保存审计日志失败');
      // Re-throw the original error to be handled by a global exception filter
      throw error;
    }
  }

  async findWithFilters(
    filters: AuditLogFilters = {},
    limit = 100,
    offset = 0,
  ): Promise<SecurityAuditLogDocument[]> {
    const operation = 'findWithFilters';
    const query: any = {};

    if (filters.startDate || filters.endDate) {
      query.timestamp = {};
      if (filters.startDate) query.timestamp.$gte = filters.startDate;
      if (filters.endDate) query.timestamp.$lte = filters.endDate;
    }
    if (filters.type) query.type = filters.type;
    if (filters.severity) query.severity = filters.severity;
    if (filters.clientIP) query.clientIP = filters.clientIP;
    if (filters.userId) query.userId = filters.userId;
    if (filters.outcome) query.outcome = filters.outcome;

    try {
      return await this.auditLogModel
        .find(query)
        .sort({ timestamp: -1 })
        .skip(offset)
        .limit(limit)
        .lean()
        .exec();
    } catch (error) {
      this.logger.error(
        { operation, filters, error: error.stack },
        '获取审计日志失败',
      );
      // Re-throw to allow global error handlers to process it
      throw new InternalServerErrorException('获取审计日志失败');
    }
  }
} 