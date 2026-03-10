import {
  Controller,
  Get,
  Query as QueryParam,
  ValidationPipe,
} from "@nestjs/common";
import {
  ApiExtraModels,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
  getSchemaPath,
} from "@nestjs/swagger";
import { ReadAccess } from "@authv2/decorators";
import {
  ApiKeyAuthResponses,
  ApiSuccessResponse,
} from "@common/core/decorators/swagger-responses.decorator";
import {
  QuerySupportListMetaRequestDto,
  QuerySupportListRequestDto,
} from "../dto/query-support-list-request.dto";
import {
  SupportListDeltaResponseDto,
  SupportListFullResponseDto,
  SupportListMetaResponseDto,
  SupportListResyncRequiredResponseDto,
} from "../dto/query-support-list-response.dto";
import { SupportListQueryService } from "../services/support-list-query.service";

@ApiTags("🧠 弱时效接口 - Support List 对齐")
@Controller("query/support-list")
export class SupportListQueryController {
  constructor(
    private readonly supportListQueryService: SupportListQueryService,
  ) {}

  @ReadAccess()
  @Get("meta")
  @ApiOperation({
    summary: "获取 support-list 最新版本元数据",
  })
  @ApiQuery({
    name: "type",
    required: true,
    example: "STOCK_US",
    description: "产品类型",
  })
  @ApiSuccessResponse({
    type: SupportListMetaResponseDto,
    description: "获取成功",
  })
  @ApiKeyAuthResponses()
  async getMeta(
    @QueryParam(new ValidationPipe({ transform: true, whitelist: true }))
    query: QuerySupportListMetaRequestDto,
  ) {
    return await this.supportListQueryService.getMeta(query);
  }

  @ReadAccess()
  @Get()
  @ApiOperation({
    summary: "获取 support-list 全量或增量",
    description:
      "不带 since 返回全量；带 since 返回增量；since 版本链不可用时返回 409（SUPPORT_LIST_RESYNC_REQUIRED）。",
  })
  @ApiQuery({
    name: "type",
    required: true,
    example: "STOCK_US",
    description: "产品类型",
  })
  @ApiQuery({
    name: "since",
    required: false,
    example: "20260309020000",
    description: "历史版本号",
  })
  @ApiQuery({
    name: "symbols",
    required: false,
    example: ".DJI.US,.IXIC.US",
    description: "可选产品代码过滤",
  })
  @ApiExtraModels(
    SupportListFullResponseDto,
    SupportListDeltaResponseDto,
    SupportListResyncRequiredResponseDto,
  )
  @ApiSuccessResponse({
    description: "全量或增量返回成功",
    schema: {
      type: "object",
      properties: {
        success: { type: "boolean", example: true },
        statusCode: { type: "number", example: 200 },
        message: { type: "string", example: "操作成功" },
        data: {
          oneOf: [
            { $ref: getSchemaPath(SupportListFullResponseDto) },
            { $ref: getSchemaPath(SupportListDeltaResponseDto) },
          ],
        },
        timestamp: { type: "string", format: "date-time" },
      },
    },
  })
  @ApiResponse({
    status: 409,
    description: "since 版本链不可用，需要先执行不带 since 的全量同步",
    schema: {
      $ref: getSchemaPath(SupportListResyncRequiredResponseDto),
    },
  })
  @ApiKeyAuthResponses()
  async getSupportList(
    @QueryParam(new ValidationPipe({ transform: true, whitelist: true }))
    query: QuerySupportListRequestDto,
  ) {
    return await this.supportListQueryService.getSupportList(query);
  }
}
