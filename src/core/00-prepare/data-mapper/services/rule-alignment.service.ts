import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { createLogger } from '@app/config/logger.config';
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { CollectorService } from '../../../../monitoring/collector/collector.service';

import { DataSourceTemplate, DataSourceTemplateDocument } from '../schemas/data-source-template.schema';
import { FlexibleMappingRule, FlexibleMappingRuleDocument } from '../schemas/flexible-mapping-rule.schema';

/**
 * 🎯 规则对齐服务
 * 基于持久化模板自动生成和对齐映射规则
 */
@Injectable()
export class RuleAlignmentService {
  private readonly logger = createLogger(RuleAlignmentService.name);

  // 预设的目标字段映射（后端标准字段）
  private readonly PRESET_TARGET_FIELDS = {
    // 股票报价字段
    quote_fields: [
      'symbol',         // 股票代码
      'lastPrice',      // 最新价
      'previousClose',  // 昨收价
      'openPrice',      // 开盘价
      'highPrice',      // 最高价
      'lowPrice',       // 最低价
      'volume',         // 成交量
      'turnover',       // 成交额
      'timestamp',      // 时间戳
      'tradeStatus',    // 交易状态
      'preMarketPrice', // 盘前价格
      'postMarketPrice',// 盘后价格
      'preMarketVolume',// 盘前成交量
      'postMarketVolume',// 盘后成交量
    ],
    
    // 股票基本信息字段
    basic_info_fields: [
      'symbol',         // 股票代码
      'nameCn',         // 中文名称
      'nameEn',         // 英文名称
      'nameHk',         // 繁体名称
      'exchange',       // 交易所
      'currency',       // 货币
      'board',          // 板块
      'lotSize',        // 每手股数
      'totalShares',    // 总股本
      'circulatingShares', // 流通股本
      'hkShares',       // 港股股本
      'eps',            // 每股收益
      'epsTtm',         // 每股收益TTM
      'bps',            // 每股净资产
      'dividendYield',  // 股息率
      'stockDerivatives', // 衍生品类型
    ],
  };

  constructor(
    @InjectModel(DataSourceTemplate.name)
    private readonly templateModel: Model<DataSourceTemplateDocument>,
    @InjectModel(FlexibleMappingRule.name)
    private readonly ruleModel: Model<FlexibleMappingRuleDocument>,
    private readonly collectorService: CollectorService, // ✅ 新增依赖注入
  ) {}

  /**
   * ✅ 监控安全包装器 - 确保监控失败不影响业务流程
   */
  private safeRecordOperation(
    operation: string,
    duration: number,
    success: boolean,
    metadata?: any
  ) {
    try {
      this.collectorService.recordRequest(
        `rule-alignment/${operation}`,
        'POST',
        success ? 200 : 500,
        duration,
        { service: 'RuleAlignmentService', ...metadata }
      );
    } catch (error) {
      // 监控失败不应影响业务
      this.logger.warn(`监控记录失败: ${error.message}`, { operation, metadata });
    }
  }

