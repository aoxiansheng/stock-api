import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  ValidationPipe,
  UseGuards,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiParam } from "@nestjs/swagger";
import { ThrottlerGuard, Throttle } from "@nestjs/throttler";

import { createLogger } from "@common/config/logger.config";
import {
  ApiSuccessResponse,
  ApiCreatedResponse,
  ApiStandardResponses,
} from "@common/core/decorators/swagger-responses.decorator";

import { ApiKeyAuth } from "../../../auth/decorators/auth.decorator";
import { RequirePermissions } from "../../../auth/decorators/permissions.decorator";
import { Permission } from "../../../auth/enums/user-role.enum";

import { DataMapperService } from "../services/data-mapper.service";
import { CreateDataMappingDto } from "../dto/create-data-mapping.dto";
import { DataMappingQueryDto } from "../dto/data-mapping-query.dto";
import {
  DataMappingResponseDto,
  ParsedFieldsResponseDto,
  FieldSuggestionResponseDto,
} from "../dto/data-mapping-response.dto";
import { PaginatedDataDto } from '@common/modules/pagination/dto/paginated-data';
import {
  UpdateDataMappingDto,
  ParseJsonDto,
  FieldSuggestionDto,
  ApplyMappingDto,
  TestMappingDto,
} from "../dto/update-data-mapping.dto";

@ApiTags("🗺️ 数据映射器")
@Controller("data-mapper")
export class DataMapperController {
  private readonly logger = createLogger(DataMapperController.name);

  constructor(private readonly dataMapperService: DataMapperService) {}

  @ApiKeyAuth()
  @RequirePermissions(Permission.MAPPING_WRITE)
  @Post()
  @ApiOperation({
    summary: "🛠️ 创建数据映射规则",
    description: `
### 功能说明
创建新的数据映射规则，用于将不同数据源的原始字段映射到标准化字段。

### 管理员权限
此操作需要管理员权限，因为映射规则影响整个系统的数据处理逻辑。

### 使用场景
- 集成新的数据源时创建映射规则
- 定义字段转换和标准化逻辑
- 支持嵌套对象和数组字段映射
    `,
  })
  @ApiCreatedResponse({ type: DataMappingResponseDto })
  @ApiStandardResponses()
  async create(@Body(ValidationPipe) createDto: CreateDataMappingDto) {
    this.logger.log(`API Request: Create data mapping rule`, {
      name: createDto.name,
      provider: createDto.provider,
      transDataRuleListType: createDto.transDataRuleListType,
      dataFieldMappingsCount: createDto.sharedDataFieldMappings.length,
    });

    try {
      const result = await this.dataMapperService.create(createDto);

      this.logger.log(`API Success: Data mapping rule created successfully`, {
        id: result.id,
        name: result.name,
        provider: result.provider,
      });

      // 遵循控制器编写规范：让拦截器自动处理响应格式化
      return result;
    } catch (error: any) {
      this.logger.error(`API Error: Failed to create data mapping rule`, {
        name: createDto.name,
        error: error.message,
        errorType: error.constructor.name,
      });
      throw error;
    }
  }

  @ApiKeyAuth()
  @RequirePermissions(Permission.CONFIG_READ)
  @Post("parse-json")
  @ApiOperation({
    summary: "🔍 解析JSON结构并提取字段",
    description: `
### 功能说明
智能解析JSON数据结构，自动提取所有字段路径和类型信息。

### 主要特性
- **🤖 智能识别**: 自动识别嵌套对象和数组结构
- **📊 类型分析**: 分析字段数据类型（string, number, boolean等）
- **🗂️ 路径生成**: 生成完整的字段访问路径
- **💡 建议生成**: 为字段映射提供智能建议

### 适用场景
- 分析新数据源的数据结构
- 创建映射规则前的字段发现
- 数据结构变更检测
    `,
  })
  @ApiSuccessResponse({ type: ParsedFieldsResponseDto })
  @ApiStandardResponses()
  async parseJson(@Body(ValidationPipe) parseJsonDto: ParseJsonDto) {
    this.logger.log(`API Request: Parse JSON structure`);

    try {
      const result = await this.dataMapperService.parseJson(parseJsonDto);

      this.logger.log(`API Success: JSON parsed successfully`, {
        fieldsCount: result.fields.length,
        fields: result.fields.slice(0, 5), // Log first 5 fields
      });

      // 遵循控制器编写规范：让拦截器自动处理响应格式化
      return result;
    } catch (error: any) {
      this.logger.error(`API Error: JSON parsing failed`, {
        error: error.message,
        errorType: error.constructor.name,
      });
      throw error;
    }
  }

