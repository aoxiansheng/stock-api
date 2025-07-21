import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";

import { CreateSymbolMappingDto } from "../dto/create-symbol-mapping.dto";
import { SymbolMappingQueryDto } from "../dto/symbol-mapping-query.dto";
import { UpdateSymbolMappingDto } from "../dto/update-symbol-mapping.dto";
import {
  SymbolMappingRule,
  SymbolMappingRuleDocument,
  MappingRule,
} from "../schemas/symbol-mapping-rule.schema";

@Injectable()
export class SymbolMappingRepository {
  constructor(
    @InjectModel(SymbolMappingRule.name)
    private symbolMappingRuleModel: Model<SymbolMappingRuleDocument>,
  ) {}

  async create(
    createDto: CreateSymbolMappingDto,
  ): Promise<SymbolMappingRuleDocument> {
    const created = new this.symbolMappingRuleModel({
      ...createDto,
      isActive: createDto.isActive ?? true,
    });
    return created.save();
  }

  async findById(id: string): Promise<SymbolMappingRuleDocument | null> {
    return this.symbolMappingRuleModel.findById(id).exec();
  }

  async findByDataSource(
    dataSourceName: string,
  ): Promise<SymbolMappingRuleDocument | null> {
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
        { "mappingRules.inputSymbol": { $regex: query.search, $options: "i" } },
        {
          "mappingRules.outputSymbol": { $regex: query.search, $options: "i" },
        },
      ];
    }

    // 市场和股票类型过滤
    if (query.market) {
      filter["mappingRules.market"] = query.market;
    }

    if (query.symbolType) {
      filter["mappingRules.symbolType"] = query.symbolType;
    }

    const page = query.page || 1;
    const limit = query.limit || 10;
    const skip = (page - 1) * limit;

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
      .distinct("mappingRules.market")
      .exec();
    return results.filter((market) => market); // 过滤掉null值
  }

  async getSymbolTypes(): Promise<string[]> {
    const results = await this.symbolMappingRuleModel
      .distinct("mappingRules.symbolType")
      .exec();
    return results.filter((type) => type); // 过滤掉null值
  }

  // 核心映射查询方法
  async findMappingsForSymbols(
    dataSourceName: string,
    inputSymbols: string[],
  ): Promise<MappingRule[]> {
    const result = await this.symbolMappingRuleModel
      .findOne(
        {
          dataSourceName,
          isActive: true,
          "mappingRules.inputSymbol": { $in: inputSymbols },
          "mappingRules.isActive": { $ne: false },
        },
        { "mappingRules.$": 1 },
      )
      .exec();

    if (!result) return [];

    // 过滤匹配的映射规则
    return result.mappingRules.filter(
      (rule) =>
        inputSymbols.includes(rule.inputSymbol) && rule.isActive !== false,
    );
  }

  // 批量查询优化版本
  async findAllMappingsForSymbols(
    dataSourceName: string,
    inputSymbols: string[],
  ): Promise<MappingRule[]> {
    const pipeline = [
      {
        $match: {
          dataSourceName,
          isActive: true,
        },
      },
      {
        $unwind: "$mappingRules",
      },
      {
        $match: {
          "mappingRules.inputSymbol": { $in: inputSymbols },
          "mappingRules.isActive": { $ne: false },
        },
      },
      {
        $replaceRoot: { newRoot: "$mappingRules" },
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
  async addMappingRule(
    dataSourceName: string,
    mappingRule: MappingRule,
  ): Promise<SymbolMappingRuleDocument | null> {
    return this.symbolMappingRuleModel
      .findOneAndUpdate(
        { dataSourceName },
        { $push: { mappingRules: mappingRule } },
        { new: true },
      )
      .exec();
  }

  // 更新特定的映射规则
  async updateMappingRule(
    dataSourceName: string,
    inputSymbol: string,
    updateData: Partial<MappingRule>,
  ): Promise<SymbolMappingRuleDocument | null> {
    return this.symbolMappingRuleModel
      .findOneAndUpdate(
        {
          dataSourceName,
          "mappingRules.inputSymbol": inputSymbol,
        },
        {
          $set: Object.keys(updateData).reduce((acc, key) => {
            acc[`mappingRules.$.${key}`] = updateData[key];
            return acc;
          }, {}),
        },
        { new: true },
      )
      .exec();
  }

  // 删除特定的映射规则
  async removeMappingRule(
    dataSourceName: string,
    inputSymbol: string,
  ): Promise<SymbolMappingRuleDocument | null> {
    return this.symbolMappingRuleModel
      .findOneAndUpdate(
        { dataSourceName },
        { $pull: { mappingRules: { inputSymbol } } },
        { new: true },
      )
      .exec();
  }

  // 批量替换映射规则
  async replaceMappingRules(
    dataSourceName: string,
    mappingRules: MappingRule[],
  ): Promise<SymbolMappingRuleDocument | null> {
    return this.symbolMappingRuleModel
      .findOneAndUpdate(
        { dataSourceName },
        { $set: { mappingRules } },
        { new: true },
      )
      .exec();
  }
}