  /**
   * 🎯 基于模板一键生成规则
   */
  async generateRuleFromTemplate(
    templateId: string,
    transDataRuleListType: 'quote_fields' | 'basic_info_fields',
    ruleName?: string
  ): Promise<{
    rule: FlexibleMappingRuleDocument;
    alignmentResult: {
      totalFields: number;
      alignedFields: number;
      unalignedFields: string[];
      suggestions: Array<{
        sourceField: string;
        suggestedTarget: string;
        confidence: number;
        reasoning: string;
      }>;
    };
  }> {
    const startTime = Date.now();
    this.logger.log(`基于模板生成规则`, { templateId, transDataRuleListType });

    try {

    // 1. 获取模板
    const template = await this.templateModel.findById(templateId);
    if (!template) {
      throw new NotFoundException(`模板未找到: ${templateId}`);
    }

    // 2. 检查规则是否已存在
    const generatedRuleName = ruleName || `${template.name} - ${transDataRuleListType} 自动对齐规则`;
    const existingRule = await this.ruleModel.findOne({
      name: generatedRuleName,
      provider: template.provider,
      apiType: template.apiType,
      transDataRuleListType: transDataRuleListType
    });

    if (existingRule) {
      throw new BadRequestException(`规则已存在: ${generatedRuleName}`);
    }

    // 3. 自动对齐字段
    const alignmentResult = this.autoAlignFields(template, transDataRuleListType);

    // 4. 构建字段映射
    const fieldMappings = alignmentResult.suggestions
      .filter(suggestion => suggestion.confidence >= 0.7) // 只使用高置信度的对齐
      .map(suggestion => ({
        sourceFieldPath: suggestion.sourceField,
        targetField: suggestion.suggestedTarget,
        confidence: suggestion.confidence,
        description: suggestion.reasoning,
        isActive: true,
      }));

    // 5. 创建规则
    const rule = await this.ruleModel.create({
      name: generatedRuleName,
      provider: template.provider,
      apiType: template.apiType,
      transDataRuleListType: transDataRuleListType,
      description: `基于模板 ${template.name} 自动生成的字段映射规则`,
      sourceTemplateId: templateId,
      fieldMappings,
      overallConfidence: this.calculateOverallConfidence(fieldMappings),
      isDefault: false,
      isActive: true,
      version: '1.0.0',
      usageCount: 0,
      successfulTransformations: 0,
      failedTransformations: 0,
    });

    this.logger.log(`规则生成成功`, {
      dataMapperRuleId: rule._id,
      name: generatedRuleName,
      alignedFields: alignmentResult.alignedFields,
      totalFields: alignmentResult.totalFields,
    });

    // ✅ 轻量级成功监控
    this.safeRecordOperation(
      'generate-rule',
      Date.now() - startTime,
      true,
      {
        templateId,
        transDataRuleListType,
        alignedFields: alignmentResult.alignedFields
      }
    );
    
    return { rule, alignmentResult };
    } catch (error) {
      // ✅ 轻量级错误监控
      this.safeRecordOperation(
        'generate-rule',
        Date.now() - startTime,
        false,
        {
          templateId,
          transDataRuleListType,
          error: error.message
        }
      );
      throw error;
    }
  }

  /**
   * 🔄 重新对齐现有规则
   */
  async realignExistingRule(dataMapperRuleId: string): Promise<{
    rule: FlexibleMappingRuleDocument;
    changes: {
      added: string[];
      removed: string[];
      modified: string[];
    };
    alignmentResult: any;
  }> {
    const startTime = Date.now();
    this.logger.log(`重新对齐现有规则`, { dataMapperRuleId });

    try {

    // 1. 获取规则和关联模板
    const rule = await this.ruleModel.findById(dataMapperRuleId);
    if (!rule) {
      throw new NotFoundException(`规则未找到: ${dataMapperRuleId}`);
    }

    const template = await this.templateModel.findById(rule.sourceTemplateId);
    if (!template) {
      throw new BadRequestException(`规则关联的模板未找到: ${rule.sourceTemplateId}`);
    }

    // 2. 保存原有字段映射
    const originalMappings = rule.fieldMappings.map(m => ({
      sourceField: m.sourceFieldPath,
      targetField: m.targetField,
    }));

    // 3. 重新对齐
    const alignmentResult = this.autoAlignFields(template, rule.transDataRuleListType as any);

    // 4. 构建新的字段映射
    const newFieldMappings = alignmentResult.suggestions
      .filter(suggestion => suggestion.confidence >= 0.7)
      .map(suggestion => ({
        sourceFieldPath: suggestion.sourceField,
        targetField: suggestion.suggestedTarget,
        confidence: suggestion.confidence,
        description: suggestion.reasoning,
        isActive: true,
      }));

    // 5. 分析变化
    const changes = this.analyzeFieldMappingChanges(originalMappings, newFieldMappings);

    // 6. 更新规则
    const updatedRule = await this.ruleModel.findByIdAndUpdate(
      dataMapperRuleId,
      {
        fieldMappings: newFieldMappings,
        overallConfidence: this.calculateOverallConfidence(newFieldMappings),
        lastAlignedAt: new Date(),
      },
      { new: true }
    );

    this.logger.log(`规则重新对齐完成`, {
      dataMapperRuleId,
      changes,
      newMappingsCount: newFieldMappings.length,
    });

    // ✅ 轻量级成功监控
    this.safeRecordOperation(
      'realign-rule',
      Date.now() - startTime,
      true,
      {
        ruleId: dataMapperRuleId,
        totalChanges: changes.added.length + changes.removed.length + changes.modified.length
      }
    );
    
    return { rule: updatedRule, changes, alignmentResult };
    } catch (error) {
      // ✅ 轻量级错误监控
      this.safeRecordOperation(
        'realign-rule',
        Date.now() - startTime,
        false,
        {
          ruleId: dataMapperRuleId,
          error: error.message
        }
      );
      throw error;
    }
  }

