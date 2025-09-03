/**
 * 告警模块相关的常量
 */
export const VALID_OPERATORS = ["gt", "lt", "eq", "gte", "lte", "ne"] as const;

// 操作符类型定义
type OperatorType = (typeof VALID_OPERATORS)[number];
export type Operator = OperatorType;

export const OPERATOR_SYMBOLS: Record<OperatorType, string> = {
  gt: ">",
  gte: ">=",
  lt: "<",
  lte: "<=",
  eq: "=",
  ne: "!=",
};
