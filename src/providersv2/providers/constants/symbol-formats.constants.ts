import { REFERENCE_DATA } from "@common/constants/domain";
/**
 * 符号格式常量
 * 职责：统一管理所有提供商支持的符号格式，避免重复定义
 */

export const SYMBOL_FORMATS = {
  // 常用的综合市场符号格式
  COMMON_MARKETS: [
    REFERENCE_DATA.SAMPLE_SYMBOLS.HK_TENCENT,
    "000001.SZ",
    "600000.SH",
    "AAPL.US",
  ],

  // 指数符号格式
  INDEX_FORMATS: ["HSI.HI", "000001.SH", "399001.SZ"],
};

// 类型导出
export type SymbolFormatGroup =
  (typeof SYMBOL_FORMATS)[keyof typeof SYMBOL_FORMATS];
