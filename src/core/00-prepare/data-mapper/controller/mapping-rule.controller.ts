import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Body,
  Param,
  Query,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse } from "@nestjs/swagger";
import { Auth } from "../../../../auth/decorators/auth.decorator";
import { UserRole, Permission } from "../../../../auth/enums/user-role.enum";
import { ApiKeyAuth } from "../../../../auth/decorators/auth.decorator";
import {
  ApiStandardResponses,
  ApiKeyAuthResponses,
  JwtAuthResponses,
} from "@common/core/decorators/swagger-responses.decorator";
import { PaginatedDataDto } from "../../../../common/modules/pagination/dto/paginated-data";
import { FlexibleMappingRuleService } from "../services/flexible-mapping-rule.service";
import { RuleAlignmentService } from "../services/rule-alignment.service";
import { PersistedTemplateService } from "../services/persisted-template.service";
import {
  CreateFlexibleMappingRuleDto,
  FlexibleMappingRuleResponseDto,
  TestFlexibleMappingRuleDto,
  FlexibleMappingTestResultDto,
} from "../dto/flexible-mapping-rule.dto";

@ApiTags("数据映射规则管理 (Mapping Rule)")
@Controller("data-mapper/rules")
export class MappingRuleController {
  constructor(
    private readonly ruleService: FlexibleMappingRuleService,
    private readonly ruleAlignmentService: RuleAlignmentService,
    private readonly persistedTemplateService: PersistedTemplateService,
  ) {}

  // ===============================
  // 基础规则管理
  // ===============================

  @Post()
  @Auth([UserRole.ADMIN, UserRole.DEVELOPER])
  @ApiOperation({
    summary: "创建灵活映射规则",
    description: "创建自定义的灵活映射规则",
  })
  @ApiResponse({
    status: 201,
    description: "创建成功",
    type: FlexibleMappingRuleResponseDto,
  })
  @ApiStandardResponses()
  @JwtAuthResponses()
  async createFlexibleRule(
    @Body() dto: CreateFlexibleMappingRuleDto,
  ): Promise<FlexibleMappingRuleResponseDto> {
    return await this.ruleService.createRule(dto);
  }

  @Get()
  @ApiKeyAuth([Permission.DATA_READ])
  @ApiOperation({
    summary: "查询映射规则",
    description: "分页查询灵活映射规则列表",
  })
  @ApiResponse({ status: 200, description: "查询成功" })
  @ApiStandardResponses()
  @ApiKeyAuthResponses()
  async getFlexibleRules(
    @Query("page") page?: number,
    @Query("limit") limit?: number,
    @Query("provider") provider?: string,
    @Query("apiType") apiType?: string,
    @Query("transDataRuleListType") transDataRuleListType?: string,
  ): Promise<PaginatedDataDto<FlexibleMappingRuleResponseDto>> {
    return await this.ruleService.findRules(
      page,
      limit,
      provider,
      apiType,
      transDataRuleListType,
    );
  }

  @Get(":id")
  @ApiKeyAuth([Permission.DATA_READ])
  @ApiOperation({
    summary: "获取规则详情",
    description: "根据ID获取映射规则详细信息",
  })
  @ApiResponse({
    status: 200,
    description: "查询成功",
    type: FlexibleMappingRuleResponseDto,
  })
  @ApiStandardResponses()
  @ApiKeyAuthResponses()
  async getRuleById(
    @Param("id") id: string,
  ): Promise<FlexibleMappingRuleResponseDto> {
    return await this.ruleService.findRuleById(id);
  }

  @Put(":id")
  @Auth([UserRole.ADMIN, UserRole.DEVELOPER])
  @ApiOperation({
    summary: "更新映射规则",
    description: "更新指定的映射规则",
  })
  @ApiResponse({
    status: 200,
    description: "更新成功",
    type: FlexibleMappingRuleResponseDto,
  })
  @ApiStandardResponses()
  @JwtAuthResponses()
  async updateRule(
    @Param("id") id: string,
    @Body() dto: Partial<CreateFlexibleMappingRuleDto>,
  ): Promise<FlexibleMappingRuleResponseDto> {
    return await this.ruleService.updateRule(id, dto);
  }

  @Delete(":id")
  @Auth([UserRole.ADMIN])
  @ApiOperation({
    summary: "删除映射规则",
    description: "删除指定的映射规则",
  })
  @ApiResponse({ status: 200, description: "删除成功" })
  @ApiStandardResponses()
  @JwtAuthResponses()
  async deleteRule(@Param("id") id: string): Promise<void> {
    return await this.ruleService.deleteRule(id);
  }

  // ===============================
  // 基于模板生成规则
  // ===============================

