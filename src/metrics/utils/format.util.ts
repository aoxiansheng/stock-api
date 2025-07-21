/**
 * 格式化工具函数
 */
export class FormatUtils {
  /**
   * 将数字四舍五入到指定的小数位数
   * @param value 要格式化的数字
   * @param decimals 保留的小数位数，默认为2
   * @returns 格式化后的数字
   */
  public static roundNumber(value: number, decimals: number = 2): number {
    if (typeof value !== 'number' || isNaN(value)) {
      return 0;
    }
    const factor = Math.pow(10, decimals);
    return Math.round(value * factor) / factor;
  }

  /**
   * 将字节转换为GB
   * @param bytes 字节数
   * @returns GB
   */
  public static bytesToGB(bytes: number): number {
    if (typeof bytes !== 'number' || isNaN(bytes) || bytes === 0) {
      return 0;
    }
    const gb = bytes / 1024 / 1024 / 1024;
    return this.roundNumber(gb, 2);
  }
} 