  /**
   * 🎯 手动调整字段映射
   */
  async manualAdjustFieldMapping(
    dataMapperRuleId: string,
    adjustments: Array<{
      action: 'add' | 'remove' | 'modify';
      sourceField?: string;
      targetField?: string;
      newTargetField?: string;
      confidence?: number;
      description?: string;
    }>
  ): Promise<FlexibleMappingRuleDocument> {
    this.logger.log(`手动调整字段映射`, { dataMapperRuleId, adjustmentsCount: adjustments.length });

    const rule = await this.ruleModel.findById(dataMapperRuleId);
    if (!rule) {
      throw new NotFoundException(`规则未找到: ${dataMapperRuleId}`);
    }

    let fieldMappings = [...rule.fieldMappings];

    // 应用调整
    for (const adjustment of adjustments) {
      switch (adjustment.action) {
        case 'add':
          if (adjustment.sourceField && adjustment.targetField) {
            fieldMappings.push({
              sourceFieldPath: adjustment.sourceField,
              targetField: adjustment.targetField,
              confidence: adjustment.confidence || 0.8,
              description: adjustment.description || '手动添加的映射',
              isActive: true,
            } as any);
          }
          break;

        case 'remove':
          fieldMappings = fieldMappings.filter(mapping => 
            !(mapping.sourceFieldPath === adjustment.sourceField || 
              mapping.targetField === adjustment.targetField)
          );
          break;

        case 'modify':
          const mappingIndex = fieldMappings.findIndex(mapping => 
            mapping.sourceFieldPath === adjustment.sourceField
          );
          if (mappingIndex === -1) {
            throw new NotFoundException(`字段映射未找到: ${adjustment.sourceField}`);
          }
          if (adjustment.newTargetField) {
            fieldMappings[mappingIndex].targetField = adjustment.newTargetField;
          }
          if (adjustment.confidence) {
            fieldMappings[mappingIndex].confidence = adjustment.confidence;
          }
          if (adjustment.description) {
            fieldMappings[mappingIndex].description = adjustment.description;
          }
          break;
      }
    }

    // 更新规则
    const updatedRule = await this.ruleModel.findByIdAndUpdate(
      dataMapperRuleId,
      {
        fieldMappings,
        overallConfidence: this.calculateOverallConfidence(fieldMappings),
      },
      { new: true }
    );

    this.logger.log(`字段映射手动调整完成`, { 
      dataMapperRuleId, 
      finalMappingsCount: fieldMappings.length 
    });

    return updatedRule;
  }

  /**
   * 🔧 预览字段对齐（公开接口）
   * 修复私有方法访问问题：提供正式的预览接口
   */
  async previewAlignment(
    template: DataSourceTemplateDocument,
    transDataRuleListType: 'quote_fields' | 'basic_info_fields'
  ) {
    // 参数验证
    if (!template) {
      throw new BadRequestException('模板参数必须提供');
    }
    if (!transDataRuleListType) {
      throw new BadRequestException('transDataRuleListType参数必须提供');
    }
    if (!['quote_fields', 'basic_info_fields'].includes(transDataRuleListType)) {
      throw new BadRequestException('transDataRuleListType必须是quote_fields或basic_info_fields');
    }
    
    try {
      // 调用原私有方法逻辑
      const alignmentResult = this.autoAlignFields(template, transDataRuleListType);
      
      this.logger.debug('字段对齐预览完成', {
        templateId: template._id?.toString(),
        templateName: template.name,
        provider: template.provider,
        transDataRuleListType,
        alignedCount: alignmentResult.alignedFields,
        totalCount: alignmentResult.totalFields
      });
      
      return alignmentResult;
      
    } catch (error) {
      this.logger.error('字段对齐预览失败', {
        templateId: template._id?.toString(),
        transDataRuleListType,
        error: error.message
      });
      throw new BadRequestException(`字段对齐预览失败: ${error.message}`);
    }
  }

