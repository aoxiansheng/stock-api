/**
 * 查询相关的通用工具函数
 */

/**
 * 为给定的参数构建一个唯一的、确定性的存储键。
 * 键的格式为：<market>:<provider>:<queryTypeFilter>:<symbol>
 * 如果部分参数未提供，则使用通配符 '*'。
 *
 * @param symbol 股票代码
 * @param provider 数据源
 * @param queryTypeFilter 数据类型
 * @param market 市场
 * @returns 格式化的存储键
 */
export const buildStorageKey = (
  symbol: string,
  provider?: string,
  queryTypeFilter?: string,
  market?: string,
): string => {
  const parts = [
    market ?? "*",
    provider ?? "*",
    queryTypeFilter ?? "*",
    symbol,
  ];
  return parts.join(":");
};

/**
 * 验证数据是否在指定的最大时间范围内仍然有效（新鲜）。
 * 会尝试从 data.timestamp 或 data._timestamp 字段获取时间戳。
 *
 * @param data 包含时间戳的数据对象
 * @param maxAge 秒为单位的最大有效时间
 * @returns 如果数据是新鲜的则返回 true，否则返回 false
 */
export const validateDataFreshness = (data: any, maxAge?: number): boolean => {
  // 处理 maxAge=0、NaN 的情况
  if (maxAge === undefined || maxAge === null) {
    return true; // 如果未指定最大年龄，则始终认为数据是新鲜的
  }

  // 处理无效的 maxAge 值
  if (isNaN(maxAge) || maxAge <= 0) {
    return false; // maxAge 为 0、负数或 NaN 时数据视为过期
  }

  const timestamp = data?.timestamp || data?._timestamp;
  if (!timestamp) {
    return false; // 如果没有时间戳，则认为数据不新鲜
  }

  // 处理字符串形式的时间戳数字
  let timestampValue: number;
  if (typeof timestamp === 'string' && !isNaN(Number(timestamp))) {
    // 处理字符串形式的数字时间戳
    timestampValue = Number(timestamp);
  } else {
    // 处理其他形式的时间戳
    timestampValue = new Date(timestamp).getTime();
  }

  // 处理无效的时间戳
  if (isNaN(timestampValue)) {
    return false;
  }

  return Date.now() - timestampValue <= maxAge * 1000;
};
