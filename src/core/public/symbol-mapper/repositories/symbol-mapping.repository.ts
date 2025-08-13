import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";

import { PaginationService } from "@common/modules/pagination/services/pagination.service";
import { CreateSymbolMappingDto } from "../dto/create-symbol-mapping.dto";
import { SymbolMappingQueryDto } from "../dto/symbol-mapping-query.dto";
import { UpdateSymbolMappingDto } from "../dto/update-symbol-mapping.dto";
import {
  SymbolMappingRuleDocument,
  SymbolMappingRuleDocumentType,
  SymbolMappingRule,
} from "../schemas/symbol-mapping-rule.schema";

@Injectable()
export class SymbolMappingRepository {
  constructor(
    @InjectModel(SymbolMappingRuleDocument.name)
    private symbolMappingRuleModel: Model<SymbolMappingRuleDocumentType>,
    private readonly paginationService: PaginationService,
  ) {}

  async create(
    createDto: CreateSymbolMappingDto,
  ): Promise<SymbolMappingRuleDocumentType> {
    const created = new this.symbolMappingRuleModel({
      ...createDto,
      isActive: createDto.isActive ?? true,
    });
    return created.save();
  }

  async findById(id: string): Promise<SymbolMappingRuleDocumentType | null> {
    return this.symbolMappingRuleModel.findById(id).exec();
  }

  async findByDataSource(
    dataSourceName: string,
  ): Promise<SymbolMappingRuleDocumentType | null> {
    return this.symbolMappingRuleModel
      .findOne({ dataSourceName, isActive: true })
      .exec();
  }

  async findPaginated(query: SymbolMappingQueryDto): Promise<{
    items: any[];
    total: number;
  }> {
    const filter: any = {};

    if (query.dataSourceName) {
      filter.dataSourceName = { $regex: query.dataSourceName, $options: "i" };
    }

    if (query.isActive !== undefined) {
      filter.isActive = query.isActive;
    }

    if (query.search) {
      filter.$or = [
        { dataSourceName: { $regex: query.search, $options: "i" } },
        { description: { $regex: query.search, $options: "i" } },
        { "SymbolMappingRule.standardSymbol": { $regex: query.search, $options: "i" } },
        {
          "SymbolMappingRule.sdkSymbol": { $regex: query.search, $options: "i" },
        },
      ];
    }

    // 市场和股票类型过滤
    if (query.market) {
      filter["SymbolMappingRule.market"] = query.market;
    }

    if (query.symbolType) {
      filter["SymbolMappingRule.symbolType"] = query.symbolType;
    }

    const { page, limit } = this.paginationService.normalizePaginationQuery(query);
    const skip = this.paginationService.calculateSkip(page, limit);

    const [items, total] = await Promise.all([
      this.symbolMappingRuleModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean()
        .exec(),
      this.symbolMappingRuleModel.countDocuments(filter).exec(),
    ]);

    return { items, total };
  }

  async updateById(
    id: string,
    updateDto: UpdateSymbolMappingDto,
  ): Promise<SymbolMappingRuleDocument | null> {
    return this.symbolMappingRuleModel
      .findByIdAndUpdate(id, updateDto, { new: true })
      .exec();
  }

  async deleteById(id: string): Promise<SymbolMappingRuleDocument | null> {
    return this.symbolMappingRuleModel.findByIdAndDelete(id).exec();
  }

  async exists(dataSourceName: string): Promise<boolean> {
    const count = await this.symbolMappingRuleModel
      .countDocuments({ dataSourceName })
      .exec();
    return count > 0;
  }

  async getDataSources(): Promise<string[]> {
    const results = await this.symbolMappingRuleModel
      .distinct("dataSourceName")
      .exec();
    return results;
  }

  async getMarkets(): Promise<string[]> {
    const results = await this.symbolMappingRuleModel
      .distinct("SymbolMappingRule.market")
      .exec();
    return results.filter((market) => market); // 过滤掉null值
  }

  async getSymbolTypes(): Promise<string[]> {
    const results = await this.symbolMappingRuleModel
      .distinct("SymbolMappingRule.symbolType")
      .exec();
    return results.filter((type) => type); // 过滤掉null值
  }

