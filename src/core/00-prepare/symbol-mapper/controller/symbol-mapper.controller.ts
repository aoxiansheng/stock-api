import { REFERENCE_DATA } from "@common/constants/domain";
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
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiParam } from "@nestjs/swagger";

import { createLogger } from "@common/logging/index";
import {
  ApiSuccessResponse,
  ApiCreatedResponse,
  ApiStandardResponses,
  ApiPaginatedResponse,
} from "@common/core/decorators/swagger-responses.decorator";

import { ApiKeyAuth } from "../../../../auth/decorators/auth.decorator";
import { RequirePermissions } from "../../../../auth/decorators/permissions.decorator";
import { Permission } from "../../../../auth/enums/user-role.enum";

import { CreateSymbolMappingDto } from "../dto/create-symbol-mapping.dto";
import { SymbolMappingQueryDto } from "../dto/symbol-mapping-query.dto";
import { SymbolMappingResponseDto } from "../dto/symbol-mapping-response.dto";
import {
  UpdateSymbolMappingDto,
  AddSymbolMappingRuleDto,
  UpdateSymbolMappingRuleDto,
} from "../dto/update-symbol-mapping.dto";
import { SymbolMapperService } from "../services/symbol-mapper.service";

@ApiTags("🔄 符号映射器")
@Controller("symbol-mapper")
export class SymbolMapperController {
  private readonly logger = createLogger(SymbolMapperController.name);

  constructor(
    private readonly symbolMapperService: SymbolMapperService,
  ) {}

  @ApiKeyAuth()
  @RequirePermissions(Permission.MAPPING_WRITE)
  @Post()
  @ApiOperation({ summary: "创建数据源映射配置（管理员权限）" })
  @ApiCreatedResponse({ type: SymbolMappingResponseDto })
  @ApiStandardResponses()
  async createDataSourceMapping(
    @Body(ValidationPipe) createDto: CreateSymbolMappingDto,
  ) {
    this.logger.log(`API请求: 创建数据源映射配置`, {
      dataSourceName: createDto.dataSourceName,
      rulesCount: createDto.SymbolMappingRule.length,
    });

    try {
      const result =
        await this.symbolMapperService.createDataSourceMapping(createDto);

      this.logger.log(`API响应: 数据源映射配置创建成功`, {
        id: result.id,
        dataSourceName: result.dataSourceName,
        rulesCount: result.SymbolMappingRule.length,
      });

      // 遵循控制器编写规范：让拦截器自动处理响应格式化
      return result;
    } catch (error: any) {
      this.logger.error(`API错误: 数据源映射配置创建失败`, {
        dataSourceName: createDto.dataSourceName,
        error: error.message,
        errorType: error.constructor?.name,
      });
      throw error;
    }
  }

  @ApiKeyAuth()
  @RequirePermissions(Permission.MAPPING_WRITE)
  @Post("rules")
  @ApiOperation({ summary: "添加映射规则到现有数据源" })
  @ApiSuccessResponse({ type: SymbolMappingResponseDto })
  @ApiStandardResponses()
  async addSymbolMappingRule(
    @Body(ValidationPipe) addDto: AddSymbolMappingRuleDto,
  ) {
    this.logger.log(`API请求: 添加映射规则`, {
      dataSourceName: addDto.dataSourceName,
      standardSymbol: addDto.symbolMappingRule.standardSymbol,
      sdkSymbol: addDto.symbolMappingRule.sdkSymbol,
    });

    try {
      const result =
        await this.symbolMapperService.addSymbolMappingRule(addDto);

      this.logger.log(`API响应: 映射规则添加成功`, {
        dataSourceName: addDto.dataSourceName,
        totalRules: result.SymbolMappingRule.length,
      });

      // 遵循控制器编写规范：让拦截器自动处理响应格式化
      return result;
    } catch (error: any) {
      this.logger.error(`API错误: 映射规则添加失败`, {
        dataSourceName: addDto.dataSourceName,
        error: error.message,
        errorType: error.constructor?.name,
      });
      throw error;
    }
  }

  @ApiKeyAuth()
  @RequirePermissions(Permission.CONFIG_READ)
  @Get()
  @ApiOperation({ summary: "分页获取数据源映射配置列表" })
  @ApiPaginatedResponse(SymbolMappingResponseDto)
  @ApiStandardResponses()
  async getMappings(@Query(ValidationPipe) query: SymbolMappingQueryDto) {
    const result =
      await this.symbolMapperService.getSymbolMappingsPaginated(query);
    // 遵循控制器编写规范：让拦截器自动处理响应格式化
    return result;
  }

  @ApiKeyAuth()
  @RequirePermissions(Permission.DATA_READ)
  @Get("data-sources")
  @ApiOperation({ summary: "获取所有数据源列表" })
  @ApiSuccessResponse({ type: [String] })
  @ApiStandardResponses()
  async getDataSources() {
    const result = await this.symbolMapperService.getDataSources();
    // 遵循控制器编写规范：让拦截器自动处理响应格式化
    return result;
  }

