import { 
  Controller, 
  Post, 
  Body, 
  Param,
  HttpCode,
  HttpStatus,
  ValidationPipe
} from '@nestjs/common';
import { Type } from 'class-transformer';
import { IsArray, IsString, ArrayNotEmpty } from 'class-validator';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Auth } from '../../../auth/decorators/auth.decorator';
import { UserRole } from '../../../auth/enums/user-role.enum';
import { ApiStandardResponses, JwtAuthResponses } from '../../../common/core/decorators/swagger-responses.decorator';
import { PersistedTemplateService } from '../services/persisted-template.service';

// DTO for bulk reset request
class BulkResetDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  ids: string[];
}

@ApiTags('预设模版持久化管理 (System Persistence)')
@Controller('data-mapper/system-persistence')
export class SystemPersistenceController {

  constructor(
    private readonly persistedTemplateService: PersistedTemplateService,
  ) {}

  // ===============================
  // 预设模板持久化管理
  // ===============================

  @Post('persist-presets')
  @HttpCode(HttpStatus.OK)
  @Auth([UserRole.ADMIN])
  @ApiOperation({ 
    summary: '持久化预设模板',
    description: '将硬编码的预设模板保存到数据库中，支持后续编辑' 
  })
  @ApiResponse({ status: 200, description: '持久化成功' })
  @ApiStandardResponses()
  @JwtAuthResponses()
  async persistPresetTemplates() {
    return await this.persistedTemplateService.persistPresetTemplates();
  }


  // ===============================
  // 模板重置功能
  // ===============================

  @Post(':id/reset')
  @HttpCode(HttpStatus.OK)
  @Auth([UserRole.ADMIN])
  @ApiOperation({ 
    summary: '重置单个预设模板',
    description: '将指定模板恢复为硬编码的原始配置' 
  })
  @ApiResponse({ status: 200, description: '重置成功' })
  @ApiStandardResponses()
  @JwtAuthResponses()
  async resetPresetTemplate(@Param('id') id: string) {
    return await this.persistedTemplateService.resetPresetTemplateById(id);
  }

  @Post('reset-bulk')
  @HttpCode(HttpStatus.OK)
  @Auth([UserRole.ADMIN])
  @ApiOperation({ 
    summary: '批量重置预设模板',
    description: '根据提供的 ID 列表批量重置预设模板' 
  })
  @ApiResponse({ status: 200, description: '批量重置成功' })
  @ApiStandardResponses()
  @JwtAuthResponses()
  async resetPresetTemplatesBulk(@Body(ValidationPipe) bulkResetDto: BulkResetDto) {
    return await this.persistedTemplateService.resetPresetTemplatesBulk(bulkResetDto.ids);
  }

  @Post('reset-all')
  @HttpCode(HttpStatus.OK)
  @Auth([UserRole.ADMIN])
  @ApiOperation({ 
    summary: '全量重置预设模板',
    description: '删除所有预设模板并恢复为硬编码配置' 
  })
  @ApiResponse({ status: 200, description: '全量重置成功' })
  @ApiStandardResponses()
  @JwtAuthResponses()
  async resetAllPresetTemplates() {
    return await this.persistedTemplateService.resetPresetTemplates();
  }

}