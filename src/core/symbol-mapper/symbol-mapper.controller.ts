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

import { createLogger } from "@common/config/logger.config";
import {
  ApiSuccessResponse,
  ApiCreatedResponse,
  ApiStandardResponses,
  ApiPaginatedResponse,
} from "@common/decorators/swagger-responses.decorator";

import { ApiKeyAuth } from "../../auth/decorators/auth.decorator";
import { Permission } from "../../auth/enums/user-role.enum";

import { CreateSymbolMappingDto } from "./dto/create-symbol-mapping.dto";
import { SymbolMappingQueryDto } from "./dto/symbol-mapping-query.dto";
import { SymbolMappingResponseDto } from "./dto/symbol-mapping-response.dto";
import {
  UpdateSymbolMappingDto,
  TransformSymbolsDto,
  TransformSymbolsResponseDto,
  AddMappingRuleDto,
  UpdateMappingRuleDto,
} from "./dto/update-symbol-mapping.dto";
import { SymbolMapperService } from "./symbol-mapper.service";

@ApiTags("🔄 符号映射器")
@Controller("symbol-mapper")
export class SymbolMapperController {
  private readonly logger = createLogger(SymbolMapperController.name);

  constructor(private readonly symbolMapperService: SymbolMapperService) {}

  @ApiKeyAuth([Permission.MAPPING_WRITE])
  @Post()
  @ApiOperation({ summary: "创建数据源映射配置（管理员权限）" })
  @ApiCreatedResponse({ type: SymbolMappingResponseDto })
  @ApiStandardResponses()
  async createDataSourceMapping(
    @Body(ValidationPipe) createDto: CreateSymbolMappingDto,
  ) {
    this.logger.log(`API请求: 创建数据源映射配置`, {
      dataSourceName: createDto.dataSourceName,
      rulesCount: createDto.mappingRules.length,
    });

    try {
      const result =
        await this.symbolMapperService.createDataSourceMapping(createDto);

      this.logger.log(`API响应: 数据源映射配置创建成功`, {
        id: result.id,
        dataSourceName: result.dataSourceName,
        rulesCount: result.mappingRules.length,
      });

      // 遵循控制器编写规范：让拦截器自动处理响应格式化
      return result;
    } catch (error: any) {
      this.logger.error(`API错误: 数据源映射配置创建失败`, {
        dataSourceName: createDto.dataSourceName,
        error: error.message,
        errorType: error.constructor.name,
      });
      throw error;
    }
  }

  @ApiKeyAuth([Permission.DATA_READ])
  @Post("map")
  @ApiOperation({ summary: "映射单个股票代码" })
  @ApiSuccessResponse()
  @ApiStandardResponses()
  async mapSymbol(
    @Body() body: { symbol: string; fromProvider: string; toProvider: string },
  ) {
    const mappedSymbol = await this.symbolMapperService.mapSymbol(
      body.symbol,
      body.fromProvider,
      body.toProvider,
    );
    // 遵循控制器编写规范：让拦截器自动处理响应格式化
    return {
      originalSymbol: body.symbol,
      mappedSymbol,
      fromProvider: body.fromProvider,
      toProvider: body.toProvider,
    };
  }

  @ApiKeyAuth()
  @Post("transform")
  @ApiOperation({
    summary: "🔄 批量股票代码格式转换",
    description: `
### 功能说明
高性能批量股票代码格式转换服务，支持多数据源间的代码格式互转。

### 核心特性
- **⚡ 高性能**: 支持大批量代码同时转换
- **🌐 多数据源**: 支持 LongPort、iTick、TwelveData 等多个数据源格式
- **🎯 智能匹配**: 自动识别输入代码格式并转换到目标格式
- **📊 统计信息**: 提供详细的转换统计和耗时信息

### 转换规则示例
- **LongPort 格式**: \`700.HK\`, \`AAPL.US\`, \`000001.SZ\`
- **iTick 格式**: \`HK.00700\`, \`US.AAPL\`, \`SZ.000001\`
- **通用格式**: \`700\`, \`AAPL\`, \`000001\`

### API Key 认证
此接口需要 API Key 认证，适用于：
- 第三方应用集成
- 批量数据处理脚本
- 自动化交易系统

### 示例请求
\`\`\`json
{
  "dataSourceName": "longport",
  "symbols": ["AAPL", "GOOGL", "700", "000001"]
}
\`\`\`

### 响应包含
- 转换后的代码列表
- 转换成功/失败统计
- 处理耗时信息
- 错误代码详情
    `,
  })
  @ApiSuccessResponse({ type: TransformSymbolsResponseDto })
  @ApiStandardResponses()
  async transformSymbols(
    @Body(ValidationPipe) transformDto: TransformSymbolsDto,
  ) {
    this.logger.log(`API请求: 转换股票代码`, {
      dataSourceName: transformDto.dataSourceName,
      symbolsCount: transformDto.symbols.length,
      symbols: transformDto.symbols.slice(0, 3), // 只记录前3个
    });

    try {
      const result = transformDto.mappingInSymbolId
        ? await this.symbolMapperService.transformSymbolsById(
            transformDto.mappingInSymbolId,
            transformDto.symbols,
          )
        : await this.symbolMapperService.transformSymbols(
            transformDto.dataSourceName,
            transformDto.symbols,
          );

      this.logger.log(`API响应: 代码转换成功`, {
        dataSourceName: transformDto.dataSourceName,
        inputCount: transformDto.symbols.length,
        processingTime: result.processingTimeMs + "ms",
      });

      // 遵循控制器编写规范：让拦截器自动处理响应格式化
      return result;
    } catch (error: any) {
      this.logger.error(`API错误: 代码转换失败`, {
        dataSourceName: transformDto.dataSourceName,
        symbolsCount: transformDto.symbols.length,
        error: error.message,
        errorType: error.constructor.name,
      });
      throw error;
    }
  }

