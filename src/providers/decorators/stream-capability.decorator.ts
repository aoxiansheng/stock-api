import 'reflect-metadata';
import { CapabilityMetadata } from './metadata.types';
import { Capability } from './capability.decorator';

/**
 * 流能力装饰器 - WebSocket 能力的特化版本
 * 
 * @example
 * ```typescript
 * @StreamCapability({
 *   name: 'stream-stock-quote',
 *   markets: ['US', 'HK'],
 *   connectionUrl: 'wss://api.example.com/stream',
 *   reconnect: { maxRetries: 5 }
 * })
 * export class StreamStockQuoteCapability implements IStreamCapability {
 *   // 实现
 * }
 * ```
 */
export function StreamCapability(metadata: Omit<CapabilityMetadata, 'type'>) {
  return Capability({
    ...metadata,
    type: 'websocket'
  });
} 