  // 核心映射查询方法
  async findMappingsForSymbols(
    dataSourceName: string,
    standardSymbols: string[],
  ): Promise<SymbolMappingRule[]> {
    const result = await this.symbolMappingRuleModel
      .findOne(
        {
          dataSourceName,
          isActive: true,
          "SymbolMappingRule.standardSymbol": { $in: standardSymbols },
          "SymbolMappingRule.isActive": { $ne: false },
        },
        { "SymbolMappingRule.$": 1 },
      )
      .exec();

    if (!result) return [];

    // 过滤匹配的映射规则
    return result.SymbolMappingRule.filter(
      (rule) =>
        standardSymbols.includes(rule.standardSymbol) && rule.isActive !== false,
    );
  }

  // 批量查询优化版本
  async findAllMappingsForSymbols(
    dataSourceName: string,
    standardSymbols: string[],
  ): Promise<SymbolMappingRule[]> {
    const pipeline = [
      {
        $match: {
          dataSourceName,
          isActive: true,
        },
      },
      {
        $unwind: "$SymbolMappingRule",
      },
      {
        $match: {
          "SymbolMappingRule.standardSymbol": { $in: standardSymbols },
          "SymbolMappingRule.isActive": { $ne: false },
        },
      },
      {
        $replaceRoot: { newRoot: "$SymbolMappingRule" },
      },
    ];

    return this.symbolMappingRuleModel.aggregate(pipeline).exec();
  }

  async deleteByDataSource(
    dataSourceName: string,
  ): Promise<{ deletedCount: number }> {
    const result = await this.symbolMappingRuleModel
      .deleteMany({ dataSourceName })
      .exec();
    return { deletedCount: result.deletedCount || 0 };
  }

  // 添加映射规则到现有数据源
  async addSymbolMappingRule(
    dataSourceName: string,
    symbolMappingRule: SymbolMappingRule,
  ): Promise<SymbolMappingRuleDocument | null> {
    return this.symbolMappingRuleModel
      .findOneAndUpdate(
        { dataSourceName },
        { $push: { SymbolMappingRule: symbolMappingRule } },
        { new: true },
      )
      .exec();
  }

  // 更新特定的映射规则
  async updateSymbolMappingRule(
    dataSourceName: string,
    standardSymbol: string,
    updateData: Partial<SymbolMappingRule>,
  ): Promise<SymbolMappingRuleDocument | null> {
    return this.symbolMappingRuleModel
      .findOneAndUpdate(
        {
          dataSourceName,
          "SymbolMappingRule.standardSymbol": standardSymbol,
        },
        {
          $set: Object.keys(updateData).reduce((acc, key) => {
            acc[`SymbolMappingRule.$.${key}`] = updateData[key];
            return acc;
          }, {}),
        },
        { new: true },
      )
      .exec();
  }

  // 删除特定的映射规则
  async removeSymbolMappingRule(
    dataSourceName: string,
    standardSymbol: string,
  ): Promise<SymbolMappingRuleDocument | null> {
    return this.symbolMappingRuleModel
      .findOneAndUpdate(
        { dataSourceName },
        { $pull: { SymbolMappingRule: { standardSymbol } } },
        { new: true },
      )
      .exec();
  }

  // 批量替换映射规则
  async replaceSymbolMappingRule(
    dataSourceName: string,
    SymbolMappingRule: SymbolMappingRule[],
  ): Promise<SymbolMappingRuleDocument | null> {
    return this.symbolMappingRuleModel
      .findOneAndUpdate(
        { dataSourceName },
        { $set: { SymbolMappingRule } },
        { new: true },
      )
      .exec();
  }

  // 获取所有映射规则
  async findAll(): Promise<SymbolMappingRuleDocument[]> {
    return this.symbolMappingRuleModel.find({ isActive: true }).exec();
  }

  /**
   * 🎯 监听数据变化 (Change Stream)
   */
  watchChanges(): any {
    return this.symbolMappingRuleModel.watch([
      {
        $match: {
          operationType: { $in: ['insert', 'update', 'delete'] }
        }
      }
    ], {
      fullDocument: 'updateLookup'
    });
  }

  /**
   * 🎯 获取所有数据源的最新更新时间
   */
  async getDataSourceVersions(): Promise<Map<string, Date>> {
    const versions = new Map<string, Date>();
    
    const dataSources = await this.symbolMappingRuleModel
      .find({ isActive: true })
      .select('dataSourceName updatedAt')
      .exec();
    
    for (const doc of dataSources) {
      const currentVersion = versions.get(doc.dataSourceName);
      if (!currentVersion || doc.updatedAt > currentVersion) {
        versions.set(doc.dataSourceName, doc.updatedAt);
      }
    }
    
    return versions;
  }
}