  @ApiKeyAuth([Permission.MAPPING_WRITE])
  @Post("rules")
  @ApiOperation({ summary: "添加映射规则到现有数据源" })
  @ApiSuccessResponse({ type: SymbolMappingResponseDto })
  @ApiStandardResponses()
  async addMappingRule(@Body(ValidationPipe) addDto: AddMappingRuleDto) {
    this.logger.log(`API请求: 添加映射规则`, {
      dataSourceName: addDto.dataSourceName,
      inputSymbol: addDto.mappingRule.inputSymbol,
      outputSymbol: addDto.mappingRule.outputSymbol,
    });

    try {
      const result = await this.symbolMapperService.addMappingRule(addDto);

      this.logger.log(`API响应: 映射规则添加成功`, {
        dataSourceName: addDto.dataSourceName,
        totalRules: result.mappingRules.length,
      });

      // 遵循控制器编写规范：让拦截器自动处理响应格式化
      return result;
    } catch (error: any) {
      this.logger.error(`API错误: 映射规则添加失败`, {
        dataSourceName: addDto.dataSourceName,
        error: error.message,
        errorType: error.constructor.name,
      });
      throw error;
    }
  }

  @ApiKeyAuth([Permission.CONFIG_READ])
  @Get()
  @ApiOperation({ summary: "分页获取数据源映射配置列表" })
  @ApiPaginatedResponse(SymbolMappingResponseDto)
  @ApiStandardResponses()
  async getMappings(@Query(ValidationPipe) query: SymbolMappingQueryDto) {
    const result = await this.symbolMapperService.getMappingsPaginated(query);
    // 遵循控制器编写规范：让拦截器自动处理响应格式化
    return result;
  }

  @ApiKeyAuth([Permission.DATA_READ])
  @Get("data-sources")
  @ApiOperation({ summary: "获取所有数据源列表" })
  @ApiSuccessResponse({ type: [String] })
  @ApiStandardResponses()
  async getDataSources() {
    const result = await this.symbolMapperService.getDataSources();
    // 遵循控制器编写规范：让拦截器自动处理响应格式化
    return result;
  }

  @ApiKeyAuth([Permission.DATA_READ])
  @Get("markets")
  @ApiOperation({ summary: "获取所有市场列表" })
  @ApiSuccessResponse({ type: [String] })
  @ApiStandardResponses()
  async getMarkets() {
    const result = await this.symbolMapperService.getMarkets();
    // 遵循控制器编写规范：让拦截器自动处理响应格式化
    return result;
  }

  @ApiKeyAuth([Permission.DATA_READ])
  @Get("symbol-types")
  @ApiOperation({ summary: "获取所有股票类型列表" })
  @ApiSuccessResponse({ type: [String] })
  @ApiStandardResponses()
  async getSymbolTypes() {
    const result = await this.symbolMapperService.getSymbolTypes();
    // 遵循控制器编写规范：让拦截器自动处理响应格式化
    return result;
  }

  @ApiKeyAuth([Permission.DATA_READ])
  @Get("data-source/:dataSourceName")
  @ApiOperation({ summary: "根据数据源名称获取映射配置" })
  @ApiParam({ name: "dataSourceName", description: "数据源名称" })
  @ApiSuccessResponse({ type: SymbolMappingResponseDto })
  @ApiStandardResponses()
  async getMappingByDataSource(
    @Param("dataSourceName") dataSourceName: string,
  ) {
    const result =
      await this.symbolMapperService.getMappingByDataSource(dataSourceName);
    // 遵循控制器编写规范：让拦截器自动处理响应格式化
    return result;
  }

  @ApiKeyAuth([Permission.DATA_READ])
  @Get("rules/:provider")
  @ApiOperation({ summary: "获取指定提供商的映射规则" })
  @ApiSuccessResponse()
  @ApiStandardResponses()
  async getMappingRules(@Param("provider") provider: string) {
    const result = await this.symbolMapperService.getMappingRules(provider);
    // 遵循控制器编写规范：让拦截器自动处理响应格式化
    return result;
  }