  @ApiKeyAuth()
  @RequirePermissions(Permission.DATA_READ)
  @Get("markets")
  @ApiOperation({ summary: "获取所有市场列表" })
  @ApiSuccessResponse({ type: [String] })
  @ApiStandardResponses()
  async getMarkets() {
    const result = await this.symbolMapperService.getMarkets();
    // 遵循控制器编写规范：让拦截器自动处理响应格式化
    return result;
  }

  @ApiKeyAuth()
  @RequirePermissions(Permission.DATA_READ)
  @Get("symbol-types")
  @ApiOperation({ summary: "获取所有股票类型列表" })
  @ApiSuccessResponse({ type: [String] })
  @ApiStandardResponses()
  async getSymbolTypes() {
    const result = await this.symbolMapperService.getSymbolTypes();
    // 遵循控制器编写规范：让拦截器自动处理响应格式化
    return result;
  }

  @ApiKeyAuth()
  @RequirePermissions(Permission.DATA_READ)
  @Get("data-source/:dataSourceName")
  @ApiOperation({ summary: "根据数据源名称获取映射配置" })
  @ApiParam({ name: "dataSourceName", description: "数据源名称" })
  @ApiSuccessResponse({ type: SymbolMappingResponseDto })
  @ApiStandardResponses()
  async getSymbolMappingByDataSource(
    @Param("dataSourceName") dataSourceName: string,
  ) {
    const result =
      await this.symbolMapperService.getSymbolMappingByDataSource(
        dataSourceName,
      );
    // 遵循控制器编写规范：让拦截器自动处理响应格式化
    return result;
  }

  @ApiKeyAuth()
  @RequirePermissions(Permission.MAPPING_WRITE)
  @Get("rules")
  @ApiOperation({
    summary: "🔄 获取所有符号映射规则",
    description: `
### 功能说明
获取系统中所有数据源的符号映射规则汇总信息。

### 权限要求
需要 MAPPING_WRITE 权限（管理员）

### 返回内容
- **providers**: 所有提供商列表
- **totalProviders**: 提供商总数
- **totalRules**: 映射规则总数
- **rulesByProvider**: 按提供商分组的规则详情
- **summary**: 统计汇总信息

### 使用场景
- 系统管理和维护
- 映射规则审计
- 数据源管理
- 系统配置概览
    `,
  })
  @ApiSuccessResponse({
    description: "符号映射规则获取成功",
    schema: {
      example: {
        statusCode: 200,
        message: "获取所有符号映射规则成功",
        data: {
          providers: [
            REFERENCE_DATA.PROVIDER_IDS.LONGPORT,
            "iexcloud",
            "twelvedata",
          ],
          totalProviders: 3,
          totalRules: 156,
          rulesByProvider: {
            longport: {
              dataSourceName: REFERENCE_DATA.PROVIDER_IDS.LONGPORT,
              description: "LongPort 符号映射规则",
              totalRules: 89,
              SymbolMappingRule: [],
              createdAt: REFERENCE_DATA.TEST_TIMESTAMPS.REFERENCE_DATE,
              updatedAt: REFERENCE_DATA.TEST_TIMESTAMPS.REFERENCE_DATE,
            },
          },
          summary: {
            mostRulesProvider: REFERENCE_DATA.PROVIDER_IDS.LONGPORT,
            averageRulesPerProvider: 52,
          },
        },
        timestamp: REFERENCE_DATA.TEST_TIMESTAMPS.REFERENCE_DATE,
      },
    },
  })
  @ApiStandardResponses()
  async getAllSymbolMappingRule() {
    this.logger.log(`API请求: 获取所有符号映射规则`);

    try {
      const result = await this.symbolMapperService.getAllSymbolMappingRule();

      this.logger.log(`API响应: 符号映射规则获取成功`, {
        totalProviders: result.totalProviders,
        totalRules: result.totalRules,
        mostRulesProvider: result.summary.mostRulesProvider,
      });

      // 遵循控制器编写规范：让拦截器自动处理响应格式化
      return result;
    } catch (error: any) {
      this.logger.error(`API错误: 获取符号映射规则失败`, {
        error: error.message,
        errorType: error.constructor?.name,
      });
      throw error;
    }
  }

  @ApiKeyAuth()
  @RequirePermissions(Permission.DATA_READ)
  @Get("rules/:provider")
  @ApiOperation({ summary: "获取指定提供商的映射规则" })
  @ApiSuccessResponse()
  @ApiStandardResponses()
  async getSymbolMappingRule(@Param("provider") provider: string) {
    const result =
      await this.symbolMapperService.getSymbolMappingRule(provider);
    // 遵循控制器编写规范：让拦截器自动处理响应格式化
    return result;
  }

  @ApiKeyAuth()
  @RequirePermissions(Permission.CONFIG_READ)
  @Get(":id")
  @ApiOperation({ summary: "根据ID获取数据源映射配置" })
  @ApiParam({ name: "id", description: "映射配置ID" })
  @ApiSuccessResponse({ type: SymbolMappingResponseDto })
  @ApiStandardResponses()
  async getSymbolMappingById(@Param("id") id: string) {
    const result = await this.symbolMapperService.getSymbolMappingById(id);
    // 遵循控制器编写规范：让拦截器自动处理响应格式化
    return result;
  }

