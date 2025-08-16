import { 
  Controller, 
  Post, 
  Get, 
  Put, 
  Delete, 
  Body, 
  Param, 
  Query 
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Auth } from '../../../../auth/decorators/auth.decorator';
import { UserRole, Permission } from '../../../../auth/enums/user-role.enum';
import { ApiKeyAuth } from '../../../../auth/decorators/auth.decorator';
import { ApiStandardResponses, ApiKeyAuthResponses, JwtAuthResponses } from '@common/core/decorators/swagger-responses.decorator';
import { PaginatedDataDto } from '../../../../common/modules/pagination/dto/paginated-data';
import { DataSourceTemplateService } from '../services/data-source-template.service';
import { PersistedTemplateService } from '../services/persisted-template.service';
import { 
  CreateDataSourceTemplateDto,
  DataSourceTemplateResponseDto 
} from '../dto/data-source-analysis.dto';

@ApiTags('模板管理 (Template Admin)')
@Controller('data-mapper/admin/templates')
export class TemplateAdminController {

  constructor(
    private readonly templateService: DataSourceTemplateService,
    private readonly persistedTemplateService: PersistedTemplateService,
  ) {}

  // ===============================
  // 基础模板CRUD管理
  // ===============================

  @Post()
  @Auth([UserRole.ADMIN, UserRole.DEVELOPER])
  @ApiOperation({ 
    summary: '创建数据源模板',
    description: '创建可复用的数据源模板' 
  })
  @ApiResponse({ status: 201, description: '创建成功', type: DataSourceTemplateResponseDto })
  @ApiStandardResponses()
  @JwtAuthResponses()
  async createTemplate(@Body() dto: CreateDataSourceTemplateDto): Promise<DataSourceTemplateResponseDto> {
    return await this.templateService.createTemplate(dto);
  }

  @Get()
  @ApiKeyAuth([Permission.DATA_READ])
  @ApiOperation({ 
    summary: '查询数据源模板',
    description: '分页查询数据源模板列表' 
  })
  @ApiResponse({ status: 200, description: '查询成功' })
  @ApiStandardResponses()
  @ApiKeyAuthResponses()
  async getTemplates(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('provider') provider?: string,
    @Query('apiType') apiType?: string
  ): Promise<PaginatedDataDto<DataSourceTemplateResponseDto>> {
    return await this.templateService.findTemplates(page, limit, provider, apiType);
  }

  @Get('stats')
  @Auth([UserRole.ADMIN, UserRole.DEVELOPER])
  @ApiOperation({ 
    summary: '获取统计信息',
    description: '获取模板的统计信息' 
  })
  @ApiResponse({ status: 200, description: '获取成功' })
  @ApiStandardResponses()
  @JwtAuthResponses()
  async getStats() {
    const templates = await this.persistedTemplateService.getAllPersistedTemplates();
    
    const stats = {
      totalTemplates: templates.length,
      templatesByProvider: templates.reduce((acc, template) => {
        acc[template.provider] = (acc[template.provider] || 0) + 1;
        return acc;
      }, {}),
      templatesByApiType: templates.reduce((acc, template) => {
        acc[template.apiType] = (acc[template.apiType] || 0) + 1;
        return acc;
      }, {}),
      activeTemplates: templates.filter(t => t.isActive).length,
      presetTemplates: templates.filter(t => t.isPreset).length,
    };

    return stats;
  }

  @Get('health')
  @Auth([UserRole.ADMIN, UserRole.DEVELOPER])
  @ApiOperation({ 
    summary: '系统健康检查',
    description: '检查模板管理系统的健康状态' 
  })
  @ApiResponse({ status: 200, description: '健康检查完成' })
  @ApiStandardResponses()
  @JwtAuthResponses()
  async healthCheck() {
    const templates = await this.persistedTemplateService.getAllPersistedTemplates();
    
    const issues = [];
    
    if (templates.length === 0) {
      issues.push('没有持久化的模板');
    }
    
    const inactiveCount = templates.filter(t => !t.isActive).length;
    if (inactiveCount > templates.length * 0.5) {
      issues.push('超过50%的模板处于非激活状态');
    }
    
    return {
      status: issues.length === 0 ? 'healthy' : 'warning',
      timestamp: new Date().toISOString(),
      templatesCount: templates.length,
      issues,
      recommendations: issues.length > 0 ? [
        '建议运行预设模板持久化',
        '检查模板配置的正确性',
      ] : ['系统运行正常'],
    };
  }

