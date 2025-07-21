import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";

import {
  SecurityScanResult,
  SecurityScanResultDocument,
} from "../schemas/security-scan-result.schema";

/**
 * 封装安全扫描结果数据访问逻辑的仓储
 */
@Injectable()
export class SecurityScanResultRepository {
  constructor(
    @InjectModel(SecurityScanResult.name)
    private readonly scanResultModel: Model<SecurityScanResultDocument>,
  ) {}

  /**
   * 创建并保存一个新的安全扫描结果
   * @param scanResultData 扫描结果数据
   * @returns 已保存的文档
   */
  async create(
    scanResultData: SecurityScanResult,
  ): Promise<SecurityScanResultDocument> {
    const newScan = new this.scanResultModel(scanResultData);
    return newScan.save();
  }

  /**
   * 获取最近的扫描历史记录
   * @param limit 获取的记录数
   * @returns 扫描结果文档列表
   */
  async findMostRecent(limit: number): Promise<SecurityScanResultDocument[]> {
    return this.scanResultModel
      .find()
      .sort({ timestamp: -1 })
      .limit(limit)
      .lean()
      .exec();
  }
}