  /**
   * 🔧 自动对齐字段
   */
  private autoAlignFields(
    template: DataSourceTemplateDocument, 
    transDataRuleListType: 'quote_fields' | 'basic_info_fields'
  ) {
    const targetFields = this.PRESET_TARGET_FIELDS[transDataRuleListType];
    const sourceFields = template.extractedFields || [];
    
    const suggestions = [];
    const aligned = [];
    const unaligned = [];

    for (const targetField of targetFields) {
      const bestMatch = this.findBestSourceFieldMatch(targetField, sourceFields);
      
      if (bestMatch.field && bestMatch.confidence >= 0.5) {
        suggestions.push({
          sourceField: bestMatch.field.fieldPath,
          suggestedTarget: targetField,
          confidence: bestMatch.confidence,
          reasoning: bestMatch.reasoning,
        });
        aligned.push(targetField);
      } else {
        unaligned.push(targetField);
      }
    }

    return {
      totalFields: targetFields.length,
      alignedFields: aligned.length,
      unalignedFields: unaligned,
      suggestions,
    };
  }

  /**
   * 🔧 寻找最佳源字段匹配
   */
  private findBestSourceFieldMatch(targetField: string, sourceFields: any[]): {
    field: any;
    confidence: number;
    reasoning: string;
  } {
    let bestMatch = { field: null, confidence: 0, reasoning: '' };

    for (const sourceField of sourceFields) {
      const confidence = this.calculateFieldMatchConfidence(targetField, sourceField);
      
      if (
        confidence > bestMatch.confidence ||
        (
          confidence === bestMatch.confidence &&
          // 当置信度相同，优先选择 leaf 节点（非嵌套字段）
          bestMatch.field?.isNested && sourceField.isNested === false
        )
      ) {
        bestMatch = {
          field: sourceField,
          confidence,
          reasoning: this.generateMatchReasoning(targetField, sourceField, confidence),
        };
      }
    }

    return bestMatch;
  }

  /**
   * 🔧 计算字段匹配置信度
   */
  private calculateFieldMatchConfidence(targetField: string, sourceField: any): number {
    const sourceName = sourceField.fieldName.toLowerCase();
    const sourcePath = sourceField.fieldPath.toLowerCase();
    const target = targetField.toLowerCase();
    const sourceLastSegment = sourcePath.split('.').pop();

    // 完全匹配
    if (sourceName === target || sourcePath === target) return 1.0;
    // 末段完全匹配（适用于嵌套字段，如 quote.price.current vs currentPrice）
    if (sourceLastSegment === target) return 0.95;
    if (target.includes(sourceLastSegment) || sourceLastSegment.includes(target)) return 0.9;

    // 常见字段映射规则
    const mappingRules = {
      'symbol': ['symbol', 'code', 'ticker'],
      'lastprice': ['lastdone', 'last_done', 'price', 'last_price', 'current_price', 'current', 'price.current'],
      'previousclose': ['prevclose', 'prev_close', 'previous_close', 'yesterday_close', 'previous', 'price.previous'],
      'openprice': ['open', 'open_price', 'opening_price'],
      'highprice': ['high', 'high_price', 'day_high', 'highest'],
      'lowprice': ['low', 'low_price', 'day_low', 'lowest'],
      'volume': ['volume', 'vol', 'trade_volume', 'trading_volume', 'total', 'volume.total'],
      'turnover': ['turnover', 'amount', 'trade_amount', 'trading_amount'],
      'timestamp': ['timestamp', 'time', 'datetime', 'update_time', 'trade_time'],
      'tradestatus': ['tradestatus', 'trade_status', 'status', 'market_status'],
      'namecn': ['name_cn', 'namecn', 'chinese_name', 'cn_name'],
      'nameen': ['name_en', 'nameen', 'english_name', 'en_name'],
      'exchange': ['exchange', 'market', 'trading_market'],
      'currency': ['currency', 'ccy', 'curr'],
      'lotsize': ['lotsize', 'lot_size', 'board_lot', 'min_unit'],
    };

    const targetRules = mappingRules[target] || [];
    
    for (const rule of targetRules) {
      if (sourceName.includes(rule) || sourcePath.includes(rule)) {
        return 0.9;
      }
    }

    // 增强的嵌套字段匹配逻辑
    // 对于嵌套字段，检查路径的各个部分是否匹配目标字段的语义
    if (sourcePath.includes('.')) {
      const pathParts = sourcePath.split('.');
      const lastPart = pathParts[pathParts.length - 1];
      const secondLastPart = pathParts.length > 1 ? pathParts[pathParts.length - 2] : '';
      
      // 检查路径组合是否匹配目标字段
      const contextualMatch = `${secondLastPart}.${lastPart}`;
      for (const rule of targetRules) {
        if (contextualMatch === rule || contextualMatch.includes(rule) || rule.includes(contextualMatch)) {
          return 0.85; // 稍低于直接匹配但高于部分匹配
        }
      }
      
      // 检查最后一个路径部分是否与目标字段匹配
      for (const rule of targetRules) {
        if (lastPart.includes(rule) || rule.includes(lastPart)) {
          return 0.8;
        }
      }
    }

    // 部分匹配
    if (sourceName.includes(target) || target.includes(sourceName)) {
      return 0.7;
    }

    // 语义相似性（简单版本）
    const semanticScore = this.calculateSemanticSimilarity(target, sourceName);
    if (semanticScore > 0.6) {
      return semanticScore;
    }

    return 0.0;
  }

