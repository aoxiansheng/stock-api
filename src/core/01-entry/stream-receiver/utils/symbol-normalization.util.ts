/**
 * 构建 Provider 符号到标准符号的映射表
 * @internal 仅在流管道内部使用
 */
export const buildProviderToStandardMap = (
  rawSymbols: string[] = [],
  standardizedSymbols: string[] = [],
): Map<string, string> => {
  const map = new Map<string, string>();

  rawSymbols.forEach((rawSymbol, index) => {
    if (!rawSymbol) return;
    const normalizedKey = rawSymbol.toUpperCase();
    const mappedSymbol = standardizedSymbols[index] ?? rawSymbol;

    if (!map.has(normalizedKey)) {
      map.set(normalizedKey, mappedSymbol);
    }

    if (!map.has(rawSymbol)) {
      map.set(rawSymbol, mappedSymbol);
    }
  });

  return map;
};

/**
 * 将转换结果中的 symbol 字段替换为标准符号，必要时保留原始 Provider 符号
 */
export const applyStandardSymbolsToDataArray = (
  dataArray: any[] = [],
  symbolMap: Map<string, string>,
): any[] => {
  if (!symbolMap || symbolMap.size === 0) {
    return dataArray;
  }

  return dataArray.map((item) => {
    if (!item || typeof item !== "object") {
      return item;
    }

    const originalSymbol = item.symbol;
    if (typeof originalSymbol !== "string" || !originalSymbol) {
      return item;
    }

    const mappedSymbol = symbolMap.get(originalSymbol) ?? symbolMap.get(originalSymbol.toUpperCase());
    if (!mappedSymbol || mappedSymbol === originalSymbol) {
      return item;
    }

    // 保留 provider 原始符号，便于后续调试
    if (!item._providerSymbol) {
      return {
        ...item,
        symbol: mappedSymbol,
        _providerSymbol: originalSymbol,
      };
    }

    return {
      ...item,
      symbol: mappedSymbol,
    };
  });
};