  @ApiKeyAuth()
  @RequirePermissions(Permission.CONFIG_READ)
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  @Post("field-suggestions")
  @ApiOperation({
    summary: "💡 获取字段映射智能建议",
    description: `
### 功能说明
基于字段名称相似度和语义分析，提供智能的字段映射建议。

### 权限要求
此接口需要 CONFIG_READ 权限和 API Key 认证，并有频率限制保护。

### 智能算法
- **📝 名称匹配**: 基于字段名称相似度计算
- **🧠 语义分析**: 理解字段含义和业务逻辑
- **📊 历史学习**: 基于历史映射数据优化建议
- **🎯 置信度评分**: 为每个建议提供置信度分数

### 使用场景
- 创建新映射规则时的辅助工具
- 减少手动配置工作量
- 提高映射准确性
    `,
  })
  @ApiSuccessResponse({ type: FieldSuggestionResponseDto })
  @ApiStandardResponses()
  async getFieldSuggestions(
    @Body(ValidationPipe) fieldSuggestionDto: FieldSuggestionDto,
  ) {
    this.logger.log(`API Request: Get field mapping suggestions`, {
      sourceFieldsCount: fieldSuggestionDto.sourceFields.length,
      targetFieldsCount: fieldSuggestionDto.targetFields.length,
    });

    const result =
      await this.dataMapperService.getFieldSuggestions(fieldSuggestionDto);

    this.logger.log(`API Success: Field suggestions generated successfully`, {
      suggestionsCount: result.suggestions.length,
    });

    // 遵循控制器编写规范：让拦截器自动处理响应格式化
    return result;
  }

  @ApiKeyAuth()
  @RequirePermissions(Permission.CONFIG_READ)
  @Post("apply")
  @ApiOperation({ summary: "Apply mapping rule to transform data" })
  @ApiSuccessResponse()
  @ApiStandardResponses()
  async applyMappingRule(@Body(ValidationPipe) applyDto: ApplyMappingDto) {
    this.logger.log(`API Request: Apply mapping rule`, {
      ruleId: applyDto.ruleId,
    });

    try {
      const result = await this.dataMapperService.applyMappingRule(
        applyDto.ruleId,
        applyDto.sourceData,
      );

      this.logger.log(`API Success: Mapping rule applied successfully`, {
        ruleId: applyDto.ruleId,
        resultCount: Array.isArray(result) ? result.length : 1,
      });

      // 遵循控制器编写规范：让拦截器自动处理响应格式化
      return result;
    } catch (error: any) {
      this.logger.error(`API Error: Mapping rule application failed`, {
        ruleId: applyDto.ruleId,
        error: error.message,
        errorType: error.constructor.name,
      });
      throw error;
    }
  }

  @ApiKeyAuth()
  @RequirePermissions(Permission.CONFIG_READ)
  @Post("test")
  @ApiOperation({ summary: "Test mapping rule" })
  @ApiSuccessResponse()
  @ApiStandardResponses()
  async testMappingRule(@Body(ValidationPipe) testDto: TestMappingDto) {
    this.logger.log(`API Request: Test mapping rule`, {
      ruleId: testDto.ruleId,
    });

    const result = await this.dataMapperService.testMappingRule(testDto);

    this.logger.log(`API Success: Mapping rule test completed`, {
      ruleId: testDto.ruleId,
      success: result.success,
    });

    // 遵循控制器编写规范：让拦截器自动处理响应格式化
    return result;
  }

  @ApiKeyAuth()
  @RequirePermissions(Permission.CONFIG_READ)
  @Get()
  @ApiOperation({ summary: "Get paginated data mapping rules" })
  @ApiSuccessResponse({ type: PaginatedDataDto })
  @ApiStandardResponses()
  async findAll(@Query(ValidationPipe) query: DataMappingQueryDto) {
    const result = await this.dataMapperService.findPaginated(query);
    // 遵循控制器编写规范：让拦截器自动处理响应格式化
    return result;
  }

  @ApiKeyAuth()
  @RequirePermissions(Permission.CONFIG_READ)
  @Get("all")
  @ApiOperation({ summary: "Get all active data mapping rules" })
  @ApiSuccessResponse({ type: [DataMappingResponseDto] })
  @ApiStandardResponses()
  async findAllActive() {
    const result = await this.dataMapperService.findAll();
    // 遵循控制器编写规范：让拦截器自动处理响应格式化
    return result;
  }

