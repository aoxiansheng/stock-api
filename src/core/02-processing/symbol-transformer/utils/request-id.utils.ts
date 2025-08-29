import { REQUEST_ID_CONFIG } from '../constants/symbol-transformer.constants';

/**
 * RequestId 生成工具类
 * 解决高并发环境下的ID重复问题
 */
export class RequestIdUtils {
  private static sequenceNumber = 0;
  private static lastTimestamp = 0;

  /**
   * 生成唯一的RequestId（高并发安全）
   * 格式: {prefix}_{timestamp}_{sequence}_{random}
   * @param prefix 前缀（可选，默认为配置值）
   * @returns 唯一RequestId
   */
  static generateRequestId(prefix: string = REQUEST_ID_CONFIG.PREFIX): string {
    const timestamp = REQUEST_ID_CONFIG.USE_HIGH_PRECISION 
      ? Date.now() 
      : Math.floor(Date.now() / 1000);

    // 如果时间戳相同，增加序列号
    if (timestamp === this.lastTimestamp) {
      this.sequenceNumber++;
    } else {
      this.sequenceNumber = 0;
      this.lastTimestamp = timestamp;
    }

    // 生成随机数（增强唯一性）
    const random = Math.floor(Math.random() * Math.pow(10, REQUEST_ID_CONFIG.RANDOM_DIGITS));
    const randomPadded = random.toString().padStart(REQUEST_ID_CONFIG.RANDOM_DIGITS, '0');

    return `${prefix}_${timestamp}_${this.sequenceNumber}_${randomPadded}`;
  }

  /**
   * 批量生成RequestId（批处理场景）
   * @param count 生成数量
   * @param prefix 前缀
   * @returns RequestId数组
   */
  static generateBatchRequestIds(count: number, prefix: string = REQUEST_ID_CONFIG.PREFIX): string[] {
    const requestIds: string[] = [];
    
    for (let i = 0; i < count; i++) {
      requestIds.push(this.generateRequestId(prefix));
    }
    
    return requestIds;
  }

  /**
   * 从RequestId中提取时间戳
   * @param requestId RequestId
   * @returns 时间戳或null
   */
  static extractTimestamp(requestId: string): number | null {
    try {
      const parts = requestId.split('_');
      if (parts.length >= 2) {
        const timestamp = parseInt(parts[1]);
        return isNaN(timestamp) ? null : timestamp;
      }
      return null;
    } catch {
      return null;
    }
  }

  /**
   * 验证RequestId格式
   * @param requestId RequestId
   * @returns 是否有效
   */
  static isValidRequestId(requestId: string): boolean {
    if (!requestId || typeof requestId !== 'string') {
      return false;
    }

    const parts = requestId.split('_');
    
    // 期望格式：prefix_timestamp_sequence_random
    if (parts.length !== 4) {
      return false;
    }

    // 验证时间戳和序列号是否为数字
    const timestamp = parseInt(parts[1]);
    const sequence = parseInt(parts[2]);
    const random = parseInt(parts[3]);

    return !isNaN(timestamp) && !isNaN(sequence) && !isNaN(random);
  }

  /**
   * 重置序列号（测试用）
   */
  static resetSequence(): void {
    this.sequenceNumber = 0;
    this.lastTimestamp = 0;
  }

  /**
   * 获取当前序列号（调试用）
   */
  static getCurrentSequence(): number {
    return this.sequenceNumber;
  }
}