import { 
  STREAM_RECEIVER_TIMEOUTS 
} from '../../../../../../../src/core/01-entry/stream-receiver/constants/stream-receiver-timeouts.constants';
import { 
  STREAM_RECEIVER_METRICS 
} from '../../../../../../../src/core/01-entry/stream-receiver/constants/stream-receiver-metrics.constants';

describe('Stream Receiver Constants', () => {
  describe('STREAM_RECEIVER_TIMEOUTS', () => {
    it('should define heartbeat intervals correctly', () => {
      expect(STREAM_RECEIVER_TIMEOUTS.HEARTBEAT_INTERVAL_MS).toBe(30000);
      expect(STREAM_RECEIVER_TIMEOUTS.HEARTBEAT_TIMEOUT_MS).toBe(60000);
      expect(STREAM_RECEIVER_TIMEOUTS.HEARTBEAT_TIMEOUT_MS).toBeGreaterThan(
        STREAM_RECEIVER_TIMEOUTS.HEARTBEAT_INTERVAL_MS
      );
    });
    
    it('should define recovery window correctly', () => {
      expect(STREAM_RECEIVER_TIMEOUTS.RECOVERY_WINDOW_MS).toBe(300000); // 5分钟
    });
    
    it('should define connection timeouts correctly', () => {
      expect(STREAM_RECEIVER_TIMEOUTS.CONNECTION_TIMEOUT_MS).toBe(30000);
      expect(STREAM_RECEIVER_TIMEOUTS.RECONNECTION_DELAY_MS).toBe(5000);
    });
    
    it('should define cleanup intervals correctly', () => {
      expect(STREAM_RECEIVER_TIMEOUTS.CLEANUP_INTERVAL_MS).toBe(5 * 60 * 1000);
      expect(STREAM_RECEIVER_TIMEOUTS.STALE_CONNECTION_TIMEOUT_MS).toBe(2 * 60 * 1000);
    });
    
    it('should have logical timeout relationships', () => {
      // 心跳超时应大于心跳间隔
      expect(STREAM_RECEIVER_TIMEOUTS.HEARTBEAT_TIMEOUT_MS)
        .toBeGreaterThan(STREAM_RECEIVER_TIMEOUTS.HEARTBEAT_INTERVAL_MS);
        
      // 恢复窗口应大于心跳超时
      expect(STREAM_RECEIVER_TIMEOUTS.RECOVERY_WINDOW_MS)
        .toBeGreaterThan(STREAM_RECEIVER_TIMEOUTS.HEARTBEAT_TIMEOUT_MS);
        
      // 清理间隔应大于恢复窗口
      expect(STREAM_RECEIVER_TIMEOUTS.CLEANUP_INTERVAL_MS)
        .toBeGreaterThan(STREAM_RECEIVER_TIMEOUTS.RECOVERY_WINDOW_MS);
    });
  });
  
  describe('STREAM_RECEIVER_METRICS', () => {
    it('should define performance calculation unit', () => {
      expect(STREAM_RECEIVER_METRICS.PERFORMANCE_CALCULATION_UNIT_MS).toBe(1000);
    });
    
    it('should define throughput calculation window', () => {
      expect(STREAM_RECEIVER_METRICS.THROUGHPUT_CALCULATION_WINDOW_MS).toBe(1000);
    });
    
    it('should define circuit breaker thresholds', () => {
      expect(STREAM_RECEIVER_METRICS.CIRCUIT_BREAKER_RESET_THRESHOLD).toBe(1000);
      expect(STREAM_RECEIVER_METRICS.CIRCUIT_BREAKER_CHECK_INTERVAL_MS).toBe(5000);
    });
    
    it('should define monitoring intervals', () => {
      expect(STREAM_RECEIVER_METRICS.METRICS_SAMPLING_INTERVAL_MS).toBe(1000);
      expect(STREAM_RECEIVER_METRICS.PERFORMANCE_SNAPSHOT_INTERVAL_MS).toBe(5000);
    });
    
    it('should have logical monitoring relationships', () => {
      // 性能快照间隔应大于采样间隔
      expect(STREAM_RECEIVER_METRICS.PERFORMANCE_SNAPSHOT_INTERVAL_MS)
        .toBeGreaterThan(STREAM_RECEIVER_METRICS.METRICS_SAMPLING_INTERVAL_MS);
        
      // 熔断器检查间隔应大于性能计算单元
      expect(STREAM_RECEIVER_METRICS.CIRCUIT_BREAKER_CHECK_INTERVAL_MS)
        .toBeGreaterThan(STREAM_RECEIVER_METRICS.PERFORMANCE_CALCULATION_UNIT_MS);
    });
  });
});