  @ApiKeyAuth()
  @RequirePermissions(Permission.MAPPING_WRITE)
  @Get("all-including-deactivated")
  @ApiOperation({
    summary: "Get all data mapping rules including deactivated ones",
  })
  @ApiSuccessResponse({ type: [DataMappingResponseDto] })
  @ApiStandardResponses()
  async findAllIncludingDeactivated() {
    const result = await this.dataMapperService.findAllIncludingDeactivated();
    // 遵循控制器编写规范：让拦截器自动处理响应格式化
    return result;
  }

  @ApiKeyAuth()
  @RequirePermissions(Permission.CONFIG_READ)
  @Get("provider/:provider")
  @ApiOperation({ summary: "Get data mapping rules by provider" })
  @ApiParam({ name: "provider", description: "Provider name" })
  @ApiSuccessResponse({ type: [DataMappingResponseDto] })
  @ApiStandardResponses()
  async findByProvider(@Param("provider") provider: string) {
    const result = await this.dataMapperService.findByProvider(provider);
    // 遵循控制器编写规范：让拦截器自动处理响应格式化
    return result;
  }

  @ApiKeyAuth()
  @RequirePermissions(Permission.CONFIG_READ)
  @Get("statistics")
  @ApiOperation({ summary: "Get data mapping rules statistics" })
  @ApiSuccessResponse()
  @ApiStandardResponses()
  async getStatistics() {
    const result = await this.dataMapperService.getStatistics();
    // 遵循控制器编写规范：让拦截器自动处理响应格式化
    return result;
  }

  @ApiKeyAuth()
  @RequirePermissions(Permission.CONFIG_READ)
  @Get("presets")
  @ApiOperation({ 
    summary: "获取预设字段映射配置",
    description: `
### 功能说明
获取系统内置的预设字段映射配置，包括股票报价和基本信息的标准字段定义。

### 权限要求
需要 CONFIG_READ 权限（开发者/管理员）

### 返回内容
- **stockQuote**: 股票报价字段映射规则（22个字段）
- **stockBasicInfo**: 股票基本信息字段映射规则（15个字段）
- **availablePresets**: 可用预设类型列表
- **totalFields**: 各预设的字段数量统计

### 使用场景
- 了解系统标准字段定义
- 创建新的数据映射规则时的参考
- API文档和开发指南
    `
  })
  @ApiSuccessResponse({
    description: "预设字段映射配置获取成功",
    schema: {
      example: {
        statusCode: 200,
        message: "获取预设字段映射配置成功",
        data: {
          stockQuote: {
            name: "Stock Quote Preset Fields",
            description: "股票报价数据的标准字段映射配置",
            provider: "preset",
            transDataRuleListType: "quote_fields",
            fields: [
              {
                source: "secu_quote[].last_done",
                target: "lastPrice",
                desc: "最新成交价"
              }
            ]
          },
          stockBasicInfo: {
            name: "Stock Basic Info Preset Fields",
            description: "股票基本信息的标准字段映射配置",
            provider: "preset", 
            transDataRuleListType: "basic_info_fields",
            fields: []
          },
          availablePresets: ["stockQuote", "stockBasicInfo"],
          totalFields: {
            stockQuote: 22,
            stockBasicInfo: 15
          }
        },
        timestamp: "2024-01-01T12:00:00.000Z"
      }
    }
  })
  @ApiStandardResponses()
  async getPresets() {
    this.logger.log(`API Request: Get preset field mappings`);

    try {
      const result = await this.dataMapperService.getPresets();

      this.logger.log(`API Success: Preset field mappings retrieved successfully`, {
        availablePresets: result.availablePresets,
        totalFields: result.totalFields
      });

      // 遵循控制器编写规范：让拦截器自动处理响应格式化
      return result;
    } catch (error: any) {
      this.logger.error(`API Error: Failed to get preset field mappings`, {
        error: error.message,
        errorType: error.constructor.name,
      });
      throw error;
    }
  }

  @ApiKeyAuth()
  @RequirePermissions(Permission.CONFIG_READ)
  @Get("best-match/:provider/:transDataRuleListType")
  @ApiOperation({ summary: "Get best matching mapping rule" })
  @ApiParam({ name: "provider", description: "Provider name" })
  @ApiParam({ name: "transDataRuleListType", description: "Rule list type" })
  @ApiSuccessResponse({ type: DataMappingResponseDto })
  @ApiStandardResponses()
  async findBestMatchingRule(
    @Param("provider") provider: string,
    @Param("transDataRuleListType") transDataRuleListType: string,
  ) {
    const result = await this.dataMapperService.findBestMatchingRule(
      provider,
      transDataRuleListType,
    );
    // 遵循控制器编写规范：让拦截器自动处理响应格式化
    return result;
  }