  @ApiKeyAuth()
  @RequirePermissions(Permission.MAPPING_WRITE)
  @Patch(":id")
  @ApiOperation({ summary: "更新数据源映射配置" })
  @ApiParam({ name: "id", description: "映射配置ID" })
  @ApiSuccessResponse({ type: SymbolMappingResponseDto })
  @ApiStandardResponses()
  async updateSymbolMapping(
    @Param("id") id: string,
    @Body(ValidationPipe) updateDto: UpdateSymbolMappingDto,
  ) {
    const result = await this.symbolMapperService.updateSymbolMapping(
      id,
      updateDto,
    );
    // 遵循控制器编写规范：让拦截器自动处理响应格式化
    return result;
  }

  @ApiKeyAuth()
  @RequirePermissions(Permission.MAPPING_WRITE)
  @Patch("rules/:dataSourceName/:standardSymbol")
  @ApiOperation({ summary: "更新特定的映射规则" })
  @ApiParam({ name: "dataSourceName", description: "数据源名称" })
  @ApiParam({ name: "standardSymbol", description: "输入代码" })
  @ApiSuccessResponse({ type: SymbolMappingResponseDto })
  @ApiStandardResponses()
  async updateSymbolMappingRule(
    @Param("dataSourceName") dataSourceName: string,
    @Param("standardSymbol") standardSymbol: string,
    @Body(ValidationPipe)
    symbolMappingRule: Partial<UpdateSymbolMappingRuleDto["symbolMappingRule"]>,
  ) {
    const updateDto: UpdateSymbolMappingRuleDto = {
      dataSourceName,
      standardSymbol,
      symbolMappingRule,
    };
    const result =
      await this.symbolMapperService.updateSymbolMappingRule(updateDto);
    // 遵循控制器编写规范：让拦截器自动处理响应格式化
    return result;
  }

  @ApiKeyAuth()
  @RequirePermissions(Permission.MAPPING_WRITE)
  @Delete(":id")
  @ApiOperation({ summary: "删除数据源映射配置" })
  @ApiParam({ name: "id", description: "映射配置ID" })
  @ApiSuccessResponse({ type: SymbolMappingResponseDto })
  @ApiStandardResponses()
  async deleteSymbolMapping(@Param("id") id: string) {
    const result = await this.symbolMapperService.deleteSymbolMapping(id);
    // 遵循控制器编写规范：让拦截器自动处理响应格式化
    return result;
  }

  @ApiKeyAuth()
  @RequirePermissions(Permission.MAPPING_WRITE)
  @Delete("data-source/:dataSourceName")
  @ApiOperation({ summary: "删除指定数据源的所有映射" })
  @ApiParam({ name: "dataSourceName", description: "数据源名称" })
  @ApiSuccessResponse()
  @ApiStandardResponses()
  async deleteSymbolMappingsByDataSource(
    @Param("dataSourceName") dataSourceName: string,
  ) {
    this.logger.log(`API请求: 删除数据源映射`, {
      dataSourceName,
    });

    try {
      const result =
        await this.symbolMapperService.deleteSymbolMappingsByDataSource(
          dataSourceName,
        );

      this.logger.log(`API响应: 批量删除成功`, {
        dataSourceName,
        deletedCount: result.deletedCount,
      });

      // 遵循控制器编写规范：让拦截器自动处理响应格式化
      return result;
    } catch (error: any) {
      this.logger.error(`API错误: 批量删除失败`, {
        dataSourceName,
        error: error.message,
        errorType: error.constructor?.name,
      });
      throw error;
    }
  }

  @ApiKeyAuth()
  @RequirePermissions(Permission.MAPPING_WRITE)
  @Delete("rules/:dataSourceName/:standardSymbol")
  @ApiOperation({ summary: "删除特定的映射规则" })
  @ApiParam({ name: "dataSourceName", description: "数据源名称" })
  @ApiParam({ name: "standardSymbol", description: "输入代码" })
  @ApiSuccessResponse({ type: SymbolMappingResponseDto })
  @ApiStandardResponses()
  async removeSymbolMappingRule(
    @Param("dataSourceName") dataSourceName: string,
    @Param("standardSymbol") standardSymbol: string,
  ) {
    this.logger.log(`API请求: 删除映射规则`, {
      dataSourceName,
      standardSymbol,
    });

    try {
      const result = await this.symbolMapperService.removeSymbolMappingRule(
        dataSourceName,
        standardSymbol,
      );

      this.logger.log(`API响应: 映射规则删除成功`, {
        dataSourceName,
        standardSymbol,
        remainingRules: result.SymbolMappingRule.length,
      });

      // 遵循控制器编写规范：让拦截器自动处理响应格式化
      return result;
    } catch (error: any) {
      this.logger.error(`API错误: 映射规则删除失败`, {
        dataSourceName,
        standardSymbol,
        error: error.message,
        errorType: error.constructor?.name,
      });
      throw error;
    }
  }
}
