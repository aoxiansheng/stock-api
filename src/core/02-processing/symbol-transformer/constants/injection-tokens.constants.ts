/**
 * 依赖注入Token定义
 * 使用命名空间模式确保唯一性，避免与其他模块冲突
 *
 * @description
 * - 使用Symbol类型确保全局唯一性
 * - 命名空间前缀避免跨模块冲突
 * - 保留向后兼容的别名导出
 */

const SYMBOL_TRANSFORMER_NAMESPACE = "SymbolTransformer";

/**
 * 依赖注入Token集合
 */
export const INJECTION_TOKENS = {
  /**
   * 符号转换器服务Token
   */
  TRANSFORMER: Symbol(`${SYMBOL_TRANSFORMER_NAMESPACE}:ISymbolTransformer`),

  /**
   * 符号格式验证器Token
   */
  FORMAT_VALIDATOR: Symbol(
    `${SYMBOL_TRANSFORMER_NAMESPACE}:ISymbolFormatValidator`,
  ),

  /**
   * 批处理器Token
   */
  BATCH_PROCESSOR: Symbol(`${SYMBOL_TRANSFORMER_NAMESPACE}:IBatchProcessor`),

  /**
   * 转换缓存Token
   */
  TRANSFORMATION_CACHE: Symbol(
    `${SYMBOL_TRANSFORMER_NAMESPACE}:ITransformationCache`,
  ),

  /**
   * 模式匹配器Token
   */
  PATTERN_MATCHER: Symbol(`${SYMBOL_TRANSFORMER_NAMESPACE}:IPatternMatcher`),

  /**
   * 断路器Token
   */
  CIRCUIT_BREAKER: Symbol(`${SYMBOL_TRANSFORMER_NAMESPACE}:ICircuitBreaker`),


  /**
   * 配置服务Token
   */
  CONFIG: Symbol(`${SYMBOL_TRANSFORMER_NAMESPACE}:ISymbolTransformConfig`),

  /**
   * 工厂服务Token
   */
  FACTORY: Symbol(`${SYMBOL_TRANSFORMER_NAMESPACE}:ISymbolTransformerFactory`),

  /**
   * 错误处理器Token
   */
  ERROR_HANDLER: Symbol(`${SYMBOL_TRANSFORMER_NAMESPACE}:IErrorHandler`),

  /**
   * 性能优化器Token
   */
  PERFORMANCE_OPTIMIZER: Symbol(
    `${SYMBOL_TRANSFORMER_NAMESPACE}:IPerformanceOptimizer`,
  ),

  /**
   * 规则引擎Token
   */
  RULE_ENGINE: Symbol(`${SYMBOL_TRANSFORMER_NAMESPACE}:IRuleEngine`),
} as const;


/**
 * Token类型定义
 */
export type InjectionToken =
  (typeof INJECTION_TOKENS)[keyof typeof INJECTION_TOKENS];

/**
 * Token描述映射（用于调试和文档）
 */
export const TOKEN_DESCRIPTIONS = {
  [INJECTION_TOKENS.TRANSFORMER.toString()]: "符号转换器核心服务",
  [INJECTION_TOKENS.FORMAT_VALIDATOR.toString()]: "符号格式验证服务",
  [INJECTION_TOKENS.BATCH_PROCESSOR.toString()]: "批量处理服务",
  [INJECTION_TOKENS.TRANSFORMATION_CACHE.toString()]: "转换结果缓存服务",
  [INJECTION_TOKENS.PATTERN_MATCHER.toString()]: "符号模式匹配服务",
  [INJECTION_TOKENS.CIRCUIT_BREAKER.toString()]: "断路器保护服务",
  [INJECTION_TOKENS.CONFIG.toString()]: "配置管理服务",
  [INJECTION_TOKENS.FACTORY.toString()]: "转换器工厂服务",
  [INJECTION_TOKENS.ERROR_HANDLER.toString()]: "错误处理服务",
  [INJECTION_TOKENS.PERFORMANCE_OPTIMIZER.toString()]: "性能优化服务",
  [INJECTION_TOKENS.RULE_ENGINE.toString()]: "规则引擎服务",
} as const;

/**
 * 获取Token的描述信息
 * @param token 注入Token
 * @returns Token描述
 */
export function getTokenDescription(token: InjectionToken): string {
  return TOKEN_DESCRIPTIONS[token.toString()] || "Unknown Token";
}

/**
 * 验证Token是否属于当前模块
 * @param token 注入Token
 * @returns 是否为当前模块Token
 */
export function isSymbolTransformerToken(token: symbol): boolean {
  return Object.values(INJECTION_TOKENS).includes(token as any);
}
