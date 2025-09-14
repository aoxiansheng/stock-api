import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { createLogger } from "@common/logging/index";
import { PaginationService } from "@common/modules/pagination/services/pagination.service";
import { PaginatedDataDto } from "@common/modules/pagination/dto/paginated-data";
import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from "@nestjs/common";
import {
  DataSourceTemplate,
  DataSourceTemplateDocument,
} from "../schemas/data-source-template.schema";
import { DataSourceAnalyzerService } from "./data-source-analyzer.service";
import {
  CreateDataSourceTemplateDto,
  DataSourceTemplateResponseDto,
} from "../dto/data-source-analysis.dto";

@Injectable()
export class DataSourceTemplateService {
  private readonly logger = createLogger(DataSourceTemplateService.name);

  constructor(
    @InjectModel(DataSourceTemplate.name)
    private readonly templateModel: Model<DataSourceTemplateDocument>,
    private readonly paginationService: PaginationService,
    private readonly analyzerService: DataSourceAnalyzerService,
  ) {}

  /**
   * 🎯 创建数据源模板
   */
  async createTemplate(
    dto: CreateDataSourceTemplateDto,
  ): Promise<DataSourceTemplateResponseDto> {
    this.logger.log(`创建数据源模板: ${dto.name}`);

    // 检查是否已存在相同名称的模板
    const existing = await this.templateModel.findOne({
      name: dto.name,
      provider: dto.provider,
      apiType: dto.apiType,
    });

    if (existing) {
      throw new ConflictException(`模板已存在: ${dto.name}`);
    }

    // 如果设置为默认模板，取消其他默认模板
    if (dto.isDefault) {
      await this.templateModel.updateMany(
        { provider: dto.provider, apiType: dto.apiType, isDefault: true },
        { $set: { isDefault: false } },
      );
    }

    const template = new this.templateModel({
      ...dto,
      isActive: true,
      usageCount: 0,
      lastUsedAt: new Date(),
      createdAt: new Date(),
    });

    const saved = await template.save();

    this.logger.log(`数据源模板创建成功: ${saved._id}`);
    return DataSourceTemplateResponseDto.fromDocument(saved);
  }

  /**
   * 📋 分页查询模板
   */
  async findTemplates(
    page?: number,
    limit?: number,
    provider?: string,
    apiType?: string,
    isActive?: boolean,
  ): Promise<PaginatedDataDto<DataSourceTemplateResponseDto>> {
    // 使用PaginationService标准化分页参数
    const { page: normalizedPage, limit: normalizedLimit } =
      this.paginationService.normalizePaginationQuery({
        page,
        limit,
      });

    const filter: any = {};

    if (provider) filter.provider = provider;
    if (apiType) filter.apiType = apiType;
    if (isActive !== undefined) filter.isActive = isActive;

    const query = this.templateModel
      .find(filter)
      .sort({ isDefault: -1, usageCount: -1, createdAt: -1 });

    const [templates, total] = await Promise.all([
      query.skip((normalizedPage - 1) * normalizedLimit).limit(normalizedLimit),
      this.templateModel.countDocuments(filter),
    ]);

    const responseItems = templates.map((template) =>
      DataSourceTemplateResponseDto.fromDocument(template),
    );

    return this.paginationService.createPaginatedResponse(
      responseItems,
      normalizedPage,
      normalizedLimit,
      total,
    );
  }

  /**
   * 🔍 根据ID获取模板
   */
  async findTemplateById(id: string): Promise<DataSourceTemplateResponseDto> {
    // 验证ObjectId格式
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException(`无效的模板ID格式: ${id}`);
    }

    try {
      const template = await this.templateModel.findById(id);

      if (!template) {
        throw new NotFoundException(`数据源模板未找到: ${id}`);
      }

      // 更新使用统计
      template.usageCount += 1;
      template.lastUsedAt = new Date();
      await template.save();

      return DataSourceTemplateResponseDto.fromDocument(template);
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }

      this.logger.error(`查找模板时发生错误`, { id, error: error.message });
      throw new BadRequestException(`查找模板失败: ${error.message}`);
    }
  }

  /**
   * 🎯 查找最佳匹配模板
   */
  async findBestMatchingTemplate(
    provider: string,
    apiType: "rest" | "stream",
  ): Promise<DataSourceTemplateResponseDto | null> {
    this.logger.debug(`查找最佳匹配模板`, { provider, apiType });

    // 1. 首先查找默认模板
    let template = await this.templateModel
      .findOne({
        provider,
        apiType,
        isActive: true,
        isDefault: true,
      })
      .sort({ usageCount: -1 });

    // 2. 如果没有默认模板，查找最常用模板
    if (!template) {
      template = await this.templateModel
        .findOne({
          provider,
          apiType,
          isActive: true,
        })
        .sort({
          usageCount: -1,
          confidence: -1,
          createdAt: -1,
        });
    }

    return template
      ? DataSourceTemplateResponseDto.fromDocument(template)
      : null;
  }

  /**
   * ✏️ 更新模板
   */
  async updateTemplate(
    id: string,
    updateData: Partial<CreateDataSourceTemplateDto>,
  ): Promise<DataSourceTemplateResponseDto> {
    // 验证ObjectId格式
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException(`无效的模板ID格式: ${id}`);
    }

    try {
      const template = await this.templateModel.findByIdAndUpdate(
        id,
        { ...updateData },
        { new: true },
      );

      if (!template) {
        throw new NotFoundException(`数据源模板未找到: ${id}`);
      }

      this.logger.log(`数据源模板更新成功: ${id}`);
      return DataSourceTemplateResponseDto.fromDocument(template);
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }

      this.logger.error(`更新模板时发生错误`, { id, error: error.message });
      throw new BadRequestException(`更新模板失败: ${error.message}`);
    }
  }

  /**
   * 🗑️ 删除模板
   */
  async deleteTemplate(id: string): Promise<void> {
    // 验证ObjectId格式
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException(`无效的模板ID格式: ${id}`);
    }

    try {
      const template = await this.templateModel.findByIdAndDelete(id);

      if (!template) {
        throw new NotFoundException(`数据源模板未找到: ${id}`);
      }

      this.logger.log(`数据源模板删除成功: ${id}`);
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }

      this.logger.error(`删除模板时发生错误`, { id, error: error.message });
      throw new BadRequestException(`删除模板失败: ${error.message}`);
    }
  }

  /**
   * 📊 获取模板统计信息
   */
  async getTemplateStats(): Promise<{
    totalTemplates: number;
    byProvider: Record<string, number>;
    byApiType: Record<string, number>;
    activeTemplates: number;
    defaultTemplates: number;
  }> {
    const [total, byProvider, byApiType, active, defaults] = await Promise.all([
      this.templateModel.countDocuments(),
      this.templateModel.aggregate([
        { $group: { _id: "$provider", count: { $sum: 1 } } },
      ]),
      this.templateModel.aggregate([
        { $group: { _id: "$apiType", count: { $sum: 1 } } },
      ]),
      this.templateModel.countDocuments({ isActive: true }),
      this.templateModel.countDocuments({ isDefault: true }),
    ]);

    return {
      totalTemplates: total,
      byProvider: Object.fromEntries(byProvider.map((p) => [p._id, p.count])),
      byApiType: Object.fromEntries(byApiType.map((a) => [a._id, a.count])),
      activeTemplates: active,
      defaultTemplates: defaults,
    };
  }

  /**
   * 🎯 根据分析结果创建模板
   */
  async createTemplateFromAnalysis(dto: {
    name: string;
    provider: string;
    apiType: "rest" | "stream";
    sampleData: any;
    description?: string;
  }): Promise<DataSourceTemplateResponseDto> {
    this.logger.log(`根据分析结果创建模板: ${dto.name}`);

    // 1. 使用分析器分析数据
    const analysis = await this.analyzerService.analyzeDataSource(
      dto.sampleData,
      dto.provider,
      dto.apiType,
    );

    // 2. 创建模板
    const templateDto: CreateDataSourceTemplateDto = {
      name: dto.name,
      provider: dto.provider,
      apiType: dto.apiType,
      description: dto.description || `${dto.provider} ${dto.apiType} 数据模板`,
      sampleData: dto.sampleData,
      extractedFields: analysis.extractedFields,
      confidence: analysis.confidence,
      isDefault: false,
    };

    return await this.createTemplate(templateDto);
  }
}
