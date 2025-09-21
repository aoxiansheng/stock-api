import {
  Body,
  Controller,
  Post,
  ValidationPipe,
} from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";

import { createLogger } from "@common/logging/index";
import {
  ApiStandardResponses,
  ApiSuccessResponse,
} from "@common/core/decorators/swagger-responses.decorator";

import { ApiKeyAuth } from "../../../../auth/decorators/auth.decorator";
import { RequirePermissions } from "../../../../auth/decorators/permissions.decorator";
import { Permission } from "../../../../auth/enums/user-role.enum";

import {
  TransformSymbolsDto,
  TransformSymbolsResponseDto,
} from "../../../00-prepare/symbol-mapper/dto/update-symbol-mapping.dto";
import { SymbolTransformerService } from "../services/symbol-transformer.service";
import { MappingDirection } from "../../../05-caching/symbol-mapper-cache/constants/cache.constants";

@ApiTags("🔁 符号转换器")
@Controller("symbol-mapper")
export class SymbolTransformerController {
  private readonly logger = createLogger(SymbolTransformerController.name);

  constructor(
    private readonly symbolTransformerService: SymbolTransformerService,
  ) {}

  @ApiKeyAuth()
  @RequirePermissions(Permission.DATA_READ)
  @Post("map")
  @ApiOperation({ summary: "映射单个股票代码" })
  @ApiSuccessResponse()
  @ApiStandardResponses()
  async mapSymbol(
    @Body() body: { symbol: string; fromProvider: string; toProvider: string },
  ) {
    const mappedSymbol =
      await this.symbolTransformerService.transformSingleSymbol(
        body.toProvider,
        body.symbol,
        MappingDirection.FROM_STANDARD,
      );

    return {
      originalSymbol: body.symbol,
      mappedSymbol,
      fromProvider: body.fromProvider,
      toProvider: body.toProvider,
    };
  }

  @ApiKeyAuth()
  @RequirePermissions(Permission.DATA_READ)
  @Post("transform")
  @ApiOperation({ summary: "批量股票代码格式转换" })
  @ApiSuccessResponse({ type: TransformSymbolsResponseDto })
  @ApiStandardResponses()
  async transformSymbols(
    @Body(ValidationPipe) transformDto: TransformSymbolsDto,
  ) {
    this.logger.log("API请求: 批量符号转换", {
      dataSourceName: transformDto.dataSourceName,
      symbolsCount: transformDto.symbols.length,
    });

    try {
      const result = await this.symbolTransformerService.transformSymbols(
        transformDto.dataSourceName,
        transformDto.symbols,
        MappingDirection.FROM_STANDARD,
      );

      this.logger.log("API响应: 符号转换成功", {
        dataSourceName: transformDto.dataSourceName,
        inputCount: transformDto.symbols.length,
        processingTimeMs: `${result.metadata.processingTimeMs}ms`,
      });

      return {
        dataSourceName: result.metadata.provider,
        transformedSymbols: result.mappingDetails,
        failedSymbols: result.failedSymbols,
        processingTimeMs: result.metadata.processingTimeMs,
      };
    } catch (error: any) {
      this.logger.error("API错误: 符号转换失败", {
        dataSourceName: transformDto.dataSourceName,
        symbolsCount: transformDto.symbols.length,
        error: error.message,
        errorType: error.constructor?.name,
      });
      throw error;
    }
  }
}