  @ApiKeyAuth()
  @RequirePermissions(Permission.CONFIG_READ)
  @Get(":id")
  @ApiOperation({ summary: "Get data mapping rule by ID" })
  @ApiParam({ name: "id", description: "Mapping rule ID" })
  @ApiSuccessResponse({ type: DataMappingResponseDto })
  @ApiStandardResponses()
  async findOne(@Param("id") id: string) {
    const result = await this.dataMapperService.findOne(id);
    // 遵循控制器编写规范：让拦截器自动处理响应格式化
    return result;
  }

  @ApiKeyAuth()
  @RequirePermissions(Permission.MAPPING_WRITE)
  @Patch(":id")
  @ApiOperation({ summary: "Update data mapping rule" })
  @ApiParam({ name: "id", description: "Mapping rule ID" })
  @ApiSuccessResponse({ type: DataMappingResponseDto })
  @ApiStandardResponses()
  async update(
    @Param("id") id: string,
    @Body(ValidationPipe) updateDto: UpdateDataMappingDto,
  ) {
    const result = await this.dataMapperService.update(id, updateDto);
    // 遵循控制器编写规范：让拦截器自动处理响应格式化
    return result;
  }

  @ApiKeyAuth()
  @RequirePermissions(Permission.MAPPING_WRITE)
  @Patch(":id/activate")
  @ApiOperation({ summary: "Activate data mapping rule" })
  @ApiParam({ name: "id", description: "Mapping rule ID" })
  @ApiSuccessResponse({ type: DataMappingResponseDto })
  @ApiStandardResponses()
  async activate(@Param("id") id: string) {
    this.logger.log(`API Request: Activate mapping rule`, { id });

    try {
      const result = await this.dataMapperService.activate(id);

      this.logger.log(`API Success: Mapping rule activated successfully`, {
        id: result.id,
        name: result.name,
      });

      // 遵循控制器编写规范：让拦截器自动处理响应格式化
      return result;
    } catch (error: any) {
      this.logger.error(`API Error: Mapping rule activation failed`, {
        id,
        error: error.message,
        errorType: error.constructor.name,
      });
      throw error;
    }
  }

  @ApiKeyAuth()
  @RequirePermissions(Permission.MAPPING_WRITE)
  @Patch(":id/deactivate")
  @ApiOperation({ summary: "Deactivate data mapping rule" })
  @ApiParam({ name: "id", description: "Mapping rule ID" })
  @ApiSuccessResponse({ type: DataMappingResponseDto })
  @ApiStandardResponses()
  async deactivate(@Param("id") id: string) {
    this.logger.log(`API Request: Deactivate mapping rule`, { id });

    try {
      const result = await this.dataMapperService.deactivate(id);

      this.logger.log(`API Success: Mapping rule deactivated successfully`, {
        id: result.id,
        name: result.name,
      });

      // 遵循控制器编写规范：让拦截器自动处理响应格式化
      return result;
    } catch (error: any) {
      this.logger.error(`API Error: Mapping rule deactivation failed`, {
        id,
        error: error.message,
        errorType: error.constructor.name,
      });
      throw error;
    }
  }

  @ApiKeyAuth()
  @RequirePermissions(Permission.MAPPING_WRITE)
  @Delete(":id")
  @ApiOperation({ summary: "Delete data mapping rule" })
  @ApiParam({ name: "id", description: "Mapping rule ID" })
  @ApiSuccessResponse({ type: DataMappingResponseDto })
  @ApiStandardResponses()
  async remove(@Param("id") id: string) {
    this.logger.log(`API Request: Delete mapping rule`, { id });

    try {
      const result = await this.dataMapperService.remove(id);

      this.logger.log(`API Success: Mapping rule deleted successfully`, {
        id: result.id,
        name: result.name,
      });

      // 遵循控制器编写规范：让拦截器自动处理响应格式化
      return result;
    } catch (error: any) {
      this.logger.error(`API Error: Mapping rule deletion failed`, {
        id,
        error: error.message,
        errorType: error.constructor.name,
      });
      throw error;
    }
  }
}