  /**
   * 🔧 计算语义相似性
   */
  private calculateSemanticSimilarity(target: string, source: string): number {
    // 简单的字符串相似度算法
    const longer = target.length > source.length ? target : source;
    const shorter = target.length > source.length ? source : target;
    
    if (longer.length === 0) return 1.0;
    
    const distance = this.levenshteinDistance(longer, shorter);
    return (longer.length - distance) / longer.length;
  }

  /**
   * 🔧 计算编辑距离
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = [];
    
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }
    
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }
    
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    
    return matrix[str2.length][str1.length];
  }

  /**
   * 🔧 生成匹配推理
   */
  private generateMatchReasoning(targetField: string, sourceField: any, confidence: number): string {
    if (confidence >= 0.9) {
      return `字段名称高度匹配: ${sourceField.fieldName} → ${targetField}`;
    } else if (confidence >= 0.7) {
      return `字段含义相似: ${sourceField.fieldName} → ${targetField}`;
    } else if (confidence >= 0.5) {
      return `可能的字段映射: ${sourceField.fieldName} → ${targetField}`;
    } else {
      return `低置信度匹配: ${sourceField.fieldName} → ${targetField}`;
    }
  }

  /**
   * 🔧 分析字段映射变化
   */
  private analyzeFieldMappingChanges(
    originalMappings: Array<{ sourceField: string; targetField: string }>,
    newMappings: Array<{ sourceFieldPath: string; targetField: string }>
  ) {
    const changes = { added: [], removed: [], modified: [] };

    const originalMap = new Map(originalMappings.map(m => [m.sourceField, m.targetField]));
    const newMap = new Map(newMappings.map(m => [m.sourceFieldPath, m.targetField]));

    // 查找新增的映射
    for (const [sourceField, targetField] of newMap) {
      if (!originalMap.has(sourceField)) {
        changes.added.push(`${sourceField} → ${targetField}`);
      } else if (originalMap.get(sourceField) !== targetField) {
        changes.modified.push(`${sourceField}: ${originalMap.get(sourceField)} → ${targetField}`);
      }
    }

    // 查找删除的映射
    for (const [sourceField, targetField] of originalMap) {
      if (!newMap.has(sourceField)) {
        changes.removed.push(`${sourceField} → ${targetField}`);
      }
    }

    return changes;
  }

  /**
   * 🔧 计算整体置信度
   */
  private calculateOverallConfidence(fieldMappings: any[]): number {
    if (fieldMappings.length === 0) return 0;
    
    const totalConfidence = fieldMappings.reduce((sum, mapping) => sum + mapping.confidence, 0);
    return Math.min(totalConfidence / fieldMappings.length, 1.0);
  }
}