import { Controller, Post, Body, HttpCode } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ApiKeyAuth } from '../../../../auth/decorators/auth.decorator';
import { Permission } from '../../../../auth/enums/user-role.enum';
import { ApiStandardResponses, ApiKeyAuthResponses } from '../../../../common/core/decorators/swagger-responses.decorator';
import { DataSourceAnalyzerService } from '../services/data-source-analyzer.service';
import { DataSourceTemplateService } from '../services/data-source-template.service';
import { 
  AnalyzeDataSourceDto,
  DataSourceAnalysisResponseDto,
  CreateDataSourceTemplateDto 
} from '../dto/data-source-analysis.dto';

@ApiTags('用户JSON持久化管理 (User JSON Persistence)')
@Controller('data-mapper/user-persistence')
export class UserJsonPersistenceController {

  constructor(
    private readonly analyzerService: DataSourceAnalyzerService,
    private readonly templateService: DataSourceTemplateService,
  ) {}

  @Post('analyze-source')
  @HttpCode(201)
  @ApiKeyAuth([Permission.DATA_READ])
  @ApiOperation({ 
    summary: '分析数据源结构',
    description: '分析提供的JSON数据，自动提取字段结构和类型信息。如果saveAsTemplate=true，则同时保存为模板' 
  })
  @ApiResponse({ status: 201, description: '分析成功，模板已创建', type: DataSourceAnalysisResponseDto })
  @ApiStandardResponses()
  @ApiKeyAuthResponses()
  async analyzeDataSource(@Body() dto: AnalyzeDataSourceDto): Promise<DataSourceAnalysisResponseDto> {
    // 1. 执行数据分析
    const analysis = await this.analyzerService.analyzeDataSource(
      dto.sampleData,
      dto.provider,
      dto.apiType
    );
    
    // 2. 如果用户选择保存为模板，则持久化到MongoDB
    let savedTemplate = null;
    if (dto.saveAsTemplate) {
      const templateData: CreateDataSourceTemplateDto = {
        name: dto.name || `${dto.provider}_${dto.dataType}_${Date.now()}`,
        description: dto.description || `${dto.provider} ${dto.dataType} 数据模板`,
        provider: dto.provider,
        apiType: dto.apiType,
        sampleData: dto.sampleData,
        extractedFields: analysis.extractedFields,
        confidence: analysis.confidence,
      };
      
      savedTemplate = await this.templateService.createTemplate(templateData);
    }
    
    return {
      provider: analysis.provider,
      apiType: analysis.apiType,
      sampleData: analysis.sampleData,
      extractedFields: analysis.extractedFields,
      totalFields: analysis.totalFields,
      analysisTimestamp: analysis.analysisTimestamp,
      confidence: analysis.confidence,
      // 如果保存了模板，返回模板信息
      ...(savedTemplate && { 
        savedTemplate: {
          id: savedTemplate.id,
          name: savedTemplate.name,
          message: '模板已成功保存到数据库'
        }
      })
    };
  }
}