  @ApiKeyAuth([Permission.CONFIG_READ])
  @Get(":id")
  @ApiOperation({ summary: "根据ID获取数据源映射配置" })
  @ApiParam({ name: "id", description: "映射配置ID" })
  @ApiSuccessResponse({ type: SymbolMappingResponseDto })
  @ApiStandardResponses()
  async getMappingById(@Param("id") id: string) {
    const result = await this.symbolMapperService.getMappingById(id);
    // 遵循控制器编写规范：让拦截器自动处理响应格式化
    return result;
  }

  @ApiKeyAuth([Permission.MAPPING_WRITE])
  @Patch(":id")
  @ApiOperation({ summary: "更新数据源映射配置" })
  @ApiParam({ name: "id", description: "映射配置ID" })
  @ApiSuccessResponse({ type: SymbolMappingResponseDto })
  @ApiStandardResponses()
  async updateMapping(
    @Param("id") id: string,
    @Body(ValidationPipe) updateDto: UpdateSymbolMappingDto,
  ) {
    const result = await this.symbolMapperService.updateMapping(id, updateDto);
    // 遵循控制器编写规范：让拦截器自动处理响应格式化
    return result;
  }

  @ApiKeyAuth([Permission.MAPPING_WRITE])
  @Patch("rules/:dataSourceName/:inputSymbol")
  @ApiOperation({ summary: "更新特定的映射规则" })
  @ApiParam({ name: "dataSourceName", description: "数据源名称" })
  @ApiParam({ name: "inputSymbol", description: "输入代码" })
  @ApiSuccessResponse({ type: SymbolMappingResponseDto })
  @ApiStandardResponses()
  async updateMappingRule(
    @Param("dataSourceName") dataSourceName: string,
    @Param("inputSymbol") inputSymbol: string,
    @Body(ValidationPipe)
    mappingRule: Partial<UpdateMappingRuleDto["mappingRule"]>,
  ) {
    const updateDto: UpdateMappingRuleDto = {
      dataSourceName,
      inputSymbol,
      mappingRule,
    };
    const result = await this.symbolMapperService.updateMappingRule(updateDto);
    // 遵循控制器编写规范：让拦截器自动处理响应格式化
    return result;
  }

  @ApiKeyAuth([Permission.MAPPING_WRITE])
  @Delete(":id")
  @ApiOperation({ summary: "删除数据源映射配置" })
  @ApiParam({ name: "id", description: "映射配置ID" })
  @ApiSuccessResponse({ type: SymbolMappingResponseDto })
  @ApiStandardResponses()
  async deleteMapping(@Param("id") id: string) {
    const result = await this.symbolMapperService.deleteMapping(id);
    // 遵循控制器编写规范：让拦截器自动处理响应格式化
    return result;
  }

  @ApiKeyAuth([Permission.MAPPING_WRITE])
  @Delete("data-source/:dataSourceName")
  @ApiOperation({ summary: "删除指定数据源的所有映射" })
  @ApiParam({ name: "dataSourceName", description: "数据源名称" })
  @ApiSuccessResponse()
  @ApiStandardResponses()
  async deleteMappingsByDataSource(
    @Param("dataSourceName") dataSourceName: string,
  ) {
    this.logger.log(`API请求: 删除数据源映射`, {
      dataSourceName,
    });

    try {
      const result =
        await this.symbolMapperService.deleteMappingsByDataSource(
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
        errorType: error.constructor.name,
      });
      throw error;
    }
  }

  @ApiKeyAuth([Permission.MAPPING_WRITE])
  @Delete("rules/:dataSourceName/:inputSymbol")
  @ApiOperation({ summary: "删除特定的映射规则" })
  @ApiParam({ name: "dataSourceName", description: "数据源名称" })
  @ApiParam({ name: "inputSymbol", description: "输入代码" })
  @ApiSuccessResponse({ type: SymbolMappingResponseDto })
  @ApiStandardResponses()
  async removeMappingRule(
    @Param("dataSourceName") dataSourceName: string,
    @Param("inputSymbol") inputSymbol: string,
  ) {
    this.logger.log(`API请求: 删除映射规则`, {
      dataSourceName,
      inputSymbol,
    });

    try {
      const result = await this.symbolMapperService.removeMappingRule(
        dataSourceName,
        inputSymbol,
      );

      this.logger.log(`API响应: 映射规则删除成功`, {
        dataSourceName,
        inputSymbol,
        remainingRules: result.mappingRules.length,
      });

      // 遵循控制器编写规范：让拦截器自动处理响应格式化
      return result;
    } catch (error: any) {
      this.logger.error(`API错误: 映射规则删除失败`, {
        dataSourceName,
        inputSymbol,
        error: error.message,
        errorType: error.constructor.name,
      });
      throw error;
    }
  }
}
