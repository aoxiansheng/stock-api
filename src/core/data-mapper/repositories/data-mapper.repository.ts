import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";

import { CreateDataMappingDto } from "../dto/create-data-mapping.dto";
import { DataMappingQueryDto } from "../dto/data-mapping-query.dto";
import { UpdateDataMappingDto } from "../dto/update-data-mapping.dto";
import {
  DataMappingRule,
  DataMappingRuleDocument,
} from "../schemas/data-mapper.schema";
import { PaginationService } from "@common/pagination/services/pagination.service";

@Injectable()
export class DataMappingRepository {
  constructor(
    @InjectModel(DataMappingRule.name)
    private dataMappingRuleModel: Model<DataMappingRuleDocument>,
    private readonly paginationService: PaginationService,
  ) {}

  async create(
    createDto: CreateDataMappingDto,
  ): Promise<DataMappingRuleDocument> {
    const created = new this.dataMappingRuleModel({
      ...createDto,
      isActive: createDto.isActive ?? true,
      version: createDto.version || "1.0.0",
    });
    return created.save();
  }

  async findById(id: string): Promise<DataMappingRuleDocument | null> {
    return this.dataMappingRuleModel.findById(id).exec();
  }

  async findAll(): Promise<DataMappingRuleDocument[]> {
    return this.dataMappingRuleModel
      .find({ isActive: true })
      .sort({ createdAt: -1 })
      .exec();
  }

  async findAllIncludingDeactivated(): Promise<DataMappingRuleDocument[]> {
    return this.dataMappingRuleModel.find().sort({ createdAt: -1 }).exec();
  }

  async findByProvider(provider: string): Promise<DataMappingRuleDocument[]> {
    return this.dataMappingRuleModel
      .find({ provider, isActive: true })
      .sort({ createdAt: -1 })
      .exec();
  }

  async findByProviderAndType(
    provider: string,
    dataRuleListType: string,
  ): Promise<DataMappingRuleDocument[]> {
    return this.dataMappingRuleModel
      .find({ provider, dataRuleListType, isActive: true })
      .sort({ createdAt: -1 })
      .exec();
  }

  async findPaginated(query: DataMappingQueryDto): Promise<{
    items: any[];
    total: number;
  }> {
    const filter: any = {};

    if (query.provider) {
      filter.provider = { $regex: query.provider, $options: "i" };
    }

    if (query.dataRuleListType) {
      filter.dataRuleListType = query.dataRuleListType;
    }

    if (query.isActive !== undefined) {
      filter.isActive = query.isActive;
    }

    if (query.search) {
      filter.$or = [
        { name: { $regex: query.search, $options: "i" } },
        { description: { $regex: query.search, $options: "i" } },
        { provider: { $regex: query.search, $options: "i" } },
      ];
    }

    const { page, limit } = this.paginationService.normalizePaginationQuery(query);
    const skip = this.paginationService.calculateSkip(page, limit);

    const [items, total] = await Promise.all([
      this.dataMappingRuleModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean()
        .exec(),
      this.dataMappingRuleModel.countDocuments(filter).exec(),
    ]);

    return { items, total };
  }

  async updateById(
    id: string,
    updateDto: UpdateDataMappingDto,
  ): Promise<DataMappingRuleDocument | null> {
    return this.dataMappingRuleModel
      .findByIdAndUpdate(id, updateDto, { new: true })
      .exec();
  }

  async deleteById(id: string): Promise<DataMappingRuleDocument | null> {
    return this.dataMappingRuleModel.findByIdAndDelete(id).exec();
  }

  async activate(id: string): Promise<DataMappingRuleDocument | null> {
    return this.dataMappingRuleModel
      .findByIdAndUpdate(id, { isActive: true }, { new: true })
      .exec();
  }

  async deactivate(id: string): Promise<DataMappingRuleDocument | null> {
    return this.dataMappingRuleModel
      .findByIdAndUpdate(id, { isActive: false }, { new: true })
      .exec();
  }

  async getProviders(): Promise<string[]> {
    const results = await this.dataMappingRuleModel.distinct("provider").exec();
    return results;
  }

  async getRuleListTypes(): Promise<string[]> {
    const results = await this.dataMappingRuleModel
      .distinct("dataRuleListType")
      .exec();
    return results;
  }

  async countByProvider(provider: string): Promise<number> {
    return this.dataMappingRuleModel
      .countDocuments({ provider, isActive: true })
      .exec();
  }

  async countByRuleListType(dataRuleListType: string): Promise<number> {
    return this.dataMappingRuleModel
      .countDocuments({ dataRuleListType, isActive: true })
      .exec();
  }

  // 查找最佳匹配的映射规则
  async findBestMatchingRule(
    provider: string,
    dataRuleListType: string,
  ): Promise<DataMappingRuleDocument | null> {
    return this.dataMappingRuleModel
      .findOne({ provider, dataRuleListType, isActive: true })
      .sort({ createdAt: -1 }) // 最新创建的优先
      .exec();
  }
}
