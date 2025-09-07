/**
 * 告警模块相关的常量
 * 🎯 操作符常量 - 统一来源，避免重复定义
 */
export const VALID_OPERATORS = ["gt", "lt", "eq", "gte", "lte", "ne"] as const;

// 操作符类型定义 - 导出供其他文件使用
export type OperatorType = (typeof VALID_OPERATORS)[number];
export type Operator = OperatorType;

export const OPERATOR_SYMBOLS: Record<OperatorType, string> = {
  gt: ">",
  gte: ">=",
  lt: "<",
  lte: "<=",
  eq: "=",
  ne: "!=",
};
