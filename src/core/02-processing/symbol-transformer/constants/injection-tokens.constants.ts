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
} as const;


/**
 * Token类型定义
 */
export type InjectionToken = (typeof INJECTION_TOKENS)["TRANSFORMER"];

/**
 * Token描述映射（用于调试和文档）
 */
export const TOKEN_DESCRIPTIONS = {
  [INJECTION_TOKENS.TRANSFORMER.toString()]: "符号转换器核心服务",
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
