/**
 * StreamReceiver 数据验证模块
 * 提供通用的数据验证逻辑
 */

import { Injectable } from '@nestjs/common';
import { createLogger } from '@common/logging/index';
import { API_OPERATIONS } from '@common/constants/domain';
import { SymbolValidationUtils } from '@common/utils/symbol-validation.util';
import { StreamSubscribeDto, StreamUnsubscribeDto } from '../dto';
import { ProviderRegistryService } from '@providersv2/provider-registry.service';

/**
 * 验证结果接口
 */
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  sanitizedData?: any;
}

/**
 * 符号验证结果
 */
export interface SymbolValidationResult {
  validSymbols: string[];
  invalidSymbols: string[];
  duplicateSymbols: string[];
  sanitizedSymbols: string[];
}

export interface SubscribeValidationOptions {
  skipAuthValidation?: boolean;
}

/**
 * 流数据验证器
 */
@Injectable()
export class StreamDataValidator {
  private readonly logger = createLogger('StreamDataValidator');

  constructor(
    private readonly providerRegistryService: ProviderRegistryService,
  ) {}

  // 支持的市场前缀
  private readonly SUPPORTED_MARKETS = ['HK', 'US', 'CN', 'SG'];

  // 支持的WebSocket能力类型
  private readonly SUPPORTED_WS_CAPABILITIES = [
    API_OPERATIONS.DATA_TYPES.QUOTE,
    'depth',
    'trade',
    'broker',
    'kline',
    API_OPERATIONS.STOCK_DATA.STREAM_QUOTE,
  ];
  private readonly STATIC_WS_CAPABILITY_SET = new Set(
    this.SUPPORTED_WS_CAPABILITIES.map((capability) =>
      capability.toLowerCase(),
    ),
  );
  private readonly DYNAMIC_WS_CAPABILITY_CACHE_TTL_MS = 30 * 1000;
  private dynamicWSCapabilityCache: Set<string> | null = null;
  private dynamicWSCapabilityCacheExpiresAt = 0;

  /**
   * 验证订阅请求
   */
  validateSubscribeRequest(
    dto: StreamSubscribeDto,
    options?: SubscribeValidationOptions,
  ): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // 验证符号列表
    const symbolValidation = this.validateSymbols(dto.symbols);
    if (symbolValidation.invalidSymbols.length > 0) {
      errors.push(`无效的符号格式: ${symbolValidation.invalidSymbols.join(', ')}`);
    }

    if (symbolValidation.duplicateSymbols.length > 0) {
      warnings.push(`发现重复符号，已自动去重: ${symbolValidation.duplicateSymbols.join(', ')}`);
    }

    // 验证WebSocket能力类型
    if (dto.wsCapabilityType && !this.isValidWSCapability(dto.wsCapabilityType)) {
      errors.push(`不支持的WebSocket能力类型: ${dto.wsCapabilityType}`);
    }

    // 验证提供商
    if (dto.preferredProvider && !this.isValidProvider(dto.preferredProvider)) {
      warnings.push(`未知的数据提供商: ${dto.preferredProvider}`);
    }

