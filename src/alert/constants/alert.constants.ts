/**
 * 告警模块相关的常量
 */
export const VALID_OPERATORS = ["gt", "lt", "eq", "gte", "lte", "ne"] as const;
export type Operator = (typeof VALID_OPERATORS)[number];

export const OPERATOR_SYMBOLS: Record<Operator, string> = {
  gt: ">",
  gte: ">=",
  lt: "<",
  lte: "<=",
  eq: "=",
  ne: "!=",
};
