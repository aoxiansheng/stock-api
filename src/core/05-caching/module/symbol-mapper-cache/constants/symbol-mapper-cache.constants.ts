/**
 * Symbol Mapper Cache 常量（最小集）
 * 仅保留组件核心所需的缓存键前缀。
 */
export const SYMBOL_MAPPER_CACHE_CONSTANTS = Object.freeze({
  KEYS: Object.freeze({
    PROVIDER_RULES: 'sm:provider_rules',
    SYMBOL_MAPPING: 'sm:symbol_mapping',
    BATCH_RESULT: 'sm:batch_result',
  }),
});