    // 连接级认证通过后，允许跳过消息级认证字段校验
    if (!options?.skipAuthValidation) {
      const authValidation = this.validateAuthInfo(dto);
      errors.push(...authValidation.errors);
      warnings.push(...authValidation.warnings);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      sanitizedData: {
        ...dto,
        symbols: symbolValidation.sanitizedSymbols
      }
    };
  }

  /**
   * 验证取消订阅请求
   */
  validateUnsubscribeRequest(dto: StreamUnsubscribeDto): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // 验证符号列表
    const symbolValidation = this.validateSymbols(dto.symbols);
    if (symbolValidation.invalidSymbols.length > 0) {
      errors.push(`无效的符号格式: ${symbolValidation.invalidSymbols.join(', ')}`);
    }

    if (symbolValidation.duplicateSymbols.length > 0) {
      warnings.push(`发现重复符号，已自动去重: ${symbolValidation.duplicateSymbols.join(', ')}`);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      sanitizedData: {
        ...dto,
        symbols: symbolValidation.sanitizedSymbols
      }
    };
  }

  /**
   * 验证符号列表
   */
  validateSymbols(symbols: unknown): SymbolValidationResult {
    const validSymbols: string[] = [];
    const invalidSymbols: string[] = [];
    const duplicateSymbols: string[] = [];
    const sanitizedSymbols: string[] = [];
    const seen = new Set<string>();

    if (!Array.isArray(symbols)) {
      return {
        validSymbols,
        invalidSymbols: ["symbols 必须是字符串数组"],
        duplicateSymbols,
        sanitizedSymbols,
      };
    }

    for (const symbol of symbols) {
      if (typeof symbol !== "string") {
        invalidSymbols.push(`非字符串符号: ${String(symbol)}`);
        continue;
      }

      // 规范化符号（大写、去空格）
      const sanitized = this.sanitizeSymbol(symbol);

      // 检查重复
      if (seen.has(sanitized)) {
        duplicateSymbols.push(symbol);
        continue;
      }

      seen.add(sanitized);

      // 验证格式
      if (this.isValidSymbolFormat(sanitized)) {
        validSymbols.push(symbol);
        sanitizedSymbols.push(sanitized);
      } else {
        invalidSymbols.push(symbol);
      }
    }

    return {
      validSymbols,
      invalidSymbols,
      duplicateSymbols,
      sanitizedSymbols
    };
  }

  /**
   * 验证单个符号格式
   */
  isValidSymbolFormat(symbol: string): boolean {
    const sanitized = this.sanitizeSymbol(symbol);
    return SymbolValidationUtils.isStrictStandardSymbol(sanitized);
  }

  /**
   * 规范化符号
   */
  sanitizeSymbol(symbol: string): string {
    return symbol.trim().toUpperCase();
  }

  /**
   * 提取市场标识
   */
  extractMarket(symbol: string): string | null {
    const sanitized = this.sanitizeSymbol(symbol);
    if (!SymbolValidationUtils.isStrictStandardSymbol(sanitized)) {
      return null;
    }

    if (sanitized.endsWith('.HK')) {
      return 'HK';
    }
    if (sanitized.endsWith('.US')) {
      return 'US';
    }
    if (sanitized.endsWith('.SG')) {
      return 'SG';
    }
    if (sanitized.endsWith('.SH') || sanitized.endsWith('.SZ')) {
      return 'CN';
    }

    return null;
  }

  /**
   * 验证WebSocket能力类型
   */
  isValidWSCapability(capability: string): boolean {
    const normalizedCapability = this.normalizeCapability(capability);
    if (!normalizedCapability) {
      return false;
    }

    // 动态能力优先：优先使用注册表中的能力元数据判定。
    const dynamicCapabilities = this.getDynamicWSCapabilities();
    if (dynamicCapabilities.has(normalizedCapability)) {
      return true;
    }

    // 静态回退：保证旧客户端能力别名持续可用。
    return this.STATIC_WS_CAPABILITY_SET.has(normalizedCapability);
  }

  refreshWSCapabilityCache(): void {
    this.dynamicWSCapabilityCache = null;
    this.dynamicWSCapabilityCacheExpiresAt = 0;
  }

  /**
   * 验证数据提供商
   */
  isValidProvider(provider: string): boolean {
    const normalizedProvider = provider.trim().toLowerCase();
    if (!normalizedProvider) {
      return false;
    }
    return !!this.providerRegistryService.getProvider(normalizedProvider);
  }

  /**
   * 验证认证信息
   */
  private validateAuthInfo(dto: StreamSubscribeDto): { errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];

    const hasToken = !!dto.token;
    const hasApiKey = !!(dto.apiKey && dto.accessToken);

    if (!hasToken && !hasApiKey) {
      errors.push('缺少认证信息：需要提供JWT Token或API Key + Access Token');
    }

    if (hasToken && hasApiKey) {
      warnings.push('同时提供了JWT Token和API Key，将优先使用JWT Token');
    }

    // 验证API Key格式
    if (dto.apiKey && !this.isValidApiKeyFormat(dto.apiKey)) {
      errors.push('API Key格式无效');
    }

    // 验证Access Token格式
    if (dto.accessToken && !this.isValidAccessTokenFormat(dto.accessToken)) {
      errors.push('Access Token格式无效');
    }

    return { errors, warnings };
  }

  /**
   * 验证API Key格式
   */
  private isValidApiKeyFormat(apiKey: string): boolean {
    // API Key应该是字母数字组合，长度在8-64之间
    return /^[a-zA-Z0-9_-]{8,64}$/.test(apiKey);
  }

  /**
   * 验证Access Token格式
   */
  private isValidAccessTokenFormat(accessToken: string): boolean {
    // Access Token应该是字母数字组合，长度在16-128之间
    return /^[a-zA-Z0-9_-]{16,128}$/.test(accessToken);
  }

  private normalizeCapability(capability: string): string {
    return String(capability || "").trim().toLowerCase();
  }

  private getDynamicWSCapabilities(): Set<string> {
    const now = Date.now();
    if (
      this.dynamicWSCapabilityCache &&
      now < this.dynamicWSCapabilityCacheExpiresAt
    ) {
      return this.dynamicWSCapabilityCache;
    }

    const dynamicCapabilities = this.scanDynamicWSCapabilities();
    this.dynamicWSCapabilityCache = dynamicCapabilities;
    this.dynamicWSCapabilityCacheExpiresAt =
      now + this.DYNAMIC_WS_CAPABILITY_CACHE_TTL_MS;
    return dynamicCapabilities;
  }

  private scanDynamicWSCapabilities(): Set<string> {
    try {
      const allCapabilities =
        this.providerRegistryService.getAllCapabilities() as unknown;
      if (!(allCapabilities instanceof Map)) {
        return new Set<string>();
      }

      const result = new Set<string>();
      for (const providerCapabilities of allCapabilities.values()) {
        if (!(providerCapabilities instanceof Map)) {
          continue;
        }

        for (const capabilityMeta of providerCapabilities.values()) {
          const capability = this.extractCapabilityFromMeta(capabilityMeta);
          if (!capability) {
            continue;
          }
          if (!this.isStreamCapabilityFromMetadata(capability)) {
            continue;
          }

          const normalizedCapability = this.normalizeCapability(capability.name);
          if (normalizedCapability) {
            result.add(normalizedCapability);
          }
        }
      }

      return result;
    } catch (error) {
      this.logger.debug("动态能力解析失败，回退静态能力集合", {
        reason: (error as Error).message,
      });
      return new Set<string>();
    }
  }

  private extractCapabilityFromMeta(capabilityMeta: unknown):
    | {
        name: string;
        transport?: string;
        apiType?: string;
      }
    | null {
    if (!capabilityMeta || typeof capabilityMeta !== "object") {
      return null;
    }

    const maybeMeta = capabilityMeta as {
      capability?: unknown;
      name?: unknown;
      transport?: unknown;
      apiType?: unknown;
    };

    const rawCapability =
      maybeMeta.capability && typeof maybeMeta.capability === "object"
        ? (maybeMeta.capability as Record<string, unknown>)
        : (maybeMeta as Record<string, unknown>);
    const name = String(rawCapability.name || "").trim();

    if (!name) {
      return null;
    }

    return {
      name,
      transport: String(rawCapability.transport || "").trim(),
      apiType: String(rawCapability.apiType || "").trim(),
    };
  }

  private isStreamCapabilityFromMetadata(capability: {
    name: string;
    transport?: string;
    apiType?: string;
  }): boolean {
    const transport = this.normalizeCapability(String(capability.transport || ""));
    if (transport === "stream" || transport === "websocket") {
      return true;
    }
    if (transport === "rest") {
      return false;
    }

    const apiType = this.normalizeCapability(String(capability.apiType || ""));
    if (apiType === "stream") {
      return true;
    }
    if (apiType === "rest") {
      return false;
    }

    const normalizedName = this.normalizeCapability(capability.name);
    return (
      normalizedName === API_OPERATIONS.STOCK_DATA.STREAM_QUOTE.toLowerCase() ||
      normalizedName.includes("stream")
    );
  }

  /**
   * 验证原始流数据
   */
  validateStreamData(data: any): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!data) {
      errors.push('流数据不能为空');
      return { isValid: false, errors, warnings };
    }

    // 验证必需字段
    if (!data.symbol) {
      errors.push('流数据缺少symbol字段');
    }

    if (!data.timestamp && !data.time) {
      errors.push('流数据缺少时间戳字段');
    }

    // 验证数据类型
    if (data.price !== undefined && (typeof data.price !== 'number' || data.price <= 0)) {
      errors.push('价格字段必须是正数');
    }

    if (data.volume !== undefined && (typeof data.volume !== 'number' || data.volume < 0)) {
      errors.push('成交量字段必须是非负数');
    }

    // 验证符号格式
    if (data.symbol && !this.isValidSymbolFormat(data.symbol)) {
      warnings.push(`符号格式可能不标准: ${data.symbol}`);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      sanitizedData: {
        ...data,
        symbol: data.symbol ? this.sanitizeSymbol(data.symbol) : data.symbol
      }
    };
  }

  /**
   * 批量验证流数据
   */
  validateBatchStreamData(dataArray: any[]): {
    validData: any[];
    invalidData: any[];
    errors: string[];
    warnings: string[];
  } {
    const validData: any[] = [];
    const invalidData: any[] = [];
    const allErrors: string[] = [];
    const allWarnings: string[] = [];

    for (let i = 0; i < dataArray.length; i++) {
      const result = this.validateStreamData(dataArray[i]);

      if (result.isValid) {
        validData.push(result.sanitizedData);
      } else {
        invalidData.push(dataArray[i]);
      }

      // 添加索引信息到错误消息
      const indexedErrors = result.errors.map(error => `[${i}] ${error}`);
      const indexedWarnings = result.warnings.map(warning => `[${i}] ${warning}`);

      allErrors.push(...indexedErrors);
      allWarnings.push(...indexedWarnings);
    }

    return {
      validData,
      invalidData,
      errors: allErrors,
      warnings: allWarnings
    };
  }

  /**
   * 获取支持的市场列表
   */
  getSupportedMarkets(): string[] {
    return [...this.SUPPORTED_MARKETS];
  }

  /**
   * 获取支持的WebSocket能力类型
   */
  getSupportedWSCapabilities(): string[] {
    return [...this.SUPPORTED_WS_CAPABILITIES];
  }

  /**
   * 获取市场的符号格式示例
   */
  getSymbolFormatExamples(): Record<string, string[]> {
    return {
      HK: ['0700.HK', '00700.HK', '9988.HK'],
      US: ['AAPL.US', 'GOOGL.US', 'TSLA.US'],
      CN: ['000001.SZ', '600036.SH', '300059.SZ'],
      SG: ['DBS.SG', 'OCBC.SG', 'UOB.SG']
    };
  }
}