  @Post("generate-from-template/:templateId")
  @Auth([UserRole.ADMIN, UserRole.DEVELOPER])
  @ApiOperation({
    summary: "一键生成映射规则",
    description: "基于持久化模板自动生成字段映射规则",
  })
  @ApiResponse({ status: 201, description: "规则生成成功" })
  @ApiStandardResponses()
  @JwtAuthResponses()
  async generateRuleFromTemplate(
    @Param("templateId") templateId: string,
    @Body()
    body: {
      transDataRuleListType: "quote_fields" | "basic_info_fields";
      ruleName?: string;
    },
  ) {
    return await this.ruleAlignmentService.generateRuleFromTemplate(
      templateId,
      body.transDataRuleListType,
      body.ruleName,
    );
  }

  @Post("preview-alignment/:templateId")
  @Auth([UserRole.ADMIN, UserRole.DEVELOPER])
  @ApiOperation({
    summary: "预览字段对齐",
    description: "预览模板字段与后端标准字段的对齐结果，不创建实际规则",
  })
  @ApiResponse({ status: 200, description: "预览成功" })
  @ApiStandardResponses()
  @JwtAuthResponses()
  async previewFieldAlignment(
    @Param("templateId") templateId: string,
    @Query("transDataRuleListType")
    transDataRuleListType: "quote_fields" | "basic_info_fields",
  ) {
    const template =
      await this.persistedTemplateService.getPersistedTemplateById(templateId);
    const alignmentResult = await this.ruleAlignmentService.previewAlignment(
      template,
      transDataRuleListType,
    );

    return {
      template: {
        id: template._id,
        name: template.name,
        provider: template.provider,
        apiType: template.apiType,
      },
      transDataRuleListType,
      alignmentPreview: alignmentResult,
    };
  }

  // ===============================
  // 规则对齐和调整
  // ===============================

  @Post(":id/realign")
  @Auth([UserRole.ADMIN, UserRole.DEVELOPER])
  @ApiOperation({
    summary: "重新对齐规则",
    description: "基于最新的模板重新对齐现有的映射规则",
  })
  @ApiResponse({ status: 200, description: "重新对齐成功" })
  @ApiStandardResponses()
  @JwtAuthResponses()
  async realignExistingRule(@Param("id") dataMapperRuleId: string) {
    return await this.ruleAlignmentService.realignExistingRule(
      dataMapperRuleId,
    );
  }

  @Put(":id/adjust-mappings")
  @Auth([UserRole.ADMIN, UserRole.DEVELOPER])
  @ApiOperation({
    summary: "手动调整字段映射",
    description: "对自动生成的字段映射进行手动调整",
  })
  @ApiResponse({ status: 200, description: "调整成功" })
  @ApiStandardResponses()
  @JwtAuthResponses()
  async manualAdjustFieldMapping(
    @Param("id") dataMapperRuleId: string,
    @Body()
    adjustments: Array<{
      action: "add" | "remove" | "modify";
      sourceField?: string;
      targetField?: string;
      newTargetField?: string;
      confidence?: number;
      description?: string;
    }>,
  ) {
    return await this.ruleAlignmentService.manualAdjustFieldMapping(
      dataMapperRuleId,
      adjustments,
    );
  }

  // ===============================
  // 规则测试功能
  // ===============================

  @Post("test")
  @ApiKeyAuth([Permission.DATA_READ])
  @ApiOperation({
    summary: "测试映射规则",
    description: "使用示例数据测试映射规则的效果",
  })
  @ApiResponse({
    status: 200,
    description: "测试成功",
    type: FlexibleMappingTestResultDto,
  })
  @ApiStandardResponses()
  @ApiKeyAuthResponses()
  async testMappingRule(
    @Body() dto: TestFlexibleMappingRuleDto,
  ): Promise<FlexibleMappingTestResultDto> {
    const startTime = Date.now();
    const rule = await this.ruleService.findRuleById(dto.dataMapperRuleId);

    const result = await this.ruleService.applyFlexibleMappingRule(
      rule as any,
      dto.testData,
      dto.includeDebugInfo || false,
    );

    const executionTime = Date.now() - startTime;

    // 若未请求 debugInfo，则直接使用 service 计算好的 mappingStats，避免统计为 0
    const mappingStats =
      result.debugInfo && result.debugInfo.length > 0
        ? {
            totalMappings: result.debugInfo.length,
            successfulMappings: result.debugInfo.filter((item) => item.success)
              .length,
            failedMappings:
              result.debugInfo.length -
              result.debugInfo.filter((item) => item.success).length,
            successRate:
              result.debugInfo.length > 0
                ? (result.debugInfo.filter((item) => item.success).length /
                    result.debugInfo.length) *
                  100
                : 0,
          }
        : result.mappingStats;

    return {
      dataMapperRuleId: dto.dataMapperRuleId,
      ruleName: rule.name,
      originalData: dto.testData,
      transformedData: result.transformedData,
      success: result.success,
      errorMessage: result.errorMessage,
      mappingStats,
      debugInfo: result.debugInfo,
      executionTime,
    };
  }
}
