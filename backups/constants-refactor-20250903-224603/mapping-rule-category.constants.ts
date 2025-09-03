/**
 * 数据映射规则类别常量定义
 *
 * 用于统一管理所有与数据映射规则相关的类别标识符，
 * 确保类型安全并避免拼写错误。
 *
 * @created 2025-01-14
 * @version 1.0.0
 */

/**
 * 映射规则类别常量对象
 * 使用 as const 断言确保类型推导的准确性
 */
export const MAPPING_RULE_CATEGORY = {
  /** 股票报价字段映射规则 */
  QUOTE_FIELDS: "quote_fields",

  /** 基础信息字段映射规则 */
  BASIC_INFO_FIELDS: "basic_info_fields",

  /** 指数字段映射规则（预留扩展） */
  INDEX_FIELDS: "index_fields",
} as const;

/**
 * 映射规则类别类型定义
 * 基于常量对象自动推导，确保与常量值保持同步
 */
export type MappingRuleCategory =
  (typeof MAPPING_RULE_CATEGORY)[keyof typeof MAPPING_RULE_CATEGORY];

/**
 * 导出便捷访问的值数组
 * 用于运行时验证和遍历操作
 */
export const MappingRuleCategoryValues = Object.values(MAPPING_RULE_CATEGORY);

/**
 * 类别描述映射
 * 提供人类可读的描述信息
 */
export const MAPPING_RULE_CATEGORY_DESCRIPTIONS: Record<
  MappingRuleCategory,
  string
> = {
  [MAPPING_RULE_CATEGORY.QUOTE_FIELDS]: "股票报价字段映射规则",
  [MAPPING_RULE_CATEGORY.BASIC_INFO_FIELDS]: "基础信息字段映射规则",
  [MAPPING_RULE_CATEGORY.INDEX_FIELDS]: "指数字段映射规则",
};

/**
 * 验证给定值是否为有效的映射规则类别
 * @param value 待验证的值
 * @returns 是否为有效的映射规则类别
 */
export function isValidMappingRuleCategory(
  value: unknown,
): value is MappingRuleCategory {
  return (
    typeof value === "string" &&
    MappingRuleCategoryValues.includes(value as MappingRuleCategory)
  );
}