  @Get(':id')
  @ApiKeyAuth([Permission.DATA_READ])
  @ApiOperation({ 
    summary: '获取数据源模板详情',
    description: '根据ID获取数据源模板详细信息' 
  })
  @ApiResponse({ status: 200, description: '查询成功', type: DataSourceTemplateResponseDto })
  @ApiStandardResponses()
  @ApiKeyAuthResponses()
  async getTemplateById(@Param('id') id: string): Promise<DataSourceTemplateResponseDto> {
    return await this.templateService.findTemplateById(id);
  }

  @Put(':id')
  @Auth([UserRole.ADMIN])
  @ApiOperation({ 
    summary: '更新数据源模板',
    description: '更新指定的数据源模板' 
  })
  @ApiResponse({ status: 200, description: '更新成功', type: DataSourceTemplateResponseDto })
  @ApiStandardResponses()
  @JwtAuthResponses()
  async updateTemplate(
    @Param('id') id: string,
    @Body() dto: Partial<CreateDataSourceTemplateDto>
  ): Promise<DataSourceTemplateResponseDto> {
    return await this.templateService.updateTemplate(id, dto);
  }

  @Delete(':id')
  @Auth([UserRole.ADMIN])
  @ApiOperation({ 
    summary: '删除数据源模板',
    description: '删除指定的数据源模板' 
  })
  @ApiResponse({ status: 200, description: '删除成功' })
  @ApiStandardResponses()
  @JwtAuthResponses()
  async deleteTemplate(@Param('id') id: string): Promise<void> {
    return await this.templateService.deleteTemplate(id);
  }

  // ===============================
  // 持久化模板管理
  // ===============================

  @Get('persisted/all')
  @Auth([UserRole.ADMIN, UserRole.DEVELOPER])
  @ApiOperation({ 
    summary: '获取持久化模板列表',
    description: '查看所有已持久化的预设模板' 
  })
  @ApiResponse({ status: 200, description: '获取成功' })
  @ApiStandardResponses()
  @JwtAuthResponses()
  async getAllPersistedTemplates() {
    return await this.persistedTemplateService.getAllPersistedTemplates();
  }

  @Get('persisted/:id')
  @Auth([UserRole.ADMIN, UserRole.DEVELOPER])
  @ApiOperation({ 
    summary: '获取持久化模板详情',
    description: '根据ID获取持久化模板的详细信息' 
  })
  @ApiResponse({ status: 200, description: '获取成功' })
  @ApiStandardResponses()
  @JwtAuthResponses()
  async getPersistedTemplateById(@Param('id') id: string) {
    return await this.persistedTemplateService.getPersistedTemplateById(id);
  }

  @Put('persisted/:id')
  @Auth([UserRole.ADMIN])
  @ApiOperation({ 
    summary: '编辑持久化模板',
    description: '修改已持久化的预设模板' 
  })
  @ApiResponse({ status: 200, description: '更新成功' })
  @ApiStandardResponses()
  @JwtAuthResponses()
  async updatePersistedTemplate(
    @Param('id') id: string,
    @Body() updateData: {
      name?: string;
      description?: string;
      sampleData?: any;
      isActive?: boolean;
    }
  ) {
    return await this.persistedTemplateService.updatePersistedTemplate(id, updateData);
  }

  @Delete('persisted/:id')
  @Auth([UserRole.ADMIN])
  @ApiOperation({ 
    summary: '删除持久化模板',
    description: '删除指定的持久化模板' 
  })
  @ApiResponse({ status: 200, description: '删除成功' })
  @ApiStandardResponses()
  @JwtAuthResponses()
  async deletePersistedTemplate(@Param('id') id: string) {
    await this.persistedTemplateService.deletePersistedTemplate(id);
    return { message: '模板删除成功' };
  }

}