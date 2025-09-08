import "reflect-metadata";
import { CapabilityMetadata } from "./types/metadata.types";
import { Capability } from "./capability.decorator";
import { API_OPERATIONS } from '@common/constants/domain';

/**
 * 流能力装饰器 - WebSocket 能力的特化版本
 *
 * @example
 * ```typescript
 * @StreamCapability({
 *   name: API_OPERATIONS.STOCK_DATA.STREAM_QUOTE,
 *   markets: ['US', 'HK'],
 *   connectionUrl: 'wss://api.example.com/stream',
 *   reconnect: { maxRetries: 5 }
 * })
 * export class StreamStockQuoteCapability implements IStreamCapability {
 *   // 实现
 * }
 * ```
 */
export function StreamCapability(metadata: Omit<CapabilityMetadata, "type">) {
  return Capability({
    ...metadata,
    type: "websocket",
  });
}
